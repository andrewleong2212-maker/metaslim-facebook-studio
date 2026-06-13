import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/state-panels";
import { AiResultPanels } from "@/components/domain/ai-result-panels";
import { getWorkspaceContext } from "@/lib/auth/context";

interface HookCandidate { hook_type: string; script_hook: string; visual_hook: string; motion_hook: string; first_second_text: string; why_it_may_work: string }

/** Latest AI-generated draft with full result panels (STEP 4). */
export async function AiScriptView() {
  const ctx = await getWorkspaceContext();
  if (!ctx?.membership) return null;
  const ws = ctx.membership.workspace_id;

  const { data: version } = await ctx.supabase
    .from("content_versions")
    .select("id,script_id,version_number,formula,strategy,hook_candidates,selected_hook_index,script_hook,visual_hook,motion_hook,first_second_text,full_script,rehook_text,caption,headline,cover_text,cta,cta_keyword,hashtags,production_notes,source_summary,generation_run_id,compliance_status,quality_status,created_at")
    .eq("workspace_id", ws)
    .eq("origin", "ai")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!version) {
    return (
      <Card className="mt-5">
        <CardContent>
          <EmptyState title="还没有AI生成的脚本" description="在Content Generator用真实素材生成第一篇AI Draft。系统不会显示假内容。" />
        </CardContent>
      </Card>
    );
  }

  const { data: run } = version.generation_run_id
    ? await ctx.supabase
        .from("ai_generation_runs")
        .select("quality_report,compliance_report,duplicate_report,rewrite_count,evidence_limitations,generation_mode,model,prompt_version,input_tokens,output_tokens,estimated_cost_cents,cost_available,human_review_required")
        .eq("id", version.generation_run_id)
        .maybeSingle()
    : { data: null };

  const hooks = (version.hook_candidates ?? []) as HookCandidate[];
  const strategy = version.strategy as { core_problem?: string; audience_insight?: string; angle?: string } | null;
  const sourceSummary = version.source_summary as { missing_information?: string[] } | null;

  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-bold">最新AI Draft</h2>
        <StatusBadge tone="warning">AI Draft · 需人工批准</StatusBadge>
        {run?.human_review_required && <StatusBadge tone="danger">needs_review</StatusBadge>}
        {run && <span className="text-xs text-slate-500">v{version.version_number} · {run.generation_mode} · {run.model} · {run.prompt_version} · {run.input_tokens + run.output_tokens} tokens{run.cost_available && run.estimated_cost_cents != null ? ` · ~$${(run.estimated_cost_cents / 100).toFixed(2)}` : " · cost unavailable"}</span>}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="space-y-5">
          {strategy && (
            <Card><CardHeader><h3 className="font-semibold">Strategy（{version.formula}）</h3></CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-700">
                <p><strong>核心问题：</strong>{strategy.core_problem}</p>
                <p><strong>受众洞察：</strong>{strategy.audience_insight}</p>
                <p><strong>Angle：</strong>{strategy.angle}</p>
              </CardContent></Card>
          )}

          <Card><CardHeader><h3 className="font-semibold">Hook方案（3组）</h3></CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-3">
                {hooks.map((h, i) => (
                  <div key={i} className={`rounded-xl border p-3 text-xs ${i === version.selected_hook_index ? "border-brand-300 bg-brand-50/50" : "border-slate-100 bg-slate-50"}`}>
                    <div className="mb-1 flex items-center justify-between">
                      <StatusBadge tone={i === version.selected_hook_index ? "success" : "neutral"}>{i === version.selected_hook_index ? "Selected" : h.hook_type}</StatusBadge>
                    </div>
                    <p className="font-medium text-slate-800">{h.script_hook}</p>
                    <p className="mt-1.5 text-slate-500"><strong>Visual：</strong>{h.visual_hook}</p>
                    <p className="text-slate-500"><strong>Motion：</strong>{h.motion_hook}</p>
                    <p className="text-slate-500"><strong>首秒字卡：</strong>{h.first_second_text}</p>
                    <p className="mt-1.5 text-slate-400">{h.why_it_may_work}</p>
                  </div>
                ))}
              </div>
            </CardContent></Card>

          <Card><CardHeader><h3 className="font-semibold">完整口播</h3></CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-800">{version.full_script}</pre>
              <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                <p><strong>Rehook：</strong>{version.rehook_text}</p>
                <p><strong>Headline：</strong>{version.headline}</p>
                <p><strong>Cover Text：</strong>{version.cover_text}</p>
                <p><strong>CTA：</strong>{version.cta}（Keyword：{version.cta_keyword}）</p>
              </div>
              <p className="mt-3 text-sm"><strong>Caption：</strong>{version.caption}</p>
              <p className="mt-2 text-xs text-slate-500">{((version.hashtags ?? []) as string[]).join(" ")}</p>
              <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600"><strong>Production Notes：</strong>{version.production_notes}</p>
              {sourceSummary?.missing_information && sourceSummary.missing_information.length > 0 && (
                <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800"><strong>缺失资料：</strong>{sourceSummary.missing_information.join("；")}</p>
              )}
            </CardContent></Card>
        </div>

        <AiResultPanels
          workspaceId={ws}
          scriptId={version.script_id}
          quality={run?.quality_report ?? null}
          compliance={run?.compliance_report ?? null}
          duplicate={run?.duplicate_report ?? null}
          rewriteCount={run?.rewrite_count ?? 0}
          evidenceLimitations={run?.evidence_limitations ?? null}
        />
      </div>
    </section>
  );
}
