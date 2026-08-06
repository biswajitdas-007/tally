import { sendEmail } from "./email";
import type { Liability } from "./types";
import { formatINR } from "./utils";

export async function sendDeclinedEmiEmail(to: string, name: string, l: Liability): Promise<boolean> {
  const label = l.lender || l.name;
  const emi = formatINR(l.emi ?? 0);
  const subject = `Action Required: Missed EMI payment for ${label}`;
  
  const text = `Hi ${name},

You've marked your EMI of ${emi} for ${label} as declined.

Please be aware that late payment charges or penalty fees may apply if the payment is delayed. We strongly recommend making the payment as soon as possible to avoid any negative impact on your credit score and additional charges.

We will continue to remind you about this overdue payment.

The Tally Team`;

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111;max-width:500px;margin:0 auto;padding:20px;line-height:1.5;">
      <p style="margin-top:0;">Hi ${name},</p>
      
      <p>You've marked your EMI of <strong>${emi}</strong> for <strong>${label}</strong> as declined.</p>
      
      <div style="background-color:#fff3ed;border-left:4px solid #f97316;padding:12px 16px;margin:24px 0;border-radius:4px;">
        <p style="margin:0;color:#c2410c;font-size:14px;"><strong>Please Note:</strong> Late payment charges or penalty fees may apply if the payment is delayed. We strongly recommend making the payment as soon as possible to avoid any negative impact on your credit score and additional charges.</p>
      </div>
      
      <p>We will continue to gently remind you about this overdue payment to help you stay on track.</p>
      
      <p style="margin-bottom:0;">The Tally Team</p>
    </div>
  `;

  return sendEmail({ to, subject, html, text });
}
