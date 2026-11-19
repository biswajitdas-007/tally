import type { Db } from "mongodb";
import { USER_SPLIT_FIELDS, type RawLedger } from "../../src/lib/ledger-snapshot";

/** Read all split data. Users are projected to split fields only — money fields are never read. */
export async function readLedger(db: Db): Promise<RawLedger> {
  type D = RawLedger["users"][number];
  const userProjection = Object.fromEntries(USER_SPLIT_FIELDS.map((f) => [f, 1]));
  return {
    users: await db.collection<D>("users").find({}, { projection: userProjection }).toArray(),
    groups: await db.collection<D>("groups").find({}).toArray(),
    expenses: await db.collection<D>("expenses").find({}).toArray(),
    invites: await db.collection<D>("invites").find({}).toArray(),
  };
}
