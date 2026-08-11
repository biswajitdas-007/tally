import { formatINR } from "./utils";
import { escapeHtml } from "./api-helpers";
import { sendEmail } from "./email";
import type { Liability } from "./types";

/**
 * Sends a polished "Credit card bill paid" receipt. Best-effort: only
 * fires when Gmail SMTP is configured (GMAIL_USER + GMAIL_APP_PASSWORD).
 */
export async function sendCardEmail(to: string, name: string, l: Liability, amountPaid?: number, isLate?: boolean, isManual?: boolean): Promise<boolean> {
  if (!to) return false;

  const who = escapeHtml(l.lender || l.name);
  const first = escapeHtml((name || "there").split(" ")[0]);
  
  const paymentAmount = amountPaid != null ? amountPaid : (l.emi ?? 0);

  const html = `
<div style="margin:0;padding:0;background:#eef2ec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:28px 18px;">
    <div style="text-align:center;padding-bottom:20px;">
      <span style="font-size:20px;font-weight:800;letter-spacing:-.03em;color:#1c6b52;">Tally</span>
    </div>
    <div style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 10px 30px -14px rgba(20,32,26,.25);">
      <div style="background:linear-gradient(152deg,#22795d 0%,#155741 100%);padding:28px 26px;color:#ffffff;">
        <div style="font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;opacity:.7;">
          Credit card bill paid
        </div>
        <div style="font-size:30px;font-weight:800;letter-spacing:-.02em;margin-top:6px;">${escapeHtml(formatINR(paymentAmount))}</div>
        <div style="font-size:14px;opacity:.85;margin-top:2px;">towards ${who}</div>
      </div>
      <div style="padding:24px 26px;">
        <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#3d4c44;">
          Hi ${first}, your <b style="color:#14201a;">${who}</b> bill was marked paid${isManual ? "." : " automatically."}
        </p>

        ${isLate ? `
        <div style="margin: 0 0 16px; padding: 12px 14px; background: #fff0f0; border-radius: 8px; border: 1px solid #ffd6d6; color: #cc0000; font-size: 14px; line-height: 1.5;">
          <strong>Late Payment Notice:</strong> This payment was recorded after your due date. Please verify with your bank if any late fees or interest charges were applied.
        </div>
        ` : ""}

        <table role="presentation" width="100%" style="border-collapse:collapse;margin-top:14px;">
          <tr>
            <td style="padding:12px 0;border-top:1px solid #eef2ec;font-size:14px;color:#6a7a70;">Outstanding</td>
            <td style="padding:12px 0;border-top:1px solid #eef2ec;font-size:14px;font-weight:700;color:#14201a;text-align:right;">${escapeHtml(formatINR(l.outstanding))}</td>
          </tr>
        </table>

        <p style="margin:18px 0 0;font-size:12.5px;line-height:1.5;color:#8b958c;">
          Tally updated this for you on your payment date. Made a partial or extra payment? Open the app and adjust the count anytime.
        </p>
      </div>
    </div>
    <p style="text-align:center;font-size:12px;color:#8b958c;margin-top:18px;">Tally · your money, quietly kept in order<br><span style="opacity:0.7">This is a system generated email, please do not reply.</span></p>
  </div>
</div>`;

  const subject = `Bill paid · ${l.lender || l.name}`;
  const label = l.lender || l.name;
  const text = `Bill paid on ${label}: ${formatINR(paymentAmount)}.\nOutstanding: ${formatINR(l.outstanding)}.${isLate ? "\n\nLate Payment Notice: This payment was recorded after your due date. Please verify with your bank if any late fees or interest charges were applied." : ""}\n\n— Tally`;
  return sendEmail({ to, subject, html, text });
}
