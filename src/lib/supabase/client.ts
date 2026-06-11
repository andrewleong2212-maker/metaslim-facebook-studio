"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "./config";

export function createClient() {
  const { url, publicKey } = getSupabaseConfig();
  return createBrowserClient(url, publicKey);
}
