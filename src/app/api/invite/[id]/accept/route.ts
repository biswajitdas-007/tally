import { NextResponse } from "next/server";
import { getDb, isDbConfigured } from "@/lib/mongodb";
import { verifyUid } from "@/lib/auth-server";
import type { Expense, Group, Person } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ME = "me";

interface StateDoc {
  _id: string;
  people: Person[];
  groups: Group[];
  expenses: Expense[];
}
interface InviteDoc {
  _id: string;
  email: string;
  groupId: string | null;
  inviterUid: string;
  inviterName: string;
  status: string;
  acceptedByUid?: string;
  acceptedAt?: Date;
}

/**
 * Accept an invite: build a snapshot of the inviter's group + expenses, remapped
 * to the invitee's perspective (inviter's "me" becomes a real person; the
 * invitee's placeholder becomes "me"), and mark the inviter's side as accepted.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const uid = await verifyUid(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isDbConfigured) return NextResponse.json({ error: "db-not-configured" }, { status: 503 });

  const { id } = await params;
  const profile = (await req.json().catch(() => ({}))) as { name?: string; email?: string; photoURL?: string };

  const db = await getDb();
  const invites = db.collection<InviteDoc>("invites");
  const states = db.collection<StateDoc>("states");

  const inv = await invites.findOne({ _id: id });
  if (!inv) return NextResponse.json({ error: "not-found" }, { status: 404 });

  // You can't accept your own invite (e.g. testing with one account).
  if (inv.inviterUid === uid) {
    return NextResponse.json({ ok: true, self: true });
  }

  let group: Group | null = null;
  let expenses: Expense[] = [];
  let people: Person[] = [];

  if (inv.groupId) {
    const inviterState = await states.findOne({ _id: inv.inviterUid });
    const srcGroup = inviterState?.groups?.find((g) => g.id === inv.groupId) ?? null;
    if (inviterState && srcGroup) {
      const inviterMe = inviterState.people?.find((p) => p.id === ME);
      const inviterPersonId = `p_${inv.inviterUid.slice(0, 18)}`;
      const placeholder = inviterState.people?.find(
        (p) => p.email && inv.email && p.email.toLowerCase() === inv.email.toLowerCase(),
      );

      const map = new Map<string, string>();
      map.set(ME, inviterPersonId);
      if (placeholder) map.set(placeholder.id, ME);
      const rid = (x: string) => map.get(x) ?? x;

      group = { ...srcGroup, memberIds: Array.from(new Set((srcGroup.memberIds ?? []).map(rid))) };
      expenses = (inviterState.expenses ?? [])
        .filter((e) => e.groupId === srcGroup.id)
        .map((e) => ({
          ...e,
          paidBy: rid(e.paidBy),
          createdBy: rid(e.createdBy),
          splits: (e.splits ?? []).map((s) => ({ ...s, personId: rid(s.personId) })),
        }));

      const inviterPerson: Person = inviterMe
        ? {
            id: inviterPersonId,
            name: inviterMe.name,
            email: inviterMe.email,
            photoURL: inviterMe.photoURL,
            upiId: inviterMe.upiId,
            avatarColor: inviterMe.avatarColor ?? "#4c6ef0",
          }
        : { id: inviterPersonId, name: inv.inviterName, avatarColor: "#4c6ef0" };

      const memberSet = new Set(group.memberIds);
      const others = (inviterState.people ?? [])
        .filter((p) => p.id !== ME && (!placeholder || p.id !== placeholder.id) && memberSet.has(p.id))
        .map((p) => ({ ...p }));
      people = [inviterPerson, ...others];

      // Reflect the real invitee back on the inviter's copy.
      if (placeholder) {
        const updatedPeople = inviterState.people.map((p) =>
          p.id === placeholder.id
            ? { ...p, name: profile.name || p.name, email: profile.email || p.email, photoURL: profile.photoURL }
            : p,
        );
        await states.updateOne({ _id: inv.inviterUid }, { $set: { people: updatedPeople } }).catch(() => {});
      }
    }
  }

  await invites.updateOne({ _id: id }, { $set: { status: "accepted", acceptedByUid: uid, acceptedAt: new Date() } });

  return NextResponse.json({ ok: true, group, expenses, people });
}
