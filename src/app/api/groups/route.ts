import { verifyUser } from "@/lib/auth-server";
import { collections, knownUids, realUids, type GroupDoc } from "@/lib/db";
import { notifyChange } from "@/lib/notify";
import type { Person } from "@/lib/types";
import { badRequest, isStr, json, serverError, unauthorized } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await verifyUser(req);
  if (!user) return unauthorized();

  try {
    const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!b || !isStr(b.id) || !isStr(b.name) || !Array.isArray(b.members)) return badRequest();

    // Keep only well-formed member entries.
    const rawMembers = (b.members as unknown[]).filter(
      (m): m is Person => !!m && typeof m === "object" && isStr((m as Person).id),
    );

    const { groups } = await collections();

    // Make sure the creator is a member.
    const members: Person[] = rawMembers.some((m) => m.id === user.uid)
      ? rawMembers
      : [{ id: user.uid, name: user.name || "You", email: user.email, photoURL: user.picture, isYou: true }, ...rawMembers];

    // Only real users you already share a group with become visible members — you
    // can't silently inject a group into a stranger's account. Email invitees stay
    // as pending placeholders and join via the invite flow.
    const known = await knownUids(user.uid);
    const memberUids = [...new Set([user.uid, ...realUids(members).filter((id) => known.has(id))])];

    const doc: GroupDoc = {
      _id: b.id as string,
      name: (b.name as string).slice(0, 80),
      icon: isStr(b.icon) ? (b.icon as string).slice(0, 16) : "👥",
      color: isStr(b.color) ? (b.color as string).slice(0, 40) : "var(--cat-rent)",
      members,
      memberUids,
      createdBy: user.uid,
      createdAt: new Date().toISOString(),
    };
    await groups.insertOne(doc);

    await notifyChange(
      memberUids,
      user.uid,
      { title: doc.name, body: `${user.name || "Someone"} added you to "${doc.name}"`, url: `/groups/${doc._id}` },
      isStr(b.socketId) ? (b.socketId as string) : undefined,
    );

    return json({ ok: true });
  } catch {
    return serverError();
  }
}
