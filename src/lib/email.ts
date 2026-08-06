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
  const rawFirstName = (name ?? "").trim().split(/\s+/)[0] || "there";
  const firstName = rawFirstName.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
  
  const html = `
<div style="margin:0;padding:0;background:#eef2ec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:28px 18px;">
    <div style="text-align:center;padding-bottom:20px;">
      <span style="font-size:20px;font-weight:800;letter-spacing:-.03em;color:#1c6b52;">Tally</span>
    </div>
    <div style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 10px 30px -14px rgba(20,32,26,.25);">
      <div style="background:linear-gradient(152deg,#22795d 0%,#155741 100%);padding:30px 26px 26px;color:#ffffff;text-align:center;">
        <div style="width:54px;height:54px;margin:0 auto 14px;border-radius:50%;background:rgba(255,255,255,.16);text-align:center;line-height:54px;font-size:21px;font-weight:800;letter-spacing:-.02em;">👋</div>
        <div style="font-size:12.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;opacity:.72;">Welcome aboard</div>
        <div style="font-size:23px;font-weight:800;letter-spacing:-.02em;margin-top:8px;line-height:1.28;">Hi ${firstName}, welcome to Tally!</div>
      </div>
      <div style="padding:26px;">
        <p style="margin:0 0 18px;font-size:15px;line-height:1.55;color:#3d4c44;">
          We're thrilled to have you on board. Tally is the easiest way to split expenses with friends, track your personal finances, and settle up in seconds.
        </p>
        
        <div style="margin: 24px 0;">
          <h3 style="margin: 0 0 14px; font-size: 12.5px; color:#1c6b52; font-weight:700; letter-spacing:.1em; text-transform:uppercase;">Quick Start Guide</h3>
          <table role="presentation" width="100%" style="border-collapse:collapse;">
            <tr><td style="padding:7px 0;font-size:14.5px;color:#3d4c44;"><span style="display:inline-block;width:30px;">🏖️</span> Create a group for your next trip or flatmates</td></tr>
            <tr><td style="padding:7px 0;font-size:14.5px;color:#3d4c44;"><span style="display:inline-block;width:30px;">⚡</span> Add your UPI ID so friends can pay you instantly</td></tr>
            <tr><td style="padding:7px 0;font-size:14.5px;color:#3d4c44;"><span style="display:inline-block;width:30px;">💰</span> Use "Money Mode" to track personal budgets</td></tr>
          </table>
        </div>

        <div style="text-align:center;margin:26px 0 6px;">
          <a href="https://tally.com" style="display:inline-block;background:#1c6b52;color:#ffffff;padding:14px 34px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;">Open Tally</a>
        </div>
      </div>
    </div>
    <p style="text-align:center;font-size:12px;color:#a3aca3;margin-top:24px;">Tally · your money, quietly kept in order<br><span style="opacity:0.7">This is a system generated email, please do not reply.</span></p>
  </div>
</div>
  `.trim();

  return sendEmail({
    to,
    subject: "Welcome to Tally 👋",
    html,
  });
}
