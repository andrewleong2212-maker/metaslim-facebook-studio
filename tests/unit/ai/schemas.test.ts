import { describe, expect, it } from "vitest";
import { generationInputSchema, REWRITE_LIMITS } from "@/lib/ai/schemas/input";
import { generationOutputSchema } from "@/lib/ai/schemas/output";

const validInput = {
  workspace_id: "11111111-1111-1111-1111-111111111111",
  campaign_goal: "whatsapp", audience_temperature: "cold", script_length: 60,
  generation_mode: "standard", formula: "aida", hook_type: "pain_point",
  cta_keyword: "SLIM", topic: "外食族晚餐不知道怎么选", selected_trend_id: null,
  selected_material_ids: [], requested_output_count: 1,
  target_location: "Malaysia", output_language: "Malaysian Conversational Chinese",
  request_id: "req-12345678",
};

const rawHook = { hook_type: "pain_point", script_hook: "你是不是也这样？", visual_hook: "对镜头叹气", motion_hook: "快速推近", first_second_text: "晚餐又乱吃了", why_it_may_work: "直击外食族痛点" };

const rawOutput = {
  generation_metadata: { formula_used: "aida", recommended_formula: null, recommendation_reason: null, alternative_formula: null, output_language: "Malaysian Conversational Chinese" },
  strategy: { core_problem: "外食难控制", audience_insight: "下班太累不想煮", angle: "不是自律问题是安排问题", evidence_basis: [], evidence_limitations: null },
  hook_candidates: [rawHook, { ...rawHook, hook_type: "contrarian", script_hook: "少吃多动其实害了你" }, { ...rawHook, hook_type: "misconception", script_hook: "不吃晚餐不会瘦更快" }],
  selected_hook: 0,
  formula_sections: [
    { section_key: "attention", section_label: "Attention", content: "你是不是也这样？每天下班只能外食。" },
    { section_key: "interest", section_label: "Interest", content: "晚上八点，mamak档前面想半天，最后还是点了mee goreng。" },
    { section_key: "desire", section_label: "Desire", content: "问题不是你不自律，是没有人帮你安排。MetaSlim的营养师会按你的生活帮你规划。" },
    { section_key: "action", section_label: "Action", content: "PM我们，发SLIM，拿你的饮食安排，现在开始不用再乱猜。" },
  ],
  full_script: "你是不是也这样？每天下班只能外食。晚上八点，mamak档前面想半天，最后还是点了mee goreng。问题不是你不自律，是没有人帮你安排。MetaSlim的营养师会按你的生活帮你规划，吃什么不用再猜。PM我们，发SLIM，拿你的专属饮食安排，现在开始改变。",
  rehook_text: "外食族也可以瘦", caption: "外食不是问题，乱猜才是。", headline: "外食族的晚餐安排", cover_text: "晚餐不用再猜",
  cta: "PM我们，发SLIM，拿你的专属饮食安排", cta_keyword: "SLIM", hashtags: ["#外食族"], production_notes: "真人面对镜头，mamak场景B-roll",
  source_summary: { verified_evidence_used: [], materials_used: [], missing_information: ["未选择趋势"] },
};

export const validOutput = generationOutputSchema.parse(rawOutput);
export const validHook = validOutput.hook_candidates[0];

describe("generationInputSchema", () => {
  it("accepts a valid input", () => {
    expect(generationInputSchema.parse(validInput).script_length).toBe(60);
  });
  it("rejects invalid enum values", () => {
    expect(() => generationInputSchema.parse({ ...validInput, campaign_goal: "spam" })).toThrow();
    expect(() => generationInputSchema.parse({ ...validInput, script_length: 75 })).toThrow();
    expect(() => generationInputSchema.parse({ ...validInput, formula: "magic" })).toThrow();
  });
  it("rejects unknown fields (strict)", () => {
    expect(() => generationInputSchema.parse({ ...validInput, evil: 1 })).toThrow();
  });
  it("rewrite limits follow spec", () => {
    expect(REWRITE_LIMITS.quick).toBe(1);
    expect(REWRITE_LIMITS.standard).toBe(1);
    expect(REWRITE_LIMITS.deep_strategy).toBe(2);
  });
});

describe("generationOutputSchema", () => {
  it("accepts a valid structured output", () => {
    expect(generationOutputSchema.parse(validOutput).hook_candidates).toHaveLength(3);
  });
  it("rejects empty full_script / empty cta", () => {
    expect(() => generationOutputSchema.parse({ ...validOutput, full_script: " " })).toThrow();
    expect(() => generationOutputSchema.parse({ ...validOutput, cta: "" })).toThrow();
  });
  it("rejects fewer than 3 hooks", () => {
    expect(() => generationOutputSchema.parse({ ...validOutput, hook_candidates: [validHook] })).toThrow();
  });
  it("rejects unknown fields", () => {
    expect(() => generationOutputSchema.parse({ ...validOutput, extra_field: true })).toThrow();
  });
});
