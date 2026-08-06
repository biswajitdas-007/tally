import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
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
  const firstName = name.split(" ")[0] || "there";
  
  const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px 20px; background-color: #f7f9fc;">
  <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 24px; padding: 40px; box-shadow: 0 4px 24px rgba(0,0,0,0.04);">
    <h1 style="margin: 0 0 16px; font-size: 24px; color: #111827;">Welcome to Tally 👋</h1>
    <p style="margin: 0 0 24px; font-size: 16px; color: #4b5563; line-height: 1.6;">
      Hi ${firstName},<br><br>
      Thanks for joining Tally! We're thrilled to have you on board.
      Tally makes it incredibly easy to split expenses with friends, track your personal finances, and settle up in seconds.
    </p>
    <div style="background: #f3f4f6; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 12px; font-size: 14px; color: #111827; text-transform: uppercase; letter-spacing: 0.05em;">Quick Start Guide</h3>
      <ul style="margin: 0; padding: 0 0 0 20px; color: #4b5563; font-size: 15px; line-height: 1.6;">
        <li style="margin-bottom: 8px;">Create a group for your next trip or flatmates.</li>
        <li style="margin-bottom: 8px;">Add your UPI ID in your account settings so friends can pay you back instantly.</li>
        <li>Switch to "Money Mode" to track your personal income and budgets!</li>
      </ul>
    </div>
    <a href="https://tally.com" style="display: inline-block; background-color: #10b981; color: white; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-weight: 600; font-size: 15px;">Open Tally</a>
  </div>
  <p style="text-align: center; font-size: 12px; color: #9ca3af; margin-top: 32px;">
    This is a system generated email, please do not reply to it.
  </p>
</div>
  `.trim();

  return sendEmail({
    to,
    subject: "Welcome to Tally 👋",
    html,
  });
}
