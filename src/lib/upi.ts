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

export function buildUpiUri({ vpa, name, amount, note }: UpiParams): string {
  const params = new URLSearchParams();
  params.set("pa", vpa.trim());
  params.set("pn", name.trim());
  params.set("cu", "INR");
  if (amount && amount > 0) params.set("am", amount.toFixed(2));
  if (note) params.set("tn", note.slice(0, 80));
  return `upi://pay?${params.toString()}`;
}

/** Preferred-app variants so we can offer one-tap buttons where supported. */
export const UPI_APPS = [
  { id: "gpay", label: "Google Pay", scheme: "tez://upi/pay", color: "#1a73e8" },
  { id: "phonepe", label: "PhonePe", scheme: "phonepe://pay", color: "#5f259f" },
  { id: "paytm", label: "Paytm", scheme: "paytmmp://pay", color: "#00baf2" },
  { id: "bhim", label: "BHIM", scheme: "upi://pay", color: "#00888f" },
] as const;

export function buildAppUri(scheme: string, p: UpiParams): string {
  return buildUpiUri(p).replace(/^upi:\/\/pay/, scheme);
}

export function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent);
}
