import { formatINR } from "./utils";
import { escapeHtml } from "./api-helpers";
import { sendEmail } from "./email";

export interface SettledInfo {
  groupName: string;
  groupIcon?: string | null;
  totalSpent: number;
  expenseCount: number;
  contributions: { name: string; paid: number }[]; // sorted, highest first
  closedByPayerName: string;
  closedByReceiverName: string;
  closedAmount: number;
}

const cell = (extra = "") =>
  `padding:12px 0;border-top:1px solid #eef2ec;font-size:14px;${extra}`;
const statRow = (k: string, v: string, vColor = "#14201a") =>
  `<tr><td style="${cell("color:#6a7a70;")}">${k}</td>` +
  `<td style="${cell(`font-weight:700;color:${vColor};text-align:right;`)}">${v}</td></tr>`;

/**
 * Celebratory summary sent to every group member the moment the group's
 * balances all reach zero. Best-effort — only fires when Gmail SMTP is set.
 */
export async function sendSettledEmail(to: string, recipientName: string, info: SettledInfo): Promise<boolean> {
  if (!to) return false;

  const first = escapeHtml((recipientName || "there").split(" ")[0]);
  const group = escapeHtml(info.groupName);
  const groupWithIcon = `${info.groupIcon ? escapeHtml(info.groupIcon) + " " : ""}${group}`;

  const contribRows = info.contributions
    .map((c) => {
      const name = escapeHtml(c.name);
      const initial = escapeHtml((c.name || "?").trim().charAt(0).toUpperCase() || "?");
      return `<tr>
        <td style="padding:9px 0;font-size:14px;color:#3d4c44;"><span style="display:inline-block;width:24px;height:24px;line-height:24px;text-align:center;border-radius:50%;background:#e7f1ec;color:#1c6b52;font-size:11px;font-weight:700;vertical-align:middle;margin-right:9px;">${initial}</span>${name}</td>
        <td style="padding:9px 0;font-size:14px;font-weight:700;color:#14201a;text-align:right;">${escapeHtml(formatINR(c.paid))}</td>
      </tr>`;
    })
    .join("");

  const html = `
<div style="margin:0;padding:0;background:#eef2ec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:28px 18px;">
    <div style="text-align:center;padding-bottom:20px;">
      <span style="font-size:20px;font-weight:800;letter-spacing:-.03em;color:#1c6b52;">Tally</span>
    </div>
    <div style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 10px 30px -14px rgba(20,32,26,.25);">
      <div style="background:linear-gradient(152deg,#22795d 0%,#155741 100%);padding:28px 26px;color:#ffffff;">
        <div style="font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;opacity:.7;">All settled up 🎉</div>
        <div style="font-size:30px;font-weight:800;letter-spacing:-.02em;margin-top:6px;">${escapeHtml(formatINR(info.totalSpent))}</div>
        <div style="font-size:14px;opacity:.85;margin-top:2px;">settled across ${groupWithIcon}</div>
      </div>
      <div style="padding:24px 26px;">
        <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#3d4c44;">
          Hi ${first}, every balance in <b style="color:#14201a;">${group}</b> is back to zero — nobody owes anyone a rupee. Here's the final tally:
        </p>
        <table role="presentation" width="100%" style="border-collapse:collapse;margin-top:6px;">
          ${statRow("Total spent", escapeHtml(formatINR(info.totalSpent)))}
          ${statRow("Expenses", String(info.expenseCount))}
          ${statRow("Outstanding", "₹0 · all clear", "#1c6b52")}
        </table>

        <div style="margin:22px 0 10px;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#8b958c;">Who paid what</div>
        <table role="presentation" width="100%" style="border-collapse:collapse;">${contribRows}</table>

        <p style="margin:20px 0 0;font-size:12.5px;line-height:1.5;color:#8b958c;">
          Closed by ${escapeHtml(info.closedByPayerName)}'s payment of ${escapeHtml(formatINR(info.closedAmount))} to ${escapeHtml(info.closedByReceiverName)}. Open Tally to start a fresh split whenever you're ready.
        </p>
      </div>
    </div>
    <p style="text-align:center;font-size:12px;color:#8b958c;margin-top:18px;">Tally · your money, quietly kept in order</p>
  </div>
</div>`;

  return sendEmail({ to, subject: `${info.groupName} is all settled up 🎉`, html });
}
