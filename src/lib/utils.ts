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
  const { decimals = false, compact = false, signed = false } = opts;
  const abs = Math.abs(value);
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

/** Just the grouped number, no symbol — for keypad-style displays. */
export function formatNumber(value: number, decimals = false): string {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(value);
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

/** Compact relative time (2h, 3d, Aug 4). */
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
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

/** Split a total into n near-equal integer paise-safe rupee shares. */
export function splitEqually(total: number, count: number): number[] {
  if (count <= 0) return [];
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / count);
  const remainder = cents - base * count;
  return Array.from({ length: count }, (_, i) => (base + (i < remainder ? 1 : 0)) / 100);
}
