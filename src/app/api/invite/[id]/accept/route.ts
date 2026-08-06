import { NextResponse } from "next/server";
import { verifyUser } from "@/lib/auth-server";
import { addContact, collections, upsertUser } from "@/lib/db";
import { notifyChange } from "@/lib/notify";
import { sendWelcomeEmail } from "@/lib/email";
import type { Person } from "@/lib/types";
import type { Collection } from "mongodb";
import type { UserDoc, GroupDoc, ExpenseDoc } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface InviteDoc {
  _id: string;
  email?: string;
  groupId: string | null;
  inviterUid: string;
  inviterName: string;
  status: string;
  isGeneric?: boolean;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await verifyUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const { invites, groups, expenses, users } = await collections();
  const inv = (await invites.findOne({ _id: id })) as InviteDoc | null;
  if (!inv) return NextResponse.json({ error: "not-found" }, { status: 404 });

  if (inv.inviterUid === user.uid) return NextResponse.json({ ok: true, self: true });

  const { doc: meDoc, isNew } = await upsertUser(users, user.uid, { name: user.name, email: user.email, photoURL: user.picture });

  if (isNew && user.email) {
    await sendWelcomeEmail(user.email, user.name || "there").catch(console.error);
  }

  await handleDirectFriendship(inv.inviterUid, user.uid, meDoc);

  const groupId = await handleGroupJoin(inv, user);

  if (!inv.isGeneric) {
    await invites.updateOne(
      { _id: id },
      { $set: { status: "accepted", acceptedByUid: user.uid, acceptedAt: new Date() } },
    );
  }

  return NextResponse.json({ ok: true, groupId });
}

async function handleDirectFriendship(
  inviterUid: string,
  userUid: string,
  meDoc: UserDoc
) {
  const { users } = await collections();
  const inviterDoc = await users.findOne({ _id: inviterUid });
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
    await addContact(users, inviterUid, mePerson);
    await addContact(users, userUid, inviterPerson);
  }
}

async function handleGroupJoin(
  inv: InviteDoc,
  user: { uid: string; name?: string; email?: string; picture?: string }
): Promise<string | null> {
  if (!inv.groupId) return null;
  
  const { groups, expenses, users } = await collections();
  const g = await groups.findOne({ _id: inv.groupId });
  if (!g || g.memberUids.includes(user.uid)) return null;

  const me: Person = {
    id: user.uid,
    name: user.name || inv.email || "Someone",
    email: user.email,
    photoURL: user.picture,
    avatarColor: "#1c6b52",
    pending: false,
  };
  
  const members = resolveGroupMembers(g.members, me, inv.email);
  
  await groups.updateOne(
    { _id: g._id },
    { $set: { members }, $addToSet: { memberUids: user.uid } },
  );
  await expenses.updateMany({ groupId: g._id }, { $addToSet: { memberUids: user.uid } });

  await notifyChange([...g.memberUids, user.uid], user.uid, {
    title: g.name,
    body: `${me.name} joined "${g.name}"`,
    url: `/groups/${g._id}`,
  });

  await makeGroupMembersMutualFriends(users, g.members, user.uid, me);

  return g._id;
}

async function makeGroupMembersMutualFriends(
  users: Collection<UserDoc>,
  existingMembers: Person[],
  newUid: string,
  newPerson: Person
) {
  const existingRealMembers = existingMembers.filter((m) => !m.pending && m.id !== newUid);
  for (const m of existingRealMembers) {
    await addContact(users, m.id, newPerson);
    await addContact(users, newUid, m);
  }
}

function resolveGroupMembers(existing: Person[], me: Person, invEmail?: string): Person[] {
  return [
    ...existing.filter((m) => {
      if (m.id === me.id) return false;
      if (invEmail && m.email?.toLowerCase() === invEmail.toLowerCase()) return false;
      return true;
    }),
    me,
  ];
}
