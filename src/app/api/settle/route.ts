import type { Collection } from "mongodb";
import { verifyUser } from "@/lib/auth-server";
import { collections, type ExpenseDoc, type GroupDoc, type UserDoc } from "@/lib/db";
import { notifyChange } from "@/lib/notify";
import { simplifiedPlan } from "@/lib/balances";
import type { Expense } from "@/lib/types";
import { sendSettlementEmail, type SettlementInfo } from "@/lib/settlement-email";
import { sendSettledEmail, type SettledInfo } from "@/lib/settled-email";
import { formatINR } from "@/lib/utils";
import { badRequest, forbidden, isNum, isStr, json, serverError, unauthorized } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await verifyUser(req);
  if (!user) return unauthorized();

  try {
    const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (
      !b ||
      !isStr(b.id) ||
      !isStr(b.from) ||
      !isStr(b.to) ||
      !isNum(b.amount) ||
      b.amount <= 0 ||
      (b.groupId != null && !isStr(b.groupId))
    ) {
      return badRequest();
    }

    const from = b.from as string;
    const to = b.to as string;
    // You may only record settlements that you're a party to.
    if (from !== user.uid && to !== user.uid) return forbidden();

    const { expenses, users, groups } = await collections();
    const gid = (b.groupId as string | null) ?? null;

    let memberUids: string[];
    let group: GroupDoc | null = null;
    if (gid) {
      // A group settlement is part of that group's ledger — visible to everyone
      // in it, and only recordable by a member.
      group = await groups.findOne({ _id: gid });
      if (!group || !group.memberUids.includes(user.uid)) return forbidden();
      memberUids = group.memberUids;
    } else {
      const found = await users.find({ _id: { $in: [from, to] } }, { projection: { _id: 1 } }).toArray();
      memberUids = [...new Set([user.uid, ...found.map((u) => u._id)])];
    }

    const doc: ExpenseDoc = {
      _id: b.id as string,
      groupId: (b.groupId as string | null) ?? null,
      memberUids,
      description: isStr(b.note) ? (b.note as string).slice(0, 200) : "Settled up",
      amount: b.amount,
      category: "other",
      paidBy: from,
      splits: [{ personId: to, amount: b.amount }],
      date: new Date().toISOString(),
      isSettlement: true,
      createdBy: user.uid,
      createdAt: new Date().toISOString(),
      accountId: isStr(b.accountId) ? (b.accountId as string).slice(0, 40) : undefined,
    };
    await expenses.insertOne(doc);

    await notifyChange(
      memberUids,
      user.uid,
      { title: "Tally", body: `${user.name || "Someone"} recorded a settlement of ${formatINR(b.amount)}`, url: "/" },
      isStr(b.socketId) ? (b.socketId as string) : undefined,
    );

    // Email side-effects (best-effort; never blocks or fails the settlement).
    try {
      await dispatchEmails({
        users,
        expenses,
        group,
        gid,
        from,
        to,
        amount: b.amount as number,
        note: isStr(b.note) ? (b.note as string).slice(0, 200) : null,
        newDocId: doc._id,
        memberUids,
      });
    } catch {
      // swallow — the settlement itself already succeeded
    }

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
