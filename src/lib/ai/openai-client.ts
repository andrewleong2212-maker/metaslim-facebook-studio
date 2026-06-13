import "server-only";

import { redactText } from "@/lib/security/redact";

export type GenerationMode = "quick" | "standard" | "deep_strategy";

export function isOpenAiConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function modelForMode(mode: GenerationMode): string {
  const map: Record<GenerationMode, string | undefined> = {
    quick: process.env.OPENAI_MODEL_QUICK,
    standard: process.env.OPENAI_MODEL_STANDARD,
    deep_strategy: process.env.OPENAI_MODEL_DEEP,
  };
  const model = map[mode];
  if (!model) throw new OpenAiError("config_missing", `Model for mode "${mode}" is not configured`);
  return model;
}

export class OpenAiError extends Error {
  constructor(
    public code:
      | "config_missing" | "timeout" | "rate_limited" | "refusal"
      | "invalid_json" | "schema_mismatch" | "http_error" | "network",
    message: string,
    public status?: number,
  ) {
    super(redactText(message));
    this.name = "OpenAiError";
  }
}

export interface StructuredCallResult {
  outputText: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

interface CallOptions {
  mode: GenerationMode;
  system: string;
  user: string;
  jsonSchema: { name: string; strict: boolean; schema: Record<string, unknown> };
  maxOutputTokens?: number;
  fetchImpl?: typeof fetch; // injectable for tests
  signal?: AbortSignal;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * OpenAI Responses API with Structured Outputs.
 * Server-only; key from env; timeout + bounded retries with exponential backoff on 429/5xx.
 */
export async function callStructured(opts: CallOptions): Promise<StructuredCallResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new OpenAiError("config_missing", "OPENAI_API_KEY is not configured");
  const model = modelForMode(opts.mode);
  const timeoutMs = Number(process.env.OPENAI_REQUEST_TIMEOUT_MS ?? 120000);
  const maxRetries = Math.max(0, Number(process.env.OPENAI_MAX_RETRIES ?? 2));
  const doFetch = opts.fetchImpl ?? fetch;

  let lastError: OpenAiError | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await doFetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        signal: opts.signal ?? controller.signal,
        body: JSON.stringify({
          model,
          input: [
            { role: "system", content: opts.system },
            { role: "user", content: opts.user },
          ],
          text: { format: { type: "json_schema", ...opts.jsonSchema } },
          max_output_tokens: opts.maxOutputTokens ?? 8000,
        }),
      });

      if (res.status === 429 || res.status >= 500) {
        lastError = new OpenAiError(res.status === 429 ? "rate_limited" : "http_error", `OpenAI ${res.status}`, res.status);
        if (attempt < maxRetries) {
          await sleep(Math.min(8000, 500 * 2 ** attempt) + Math.random() * 250);
          continue;
        }
        throw lastError;
      }
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new OpenAiError("http_error", `OpenAI ${res.status}: ${body.slice(0, 200)}`, res.status);
      }

      const data = await res.json();
      if (data.status === "incomplete" || data.incomplete_details) {
        throw new OpenAiError("http_error", `Incomplete response: ${data.incomplete_details?.reason ?? "unknown"}`);
      }
      const refusal = data.output?.flatMap((o: { content?: Array<{ type: string; refusal?: string }> }) => o.content ?? [])
        .find((c: { type: string }) => c.type === "refusal");
      if (refusal) throw new OpenAiError("refusal", "Model refused the request");

      const text: string | undefined =
        data.output_text ??
        data.output?.flatMap((o: { content?: Array<{ type: string; text?: string }> }) => o.content ?? [])
          .find((c: { type: string }) => c.type === "output_text")?.text;
      if (!text) throw new OpenAiError("invalid_json", "Empty output_text from model");

      return {
        outputText: text,
        inputTokens: data.usage?.input_tokens ?? 0,
        outputTokens: data.usage?.output_tokens ?? 0,
        model,
      };
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof OpenAiError) {
        if ((err.code === "rate_limited" || err.code === "http_error") && attempt < maxRetries) { lastError = err; continue; }
        throw err;
      }
      if ((err as Error).name === "AbortError") {
        lastError = new OpenAiError("timeout", `Request timed out after ${timeoutMs}ms`);
        if (attempt < maxRetries) continue;
        throw lastError;
      }
      lastError = new OpenAiError("network", redactText(String((err as Error).message ?? err)));
      if (attempt < maxRetries) { await sleep(500 * 2 ** attempt); continue; }
      throw lastError;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError ?? new OpenAiError("network", "Unknown failure");
}
