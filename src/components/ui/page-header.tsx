import { StatusBadge } from "./status-badge";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description: string; actions?: React.ReactNode }) {
  return <header className="mb-7 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div className="min-w-0">{eyebrow && <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-600">{eyebrow}</p>}<div className="flex min-w-0 flex-wrap items-center gap-3"><h1 className="break-words text-2xl font-bold tracking-tight text-ink sm:text-3xl">{title}</h1><StatusBadge tone="info">UI Preview</StatusBadge></div><p className="mt-2 max-w-3xl break-words text-sm leading-6 text-slate-500">{description}</p></div>{actions && <div className="flex flex-wrap gap-2 sm:shrink-0">{actions}</div>}</header>;
}
