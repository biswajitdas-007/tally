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
    | { id: string; from: string; to: string; amount: number; groupId?: string | null; note?: string; socketId?: string }
    | null;
  if (!b?.id || !b.from || !b.to || !b.amount) {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }

  const { expenses, users } = await collections();
  const found = await users.find({ _id: { $in: [b.from, b.to] } }, { projection: { _id: 1 } }).toArray();
  const memberUids = [...new Set([user.uid, ...found.map((u) => u._id)])];

  const doc: ExpenseDoc = {
    _id: b.id,
    groupId: b.groupId ?? null,
    memberUids,
    description: b.note || "Settled up",
    amount: b.amount,
    category: "other",
    paidBy: b.from,
    splits: [{ personId: b.to, amount: b.amount }],
    date: new Date().toISOString(),
    isSettlement: true,
    createdBy: user.uid,
    createdAt: new Date().toISOString(),
  };
  await expenses.insertOne(doc);

  await notifyChange(
    memberUids,
    user.uid,
    { title: "Tally", body: `${user.name || "Someone"} recorded a settlement of ${formatINR(b.amount)}`, url: "/" },
    b.socketId,
  );

  return NextResponse.json({ ok: true });
}
