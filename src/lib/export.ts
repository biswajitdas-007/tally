import type { Account, Budget, Emergency, Expense, FinanceEntry, Group, Liability, Person, Recurring } from "./types";
import { APP_VERSION } from "./version";

export interface ExportBundle {
  app: "tally";
  version: string;
  exportedAt: string;
  profile: { name?: string; email?: string; upiId?: string };
  accounts: Account[];
  liabilities: Liability[];
  emergency: Emergency | null;
  budget: Budget;
  recurrings: Recurring[];
  money: FinanceEntry[];
  groups: Group[];
  expenses: Expense[];
  people: { id: string; name: string; email?: string }[];
}

/**
 * Everything of yours, in one plain JSON file. Other people's details are
 * trimmed to what's needed to make sense of a shared expense — a name and the
 * id it's split against — rather than copying their profiles out wholesale.
 */
export function buildExport(state: {
  me: Person | null;
  people: Person[];
  accounts: Account[];
  liabilities: Liability[];
  emergency: Emergency | null;
  budget: Budget;
  recurrings: Recurring[];
  finance: FinanceEntry[];
  groups: Group[];
  expenses: Expense[];
}): ExportBundle {
  return {
    app: "tally",
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    profile: { name: state.me?.name, email: state.me?.email, upiId: state.me?.upiId },
    accounts: state.accounts,
    liabilities: state.liabilities,
    emergency: state.emergency,
    budget: state.budget,
    recurrings: state.recurrings,
    money: state.finance,
    groups: state.groups,
    expenses: state.expenses,
    people: state.people.map((p) => ({ id: p.id, name: p.name, email: p.email })),
  };
}

/** Hand the browser a file to save. */
export function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const exportFilename = (now = new Date()): string => `tally-export-${now.toISOString().slice(0, 10)}.json`;
