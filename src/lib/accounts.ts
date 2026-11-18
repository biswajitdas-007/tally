import type { Account, FinanceEntry, ID } from "./types";

/**
 * Net effect of every money entry linked to an account: income adds, expenses
 * subtract. Split expenses and settlements never touch account balances.
 *
 * `since` (an ISO instant) limits the sum to entries dated on or after it —
 * used by cards, whose stored balance is a baseline taken at a point in time
 * rather than an opening balance.
 */
export function linkedDelta(accountId: ID, finance: FinanceEntry[], since?: string): number {
  let d = 0;
  for (const f of finance) {
    if (f.accountId !== accountId) continue;
    if (since && f.date < since) continue;
    d += f.type === "income" ? f.amount : -f.amount;
  }
  return d;
}

/** An account's current balance = its stored baseline + everything logged against it. */
export function liveBalance(account: Account, finance: FinanceEntry[]): number {
  return account.balance + linkedDelta(account.id, finance);
}

export interface AccountTxn {
  id: ID;
  label: string;
  amount: number; // signed: + into the account, − out of it
  date: string;
}

/** Everything logged against an account, newest first — the "track" of what moved the money. */
export function accountTransactions(accountId: ID, finance: FinanceEntry[]): AccountTxn[] {
  const out: AccountTxn[] = [];
  for (const f of finance) {
    if (f.accountId !== accountId) continue;
    out.push({
      id: f.id,
      label: f.note?.trim() || (f.transfer ? "Transfer" : f.type === "income" ? "Income" : "Expense"),
      amount: f.type === "income" ? f.amount : -f.amount,
      date: f.date,
    });
  }
  return out.sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

/** Accounts with live balances substituted in — for net worth, health and display. */
export function withLiveBalances(accounts: Account[], finance: FinanceEntry[]): Account[] {
  return accounts.map((a) => ({ ...a, balance: liveBalance(a, finance) }));
}
