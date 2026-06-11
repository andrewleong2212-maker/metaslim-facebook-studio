import type { Metadata } from "next";
import "./globals.css";
import { RootShell } from "@/components/layout/root-shell";

export const metadata: Metadata = {
  title: "MetaSlim AI Studio",
  description: "Malaysia Facebook Slimming Intelligence"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-MY"><body><RootShell>{children}</RootShell></body></html>;
}
