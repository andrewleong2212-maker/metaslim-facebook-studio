"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/context";
import { evidenceReviewSchema, evidenceSchema } from "@/lib/validation/schemas";

export async function createEvidenceAction(formData: FormData) {
  const values = evidenceSchema.parse(Object.fromEntries(formData));
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("trend_evidence").insert({ workspace_id: values.workspaceId, source_url: values.sourceUrl, human_summary: values.summary, malaysia_region: values.region, observed_at: values.observedAt.toISOString(), expires_at: values.expiresAt.toISOString(), created_by: user.id });
  if (error) throw error;
  revalidatePath("/trend-radar");
}

export async function reviewEvidenceAction(formData: FormData) {
  const values = evidenceReviewSchema.parse(Object.fromEntries(formData));
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("review_evidence", { target_workspace: values.workspaceId, target_evidence: values.evidenceId, target_decision: values.decision, target_credibility: values.credibilityRating, target_location_relevance: values.locationRelevance, target_notes: values.notes });
  if (error) throw error;
  revalidatePath("/trend-radar");
}
