import { beforeEach, describe, expect, it, vi } from "vitest";
import { runGeneration } from "@/lib/ai/engine";
import { generationInputSchema } from "@/lib/ai/schemas/input";
import type { SupabaseClient } from "@supabase/supabase-js";
import { makeFakeDb, type Captured } from "./fake-db";
import { validOutput } from "../../unit/ai/schemas.test";

const WS = "11111111-1111-1111-1111-111111111111";
const USER = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

const input = generationInputSchema.parse({
  workspace_id: WS, campaign_goal: "whatsapp", audience_temperature: "cold", script_length: 30,
  generation_mode: "standard", formula: "aida", hook_type: "pain_point", cta_keyword: "SLIM",
  topic: "外食族晚餐", selected_trend_id: null, selected_material_ids: [], requested_output_count: 1,
  target_location: "Malaysia", output_language: "Malaysian Conversational Chinese", request_id: "req-int-00000001",
});

/** Default happy-path router. */
function happyRouter(overrides: (q: Captured) => ReturnType<Parameters<typeof makeFakeDb>[0]> | undefined = () => undefined) {
  return (q: Captured) => {
    const o = overrides(q);
    if (o !== undefined) return o;
    if (q.table === "ai_generation_runs" && q.action === "select") return { data: null }; // no existing run (idempotency miss)
    if (q.table === "ai_generation_runs" && q.action === "count") return { count: 0 };
    if (q.table === "ai_generation_runs" && q.action === "insert") return { data: { id: "run-1" } };
    if (q.table === "ai_generation_runs" && q.action === "update") return { data: null };
    if (q.table === "brand_profile") return { data: { voice_rules: {}, approved_claims: [], prohibited_claims: [], default_cta: null, default_disclaimer: null } };
    if (q.table === "content_versions" && q.action === "select") return { data: [] };
    if (q.table === "content_versions" && q.action === "insert") return { data: { id: "ver-1" } };
    if (q.table === "rpc:reserve_ai_usage") return { data: "usage-1" };
    if (q.table === "scripts" && q.action === "insert") return { data: { id: "script-1" } };
    if (q.table === "scripts" && q.action === "update") return { data: null };
    if (q.table === "ai_usage_logs") return { data: null };
    if (q.table === "performance_metrics") return { data: [] };
    return { data: null };
  };
}

const goodModelCall = vi.fn(async () => ({ outputText: JSON.stringify(validOutput), inputTokens: 100, outputTokens: 500, model: "test-model" }));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.OPENAI_MODEL_STANDARD = "test-model";
  process.env.OPENAI_MODEL_QUICK = "test-model";
  process.env.OPENAI_MODEL_DEEP = "test-model";
  delete process.env.SUPABASE_SERVICE_ROLE_KEY; // logServerError becomes a no-op
});

describe("engine integration (mock OpenAI + fake DB)", () => {
  it("happy path: saves script + version, finalizes usage log", async () => {
    const db = makeFakeDb(happyRouter());
    const r = await runGeneration(input, { db: db as unknown as SupabaseClient, userId: USER, callModel: goodModelCall });
    expect(r.status).toBe("succeeded");
    expect(r.scriptId).toBe("script-1");
    expect(r.versionId).toBe("ver-1");
    const scriptInsert = db.__log.find((q) => q.table === "scripts" && q.action === "insert")!;
    expect((scriptInsert.payload as { ai_generated: boolean }).ai_generated).toBe(true);
    expect(["draft", "needs_review"]).toContain((scriptInsert.payload as { status: string }).status);
    const usage = db.__log.find((q) => q.table === "ai_usage_logs" && q.action === "update")!;
    expect((usage.payload as { input_units: number }).input_units).toBe(100);
    expect((usage.payload as { status: string }).status).toBe("succeeded");
  });

  it("idempotency: same request_id returns existing run, no new model call", async () => {
    const db = makeFakeDb(happyRouter((q) => {
      if (q.table === "ai_generation_runs" && q.action === "select")
        return { data: { id: "run-old", status: "succeeded", script_id: "s-old", content_version_id: "v-old", human_review_required: false, rewrite_count: 0, quality_report: null, compliance_report: null, duplicate_report: null, safe_error_message: null } };
      return undefined;
    }));
    const r = await runGeneration(input, { db: db as unknown as SupabaseClient, userId: USER, callModel: goodModelCall });
    expect(r.runId).toBe("run-old");
    expect(r.scriptId).toBe("s-old");
    expect(goodModelCall).not.toHaveBeenCalled();
  });

  it("concurrency: active run blocks new generation", async () => {
    const db = makeFakeDb(happyRouter((q) => (q.table === "ai_generation_runs" && q.action === "count" ? { count: 1 } : undefined)));
    const r = await runGeneration(input, { db: db as unknown as SupabaseClient, userId: USER, callModel: goodModelCall });
    expect(r.status).toBe("blocked");
    expect(goodModelCall).not.toHaveBeenCalled();
  });

  it("budget limit: reserve_ai_usage error → blocked, no model call", async () => {
    const db = makeFakeDb(happyRouter((q) => (q.table === "rpc:reserve_ai_usage" ? { error: { message: "Daily cost limit exceeded" } } : undefined)));
    const r = await runGeneration(input, { db: db as unknown as SupabaseClient, userId: USER, callModel: goodModelCall });
    expect(r.status).toBe("blocked");
    expect(r.safeError).toContain("Daily cost limit");
    expect(goodModelCall).not.toHaveBeenCalled();
  });

  it("invalid JSON: retries within rewrite limit then fails without saving", async () => {
    const badCall = vi.fn(async () => ({ outputText: "not-json{{", inputTokens: 10, outputTokens: 5, model: "test-model" }));
    const db = makeFakeDb(happyRouter());
    const r = await runGeneration(input, { db: db as unknown as SupabaseClient, userId: USER, callModel: badCall });
    expect(r.status).toBe("failed");
    expect(badCall).toHaveBeenCalledTimes(2); // initial + 1 rewrite (standard limit)
    expect(db.__log.find((q) => q.table === "scripts" && q.action === "insert")).toBeUndefined();
    expect(db.__log.find((q) => q.table === "content_versions" && q.action === "insert")).toBeUndefined();
  });

  it("missing fields: schema mismatch fails without saving", async () => {
    const incomplete = Object.fromEntries(Object.entries(validOutput).filter(([k]) => k !== "full_script"));
    const badCall = vi.fn(async () => ({ outputText: JSON.stringify(incomplete), inputTokens: 10, outputTokens: 5, model: "test-model" }));
    const db = makeFakeDb(happyRouter());
    const r = await runGeneration(input, { db: db as unknown as SupabaseClient, userId: USER, callModel: badCall });
    expect(r.status).toBe("failed");
    expect(db.__log.find((q) => q.table === "content_versions" && q.action === "insert")).toBeUndefined();
  });

  it("refusal: fails with refusal code", async () => {
    const { OpenAiError } = await import("@/lib/ai/openai-client");
    const refuseCall = vi.fn(async () => { throw new OpenAiError("refusal", "Model refused"); });
    const db = makeFakeDb(happyRouter());
    const r = await runGeneration(input, { db: db as unknown as SupabaseClient, userId: USER, callModel: refuseCall });
    expect(r.status).toBe("failed");
    const update = db.__log.filter((q) => q.table === "ai_generation_runs" && q.action === "update").map((q) => q.payload as Record<string, unknown>);
    expect(update.some((p) => p.error_code === "refusal")).toBe(true);
  });

  it("compliance rewrite: bad first draft, clean second draft → succeeded with rewrite_count=1", async () => {
    const bad = { ...validOutput, full_script: validOutput.full_script + " 我们保证瘦10kg！" };
    const seq = vi.fn()
      .mockResolvedValueOnce({ outputText: JSON.stringify(bad), inputTokens: 100, outputTokens: 400, model: "test-model" })
      .mockResolvedValueOnce({ outputText: JSON.stringify(validOutput), inputTokens: 100, outputTokens: 400, model: "test-model" });
    const db = makeFakeDb(happyRouter());
    const r = await runGeneration(input, { db: db as unknown as SupabaseClient, userId: USER, callModel: seq });
    expect(r.status).toBe("succeeded");
    expect(r.rewriteCount).toBe(1);
    expect(seq).toHaveBeenCalledTimes(2);
    expect(r.compliance?.level).toBe("safe");
  });

  it("rewrite limit reached with still-failing content → saved as needs_review + human_review_required", async () => {
    const bad = { ...validOutput, full_script: validOutput.full_script + " 我们保证瘦10kg！" };
    const alwaysBad = vi.fn(async () => ({ outputText: JSON.stringify(bad), inputTokens: 100, outputTokens: 400, model: "test-model" }));
    const db = makeFakeDb(happyRouter());
    const r = await runGeneration(input, { db: db as unknown as SupabaseClient, userId: USER, callModel: alwaysBad });
    expect(r.status).toBe("succeeded"); // run succeeded but flagged
    expect(r.humanReviewRequired).toBe(true);
    const scriptInsert = db.__log.find((q) => q.table === "scripts" && q.action === "insert")!;
    expect((scriptInsert.payload as { status: string }).status).toBe("needs_review");
    expect((scriptInsert.payload as { risk_level: string }).risk_level).toBe("high");
  });

  it("duplicate rewrite: history collision forces a rewrite request", async () => {
    const hook = validOutput.hook_candidates[0];
    const db = makeFakeDb(happyRouter((q) => {
      if (q.table === "content_versions" && q.action === "select")
        return { data: [{ script_id: "old-1", script_hook: hook.script_hook, first_second_text: hook.first_second_text, cta: validOutput.cta, full_script: validOutput.full_script, created_at: new Date().toISOString(), scripts: { title: "外食族晚餐" } }] };
      return undefined;
    }));
    const seq = vi.fn(async () => ({ outputText: JSON.stringify(validOutput), inputTokens: 100, outputTokens: 400, model: "test-model" }));
    const r = await runGeneration(input, { db: db as unknown as SupabaseClient, userId: USER, callModel: seq });
    expect(seq).toHaveBeenCalledTimes(2); // duplicate triggered one rewrite
    expect(r.humanReviewRequired).toBe(true); // still duplicate after rewrite (same mock output)
    expect(r.duplicate?.verdict).toBe("duplicate");
  });

  it("version save failure → run failed with safe error", async () => {
    const db = makeFakeDb(happyRouter((q) => (q.table === "content_versions" && q.action === "insert" ? { error: { message: "RLS violation: not a member" } } : undefined)));
    const r = await runGeneration(input, { db: db as unknown as SupabaseClient, userId: USER, callModel: goodModelCall });
    expect(r.status).toBe("failed");
    expect(r.safeError).toContain("RLS");
  });
});
