import type { Expense, Group, PendingInvite, Person, Split } from "./types";

/**
 * Sample data for the dev-only preview session (see ./preview.ts). Mirrors the
 * approved design mockups: a trip, a flat and a dinner group, plus direct splits.
 * Dates are relative to `now`, so "Today" and "Yesterday" groupings always show.
 *
 * Keep the top level free of calls (only literals and functions) so production
 * bundles, where nothing uses this module, can drop all of it.
 */

export const PREVIEW_ME = "preview_me";
const ME = PREVIEW_ME;
const RIYA = "preview_riya";
const KABIR = "preview_kabir";
const MEERA = "preview_meera";
const SANA = "preview_sana";

const person = (id: string, name: string, avatarColor: string, extra: Partial<Person> = {}): Person => ({
  id,
  name,
  email: `${name.split(" ")[0].toLowerCase()}@example.com`,
  avatarColor,
  ...extra,
});

/** Sample people; UPI handles use a made-up `@demo` provider so none can belong to anyone. */
export function previewPeople(): Person[] {
  return [
    person(ME, "Aarav Kapoor", "#5b3ff0", { isYou: true, upiId: "aarav@demo" }),
    person(RIYA, "Riya Sharma", "#b80f48", { upiId: "riya@demo" }),
    person(KABIR, "Kabir Mehta", "#0b7a50", { upiId: "kabir@demo" }),
    person(MEERA, "Meera Iyer", "#a16207"),
    person(SANA, "Sana Qureshi", "#0a74b8", { upiId: "sana@demo" }),
    person("preview_dev", "Dev", "#6e6a88", { pending: true }),
  ];
}

export const PREVIEW_GROUPS: Group[] = [
  { id: "preview_goa", name: "Goa trip", icon: "trip", color: "var(--cat-travel)", memberIds: [ME, RIYA, KABIR, MEERA], createdAt: "2026-10-02T09:00:00.000Z" },
  { id: "preview_flat", name: "Flat 4B", icon: "home", color: "var(--cat-rent)", memberIds: [ME, RIYA, SANA], createdAt: "2026-06-01T09:00:00.000Z" },
  { id: "preview_dinners", name: "Friday dinners", icon: "food", color: "var(--cat-food)", memberIds: [ME, KABIR, MEERA, SANA], createdAt: "2026-08-15T09:00:00.000Z" },
];

/** Equal split of `amount` across `ids`, with any rounding paise on the first person. */
function equalSplits(amount: number, ids: string[]): Split[] {
  const share = Math.floor((amount / ids.length) * 100) / 100;
  const rest = Math.round((amount - share * ids.length) * 100) / 100;
  return ids.map((personId, i) => ({ personId, amount: i === 0 ? Math.round((share + rest) * 100) / 100 : share }));
}

export function previewExpenses(now = new Date()): Expense[] {
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000).toISOString();
  let n = 0;
  const expense = (
    groupId: string | null,
    description: string,
    amount: number,
    category: Expense["category"],
    paidBy: string,
    splitWith: string[],
    ago: number,
    extra: Partial<Expense> = {},
  ): Expense => ({
    id: `preview_e${++n}`,
    groupId,
    description,
    amount,
    category,
    paidBy,
    splits: equalSplits(amount, splitWith),
    date: daysAgo(ago),
    createdBy: paidBy,
    createdAt: daysAgo(ago),
    ...extra,
  });
  const settle = (groupId: string | null, from: string, to: string, amount: number, ago: number): Expense => ({
    ...expense(groupId, "Settled up", amount, "other", from, [to], ago),
    isSettlement: true,
  });

  const goa = [ME, RIYA, KABIR, MEERA];
  const flat = [ME, RIYA, SANA];
  const dinners = [ME, KABIR, MEERA, SANA];
  return [
    expense("preview_goa", "Beach shack dinner", 3200, "food", ME, goa, 0),
    expense("preview_goa", "Scooter rental", 1600, "travel", KABIR, goa, 0),
    expense("preview_goa", "Flights BLR → GOI", 18400, "travel", ME, goa, 1),
    expense("preview_goa", "Sunscreen & snacks", 960, "shopping", RIYA, goa, 1),
    settle("preview_goa", MEERA, KABIR, 1150, 1),
    expense("preview_flat", "November rent", 24600, "rent", RIYA, flat, 3, { recurring: "monthly" }),
    expense("preview_flat", "Electricity bill", 2850, "bills", SANA, flat, 6),
    expense("preview_flat", "Groceries", 1890, "grocery", ME, flat, 9),
    expense("preview_dinners", "Ramen night", 2400, "food", KABIR, dinners, 4),
    settle("preview_dinners", ME, KABIR, 600, 2),
    expense(null, "Concert tickets", 2400, "fun", ME, [ME, SANA], 5),
    expense(null, "Cab to airport", 560, "travel", ME, [ME, SANA], 12),
    expense(null, "Lunch", 640, "food", KABIR, [ME, KABIR], 8),
    settle(null, KABIR, ME, 1500, 2),
  ];
}

export const PREVIEW_PENDING_INVITES: PendingInvite[] = [
  { id: "preview_inv1", email: "dev.k@example.com", groupId: null, groupName: null, createdAt: "2026-11-24T10:00:00.000Z" },
];

/** Everything the store needs to render a signed-in app. */
export function previewState(now = new Date()) {
  const people = previewPeople();
  return {
    authReady: true,
    dataReady: true,
    loadError: false,
    currentUserId: PREVIEW_ME,
    me: people[0],
    people,
    groups: PREVIEW_GROUPS,
    expenses: previewExpenses(now),
    removedFriends: [] as string[],
    pendingInvites: PREVIEW_PENDING_INVITES,
  };
}
