import { NextResponse } from "next/server";

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
export const unauthorized = () => json({ error: "unauthorized" }, 401);
export const forbidden = () => json({ error: "forbidden" }, 403);
export const badRequest = (error = "bad-request") => json({ error }, 400);
export const serverError = () => json({ error: "server-error" }, 500);

/** A safe, bounded string — rejects objects (blocks NoSQL-operator injection). */
export function isStr(v: unknown): v is string {
  return typeof v === "string" && v.length > 0 && v.length <= 1024;
}

export function isNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

/** Logs a security-relevant event to the server logs (no PII). */
export function securityLog(event: string, meta: Record<string, unknown> = {}) {
  console.warn(`[security] ${event}`, JSON.stringify(meta));
}
