import { verifyUser } from "@/lib/auth-server";
import { collections } from "@/lib/db";
import { badRequest, isNum, isStr, json, serverError, unauthorized } from "@/lib/api-helpers";
import type { Account, AccountKind, Emergency, Liability, LiabilityKind } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACCOUNT_KINDS: AccountKind[] = ["bank", "cash", "wallet", "investment"];
const LIABILITY_KINDS: LiabilityKind[] = ["loan", "card", "emi"];

function cleanAccounts(v: unknown): Account[] {
  if (!Array.isArray(v)) return [];
  const out: Account[] = [];
  for (const raw of v) {
    const a = raw as Record<string, unknown>;
    if (a && isStr(a.id) && isStr(a.name) && ACCOUNT_KINDS.includes(a.kind as AccountKind) && isNum(a.balance)) {
      out.push({
        id: (a.id as string).slice(0, 40),
        name: (a.name as string).slice(0, 60),
        kind: a.kind as AccountKind,
        balance: a.balance as number,
      });
    }
    if (out.length >= 50) break;
  }
  return out;
}

function cleanLiabilities(v: unknown): Liability[] {
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
      if (isNum(l.emisPaid) && (l.emisPaid as number) >= 0) item.emisPaid = Math.round(l.emisPaid as number);
      if (l.autoDebit === true) item.autoDebit = true;
      if (isNum(l.dueDay)) item.dueDay = Math.min(Math.max(Math.round(l.dueDay as number), 1), 28);
      if (isStr(l.lastPaidMonth)) item.lastPaidMonth = (l.lastPaidMonth as string).slice(0, 7);
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

    const accounts = cleanAccounts(b.accounts);
    const liabilities = cleanLiabilities(b.liabilities);
    // Only touch `emergency` when it's part of this request, so a plain
    // account/liability save never wipes the emergency fund.
    const update: Record<string, unknown> = { accounts, liabilities };
    if ("emergency" in b) update.emergency = cleanEmergency(b.emergency);

    const { users } = await collections();
    await users.updateOne({ _id: user.uid }, { $set: update }, { upsert: true });
    return json({ ok: true });
  } catch {
    return serverError();
  }
}
