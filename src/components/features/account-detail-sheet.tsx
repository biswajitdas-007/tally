"use client";

import { Pencil, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { BankBadge } from "./bank-badge";
import { ACCOUNT_KIND_META } from "@/lib/categories";
import { useStore, useMyId } from "@/store/useStore";
import { useUI } from "@/store/useUI";
import { liveBalance, accountTransactions } from "@/lib/accounts";
import { formatINR, cn } from "@/lib/utils";
import type { AccountKind } from "@/lib/types";

export function AccountDetailSheet() {
  const id = useUI((s) => s.accountDetailId);
  const close = useUI((s) => s.closeAccountDetail);
  const openWealth = useUI((s) => s.openWealth);
  const accounts = useStore((s) => s.accounts);
  const finance = useStore((s) => s.finance);
  const expenses = useStore((s) => s.expenses);
  const myId = useMyId() ?? "";

  const account = id ? accounts.find((a) => a.id === id) ?? null : null;
  if (!account) return null;

  const balance = liveBalance(account, finance, expenses, myId);
  const txns = accountTransactions(account.id, finance, expenses, myId);
  const Icon = ACCOUNT_KIND_META[account.kind as AccountKind].icon;

  return (
    <Sheet open={Boolean(id)} onClose={close} title={account.name}>
      <div className="flex flex-col gap-5 pt-1">
        <div className="flex items-center gap-3.5">
          <BankBadge name={account.name} fallback={Icon} tone="positive" className="h-12 w-12" />
          <div className="min-w-0 flex-1">
            <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-text-3">Balance</p>
            <p className="font-display text-2xl font-bold tnum text-text">{formatINR(balance)}</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              close();
              openWealth("asset", account.id);
            }}
          >
            <Pencil className="h-4 w-4" /> Edit
          </Button>
        </div>

        <div>
          <p className="mb-2 px-0.5 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-text-3">
            Activity ({txns.length})
          </p>
          {txns.length > 0 ? (
            <div className="overflow-hidden rounded-[16px] border border-border">
              <div className="divide-y divide-border">
                {txns.map((t) => {
                  const inflow = t.amount > 0;
                  return (
                    <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                          inflow ? "bg-positive-soft text-positive" : "bg-surface-inset text-text-2",
                        )}
                      >
                        {inflow ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[0.88rem] font-medium text-text">{t.label}</p>
                        <p className="text-[0.74rem] text-text-3">
                          {new Date(t.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </p>
                      </div>
                      <span className={cn("tnum text-[0.9rem] font-semibold", inflow ? "text-positive" : "text-text")}>
                        {inflow ? "+" : "−"}
                        {formatINR(Math.abs(t.amount))}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-[16px] border border-border bg-surface-2 px-4 py-6 text-center text-[0.85rem] text-text-3">
              Nothing logged against this account yet. Add an expense or settle up and pick this account.
            </div>
          )}
        </div>
      </div>
    </Sheet>
  );
}
