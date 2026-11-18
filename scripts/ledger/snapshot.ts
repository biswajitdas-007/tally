/**
 * Take a read-only snapshot of all split data plus the balances computed from it.
 *
 *   npm run ledger:snapshot -- <label>
 *
 * Reads MONGODB_URI from the environment or .env.local. Never writes to the
 * database. Output goes to .ledger/ (git-ignored; contains personal data).
 */
import { MongoClient } from "mongodb";
import { buildSnapshot, USER_SPLIT_FIELDS, type RawLedger } from "../../src/lib/ledger-snapshot";
import { loadEnv, writeSnapshot } from "./io";

async function main() {
  const label = (process.argv[2] ?? "").replace(/[^a-z0-9-]/gi, "");
  if (!label) throw new Error("usage: npm run ledger:snapshot -- <label>   (e.g. baseline, pre-cutover)");

  loadEnv();
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");

  const client = await new MongoClient(uri, { readPreference: "secondaryPreferred" }).connect();
  try {
    const db = client.db("tally");
    const userProjection = Object.fromEntries(USER_SPLIT_FIELDS.map((f) => [f, 1]));
    type D = RawLedger["users"][number];
    const raw: RawLedger = {
      users: await db.collection<D>("users").find({}, { projection: userProjection }).toArray(),
      groups: await db.collection<D>("groups").find({}).toArray(),
      expenses: await db.collection<D>("expenses").find({}).toArray(),
      invites: await db.collection<D>("invites").find({}).toArray(),
    };
    const snap = buildSnapshot(raw, label);
    const file = writeSnapshot(snap);
    console.log(`snapshot "${label}" written to ${file}`);
    console.log(`  ${JSON.stringify(snap.counts)}`);
    console.log(`  balances for ${Object.keys(snap.balances).length} user(s), ${Object.keys(snap.groups).length} group(s)`);
  } finally {
    await client.close();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
