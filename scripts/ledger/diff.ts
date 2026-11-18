/**
 * Compare two snapshots: split data must not vanish or change unexpectedly, and
 * balances must match for every user whose expenses didn't change.
 *
 *   npm run ledger:diff -- .ledger/snapshot-baseline-….json .ledger/snapshot-after-….json
 */
import { compareSnapshots } from "../../src/lib/ledger-snapshot";
import { readSnapshot, report } from "./io";

const [a, b] = process.argv.slice(2);
if (!a || !b) {
  console.error("usage: npm run ledger:diff -- <before.json> <after.json>");
  process.exit(1);
}
const before = readSnapshot(a);
const after = readSnapshot(b);
process.exit(report(`ledger diff: ${before.label} (${before.takenAt}) → ${after.label} (${after.takenAt})`, compareSnapshots(before, after)));
