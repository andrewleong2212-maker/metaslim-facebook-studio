"use client";

import { useMemo, useRef, useState } from "react";
import { CircleNotch, LockKey, Sparkle } from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { StatusBadge } from "@/components/ui/status-badge";

const GOALS = [["reach","Reach"],["video_views","Video Views"],["engagement","Engagement"],["messenger","Messenger"],["whatsapp","WhatsApp"],["lead_form","Lead Form"],["webinar_registration","Webinar Registration"],["consultation","Consultation"],["m90_sales","M90 Sales"]] as const;
const TEMPS = [["cold","Cold"],["warm","Warm"],["hot","Hot"],["existing_lead","Existing Lead"],["webinar_registered","Webinar Registered"],["past_customer","Past Customer"]] as const;
const LENGTHS = ["15","30","45","60","90"] as const;
const MODES = [["quick","Quick"],["standard","Standard"],["deep_strategy","Deep Strategy"]] as const;
const FORMULAS = [["ai_recommended","AI Recommended"],["aida","AIDA"],["pas","PAS"],["hook_pain_reframe_solution_cta","Hook-Pain-Reframe-Solution-CTA"],["storytelling","Storytelling"],["educational","Educational"],["direct_response","Direct Response"],["webinar_lead","Webinar Lead"],["soft_sell","Soft Sell"]] as const;
const HOOKS = [["pain_point","Pain Point"],["contrarian","Contrarian"],["money_loss","Money Loss"],["identity","Identity"],["result_conflict","Result Conflict"],["visual_shock","Visual Shock"],["misconception","Misconception"],["urgency","Urgency"],["customer_quote","Customer Quote"],["direct_promise","Direct Promise"]] as const;

const STAGES = ["Building Context","Generating Strategy","Generating Hooks","Writing Script","Duplicate Check","Compliance Check","Quality Gate","Saving Draft"];
const STATUS_TO_STAGE: Record<string, number> = { building_context: 0, generating: 1, quality_checks: 4, rewriting: 3, saving: 7 };

interface Trend { id: string; title: string }
interface Material { id: string; title: string; material_type: string }

export function AiGeneratorForm({ workspaceId, aiConfigured, trends, materials }: {
  workspaceId: string; aiConfigured: boolean; trends: Trend[]; materials: Material[];
}) {
  const [form, setForm] = useState({
    campaign_goal: "whatsapp", audience_temperature: "cold", script_length: "60",
    generation_mode: "standard", formula: "ai_recommended", hook_type: "pain_point",
    cta_keyword: "", topic: "", selected_trend_id: "", target_location: "Malaysia",
    additional_instruction: "",
  });
  const [materialIds, setMaterialIds] = useState<string[]>([]);
  const [estimate, setEstimate] = useState<{ total_tokens: number; estimated_cost_cents: number | null; cost_available: boolean; model: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [stageIdx, setStageIdx] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ scriptId: string | null; humanReviewRequired: boolean } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const payload = useMemo(() => ({
    workspace_id: workspaceId,
    campaign_goal: form.campaign_goal,
    audience_temperature: form.audience_temperature,
    script_length: Number(form.script_length),
    generation_mode: form.generation_mode,
    formula: form.formula,
    hook_type: form.hook_type,
    cta_keyword: form.cta_keyword.trim(),
    topic: form.topic.trim(),
    selected_trend_id: form.selected_trend_id || null,
    selected_material_ids: materialIds,
    requested_output_count: 1,
    target_location: form.target_location,
    output_language: "Malaysian Conversational Chinese",
    ...(form.additional_instruction.trim() ? { additional_instruction: form.additional_instruction.trim() } : {}),
  }), [form, materialIds, workspaceId]);

  async function loadEstimate() {
    setError(null);
    const res = await fetch("/api/ai/estimate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "估算失败"); return; }
    setEstimate(data.configured ? data : null);
    if (!data.configured) setError("OpenAI尚未配置");
  }

  async function generate() {
    setBusy(true); setError(null); setDone(null); setStageIdx(0);
    const requestId = crypto.randomUUID();
    abortRef.current = new AbortController();

    // Poll run stage while the POST is in flight
    let runId: string | null = null;
    const poll = setInterval(async () => {
      if (!runId) return;
      try {
        const r = await fetch(`/api/ai/runs/${runId}`);
        if (r.ok) {
          const run = await r.json();
          const idx = STATUS_TO_STAGE[run.status];
          if (typeof idx === "number") setStageIdx(idx);
        }
      } catch { /* polling errors are non-fatal */ }
    }, 2500);

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, request_id: requestId }),
        signal: abortRef.current.signal,
      });
      const data = await res.json();
      runId = data.runId ?? null;
      if (!res.ok) { setError(data.safeError ?? data.error ?? "生成失败"); return; }
      setStageIdx(STAGES.length - 1);
      setDone({ scriptId: data.scriptId, humanReviewRequired: data.humanReviewRequired });
    } catch (e) {
      setError(e instanceof DOMException && e.name === "AbortError" ? "已取消" : "网络错误，请重试");
    } finally {
      clearInterval(poll);
      setBusy(false); setStageIdx(null); abortRef.current = null;
    }
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const canSubmit = aiConfigured && form.topic.trim().length >= 2 && form.cta_keyword.trim().length > 0 && !busy;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      <Card>
        <CardHeader><h2 className="font-semibold">Generation Brief</h2><StatusBadge tone={aiConfigured ? "success" : "warning"}>{aiConfigured ? "AI已连接" : "OpenAI尚未配置"}</StatusBadge></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Campaign Goal"><select className="field" value={form.campaign_goal} onChange={set("campaign_goal")}>{GOALS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></FormField>
            <FormField label="Audience Temperature"><select className="field" value={form.audience_temperature} onChange={set("audience_temperature")}>{TEMPS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></FormField>
            <FormField label="Script Length（秒）"><select className="field" value={form.script_length} onChange={set("script_length")}>{LENGTHS.map((v) => <option key={v} value={v}>{v}秒</option>)}</select></FormField>
            <FormField label="Generation Mode"><select className="field" value={form.generation_mode} onChange={set("generation_mode")}>{MODES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></FormField>
            <FormField label="Copywriting Formula"><select className="field" value={form.formula} onChange={set("formula")}>{FORMULAS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></FormField>
            <FormField label="Hook Type"><select className="field" value={form.hook_type} onChange={set("hook_type")}>{HOOKS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></FormField>
            <FormField label="CTA Keyword"><input className="field" value={form.cta_keyword} onChange={set("cta_keyword")} placeholder="例如：SLIM" /></FormField>
            <FormField label="Target Location"><input className="field" value={form.target_location} onChange={set("target_location")} /></FormField>
            <div className="md:col-span-2"><FormField label="题材 / Topic" hint="一个内容只讲一个核心问题"><input className="field" value={form.topic} onChange={set("topic")} placeholder="例如：外食族晚餐不知道怎么选" /></FormField></div>
            <FormField label={`趋势（只能选已验证未过期，${trends.length}个可用）`}>
              <select className="field" value={form.selected_trend_id} onChange={set("selected_trend_id")}>
                <option value="">不使用趋势（禁止趋势类声明）</option>
                {trends.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </FormField>
            <FormField label={`素材（已选${materialIds.length}）`}>
              <select className="field" multiple size={3} value={materialIds} onChange={(e) => setMaterialIds([...e.target.selectedOptions].map((o) => o.value))}>
                {materials.map((m) => <option key={m.id} value={m.id}>[{m.material_type}] {m.title}</option>)}
              </select>
            </FormField>
            <div className="md:col-span-2"><FormField label="Additional Instruction（可选）"><textarea className="field min-h-20 py-3" value={form.additional_instruction} onChange={set("additional_instruction")} /></FormField></div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button type="button" variant="secondary" onClick={loadEstimate} disabled={!aiConfigured || busy}>Estimate</Button>
            <Button type="button" onClick={generate} disabled={!canSubmit}>
              {busy ? <CircleNotch className="animate-spin" /> : aiConfigured ? <Sparkle /> : <LockKey />}
              {busy ? "生成中…" : "Generate"}
            </Button>
            {busy && <Button type="button" variant="muted" onClick={() => abortRef.current?.abort()}>Cancel</Button>}
            {estimate && (
              <span className="text-xs text-slate-500">
                ~{estimate.total_tokens.toLocaleString()} tokens（{estimate.model}）
                {estimate.cost_available && estimate.estimated_cost_cents != null
                  ? ` ≈ $${(estimate.estimated_cost_cents / 100).toFixed(2)}`
                  : " · 未配置价格，仅Token估算"}
              </span>
            )}
          </div>
          {error && <p className="mt-3 rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{error}</p>}
          {done && (
            <p className="mt-3 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
              AI Draft已保存{done.humanReviewRequired ? "（needs_review — 必须人工审核）" : "（draft）"}。
              <a className="ml-2 underline" href="/script-studio">前往Script Studio →</a>
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><h2 className="font-semibold">生成阶段</h2></CardHeader>
        <CardContent>
          <ol className="space-y-2">
            {STAGES.map((s, i) => (
              <li key={s} className={`flex items-center gap-3 rounded-xl px-3.5 py-2 text-sm ${stageIdx !== null && i <= stageIdx ? "bg-brand-50 font-medium text-brand-800" : "text-slate-400"}`}>
                {stageIdx !== null && i === stageIdx ? <CircleNotch className="animate-spin" size={15} /> : <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />}
                {s}
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-slate-500">所有内容只会保存为AI Draft；High Risk或未过Quality Gate的内容标记needs_review，必须人工批准才能进入Production。阶段进度来自服务端真实状态，不伪造百分比。</p>
        </CardContent>
      </Card>
    </div>
  );
}
