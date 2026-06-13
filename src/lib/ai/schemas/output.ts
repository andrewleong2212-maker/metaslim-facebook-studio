import { z } from "zod";
import { FORMULAS, HOOK_TYPES } from "./input";

const nonEmpty = z.string().trim().min(1);

export const hookCandidateSchema = z.object({
  hook_type: z.enum(HOOK_TYPES),
  script_hook: nonEmpty,
  visual_hook: nonEmpty,
  motion_hook: nonEmpty,
  first_second_text: nonEmpty,
  why_it_may_work: nonEmpty,
}).strict();

export const formulaSectionSchema = z.object({
  section_key: nonEmpty,
  section_label: nonEmpty,
  content: nonEmpty,
}).strict();

export const generationOutputSchema = z.object({
  generation_metadata: z.object({
    formula_used: z.enum(FORMULAS.filter((f) => f !== "ai_recommended") as [string, ...string[]]),
    recommended_formula: z.string().nullable(),
    recommendation_reason: z.string().nullable(),
    alternative_formula: z.string().nullable(),
    output_language: nonEmpty,
  }).strict(),
  strategy: z.object({
    core_problem: nonEmpty,
    audience_insight: nonEmpty,
    angle: nonEmpty,
    evidence_basis: z.array(z.string()).default([]),
    evidence_limitations: z.string().nullable(),
  }).strict(),
  hook_candidates: z.array(hookCandidateSchema).min(3),
  selected_hook: z.number().int().min(0),
  formula_sections: z.array(formulaSectionSchema).min(2),
  full_script: nonEmpty,
  rehook_text: nonEmpty,
  caption: nonEmpty,
  headline: nonEmpty,
  cover_text: nonEmpty,
  cta: nonEmpty,
  cta_keyword: nonEmpty,
  hashtags: z.array(z.string().trim().min(1)).max(15),
  production_notes: nonEmpty,
  source_summary: z.object({
    verified_evidence_used: z.array(z.string()).default([]),
    materials_used: z.array(z.string()).default([]),
    missing_information: z.array(z.string()).default([]),
  }).strict(),
}).strict();

export type GenerationOutput = z.infer<typeof generationOutputSchema>;

/** JSON Schema handed to OpenAI Structured Outputs (strict mode). */
export function generationOutputJsonSchema() {
  // Hand-written to keep additionalProperties:false everywhere (OpenAI strict requirement).
  const str = { type: "string" };
  const strArr = { type: "array", items: str };
  return {
    name: "metaslim_generation_output",
    strict: true,
    schema: {
      type: "object", additionalProperties: false,
      required: ["generation_metadata","strategy","hook_candidates","selected_hook","formula_sections","full_script","rehook_text","caption","headline","cover_text","cta","cta_keyword","hashtags","production_notes","source_summary"],
      properties: {
        generation_metadata: { type: "object", additionalProperties: false, required: ["formula_used","recommended_formula","recommendation_reason","alternative_formula","output_language"], properties: { formula_used: str, recommended_formula: { type: ["string","null"] }, recommendation_reason: { type: ["string","null"] }, alternative_formula: { type: ["string","null"] }, output_language: str } },
        strategy: { type: "object", additionalProperties: false, required: ["core_problem","audience_insight","angle","evidence_basis","evidence_limitations"], properties: { core_problem: str, audience_insight: str, angle: str, evidence_basis: strArr, evidence_limitations: { type: ["string","null"] } } },
        hook_candidates: { type: "array", minItems: 3, items: { type: "object", additionalProperties: false, required: ["hook_type","script_hook","visual_hook","motion_hook","first_second_text","why_it_may_work"], properties: { hook_type: str, script_hook: str, visual_hook: str, motion_hook: str, first_second_text: str, why_it_may_work: str } } },
        selected_hook: { type: "integer" },
        formula_sections: { type: "array", minItems: 2, items: { type: "object", additionalProperties: false, required: ["section_key","section_label","content"], properties: { section_key: str, section_label: str, content: str } } },
        full_script: str, rehook_text: str, caption: str, headline: str, cover_text: str, cta: str, cta_keyword: str,
        hashtags: strArr, production_notes: str,
        source_summary: { type: "object", additionalProperties: false, required: ["verified_evidence_used","materials_used","missing_information"], properties: { verified_evidence_used: strArr, materials_used: strArr, missing_information: strArr } },
      },
    },
  } as const;
}
