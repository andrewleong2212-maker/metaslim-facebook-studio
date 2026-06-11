"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "./app-shell";

export function RootShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/login") || pathname.startsWith("/auth/")) return children;
  return <AppShell>{children}</AppShell>;
}
