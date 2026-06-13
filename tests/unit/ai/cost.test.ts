import { afterEach, describe, expect, it } from "vitest";
import { actualCostCents, estimateCost, estimateTokens } from "@/lib/ai/cost";

afterEach(() => { delete process.env.OPENAI_PRICE_TEST_MODEL; });

describe("cost", () => {
  it("estimates CJK-heavy text tokens", () => {
    expect(estimateTokens("减肥不用饿肚子")).toBe(7);
    expect(estimateTokens("hello world!")).toBe(3);
  });
  it("without a configured price: cost unavailable, never invented", () => {
    const e = estimateCost("unknown-model", "standard", "测试内容");
    expect(e.costAvailable).toBe(false);
    expect(e.estimatedCostCents).toBeNull();
    expect(e.totalTokens).toBeGreaterThan(0);
    const a = actualCostCents("unknown-model", 1000, 1000);
    expect(a.available).toBe(false);
    expect(a.cents).toBeNull();
  });
  it("with configured price: cents computed", () => {
    process.env.OPENAI_PRICE_TEST_MODEL = "2.5,10";
    const a = actualCostCents("test-model", 1_000_000, 1_000_000);
    expect(a.available).toBe(true);
    expect(a.cents).toBe(1250);
  });
});
