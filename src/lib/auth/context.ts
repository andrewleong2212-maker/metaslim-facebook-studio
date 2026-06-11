import "server-only";

import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function requireUser() {
  if (!isSupabaseConfigured()) throw new Error("Supabase 尚未配置");
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  return { supabase, user };
}

export async function getWorkspaceContext() {
  if (!isSupabaseConfigured()) return null;
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, workspaces(id,name,slug)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? { supabase, user, membership: data } : { supabase, user, membership: null };
}
