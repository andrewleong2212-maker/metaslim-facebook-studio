import type { ReactNode } from "react";

export function FormField({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return <label className="block"><span className="label">{label}</span>{children}{(error || hint) && <span className={`mt-1.5 block text-xs ${error ? "text-rose-600" : "text-slate-500"}`}>{error ?? hint}</span>}</label>;
}
