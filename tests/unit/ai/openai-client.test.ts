import { beforeEach, describe, expect, it, vi } from "vitest";
import { callStructured, OpenAiError } from "@/lib/ai/openai-client";

const schema = { name: "t", strict: true, schema: { type: "object" } };
const baseOpts = { mode: "standard" as const, system: "s", user: "u", jsonSchema: schema };

function okResponse(text = '{"ok":true}') {
  return new Response(JSON.stringify({ output_text: text, usage: { input_tokens: 10, output_tokens: 20 }, output: [] }), { status: 200 });
}

beforeEach(() => {
  process.env.OPENAI_API_KEY = "test-key-not-real";
  process.env.OPENAI_MODEL_STANDARD = "test-model";
  process.env.OPENAI_MAX_RETRIES = "2";
  process.env.OPENAI_REQUEST_TIMEOUT_MS = "5000";
});

describe("openai client", () => {
  it("succeeds and returns usage", async () => {
    const fetchImpl = vi.fn(async () => okResponse());
    const r = await callStructured({ ...baseOpts, fetchImpl });
    expect(r.outputText).toBe('{"ok":true}');
    expect(r.inputTokens).toBe(10);
    expect(r.model).toBe("test-model");
  });
  it("throws config_missing without API key", async () => {
    delete process.env.OPENAI_API_KEY;
    await expect(callStructured({ ...baseOpts, fetchImpl: vi.fn() })).rejects.toMatchObject({ code: "config_missing" });
  });
  it("retries on 429 with backoff then succeeds", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response("rate", { status: 429 }))
      .mockResolvedValueOnce(okResponse());
    const r = await callStructured({ ...baseOpts, fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(r.outputText).toContain("ok");
  });
  it("gives up after max retries on persistent 429", async () => {
    const fetchImpl = vi.fn(async () => new Response("rate", { status: 429 }));
    await expect(callStructured({ ...baseOpts, fetchImpl })).rejects.toMatchObject({ code: "rate_limited" });
    expect(fetchImpl).toHaveBeenCalledTimes(3); // 1 + 2 retries
  });
  it("maps refusal", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ output: [{ content: [{ type: "refusal", refusal: "no" }] }] }), { status: 200 }));
    await expect(callStructured({ ...baseOpts, fetchImpl })).rejects.toMatchObject({ code: "refusal" });
  });
  it("maps empty output to invalid_json", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ output: [] }), { status: 200 }));
    await expect(callStructured({ ...baseOpts, fetchImpl })).rejects.toMatchObject({ code: "invalid_json" });
  });
  it("times out via AbortError", async () => {
    process.env.OPENAI_REQUEST_TIMEOUT_MS = "30";
    process.env.OPENAI_MAX_RETRIES = "0";
    const fetchImpl = vi.fn((_url: unknown, init?: RequestInit) => new Promise<Response>((_res, rej) => {
      init?.signal?.addEventListener("abort", () => { const e = new Error("aborted"); e.name = "AbortError"; rej(e); });
    }));
    await expect(callStructured({ ...baseOpts, fetchImpl: fetchImpl as unknown as typeof fetch })).rejects.toMatchObject({ code: "timeout" });
  });
  it("never includes the api key in error messages", async () => {
    const fetchImpl = vi.fn(async () => new Response("boom api_key=sk-leakyleaky123", { status: 400 }));
    try { await callStructured({ ...baseOpts, fetchImpl }); expect.unreachable(); }
    catch (e) { expect((e as OpenAiError).message).not.toContain("sk-leakyleaky123"); }
  });
});
