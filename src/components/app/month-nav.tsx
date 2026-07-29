"use client";

import type { Dispatch, SetStateAction } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { clampMonth, monthLabel } from "@/lib/money";
import { cn } from "@/lib/utils";

/** Step back and forward through months. Never past the current one — there's
 *  nothing to see in a month that hasn't happened. */
export function MonthNav({
  value,
  onChange,
  className,
}: Readonly<{
  /** First of the month being viewed. */
  value: Date;
  /**
   * A state setter, not a plain callback: two quick clicks land in the same
   * React batch, and computing the next month from `value` would read a stale
   * closure both times and lose a step.
   */
  onChange: Dispatch<SetStateAction<Date>>;
  className?: string;
}>) {
  const key = `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
  const now = new Date();
  const nowKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const shift = (n: number) => onChange((d) => clampMonth(new Date(d.getFullYear(), d.getMonth() + n, 1)));

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <button
        type="button"
        onClick={() => shift(-1)}
        className="flex h-9 w-9 items-center justify-center rounded-full text-text-2 transition-colors hover:bg-surface-inset"
        aria-label="Previous month"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <span className="min-w-[6.5rem] text-center font-display text-[0.95rem] font-bold text-text sm:min-w-[8rem]">
        {monthLabel(key)}
      </span>
      <button
        type="button"
        onClick={() => shift(1)}
        disabled={key >= nowKey}
        className="flex h-9 w-9 items-center justify-center rounded-full text-text-2 transition-colors hover:bg-surface-inset disabled:opacity-30"
        aria-label="Next month"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
