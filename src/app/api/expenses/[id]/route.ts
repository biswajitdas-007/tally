import { NextResponse } from "next/server";
import { verifyUser } from "@/lib/auth-server";
import { collections, type ExpenseDoc } from "@/lib/db";
import { notifyChange } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await verifyUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const patch = (await req.json().catch(() => null)) as (Partial<ExpenseDoc> & { socketId?: string }) | null;
  if (!patch) return NextResponse.json({ error: "bad-request" }, { status: 400 });

  const { expenses, groups, users } = await collections();
  const existing = await expenses.findOne({ _id: id });
  if (!existing || !existing.memberUids.includes(user.uid)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const merged = { ...existing, ...patch };
  const groupId = patch.groupId !== undefined ? patch.groupId : existing.groupId;

  let memberUids = existing.memberUids;
  if (patch.splits || patch.groupId !== undefined || patch.paidBy) {
    if (groupId) {
      const g = await groups.findOne({ _id: groupId });
      memberUids = g?.memberUids ?? existing.memberUids;
    } else {
      const ids = [...new Set([merged.paidBy, ...(merged.splits ?? []).map((s) => s.personId)])];
      const found = await users.find({ _id: { $in: ids } }, { projection: { _id: 1 } }).toArray();
      memberUids = [...new Set([user.uid, ...found.map((u) => u._id)])];
    }
  }

  await expenses.updateOne(
    { _id: id },
    {
      $set: {
        description: merged.description,
        amount: merged.amount,
        category: merged.category,
        paidBy: merged.paidBy,
        splits: merged.splits,
        date: merged.date,
        notes: merged.notes,
        recurring: merged.recurring,
        groupId,
        memberUids,
      },
    },
  );

  await notifyChange([...new Set([...existing.memberUids, ...memberUids])], user.uid, undefined, patch.socketId);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await verifyUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const { expenses } = await collections();
  const existing = await expenses.findOne({ _id: id });
  if (!existing || !existing.memberUids.includes(user.uid)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  await expenses.deleteOne({ _id: id });
  await notifyChange(existing.memberUids, user.uid);
  return NextResponse.json({ ok: true });
}
