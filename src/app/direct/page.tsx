"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Plus, ArrowLeftRight, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState } from "@/components/ui/empty-state";
import { ExpenseRow } from "@/components/features/expense-row";
import { PersonBalanceRow } from "@/components/features/person-balance-row";
import { useStore, useMyId } from "@/store/useStore";
import { useUI } from "@/store/useUI";
import { memberNet, mySettleRows } from "@/lib/balances";
import { formatINR } from "@/lib/utils";

export default function DirectPage() {
  const expenses = useStore((s) => s.expenses);
  const openAdd = useUI((s) => s.openAdd);
  const myId = useMyId() ?? "";

  const [tab, setTab] = useState<"expenses" | "balances">("expenses");

  // The "direct" ledger — everything not attached to a group.
  const directExpenses = useMemo(
    () => expenses.filter((e) => e.groupId === null).sort((a, b) => +new Date(b.date) - +new Date(a.date)),
    [expenses],
  );
  const myNet = useMemo(() => memberNet(directExpenses).get(myId) ?? 0, [directExpenses, myId]);
  const myBalances = useMemo(() => mySettleRows(directExpenses, myId), [directExpenses, myId]);

  return (
    <div className="flex flex-col gap-5">
      <Link href="/groups" className="-mb-1 flex w-fit items-center gap-1 text-sm font-medium text-text-2 hover:text-text">
        <ChevronLeft className="h-4 w-4" /> Groups
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3.5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] bg-surface-inset text-3xl">
          🧾
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-2xl font-bold tracking-[-0.02em]">Direct splits</h1>
          <p className="mt-0.5 text-[0.82rem] text-text-3">One-off expenses with friends, outside any group</p>
        </div>
      </div>

      {/* Net summary */}
      <Card className="flex items-center justify-between p-4">
        <div>
          <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-text-3">Your direct balance</p>
          <p className={`font-display text-2xl font-bold tnum ${myNet > 0.5 ? "text-positive" : myNet < -0.5 ? "text-negative" : "text-text"}`}>
            {Math.abs(myNet) < 0.5 ? "Settled" : formatINR(Math.abs(myNet))}
          </p>
          {Math.abs(myNet) >= 0.5 && (
            <p className="text-[0.78rem] text-text-2">{myNet > 0 ? "you are owed" : "you owe"}</p>
          )}
        </div>
        <Button size="sm" onClick={() => openAdd(null)}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      </Card>

      <Segmented
        value={tab}
        onChange={setTab}
        className="w-full"
        options={[
          { value: "expenses", label: `Expenses (${directExpenses.length})` },
          { value: "balances", label: "Balances" },
        ]}
      />

      {tab === "expenses" ? (
        directExpenses.length > 0 ? (
          <Card className="overflow-hidden">
            <div className="divide-y divide-border">
              {directExpenses.map((e) => (
                <ExpenseRow key={e.id} expense={e} />
              ))}
            </div>
          </Card>
        ) : (
          <Card>
            <EmptyState
              icon={Receipt}
              title="No direct splits yet"
              description="Add a one-off expense with a friend that isn't part of a group."
              action={
                <Button onClick={() => openAdd(null)}>
                  <Plus className="h-4 w-4" /> Add expense
                </Button>
              }
            />
          </Card>
        )
      ) : myBalances.length > 0 ? (
        <Card className="overflow-hidden">
          <div className="divide-y divide-border">
            {myBalances.map((b) => (
              <PersonBalanceRow key={b.personId} personId={b.personId} amount={b.amount} groupId={null} />
            ))}
          </div>
        </Card>
      ) : (
        <Card>
          <EmptyState icon={ArrowLeftRight} title="All settled" description="No outstanding direct balances." />
        </Card>
      )}
    </div>
  );
}
