/**
 * Quality Gate — 15 independent checks. Deterministic heuristics (no extra AI
 * cost). Each check: score 0-10, pass/fail, reason, suggested_revision.
 */
import type { GenerationOutput } from "./schemas/output";
import type { GenerationInput } from "./schemas/input";
import { FORMULA_DEFS } from "./prompts/formulas";
import { checkCompliance, type ComplianceReport } from "./compliance";
import type { DuplicateReport } from "./duplicate-guard";

export interface QualityCheck {
  id: string;
  label: string;
  score: number;
  pass: boolean;
  reason: string;
  suggested_revision: string | null;
}

export interface QualityReport {
  checks: QualityCheck[];
  must_rewrite: boolean;
  critical_fail: boolean;
  critical_reasons: string[];
  overall_score: number;
}

const MUST_PASS_8 = new Set(["hook_strength","logical_flow","formula_accuracy","product_bridge","cta_clarity","trend_evidence","compliance"]);

const BANNED_OPENINGS = ["今天想跟大家分享", "大家好", "今天来聊聊", "今天要分享"];
const MAINLAND_PHRASES = ["宝子们","家人们","绝绝子","狠狠拿捏","咱们","赋能","闭环","赛道","底层逻辑","高能预警","颠覆认知"];

function clamp(v: number) { return Math.max(0, Math.min(10, Math.round(v))); }

export function runQualityGate(
  output: GenerationOutput,
  input: GenerationInput,
  ctx: { hasVerifiedTrendEvidence: boolean; compliance: ComplianceReport; duplicate: DuplicateReport },
): QualityReport {
  const checks: QualityCheck[] = [];
  const script = output.full_script;
  const criticalReasons: string[] = [];
  const add = (id: string, label: string, score: number, reason: string, fix: string | null = null) => {
    const s = clamp(score);
    checks.push({ id, label, score: s, pass: s >= 8, reason, suggested_revision: s >= 8 ? null : fix });
  };

  // 1 Audience Fit
  const coldMentionsEarly = input.audience_temperature === "cold" && script.slice(0, 120).includes("MetaSlim");
  add("audience_fit", "Audience Fit", coldMentionsEarly ? 5 : 9,
    coldMentionsEarly ? "Cold Audience开头就出现品牌" : "受众处理符合温度设定",
    coldMentionsEarly ? "Cold开头先讲顾客与问题，品牌后移" : null);

  // 2 Single Core Message
  const sections = output.formula_sections.length;
  add("single_core_message", "Single Core Message", sections <= 9 && script.length < input.script_length * 14 * 2.2 ? 9 : 6,
    "以脚本长度与结构估计核心信息集中度", "压缩到一个核心问题");

  // 3 Hook Strength
  const hook = output.hook_candidates[output.selected_hook] ?? output.hook_candidates[0];
  const hookGeneric = BANNED_OPENINGS.some((b) => hook.script_hook.includes(b)) || hook.script_hook.length < 6;
  const hookVariety = new Set(output.hook_candidates.map((h) => h.script_hook.slice(0, 12))).size >= 3;
  add("hook_strength", "Hook Strength", hookGeneric ? 4 : hookVariety ? 9 : 7,
    hookGeneric ? "Hook空泛或使用禁止开场" : hookVariety ? "3组Hook方向真正不同" : "Hook差异度不足",
    hookGeneric ? "改为直接点名痛点/冲突/打破认知的开场" : hookVariety ? null : "重写Hook使方向真正不同");

  // 4 Scenario Specificity
  const sceneMarkers = ["早上","晚上","下班","煮饭","孩子","老公","mamak","奶茶","办公室","衣服","镜子","聚会","拍照","外食","打包"];
  const sceneHits = sceneMarkers.filter((m) => script.includes(m)).length;
  add("scenario_specificity", "Scenario Specificity", sceneHits >= 2 ? 9 : sceneHits === 1 ? 7 : 5,
    `检测到${sceneHits}个生活场景信号`, sceneHits >= 2 ? null : "加入具体马来西亚生活场景");

  // 5 Logical Flow
  const sectionKeys = output.formula_sections.map((s) => s.section_key);
  const hasEmptySection = output.formula_sections.some((s) => s.content.trim().length < 10);
  add("logical_flow", "Logical Flow", hasEmptySection ? 5 : 9,
    hasEmptySection ? "存在内容过短的结构段" : "结构段完整连贯", hasEmptySection ? "补全过短段落" : null);

  // 6 Formula Accuracy
  const formulaUsed = output.generation_metadata.formula_used;
  const def = FORMULA_DEFS[formulaUsed];
  let formulaScore = 9;
  let formulaReason = `formula_used=${formulaUsed}`;
  if (!def) { formulaScore = 2; formulaReason = "未知Formula"; criticalReasons.push("Formula严重错误"); }
  else {
    const expected = def.sections.map((s) => s.key);
    const missing = expected.filter((k) => !sectionKeys.includes(k));
    if (missing.length > expected.length / 2) { formulaScore = 3; formulaReason = `缺少大部分结构段：${missing.join(",")}`; criticalReasons.push("Formula严重错误"); }
    else if (missing.length > 0) { formulaScore = 6; formulaReason = `缺少结构段：${missing.join(",")}`; }
  }
  add("formula_accuracy", "Formula Accuracy", formulaScore, formulaReason, formulaScore >= 8 ? null : "按Formula定义补齐结构段");

  // 7 Natural Product Bridge
  const brandCount = (script.match(/MetaSlim/gi) ?? []).length;
  add("product_bridge", "Natural Product Bridge", brandCount === 0 ? 6 : brandCount <= 3 ? 9 : 6,
    `品牌出现${brandCount}次`, brandCount === 0 ? "在后段自然桥接MetaSlim" : brandCount > 3 ? "减少品牌重复，桥接一次即可" : null);

  // 8 CTA Clarity
  const ctaHasKeyword = output.cta.includes(output.cta_keyword);
  const ctaScore = !output.cta.trim() ? 0 : ctaHasKeyword ? 9 : 6;
  if (!output.cta.trim()) criticalReasons.push("CTA缺失");
  add("cta_clarity", "CTA Clarity", ctaScore,
    ctaHasKeyword ? "CTA含Keyword与行动指令" : "CTA未包含Keyword", ctaScore >= 8 ? null : `CTA需说明发送Keyword「${output.cta_keyword}」、会得到什么、为什么现在`);

  // 9 Malaysian Chinese
  const mainlandHits = MAINLAND_PHRASES.filter((p) => script.includes(p));
  add("malaysian_chinese", "Malaysian Chinese", mainlandHits.length === 0 ? 9 : 4,
    mainlandHits.length ? `出现非马来西亚用语：${mainlandHits.join("、")}` : "用语符合马来西亚口语华文",
    mainlandHits.length ? "替换为马来西亚口语表达" : null);

  // 10 Speakability
  const sentences = script.split(/[。！？!?\n]/).filter((s) => s.trim().length > 0);
  const longSentences = sentences.filter((s) => s.trim().length > 28).length;
  const longRatio = sentences.length ? longSentences / sentences.length : 1;
  add("speakability", "Speakability", longRatio <= 0.15 ? 9 : longRatio <= 0.3 ? 7 : 5,
    `超长句比例 ${(longRatio * 100).toFixed(0)}%`, longRatio <= 0.15 ? null : "拆短句，适合真人口播");

  // 11 Trend Evidence Accuracy
  const trendClaims = /(最近(很红|爆红|流行)|正在上升|很多人(在)?讨论|全马都在)/u.test(script);
  const trendOk = !trendClaims || ctx.hasVerifiedTrendEvidence;
  if (!trendOk) criticalReasons.push("无趋势来源的趋势声明");
  add("trend_evidence", "Trend Evidence Accuracy", trendOk ? 9 : 2,
    trendOk ? "无未经证实的趋势声明" : "出现趋势声明但无Verified趋势证据", trendOk ? null : "删除趋势声明或引用已验证趋势");

  // 12 Compliance
  const comp = ctx.compliance;
  if (comp.level === "high_risk") criticalReasons.push("Compliance高风险");
  add("compliance", "Compliance", comp.level === "safe" ? 9 : comp.level === "needs_revision" ? 6 : 2,
    comp.level === "safe" ? "未检出合规风险" : `检出${comp.flagged_items.length}项：${comp.flagged_items.map((f) => f.risk_reason).join("、")}`,
    comp.level === "safe" ? null : "按flagged_items的safe_rewrite修改");

  // 13 Duplicate Risk
  const dup = ctx.duplicate;
  add("duplicate_risk", "Duplicate Risk", dup.verdict === "safe" ? 9 : dup.verdict === "similar" ? 6 : 3,
    `相似度 ${dup.similarity_score}（${dup.verdict}）`, dup.verdict === "safe" ? null : dup.recommended_change);

  // 14 Script Length Fit
  const targetChars = input.script_length * 4.5; // ~4.5 chars/sec spoken Malaysian Chinese
  const ratio = script.replace(/\s/g, "").length / targetChars;
  add("length_fit", "Script Length Fit", ratio >= 0.6 && ratio <= 1.5 ? 9 : ratio >= 0.4 && ratio <= 1.9 ? 7 : 5,
    `长度约为目标的${(ratio * 100).toFixed(0)}%`, ratio >= 0.6 && ratio <= 1.5 ? null : `调整到约${Math.round(targetChars)}字（${input.script_length}秒口播）`);

  // 15 Publish Worthiness（综合）
  const avg = checks.reduce((s, c) => s + c.score, 0) / checks.length;
  add("publish_worthiness", "Publish Worthiness", avg >= 8 ? 9 : avg >= 6.5 ? 7 : 5,
    `综合质量 ${avg.toFixed(1)}/10`, avg >= 8 ? null : "按各项suggested_revision优先修复必过项");

  // 数字/案例虚构 critical检查（结合证据上下文）
  if (/(\d{2,}%|\d+\s*(kg|公斤))/.test(script) && !ctx.hasVerifiedTrendEvidence && ctx.compliance.flagged_items.some((f) => f.rule === "fake_stats" || f.rule === "guaranteed_kg")) {
    criticalReasons.push("虚构数字/无证据数据");
  }

  const mustRewrite = checks.some((c) => MUST_PASS_8.has(c.id) && c.score < 8);
  const overall = Number((checks.reduce((s, c) => s + c.score, 0) / checks.length).toFixed(1));
  return {
    checks,
    must_rewrite: mustRewrite || criticalReasons.length > 0,
    critical_fail: criticalReasons.length > 0,
    critical_reasons: [...new Set(criticalReasons)],
    overall_score: overall,
  };
}

export { checkCompliance };
