import { z } from "zod";

export const CAMPAIGN_GOALS = ["reach","video_views","engagement","messenger","whatsapp","lead_form","webinar_registration","consultation","m90_sales"] as const;
export const AUDIENCE_TEMPERATURES = ["cold","warm","hot","existing_lead","webinar_registered","past_customer"] as const;
export const SCRIPT_LENGTHS = [15, 30, 45, 60, 90] as const;
export const GENERATION_MODES = ["quick","standard","deep_strategy"] as const;
export const FORMULAS = ["ai_recommended","aida","pas","hook_pain_reframe_solution_cta","storytelling","educational","direct_response","webinar_lead","soft_sell"] as const;
export const HOOK_TYPES = ["pain_point","contrarian","money_loss","identity","result_conflict","visual_shock","misconception","urgency","customer_quote","direct_promise"] as const;

export const generationInputSchema = z.object({
  workspace_id: z.string().uuid(),
  campaign_goal: z.enum(CAMPAIGN_GOALS),
  audience_temperature: z.enum(AUDIENCE_TEMPERATURES),
  script_length: z.coerce.number().pipe(z.union([z.literal(15), z.literal(30), z.literal(45), z.literal(60), z.literal(90)])),
  generation_mode: z.enum(GENERATION_MODES),
  formula: z.enum(FORMULAS),
  hook_type: z.enum(HOOK_TYPES),
  cta_keyword: z.string().trim().min(1).max(40),
  topic: z.string().trim().min(2).max(300),
  selected_trend_id: z.string().uuid().nullable(),
  selected_material_ids: z.array(z.string().uuid()).max(20).default([]),
  requested_output_count: z.coerce.number().int().min(1).max(3).default(1),
  target_location: z.string().trim().max(80).default("Malaysia"),
  output_language: z.string().trim().max(40).default("Malaysian Conversational Chinese"),
  additional_instruction: z.string().trim().max(1000).optional(),
  request_id: z.string().trim().min(8).max(80),
}).strict();

export type GenerationInput = z.infer<typeof generationInputSchema>;

export const REWRITE_LIMITS: Record<(typeof GENERATION_MODES)[number], number> = {
  quick: 1,
  standard: 1,
  deep_strategy: 2,
};
