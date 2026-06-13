"use client";

import { useState } from "react";
import { ArrowsClockwise, CircleNotch } from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";

interface QualityCheck { id: string; label: string; score: number; pass: boolean; reason: string; suggested_revision: string | null }
interface QualityReport { checks: QualityCheck[]; must_rewrite: boolean; critical_fail: boolean; critical_reasons: string[]; overall_score: number }
interface ComplianceFlag { rule: string; original_phrase: string; risk_reason: string; safe_rewrite: string }
interface ComplianceReport { level: "safe" | "needs_revision" | "high_risk"; risk_score: number; flagged_items: ComplianceFlag[]; can_be_approved: boolean }
interface DuplicateReport { verdict: "safe" | "similar" | "duplicate"; similarity_score: number; matched_sections: string[]; explanation: string; recommended_change: string | null }

const REGEN_TARGETS = [
  ["all", "Regenerate All"], ["hook", "Hook"], ["interest", "Interest"], ["desire", "Desire"], ["cta", "CTA"],
  ["change_formula", "Change Formula"], ["change_angle", "Change Angle"],
  ["more_conversational", "More Conversational"], ["more_direct", "More Direct"], ["shorten", "Shorten"], ["extend", "Extend"],
] as const;

export function AiResultPanels({ workspaceId, scriptId, quality, compliance, duplicate, rewriteCount, evidenceLimitations }: {
  workspaceId: string;
  scriptId: string;
  quality: QualityReport | null;
  compliance: ComplianceReport | null;
  duplicate: DuplicateReport | null;
  rewriteCount: number;
  evidenceLimitations: string | null;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function regenerate(target: string) {
    setBusy(target); setMsg(null);
    try {
      const res = await fetch("/api/ai/regenerate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace_id: workspaceId, script_id: scriptId, target, request_id: crypto.randomUUID() }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg(data.safeError ?? data.error ?? "Regenerate失败"); return; }
      setMsg("已建立新Version — 刷新页面查看。");
    } catch { setMsg("网络错误"); } finally { setBusy(null); }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader><h3 className="font-semibold">Quality Gate</h3>
          {quality && <StatusBadge tone={quality.must_rewrite ? "warning" : "success"}>{quality.overall_score}/10 · Rewrite×{rewriteCount}</StatusBadge>}
        </CardHeader>
        <CardContent>
          {!quality ? <p className="text-sm text-slate-500">此版本无Quality报告（非AI生成或生成失败）。</p> : (
            <ul className="space-y-1.5">
              {quality.critical_fail && <li className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">Critical：{quality.critical_reasons.join("、")}</li>}
              {quality.checks.map((c) => (
                <li key={c.id} className="flex items-start justify-between gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs">
                  <span className={c.pass ? "text-slate-600" : "font-medium text-amber-700"} title={c.suggested_revision ?? c.reason}>{c.label}</span>
                  <span className={`font-semibold ${c.pass ? "text-emerald-600" : "text-amber-600"}`}>{c.score}/10</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><h3 className="font-semibold">Compliance</h3>
          {compliance && <StatusBadge tone={compliance.level === "safe" ? "success" : compliance.level === "needs_revision" ? "warning" : "danger"}>{compliance.level}{compliance.level === "high_risk" ? " · 禁止Approve" : ""}</StatusBadge>}
        </CardHeader>
        <CardContent>
          {!compliance ? <p className="text-sm text-slate-500">无Compliance报告。</p> :
            compliance.flagged_items.length === 0 ? <p className="text-sm text-emerald-700">未检出合规风险。</p> : (
              <ul className="space-y-2">
                {compliance.flagged_items.map((f, i) => (
                  <li key={i} className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    <div className="font-medium">「{f.original_phrase}」— {f.risk_reason}</div>
                    <div className="mt-0.5 text-amber-700">建议：{f.safe_rewrite}</div>
                  </li>
                ))}
              </ul>
            )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><h3 className="font-semibold">Duplicate Guard</h3>
          {duplicate && <StatusBadge tone={duplicate.verdict === "safe" ? "success" : duplicate.verdict === "similar" ? "warning" : "danger"}>{duplicate.verdict} · {duplicate.similarity_score}</StatusBadge>}
        </CardHeader>
        <CardContent>
          {!duplicate ? <p className="text-sm text-slate-500">无Duplicate报告。</p> : (
            <p className="text-xs text-slate-600">{duplicate.explanation}{duplicate.recommended_change && <span className="mt-1 block font-medium text-amber-700">{duplicate.recommended_change}</span>}</p>
          )}
        </CardContent>
      </Card>

      {evidenceLimitations && (
        <Card><CardHeader><h3 className="font-semibold">Evidence Limitations</h3></CardHeader>
          <CardContent><pre className="whitespace-pre-wrap text-xs text-slate-600">{evidenceLimitations}</pre></CardContent></Card>
      )}

      <Card>
        <CardHeader><h3 className="font-semibold">Section Regeneration</h3></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {REGEN_TARGETS.map(([key, label]) => (
              <Button key={key} type="button" variant="secondary" className="!min-h-8 !px-3 !text-xs" disabled={busy !== null} onClick={() => regenerate(key)}>
                {busy === key ? <CircleNotch className="animate-spin" size={13} /> : <ArrowsClockwise size={13} />}{label}
              </Button>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">每次Regenerate都会建立新Version并重新通过全部Quality检查。</p>
          {msg && <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">{msg}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
