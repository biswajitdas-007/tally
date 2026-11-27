import { formatINR } from "./utils";
import { escapeHtml } from "./api-helpers";
import { sendEmail } from "./email";
import { EMAIL_COLORS, emailButton, emailLayout, emailNote, emailParagraph, emailRows, type EmailRow } from "./email-layout";

const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://tally-eight-silk.vercel.app").replace(/\/$/, "");

/**
 * A monthly nudge to clear unsettled balances. Best-effort — only sends when
 * Gmail SMTP is configured.
 */
export async function sendSettleReminderEmail(
  to: string,
  name: string,
  t: { owedToYou: number; youOwe: number; people: number },
): Promise<boolean> {
  if (!to) return false;
  const rawFirst = (name || "there").split(" ")[0];
  const first = escapeHtml(rawFirst);

  const rows: EmailRow[] = [];
  if (t.youOwe >= 0.5) rows.push({ label: "You owe", value: escapeHtml(formatINR(t.youOwe)), color: EMAIL_COLORS.negative });
  if (t.owedToYou >= 0.5)
    rows.push({ label: "Owed to you", value: escapeHtml(formatINR(t.owedToYou)), color: EMAIL_COLORS.positive });
  rows.push({ label: "Across", value: `${t.people} ${t.people === 1 ? "person" : "people"}` });

  const html = emailLayout({
    eyebrow: "New month, clean slate",
    title: "Time to settle up",
    body:
      emailParagraph(`Hi ${first}, you have balances left over from last month. A quick catch-up keeps everyone square:`) +
      emailRows(rows) +
      emailButton(appUrl, "Settle up in Tally") +
      emailNote("Tally records who paid whom — copy a friend's UPI ID, pay in your own UPI app, and mark it settled."),
  });

  const text =
    `Hi ${rawFirst}, you have unsettled balances from last month` +
    (t.youOwe >= 0.5 ? ` — you owe ${formatINR(t.youOwe)}` : "") +
    (t.owedToYou >= 0.5 ? `${t.youOwe >= 0.5 ? "," : " —"} ${formatINR(t.owedToYou)} owed to you` : "") +
    `. Settle up in Tally: ${appUrl}\n\n— Tally`;

  return sendEmail({ to, subject: "Time to settle up on Tally", html, text });
}
