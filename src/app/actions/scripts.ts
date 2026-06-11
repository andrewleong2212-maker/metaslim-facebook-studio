"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/context";
import { approvalSchema, scriptSchema, scriptStatusSchema, versionSchema } from "@/lib/validation/schemas";

function versionPayload(values: ReturnType<typeof versionSchema.parse>, userId: string) {
  return { workspace_id: values.workspaceId, script_id: values.scriptId, parent_version_id: values.parentVersionId || null, origin: values.origin, script_hook: values.scriptHook || null, attention: values.attention || null, interest: values.interest || null, desire: values.desire || null, action: values.action || null, full_script: values.fullScript, risk_level: values.riskLevel, compliance_status: values.complianceStatus, quality_status: values.qualityStatus, created_by: userId };
}

export async function createScriptAction(formData: FormData) {
  const values = scriptSchema.parse(Object.fromEntries(formData));
  const { supabase, user } = await requireUser();
  const { data: script, error } = await supabase.from("scripts").insert({ workspace_id: values.workspaceId, title: values.title, risk_level: values.riskLevel, created_by: user.id, updated_by: user.id }).select("id").single();
  if (error) throw error;
  const version = versionSchema.parse({ ...values, scriptId: script.id, origin: "manual" });
  const { error: versionError } = await supabase.from("content_versions").insert(versionPayload(version, user.id));
  if (versionError) throw versionError;
  revalidatePath("/script-studio");
}

export async function createVersionAction(formData: FormData) {
  const values = versionSchema.parse(Object.fromEntries(formData));
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("content_versions").insert(versionPayload(values, user.id));
  if (error) throw error;
  revalidatePath("/script-studio");
}

export async function approveScriptAction(formData: FormData) {
  const values = approvalSchema.parse(Object.fromEntries(formData));
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("content_approvals").insert({ workspace_id: values.workspaceId, script_id: values.scriptId, content_version_id: values.contentVersionId, reviewer_id: user.id, decision: values.decision, reason: values.reason });
  if (error) throw error;
  revalidatePath("/script-studio"); revalidatePath("/production-board");
}

export async function updateScriptStatusAction(formData: FormData) {
  const values = scriptStatusSchema.parse(Object.fromEntries(formData));
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("scripts").update({ status: values.status, updated_by: user.id }).eq("id", values.scriptId).eq("workspace_id", values.workspaceId);
  if (error) throw error;
  revalidatePath("/script-studio"); revalidatePath("/production-board");
}
