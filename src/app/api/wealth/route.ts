import { verifyUser } from "@/lib/auth-server";
import { collections } from "@/lib/db";
import { badRequest, isNum, isStr, json, serverError, unauthorized } from "@/lib/api-helpers";
import { anchorLastPaidMonth, initialLastPaidMonth, normalizeLiability } from "@/lib/liabilities";
import type { Account, AccountKind, Emergency, InvestmentType, Liability, LiabilityKind } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACCOUNT_KINDS: AccountKind[] = ["bank", "cash", "wallet", "investment"];
const INVESTMENT_TYPES: InvestmentType[] = ["sip", "mutualFund", "stocks", "fd", "bonds", "ppf", "gold", "crypto", "other"];
const LIABILITY_KINDS: LiabilityKind[] = ["loan", "card", "emi"];

function cleanAccounts(v: unknown): Account[] {
  if (!Array.isArray(v)) return [];
  const out: Account[] = [];
  for (const raw of v) {
    const a = raw as Record<string, unknown>;
    if (a && isStr(a.id) && isStr(a.name) && ACCOUNT_KINDS.includes(a.kind as AccountKind) && isNum(a.balance)) {
      const item: Account = {
        id: (a.id as string).slice(0, 40),
        name: (a.name as string).slice(0, 60),
        kind: a.kind as AccountKind,
        balance: a.balance as number,
      };
      if (isStr(a.reconciledAt)) item.reconciledAt = (a.reconciledAt as string).slice(0, 30);
      if (item.kind === "investment") {
        if (INVESTMENT_TYPES.includes(a.investmentType as InvestmentType)) item.investmentType = a.investmentType as InvestmentType;
        if (isNum(a.invested) && (a.invested as number) >= 0) item.invested = a.invested as number;
      }
      out.push(item);
    }
    if (out.length >= 50) break;
  }
  return out;
}

function cleanLiabilities(v: unknown, now = new Date()): Liability[] {
  if (!Array.isArray(v)) return [];
  const out: Liability[] = [];
  for (const raw of v) {
    const l = raw as Record<string, unknown>;
    if (l && isStr(l.id) && isStr(l.name) && LIABILITY_KINDS.includes(l.kind as LiabilityKind) && isNum(l.outstanding)) {
      const item: Liability = {
        id: (l.id as string).slice(0, 40),
        name: (l.name as string).slice(0, 60),
        kind: l.kind as LiabilityKind,
        outstanding: l.outstanding as number,
      };
      if (isNum(l.emi) && (l.emi as number) > 0) item.emi = l.emi as number;
      if (isNum(l.rate) && (l.rate as number) >= 0) item.rate = l.rate as number;
      if (isStr(l.lender)) item.lender = (l.lender as string).slice(0, 60);
      if (isNum(l.termMonths) && (l.termMonths as number) > 0) item.termMonths = Math.round(l.termMonths as number);
      if (item.kind === "card" && isNum(l.limit) && (l.limit as number) > 0) item.limit = l.limit as number;
      if (isNum(l.emisPaid) && (l.emisPaid as number) >= 0) {
        item.emisPaid = item.termMonths
          ? Math.min(Math.round(l.emisPaid as number), item.termMonths)
          : Math.round(l.emisPaid as number);
      }
      if (isNum(l.dueDay)) item.dueDay = Math.min(Math.max(Math.round(l.dueDay as number), 1), 28);
      const scheduleReady =
        item.outstanding > 0 &&
        Boolean(item.emi && item.termMonths) &&
        (item.emisPaid ?? 0) < (item.termMonths ?? 0);
      if (scheduleReady) {
        if (l.autoDebit === true) item.autoDebit = true;
        const paidMonth = isStr(l.lastPaidMonth) ? (l.lastPaidMonth as string).slice(0, 7) : "";
        if (/^\d{4}-(0[1-9]|1[0-2])$/.test(paidMonth)) {
          item.lastPaidMonth = paidMonth;
        } else {
          // Existing manual rows get a stable prior-month anchor so the current
          // EMI remains explicit-confirmation-only across month boundaries.
          // Auto-debit rows instead skip an ambiguous due date that has passed.
          // New schedules created by the UI always send a valid cursor.
          item.lastPaidMonth = item.autoDebit
            ? initialLastPaidMonth(item.dueDay, now)
            : anchorLastPaidMonth(item, now);
        }
        const reminder = isStr(l.lastEmiReminder) ? (l.lastEmiReminder as string).slice(0, 64) : "";
        if (/^[^:]{1,40}:\d{4}-(0[1-9]|1[0-2]):(upcoming|due)$/.test(reminder)) {
          item.lastEmiReminder = reminder;
        }
      }
      out.push(item);
    }
    if (out.length >= 50) break;
  }
  return out;
}

function cleanEmergency(v: unknown): Emergency | null {
  if (!v || typeof v !== "object") return null;
  const e = v as Record<string, unknown>;
  if (!isNum(e.target) || (e.target as number) <= 0) return null;
  const out: Emergency = { target: e.target as number };
  if (isStr(e.accountId)) out.accountId = (e.accountId as string).slice(0, 40);
  return out;
}

export async function POST(req: Request) {
  const user = await verifyUser(req);
  if (!user) return unauthorized();

  try {
    const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!b) return badRequest();

    // Each private array is independent. Only touch keys that were sent so an
    // account or emergency edit cannot replay a stale pre-cron liability list.
    const update: Record<string, unknown> = {};
    if ("accounts" in b) update.accounts = cleanAccounts(b.accounts);
    if ("emergency" in b) update.emergency = cleanEmergency(b.emergency);

    const { users } = await collections();
    let filter: Record<string, unknown> = { _id: user.uid };
    let upsert = true;

    if ("liabilities" in b) {
      const now = new Date();
      const incoming = cleanLiabilities(b.liabilities, now);
      const doc = await users.findOne({ _id: user.uid }, { projection: { liabilities: 1 } });
      const rawCurrent = doc?.liabilities;
      const current = cleanLiabilities((rawCurrent ?? []).map(normalizeLiability), now);
      const expectedProvided = Array.isArray(b.expectedLiabilities);
      const expected = expectedProvided ? cleanLiabilities(b.expectedLiabilities, now) : null;

      if (expectedProvided) {
        if (JSON.stringify(expected) !== JSON.stringify(current)) {
          return json({ error: "liabilities-conflict" }, 409);
        }
        update.liabilities = incoming;
        filter = {
          _id: user.uid,
          liabilities: rawCurrent === undefined ? { $exists: false } : rawCurrent,
        };
        upsert = !doc;
      } else if (JSON.stringify(incoming) !== JSON.stringify(current)) {
        // A pre-CAS client may safely save accounts when its liability copy is
        // unchanged, but it must reload before replacing private schedule data.
        return json({ error: "liabilities-reload-required" }, 409);
      }
    }

    if (Object.keys(update).length === 0) return badRequest();
    const result = await users.updateOne(filter, { $set: update }, { upsert });
    if (!upsert && result.matchedCount !== 1) return json({ error: "liabilities-conflict" }, 409);
    return json({ ok: true });
  } catch {
    return serverError();
  }
}
