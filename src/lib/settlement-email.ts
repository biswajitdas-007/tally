import { formatINR } from "./utils";
import { escapeHtml } from "./api-helpers";
import { sendEmail } from "./email";
import { emailLayout, emailNote, emailParagraph, emailRows, emailStrong, type EmailRow } from "./email-layout";

export interface SettlementInfo {
  amount: number;
  payerName: string;
  receiverName: string;
  groupName?: string | null;
  groupIcon?: string | null;
  note?: string | null;
  date?: Date;
}

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
  const groupName = info.groupName ? emailStrong(escapeHtml(info.groupName)) : "";
  let lead: string;
  if (isReceiver) {
    const where = groupName ? ` It's recorded in your ${groupName} ledger.` : "";
    lead = `Hi ${first}, ${emailStrong(payer)} just settled up with you.${where}`;
  } else {
    const where = groupName ? ` in ${groupName}` : "";
    lead = `Hi ${first}, your payment to ${emailStrong(receiver)} is recorded${where}. You're all square on this one.`;
  }

  const rows: EmailRow[] = [
    { label: "Paid by", value: isReceiver ? payer : "You" },
    { label: "Paid to", value: isReceiver ? "You" : receiver },
    { label: "Group", value: groupLabel },
    ...(info.note ? [{ label: "Note", value: escapeHtml(info.note) }] : []),
    { label: "When", value: when },
  ];

  const html = emailLayout({
    eyebrow,
    title: heroAmount,
    titleSize: "lg",
    subtitle: heroSub,
    body:
      emailParagraph(lead) +
      emailRows(rows) +
      emailNote("Didn't expect this? Open Tally to review the ledger."),
  });

  const subject = isReceiver
    ? `${info.payerName} settled up with you · ${formatINR(info.amount)}`
    : `Payment recorded · ${formatINR(info.amount)} to ${info.receiverName}`;

  const where = info.groupName ? ` in ${info.groupName}` : "";
  const noteText = info.note ? ` (${info.note})` : "";
  const text = isReceiver
    ? `${info.payerName} settled up with you: ${formatINR(info.amount)}${where}${noteText} on ${when}.\n\nOpen Tally to review the ledger.\n\n— Tally`
    : `Payment recorded: you paid ${info.receiverName} ${formatINR(info.amount)}${where}${noteText} on ${when}. You're all square on this one.\n\n— Tally`;

  return sendEmail({ to, subject, html, text });
}
