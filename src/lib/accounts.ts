import type { Account, Expense, FinanceEntry, ID } from "./types";

/**
 * Net effect of every entry linked to an account. Cash-accurate:
 *  - Money income adds, Money expense subtracts
 *  - a split you paid subtracts the full amount you paid
 *  - a settlement subtracts when you paid, adds when you received
 * Entries carry the recorder's private account id, so this only ever sums the
 * current user's own transactions.
 */
export function linkedDelta(accountId: ID, finance: FinanceEntry[], expenses: Expense[], meId: ID): number {
  let d = 0;
  for (const f of finance) {
    if (f.accountId !== accountId) continue;
    d += f.type === "income" ? f.amount : -f.amount;
  }
  for (const e of expenses) {
    if (e.accountId !== accountId) continue;
    if (e.isSettlement) {
      d += e.paidBy === meId ? -e.amount : e.amount;
    } else if (e.paidBy === meId) {
      d -= e.amount;
    }
  }
  return d;
}

/** An account's current balance = its stored baseline + everything logged against it. */
export function liveBalance(account: Account, finance: FinanceEntry[], expenses: Expense[], meId: ID): number {
  return account.balance + linkedDelta(account.id, finance, expenses, meId);
}

/** Accounts with live balances substituted in — for net worth, health and display. */
export function withLiveBalances(accounts: Account[], finance: FinanceEntry[], expenses: Expense[], meId: ID): Account[] {
  return accounts.map((a) => ({ ...a, balance: liveBalance(a, finance, expenses, meId) }));
}

/**
 * Money you've received (settlements paid *to* you) that you haven't assigned to
 * an account — it still counts toward your worth. "Parking" it creates a transfer
 * into an account, which is subtracted here so nothing double-counts.
 */
export function unparkedAmount(finance: FinanceEntry[], expenses: Expense[], accounts: Account[], meId: ID): number {
  const mine = new Set(accounts.map((a) => a.id));
  let received = 0;
  for (const e of expenses) {
    if (!e.isSettlement || e.paidBy === meId) continue; // only money that came *to* me
    if (!e.splits.some((s) => s.personId === meId)) continue; // I'm the payee
    if (e.accountId && mine.has(e.accountId)) continue; // already parked into my account
    received += e.amount;
  }
  let parked = 0;
  for (const f of finance) if (f.transfer && f.type === "income") parked += f.amount;
  return Math.max(0, received - parked);
}
