import { createHash } from "node:crypto";
import { memberNet, scopedDebts, simplifiedPlan, splitOverview, type PersonDebt, type SplitOverview, type Transfer } from "./balances";
import type { Expense } from "./types";

/**
 * Ledger snapshots guard split history while the app is being restructured.
 *
 * A snapshot captures the split data (groups, expenses, invites and the split
 * fields of each user) together with the balances the current code computes
 * from it. Two checks build on that:
 *
 *  - `compareSnapshots(before, after)` — did any split data change or vanish,
 *    and do balances still match wherever the underlying data is unchanged?
 *  - `verifySnapshot(snapshot)` — does the *current* code still compute the
 *    same balances from the snapshot's frozen data? This catches logic
 *    regressions independently of real users adding expenses in between.
 *
 * Everything here is pure; reading from MongoDB lives in scripts/ledger-*.ts.
 */

/* ---------- raw data ---------- */

type Doc = Record<string, unknown> & { _id: string };

export interface RawLedger {
  users: Doc[];
  groups: Doc[];
  expenses: Doc[];
  invites: Doc[];
}

/** User fields that belong to splits. Money fields are never read. */
export const USER_SPLIT_FIELDS = ["name", "email", "photoURL", "avatarColor", "upiId", "contacts", "removedFriends"] as const;

/** Fields that are allowed to differ without counting as a change to split history. */
const IGNORED_FIELDS: Record<keyof RawLedger, readonly string[]> = {
  users: [],
  groups: [],
  // The "paid from account" link is being removed; it never affected balances.
  expenses: ["accountId"],
  invites: [],
};

/* ---------- snapshot shape ---------- */

export interface UserBalances {
  expenses: number;
  settlements: number;
  direct: number;
  debts: PersonDebt[];
  overview: SplitOverview;
}

export interface GroupBalances {
  net: [string, number][];
  plan: Transfer[];
}

export interface Snapshot {
  version: 1;
  label: string;
  takenAt: string;
  counts: Record<keyof RawLedger, number>;
  hashes: Record<keyof RawLedger, Record<string, string>>;
  balances: Record<string, UserBalances>;
  groups: Record<string, GroupBalances>;
  /** The frozen data itself, so `verifySnapshot` can recompute later. Contains personal data. */
  raw: RawLedger;
}

/* ---------- hashing ---------- */

/** Deterministic JSON: sorted keys, Dates as ISO strings, undefined dropped. */
export function stableStringify(value: unknown): string {
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return `[${value.map((v) => (v === undefined ? "null" : stableStringify(v))).join(",")}]`;
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).filter((k) => obj[k] !== undefined).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

export function hashDoc(doc: Doc, ignore: readonly string[] = []): string {
  const copy: Record<string, unknown> = { ...doc };
  for (const f of ignore) delete copy[f];
  return createHash("sha256").update(stableStringify(copy)).digest("hex").slice(0, 32);
}

/** Round-trip through JSON so in-memory snapshots compare like ones read from disk. */
function normalize<T>(value: T): T {
  return JSON.parse(stableStringify(value)) as T;
}

/* ---------- computing ---------- */

function toExpense(d: Doc): Expense {
  return {
    id: d._id,
    groupId: (d.groupId as string | null | undefined) ?? null,
    description: String(d.description ?? ""),
    amount: Number(d.amount ?? 0),
    category: (d.category as Expense["category"]) ?? "other",
    paidBy: String(d.paidBy ?? ""),
    splits: ((d.splits as Expense["splits"]) ?? []).map((s) => ({ personId: s.personId, amount: Number(s.amount) })),
    date: String(d.date ?? ""),
    createdBy: String(d.createdBy ?? ""),
    createdAt: String(d.createdAt ?? ""),
    isSettlement: Boolean(d.isSettlement),
  };
}

function memberUidsOf(d: Doc): string[] {
  return Array.isArray(d.memberUids) ? (d.memberUids as string[]) : [];
}

/** Expense ids each user can see — the same `memberUids` rule the state API uses. */
function visibleExpenseIds(expenses: Doc[]): Map<string, string[]> {
  const byUser = new Map<string, string[]>();
  for (const e of expenses) {
    for (const uid of new Set(memberUidsOf(e))) {
      const list = byUser.get(uid);
      if (list) list.push(e._id);
      else byUser.set(uid, [e._id]);
    }
  }
  return byUser;
}

export function computeBalances(raw: RawLedger): Pick<Snapshot, "balances" | "groups"> {
  const expenseById = new Map(raw.expenses.map((d) => [d._id, toExpense(d)]));

  const balances: Record<string, UserBalances> = {};
  for (const [uid, ids] of visibleExpenseIds(raw.expenses)) {
    const list = ids.map((id) => expenseById.get(id)!);
    balances[uid] = {
      expenses: list.filter((e) => !e.isSettlement).length,
      settlements: list.filter((e) => e.isSettlement).length,
      direct: list.filter((e) => !e.groupId).length,
      debts: scopedDebts(list, uid),
      overview: splitOverview(list, uid),
    };
  }

  const byGroup = new Map<string, Expense[]>();
  for (const e of expenseById.values()) {
    if (!e.groupId) continue;
    const list = byGroup.get(e.groupId);
    if (list) list.push(e);
    else byGroup.set(e.groupId, [e]);
  }
  const groups: Record<string, GroupBalances> = {};
  for (const g of raw.groups) {
    const list = byGroup.get(g._id) ?? [];
    const net = [...memberNet(list).entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    groups[g._id] = { net, plan: simplifiedPlan(list) };
  }

  return normalize({ balances, groups });
}

export function buildSnapshot(raw: RawLedger, label: string, takenAt = new Date().toISOString()): Snapshot {
  const frozen = normalize(raw);
  const hashes = {} as Snapshot["hashes"];
  const counts = {} as Snapshot["counts"];
  for (const key of Object.keys(IGNORED_FIELDS) as (keyof RawLedger)[]) {
    hashes[key] = Object.fromEntries(frozen[key].map((d) => [d._id, hashDoc(d, IGNORED_FIELDS[key])]));
    counts[key] = frozen[key].length;
  }
  return { version: 1, label, takenAt, counts, hashes, ...computeBalances(frozen), raw: frozen };
}

/* ---------- checking ---------- */

export interface Findings {
  /** Must be zero: balances moved without their data changing, or the code computes differently. */
  errors: string[];
  /** Split data changed or disappeared — confirm each was a real user edit. */
  review: string[];
  /** Expected churn, e.g. new expenses added by users. */
  info: string[];
}

const EPS = 0.005;

/** Deep equality with a small tolerance for money rounding. */
export function sameValue(a: unknown, b: unknown): boolean {
  if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) < EPS;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((v, i) => sameValue(v, b[i]));
  if (a && b && typeof a === "object" && typeof b === "object") {
    const ka = Object.keys(a).sort();
    const kb = Object.keys(b).sort();
    if (!sameValue(ka, kb)) return false;
    return ka.every((k) => sameValue((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
  }
  return a === b;
}

export function compareSnapshots(before: Snapshot, after: Snapshot): Findings {
  const f: Findings = { errors: [], review: [], info: [] };
  const touched = new Set<string>(); // expense / group ids whose data changed

  for (const key of Object.keys(IGNORED_FIELDS) as (keyof RawLedger)[]) {
    const a = before.hashes[key];
    const b = after.hashes[key];
    const removed = Object.keys(a).filter((id) => !(id in b));
    const changed = Object.keys(a).filter((id) => id in b && a[id] !== b[id]);
    const added = Object.keys(b).filter((id) => !(id in a));
    for (const id of [...removed, ...changed, ...added]) touched.add(`${key}:${id}`);
    if (removed.length) f.review.push(`${key}: ${removed.length} removed — ${removed.slice(0, 20).join(", ")}`);
    if (changed.length) f.review.push(`${key}: ${changed.length} changed — ${changed.slice(0, 20).join(", ")}`);
    if (added.length) f.info.push(`${key}: ${added.length} added`);
  }

  // A user's balances must be identical when none of the expenses they can see changed.
  const visBefore = visibleExpenseIds(before.raw.expenses);
  const visAfter = visibleExpenseIds(after.raw.expenses);
  let skipped = 0;
  for (const uid of new Set([...visBefore.keys(), ...visAfter.keys()])) {
    const ids = new Set([...(visBefore.get(uid) ?? []), ...(visAfter.get(uid) ?? [])]);
    if ([...ids].some((id) => touched.has(`expenses:${id}`))) {
      skipped++;
      continue;
    }
    if (!sameValue(before.balances[uid], after.balances[uid])) f.errors.push(`balances changed for user ${uid} with no change to their expenses`);
  }
  if (skipped) f.info.push(`${skipped} user(s) skipped for balance comparison because their expenses changed`);

  for (const gid of Object.keys(before.groups)) {
    if (!(gid in after.groups)) continue;
    const groupTouched = before.raw.expenses.concat(after.raw.expenses).some((e) => e.groupId === gid && touched.has(`expenses:${e._id}`));
    if (groupTouched) continue;
    if (!sameValue(before.groups[gid], after.groups[gid])) f.errors.push(`settle-up plan changed for group ${gid} with no change to its expenses`);
  }

  return f;
}

/** Recompute balances from the snapshot's frozen data with the code as it is now. */
export function verifySnapshot(snapshot: Snapshot): Findings {
  const f: Findings = { errors: [], review: [], info: [] };
  const now = computeBalances(snapshot.raw);
  for (const uid of new Set([...Object.keys(snapshot.balances), ...Object.keys(now.balances)])) {
    if (!sameValue(snapshot.balances[uid], now.balances[uid])) f.errors.push(`current code computes different balances for user ${uid}`);
  }
  for (const gid of new Set([...Object.keys(snapshot.groups), ...Object.keys(now.groups)])) {
    if (!sameValue(snapshot.groups[gid], now.groups[gid])) f.errors.push(`current code computes a different settle-up plan for group ${gid}`);
  }
  f.info.push(`checked ${Object.keys(now.balances).length} user(s) and ${Object.keys(now.groups).length} group(s)`);
  return f;
}
