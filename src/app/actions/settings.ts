"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/context";
import { settingsSchema } from "@/lib/validation/schemas";

export async function updateCostSettingsAction(formData: FormData) {
  const values = settingsSchema.parse(Object.fromEntries(formData));
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("workspace_settings").update({ daily_request_limit: values.dailyRequestLimit, monthly_request_limit: values.monthlyRequestLimit, per_request_cost_limit_cents: values.perRequestCostLimitCents, daily_cost_limit_cents: values.dailyCostLimitCents, monthly_cost_limit_cents: values.monthlyCostLimitCents, trend_expiry_days: values.trendExpiryDays, updated_by: user.id }).eq("workspace_id", values.workspaceId);
  if (error) throw error;
  revalidatePath("/settings");
}
