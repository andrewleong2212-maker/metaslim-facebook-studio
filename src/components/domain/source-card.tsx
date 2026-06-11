import { LinkSimple, MapPin, Timer } from "@phosphor-icons/react/ssr";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";

export function SourceCard({ title = "尚未加入来源" }: { title?: string }) { return <Card><CardContent><div className="flex items-start justify-between"><span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-600"><LinkSimple size={20}/></span><StatusBadge tone="warning">需要设置</StatusBadge></div><h3 className="mt-4 font-semibold">{title}</h3><div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500"><span className="flex items-center gap-1"><MapPin/>Malaysia 地区待定</span><span className="flex items-center gap-1"><Timer/>有效期待定</span></div></CardContent></Card>; }
