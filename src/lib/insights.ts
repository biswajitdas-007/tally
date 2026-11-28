import { myShare } from "./balances";
import type { Expense, Group } from "./types";

export interface GroupSpend {
  /** The group id, or "personal" for one-on-one splits. */
  id: string;
  personal: boolean;
  name: string;
  /** The group's stored icon (null for personal, or a group that no longer exists). */
  icon: string | null;
  amount: number;
}

/** Your share of all split spending, per group (and one-on-one), largest first. */
export function spendByGroup(expenses: Expense[], groups: Group[], myId: string): GroupSpend[] {
  const totals = new Map<string, number>();
  for (const e of expenses) {
    if (e.isSettlement) continue;
    const key = e.groupId ?? "personal";
    totals.set(key, (totals.get(key) ?? 0) + myShare(e, myId));
  }
  return [...totals.entries()]
    .map(([id, amount]) => {
      const group = groups.find((g) => g.id === id);
      const personal = id === "personal";
      return {
        id,
        personal,
        name: personal ? "Personal / 1-on-1" : (group?.name ?? "—"),
        icon: group?.icon ?? null,
        amount,
      };
    })
    .filter((g) => g.amount > 0.5)
    .sort((a, b) => b.amount - a.amount);
}
