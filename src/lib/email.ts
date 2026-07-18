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

/**
 * Best-effort transactional email via Gmail SMTP. Returns whether it sent.
 *
 * Every caller passes an explicit `text` so we ship a multipart/alternative
 * (HTML + hand-written plain text) plus the standard transactional headers
 * (Reply-To, List-Unsubscribe) — that combination improves inbox placement.
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
      text: opts.text,
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
