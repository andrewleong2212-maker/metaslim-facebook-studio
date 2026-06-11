import { describe, expect, it } from "vitest";
import { redactContext, redactText } from "./redact";

describe("log redaction", () => {
  it("removes sensitive keys recursively", () => {
    expect(redactContext({ operation: "save", nested: { authorization: "Bearer abc", value: "safe" }, apiKey: "secret" }))
      .toEqual({ operation: "save", nested: { value: "safe" } });
  });

  it("masks bearer credentials in error messages", () => {
    expect(redactText("request failed Authorization Bearer abc.def.ghi")).not.toContain("abc.def.ghi");
  });
});
