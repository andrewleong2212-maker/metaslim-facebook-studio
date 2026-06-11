"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, workspaceSchema } from "@/lib/validation/schemas";

export async function signInAction(formData: FormData) {
  const values = loginSchema.parse(Object.fromEntries(formData));
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(values);
  if (error) redirect(`/login?error=${encodeURIComponent("登录失败，请检查账号或密码")}`);
  redirect("/");
}

export async function signUpAction(formData: FormData) {
  const values = loginSchema.parse(Object.fromEntries(formData));
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp(values);
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect(`/login?message=${encodeURIComponent("账号已建立，请按 Supabase Auth 设置完成验证")}`);
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function createWorkspaceAction(formData: FormData) {
  const values = workspaceSchema.parse(Object.fromEntries(formData));
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_workspace", {
    workspace_name: values.name,
    workspace_slug: values.slug
  });
  if (error) throw error;
  redirect("/");
}
