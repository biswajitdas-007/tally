import { NextResponse } from "next/server";
import { verifyUser } from "@/lib/auth-server";
import { collections, type GroupDoc } from "@/lib/db";
import { notifyChange } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await verifyUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const patch = (await req.json().catch(() => null)) as
    | (Partial<Pick<GroupDoc, "name" | "icon" | "color">> & { socketId?: string })
    | null;
  if (!patch) return NextResponse.json({ error: "bad-request" }, { status: 400 });

  const { groups } = await collections();
  const g = await groups.findOne({ _id: id });
  if (!g || !g.memberUids.includes(user.uid)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const set: Partial<GroupDoc> = {};
  if (patch.name) set.name = patch.name;
  if (patch.icon) set.icon = patch.icon;
  if (patch.color) set.color = patch.color;
  await groups.updateOne({ _id: id }, { $set: set });

  await notifyChange(g.memberUids, user.uid, undefined, patch.socketId);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await verifyUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const { groups, expenses } = await collections();
  const g = await groups.findOne({ _id: id });
  if (!g || !g.memberUids.includes(user.uid)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  await expenses.deleteMany({ groupId: id });
  await groups.deleteOne({ _id: id });

  await notifyChange(g.memberUids, user.uid, {
    title: g.name,
    body: `${user.name || "Someone"} deleted "${g.name}"`,
    url: "/groups",
  });
  return NextResponse.json({ ok: true });
}
