"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "@phosphor-icons/react/ssr";
import { Button } from "./button";

export function ConfirmationDialog({ trigger, title, description }: { trigger: React.ReactNode; title: string; description: string }) {
  return <Dialog.Root><Dialog.Trigger asChild>{trigger}</Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-ink/35 backdrop-blur-sm" /><Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl"><Dialog.Close className="absolute right-4 top-4 text-slate-400 hover:text-ink"><X /></Dialog.Close><Dialog.Title className="text-lg font-bold text-ink">{title}</Dialog.Title><Dialog.Description className="mt-2 text-sm leading-6 text-slate-500">{description}</Dialog.Description><div className="mt-6 flex justify-end gap-2"><Dialog.Close asChild><Button variant="secondary">取消</Button></Dialog.Close><Dialog.Close asChild><Button>确认</Button></Dialog.Close></div></Dialog.Content></Dialog.Portal></Dialog.Root>;
}
