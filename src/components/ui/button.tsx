import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const variants = cva("inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-60", {
  variants: { variant: {
    primary: "bg-brand-600 text-white hover:bg-brand-700 focus-visible:ring-brand-200",
    secondary: "border border-brand-200 bg-white text-brand-700 hover:bg-brand-50 focus-visible:ring-brand-100",
    ghost: "text-slate-600 hover:bg-brand-50 hover:text-brand-700",
    muted: "bg-slate-100 text-slate-500"
  } }, defaultVariants: { variant: "primary" }
});

type Props = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof variants> & { asChild?: boolean };
export function Button({ className, variant, asChild, ...props }: Props) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(variants({ variant }), className)} {...props} />;
}
