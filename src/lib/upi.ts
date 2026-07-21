/**
 * UPI deep-link helpers.
 *
 * A `upi://pay?...` URI is understood by every UPI app on Android (GPay,
 * PhonePe, Paytm, BHIM, …). Tapping it opens the app chooser; the same string
 * encodes into the QR that iOS / desktop users scan. No gateway, no keys.
 */

export interface UpiParams {
  vpa: string; // payee address, e.g. name@okhdfcbank
  name: string; // payee display name
  amount?: number;
  note?: string;
}

const VPA_RE = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

export function isValidVpa(vpa: string): boolean {
  return VPA_RE.test(vpa.trim());
}

export interface ScannedUpi {
  raw: string; // the exact scanned payload — preserved when paying
  vpa: string;
  name: string;
  amount?: number;
  note?: string;
  isMerchant: boolean; // has an `mc` (merchant category code)
}

/**
 * Parse a scanned UPI QR string (`upi://pay?pa=…&pn=…&am=…`). Returns null when
 * it isn't a valid UPI pay code. Keeps the raw payload so we can pay without
 * dropping merchant fields.
 */
export function parseUpiUri(raw: string): ScannedUpi | null {
  const s = raw.trim();
  if (!/^upi:\/\//i.test(s)) return null;
  const q = s.indexOf("?");
  if (q === -1) return null;
  const p = new URLSearchParams(s.slice(q + 1));
  const vpa = (p.get("pa") ?? "").trim();
  if (!isValidVpa(vpa)) return null;
  const name = (p.get("pn") ?? vpa).trim() || vpa;
  const am = Number(p.get("am"));
  const note = p.get("tn")?.trim() || undefined;
  return {
    raw: s,
    vpa,
    name,
    amount: Number.isFinite(am) && am > 0 ? am : undefined,
    note,
    isMerchant: Boolean(p.get("mc")),
  };
}

/**
 * Build a payable URI from a SCANNED QR by preserving its full payload — mc, tr,
 * sign, orgid, mode, purpose, … — and only injecting the amount + currency (and
 * a unique `tr` for merchant QRs that lack one). Reconstructing from just
 * pa/pn/am drops the merchant fields, which PSP apps flag as a tampered P2M
 * payload and reject with a bogus "limit exceeded". Minimal string surgery
 * keeps signed QRs byte-intact.
 */
export function payUriFromScan(raw: string, amount: number, tr?: string): string {
  let uri = raw.trim();
  const params = new URLSearchParams(uri.slice(uri.indexOf("?") + 1));
  const scannedAmt = Number(params.get("am")) || 0;
  const isMerchant = Boolean(params.get("mc"));

  const setParam = (key: string, val: string) => {
    const re = new RegExp(`([?&]${key}=)[^&]*`, "i");
    uri = re.test(uri) ? uri.replace(re, `$1${val}`) : `${uri}&${key}=${val}`;
  };

  // Only touch the amount when the user set/changed it — a signed dynamic QR's
  // amount stays exactly as scanned when used as-is.
  if (amount > 0 && Math.abs(amount - scannedAmt) > 0.001) setParam("am", amount.toFixed(2));
  if (!/[?&]cu=/i.test(uri)) setParam("cu", "INR");
  if (isMerchant && tr && !/[?&]tr=/i.test(uri)) setParam("tr", tr);

  return uri;
}

/** App-specific variant of {@link payUriFromScan} (GPay/PhonePe/Paytm schemes). */
export function payAppUriFromScan(app: { scheme: string }, raw: string, amount: number, tr?: string): string {
  return payUriFromScan(raw, amount, tr).replace(/^upi:\/\/pay/i, app.scheme);
}

export function buildUpiUri({ vpa, name, amount, note }: UpiParams): string {
  const params = new URLSearchParams();
  params.set("pa", vpa.trim());
  params.set("pn", name.trim());
  params.set("cu", "INR");
  if (amount && amount > 0) params.set("am", amount.toFixed(2));
  if (note) params.set("tn", note.slice(0, 80));
  // Keep `@` literal and use %20 for spaces — real UPI QRs do, and BHIM's
  // Android intent parser rejects a %40-encoded VPA as "address not valid".
  const qs = params.toString().replace(/\+/g, "%20").replace(/%40/g, "@");
  return `upi://pay?${qs}`;
}

/**
 * Preferred-app variants so we can offer one-tap buttons where supported.
 * BHIM was dropped: its only route is an `intent://…package=…` link, and its
 * parser rejects the address on many devices — the generic "Other UPI app"
 * link (which the system chooser routes to BHIM) covers it reliably.
 */
export const UPI_APPS = [
  { id: "gpay", label: "Google Pay", scheme: "tez://upi/pay", color: "#1a73e8" },
  { id: "phonepe", label: "PhonePe", scheme: "phonepe://pay", color: "#5f259f" },
  { id: "paytm", label: "Paytm", scheme: "paytmmp://pay", color: "#00baf2" },
] as const;

export function buildAppUri(app: { scheme: string; pkg?: string }, p: UpiParams): string {
  const upi = buildUpiUri(p);
  if (app.pkg) {
    // Android intent that opens a specific app using the standard upi:// scheme.
    const ssp = upi.replace(/^upi:\/\//, "");
    return `intent://${ssp}#Intent;scheme=upi;package=${app.pkg};end`;
  }
  return upi.replace(/^upi:\/\/pay/, app.scheme);
}

export function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent);
}
