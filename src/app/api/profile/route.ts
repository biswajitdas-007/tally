import { NextResponse } from "next/server";
import { verifyUser } from "@/lib/auth-server";
import { collections, type UserDoc } from "@/lib/db";
import { notifyChange } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await verifyUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const b = (await req.json().catch(() => null)) as { name?: string; upiId?: string; socketId?: string } | null;
  if (!b) return NextResponse.json({ error: "bad-request" }, { status: 400 });

  const { users, groups } = await collections();
  const set: Partial<UserDoc> = { updatedAt: new Date() };
  if (typeof b.name === "string" && b.name.trim()) set.name = b.name.trim();
  if (typeof b.upiId === "string") set.upiId = b.upiId.trim();
  await users.updateOne({ _id: user.uid }, { $set: set }, { upsert: true });

  // Let people who share groups with me refresh my profile.
  const myGroups = await groups.find({ memberUids: user.uid }, { projection: { memberUids: 1 } }).toArray();
  const all = [...new Set(myGroups.flatMap((g) => g.memberUids))];
  await notifyChange(all, user.uid, undefined, b.socketId);

  return NextResponse.json({ ok: true });
}
