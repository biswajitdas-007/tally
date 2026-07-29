/**
 * UPI helpers.
 *
 * Tally never moves money. It can't: routing person-to-person payments would
 * make it a payment aggregator under RBI's rules, which needs an entity, a
 * licence and escrow. And a browser can't hand off to a UPI app either —
 * `upi://` links are blocked from web pages on Android and don't resolve at all
 * on iOS.
 *
 * What does work everywhere is a QR. Every UPI app can scan one, either off
 * another person's screen or out of your own photo library, and a QR carrying
 * an amount means nobody retypes a VPA or a figure. So we build the URI and
 * draw it; the payment happens in the payer's own app, and Tally just records
 * that it did.
 */
const VPA_RE = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

export function isValidVpa(vpa: string): boolean {
  return VPA_RE.test(vpa.trim());
}

export interface UpiPayment {
  /** Payee's VPA — who gets the money. */
  vpa: string;
  /** Payee's name, shown by the UPI app so the payer can check who they're paying. */
  name?: string;
  /** Pre-filled amount in rupees. Omitted when it isn't a positive number. */
  amount?: number;
  /** Short reference the payer sees on the confirmation screen. */
  note?: string;
}

/** NPCI caps both the payee name and the note at 50 characters. */
const FIELD_MAX = 50;

/** `&`, `=` and `#` would end the parameter early; `%` breaks the escaping. */
const encode = (v: string) => encodeURIComponent(v).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

/**
 * Builds the `upi://pay` URI that goes inside a QR, per NPCI's parameters.
 * Returns null when the VPA isn't valid — there is nothing useful to draw
 * without one, and a QR that resolves to a bad address is worse than no QR.
 */
export function upiPayUri({ vpa, name, amount, note }: UpiPayment): string | null {
  const pa = vpa.trim();
  if (!isValidVpa(pa)) return null;

  // Built by hand rather than with URLSearchParams, which encodes a space as
  // "+" — correct for form bodies, but not every UPI app decodes it that way.
  //
  // The VPA goes in verbatim. isValidVpa has already restricted it to
  // characters that are legal in a query value, and "@" in particular is left
  // bare because that is how every UPI QR in the wild writes it — percent-
  // encoding it is technically correct and a gamble on the reader.
  const parts = [`pa=${pa}`];
  const pn = name?.trim().slice(0, FIELD_MAX);
  if (pn) parts.push(`pn=${encode(pn)}`);
  if (typeof amount === "number" && Number.isFinite(amount) && amount > 0) parts.push(`am=${amount.toFixed(2)}`);
  parts.push("cu=INR");
  const tn = note?.trim().slice(0, FIELD_MAX);
  if (tn) parts.push(`tn=${encode(tn)}`);

  return `upi://pay?${parts.join("&")}`;
}
