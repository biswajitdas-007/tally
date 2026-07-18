import { formatINR } from "./utils";
import { escapeHtml } from "./api-helpers";
import { sendEmail } from "./email";

export interface SettlementInfo {
  amount: number;
  payerName: string;
  receiverName: string;
  groupName?: string | null;
  groupIcon?: string | null;
  note?: string | null;
  date?: Date;
}

const cell = (extra = "") =>
  `padding:12px 0;border-top:1px solid #eef2ec;font-size:14px;${extra}`;
const row = (k: string, v: string) =>
  `<tr><td style="${cell("color:#6a7a70;")}">${k}</td>` +
  `<td style="${cell("font-weight:700;color:#14201a;text-align:right;")}">${v}</td></tr>`;

/**
 * A receipt for a single settlement, sent to both parties. `perspective`
 * flips the copy: the receiver sees "Payment received", the payer "Payment
 * sent". Best-effort — only fires when Gmail SMTP is configured.
 */
export async function sendSettlementEmail(
  to: string,
  recipientName: string,
  perspective: "received" | "sent",
  info: SettlementInfo,
): Promise<boolean> {
  if (!to) return false;

  const isReceiver = perspective === "received";
  const first = escapeHtml((recipientName || "there").split(" ")[0]);
  const payer = escapeHtml(info.payerName);
  const receiver = escapeHtml(info.receiverName);
  const amount = escapeHtml(formatINR(info.amount));
  const groupLabel = info.groupName
    ? `${info.groupIcon ? escapeHtml(info.groupIcon) + " " : ""}${escapeHtml(info.groupName)}`
    : "Direct settlement";
  const when = (info.date ?? new Date()).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const eyebrow = isReceiver ? "Payment received" : "Payment sent";
  const heroAmount = isReceiver ? `+ ${amount}` : amount;
  const heroSub = isReceiver ? `from ${payer}` : `to ${receiver}`;
  const lead = isReceiver
    ? `Hi ${first}, <b style="color:#14201a;">${payer}</b> just settled up with you.${
        info.groupName ? ` It's recorded in your <b style="color:#14201a;">${escapeHtml(info.groupName)}</b> ledger.` : ""
      }`
    : `Hi ${first}, your payment to <b style="color:#14201a;">${receiver}</b> is recorded${
        info.groupName ? ` in <b style="color:#14201a;">${escapeHtml(info.groupName)}</b>` : ""
      }. You're all square on this one.`;

  const rows =
    row("Paid by", isReceiver ? payer : "You") +
    row("Paid to", isReceiver ? "You" : receiver) +
    row("Group", groupLabel) +
    (info.note ? row("Note", escapeHtml(info.note)) : "") +
    row("When", when);

  const html = `
<div style="margin:0;padding:0;background:#eef2ec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:28px 18px;">
    <div style="text-align:center;padding-bottom:20px;">
      <span style="font-size:20px;font-weight:800;letter-spacing:-.03em;color:#1c6b52;">Tally</span>
    </div>
    <div style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 10px 30px -14px rgba(20,32,26,.25);">
      <div style="background:linear-gradient(152deg,#22795d 0%,#155741 100%);padding:28px 26px;color:#ffffff;">
        <div style="font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;opacity:.7;">${eyebrow}</div>
        <div style="font-size:30px;font-weight:800;letter-spacing:-.02em;margin-top:6px;">${heroAmount}</div>
        <div style="font-size:14px;opacity:.85;margin-top:2px;">${heroSub}</div>
      </div>
      <div style="padding:24px 26px;">
        <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#3d4c44;">${lead}</p>
        <table role="presentation" width="100%" style="border-collapse:collapse;margin-top:6px;">${rows}</table>
        <p style="margin:18px 0 0;font-size:12.5px;line-height:1.5;color:#8b958c;">
          Didn't expect this? Open Tally to review the ledger, or just reply to this email.
        </p>
      </div>
    </div>
    <p style="text-align:center;font-size:12px;color:#8b958c;margin-top:18px;">Tally · your money, quietly kept in order</p>
  </div>
</div>`;

  const subject = isReceiver
    ? `${info.payerName} settled up with you · ${formatINR(info.amount)}`
    : `Payment recorded · ${formatINR(info.amount)} to ${info.receiverName}`;

  return sendEmail({ to, subject, html });
}
