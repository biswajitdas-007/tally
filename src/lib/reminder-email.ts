import { formatINR } from "./utils";
import { escapeHtml } from "./api-helpers";
import { sendEmail } from "./email";

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
  const first = escapeHtml((name || "there").split(" ")[0]);

  const row = (label: string, value: string, color: string) =>
    `<tr>
      <td style="padding:12px 0;border-top:1px solid #eef2ec;font-size:14px;color:#6a7a70;">${label}</td>
      <td style="padding:12px 0;border-top:1px solid #eef2ec;font-size:14px;font-weight:700;color:${color};text-align:right;">${value}</td>
    </tr>`;

  const rows =
    (t.youOwe >= 0.5 ? row("You owe", escapeHtml(formatINR(t.youOwe)), "#c2623f") : "") +
    (t.owedToYou >= 0.5 ? row("Owed to you", escapeHtml(formatINR(t.owedToYou)), "#1c6b52") : "") +
    row("Across", `${t.people} ${t.people === 1 ? "person" : "people"}`, "#14201a");

  const html = `
<div style="margin:0;padding:0;background:#eef2ec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:28px 18px;">
    <div style="text-align:center;padding-bottom:20px;">
      <span style="font-size:20px;font-weight:800;letter-spacing:-.03em;color:#1c6b52;">Tally</span>
    </div>
    <div style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 10px 30px -14px rgba(20,32,26,.25);">
      <div style="background:linear-gradient(152deg,#22795d 0%,#155741 100%);padding:28px 26px;color:#ffffff;">
        <div style="font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;opacity:.7;">New month, clean slate</div>
        <div style="font-size:23px;font-weight:800;letter-spacing:-.02em;margin-top:6px;line-height:1.25;">Time to settle up</div>
      </div>
      <div style="padding:24px 26px;">
        <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#3d4c44;">
          Hi ${first}, you have balances left over from last month. A quick catch-up keeps everyone square:
        </p>
        <table role="presentation" width="100%" style="border-collapse:collapse;margin-top:6px;">${rows}</table>
        <div style="text-align:center;margin:24px 0 4px;">
          <a href="${appUrl}" style="display:inline-block;background:#1c6b52;color:#ffffff;padding:13px 30px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;">Settle up in Tally</a>
        </div>
        <p style="margin:14px 0 0;font-size:12.5px;line-height:1.5;color:#8b958c;">
          Tally records who paid whom — copy a friend's UPI ID, pay in your own UPI app, and mark it settled.
        </p>
      </div>
    </div>
    <p style="text-align:center;font-size:12px;color:#8b958c;margin-top:18px;">Tally · your money, quietly kept in order</p>
  </div>
</div>`;

  const text =
    `Hi ${first}, you have unsettled balances from last month` +
    (t.youOwe >= 0.5 ? ` — you owe ${formatINR(t.youOwe)}` : "") +
    (t.owedToYou >= 0.5 ? `${t.youOwe >= 0.5 ? "," : " —"} ${formatINR(t.owedToYou)} owed to you` : "") +
    `. Settle up in Tally: ${appUrl}\n\n— Tally`;

  return sendEmail({ to, subject: "Time to settle up on Tally", html, text });
}
