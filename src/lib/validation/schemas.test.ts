import { describe, expect, it } from "vitest";
import { evidenceSchema, scriptSchema } from "./schemas";

describe("server validation", () => {
  it("rejects evidence whose expiry is not after observation", () => {
    const result = evidenceSchema.safeParse({ workspaceId: crypto.randomUUID(), sourceUrl: "https://facebook.com/x", summary: "人工摘要", region: "Selangor", observedAt: "2026-06-11", expiresAt: "2026-06-10" });
    expect(result.success).toBe(false);
  });

  it("accepts an explicit high-risk draft but leaves approval to database rules", () => {
    const result = scriptSchema.safeParse({ workspaceId: crypto.randomUUID(), title: "Draft", fullScript: "真实草稿", riskLevel: "high", complianceStatus: "pending", qualityStatus: "pending" });
    expect(result.success).toBe(true);
  });
});
