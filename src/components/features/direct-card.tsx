"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useStore, useMyId } from "@/store/useStore";
import { myScopeNet } from "@/lib/balances";
import { formatINR, cn } from "@/lib/utils";

/** Entry point to the direct (non-group) ledger — mirrors GroupCard styling. */
export function DirectCard() {
  const expenses = useStore((s) => s.expenses);
  const myId = useMyId();

  const count = useMemo(() => expenses.filter((e) => e.groupId === null && !e.isSettlement).length, [expenses]);
  const net = useMemo(() => myScopeNet(expenses, myId ?? "", null), [expenses, myId]);
  const settled = Math.abs(net) < 0.5;

  return (
    <Link
      href="/direct"
      className="group flex items-center gap-3.5 rounded-[16px] border border-border bg-surface p-3.5 shadow-[var(--shadow-xs)] transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[var(--shadow-md)]"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-surface-inset text-2xl">
        🧾
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-text">Direct splits</p>
        <p className="mt-0.5 text-[0.75rem] text-text-3">
          {count > 0 ? `${count} ${count === 1 ? "expense" : "expenses"} · outside groups` : "One-off expenses with friends"}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 text-right">
        {settled ? (
          <span className="rounded-full bg-surface-inset px-2.5 py-1 text-[0.72rem] font-semibold text-text-2">
            all settled
          </span>
        ) : (
          <div>
            <p className="text-[0.68rem] font-medium uppercase tracking-wide text-text-3">
              {net > 0 ? "you're owed" : "you owe"}
            </p>
            <p className={cn("tnum font-semibold", net > 0 ? "text-positive" : "text-negative")}>
              {formatINR(Math.abs(net))}
            </p>
          </div>
        )}
        <ChevronRight className="h-4 w-4 text-text-3" />
      </div>
    </Link>
  );
}
