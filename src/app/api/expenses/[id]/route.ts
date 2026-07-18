import { verifyUser } from "@/lib/auth-server";
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

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await verifyUser(req);
  if (!user) return unauthorized();
  const { id } = await params;

  try {
    const patch = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!patch) return badRequest();

    const { expenses, groups, users } = await collections();
    const existing = await expenses.findOne({ _id: id });
    // Only the person who added it can edit it — group membership isn't enough.
    if (!existing || existing.createdBy !== user.uid) return forbidden();
    // Settlement records are immutable — undo them by deleting instead.
    if (existing.isSettlement) return forbidden();

    // Validate only the fields actually provided.
    const set: Partial<ExpenseDoc> = {};
    if (patch.description !== undefined) {
      if (!isStr(patch.description)) return badRequest();
      set.description = (patch.description as string).slice(0, 200);
    }
    if (patch.amount !== undefined) {
      if (!isNum(patch.amount) || (patch.amount as number) <= 0) return badRequest();
      set.amount = patch.amount as number;
    }
    if (patch.category !== undefined) {
      set.category = CATS.includes(patch.category as CategoryKey) ? (patch.category as CategoryKey) : "other";
    }
    if (patch.paidBy !== undefined) {
      if (!isStr(patch.paidBy)) return badRequest();
      set.paidBy = patch.paidBy as string;
    }
    if (patch.splits !== undefined) {
      if (!validSplits(patch.splits)) return badRequest();
      set.splits = patch.splits as Split[];
    }
    if (patch.date !== undefined && isStr(patch.date)) set.date = patch.date as string;
    if (patch.notes !== undefined) set.notes = isStr(patch.notes) ? (patch.notes as string).slice(0, 500) : undefined;
    if (patch.recurring !== undefined) {
      set.recurring = patch.recurring === "monthly" || patch.recurring === "weekly" ? patch.recurring : "none";
    }
    if (patch.groupId !== undefined && !(patch.groupId === null || isStr(patch.groupId))) return badRequest();

    const groupId = patch.groupId !== undefined ? (patch.groupId as string | null) : existing.groupId;

    let memberUids = existing.memberUids;
    if (patch.splits || patch.groupId !== undefined || patch.paidBy) {
      if (groupId) {
        const g = await groups.findOne({ _id: groupId });
        if (!g || !g.memberUids.includes(user.uid)) return forbidden();
        memberUids = g.memberUids;
      } else {
        const paidBy = (set.paidBy ?? existing.paidBy) as string;
        const splits = (set.splits ?? existing.splits) as Split[];
        const ids = [...new Set([paidBy, ...splits.map((s) => s.personId)])].filter(isStr);
        const known = await knownUids(user.uid);
        const found = await users.find({ _id: { $in: ids } }, { projection: { _id: 1 } }).toArray();
        memberUids = [...new Set([user.uid, ...found.map((u) => u._id).filter((uid) => known.has(uid))])];
      }
    }

    await expenses.updateOne({ _id: id }, { $set: { ...set, groupId, memberUids } });

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
