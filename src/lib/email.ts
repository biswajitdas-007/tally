import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL || "Tally <onboarding@resend.dev>";

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
