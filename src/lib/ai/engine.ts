import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { logServerError } from "@/lib/logging/server-logger";
import { redactText } from "@/lib/security/redact";
import { buildContext, type BuiltContext } from "./context-builder";
import { actualCostCents, estimateCost } from "./cost";
import { checkDuplicates, type DuplicateReport } from "./duplicate-guard";
import { callStructured, modelForMode, OpenAiError, type StructuredCallResult } from "./openai-client";
import { BRAND_SYSTEM_PROMPT, PROMPT_VERSION } from "./prompts/brand";
import { formulaPromptBlock } from "./prompts/formulas";
import { REWRITE_LIMITS, type GenerationInput } from "./schemas/input";
import { generationOutputJsonSchema, generationOutputSchema, type GenerationOutput } from "./schemas/output";
import { checkCompliance, runQualityGate, type QualityReport } from "./quality-gate";
import type { ComplianceReport } from "./compliance";

export interface EngineResult {
  runId: string;
  status: "succeeded" | "failed" | "blocked";
  scriptId: string | null;
  versionId: string | null;
  humanReviewRequired: boolean;
  rewriteCount: number;
  quality: QualityReport | null;
  compliance: ComplianceReport | null;
  duplicate: DuplicateReport | null;
  safeError: string | null;
}

interface EngineDeps {
  db: SupabaseClient;
  userId: string;
  callModel?: typeof callStructured; // injectable for tests
  /** When set, the result is saved as a new version of this script (section regeneration). */
  targetScriptId?: string;
}

async function setStage(db: SupabaseClient, runId: string, status: string, detail: string) {
  await db.from("ai_generation_runs").update({ status, stage_detail: detail }).eq("id", runId);
}

function buildUserPrompt(input: GenerationInput, ctx: BuiltContext): string {
  return [
    `任务：为MetaSlim AI生成一支${input.script_length}秒的Facebook口播脚本。`,
    `Campaign Goal：${input.campaign_goal}｜Audience Temperature：${input.audience_temperature}｜目标地区：${input.target_location}｜输出语言：${input.output_language}`,
    `题材：${input.topic}`,
    `Hook Type偏好：${input.hook_type}（hook_candidates至少3组，方向必须真正不同，不是换字）`,
    `CTA Keyword：${input.cta_keyword}`,
    formulaPromptBlock(input.formula),
    ctx.promptBlock,
    `输出必须是符合json_schema的纯JSON。selected_hook为hook_candidates中的索引。full_script必须可直接口播。`,
  ].join("\n\n");
}

/** Idempotency + single-active-run guard, then full generation pipeline. */
export async function runGeneration(input: GenerationInput, deps: EngineDeps): Promise<EngineResult> {
  const { db, userId } = deps;
  const call = deps.callModel ?? callStructured;

  // Idempotency: same request_id returns the existing run
  const { data: existing } = await db
    .from("ai_generation_runs")
    .select("id,status,script_id,content_version_id,human_review_required,rewrite_count,quality_report,compliance_report,duplicate_report,safe_error_message")
    .eq("workspace_id", input.workspace_id)
    .eq("request_id", input.request_id)
    .maybeSingle();
  if (existing) {
    return {
      runId: existing.id,
      status: existing.status === "succeeded" ? "succeeded" : existing.status === "blocked" ? "blocked" : "failed",
      scriptId: existing.script_id,
      versionId: existing.content_version_id,
      humanReviewRequired: existing.human_review_required,
      rewriteCount: existing.rewrite_count,
      quality: existing.quality_report,
      compliance: existing.compliance_report,
      duplicate: existing.duplicate_report,
      safeError: existing.safe_error_message,
    };
  }

  // Concurrency: one active run per user per workspace
  const { count: activeCount } = await db
    .from("ai_generation_runs")
    .select("id", { head: true, count: "exact" })
    .eq("workspace_id", input.workspace_id)
    .eq("user_id", userId)
    .in("status", ["pending", "building_context", "generating", "quality_checks", "rewriting", "saving"]);
  if ((activeCount ?? 0) > 0) {
    return { runId: "", status: "blocked", scriptId: null, versionId: null, humanReviewRequired: false, rewriteCount: 0, quality: null, compliance: null, duplicate: null, safeError: "已有生成任务进行中，请等它完成" };
  }

  const model = modelForMode(input.generation_mode);

  // Create run row
  const { data: run, error: runErr } = await db
    .from("ai_generation_runs")
    .insert({
      workspace_id: input.workspace_id,
      user_id: userId,
      request_id: input.request_id,
      status: "building_context",
      stage_detail: "Building Context",
      generation_mode: input.generation_mode,
      formula: input.formula,
      input_snapshot: input,
      prompt_version: PROMPT_VERSION,
      model,
    })
    .select("id")
    .single();
  if (runErr || !run) {
    // unique violation = concurrent duplicate request
    return { runId: "", status: "blocked", scriptId: null, versionId: null, humanReviewRequired: false, rewriteCount: 0, quality: null, compliance: null, duplicate: null, safeError: "重复请求（idempotency）" };
  }
  const runId = run.id as string;

  const fail = async (code: string, message: string): Promise<EngineResult> => {
    const safe = redactText(message).slice(0, 300);
    await db.from("ai_generation_runs").update({ status: "failed", error_code: code, safe_error_message: safe, stage_detail: null }).eq("id", runId);
    await logServerError({ service: "ai_engine", operation: "generate", error: new Error(`${code}: ${safe}`), workspaceId: input.workspace_id, userId });
    return { runId, status: "failed", scriptId: null, versionId: null, humanReviewRequired: false, rewriteCount: 0, quality: null, compliance: null, duplicate: null, safeError: safe };
  };

  try {
    // 1. Context
    const ctx = await buildContext(db, input);
    await db.from("ai_generation_runs").update({ context_summary: ctx.summary, evidence_ids: ctx.evidenceIds, evidence_limitations: ctx.evidenceLimitations.join("\n") }).eq("id", runId);

    // 2. Budget reservation (STEP 3 RPC enforces ai_enabled + daily/monthly/per-request limits)
    const userPrompt = buildUserPrompt(input, ctx);
    const est = estimateCost(model, input.generation_mode, BRAND_SYSTEM_PROMPT + userPrompt);
    const { data: usageLogId, error: reserveErr } = await db.rpc("reserve_ai_usage", {
      target_workspace: input.workspace_id,
      target_operation: "copywriting_generation",
      target_estimated_cost_cents: est.estimatedCostCents ?? 0,
      target_provider: "openai",
    });
    if (reserveErr) {
      await db.from("ai_generation_runs").update({ status: "blocked", error_code: "budget", safe_error_message: redactText(reserveErr.message).slice(0, 200) }).eq("id", runId);
      return { runId, status: "blocked", scriptId: null, versionId: null, humanReviewRequired: false, rewriteCount: 0, quality: null, compliance: null, duplicate: null, safeError: redactText(reserveErr.message).slice(0, 200) };
    }
    await db.from("ai_generation_runs").update({ usage_log_id: usageLogId, estimated_cost_cents: est.estimatedCostCents, cost_available: est.costAvailable }).eq("id", runId);

    // 3. Generate (+ bounded rewrites)
    const limit = REWRITE_LIMITS[input.generation_mode];
    let output: GenerationOutput | null = null;
    let quality: QualityReport | null = null;
    let compliance: ComplianceReport | null = null;
    let duplicate: DuplicateReport | null = null;
    let rewriteCount = 0;
    let totalIn = 0;
    let totalOut = 0;
    let feedback = "";

    for (let attempt = 0; attempt <= limit; attempt++) {
      await setStage(db, runId, attempt === 0 ? "generating" : "rewriting", attempt === 0 ? "Generating Strategy / Hooks / Script" : `Rewrite ${attempt}`);
      let res: StructuredCallResult;
      try {
        res = await call({
          mode: input.generation_mode,
          system: BRAND_SYSTEM_PROMPT,
          user: userPrompt + (feedback ? `\n\n【上一版未通过，必须修正】\n${feedback}` : ""),
          jsonSchema: generationOutputJsonSchema() as unknown as { name: string; strict: boolean; schema: Record<string, unknown> },
        });
      } catch (err) {
        if (err instanceof OpenAiError && err.code === "invalid_json" && attempt < limit) { rewriteCount = ++attempt && rewriteCount + 1; feedback = "输出不是有效JSON，严格按schema输出。"; continue; }
        throw err;
      }
      totalIn += res.inputTokens;
      totalOut += res.outputTokens;

      // Schema validation (Zod second parse). One retry max for parse failure.
      let parsed: GenerationOutput;
      try {
        parsed = generationOutputSchema.parse(JSON.parse(res.outputText));
      } catch (e) {
        if (attempt < limit) { rewriteCount++; feedback = `JSON Schema验证失败：${redactText(String(e)).slice(0, 300)}。严格按schema修正所有字段。`; continue; }
        return await fail("schema_validation", "AI输出未通过Schema验证（已重试）");
      }
      if (parsed.selected_hook >= parsed.hook_candidates.length) parsed.selected_hook = 0;

      // 4. Quality checks
      await setStage(db, runId, "quality_checks", "Duplicate Check → Compliance Check → Quality Gate");
      const hook = parsed.hook_candidates[parsed.selected_hook];
      duplicate = checkDuplicates(
        { topic: input.topic, script_hook: hook.script_hook, first_second_text: hook.first_second_text, cta: parsed.cta, full_script: parsed.full_script, angle: parsed.strategy.angle },
        ctx.history,
      );
      compliance = checkCompliance(parsed.full_script + "\n" + parsed.caption + "\n" + parsed.headline, {
        hasVerifiedTrendEvidence: ctx.hasVerifiedTrendEvidence,
        hasVerifiedProof: ctx.hasVerifiedProof,
      });
      quality = runQualityGate(parsed, input, { hasVerifiedTrendEvidence: ctx.hasVerifiedTrendEvidence, compliance, duplicate });

      const needsRewrite = quality.must_rewrite || duplicate.verdict === "duplicate" || compliance.level !== "safe";
      output = parsed;
      if (!needsRewrite) break;

      if (attempt < limit) {
        rewriteCount++;
        feedback = [
          duplicate.verdict !== "safe" ? `Duplicate：${duplicate.explanation} ${duplicate.recommended_change ?? ""}` : "",
          compliance.level !== "safe" ? `Compliance：${compliance.flagged_items.map((f) => `「${f.original_phrase}」→ ${f.safe_rewrite}`).join("；")}` : "",
          ...quality.checks.filter((c) => !c.pass).map((c) => `${c.label}：${c.reason}。${c.suggested_revision ?? ""}`),
        ].filter(Boolean).join("\n");
      }
    }

    if (!output) return await fail("no_output", "生成失败：无有效输出");

    const finalNeedsReview =
      (quality?.must_rewrite ?? true) || (compliance?.level !== "safe") || (duplicate?.verdict !== "safe") || (quality?.critical_fail ?? true);

    // Critical fail after rewrite limit → do not save a script at all? Spec: needs_review + human_review_required, AI Draft saved.
    // 5. Save AI Draft (status stays in pre-approval states; gate trigger blocks any jump without human approval)
    await setStage(db, runId, "saving", "Saving Draft");
    const scriptIdToUse: string | null = deps.targetScriptId ?? null;
    if (scriptIdToUse) {
      await db.from("scripts").update({
        status: finalNeedsReview ? "needs_review" : "draft",
        human_review_required: finalNeedsReview,
        updated_by: userId,
      }).eq("id", scriptIdToUse).eq("workspace_id", input.workspace_id);
    }
    const { data: script, error: scriptErr } = scriptIdToUse ? { data: { id: scriptIdToUse }, error: null } : await db
      .from("scripts")
      .insert({
        workspace_id: input.workspace_id,
        title: output.headline.slice(0, 120),
        status: finalNeedsReview ? "needs_review" : "draft",
        risk_level: compliance?.level === "high_risk" ? "high" : compliance?.level === "needs_revision" ? "medium" : "low",
        ai_generated: true,
        human_review_required: finalNeedsReview,
        created_by: userId,
        updated_by: userId,
      })
      .select("id")
      .single();
    if (scriptErr || !script) return await fail("save_script", scriptErr?.message ?? "无法保存Script");

    const hook = output.hook_candidates[output.selected_hook];
    const sectionOf = (keys: string[]) => output!.formula_sections.filter((s) => keys.includes(s.section_key)).map((s) => s.content).join("\n") || null;
    const { data: version, error: verErr } = await db
      .from("content_versions")
      .insert({
        workspace_id: input.workspace_id,
        script_id: script.id,
        origin: "ai",
        generation_run_id: runId,
        formula: output.generation_metadata.formula_used,
        strategy: output.strategy,
        hook_candidates: output.hook_candidates,
        selected_hook_index: output.selected_hook,
        script_hook: hook.script_hook,
        visual_hook: hook.visual_hook,
        motion_hook: hook.motion_hook,
        first_second_text: hook.first_second_text,
        attention: sectionOf(["attention", "hook"]),
        interest: sectionOf(["interest", "pain_scene", "problem", "situation", "misconception", "relatable_situation"]),
        desire: sectionOf(["desire", "solution", "reframe", "correct_approach", "webinar_promise", "helpful_insight", "offer"]),
        action: sectionOf(["action", "cta"]),
        full_script: output.full_script,
        rehook_text: output.rehook_text,
        caption: output.caption,
        headline: output.headline,
        cover_text: output.cover_text,
        cta: output.cta,
        cta_keyword: output.cta_keyword,
        hashtags: output.hashtags,
        production_notes: output.production_notes,
        source_summary: output.source_summary,
        risk_level: compliance?.level === "high_risk" ? "high" : compliance?.level === "needs_revision" ? "medium" : "low",
        compliance_status: compliance?.level === "safe" ? "passed" : "review_required",
        quality_status: quality && !quality.must_rewrite ? "passed" : "review_required",
        created_by: userId,
      })
      .select("id")
      .single();
    if (verErr || !version) return await fail("save_version", verErr?.message ?? "无法保存Version");
    await db.from("scripts").update({ current_version_id: version.id, updated_by: userId }).eq("id", script.id);

    // 6. Finalize usage log with actual tokens/cost
    const actual = actualCostCents(model, totalIn, totalOut);
    await db.from("ai_usage_logs").update({
      input_units: totalIn,
      output_units: totalOut,
      actual_cost_cents: actual.cents ?? 0,
      status: "succeeded",
    }).eq("id", usageLogId);

    await db.from("ai_generation_runs").update({
      status: "succeeded",
      stage_detail: null,
      rewrite_count: rewriteCount,
      quality_report: quality,
      compliance_report: compliance,
      duplicate_report: duplicate,
      input_tokens: totalIn,
      output_tokens: totalOut,
      script_id: script.id,
      content_version_id: version.id,
      human_review_required: finalNeedsReview,
      cost_available: actual.available,
    }).eq("id", runId);

    return {
      runId,
      status: "succeeded",
      scriptId: script.id,
      versionId: version.id,
      humanReviewRequired: finalNeedsReview,
      rewriteCount,
      quality,
      compliance,
      duplicate,
      safeError: null,
    };
  } catch (err) {
    const code = err instanceof OpenAiError ? err.code : "internal";
    return await fail(code, err instanceof Error ? err.message : String(err));
  }
}
