import { Resend } from "resend";
import { escapeHtml } from "./api-helpers";
import { emailButton, emailLabel, emailLayout, emailList, emailParagraph } from "./email-layout";

const resendApiKey = process.env.RESEND_API_KEY;
const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
const fromEmail = process.env.RESEND_FROM_EMAIL || "Tally <noreply@apptally.tech>";

/** Emails send only when a Resend API key is configured. */
export const isEmailConfigured = Boolean(resendApiKey);

let resendClient: Resend | null = null;
function getResend(): Resend | null {
  if (!isEmailConfigured) return null;
  resendClient ??= new Resend(resendApiKey);
  return resendClient;
}

/**
 * Best-effort transactional email via Resend. Returns whether it sent.
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  const client = getResend();
  if (!client || !opts.to) return false;
  
  try {
    const { error } = await client.emails.send({
      from: fromEmail,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text || "",
    });
    
    if (error) {
      console.error("Resend API error:", error);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error("Failed to send email via Resend:", err);
    return false;
  }
}

/**
 * Sends a welcome email to a newly signed up user.
 */
export async function sendWelcomeEmail(to: string, name: string): Promise<boolean> {
  const rawFirstName = (name ?? "").trim().split(/\s+/)[0] || "there";
  const firstName = escapeHtml(rawFirstName);
  
  const html = emailLayout({
    align: "center",
    badge: "👋",
    eyebrow: "Welcome aboard",
    title: `Hi ${firstName}, welcome to Tally!`,
    body:
      emailParagraph(
        "We're thrilled to have you on board. Tally is the easiest way to split expenses with friends, see who owes whom, and settle up in seconds.",
      ) +
      emailLabel("Quick start") +
      emailList([
        { icon: "🏖️", text: "Create a group for your next trip or flatmates" },
        { icon: "⚡", text: "Add your UPI ID so friends can pay you instantly" },
        { icon: "✅", text: "Add your first expense and settle up when you&#39;re ready" },
      ]) +
      emailButton(appUrl, "Open Tally"),
  });

  return sendEmail({
    to,
    subject: "Welcome to Tally 👋",
    html,
  });
}
