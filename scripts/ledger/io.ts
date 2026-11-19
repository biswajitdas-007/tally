import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Findings, Snapshot } from "../../src/lib/ledger-snapshot";

/** Snapshots contain personal data — they live in a git-ignored folder. */
export const LEDGER_DIR = path.resolve(process.cwd(), ".ledger");

export function loadEnv(): void {
  for (const file of [".env.local", ".env"]) {
    if (existsSync(file)) process.loadEnvFile(file);
  }
}

export function readSnapshot(file: string): Snapshot {
  const snap = JSON.parse(readFileSync(file, "utf8")) as Snapshot;
  if (snap.version !== 1) throw new Error(`${file}: unsupported snapshot version ${String(snap.version)}`);
  return snap;
}

export function writeSnapshot(snap: Snapshot): string {
  mkdirSync(LEDGER_DIR, { recursive: true, mode: 0o700 });
  const stamp = snap.takenAt.replace(/[:.]/g, "-");
  const file = path.join(LEDGER_DIR, `snapshot-${snap.label}-${stamp}.json`);
  writeFileSync(file, JSON.stringify(snap), { mode: 0o600 });
  return file;
}

/** Print findings and return the process exit code (1 when there are errors). */
export function report(title: string, f: Findings): number {
  console.log(`\n${title}`);
  for (const line of f.info) console.log(`  info    ${line}`);
  for (const line of f.review) console.log(`  REVIEW  ${line}`);
  for (const line of f.errors) console.log(`  ERROR   ${line}`);
  if (!f.errors.length && !f.review.length) console.log("  ✓ no differences");
  else if (!f.errors.length) console.log("  ✓ no balance errors — confirm the REVIEW items were real user edits");
  else console.log(`  ✗ ${f.errors.length} error(s)`);
  return f.errors.length ? 1 : 0;
}
