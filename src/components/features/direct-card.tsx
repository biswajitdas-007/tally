"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ReceiptText } from "lucide-react";
import { useStore, useMyId } from "@/store/useStore";
import { myScopeNet } from "@/lib/balances";
import { SignedAmount } from "@/components/ui/signed-amount";
import { cn } from "@/lib/utils";

function countLabel(count: number): string {
  if (count === 0) return "One-off expenses with friends";
  return `${count} ${count === 1 ? "expense" : "expenses"} · outside groups`;
}

function pillTone(settled: boolean, net: number): string {
  if (settled) return "text-text-2";
  return net > 0 ? "text-positive" : "text-negative";
}

/** Entry point to the direct (non-group) ledger: the brand card at the top of Ledgers. */
export function DirectCard() {
  const expenses = useStore((s) => s.expenses);
  const myId = useMyId();

  const count = useMemo(() => expenses.filter((e) => e.groupId === null && !e.isSettlement).length, [expenses]);
  const net = useMemo(() => myScopeNet(expenses, myId ?? "", null), [expenses, myId]);
  const settled = Math.abs(net) < 0.5;

  return (
    <Link
      href="/direct"
      className="flex items-center gap-3.5 rounded-[26px] bg-brand p-[18px] text-on-brand shadow-[var(--shadow-brand)] transition-colors hover:bg-brand-hover"
    >
      <span aria-hidden className="flex size-[52px] shrink-0 items-center justify-center rounded-[18px] bg-surface">
        <ReceiptText className="size-6 text-brand-on-soft" strokeWidth={1.7} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-bold">Direct splits</span>
        <span className="mt-0.5 block truncate text-[0.8125rem] font-medium">
          {countLabel(count)}
        </span>
      </span>
      <span
        className={cn(
          "shrink-0 rounded-full bg-surface px-3 py-1.5 text-[0.8125rem] font-bold tnum",
          pillTone(settled, net),
        )}
      >
        {settled ? (
          "all settled"
        ) : (
          <SignedAmount net={net} />
        )}
      </span>
    </Link>
  );
}
