import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/context";
import { runGeneration } from "@/lib/ai/engine";
import { isOpenAiConfigured } from "@/lib/ai/openai-client";
import { generationInputSchema } from "@/lib/ai/schemas/input";
import { logServerError } from "@/lib/logging/server-logger";
import { redactText } from "@/lib/security/redact";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const { supabase, user } = await requireUser();
  if (!isOpenAiConfigured()) {
    return NextResponse.json({ error: "OpenAI尚未配置（OPENAI_API_KEY）。配置前不会生成任何内容。" }, { status: 503 });
  }

  let input;
  try {
    input = generationInputSchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: "输入验证失败", detail: redactText(String(e)).slice(0, 500) }, { status: 400 });
  }

  // Workspace membership + role check (RLS also enforces; this returns a clear error early)
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", input.workspace_id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (!membership || !["admin", "editor"].includes(membership.role)) {
    return NextResponse.json({ error: "需要admin或editor权限" }, { status: 403 });
  }

  try {
    const result = await runGeneration(input, { db: supabase, userId: user.id });
    const status = result.status === "succeeded" ? 200 : result.status === "blocked" ? 429 : 502;
    return NextResponse.json(result, { status });
  } catch (err) {
    await logServerError({ service: "ai_api", operation: "generate", error: err, workspaceId: input.workspace_id, userId: user.id });
    return NextResponse.json({ error: "生成失败，请稍后再试" }, { status: 500 });
  }
}
