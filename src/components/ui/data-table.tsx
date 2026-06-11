import { EmptyState } from "./state-panels";

export function DataTable({ columns, emptyTitle = "还没有资料", emptyDescription = "新增真实资料后会显示在这里。" }: { columns: string[]; emptyTitle?: string; emptyDescription?: string }) {
  return <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="hidden grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-4 border-b bg-slate-50 px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 md:grid">{columns.map(c => <span key={c}>{c}</span>)}</div><div className="p-4"><EmptyState compact title={emptyTitle} description={emptyDescription} /></div></div>;
}
