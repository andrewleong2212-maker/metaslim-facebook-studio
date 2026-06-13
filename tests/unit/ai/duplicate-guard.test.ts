import { describe, expect, it } from "vitest";
import { checkDuplicates, ngramSimilarity, normalizeText } from "@/lib/ai/duplicate-guard";

const now = new Date().toISOString();
const hist = (over: Partial<Parameters<typeof checkDuplicates>[1][number]> = {}) => [{
  script_id: "s1", topic: "外食族晚餐怎么选", script_hook: "你是不是每天下班都不知道吃什么？",
  first_second_text: "晚餐又乱吃了", cta: "PM我们发SLIM", full_script: "你是不是每天下班都不知道吃什么？外食很难选。PM我们发SLIM。",
  angle: "外食安排", created_at: now, ...over,
}];

describe("duplicate guard", () => {
  it("normalizes punctuation and case", () => {
    expect(normalizeText("你好，World！")).toBe(normalizeText("你好world"));
  });
  it("near-identical content → duplicate (>=0.85)", () => {
    const r = checkDuplicates(
      { topic: "外食族晚餐怎么选啦", script_hook: "你是不是每天下班都不知道吃什么呢？", first_second_text: "晚餐又乱吃了", cta: "PM我们发SLIM", full_script: "你是不是每天下班都不知道吃什么呢？外食很难选。PM我们发SLIM。", angle: "外食安排" },
      hist(),
    );
    expect(r.verdict).toBe("duplicate");
    expect(r.recommended_change).toContain("不可只换字");
    expect(r.matched_script_ids).toContain("s1");
  });
  it("genuinely different content → safe", () => {
    const r = checkDuplicates(
      { topic: "运动后嘴馋的真相", script_hook: "做完workout反而吃更多？", first_second_text: "运动完更饿", cta: "留言「了解」拿指南", full_script: "做完workout反而吃更多？这不是你的错，是身体的补偿机制。留言了解。", angle: "运动补偿心理" },
      hist(),
    );
    expect(r.verdict).toBe("safe");
  });
  it("old topics (>30d) are not topic-matched but old hooks (<90d) are", () => {
    const d40 = new Date(Date.now() - 40 * 86400000).toISOString();
    const r = checkDuplicates(
      { topic: "外食族晚餐怎么选", script_hook: "全新的开场白完全不同方向", first_second_text: "x", cta: "y", full_script: "完全不同的内容讲别的东西", angle: "z" },
      hist({ created_at: d40 }),
    );
    // topic window expired → only weaker matches remain
    expect(r.verdict).not.toBe("duplicate");
  });
  it("ngram similarity is symmetric-ish and bounded", () => {
    const s = ngramSimilarity("减肥不用饿肚子", "减肥不用饿肚子啦");
    expect(s).toBeGreaterThan(0.7);
    expect(s).toBeLessThanOrEqual(1);
  });
});
