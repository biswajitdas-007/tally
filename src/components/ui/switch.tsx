"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function Switch({
  checked,
  onChange,
  label,
  className,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-[26px] w-[44px] shrink-0 items-center rounded-full p-0.5 transition-colors",
        checked ? "bg-brand" : "bg-border-strong",
        className,
      )}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 600, damping: 34 }}
        className="h-[22px] w-[22px] rounded-full bg-white shadow-[var(--shadow-sm)]"
        style={{ marginLeft: checked ? 18 : 0 }}
      />
    </button>
  );
}
