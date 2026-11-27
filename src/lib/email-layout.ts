import { escapeHtml } from "./api-helpers";

/**
 * Shared building blocks for Tally's transactional emails, so every email
 * carries the same brand and the markup lives in one place.
 *
 * Email clients ignore stylesheets and web fonts, so everything here is inline
 * styles over a system font stack. All text colours meet WCAG AA on their
 * backgrounds.
 *
 * Unless a parameter says otherwise, HTML arguments must already be escaped by
 * the caller (use `escapeHtml` for any user-provided text).
 */

export const EMAIL_COLORS = {
  page: "#f2f1f7",
  card: "#ffffff",
  border: "#eceaf4",
  ink: "#17123a",
  body: "#4a4668",
  muted: "#5a5677",
  subtle: "#6e6a88",
  brand: "#e3165b",
  brandText: "#b80f48",
  positive: "#0b7a50",
  negative: "#b80f48",
  heroFrom: "#17123a",
  heroTo: "#2d2163",
  heroMuted: "#c9c5e6",
  chip: "rgba(255,255,255,.14)",
  badgeBg: "#eeeafe",
  badgeText: "#4127d6",
} as const;

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const c = EMAIL_COLORS;

export interface EmailLayoutOptions {
  /** Small uppercase line in the hero. */
  eyebrow: string;
  /** Main hero line: a sentence (`md`) or a big amount (`lg`). */
  title: string;
  titleSize?: "md" | "lg";
  /** Line under the title. */
  subtitle?: string;
  /** Emoji or initial shown in a circle above the eyebrow. */
  badge?: string;
  /** Pill under the title, e.g. the group name. */
  chip?: string;
  align?: "left" | "center";
  /** The card's body. */
  body: string;
  /** Extra paragraph under the card, above the standard footer. */
  footer?: string;
}

/** A full branded email: wordmark, ink hero, white card, standard footer. */
export function emailLayout(o: EmailLayoutOptions): string {
  const align = o.align ?? "left";
  const titleSize = o.titleSize === "lg" ? "30px" : "23px";
  const badge = o.badge
    ? `<div style="width:54px;height:54px;margin:0 auto 14px;border-radius:50%;background:${c.chip};text-align:center;line-height:54px;font-size:21px;font-weight:700;">${o.badge}</div>`
    : "";
  const subtitle = o.subtitle
    ? `<div style="font-size:14px;color:${c.heroMuted};margin-top:4px;">${o.subtitle}</div>`
    : "";
  const chip = o.chip
    ? `<div style="display:inline-block;margin-top:15px;background:${c.chip};border-radius:999px;padding:7px 15px;font-size:13px;font-weight:600;">${o.chip}</div>`
    : "";
  const footer = o.footer
    ? `<p style="text-align:center;font-size:12px;color:${c.subtle};margin:18px 0 0;line-height:1.6;">${o.footer}</p>`
    : "";

  return `
<div style="margin:0;padding:0;background:${c.page};font-family:${FONT};">
  <div style="max-width:520px;margin:0 auto;padding:28px 18px;">
    <div style="text-align:center;padding-bottom:20px;">
      <span style="font-size:22px;font-weight:800;letter-spacing:-.05em;color:${c.ink};">tally</span>
    </div>
    <div style="background:${c.card};border-radius:24px;overflow:hidden;box-shadow:0 10px 30px -14px rgba(23,18,58,.22);">
      <div style="background:${c.heroFrom};background-image:linear-gradient(152deg,${c.heroFrom} 0%,${c.heroTo} 100%);padding:28px 26px;color:#ffffff;text-align:${align};">
        ${badge}
        <div style="font-size:12.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${c.heroMuted};">${o.eyebrow}</div>
        <div style="font-size:${titleSize};font-weight:800;letter-spacing:-.02em;margin-top:8px;line-height:1.25;">${o.title}</div>
        ${subtitle}
        ${chip}
      </div>
      <div style="padding:24px 26px;">${o.body}</div>
    </div>
    ${footer}
    <p style="text-align:center;font-size:12px;color:${c.subtle};margin:18px 0 0;">Tally · split expenses, settle over UPI<br>This is a system generated email, please do not reply.</p>
  </div>
</div>`.trim();
}

/** Body paragraph. */
export function emailParagraph(html: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:${c.body};">${html}</p>`;
}

/** Small muted note, e.g. under a table or button. */
export function emailNote(html: string, align: "left" | "center" = "left"): string {
  return `<p style="margin:16px 0 0;font-size:12.5px;line-height:1.5;color:${c.subtle};text-align:${align};">${html}</p>`;
}

/** Bold inline emphasis (names, group names). */
export function emailStrong(html: string): string {
  return `<b style="color:${c.ink};">${html}</b>`;
}

/** Small uppercase section label. */
export function emailLabel(html: string): string {
  return `<div style="margin:22px 0 10px;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${c.subtle};">${html}</div>`;
}

/**
 * Primary call-to-action. `href` is a raw URL from our own config or ids; it is
 * attribute-escaped here. Anything but an http(s) URL renders as plain text
 * rather than a link, so a misconfigured app URL can't produce a broken or
 * unsafe href.
 */
export function emailButton(href: string, label: string): string {
  if (!/^https?:\/\//i.test(href)) {
    return `<p style="text-align:center;margin:24px 0 4px;font-size:15px;font-weight:700;color:${c.ink};">${label}</p>`;
  }
  return `<div style="text-align:center;margin:24px 0 4px;"><a href="${escapeHtml(href)}" style="display:inline-block;background:${c.brand};color:#ffffff;padding:14px 32px;border-radius:999px;text-decoration:none;font-weight:700;font-size:15px;">${label}</a></div>`;
}

export interface EmailRow {
  label: string;
  value: string;
  /** Value colour; defaults to ink. */
  color?: string;
}

/** Label/value rows separated by hairlines (receipts, summaries). */
export function emailRows(rows: EmailRow[]): string {
  const cell = (extra: string) => `padding:12px 0;border-top:1px solid ${c.border};font-size:14px;${extra}`;
  const body = rows
    .map(
      (r) =>
        `<tr><td style="${cell(`color:${c.muted};`)}">${r.label}</td>` +
        `<td style="${cell(`font-weight:700;color:${r.color ?? c.ink};text-align:right;`)}">${r.value}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" style="border-collapse:collapse;margin-top:6px;">${body}</table>`;
}

/** A short list of points, each with an emoji or icon character. */
export function emailList(items: { icon: string; text: string }[]): string {
  const body = items
    .map(
      (i) =>
        `<tr><td style="padding:7px 0;font-size:14.5px;color:${c.body};"><span style="display:inline-block;width:30px;">${i.icon}</span> ${i.text}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" style="border-collapse:collapse;">${body}</table>`;
}

/** People with an initial badge, e.g. "who paid what". `name` is raw text (escaped here); `value` is HTML. */
export function emailPersonRows(rows: { name: string; value: string }[]): string {
  const body = rows
    .map((r) => {
      const initial = escapeHtml((r.name || "?").trim().charAt(0).toUpperCase() || "?");
      return `<tr>
        <td style="padding:9px 0;font-size:14px;color:${c.body};"><span style="display:inline-block;width:24px;height:24px;line-height:24px;text-align:center;border-radius:50%;background:${c.badgeBg};color:${c.badgeText};font-size:11px;font-weight:700;vertical-align:middle;margin-right:9px;">${initial}</span>${escapeHtml(r.name)}</td>
        <td style="padding:9px 0;font-size:14px;font-weight:700;color:${c.ink};text-align:right;">${r.value}</td>
      </tr>`;
    })
    .join("");
  return `<table role="presentation" width="100%" style="border-collapse:collapse;">${body}</table>`;
}
