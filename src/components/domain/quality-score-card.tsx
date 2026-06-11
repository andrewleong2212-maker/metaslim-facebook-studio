import { CheckCircle, ShieldWarning } from "@phosphor-icons/react/ssr";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";

const checks = [{ Icon: CheckCircle, label: "AIDA 结构" }, { Icon: ShieldWarning, label: "合规检查" }, { Icon: CheckCircle, label: "重复检查" }];
export function QualityScoreCard() { return <Card><CardContent><div className="flex items-center justify-between"><div><p className="text-sm font-semibold">AI Output Quality Gate</p><p className="mt-1 text-xs text-slate-500">生成后必须完成内部检查</p></div><StatusBadge tone="warning">暂不可用</StatusBadge></div><div className="mt-5 grid gap-3 sm:grid-cols-3">{checks.map(({Icon,label})=><div key={label} className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500"><Icon className="mb-2 text-brand-500" size={18}/>{label}</div>)}</div></CardContent></Card>; }
