"use client";

import { ArrowLeftRight } from "lucide-react";
import { CategoryIcon } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { useStore, useMyId } from "@/store/useStore";
import { useUI } from "@/store/useUI";
import { myShare } from "@/lib/balances";
import { formatDate, formatINR, cn } from "@/lib/utils";
import type { Expense } from "@/lib/types";

/** A list row: full-width, left-aligned, no button chrome. */
const ROW =
  "h-auto w-full justify-start gap-3 rounded-none px-4 py-3 text-left font-normal tracking-normal whitespace-normal text-text active:scale-100 hover:bg-surface-2 hover:text-text active:bg-surface-inset";

function Lines({ title, sub }: Readonly<{ title: string; sub: string }>) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block truncate text-[0.9375rem] font-bold">{title}</span>
      <span className="block truncate text-[0.8125rem] text-text-2">{sub}</span>
    </span>
  );
}

function Amount({ value, label, tone }: Readonly<{ value: number; label: string; tone?: "positive" | "negative" }>) {
  return (
    <span className="shrink-0 text-right">
      <span
        className={cn(
          "block text-[0.9375rem] font-semibold tnum",
          tone === "positive" && "text-positive",
          tone === "negative" && "text-negative",
        )}
      >
        {formatINR(value)}
      </span>
      <span className="block text-xs text-text-2">{label}</span>
    </span>
  );
}

export function ExpenseRow({
  expense,
  showGroup = false,
  className,
}: Readonly<{ expense: Expense; showGroup?: boolean; className?: string }>) {
  const people = useStore((s) => s.people);
  const groups = useStore((s) => s.groups);
  const openEdit = useUI((s) => s.openEdit);
  const openDetail = useUI((s) => s.openDetail);
  const myId = useMyId();
  const mine = expense.createdBy === myId;

  const nameOf = (id: string) =>
    id === myId ? "You" : (people.find((p) => p.id === id)?.name.split(" ")[0] ?? "Someone");
  const group = groups.find((g) => g.id === expense.groupId);

  if (expense.isSettlement) {
    const payer = nameOf(expense.paidBy);
    const payee = nameOf(expense.splits[0]?.personId ?? "");
    return (
      <Button variant="ghost" onClick={() => openDetail(expense.id)} className={cn(ROW, className)}>
        <span
          aria-hidden
          className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-violet-soft text-violet-on-soft"
        >
          <ArrowLeftRight className="size-5" strokeWidth={1.7} />
        </span>
        <Lines
          title={`${payer} paid ${payee}`}
          sub={`${formatDate(expense.date)} · Settlement${mine ? "" : " · tap to view"}`}
        />
        <Amount value={expense.amount} label="settled" />
      </Button>
    );
  }

  const share = myShare(expense, myId ?? "");
  const iPaid = expense.paidBy === myId;
  const impact = iPaid ? expense.amount - share : -share;
  const where = showGroup && group ? group.name : formatDate(expense.date);

  return (
    <Button
      variant="ghost"
      onClick={() => (mine ? openEdit(expense.id) : openDetail(expense.id))}
      className={cn(ROW, className)}
    >
      <CategoryIcon category={expense.category} size={44} />
      <Lines
        title={expense.description}
        sub={`${iPaid ? "You" : nameOf(expense.paidBy)} paid ${formatINR(expense.amount)} · ${where}`}
      />
      <Amount
        value={Math.abs(impact)}
        label={iPaid ? "you lent" : "you borrowed"}
        tone={impact >= 0 ? "positive" : "negative"}
      />
    </Button>
  );
}
