/**
 * Recompute balances from a snapshot's frozen data with the code on the current
 * branch. Run it on every branch that touches split code — it needs no database.
 *
 *   npm run ledger:verify -- .ledger/snapshot-baseline-….json
 */
import { verifySnapshot } from "../../src/lib/ledger-snapshot";
import { readSnapshot, report } from "./io";

const file = process.argv[2];
if (!file) {
  console.error("usage: npm run ledger:verify -- <snapshot.json>");
  process.exit(1);
}
const snap = readSnapshot(file);
process.exit(report(`ledger verify: ${snap.label} (${snap.takenAt}) against current code`, verifySnapshot(snap)));
