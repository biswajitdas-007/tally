"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { bankBrand } from "@/lib/banks";

export function BankBadge({
  name,
  fallback: Icon,
  className,
  tone = "neutral",
}: {
  name?: string;
  fallback: LucideIcon;
  className?: string;
  tone?: "positive" | "negative" | "neutral";
}) {
  const brand = bankBrand(name);
  if (brand) {
    return (
      <span
        className={cn("flex shrink-0 items-center justify-center rounded-[10px]", className)}
        style={{ background: brand.color }}
        aria-hidden="true"
      >
        <span className="text-[0.5rem] font-bold leading-none tracking-tight text-white">{brand.short}</span>
      </span>
    );
  }
  const toneCls =
    tone === "positive"
      ? "bg-positive-soft text-positive"
      : tone === "negative"
        ? "bg-negative-soft text-negative"
        : "bg-surface-inset text-text-2";
  return (
    <span className={cn("flex shrink-0 items-center justify-center rounded-full", toneCls, className)}>
      <Icon className="h-[18px] w-[18px]" />
    </span>
  );
}
