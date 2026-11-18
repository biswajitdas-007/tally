"use client";

import { useSyncExternalStore } from "react";
import { ArrowUpRight, Wallet, X } from "lucide-react";

const DISMISS_KEY = "tally-money-moved-dismissed";
const MONEY_LEDGER_URL = process.env.NEXT_PUBLIC_MONEY_LEDGER_URL;

const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const isDismissed = () => {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
};

function dismiss() {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    /* private mode — it simply shows again next time */
  }
  listeners.forEach((cb) => cb());
}

/**
 * Money tracking now lives in its own app. Anyone who used it here gets one
 * clear pointer to where it went; once dismissed it never comes back. Hidden
 * entirely until the new app's address is configured.
 */
export function MoneyMovedBanner() {
  // The server never knows what was dismissed, so it renders nothing.
  const dismissed = useSyncExternalStore(subscribe, isDismissed, () => true);
  if (dismissed || !MONEY_LEDGER_URL) return null;

  return (
    <div className="flex items-center gap-3.5 rounded-[16px] border border-border bg-surface p-4 shadow-[var(--shadow-xs)]">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
        <Wallet className="h-5 w-5" />
      </span>
      <a href={MONEY_LEDGER_URL} className="min-w-0 flex-1" onClick={dismiss}>
        <p className="flex items-center gap-1 text-[0.9rem] font-semibold text-text">
          Money tracking has moved <ArrowUpRight className="h-4 w-4 text-text-3" />
        </p>
        <p className="text-[0.76rem] leading-snug text-text-3">
          Budgets, accounts, loans and net worth now live in Money Ledger. Tally is all about splitting.
        </p>
      </a>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-3 transition-colors hover:bg-surface-inset hover:text-text-2"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
