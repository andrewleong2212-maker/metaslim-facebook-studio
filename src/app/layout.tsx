import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "MetaSlim AI Studio",
  description: "Malaysia Facebook Slimming Intelligence"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-MY"><body><AppShell>{children}</AppShell></body></html>;
}
