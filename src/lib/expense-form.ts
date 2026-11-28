import { splitEqually } from "./utils";
import { isEqualSplit } from "./splits";
import type { CategoryKey, Expense, Group, ID, Split } from "./types";

export type SplitMode = "equal" | "exact";

/** Everything the add/edit expense form holds. */
export interface ExpenseFormState {
  amount: string;
  description: string;
  category: CategoryKey;
  /** Once the user picks a category, typing a description stops re-guessing it. */
  categoryTouched: boolean;
  groupId: ID | null;
  paidBy: ID;
  participants: ID[];
  splitMode: SplitMode;
  /** Exact share per person, as typed. */
  exact: Record<ID, string>;
  date: Date;
  notes: string;
  showNotes: boolean;
  recurring: boolean;
}

/** Who a new expense starts split between: in a group, its active (not offline) members. */
function initialParticipants(groupCtx: ID | null, groups: Group[], myId: ID): ID[] {
  const group = groupCtx ? groups.find((g) => g.id === groupCtx) : undefined;
  if (!group) return [myId];
  const offline = group.offlineIds ?? [];
  const active = group.memberIds.filter((id) => id === myId || !offline.includes(id));
  return active.length > 0 ? active : group.memberIds;
}

/** The form's starting values: a blank expense, or the one being edited. */
export function initialExpenseForm(args: {
  editing: Expense | null;
  groupCtx: ID | null;
  groups: Group[];
  myId: ID;
  now?: Date;
}): ExpenseFormState {
  const { editing, groupCtx, groups, myId, now = new Date() } = args;
  if (!editing) {
    return {
      amount: "",
      description: "",
      category: "food",
      categoryTouched: false,
      groupId: groupCtx,
      paidBy: myId,
      participants: initialParticipants(groupCtx, groups, myId),
      splitMode: "equal",
      exact: {},
      date: now,
      notes: "",
      showNotes: false,
      recurring: false,
    };
  }
  // Reopen an unequal split as exact amounts — resetting to equal would
  // silently rewrite everyone's share on any edit.
  const equal = isEqualSplit(editing.amount, editing.splits.map((s) => s.amount));
  return {
    amount: String(editing.amount),
    description: editing.description,
    category: editing.category,
    categoryTouched: true,
    groupId: editing.groupId,
    paidBy: editing.paidBy,
    participants: editing.splits.map((s) => s.personId),
    splitMode: equal ? "equal" : "exact",
    exact: equal ? {} : Object.fromEntries(editing.splits.map((s) => [s.personId, String(s.amount)])),
    date: new Date(editing.date),
    notes: editing.notes ?? "",
    showNotes: Boolean(editing.notes),
    recurring: editing.recurring === "monthly" || editing.recurring === "weekly",
  };
}

/** People an expense can be split among: the group's members, or you and your friends. */
export function splitPool(groupId: ID | null, groups: Group[], friendIds: ID[], myId: ID): ID[] {
  if (groupId) return groups.find((g) => g.id === groupId)?.memberIds ?? [myId];
  return [myId, ...friendIds];
}

export function parseAmount(value: string): number {
  return Number.parseFloat(value) || 0;
}

/** Each participant's share: equal (paisa-exact) or the typed exact amounts. */
export function computeSplits(state: Pick<ExpenseFormState, "amount" | "participants" | "splitMode" | "exact">): Split[] {
  const { participants, splitMode, exact } = state;
  if (participants.length === 0) return [];
  if (splitMode === "exact") {
    return participants.map((id) => ({ personId: id, amount: parseAmount(exact[id] ?? "") }));
  }
  const shares = splitEqually(parseAmount(state.amount), participants.length);
  return participants.map((id, i) => ({ personId: id, amount: shares[i] }));
}

/** How much of the total is still unassigned in exact mode (negative when over). */
export function exactRemaining(state: Pick<ExpenseFormState, "amount" | "participants" | "exact">): number {
  const assigned = state.participants.reduce((sum, id) => sum + parseAmount(state.exact[id] ?? ""), 0);
  return Math.round((parseAmount(state.amount) - assigned) * 100) / 100;
}

export function isExpenseFormValid(state: ExpenseFormState): boolean {
  return (
    parseAmount(state.amount) > 0 &&
    state.description.trim().length > 0 &&
    state.participants.length > 0 &&
    (state.splitMode === "equal" || Math.abs(exactRemaining(state)) < 0.01)
  );
}

/** What gets saved. A weekly repeat stays weekly; the toggle only turns repeating on or off. */
export function expensePayload(state: ExpenseFormState, editing: Expense | null) {
  let recurring: "monthly" | "weekly" | "none" = "none";
  if (state.recurring) recurring = editing?.recurring === "weekly" ? "weekly" : "monthly";
  return {
    groupId: state.groupId,
    description: state.description.trim(),
    amount: parseAmount(state.amount),
    category: state.category,
    paidBy: state.paidBy,
    splits: computeSplits(state),
    date: state.date.toISOString(),
    notes: state.notes.trim() || undefined,
    recurring,
  };
}
