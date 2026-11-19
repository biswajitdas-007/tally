import { verifyUser } from "@/lib/auth-server";
import { repeatBaseline } from "@/lib/repeat";
import { collections, knownUids, type ExpenseDoc } from "@/lib/db";
import { notifyChange } from "@/lib/notify";
import { badRequest, forbidden, isNum, isStr, json, serverError, unauthorized } from "@/lib/api-helpers";
import type { CategoryKey, Split } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATS: CategoryKey[] = ["food", "rent", "travel", "shopping", "bills", "fun", "health", "other"];

function validSplits(v: unknown): v is Split[] {
  return (
    Array.isArray(v) &&
    v.length > 0 &&
    v.length <= 100 &&
    v.every((s) => s && typeof s === "object" && isStr((s as Split).personId) && isNum((s as Split).amount))
  );
}

type Patch = Record<string, unknown>;
type Collections = Awaited<ReturnType<typeof collections>>;

/** Text, amount and category fields; returns false if any provided value is invalid. */
function applyDetails(patch: Patch, set: Partial<ExpenseDoc>): boolean {
  if (patch.description !== undefined) {
    if (!isStr(patch.description)) return false;
    set.description = (patch.description as string).slice(0, 200);
  }
  if (patch.amount !== undefined) {
    if (!isNum(patch.amount) || (patch.amount as number) <= 0) return false;
    set.amount = patch.amount as number;
  }
  if (patch.category !== undefined) {
    set.category = CATS.includes(patch.category as CategoryKey) ? (patch.category as CategoryKey) : "other";
  }
  if (patch.date !== undefined && isStr(patch.date)) set.date = patch.date as string;
  if (patch.notes !== undefined) set.notes = isStr(patch.notes) ? (patch.notes as string).slice(0, 500) : undefined;
  return true;
}

/** Who paid and how it's split; returns false if any provided value is invalid. */
function applyParties(patch: Patch, set: Partial<ExpenseDoc>): boolean {
  if (patch.paidBy !== undefined) {
    if (!isStr(patch.paidBy)) return false;
    set.paidBy = patch.paidBy as string;
  }
  if (patch.splits !== undefined) {
    if (!validSplits(patch.splits)) return false;
    set.splits = patch.splits as Split[];
  }
  return true;
}

function applyRecurring(patch: Patch, set: Partial<ExpenseDoc>, existing: ExpenseDoc) {
  if (patch.recurring === undefined) return;
  set.recurring = patch.recurring === "monthly" || patch.recurring === "weekly" ? patch.recurring : "none";
  // Turning a repeat on (or changing how often) starts it from now, not
  // from the expense's date — otherwise an old expense replays every period since.
  if (set.recurring !== "none" && set.recurring !== existing.recurring) {
    set.recurringLast = repeatBaseline(set.recurring, new Date((set.date ?? existing.date) as string), new Date());
  }
}

/** The validated fields to update, or null if the patch is invalid. */
function buildSet(patch: Patch, existing: ExpenseDoc): Partial<ExpenseDoc> | null {
  const set: Partial<ExpenseDoc> = {};
  if (!applyDetails(patch, set) || !applyParties(patch, set)) return null;
  applyRecurring(patch, set, existing);
  return set;
}

/**
 * Who can see the expense after the edit, or null if the caller may not use
 * that group. Direct expenses include only people already in the caller's circle.
 */
async function resolveMemberUids(
  c: Collections,
  uid: string,
  groupId: string | null,
  set: Partial<ExpenseDoc>,
  existing: ExpenseDoc,
): Promise<string[] | null> {
  if (groupId) {
    const g = await c.groups.findOne({ _id: groupId });
    return g?.memberUids.includes(uid) ? g.memberUids : null;
  }
  const paidBy = (set.paidBy ?? existing.paidBy) as string;
  const splits = (set.splits ?? existing.splits) as Split[];
  const ids = [...new Set([paidBy, ...splits.map((s) => s.personId)])].filter(isStr);
  const known = await knownUids(uid);
  const found = await c.users.find({ _id: { $in: ids } }, { projection: { _id: 1 } }).toArray();
  return [...new Set([uid, ...found.map((u) => u._id).filter((id) => known.has(id))])];
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await verifyUser(req);
  if (!user) return unauthorized();
  const { id } = await params;

  try {
    const patch = (await req.json().catch(() => null)) as Patch | null;
    if (!patch) return badRequest();

    const c = await collections();
    const existing = await c.expenses.findOne({ _id: id });
    // Only the person who added it can edit it — group membership isn't enough.
    // Settlement records are immutable — undo them by deleting instead.
    if (!existing || existing.createdBy !== user.uid || existing.isSettlement) return forbidden();

    const set = buildSet(patch, existing);
    if (!set) return badRequest();
    if (patch.groupId !== undefined && !(patch.groupId === null || isStr(patch.groupId))) return badRequest();

    const groupId = patch.groupId !== undefined ? (patch.groupId as string | null) : existing.groupId;
    const membersChange = Boolean(patch.splits || patch.groupId !== undefined || patch.paidBy);
    const memberUids = membersChange ? await resolveMemberUids(c, user.uid, groupId, set, existing) : existing.memberUids;
    if (!memberUids) return forbidden();

    await c.expenses.updateOne({ _id: id }, { $set: { ...set, groupId, memberUids } });

    await notifyChange([...new Set([...existing.memberUids, ...memberUids])], user.uid, undefined, isStr(patch.socketId) ? (patch.socketId as string) : undefined);
    return json({ ok: true });
  } catch {
    return serverError();
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await verifyUser(req);
  if (!user) return unauthorized();
  const { id } = await params;

  try {
    const { expenses } = await collections();
    const existing = await expenses.findOne({ _id: id });
    // Only the creator can delete (incl. undoing a settlement they recorded).
    if (!existing || existing.createdBy !== user.uid) return forbidden();
    const targets = existing.memberUids;
    await expenses.deleteOne({ _id: id });
    await notifyChange(targets, user.uid);
    return json({ ok: true });
  } catch {
    return serverError();
  }
}
