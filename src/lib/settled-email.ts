import { formatINR } from "./utils";
import { escapeHtml } from "./api-helpers";
import { sendEmail } from "./email";
import { EMAIL_COLORS, emailLabel, emailLayout, emailNote, emailParagraph, emailPersonRows, emailRows, emailStrong } from "./email-layout";

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

/**
 * Celebratory summary sent to every group member the moment the group's
 * balances all reach zero. Best-effort — only fires when Gmail SMTP is set.
 */
export async function sendSettledEmail(to: string, recipientName: string, info: SettledInfo): Promise<boolean> {
  if (!to) return false;

  const first = escapeHtml((recipientName || "there").split(" ")[0]);
  const group = escapeHtml(info.groupName);
  const groupWithIcon = `${info.groupIcon ? escapeHtml(info.groupIcon) + " " : ""}${group}`;

  const html = emailLayout({
    eyebrow: "All settled up 🎉",
    title: escapeHtml(formatINR(info.totalSpent)),
    titleSize: "lg",
    subtitle: `settled across ${groupWithIcon}`,
    body:
      emailParagraph(
        `Hi ${first}, every balance in ${emailStrong(group)} is back to zero — nobody owes anyone a rupee. Here's the final tally:`,
      ) +
      emailRows([
        { label: "Total spent", value: escapeHtml(formatINR(info.totalSpent)) },
        { label: "Expenses", value: String(info.expenseCount) },
        { label: "Outstanding", value: "₹0 · all clear", color: EMAIL_COLORS.positive },
      ]) +
      emailLabel("Who paid what") +
      emailPersonRows(info.contributions.map((c) => ({ name: c.name, value: escapeHtml(formatINR(c.paid)) }))) +
      emailNote(
        `Closed by ${escapeHtml(info.closedByPayerName)}'s payment of ${escapeHtml(formatINR(info.closedAmount))} to ${escapeHtml(info.closedByReceiverName)}. Open Tally to start a fresh split whenever you're ready.`,
      ),
  });

  const text =
    `${info.groupName} is all settled up — every balance is back to zero, nobody owes anyone a rupee.\n\n` +
    `Total spent: ${formatINR(info.totalSpent)} across ${info.expenseCount} expenses.\n` +
    `Closed by ${info.closedByPayerName}'s payment of ${formatINR(info.closedAmount)} to ${info.closedByReceiverName}.\n\n— Tally`;

  return sendEmail({ to, subject: `${info.groupName} is all settled up 🎉`, html, text });
}
