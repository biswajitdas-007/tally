import { verifyUser } from "@/lib/auth-server";
import { collections, knownUids, type ExpenseDoc } from "@/lib/db";
import { notifyChange } from "@/lib/notify";
import { overspendPush } from "@/lib/budget-alerts";
import { formatINR } from "@/lib/utils";
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

export async function POST(req: Request) {
  const user = await verifyUser(req);
  if (!user) return unauthorized();

  try {
    const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (
      !b ||
      !isStr(b.id) ||
      !isStr(b.description) ||
      !isNum(b.amount) ||
      b.amount <= 0 ||
      !isStr(b.paidBy) ||
      !validSplits(b.splits) ||
      (b.groupId != null && !isStr(b.groupId))
    ) {
      return badRequest();
    }

    const splits = b.splits as Split[];
    const { expenses, groups, users } = await collections();

    let memberUids: string[];
    let groupName: string | null = null;
    if (b.groupId) {
      const g = await groups.findOne({ _id: b.groupId as string });
      if (!g || !g.memberUids.includes(user.uid)) return forbidden();
      memberUids = g.memberUids;
      groupName = g.name;
    } else {
      const ids = [...new Set([b.paidBy as string, ...splits.map((s) => s.personId)])].filter(isStr);
      const known = await knownUids(user.uid);
      const found = await users.find({ _id: { $in: ids } }, { projection: { _id: 1 } }).toArray();
      // Only people you already share a group with — prevents injecting into strangers.
      memberUids = [...new Set([user.uid, ...found.map((u) => u._id).filter((id) => known.has(id))])];
    }

    const doc: ExpenseDoc = {
      _id: b.id as string,
      groupId: (b.groupId as string | null) ?? null,
      memberUids,
      description: (b.description as string).slice(0, 200),
      amount: b.amount,
      category: CATS.includes(b.category as CategoryKey) ? (b.category as CategoryKey) : "other",
      paidBy: b.paidBy as string,
      splits,
      date: isStr(b.date) ? (b.date as string) : new Date().toISOString(),
      notes: isStr(b.notes) ? (b.notes as string).slice(0, 500) : undefined,
      recurring: b.recurring === "monthly" || b.recurring === "weekly" ? b.recurring : "none",
      isSettlement: false,
      createdBy: user.uid,
      createdAt: new Date().toISOString(),
      // Only the payer's own account is attached (it's their private cash source).
      accountId: isStr(b.accountId) && b.paidBy === user.uid ? (b.accountId as string).slice(0, 40) : undefined,
    };
    await expenses.insertOne(doc);

    await notifyChange(
      memberUids,
      user.uid,
      {
        title: groupName ?? "Tally",
        body: `${user.name || "Someone"} added ${(b.description as string).slice(0, 60)} · ${formatINR(b.amount)}`,
        url: b.groupId ? `/groups/${b.groupId}` : "/",
      },
      isStr(b.socketId) ? (b.socketId as string) : undefined,
    );

    try {
      await overspendPush(
        memberUids,
        (uid) => splits.filter((s) => s.personId === uid).reduce((a, s) => a + s.amount, 0),
        doc.date,
      );
    } catch {
      /* alerts are best-effort */
    }

    return json({ ok: true });
  } catch {
    return serverError();
  }
}
