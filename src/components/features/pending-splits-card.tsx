"use client";

import { ArrowDownLeft, ArrowUpRight, ChevronRight, Hourglass } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatINR } from "@/lib/utils";
import { useUI } from "@/store/useUI";
import type { Pending } from "@/lib/balances";

/**
 * Money tied up in unsettled splits. Shown wherever account balances are, so
 * the difference between what left the bank and what was actually spent has a
 * name rather than looking like an error.
 */
export function PendingSplitsCard({ pending }: { pending: Pending }) {
  if (!pending.any) return null;

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-brand">
          <Hourglass className="h-4 w-4" />
        </span>
        <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-text-3">Tied up in splits</p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <div className="rounded-[14px] bg-surface-inset p-3">
          <div className="flex items-center gap-1.5 text-text-3">
            <ArrowDownLeft className="h-3.5 w-3.5" />
            <span className="text-[0.72rem] font-medium">Coming back</span>
          </div>
          <p className="mt-1 tnum text-lg font-bold text-positive">{formatINR(pending.incoming)}</p>
        </div>
        <div className="rounded-[14px] bg-surface-inset p-3">
          <div className="flex items-center gap-1.5 text-text-3">
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span className="text-[0.72rem] font-medium">Still to pay</span>
          </div>
          <p className="mt-1 tnum text-lg font-bold text-text">{formatINR(pending.outgoing)}</p>
        </div>
      </div>

      <p className="mt-3 text-[0.82rem] leading-snug text-text-2">
        {pending.incoming > 0.5 ? (
          <>
            You paid for things others share.{" "}
            <b className="text-text">{formatINR(pending.incoming)}</b>{" "}
            lands back in your account as they settle — it&apos;s left your bank but it isn&apos;t really spent.
          </>
        ) : (
          <>
            <b className="text-text">{formatINR(pending.outgoing)}</b>{" "}
            will leave your account when you settle up.
          </>
        )}
      </p>

      <button
        onClick={() => useUI.getState().openWhoOwesWhom()}
        className="mt-3 flex items-center gap-1 text-[0.78rem] font-semibold text-brand"
      >
        See who owes whom <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </Card>
  );
}
