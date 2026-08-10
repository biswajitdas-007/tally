"use client";

import { useState } from "react";
import { Check, ArrowRight, Info } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { BankBadge } from "./bank-badge";
import { ACCOUNT_KIND_META } from "@/lib/categories";
import { withLiveBalances } from "@/lib/accounts";
import { staleAccounts, reconciled, confirmed, lastCheckedLabel, DRIFT_EPSILON } from "@/lib/reconcile";
import { useStore, useMyId } from "@/store/useStore";
import { useUI } from "@/store/useUI";
import { useToast } from "@/components/ui/toast";
import { formatINR, cn , sanitizeMoneyInput} from "@/lib/utils";
import type { Account, AccountKind } from "@/lib/types";

export function ReconcileSheet() {
  const open = useUI((s) => s.reconcileOpen);
  const close = useUI((s) => s.closeReconcile);
  const accounts = useStore((s) => s.accounts);
  const finance = useStore((s) => s.finance);
  const expenses = useStore((s) => s.expenses);
  const setWealth = useStore((s) => s.setWealth);
  const addFinance = useStore((s) => s.addFinance);
  const myId = useMyId() ?? "";
  const { toast } = useToast();

  const live = withLiveBalances(accounts, finance, expenses, myId);
  const stale = staleAccounts(live);

  const [idx, setIdx] = useState(0);
  const [value, setValue] = useState("");
  const [logGap, setLogGap] = useState(true);
  const [done, setDone] = useState(0);

  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setIdx(0);
    setValue("");
    setLogGap(true);
    setDone(0);
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  const current = stale[idx];
  const shown = current?.account.balance ?? 0;
  const typed = value.trim() === "" ? null : parseFloat(value.replace(/[^0-9.-]/g, ""));
  const actual = typed === null || Number.isNaN(typed) ? shown : typed;
  const drift = Math.round((actual - shown) * 100) / 100;
  const hasDrift = Math.abs(drift) >= DRIFT_EPSILON;

  function commit(next: Account) {
    setWealth({ accounts: accounts.map((a) => (a.id === next.id ? next : a)) });
  }

  function step(nextAccount: Account) {
    commit(nextAccount);
    setDone((d) => d + 1);
    if (idx + 1 < stale.length) {
      setIdx(idx + 1);
      setValue("");
    } else {
      toast({ message: done + 1 === 1 ? "Balance confirmed" : `${done + 1} balances confirmed` });
      close();
    }
  }

  function save() {
    if (!current) return;
    const base = accounts.find((a) => a.id === current.account.id);
    if (!base) return;

    if (!hasDrift) {
      step(confirmed(base));
      return;
    }

    // Record the gap so the month's cashflow still adds up, rather than money
    // quietly appearing or vanishing from net worth.
    if (logGap) {
      addFinance({
        type: drift > 0 ? "income" : "expense",
        amount: Math.abs(drift),
        category: "other",
        accountId: base.id,
        note: drift > 0 ? "Balance correction — money not logged" : "Balance correction — spending not logged",
      });
      // The entry itself moves the live balance, so only stamp the check.
      step(confirmed(base));
    } else {
      step(reconciled(base, actual, shown));
    }
  }

  if (!current) {
    return (
      <Sheet open={open} onClose={close} title="Balances are up to date">
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-positive-soft text-positive">
            <Check className="h-6 w-6" strokeWidth={2.5} />
          </span>
          <p className="max-w-[18rem] text-[0.9rem] text-text-2">
            Every account has been checked recently. We&apos;ll ask again in a month.
          </p>
          <Button variant="secondary" onClick={close}>
            Close
          </Button>
        </div>
      </Sheet>
    );
  }

  const Icon = ACCOUNT_KIND_META[current.account.kind as AccountKind].icon;

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Does this still match?"
      description="Open your banking app and check the real balance. Keeping this honest is what makes net worth mean anything."
    >
      <div className="flex flex-col gap-5 pt-1">
        {stale.length > 1 && (
          <div className="flex items-center gap-2">
            {stale.map((_, i) => (
              <span
                key={i}
                className={cn("h-1 flex-1 rounded-full", i < idx ? "bg-positive" : i === idx ? "bg-brand" : "bg-surface-inset")}
              />
            ))}
            <span className="shrink-0 text-[0.72rem] font-medium text-text-3">
              {idx + 1}/{stale.length}
            </span>
          </div>
        )}

        {/* The account */}
        <div className="flex items-center gap-3 rounded-[16px] border border-border bg-surface-2 p-4">
          <BankBadge name={current.account.name} fallback={Icon} tone="positive" className="h-10 w-10" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.95rem] font-semibold text-text">{current.account.name}</p>
            <p className="text-[0.76rem] text-text-3">
              {ACCOUNT_KIND_META[current.account.kind as AccountKind].label} · {lastCheckedLabel(current.days)}
            </p>
          </div>
        </div>

        {/* What we think vs what's real */}
        <div>
          <p className="mb-2 px-0.5 text-[0.8rem] font-semibold text-text-2">Tally has</p>
          <div className="rounded-[14px] bg-surface-inset px-4 py-3">
            <span className="font-display text-xl font-bold tnum text-text-2">{formatINR(shown)}</span>
          </div>
        </div>

        <div>
          <p className="mb-2 px-0.5 text-[0.8rem] font-semibold text-text-2">Your bank says</p>
          <label className="flex items-center gap-2 rounded-[14px] border border-border bg-surface px-4 py-3 cursor-text">
            <span className="font-display text-lg font-semibold text-text-2">₹</span>
            <input
              value={value}
              onChange={(e) => setValue(sanitizeMoneyInput(e.target.value))}
              inputMode="decimal"
              placeholder={String(Math.round(shown))}
              className="flex-1 bg-transparent font-display text-lg font-bold tnum outline-none placeholder:text-text-3"
            />
          </label>
        </div>

        {hasDrift && (
          <>
            <div
              className={cn(
                "flex items-start gap-2.5 rounded-[14px] border px-4 py-3",
                drift > 0 ? "border-positive/25 bg-positive-soft text-positive" : "border-negative/25 bg-negative-soft text-negative",
              )}
            >
              <ArrowRight className="mt-0.5 h-4.5 w-4.5 shrink-0" />
              <p className="text-[0.85rem] font-medium leading-snug">
                {drift > 0 ? "You have " : "You're short "}
                <b>{formatINR(Math.abs(drift))}</b> {drift > 0 ? "more" : ""} than Tally expected —{" "}
                {drift > 0 ? "some money came in that wasn't logged." : "some spending wasn't logged."}
              </p>
            </div>

            <div className="rounded-[16px] border border-border bg-surface-2 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[0.9rem] font-semibold text-text">Log the difference</p>
                  <p className="text-[0.78rem] text-text-2">Keeps this month&apos;s totals honest.</p>
                </div>
                <Switch checked={logGap} onChange={setLogGap} label="Log the difference" />
              </div>
              <p className="mt-2.5 flex items-start gap-1.5 text-[0.76rem] leading-snug text-text-3">
                <Info className="mt-px h-3.5 w-3.5 shrink-0" />
                {logGap
                  ? `We'll add a ${formatINR(Math.abs(drift))} ${drift > 0 ? "income" : "expense"} entry so your spending figures still add up.`
                  : "We'll just correct the balance. Your income and spending totals won't reflect the gap."}
              </p>
            </div>
          </>
        )}

        <div className="sticky bottom-0 -mx-5 flex gap-3 border-t border-border bg-surface px-5 pb-1 pt-3">
          <Button variant="secondary" size="lg" onClick={() => step(confirmed(current.account))}>
            It&apos;s right
          </Button>
          <Button variant="primary" size="lg" fullWidth onClick={save}>
            <Check className="h-4.5 w-4.5" />
            {hasDrift ? "Correct it" : "Confirm"}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
