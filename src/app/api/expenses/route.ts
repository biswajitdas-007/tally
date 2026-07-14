import { NextResponse } from "next/server";
import { verifyUser } from "@/lib/auth-server";
import { collections, type ExpenseDoc } from "@/lib/db";
import { notifyChange } from "@/lib/notify";
import { formatINR } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await verifyUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const b = (await req.json().catch(() => null)) as
    | (Partial<ExpenseDoc> & { id: string; socketId?: string })
    | null;
  if (!b?.id || !b.description || !b.amount || !b.paidBy || !b.splits) {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }

  const { expenses, groups, users } = await collections();

  let memberUids: string[];
  let groupName: string | null = null;
  if (b.groupId) {
    const g = await groups.findOne({ _id: b.groupId });
    if (!g || !g.memberUids.includes(user.uid)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    memberUids = g.memberUids;
    groupName = g.name;
  } else {
    const ids = [...new Set([b.paidBy, ...b.splits.map((s) => s.personId)])];
    const found = await users.find({ _id: { $in: ids } }, { projection: { _id: 1 } }).toArray();
    memberUids = [...new Set([user.uid, ...found.map((u) => u._id)])];
  }

  const doc: ExpenseDoc = {
    _id: b.id,
    groupId: b.groupId ?? null,
    memberUids,
    description: b.description,
    amount: b.amount,
    category: b.category ?? "other",
    paidBy: b.paidBy,
    splits: b.splits,
    date: b.date ?? new Date().toISOString(),
    notes: b.notes,
    recurring: b.recurring ?? "none",
    isSettlement: b.isSettlement ?? false,
    createdBy: user.uid,
    createdAt: new Date().toISOString(),
  };
  await expenses.insertOne(doc);

  await notifyChange(
    memberUids,
    user.uid,
    {
      title: groupName ?? "Tally",
      body: `${user.name || "Someone"} added ${b.description} · ${formatINR(b.amount)}`,
      url: b.groupId ? `/groups/${b.groupId}` : "/",
    },
    b.socketId,
  );

  return NextResponse.json({ ok: true });
}
