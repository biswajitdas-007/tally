import { scopedDebts, type ScopeAmount, type ScopeId } from "@/lib/balances";
import { isValidVpa } from "@/lib/upi";
import type { Expense, ID, Person } from "@/lib/types";

/** Below this, a balance counts as settled (rounding dust from splits). */
export const SETTLED_EPSILON = 0.01;

/** What the settle sheet was opened for. The UI store holds one of these. */
export interface SettleTarget {
  personId: ID;
  /** Net amount: positive ⇒ they owe you, negative ⇒ you owe them. */
  amount: number;
  /** A group (or null for direct) when opened on one ledger; undefined ⇒ everything with this person. */
  groupId?: ID | null;
}

/** A stable key for a scope; direct (non-group) money has no id of its own. */
export const scopeKey = (id: ScopeId): string => id ?? "__direct__";

/**
 * The ledgers the sheet offers to settle, from the live balances: opened on one
 * ledger, just that one; opened on a person, every ledger you share a balance
 * on. Live, so a settlement that lands while the sheet is open (the other side
 * marking it received) drops out instead of being recorded twice.
 */
export function settleScopes(target: SettleTarget, expenses: Expense[], myId: ID): ScopeAmount[] {
  const scopes = scopedDebts(expenses, myId).find((d) => d.personId === target.personId)?.scopes ?? [];
  return target.groupId === undefined ? scopes : scopes.filter((s) => s.scopeId === target.groupId);
}

export interface SettleSummary {
  /** The ticked scopes. */
  active: ScopeAmount[];
  /** Positive ⇒ they owe you, negative ⇒ you owe them. */
  net: number;
  /** True when the ticked ledgers net out to you paying them. */
  youPay: boolean;
  /** The money that changes hands, always positive. */
  amount: number;
  /** Nothing left to move (fully netted out, or nothing ticked). */
  settled: boolean;
}

/**
 * Totals what's ticked. Takes the *unticked* keys, so a ledger that turns up
 * while the sheet is open starts ticked, like everything else did.
 */
export function settleSummary(scopes: ScopeAmount[], unticked: ReadonlySet<string>): SettleSummary {
  const active = scopes.filter((s) => !unticked.has(scopeKey(s.scopeId)));
  const net = active.reduce((sum, s) => sum + s.amount, 0);
  const amount = Math.abs(net);
  return { active, net, youPay: net < -SETTLED_EPSILON, amount, settled: amount < SETTLED_EPSILON };
}

/**
 * One settlement per ticked ledger, each in its own direction, so every
 * ledger zeroes out on its own rather than being netted into one payment.
 */
export function settlementEntries(
  active: ScopeAmount[],
  myId: ID,
  personId: ID,
): { from: ID; to: ID; amount: number; groupId: ScopeId }[] {
  return active
    .filter((s) => Math.abs(s.amount) > SETTLED_EPSILON)
    .map((s) =>
      s.amount < 0
        ? { from: myId, to: personId, amount: -s.amount, groupId: s.scopeId }
        : { from: personId, to: myId, amount: s.amount, groupId: s.scopeId },
    );
}

/**
 * Names what the money is for on the payer's UPI confirmation screen: a single
 * group under its own name, anything else as a plain settle-up.
 */
export function upiNote(active: ScopeAmount[], groupName: (id: ID) => string | undefined): string {
  const only = active.length === 1 ? active[0].scopeId : null;
  const name = only ? groupName(only) : undefined;
  return name ? `Tally - ${name}` : "Tally settle-up";
}

/** Who hands over the money, who gets it, and where it can be sent. */
export function paymentParties<P extends Pick<Person, "name" | "upiId">>(
  youPay: boolean,
  me: P | null,
  them: P,
): { payer: P | null; payee: P | null; payeeUpi: string | null } {
  const payee = youPay ? them : me;
  const upi = payee?.upiId;
  return { payer: youPay ? me : them, payee, payeeUpi: upi && isValidVpa(upi) ? upi : null };
}

/** The toast once it's recorded. */
export function settledMessage(summary: Pick<SettleSummary, "settled" | "youPay">, name: string): string {
  return summary.youPay || summary.settled ? `Settled up with ${name}` : "Payment recorded";
}

/** The primary button's label. */
export function confirmLabel(summary: Pick<SettleSummary, "settled" | "youPay">, amountText: string): string {
  if (summary.settled) return "Mark settled";
  return summary.youPay ? `I've paid ${amountText}` : `Mark ${amountText} received`;
}

/** The nudge you send someone who owes you. */
export function reminderText(firstName: string, amountText: string, myUpi?: string | null): string {
  const pay = myUpi ? ` Pay to ${myUpi}` : "";
  return `Hi ${firstName}, you owe me ${amountText} on Tally.${pay}`;
}

/** A person's first name, for the short labels around the sheet. */
export const firstName = (name: string | undefined, fallback = "them"): string => name?.trim().split(/\s+/)[0] || fallback;
