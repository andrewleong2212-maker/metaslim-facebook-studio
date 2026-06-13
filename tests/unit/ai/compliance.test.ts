import { describe, expect, it } from "vitest";
import { checkCompliance } from "@/lib/ai/compliance";

describe("compliance checker", () => {
  it("flags guaranteed weight loss as high risk, not approvable", () => {
    const r = checkCompliance("我们保证瘦10kg，30天内一定瘦！");
    expect(r.level).toBe("high_risk");
    expect(r.can_be_approved).toBe(false);
    expect(r.flagged_items.length).toBeGreaterThanOrEqual(2);
  });
  it("flags disease treatment claims", () => {
    expect(checkCompliance("可以治疗糖尿病").level).toBe("high_risk");
  });
  it("flags body shaming", () => {
    const r = checkCompliance("胖得像水桶没人要");
    expect(r.flagged_items.some((f) => f.rule === "body_shaming")).toBe(true);
  });
  it("flags fake trend claims when no verified evidence", () => {
    const r = checkCompliance("这个方法最近很红，全马都在讨论");
    expect(r.flagged_items.some((f) => f.rule === "fake_trend")).toBe(true);
  });
  it("allows trend claim when verified evidence exists", () => {
    const r = checkCompliance("这个话题最近很红", { hasVerifiedTrendEvidence: true });
    expect(r.flagged_items.some((f) => f.rule === "fake_trend")).toBe(false);
  });
  it("passes safe everyday copy", () => {
    const r = checkCompliance("很多女生外食很难安排饮食，其实可以慢慢调整，PM我们了解。");
    expect(r.level).toBe("safe");
    expect(r.can_be_approved).toBe(true);
  });
});
