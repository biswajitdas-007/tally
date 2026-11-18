import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function trim(n: number) {
  return (Math.round(n * 10) / 10).toString().replace(/\.0$/, "");
}

/** Indian rupee formatting with lakh/crore grouping. */
export function formatINR(
  value: number,
  opts: { decimals?: boolean; compact?: boolean; signed?: boolean } = {},
): string {
  const { decimals = true, compact = false, signed = false } = opts;
  const abs = Math.abs(roundMoney(value));
  let body: string;

  if (compact && abs >= 1000) {
    if (abs >= 1e7) body = trim(abs / 1e7) + "Cr";
    else if (abs >= 1e5) body = trim(abs / 1e5) + "L";
    else body = trim(abs / 1e3) + "K";
  } else {
    body = new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: decimals ? 2 : 0,
      maximumFractionDigits: decimals ? 2 : 0,
    }).format(abs);
  }

  const sign = value < -0.004 ? "−" : signed && value > 0.004 ? "+" : "";
  return `${sign}₹${body}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Deterministic avatar palette — warm, cohesive, works in both themes. */
export const AVATAR_COLORS = [
  "#1c6b52",
  "#4c6ef0",
  "#e2673b",
  "#b452c9",
  "#12a0a0",
  "#d99a1c",
  "#e0518f",
  "#5a7d3a",
  "#8257d6",
  "#c25b3e",
] as const;

export function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function formatDate(iso: string, withYear = false): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
  });
}

export function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1).toLocaleDateString("en-IN", { month: "short" });
}

export function uid(prefix = ""): string {
  // Cryptographically random — invite ids double as capability tokens, so we
  // never fall back to Math.random(). crypto is present in every runtime we
  // target (Node 20+, modern browsers); Web Crypto covers the rare gap.
  const c = typeof crypto !== "undefined" ? crypto : undefined;
  let rand: string;
  if (c?.randomUUID) {
    rand = c.randomUUID().replace(/-/g, "");
  } else if (c?.getRandomValues) {
    const bytes = c.getRandomValues(new Uint8Array(16));
    rand = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  } else {
    throw new Error("secure randomness unavailable");
  }
  return prefix + rand.slice(0, 20);
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Round a money value to standard currency precision (2 decimals). */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Sanitizes raw input string to ensure it's a valid monetary amount (max 2 decimal places). */
export function sanitizeMoneyInput(value: string, opts?: { allowNegative?: boolean }): string {
  const allowNegative = opts?.allowNegative ?? false;
  let cleaned = value.replace(allowNegative ? /[^0-9.-]/g : /[^0-9.]/g, "");

  if (allowNegative) cleaned = cleaned.replace(/(?!^)-/g, "");

  const parts = cleaned.split(".");
  if (parts.length > 1) {
    const whole = parts[0] ?? "";
    const fraction = parts.slice(1).join("");
    return `${whole}.${fraction.slice(0, 2)}`;
  }
  return cleaned;
}

/** Split a total into n near-equal integer paise-safe rupee shares. */
export function splitEqually(total: number, count: number): number[] {
  if (count <= 0) return [];
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / count);
  const remainder = cents - base * count;
  return Array.from({ length: count }, (_, i) => (base + (i < remainder ? 1 : 0)) / 100);
}

/**
 * Whole-number percentages for a list of amounts, guaranteed to total 100.
 *
 * Rounding each share on its own doesn't add up — 83.1, 10.2, 6.4 and 0.2 each
 * round to 83, 10, 6, 0, which is 99 and leaves a real ₹48 showing as nothing.
 * So the floors are taken first, every non-zero amount is guaranteed at least
 * 1%, and whatever is left over goes to the largest fractional parts (the
 * largest-remainder method). If the minimums overshoot, the excess is taken
 * back from the biggest shares, never pushing one below 1.
 */
export function percentShares(values: number[]): number[] {
  const total = values.reduce((a, v) => a + Math.max(0, v), 0);
  if (total <= 0) return values.map(() => 0);

  const exact = values.map((v) => (Math.max(0, v) / total) * 100);
  const out = exact.map((e) => Math.floor(e));
  const positives = values.map((v) => v > 0);

  // Nothing real should read as 0% — but only while there's room to give.
  if (positives.filter(Boolean).length <= 100) {
    out.forEach((v, i) => {
      if (positives[i] && v === 0) out[i] = 1;
    });
  }

  let diff = 100 - out.reduce((a, v) => a + v, 0);
  const order = exact
    .map((e, i) => ({ i, frac: e - Math.floor(e) }))
    .sort((a, b) => b.frac - a.frac);

  // Hand out what's left, largest fractional part first.
  for (let k = 0; diff > 0 && order.length; k = (k + 1) % order.length) {
    out[order[k].i]++;
    diff--;
  }
  // Or claw back, smallest fractional part first, without starving a row.
  for (let k = order.length - 1; diff < 0 && order.length; k = (k - 1 + order.length) % order.length) {
    const i = order[k].i;
    const floor = positives[i] ? 1 : 0;
    if (out[i] > floor) {
      out[i]--;
      diff++;
    }
  }
  return out;
}
