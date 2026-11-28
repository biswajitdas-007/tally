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

/** What the second line adds after "X paid ₹Y": the group, the date, or nothing (under a day heading). */
export type ExpenseRowDetail = "group" | "date" | "none";

function settlementSub(date: string, mine: boolean, detail: ExpenseRowDetail): string {
  const parts = detail === "none" ? ["Settlement"] : [formatDate(date), "Settlement"];
  if (!mine) parts.push("tap to view");
  return parts.join(" · ");
}

function expenseSub(paid: string, detail: ExpenseRowDetail, date: string, groupName?: string): string {
  if (detail === "none") return paid;
  const where = detail === "group" && groupName ? groupName : formatDate(date);
  return `${paid} · ${where}`;
}

/** First name for a person id, "You" for the current user. */
function useNameOf() {
  const people = useStore((s) => s.people);
  const myId = useMyId();
  return (id: string) => (id === myId ? "You" : (people.find((p) => p.id === id)?.name.split(" ")[0] ?? "Someone"));
}

type RowProps = Readonly<{ expense: Expense; detail: ExpenseRowDetail; className?: string }>;

function SettlementRow({ expense, detail, className }: RowProps) {
  const openDetail = useUI((s) => s.openDetail);
  const myId = useMyId();
  const nameOf = useNameOf();
  const title = `${nameOf(expense.paidBy)} paid ${nameOf(expense.splits[0]?.personId ?? "")}`;

  return (
    <Button variant="ghost" onClick={() => openDetail(expense.id)} className={cn(ROW, className)}>
      <span
        aria-hidden
        className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-violet-soft text-violet-on-soft"
      >
        <ArrowLeftRight className="size-5" strokeWidth={1.7} />
      </span>
      <Lines title={title} sub={settlementSub(expense.date, expense.createdBy === myId, detail)} />
      <Amount value={expense.amount} label="settled" />
    </Button>
  );
}

function SpendRow({ expense, detail, className }: RowProps) {
  const groups = useStore((s) => s.groups);
  const openEdit = useUI((s) => s.openEdit);
  const openDetail = useUI((s) => s.openDetail);
  const myId = useMyId();
  const nameOf = useNameOf();

  const iPaid = expense.paidBy === myId;
  const share = myShare(expense, myId ?? "");
  const impact = iPaid ? expense.amount - share : -share;
  const paid = `${nameOf(expense.paidBy)} paid ${formatINR(expense.amount)}`;
  const groupName = groups.find((g) => g.id === expense.groupId)?.name;
  const open = () => (expense.createdBy === myId ? openEdit(expense.id) : openDetail(expense.id));

  return (
    <Button variant="ghost" onClick={open} className={cn(ROW, className)}>
      <CategoryIcon category={expense.category} size={44} />
      <Lines title={expense.description} sub={expenseSub(paid, detail, expense.date, groupName)} />
      <Amount
        value={Math.abs(impact)}
        label={iPaid ? "you lent" : "you borrowed"}
        tone={impact >= 0 ? "positive" : "negative"}
      />
    </Button>
  );
}

/** An expense or settlement in a list; tapping edits your own expenses and opens the rest. */
export function ExpenseRow({
  expense,
  detail = "date",
  className,
}: Readonly<{ expense: Expense; detail?: ExpenseRowDetail; className?: string }>) {
  const Row = expense.isSettlement ? SettlementRow : SpendRow;
  return <Row expense={expense} detail={detail} className={className} />;
}
