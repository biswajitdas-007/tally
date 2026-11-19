import type { Collection } from "mongodb";
import { verifyUser } from "@/lib/auth-server";
import { collections, knownUids, type ExpenseDoc, type GroupDoc, type UserDoc } from "@/lib/db";
import { notifyChange } from "@/lib/notify";
import { simplifiedPlan } from "@/lib/balances";
import type { Expense } from "@/lib/types";
import { sendSettlementEmail, type SettlementInfo } from "@/lib/settlement-email";
import { sendSettledEmail, type SettledInfo } from "@/lib/settled-email";
import { formatINR } from "@/lib/utils";
import { badRequest, forbidden, isNum, isStr, json, serverError, unauthorized } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SettleInput {
  id: string;
  from: string;
  to: string;
  amount: number;
  gid: string | null;
  note: string | null;
  socketId?: string;
}

function parseInput(b: Record<string, unknown> | null): SettleInput | null {
  if (!b || !isStr(b.id) || !isStr(b.from) || !isStr(b.to)) return null;
  if (!isNum(b.amount) || b.amount <= 0) return null;
  if (b.groupId != null && !isStr(b.groupId)) return null;
  return {
    id: b.id as string,
    from: b.from as string,
    to: b.to as string,
    amount: b.amount,
    gid: (b.groupId as string | null) ?? null,
    note: isStr(b.note) ? (b.note as string).slice(0, 200) : null,
    socketId: isStr(b.socketId) ? (b.socketId as string) : undefined,
  };
}

type Collections = Awaited<ReturnType<typeof collections>>;
interface Scope {
  memberUids: string[];
  group: GroupDoc | null;
}

/**
 * A group settlement is part of that group's ledger — visible to everyone in
 * it, recordable only by a member, and both sides must be in the group
 * (members who haven't joined yet count).
 */
async function groupScope(c: Collections, uid: string, s: SettleInput): Promise<Scope | null> {
  const group = await c.groups.findOne({ _id: s.gid! });
  if (!group?.memberUids.includes(uid)) return null;
  const inGroup = new Set(group.members.map((m) => m.id));
  return inGroup.has(s.from) && inGroup.has(s.to) ? { memberUids: group.memberUids, group } : null;
}

/**
 * Like direct expenses: only with someone already in your circle, so a
 * stranger can't be handed a balance (and an email) they never agreed to.
 */
async function directScope(c: Collections, uid: string, s: SettleInput): Promise<Scope | null> {
  const other = s.from === uid ? s.to : s.from;
  const found = await c.users.find({ _id: { $in: [s.from, s.to] } }, { projection: { _id: 1 } }).toArray();
  const registered = other !== uid && found.some((u) => u._id === other);
  if (registered && !(await knownUids(uid)).has(other)) return null;
  return { memberUids: [...new Set([uid, ...found.map((u) => u._id)])], group: null };
}

export async function POST(req: Request) {
  const user = await verifyUser(req);
  if (!user) return unauthorized();

  try {
    const s = parseInput((await req.json().catch(() => null)) as Record<string, unknown> | null);
    if (!s) return badRequest();
    // You may only record settlements that you're a party to.
    if (s.from !== user.uid && s.to !== user.uid) return forbidden();

    const c = await collections();
    const scope = s.gid ? await groupScope(c, user.uid, s) : await directScope(c, user.uid, s);
    if (!scope) return forbidden();
    const { memberUids, group } = scope;

    const doc: ExpenseDoc = {
      _id: s.id,
      groupId: s.gid,
      memberUids,
      description: s.note ?? "Settled up",
      amount: s.amount,
      category: "other",
      paidBy: s.from,
      splits: [{ personId: s.to, amount: s.amount }],
      date: new Date().toISOString(),
      isSettlement: true,
      createdBy: user.uid,
      createdAt: new Date().toISOString(),
      // A legacy `accountId` from an older cached client is ignored on purpose.
    };

    await c.expenses.updateOne({ _id: doc._id }, { $setOnInsert: doc }, { upsert: true });

    await notifyChange(
      memberUids,
      user.uid,
      { title: "Tally", body: `${user.name || "Someone"} recorded a settlement of ${formatINR(s.amount)}`, url: "/" },
      s.socketId,
    );

    // Email side-effects (best-effort; never blocks or fails the settlement).
    await dispatchEmails({ users: c.users, expenses: c.expenses, group, gid: s.gid, from: s.from, to: s.to, amount: s.amount, note: s.note, newDocId: doc._id, memberUids }).catch(() => {
      // swallow — the settlement itself already succeeded
    });

    return json({ ok: true });
  } catch {
    return serverError();
  }
}

interface DispatchArgs {
  users: Collection<UserDoc>;
  expenses: Collection<ExpenseDoc>;
  group: GroupDoc | null;
  gid: string | null;
  from: string;
  to: string;
  amount: number;
  note: string | null;
  newDocId: string;
  memberUids: string[];
}

/**
 * Emails the right people for a settlement:
 *  - if a group settlement just cleared the whole group → a summary to everyone
 *  - otherwise → a receipt to the two parties (payer + receiver)
 * A group that clears skips the per-party receipt so nobody is double-emailed.
 */
async function dispatchEmails(a: DispatchArgs): Promise<void> {
  const uids = [...new Set([...a.memberUids, a.from, a.to])];
  const userDocs = await a.users.find({ _id: { $in: uids } }).toArray();
  const byUid = new Map(userDocs.map((u) => [u._id, u]));
  const nameOf = (uid: string): string =>
    a.group?.members.find((m) => m.id === uid)?.name || byUid.get(uid)?.name || "Someone";
  const emailOf = (uid: string): string | undefined => byUid.get(uid)?.email;

  const sendReceipts = async () => {
    const info: SettlementInfo = {
      amount: a.amount,
      payerName: nameOf(a.from),
      receiverName: nameOf(a.to),
      groupName: a.group?.name ?? null,
      groupIcon: a.group?.icon ?? null,
      note: a.note,
    };
    const toEmail = emailOf(a.to);
    const fromEmail = emailOf(a.from);
    await Promise.allSettled([
      toEmail ? sendSettlementEmail(toEmail, nameOf(a.to), "received", info) : Promise.resolve(false),
      fromEmail ? sendSettlementEmail(fromEmail, nameOf(a.from), "sent", info) : Promise.resolve(false),
    ]);
  };

  if (!a.gid || !a.group) {
    await sendReceipts();
    return;
  }

  // Did *this* settlement transition the group from "owing" to "all clear"?
  const groupExpenses = await a.expenses.find({ groupId: a.gid }).toArray();
  const settledNow = simplifiedPlan(groupExpenses as unknown as Expense[]).length === 0;
  const before = groupExpenses.filter((e) => e._id !== a.newDocId);
  const settledBefore = simplifiedPlan(before as unknown as Expense[]).length === 0;

  if (!settledNow || settledBefore) {
    await sendReceipts();
    return;
  }

  // Group just cleared — summary to every member with an email.
  const nonSettle = groupExpenses.filter((e) => !e.isSettlement);
  const totalSpent = nonSettle.reduce((s, e) => s + e.amount, 0);
  const paidBy = new Map<string, number>();
  for (const e of nonSettle) paidBy.set(e.paidBy, (paidBy.get(e.paidBy) ?? 0) + e.amount);
  const contributions = a.memberUids
    .map((uid) => ({ name: nameOf(uid), paid: paidBy.get(uid) ?? 0 }))
    .sort((x, y) => y.paid - x.paid);

  const info: SettledInfo = {
    groupName: a.group.name,
    groupIcon: a.group.icon,
    totalSpent,
    expenseCount: nonSettle.length,
    contributions,
    closedByPayerName: nameOf(a.from),
    closedByReceiverName: nameOf(a.to),
    closedAmount: a.amount,
  };
  await Promise.allSettled(
    a.memberUids.map((uid) => {
      const em = emailOf(uid);
      return em ? sendSettledEmail(em, nameOf(uid), info) : Promise.resolve(false);
    }),
  );
}
