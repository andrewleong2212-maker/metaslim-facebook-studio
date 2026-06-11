"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigation } from "@/lib/navigation";
import { cn } from "@/lib/utils";

const mobileItems = navigation.slice(0, 4).concat(navigation.at(-1)!);
export function MobileNavigation() { const pathname=usePathname(); return <nav className="fixed inset-x-0 bottom-0 z-40 grid w-screen grid-cols-5 border-t border-brand-100 bg-white/95 px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(38,58,126,.08)] backdrop-blur lg:hidden">{mobileItems.map(item=>{const Icon=item.icon; const active=pathname===item.href; return <Link key={item.href} href={item.href} className={cn("flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold",active?"bg-brand-50 text-brand-700":"text-slate-500")}><Icon size={20} weight={active?"fill":"regular"}/>{item.shortLabel}</Link>})}</nav>; }
