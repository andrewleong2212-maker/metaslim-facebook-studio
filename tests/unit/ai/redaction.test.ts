import { describe, expect, it } from "vitest";
import { redactText } from "@/lib/security/redact";
import { OpenAiError } from "@/lib/ai/openai-client";

describe("secret redaction in AI errors", () => {
  it("OpenAiError messages are redacted", () => {
    const e = new OpenAiError("http_error", "failed with api_key=sk-supersecret12345 and Bearer abc.def.ghi-jkl");
    expect(e.message).not.toContain("sk-supersecret12345");
    expect(e.message).toContain("[REDACTED]");
  });
  it("redactText strips bearer tokens", () => {
    expect(redactText("Authorization: Bearer abcdef123456")).not.toContain("abcdef123456");
  });
});
