import { NextResponse } from "next/server";
import { verifyUser } from "@/lib/auth-server";
import { collections, realUids, type GroupDoc } from "@/lib/db";
import { notifyChange } from "@/lib/notify";
import type { Person } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await verifyUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const b = (await req.json().catch(() => null)) as
    | { id: string; name: string; icon: string; color: string; members: Person[]; socketId?: string }
    | null;
  if (!b?.id || !b.name || !Array.isArray(b.members)) {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }

  const { groups } = await collections();

  // Make sure the creator is a member.
  const members = b.members.some((m) => m.id === user.uid)
    ? b.members
    : [{ id: user.uid, name: user.name || "You", email: user.email, photoURL: user.picture, isYou: true }, ...b.members];

  const memberUids = [...new Set([user.uid, ...realUids(members)])];

  const doc: GroupDoc = {
    _id: b.id,
    name: b.name,
    icon: b.icon || "👥",
    color: b.color || "var(--cat-rent)",
    members,
    memberUids,
    createdBy: user.uid,
    createdAt: new Date().toISOString(),
  };
  await groups.insertOne(doc);

  await notifyChange(
    memberUids,
    user.uid,
    { title: b.name, body: `${user.name || "Someone"} added you to "${b.name}"`, url: `/groups/${b.id}` },
    b.socketId,
  );

  return NextResponse.json({ ok: true });
}
