import nodemailer, { type Transporter } from "nodemailer";

const user = process.env.GMAIL_USER;
const pass = process.env.GMAIL_APP_PASSWORD;

/** Emails send only when a Gmail account + app password are configured. */
export const isEmailConfigured = Boolean(user && pass);

let transporter: Transporter | null = null;
function getTransport(): Transporter | null {
  if (!isEmailConfigured) return null;
  transporter ??= nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
  return transporter;
}

/** Crude HTML→text fallback so every message ships a plain-text alternative. */
function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<\/(p|div|tr|h[1-6]|table)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/**
 * Best-effort transactional email via Gmail SMTP. Returns whether it sent.
 *
 * Ships a multipart/alternative (HTML + plain text) and the standard
 * transactional headers (Reply-To, List-Unsubscribe) — HTML-only mail with no
 * unsubscribe path is a strong spam signal, so this improves inbox placement.
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  const t = getTransport();
  if (!t || !opts.to) return false;
  try {
    await t.sendMail({
      from: `Tally <${user}>`,
      to: opts.to,
      replyTo: user,
      subject: opts.subject,
      html: opts.html,
      text: opts.text ?? htmlToText(opts.html),
      headers: {
        "List-Unsubscribe": `<mailto:${user}?subject=unsubscribe>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
    return true;
  } catch {
    return false;
  }
}
