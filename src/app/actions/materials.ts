"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/context";
import { deleteRecordSchema, materialSchema } from "@/lib/validation/schemas";

export async function createMaterialAction(formData: FormData) {
  const values = materialSchema.parse(Object.fromEntries(formData));
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("content_materials").insert({ workspace_id: values.workspaceId, material_type: values.materialType, title: values.title, content: values.content, source_url: values.sourceUrl || null, risk_level: values.riskLevel, created_by: user.id });
  if (error) throw error;
  revalidatePath("/content-materials");
}

export async function deleteMaterialAction(formData: FormData) {
  const values = deleteRecordSchema.parse(Object.fromEntries(formData));
  const { supabase } = await requireUser();
  const { error } = await supabase.from("content_materials").delete().eq("id", values.id).eq("workspace_id", values.workspaceId);
  if (error) throw error;
  revalidatePath("/content-materials");
}
