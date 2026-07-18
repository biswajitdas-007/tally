"use client";

import { ArrowLeftRight, Pencil, Trash2, Undo2 } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { CategoryIcon } from "@/components/ui/chip";
import { useStore, useMyId, usePerson } from "@/store/useStore";
import { useUI } from "@/store/useUI";
import { useToast } from "@/components/ui/toast";
import { formatINR, formatDate, cn } from "@/lib/utils";

export function ExpenseDetailSheet() {
  const id = useUI((s) => s.detailId);
  const close = useUI((s) => s.closeDetail);
  const openEdit = useUI((s) => s.openEdit);
  const expenses = useStore((s) => s.expenses);
  const people = useStore((s) => s.people);
  const groups = useStore((s) => s.groups);
  const deleteExpense = useStore((s) => s.deleteExpense);
  const myId = useMyId() ?? "";
  const { toast } = useToast();

  const expense = id ? expenses.find((e) => e.id === id) ?? null : null;
  const adder = usePerson(expense?.createdBy);
  if (!expense) return null;

  const mine = expense.createdBy === myId;
  const nameOf = (pid: string) => (pid === myId ? "You" : people.find((p) => p.id === pid)?.name.split(" ")[0] ?? "Someone");
  const group = groups.find((g) => g.id === expense.groupId);
  const addedBy = expense.createdBy === myId ? "You" : adder?.name ?? "Someone";

  function undo() {
    deleteExpense(expense!.id);
    toast({ message: "Settlement undone — marked unpaid", tone: "info" });
    close();
  }
  function remove() {
    deleteExpense(expense!.id);
    toast({ message: "Expense deleted", tone: "info" });
    close();
  }

  if (expense.isSettlement) {
    const payer = nameOf(expense.paidBy);
    const payee = nameOf(expense.splits[0]?.personId ?? "");
    return (
      <Sheet open={Boolean(id)} onClose={close} title="Settlement">
        <div className="flex flex-col gap-5 pt-1">
          <div className="flex flex-col items-center gap-2 rounded-[18px] bg-surface-inset py-6">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-positive-soft text-positive">
              <ArrowLeftRight className="h-6 w-6" />
            </span>
            <p className="font-display text-2xl font-bold tnum text-text">{formatINR(expense.amount)}</p>
            <p className="text-[0.9rem] text-text-2">
              <span className="font-semibold text-text">{payer}</span> paid{" "}
              <span className="font-semibold text-text">{payee}</span>
            </p>
            <p className="text-[0.76rem] text-text-3">
              {formatDate(expense.date, true)}
              {group ? ` · ${group.name}` : ""} · added by {addedBy}
            </p>
          </div>

          {mine ? (
            <Button variant="dangerSoft" size="lg" fullWidth onClick={undo}>
              <Undo2 className="h-4.5 w-4.5" /> Mark as unpaid
            </Button>
          ) : (
            <p className="text-center text-[0.82rem] text-text-3">Only {addedBy} can undo this settlement.</p>
          )}
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet open={Boolean(id)} onClose={close} title="Expense">
      <div className="flex flex-col gap-5 pt-1">
        <div className="flex items-center gap-3.5">
          <CategoryIcon category={expense.category} size={48} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg font-bold text-text">{expense.description}</p>
            <p className="text-[0.78rem] text-text-3">
              {formatDate(expense.date, true)}
              {group ? ` · ${group.name}` : ""}
            </p>
          </div>
          <p className="tnum font-display text-xl font-bold text-text">{formatINR(expense.amount)}</p>
        </div>

        <div className="rounded-[16px] border border-border">
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <span className="text-[0.8rem] text-text-3">Paid by</span>
            <span className="ml-auto text-[0.88rem] font-semibold text-text">{nameOf(expense.paidBy)}</span>
          </div>
          <div className="px-4 py-3">
            <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-wide text-text-3">Split</p>
            <div className="flex flex-col gap-2">
              {expense.splits.map((s) => {
                const person = people.find((p) => p.id === s.personId);
                return (
                  <div key={s.personId} className="flex items-center gap-2.5">
                    <Avatar person={person} size="xs" />
                    <span className="flex-1 text-[0.85rem] text-text">{nameOf(s.personId)}</span>
                    <span className="tnum text-[0.85rem] font-semibold text-text-2">{formatINR(s.amount)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {mine ? (
          <div className="flex gap-3">
            <Button variant="dangerSoft" size="lg" onClick={remove} aria-label="Delete">
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => {
                close();
                openEdit(expense.id);
              }}
            >
              <Pencil className="h-4.5 w-4.5" /> Edit
            </Button>
          </div>
        ) : (
          <p className={cn("text-center text-[0.82rem] text-text-3")}>Added by {addedBy} — only they can edit or delete it.</p>
        )}
      </div>
    </Sheet>
  );
}
