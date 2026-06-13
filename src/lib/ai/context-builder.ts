import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { wrapUntrustedContext } from "./prompts/brand";
import type { GenerationInput } from "./schemas/input";
import type { HistoricalScript } from "./duplicate-guard";

export interface BuiltContext {
  promptBlock: string;
  evidenceIds: string[];
  hasVerifiedTrendEvidence: boolean;
  hasVerifiedProof: boolean;
  evidenceLimitations: string[];
  history: HistoricalScript[];
  summary: Record<string, unknown>;
}

/**
 * Builds prompt context under truthfulness rules:
 * - only verified + non-expired trends enter as facts
 * - rejected/unreviewed/expired evidence is excluded
 * - external Facebook copy is wrapped as untrusted context
 * - every missing input is explicitly listed
 */
export async function buildContext(db: SupabaseClient, input: GenerationInput): Promise<BuiltContext> {
  const limitations: string[] = [];
  const evidenceIds: string[] = [];
  const parts: string[] = [];
  const ws = input.workspace_id;

  // Brand profile (deep_strategy and standard both benefit; quick keeps it light)
  const { data: brand } = await db.from("brand_profile").select("voice_rules,approved_claims,prohibited_claims,default_cta,default_disclaimer").eq("workspace_id", ws).maybeSingle();
  if (brand) {
    const claims = Array.isArray(brand.approved_claims) ? brand.approved_claims : [];
    const prohibited = Array.isArray(brand.prohibited_claims) ? brand.prohibited_claims : [];
    parts.push(`【品牌资料】Approved Claims（只能用这些声明）：${claims.length ? JSON.stringify(claims) : "无 — 不得使用任何功效声明"}\nProhibited Claims：${JSON.stringify(prohibited)}\n默认CTA参考：${brand.default_cta ?? "无"}`);
    if (claims.length === 0) limitations.push("无Approved Claims，内容不得包含功效声明");
  } else {
    limitations.push("Brand Profile未配置");
  }

  // Selected trend: verified + not expired only
  let hasVerifiedTrendEvidence = false;
  if (input.selected_trend_id) {
    const { data: trend } = await db
      .from("trend_opportunities")
      .select("id,title,summary,malaysia_region,status,freshness_status,expires_at")
      .eq("workspace_id", ws)
      .eq("id", input.selected_trend_id)
      .maybeSingle();
    if (!trend) {
      limitations.push("所选趋势不存在或无权访问");
    } else if (trend.status !== "verified") {
      limitations.push(`所选趋势状态为${trend.status}，不能作为事实使用`);
    } else if (trend.freshness_status === "expired" || new Date(trend.expires_at).getTime() < Date.now()) {
      limitations.push("所选趋势已过期，不能支持「最新趋势」类声明");
    } else {
      hasVerifiedTrendEvidence = true;
      evidenceIds.push(trend.id);
      const { data: ev } = await db
        .from("trend_evidence")
        .select("id,human_summary,source_url,malaysia_region")
        .eq("workspace_id", ws)
        .eq("opportunity_id", trend.id)
        .limit(5);
      for (const e of ev ?? []) evidenceIds.push(e.id);
      parts.push(`【已验证趋势（可作为事实，限${trend.malaysia_region}）】${trend.title}：${trend.summary ?? ""}\n证据摘要：\n${(ev ?? []).map((e) => `- ${e.human_summary}（${e.malaysia_region}）`).join("\n")}`);
    }
  } else {
    limitations.push("未选择趋势 — 禁止任何「最近很红/正在上升/很多人讨论」类声明");
  }

  // Materials (user-selected)
  let hasVerifiedProof = false;
  if (input.selected_material_ids.length > 0) {
    const { data: mats } = await db
      .from("content_materials")
      .select("id,material_type,title,content,risk_level,evidence_id")
      .eq("workspace_id", ws)
      .in("id", input.selected_material_ids);
    const usable = (mats ?? []).filter((m) => m.risk_level !== "high");
    const dropped = (mats ?? []).length - usable.length;
    if (dropped > 0) limitations.push(`${dropped}个高风险Material被排除`);
    if (usable.some((m) => (m.material_type === "case_study" || m.material_type === "trust_element") && m.evidence_id)) hasVerifiedProof = true;
    for (const m of usable) {
      evidenceIds.push(m.id);
      // customer quotes / external copy are untrusted context
      const body = ["customer_quote", "trend"].includes(m.material_type)
        ? wrapUntrustedContext(`material:${m.material_type}`, m.content)
        : m.content;
      parts.push(`【素材 ${m.material_type}】${m.title}：${body}`);
    }
  } else {
    limitations.push("未选择素材 — 案例/Trust Element不可虚构");
  }

  // Recent scripts for duplicate-awareness + dedup checks (deep mode also feeds prompt)
  const { data: recent } = await db
    .from("content_versions")
    .select("script_id,script_hook,first_second_text,cta,full_script,created_at, scripts!inner(title,workspace_id)")
    .eq("scripts.workspace_id", ws)
    .order("created_at", { ascending: false })
    .limit(60);
  const history: HistoricalScript[] = (recent ?? []).map((r) => {
    const scripts = r.scripts as unknown as { title?: string } | { title?: string }[];
    const title = Array.isArray(scripts) ? scripts[0]?.title : scripts?.title;
    return {
      script_id: r.script_id,
      topic: title ?? null,
      script_hook: r.script_hook,
      first_second_text: r.first_second_text,
      cta: r.cta,
      full_script: r.full_script,
      angle: null,
      created_at: r.created_at,
    };
  });

  if (input.generation_mode === "deep_strategy") {
    const recentHooks = history.slice(0, 15).map((h) => h.script_hook).filter(Boolean);
    if (recentHooks.length) parts.push(`【最近用过的Hook（必须避开类似方向）】\n${recentHooks.map((h) => `- ${h}`).join("\n")}`);
    // Performance metrics if any exist
    const { data: perf } = await db
      .from("performance_metrics")
      .select("leads,whatsapp,messenger,reach,published_content_id")
      .eq("workspace_id", ws)
      .limit(20);
    if (perf && perf.length > 0) {
      parts.push(`【真实表现数据（${perf.length}条记录，仅供策略参考）】总Leads：${perf.reduce((s, p) => s + (p.leads ?? 0), 0)}，总Reach：${perf.reduce((s, p) => s + (p.reach ?? 0), 0)}`);
    } else {
      limitations.push("无Performance数据 — 禁止声称某Hook/内容表现最佳");
    }
  } else {
    limitations.push("非Deep模式 — 未注入历史表现数据");
  }

  if (input.additional_instruction) {
    parts.push(wrapUntrustedContext("user_additional_instruction", input.additional_instruction));
  }

  parts.push(`【缺失资料（必须原样列入source_summary.missing_information）】\n${limitations.map((l) => `- ${l}`).join("\n") || "- 无"}`);

  return {
    promptBlock: parts.join("\n\n"),
    evidenceIds,
    hasVerifiedTrendEvidence,
    hasVerifiedProof,
    evidenceLimitations: limitations,
    history,
    summary: {
      verified_trend: hasVerifiedTrendEvidence,
      materials_count: input.selected_material_ids.length,
      history_scanned: history.length,
      limitations_count: limitations.length,
    },
  };
}
