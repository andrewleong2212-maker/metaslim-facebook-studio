import type { GenerationMode } from "./openai-client";

/**
 * Cost estimation. Prices come from env (USD per 1M tokens). If a price is not
 * configured we never invent one: cost_available=false and only tokens shown.
 */
export interface CostEstimate {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostCents: number | null;
  costAvailable: boolean;
}

function priceFor(model: string): { inUsd: number; outUsd: number } | null {
  // OPENAI_PRICE_<MODEL>: "input_usd_per_1m,output_usd_per_1m" with model uppercased, non-alnum → _
  const key = "OPENAI_PRICE_" + model.toUpperCase().replace(/[^A-Z0-9]/g, "_");
  const raw = process.env[key];
  if (!raw) return null;
  const [i, o] = raw.split(",").map(Number);
  if (!Number.isFinite(i) || !Number.isFinite(o)) return null;
  return { inUsd: i, outUsd: o };
}

/** Rough token estimate: CJK ≈ 1 token/char, others ≈ 1 token/4 chars. */
export function estimateTokens(text: string): number {
  let cjk = 0, other = 0;
  for (const ch of text) {
    if (/[一-鿿㐀-䶿]/.test(ch)) cjk++;
    else other++;
  }
  return Math.ceil(cjk + other / 4);
}

const EXPECTED_OUTPUT_TOKENS: Record<GenerationMode, number> = {
  quick: 2200,
  standard: 3500,
  deep_strategy: 5000,
};

export function estimateCost(model: string, mode: GenerationMode, promptText: string): CostEstimate {
  const inputTokens = estimateTokens(promptText);
  const outputTokens = EXPECTED_OUTPUT_TOKENS[mode];
  const price = priceFor(model);
  if (!price) {
    return { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens, estimatedCostCents: null, costAvailable: false };
  }
  const usd = (inputTokens * price.inUsd + outputTokens * price.outUsd) / 1_000_000;
  return { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens, estimatedCostCents: Math.ceil(usd * 100), costAvailable: true };
}

export function actualCostCents(model: string, inputTokens: number, outputTokens: number): { cents: number | null; available: boolean } {
  const price = priceFor(model);
  if (!price) return { cents: null, available: false };
  const usd = (inputTokens * price.inUsd + outputTokens * price.outUsd) / 1_000_000;
  return { cents: Math.ceil(usd * 100), available: true };
}
