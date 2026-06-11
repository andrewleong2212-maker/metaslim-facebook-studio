import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { redactContext, redactText } from "@/lib/security/redact";

export async function logServerError(input: {
  workspaceId?: string;
  userId?: string;
  service: string;
  operation: string;
  error: unknown;
  context?: Record<string, unknown>;
}) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) return;
  const message = input.error instanceof Error ? input.error.message : "Unknown server error";
  try {
    await createAdminClient().from("system_errors").insert({
      workspace_id: input.workspaceId ?? null,
      user_id: input.userId ?? null,
      service: input.service,
      operation: input.operation,
      severity: "error",
      error_code: input.error instanceof Error ? input.error.name : "UNKNOWN_ERROR",
      safe_message: redactText(message),
      redacted_context: redactContext(input.context)
    });
  } catch {
    // Logging must never expose secrets or hide the original failure.
  }
}
