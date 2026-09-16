import { formatINR } from "./utils";
import { escapeHtml } from "./api-helpers";
import { sendEmail } from "./email";
import { DEFAULT_DUE_DAY } from "./liabilities";
import type { Liability } from "./types";

const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://tally-eight-silk.vercel.app").replace(/\/$/, "");

function dueDateLabel(period: string, dueDay: number): string {
  const [year, month] = period.split("-").map(Number);
  return new Date(year, month - 1, dueDay).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * A nudge that a manual EMI or credit card bill needs paying and confirming.
 * This is the counterpart to the paid receipts in `emi-email` / `card-email` —
 * it must never claim the payment has happened, because at this point only the
 * user knows whether it has.
 */
export async function sendBillDueEmail(
  to: string,
  name: string,
  l: Liability,
  opts: { period: string; dueCount: number },
): Promise<boolean> {
  if (!to) return false;

  const isCard = l.kind === "card";
  const who = escapeHtml(l.lender || l.name);
  const first = escapeHtml((name || "there").split(" ")[0]);
  const noun = isCard ? "bill" : "EMI";
  const amount = isCard ? l.outstanding : l.emi ?? 0;
  const dueOn = escapeHtml(dueDateLabel(opts.period, l.dueDay ?? DEFAULT_DUE_DAY));
  const extra = opts.dueCount - 1;
  const confirmUrl = `${appUrl}/wealth?confirmEmi=${encodeURIComponent(l.id)}&period=${encodeURIComponent(opts.period)}`;
  // `&period=` is a hair away from the &period; entity — escape it in markup.
  const confirmHref = escapeHtml(confirmUrl);

  const html = `
<div style="margin:0;padding:0;background:#eef2ec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:28px 18px;">
    <div style="text-align:center;padding-bottom:20px;">
      <span style="font-size:20px;font-weight:800;letter-spacing:-.03em;color:#1c6b52;">Tally</span>
    </div>
    <div style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 10px 30px -14px rgba(20,32,26,.25);">
      <div style="background:linear-gradient(152deg,#22795d 0%,#155741 100%);padding:28px 26px;color:#ffffff;">
        <div style="font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;opacity:.7;">
          ${isCard ? "Credit card bill due" : "EMI due"}
        </div>
        <div style="font-size:30px;font-weight:800;letter-spacing:-.02em;margin-top:6px;">${escapeHtml(formatINR(amount))}</div>
        <div style="font-size:14px;opacity:.85;margin-top:2px;">towards ${who}</div>
      </div>
      <div style="padding:24px 26px;">
        <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#3d4c44;">
          Hi ${first}, your <b style="color:#14201a;">${who}</b> ${noun} was due on <b style="color:#14201a;">${dueOn}</b>.
          ${extra > 0
            ? `There ${extra === 1 ? "is" : "are"} also <b style="color:#14201a;">${extra}</b> earlier ${noun}${extra === 1 ? "" : "s"} still waiting to be confirmed.`
            : "Once you've paid it, confirm it in Tally so your balance stays accurate."}
        </p>

        <table role="presentation" width="100%" style="border-collapse:collapse;margin-top:14px;">
          <tr>
            <td style="padding:12px 0;border-top:1px solid #eef2ec;font-size:14px;color:#6a7a70;">${isCard ? "Amount owed" : "EMI"}</td>
            <td style="padding:12px 0;border-top:1px solid #eef2ec;font-size:14px;font-weight:700;color:#14201a;text-align:right;">${escapeHtml(formatINR(amount))}</td>
          </tr>
          ${isCard ? "" : `
          <tr>
            <td style="padding:12px 0;border-top:1px solid #eef2ec;font-size:14px;color:#6a7a70;">Outstanding</td>
            <td style="padding:12px 0;border-top:1px solid #eef2ec;font-size:14px;font-weight:700;color:#14201a;text-align:right;">${escapeHtml(formatINR(l.outstanding))}</td>
          </tr>`}
        </table>

        <div style="text-align:center;margin:24px 0 4px;">
          <a href="${confirmHref}" style="display:inline-block;background:#1c6b52;color:#ffffff;padding:13px 30px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;">Confirm in Tally</a>
        </div>
        <p style="margin:14px 0 0;font-size:12.5px;line-height:1.5;color:#8b958c;">
          Tally hasn't changed anything yet — nothing is counted until you confirm it. Already paid? Record the payment and we'll send you a receipt.
        </p>
      </div>
    </div>
    <p style="text-align:center;font-size:12px;color:#8b958c;margin-top:18px;">Tally · your money, quietly kept in order<br><span style="opacity:0.7">This is a system generated email, please do not reply.</span></p>
  </div>
</div>`;

  const label = l.lender || l.name;
  const subject = isCard ? `Bill due · ${label}` : `EMI due · ${label}`;
  const text =
    `Hi ${first}, your ${label} ${noun} of ${formatINR(amount)} was due on ${dueDateLabel(opts.period, l.dueDay ?? DEFAULT_DUE_DAY)}.` +
    (extra > 0 ? ` ${extra} earlier ${noun}${extra === 1 ? "" : "s"} still need confirming.` : "") +
    `\n\nNothing is counted until you confirm it: ${confirmUrl}\n\n— Tally`;

  return sendEmail({ to, subject, html, text });
}
