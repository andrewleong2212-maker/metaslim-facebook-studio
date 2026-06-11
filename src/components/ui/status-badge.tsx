import { cn } from "@/lib/utils";

export type StatusTone = "neutral" | "info" | "warning" | "success" | "danger";
const styles: Record<StatusTone, string> = {
  neutral: "bg-slate-100 text-slate-600", info: "bg-brand-50 text-brand-700", warning: "bg-amber-50 text-amber-700",
  success: "bg-emerald-50 text-emerald-700", danger: "bg-rose-50 text-rose-700"
};
export function StatusBadge({ children, tone = "neutral", className }: { children: React.ReactNode; tone?: StatusTone; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", styles[tone], className)}>{children}</span>;
}
