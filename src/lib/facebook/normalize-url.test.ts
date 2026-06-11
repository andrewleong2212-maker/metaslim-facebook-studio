import { describe, expect, it } from "vitest";
import { normalizeFacebookUrl } from "./normalize-url";

describe("normalizeFacebookUrl", () => {
  it("normalizes mobile hosts and removes tracking parameters", () => {
    expect(normalizeFacebookUrl("https://m.facebook.com/metaslim/?utm_source=test&story_fbid=12&id=3#x"))
      .toBe("https://www.facebook.com/metaslim?story_fbid=12&id=3");
  });

  it("rejects non-Facebook hosts", () => {
    expect(() => normalizeFacebookUrl("https://example.com/facebook.com/page")).toThrow("只接受 Facebook URL");
  });
});
