import { afterEach, describe, expect, it } from "vitest";
import { getSupabaseConfig, getSupabasePublicKey, isSupabaseConfigured } from "./config";

const original = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  publishable: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
};

afterEach(() => {
  if (original.url === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = original.url;
  if (original.publishable === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = original.publishable;
  if (original.anon === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = original.anon;
});

describe("Supabase public environment configuration", () => {
  it("accepts and prefers the publishable key", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "legacy-anon";
    expect(isSupabaseConfigured()).toBe(true);
    expect(getSupabasePublicKey()).toBe("sb_publishable_test");
    expect(getSupabaseConfig()).toEqual({ url: "https://example.supabase.co", publicKey: "sb_publishable_test" });
  });

  it("falls back to the legacy anon key", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "legacy-anon";
    expect(isSupabaseConfigured()).toBe(true);
    expect(getSupabasePublicKey()).toBe("legacy-anon");
  });

  it("requires both the URL and one public key", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    expect(isSupabaseConfigured()).toBe(false);
  });
});
