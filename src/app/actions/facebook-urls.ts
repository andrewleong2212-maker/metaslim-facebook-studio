"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/context";
import { normalizeFacebookUrl } from "@/lib/facebook/normalize-url";
import { logServerError } from "@/lib/logging/server-logger";
import { deleteRecordSchema, facebookUrlSchema } from "@/lib/validation/schemas";

export async function createFacebookUrlAction(formData: FormData) {
  const values = facebookUrlSchema.parse(Object.fromEntries(formData));
  const { supabase, user } = await requireUser();
  try {
    const normalizedUrl = normalizeFacebookUrl(values.url);
    const { error } = await supabase.from("facebook_url_library").insert({ workspace_id: values.workspaceId, original_url: values.url, normalized_url: normalizedUrl, url_type: values.urlType, title: values.title || null, notes: values.notes || null, created_by: user.id });
    if (error) throw error;
    revalidatePath("/facebook-research");
  } catch (error) {
    await logServerError({ workspaceId: values.workspaceId, userId: user.id, service: "supabase", operation: "facebook_url.create", error });
    throw error;
  }
}

export async function deleteFacebookUrlAction(formData: FormData) {
  const values = deleteRecordSchema.parse(Object.fromEntries(formData));
  const { supabase } = await requireUser();
  const { error } = await supabase.from("facebook_url_library").delete().eq("id", values.id).eq("workspace_id", values.workspaceId);
  if (error) throw error;
  revalidatePath("/facebook-research");
}
