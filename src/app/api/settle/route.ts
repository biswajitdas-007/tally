import { verifyUser } from "@/lib/auth-server";
import { collections, type ExpenseDoc } from "@/lib/db";
import { notifyChange } from "@/lib/notify";
import { formatINR } from "@/lib/utils";
import { badRequest, forbidden, isNum, isStr, json, serverError, unauthorized } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await verifyUser(req);
  if (!user) return unauthorized();

  try {
    const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (
      !b ||
      !isStr(b.id) ||
      !isStr(b.from) ||
      !isStr(b.to) ||
      !isNum(b.amount) ||
      b.amount <= 0 ||
      (b.groupId != null && !isStr(b.groupId))
    ) {
      return badRequest();
    }

    const from = b.from as string;
    const to = b.to as string;
    // You may only record settlements that you're a party to.
    if (from !== user.uid && to !== user.uid) return forbidden();

    const { expenses, users, groups } = await collections();
    const gid = (b.groupId as string | null) ?? null;

    let memberUids: string[];
    if (gid) {
      // A group settlement is part of that group's ledger — visible to everyone
      // in it, and only recordable by a member.
      const g = await groups.findOne({ _id: gid });
      if (!g || !g.memberUids.includes(user.uid)) return forbidden();
      memberUids = g.memberUids;
    } else {
      const found = await users.find({ _id: { $in: [from, to] } }, { projection: { _id: 1 } }).toArray();
      memberUids = [...new Set([user.uid, ...found.map((u) => u._id)])];
    }

    const doc: ExpenseDoc = {
      _id: b.id as string,
      groupId: (b.groupId as string | null) ?? null,
      memberUids,
      description: isStr(b.note) ? (b.note as string).slice(0, 200) : "Settled up",
      amount: b.amount,
      category: "other",
      paidBy: from,
      splits: [{ personId: to, amount: b.amount }],
      date: new Date().toISOString(),
      isSettlement: true,
      createdBy: user.uid,
      createdAt: new Date().toISOString(),
      accountId: isStr(b.accountId) ? (b.accountId as string).slice(0, 40) : undefined,
    };
    await expenses.insertOne(doc);

    await notifyChange(
      memberUids,
      user.uid,
      { title: "Tally", body: `${user.name || "Someone"} recorded a settlement of ${formatINR(b.amount)}`, url: "/" },
      isStr(b.socketId) ? (b.socketId as string) : undefined,
    );

    return json({ ok: true });
  } catch {
    return serverError();
  }
}
