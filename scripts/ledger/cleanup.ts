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

type Db = ReturnType<MongoClient["db"]>;
type Plan = ReturnType<typeof cleanupPlan>;

async function printCounts(db: Db, hasFinance: boolean) {
  const financeDocs = hasFinance ? `${await db.collection(LEGACY_COLLECTION).countDocuments()} docs` : "already gone";
  const withAccount = await db.collection("expenses").countDocuments({ accountId: { $exists: true } });
  console.log("post-split cleanup");
  console.log(`  users with legacy money fields: ${await db.collection("users").countDocuments(legacyUserFilter())} (${LEGACY_USER_FIELDS.join(", ")})`);
  console.log(`  "${LEGACY_COLLECTION}" collection: ${financeDocs}`);
  console.log(`  expenses with accountId: ${withAccount}${unsetAccountId ? "" : " (kept; pass --unset-account-id to remove)"}`);
}

/** The only writes this script makes, all from the allowlisted plan. */
async function applyPlan(db: Db, plan: Plan, hasFinance: boolean) {
  const unset = await db.collection("users").updateMany(legacyUserFilter(), { $unset: plan.unsetUserFields });
  console.log(`  unset money fields on ${unset.modifiedCount} user(s)`);
  if (hasFinance) {
    await db.dropCollection(plan.dropCollection);
    console.log(`  dropped "${plan.dropCollection}"`);
  }
  if (plan.unsetExpenseAccountId) {
    const res = await db.collection("expenses").updateMany({ accountId: { $exists: true } }, { $unset: { accountId: "" } });
    console.log(`  removed accountId from ${res.modifiedCount} expense(s)`);
  }
}

async function run(db: Db) {
  const hasFinance = (await db.listCollections({ name: LEGACY_COLLECTION }).toArray()).length > 0;
  await printCounts(db, hasFinance);

  if (!confirm) {
    console.log("\ndry run — nothing changed. Re-run with --confirm --backup <dump-path> to apply.");
    return;
  }
  if (!backup || !existsSync(backup)) throw new Error("--confirm needs --backup <path> pointing at an existing mongodump of this database");

  const before = buildSnapshot(await readLedger(db), "pre-cleanup");
  console.log(`\nsnapshot: ${writeSnapshot(before)}`);
  await applyPlan(db, cleanupPlan({ unsetAccountId }), hasFinance);
  const after = buildSnapshot(await readLedger(db), "post-cleanup");
  console.log(`snapshot: ${writeSnapshot(after)}`);
  process.exitCode = report("split ledger before → after cleanup", compareSnapshots(before, after));
}

async function main() {
  loadEnv();
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  const client = await new MongoClient(uri).connect();
  try {
    await run(client.db("tally"));
  } finally {
    await client.close();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
