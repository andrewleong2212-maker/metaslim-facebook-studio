import { WaveSine } from "@phosphor-icons/react/ssr";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";

export function TrendCard() { return <Card><CardContent><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-600"><WaveSine/></span><div><h3 className="font-semibold">趋势候选</h3><p className="text-xs text-slate-500">等待真实证据与人工审核</p></div><StatusBadge className="ml-auto" tone="neutral">未验证</StatusBadge></div></CardContent></Card>; }
