/**
 * UPI VPA validation. Tally no longer initiates payments (deeplinks are
 * unreliable/blocked from web and not uniform across Android/iOS) — it records
 * settlements and lets people copy a UPI ID to pay in their own UPI app. This
 * is all we still need.
 */
const VPA_RE = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

export function isValidVpa(vpa: string): boolean {
  return VPA_RE.test(vpa.trim());
}
