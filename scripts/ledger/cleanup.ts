/**
 * Post-split cleanup: remove the money data left in Tally's database.
 *
 *   npm run ledger:cleanup                                    # dry run: counts only
 *   npm run ledger:cleanup -- --confirm --backup <dump-path> [--unset-account-id]
 *
 * Only touches what src/lib/ledger-cleanup.ts allows. Snapshots the split ledger
 * before and after and exits non-zero if any balance moved.
 */
import { existsSync } from "node:fs";
import { MongoClient } from "mongodb";
import { buildSnapshot, compareSnapshots } from "../../src/lib/ledger-snapshot";
import { cleanupPlan, LEGACY_COLLECTION, LEGACY_USER_FIELDS, legacyUserFilter } from "../../src/lib/ledger-cleanup";
import { loadEnv, report, writeSnapshot } from "./io";
import { readLedger } from "./read";

const args = process.argv.slice(2);
const confirm = args.includes("--confirm");
const unsetAccountId = args.includes("--unset-account-id");
const backupAt = args.indexOf("--backup");
const backup = backupAt >= 0 ? args[backupAt + 1] : undefined;

async function main() {
  loadEnv();
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  const plan = cleanupPlan({ unsetAccountId });

  const client = await new MongoClient(uri).connect();
  try {
    const db = client.db("tally");
    const users = db.collection("users");
    const expenses = db.collection("expenses");
    const hasFinance = (await db.listCollections({ name: LEGACY_COLLECTION }).toArray()).length > 0;

    console.log("post-split cleanup");
    console.log(`  users with legacy money fields: ${await users.countDocuments(legacyUserFilter())} (${LEGACY_USER_FIELDS.join(", ")})`);
    console.log(`  "${LEGACY_COLLECTION}" collection: ${hasFinance ? `${await db.collection(LEGACY_COLLECTION).countDocuments()} docs` : "already gone"}`);
    console.log(`  expenses with accountId: ${await expenses.countDocuments({ accountId: { $exists: true } })}${unsetAccountId ? "" : " (kept; pass --unset-account-id to remove)"}`);

    if (!confirm) {
      console.log("\ndry run — nothing changed. Re-run with --confirm --backup <dump-path> to apply.");
      return;
    }
    if (!backup || !existsSync(backup)) throw new Error("--confirm needs --backup <path> pointing at an existing mongodump of this database");

    const before = buildSnapshot(await readLedger(db), "pre-cleanup");
    console.log(`\nsnapshot: ${writeSnapshot(before)}`);

    const unset = await users.updateMany(legacyUserFilter(), { $unset: plan.unsetUserFields });
    console.log(`  unset money fields on ${unset.modifiedCount} user(s)`);
    if (hasFinance) {
      await db.dropCollection(plan.dropCollection);
      console.log(`  dropped "${plan.dropCollection}"`);
    }
    if (plan.unsetExpenseAccountId) {
      const res = await expenses.updateMany({ accountId: { $exists: true } }, { $unset: { accountId: "" } });
      console.log(`  removed accountId from ${res.modifiedCount} expense(s)`);
    }

    const after = buildSnapshot(await readLedger(db), "post-cleanup");
    console.log(`snapshot: ${writeSnapshot(after)}`);
    process.exitCode = report("split ledger before → after cleanup", compareSnapshots(before, after));
  } finally {
    await client.close();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
