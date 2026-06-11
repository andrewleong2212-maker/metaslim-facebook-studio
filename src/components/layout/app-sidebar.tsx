"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CaretDown, ShieldCheck } from "@phosphor-icons/react/ssr";
import { navigation } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const pathname = usePathname();
  return <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col bg-brand-950 text-white lg:flex">
    <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5"><Image src="/metaslim-mark.jpg" alt="MetaSlim AI" width={44} height={44} className="size-11 rounded-xl object-cover object-top" priority /><div><p className="font-bold tracking-tight">MetaSlim AI</p><p className="mt-0.5 text-[11px] text-brand-200">Malaysia Facebook Slimming Intelligence</p></div></div>
    <nav className="flex-1 overflow-y-auto px-3 py-4">{navigation.map(item => { const active = pathname === item.href; const Icon=item.icon; return <Link key={item.href} href={item.href} className={cn("mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition", active ? "bg-white text-brand-800 shadow-sm" : "text-brand-100 hover:bg-white/10 hover:text-white")}><Icon size={19} weight={active ? "fill" : "regular"} /><span>{item.label}</span></Link>; })}</nav>
    <div className="m-3 rounded-2xl border border-white/10 bg-white/5 p-3"><div className="flex items-center gap-2 text-xs font-semibold text-brand-100"><ShieldCheck size={17} />Production Mode</div><p className="mt-2 text-[11px] leading-5 text-brand-300">不显示示例趋势。所有外部服务保持未连接。</p></div>
    <button className="flex items-center gap-3 border-t border-white/10 px-5 py-4 text-left"><span className="grid size-9 place-items-center rounded-full bg-brand-600 text-sm font-bold">MS</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">MetaSlim Team</span><span className="block text-xs text-brand-300">Workspace Preview</span></span><CaretDown size={16} /></button>
  </aside>;
}
