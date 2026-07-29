import type { Account, Budget, Emergency, FinanceEntry, Liability } from "./types";

export interface MoneySignals {
  pref?: boolean;
  finance: FinanceEntry[];
  accounts: Account[];
  liabilities: Liability[];
  budget: Budget;
  emergency: Emergency | null;
}

/**
 * Whether to show the money-first home screen.
 *
 * An explicit choice always wins. Otherwise we infer it: anyone who has logged
 * money, added an account or a loan, set a budget or an emergency fund is
 * plainly tracking their finances, and shouldn't have to flip a switch to be
 * shown them.
 */
export function usesMoney({ pref, finance, accounts, liabilities, budget, emergency }: MoneySignals): boolean {
  if (typeof pref === "boolean") return pref;
  return (
    finance.length > 0 ||
    accounts.length > 0 ||
    liabilities.length > 0 ||
    Boolean(budget.monthly && budget.monthly > 0) ||
    Boolean(emergency && emergency.target > 0)
  );
}
