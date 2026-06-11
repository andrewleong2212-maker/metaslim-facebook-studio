import { ArrowClockwise, CloudSlash, Database, SpinnerGap, WarningCircle } from "@phosphor-icons/react/ssr";
import { Button } from "./button";
import { cn } from "@/lib/utils";

export function EmptyState({ title, description, action, compact = false }: { title: string; description: string; action?: React.ReactNode; compact?: boolean }) {
  return <div className={cn("flex flex-col items-center justify-center rounded-2xl border border-dashed border-brand-200 bg-brand-50/40 px-6 text-center", compact ? "min-h-40 py-6" : "min-h-64 py-10")}>
    <span className="mb-4 grid size-11 place-items-center rounded-xl bg-white text-brand-600 shadow-sm"><Database size={22} weight="duotone" /></span>
    <h3 className="break-words font-semibold text-ink">{title}</h3><p className="mt-2 max-w-md break-words text-sm leading-6 text-slate-500">{description}</p>{action && <div className="mt-5">{action}</div>}
  </div>;
}
export function LoadingState({ label = "正在载入资料" }: { label?: string }) { return <div className="flex min-h-40 items-center justify-center gap-3 text-sm text-slate-500"><SpinnerGap className="animate-spin text-brand-600" size={22} />{label}</div>; }
export function ErrorState({ title = "暂时无法载入", description = "请稍后重试。错误详情不会显示敏感资料。" }: { title?: string; description?: string }) { return <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-5"><div className="flex gap-3"><WarningCircle className="mt-0.5 text-rose-600" size={22} /><div><h3 className="font-semibold text-rose-900">{title}</h3><p className="mt-1 text-sm text-rose-700">{description}</p><Button variant="secondary" className="mt-4 border-rose-200 text-rose-700"><ArrowClockwise />重试</Button></div></div></div>; }
export function DisconnectedNotice({ service }: { service: string }) { return <div className="flex min-w-0 items-start gap-3 rounded-xl border border-brand-100 bg-brand-50/70 px-4 py-3 text-sm text-brand-800"><CloudSlash className="mt-0.5 shrink-0" size={20} weight="duotone" /><span className="min-w-0 break-words"><strong>{service}</strong> 尚未连接，目前仅提供 UI 与手动流程。</span></div>; }
