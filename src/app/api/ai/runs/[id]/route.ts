import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/context";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requireUser();
  const { id } = await params;
  // RLS scopes this to the member's workspaces
  const { data, error } = await supabase
    .from("ai_generation_runs")
    .select("id,status,stage_detail,rewrite_count,script_id,content_version_id,human_review_required,quality_report,compliance_report,duplicate_report,input_tokens,output_tokens,estimated_cost_cents,cost_available,safe_error_message,evidence_limitations,created_at")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Run不存在或无权访问" }, { status: 404 });
  return NextResponse.json(data);
}
