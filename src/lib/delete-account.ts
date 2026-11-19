import { getDb } from "./mongodb";
import { collections } from "./db";
import { scopedDebts, type PersonDebt } from "./balances";
import type { Expense } from "./types";

/**
 * Whether anything is still open with this person in any ledger. Checked per
 * ledger, not on the net total: owing ₹500 in one group and being owed ₹500 in
 * another nets to zero, but both groups still show a debt.
 */
export function isOpen(debt: PersonDebt): boolean {
  return debt.scopes.some((s) => Math.abs(s.amount) > 0.01);
}

export interface OpenBalance {
  people: number;
  amount: number;
}

/**
 * Money still outstanding between this user and anyone else. Deleting while a
 * ledger is open would strand the other side with a balance against someone
 * who no longer exists, so this gates the delete.
 */
export async function outstandingBalances(uid: string): Promise<OpenBalance | null> {
  const { expenses } = await collections();
  const mine = await expenses.find({ memberUids: uid }).toArray();
  const open = scopedDebts(mine as unknown as Expense[], uid).filter(isOpen);
  if (!open.length) return null;
  const amount = open.reduce((a, d) => a + d.scopes.reduce((x, s) => x + Math.abs(s.amount), 0), 0);
  return { people: open.length, amount };
}

export interface PurgeResult {
  finance: number;
  soloExpenses: number;
  sharedExpenses: number;
  groupsLeft: number;
  groupsDeleted: number;
}

/**
 * Remove everything belonging to a user.
 *
 * Shared history is preserved for the people they shared it with: an expense
 * or group with other members survives with this user stripped out. Anything
 * that was only ever theirs is deleted outright.
 */
export async function purgeAccount(uid: string): Promise<PurgeResult> {
  const { users, groups, expenses, invites } = await collections();

  // Money entries from before money tracking moved to Money Ledger. The whole
  // collection is dropped in the post-split cleanup; until then a deleted
  // account's leftovers go with it.
  const legacyFinance = (await getDb()).collection<{ uid: string }>("finance");
  const fin = await legacyFinance.deleteMany({ uid });
  await invites.deleteMany({ inviterUid: uid });
  // Nobody else can edit or stop a repeat this user created, so stop it here.
  await expenses.updateMany({ createdBy: uid, recurring: { $in: ["monthly", "weekly"] } }, { $set: { recurring: "none" } });

  const solo = await expenses.deleteMany({ memberUids: [uid] });
  const shared = await expenses.updateMany({ memberUids: uid }, { $pull: { memberUids: uid } } as never);

  const left = await groups.updateMany(
    { memberUids: uid },
    { $pull: { memberUids: uid, members: { id: uid } } } as never,
  );
  const emptied = await groups.deleteMany({ memberUids: { $size: 0 } });
  // Groups they created pass to a remaining member, so someone can still manage them.
  await groups.updateMany({ createdBy: uid, "memberUids.0": { $exists: true } }, [
    { $set: { createdBy: { $arrayElemAt: ["$memberUids", 0] } } },
  ]);

  await users.updateMany({ "contacts.id": uid }, { $pull: { contacts: { id: uid } } } as never);
  await users.deleteOne({ _id: uid });

  return {
    finance: fin.deletedCount ?? 0,
    soloExpenses: solo.deletedCount ?? 0,
    sharedExpenses: shared.modifiedCount ?? 0,
    groupsLeft: left.modifiedCount ?? 0,
    groupsDeleted: emptied.deletedCount ?? 0,
  };
}
