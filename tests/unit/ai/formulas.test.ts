import { describe, expect, it } from "vitest";
import { FORMULA_DEFS, formulaPromptBlock } from "@/lib/ai/prompts/formulas";

describe("formulas", () => {
  it("implements all 8 concrete formulas", () => {
    expect(Object.keys(FORMULA_DEFS).sort()).toEqual(["aida","direct_response","educational","hook_pain_reframe_solution_cta","pas","soft_sell","storytelling","webinar_lead"].sort());
  });
  it("AIDA has the 4 sections in order", () => {
    expect(FORMULA_DEFS.aida.sections.map((s) => s.key)).toEqual(["attention","interest","desire","action"]);
  });
  it("AIDA Attention covers all four hook outputs", () => {
    const g = FORMULA_DEFS.aida.sections[0].guidance;
    for (const k of ["Script Hook","Visual Hook","Motion Hook","First-second Text"]) expect(g).toContain(k);
  });
  it("ai_recommended block demands recommendation fields", () => {
    const block = formulaPromptBlock("ai_recommended");
    for (const k of ["recommended_formula","recommendation_reason","alternative_formula"]) expect(block).toContain(k);
  });
  it("throws on unknown formula", () => {
    expect(() => formulaPromptBlock("nonsense")).toThrow();
  });
});
