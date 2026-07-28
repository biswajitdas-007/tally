import { collections } from "./db";
import { scopedDebts } from "./balances";
import type { Expense } from "./types";

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
  const open = scopedDebts(mine as unknown as Expense[], uid).filter((d) => Math.abs(d.total) > 0.01);
  if (!open.length) return null;
  return { people: open.length, amount: open.reduce((a, d) => a + Math.abs(d.total), 0) };
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
  const { users, groups, expenses, finance, invites } = await collections();

  const fin = await finance.deleteMany({ uid });
  await invites.deleteMany({ invitedBy: uid } as Record<string, unknown>);

  const solo = await expenses.deleteMany({ memberUids: [uid] });
  const shared = await expenses.updateMany({ memberUids: uid }, { $pull: { memberUids: uid } } as never);

  const left = await groups.updateMany(
    { memberUids: uid },
    { $pull: { memberUids: uid, members: { id: uid } } } as never,
  );
  const emptied = await groups.deleteMany({ memberUids: { $size: 0 } });

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
