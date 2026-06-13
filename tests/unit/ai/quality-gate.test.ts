import { describe, expect, it } from "vitest";
import { runQualityGate } from "@/lib/ai/quality-gate";
import { checkCompliance } from "@/lib/ai/compliance";
import { generationInputSchema } from "@/lib/ai/schemas/input";
import { validOutput } from "./schemas.test";

const input = generationInputSchema.parse({
  workspace_id: "11111111-1111-1111-1111-111111111111",
  campaign_goal: "whatsapp", audience_temperature: "cold", script_length: 30,
  generation_mode: "standard", formula: "aida", hook_type: "pain_point",
  cta_keyword: "SLIM", topic: "外食族晚餐", selected_trend_id: null,
  selected_material_ids: [], requested_output_count: 1,
  target_location: "Malaysia", output_language: "Malaysian Conversational Chinese",
  request_id: "req-quality-1",
});

const safeDup = { verdict: "safe" as const, similarity_score: 0.1, matched_script_ids: [], matched_sections: [], explanation: "ok", recommended_change: null };

describe("quality gate (15 checks)", () => {
  it("runs exactly 15 checks", () => {
    const r = runQualityGate(validOutput, input, { hasVerifiedTrendEvidence: false, compliance: checkCompliance(validOutput.full_script), duplicate: safeDup });
    expect(r.checks).toHaveLength(15);
  });
  it("critical fail: trend claim without verified evidence forces rewrite", () => {
    const out = { ...validOutput, full_script: validOutput.full_script + " 这个话题最近很红，全马都在讨论。" };
    const r = runQualityGate(out, input, { hasVerifiedTrendEvidence: false, compliance: checkCompliance(out.full_script), duplicate: safeDup });
    expect(r.critical_fail).toBe(true);
    expect(r.must_rewrite).toBe(true);
    expect(r.critical_reasons.join()).toContain("趋势");
  });
  it("trend claim WITH verified evidence passes trend check", () => {
    const out = { ...validOutput, full_script: validOutput.full_script + " 这个话题最近很红。" };
    const r = runQualityGate(out, input, { hasVerifiedTrendEvidence: true, compliance: checkCompliance(out.full_script, { hasVerifiedTrendEvidence: true }), duplicate: safeDup });
    const trend = r.checks.find((c) => c.id === "trend_evidence")!;
    expect(trend.pass).toBe(true);
  });
  it("missing CTA is a critical fail", () => {
    const out = { ...validOutput, cta: "x", formula_sections: validOutput.formula_sections };
    // cta non-empty but schema would reject empty; simulate weak CTA without keyword
    const r = runQualityGate({ ...out, cta: "联系我们" }, input, { hasVerifiedTrendEvidence: false, compliance: checkCompliance(out.full_script), duplicate: safeDup });
    const cta = r.checks.find((c) => c.id === "cta_clarity")!;
    expect(cta.pass).toBe(false);
    expect(r.must_rewrite).toBe(true);
  });
  it("mainland phrases fail Malaysian Chinese check", () => {
    const out = { ...validOutput, full_script: "宝子们，底层逻辑是热量差。" + validOutput.full_script };
    const r = runQualityGate(out, input, { hasVerifiedTrendEvidence: false, compliance: checkCompliance(out.full_script), duplicate: safeDup });
    const my = r.checks.find((c) => c.id === "malaysian_chinese")!;
    expect(my.pass).toBe(false);
  });
  it("cold audience with early brand mention fails audience fit", () => {
    const out = { ...validOutput, full_script: "MetaSlim AI帮你减重！" + validOutput.full_script };
    const r = runQualityGate(out, input, { hasVerifiedTrendEvidence: false, compliance: checkCompliance(out.full_script), duplicate: safeDup });
    expect(r.checks.find((c) => c.id === "audience_fit")!.pass).toBe(false);
  });
  it("high risk compliance forces critical fail", () => {
    const out = { ...validOutput, full_script: validOutput.full_script + " 保证瘦10kg！" };
    const comp = checkCompliance(out.full_script);
    const r = runQualityGate(out, input, { hasVerifiedTrendEvidence: false, compliance: comp, duplicate: safeDup });
    expect(comp.level).toBe("high_risk");
    expect(r.critical_fail).toBe(true);
  });
  it("wrong formula sections lower formula accuracy", () => {
    const out = { ...validOutput, formula_sections: [{ section_key: "random", section_label: "Random", content: "内容内容内容内容内容" }, { section_key: "other", section_label: "Other", content: "内容内容内容内容内容" }] };
    const r = runQualityGate(out, input, { hasVerifiedTrendEvidence: false, compliance: checkCompliance(out.full_script), duplicate: safeDup });
    expect(r.checks.find((c) => c.id === "formula_accuracy")!.pass).toBe(false);
    expect(r.critical_reasons).toContain("Formula严重错误");
  });
});
