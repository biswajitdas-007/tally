"use client";

import { ArrowLeftRight } from "lucide-react";
import { CategoryIcon } from "@/components/ui/chip";
import { SwipeRow } from "./swipe-row";
import { useStore, useMyId } from "@/store/useStore";
import { useUI } from "@/store/useUI";
import { useToast } from "@/components/ui/toast";
import { myShare } from "@/lib/balances";
import { formatDate, formatINR, cn } from "@/lib/utils";
import type { Expense } from "@/lib/types";

export function ExpenseRow({ expense, showGroup = false }: { expense: Expense; showGroup?: boolean }) {
  const people = useStore((s) => s.people);
  const groups = useStore((s) => s.groups);
  const deleteExpense = useStore((s) => s.deleteExpense);
  const undoDelete = useStore((s) => s.undoDelete);
  const openEdit = useUI((s) => s.openEdit);
  const myId = useMyId();
  const { toast } = useToast();

  const nameOf = (id: string) =>
    id === myId ? "You" : people.find((p) => p.id === id)?.name.split(" ")[0] ?? "Someone";
  const group = groups.find((g) => g.id === expense.groupId);

  function handleDelete() {
    deleteExpense(expense.id);
    toast({ message: "Expense deleted", tone: "info", action: { label: "Undo", onClick: undoDelete } });
  }

  if (expense.isSettlement) {
    const payer = nameOf(expense.paidBy);
    const payee = nameOf(expense.splits[0]?.personId ?? "");
    return (
      <SwipeRow onDelete={handleDelete}>
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-positive-soft text-positive">
            <ArrowLeftRight className="h-[18px] w-[18px]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.92rem] font-medium text-text">
              {payer} paid {payee}
            </p>
            <p className="truncate text-[0.78rem] text-text-3">{formatDate(expense.date)} · Settlement</p>
          </div>
          <span className="tnum text-[0.92rem] font-semibold text-positive">{formatINR(expense.amount)}</span>
        </div>
      </SwipeRow>
    );
  }

  const share = myShare(expense, myId ?? "");
  const iPaid = expense.paidBy === myId;
  const impact = iPaid ? expense.amount - share : -share;
  const label = iPaid ? "you lent" : "you borrowed";

  return (
    <SwipeRow onDelete={handleDelete}>
      <button
        onClick={() => openEdit(expense.id)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2"
      >
        <CategoryIcon category={expense.category} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.92rem] font-medium text-text">{expense.description}</p>
          <p className="truncate text-[0.78rem] text-text-3">
            {iPaid ? "You" : nameOf(expense.paidBy)} paid {formatINR(expense.amount)}
            {showGroup && group ? ` · ${group.name}` : ` · ${formatDate(expense.date)}`}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[0.68rem] font-medium uppercase tracking-wide text-text-3">{label}</p>
          <p className={cn("tnum text-[0.92rem] font-semibold", impact >= 0 ? "text-positive" : "text-negative")}>
            {formatINR(Math.abs(impact))}
          </p>
        </div>
      </button>
    </SwipeRow>
  );
}
