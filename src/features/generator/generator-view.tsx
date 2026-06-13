import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/state-panels";
import { getWorkspaceContext } from "@/lib/auth/context";
import { isOpenAiConfigured } from "@/lib/ai/openai-client";
import { AiGeneratorForm } from "./ai-generator-form";

export async function GeneratorView() {
  const ctx = await getWorkspaceContext();
  const header = (
    <PageHeader
      eyebrow="AI Copywriting Engine"
      title="Content Generator"
      description="以真实证据与马来西亚口语华文生成脚本。所有输出经过Schema验证、Duplicate Guard、Compliance Checker与Quality Gate，只保存为AI Draft。"
    />
  );
  if (!ctx?.membership) {
    return <>{header}<Card><CardContent><EmptyState title="尚未加入Workspace" description="请先登录并加入一个Workspace。" /></CardContent></Card></>;
  }
  const ws = ctx.membership.workspace_id;

  // Verified + non-expired trends only — anything else may not be presented as usable
  const { data: trends } = await ctx.supabase
    .from("trend_opportunities")
    .select("id,title")
    .eq("workspace_id", ws)
    .eq("status", "verified")
    .neq("freshness_status", "expired")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(30);

  const { data: materials } = await ctx.supabase
    .from("content_materials")
    .select("id,title,material_type")
    .eq("workspace_id", ws)
    .neq("risk_level", "high")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <>
      {header}
      <AiGeneratorForm
        workspaceId={ws}
        aiConfigured={isOpenAiConfigured()}
        trends={trends ?? []}
        materials={materials ?? []}
      />
    </>
  );
}
