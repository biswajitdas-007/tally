import { verifyUser } from "@/lib/auth-server";
import { collections, type GroupDoc } from "@/lib/db";
import { notifyChange } from "@/lib/notify";
import { badRequest, forbidden, isStr, json, serverError, unauthorized } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await verifyUser(req);
  if (!user) return unauthorized();
  const { id } = await params;

  try {
    const patch = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!patch) return badRequest();

    const { groups } = await collections();
    const g = await groups.findOne({ _id: id });
    if (!g || !g.memberUids.includes(user.uid)) return forbidden();

    const set: Partial<GroupDoc> = {};
    if (isStr(patch.name)) set.name = (patch.name as string).slice(0, 80);
    if (isStr(patch.icon)) set.icon = (patch.icon as string).slice(0, 16);
    if (isStr(patch.color)) set.color = (patch.color as string).slice(0, 40);
    if (Object.keys(set).length) await groups.updateOne({ _id: id }, { $set: set });

    await notifyChange(g.memberUids, user.uid, undefined, isStr(patch.socketId) ? (patch.socketId as string) : undefined);
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
    const { groups, expenses } = await collections();
    const g = await groups.findOne({ _id: id });
    if (!g || !g.memberUids.includes(user.uid)) return forbidden();
    // Deleting wipes the group and everyone's shared expenses — creator only.
    if (g.createdBy !== user.uid) return forbidden();

    await expenses.deleteMany({ groupId: id });
    await groups.deleteOne({ _id: id });

    await notifyChange(g.memberUids, user.uid, {
      title: g.name,
      body: `${user.name || "Someone"} deleted "${g.name}"`,
      url: "/groups",
    });
    return json({ ok: true });
  } catch {
    return serverError();
  }
}
