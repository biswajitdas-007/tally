"use client";

import { Repeat } from "lucide-react";
import { CATEGORIES, INCOME_CATEGORIES } from "@/lib/categories";
import { useUI } from "@/store/useUI";
import { formatINR, formatDate, cn } from "@/lib/utils";
import type { CategoryKey, FinanceEntry, IncomeCategory } from "@/lib/types";

function meta(e: FinanceEntry) {
  if (e.type === "income") {
    const m = INCOME_CATEGORIES[e.category as IncomeCategory] ?? INCOME_CATEGORIES.other;
    return { label: m.label, Icon: m.icon };
  }
  const m = CATEGORIES[e.category as CategoryKey] ?? CATEGORIES.other;
  return { label: m.label, Icon: m.icon };
}

/** One of your own money entries — the counterpart to ExpenseRow for splits. */
export function MoneyRow({ entry, showKind = false }: { entry: FinanceEntry; showKind?: boolean }) {
  const openMoney = useUI((s) => s.openMoney);
  const { label, Icon } = meta(entry);
  const income = entry.type === "income";

  return (
    <button
      onClick={() => openMoney(entry.type, entry.id)}
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2 active:bg-surface-inset"
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          income ? "bg-positive-soft text-positive" : "bg-surface-inset text-text-2",
        )}
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-[0.9rem] font-medium text-text">{entry.note?.trim() || label}</p>
          {entry.recurringId && <Repeat className="h-3 w-3 shrink-0 text-text-3" aria-label="Added by a repeat" />}
        </div>
        <p className="truncate text-[0.76rem] text-text-3">
          {showKind ? "Just you" : label} · {formatDate(entry.date, true)}
        </p>
      </div>
      <span className={cn("shrink-0 tnum text-[0.92rem] font-semibold", income ? "text-positive" : "text-text")}>
        {income ? "+" : "−"}
        {formatINR(entry.amount)}
      </span>
    </button>
  );
}
