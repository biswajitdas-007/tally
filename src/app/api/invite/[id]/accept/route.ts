import { NextResponse } from "next/server";
import { verifyUser } from "@/lib/auth-server";
import { addContact, collections, upsertUser } from "@/lib/db";
import { notifyChange } from "@/lib/notify";
import type { Person } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface InviteDoc {
  _id: string;
  email: string;
  groupId: string | null;
  inviterUid: string;
  inviterName: string;
  status: string;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await verifyUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const { invites, groups, expenses, users } = await collections();
  const inv = (await invites.findOne({ _id: id })) as InviteDoc | null;
  if (!inv) return NextResponse.json({ error: "not-found" }, { status: 404 });

  if (inv.inviterUid === user.uid) return NextResponse.json({ ok: true, self: true });

  const meDoc = await upsertUser(users, user.uid, { name: user.name, email: user.email, photoURL: user.picture });

  // Make the two people friends on both sides, so a joined invitee shows up in
  // the inviter's friends list (and vice-versa) even for non-group invites.
  const inviterDoc = await users.findOne({ _id: inv.inviterUid });
  if (inviterDoc) {
    const mePerson: Person = {
      id: meDoc._id,
      name: meDoc.name,
      email: meDoc.email,
      photoURL: meDoc.photoURL,
      upiId: meDoc.upiId,
      avatarColor: meDoc.avatarColor ?? "#1c6b52",
    };
    const inviterPerson: Person = {
      id: inviterDoc._id,
      name: inviterDoc.name,
      email: inviterDoc.email,
      photoURL: inviterDoc.photoURL,
      upiId: inviterDoc.upiId,
      avatarColor: inviterDoc.avatarColor ?? "#1c6b52",
    };
    await addContact(users, inv.inviterUid, mePerson);
    await addContact(users, user.uid, inviterPerson);
  }

  let groupId: string | null = null;
  if (inv.groupId) {
    const g = await groups.findOne({ _id: inv.groupId });
    if (g) {
      groupId = g._id;
      if (!g.memberUids.includes(user.uid)) {
        const me: Person = {
          id: user.uid,
          name: user.name || inv.email,
          email: user.email,
          photoURL: user.picture,
          avatarColor: "#1c6b52",
          pending: false,
        };
        // Drop any pending placeholder for this email, add the real member.
        const members = [
          ...g.members.filter((m) => m.email?.toLowerCase() !== inv.email.toLowerCase() && m.id !== user.uid),
          me,
        ];
        await groups.updateOne(
          { _id: g._id },
          { $set: { members }, $addToSet: { memberUids: user.uid } },
        );
        // Backfill visibility of the group's existing expenses.
        await expenses.updateMany({ groupId: g._id }, { $addToSet: { memberUids: user.uid } });

        await notifyChange([...g.memberUids, user.uid], user.uid, {
          title: g.name,
          body: `${user.name || "Someone"} joined "${g.name}"`,
          url: `/groups/${g._id}`,
        });
      }
    }
  }

  await invites.updateOne(
    { _id: id },
    { $set: { status: "accepted", acceptedByUid: user.uid, acceptedAt: new Date() } },
  );

  return NextResponse.json({ ok: true, groupId });
}
