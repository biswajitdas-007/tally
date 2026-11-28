"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

/**
 * Single-choice segmented control (filters, theme, split method), built on the
 * shadcn ToggleGroup. One option is always selected: pressing the active one
 * again keeps it rather than clearing the choice.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  "aria-label": ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <ToggleGroup
      variant="segment"
      value={[value]}
      onValueChange={(next) => {
        const picked = next[0] as T | undefined;
        if (picked !== undefined && picked !== value) onChange(picked);
      }}
      aria-label={ariaLabel}
      className={cn("inline-flex gap-0.5 rounded-[14px] bg-surface-inset p-0.5", className)}
    >
      {options.map((opt) => (
        <ToggleGroupItem key={opt.value} value={opt.value} className="flex-1 text-[0.8125rem]">
          {opt.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
