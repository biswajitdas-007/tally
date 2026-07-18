import { formatINR } from "./utils";
import { escapeHtml } from "./api-helpers";
import type { Liability } from "./types";

/**
 * Sends a polished "EMI paid" receipt after an auto-update. Best-effort: only
 * fires when Resend is configured (RESEND_API_KEY + INVITE_FROM_EMAIL).
 */
export async function sendEmiEmail(to: string, name: string, l: Liability): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.INVITE_FROM_EMAIL;
  if (!key || !from || !to) return false;

  const paid = l.emisPaid ?? 0;
  const total = l.termMonths ?? 0;
  const left = Math.max(0, total - paid);
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  const who = escapeHtml(l.lender || l.name);
  const first = escapeHtml((name || "there").split(" ")[0]);
  const done = left === 0;

  const html = `
<div style="margin:0;padding:0;background:#eef2ec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:28px 18px;">
    <div style="text-align:center;padding-bottom:20px;">
      <span style="font-size:20px;font-weight:800;letter-spacing:-.03em;color:#1c6b52;">Tally</span>
    </div>
    <div style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 10px 30px -14px rgba(20,32,26,.25);">
      <div style="background:linear-gradient(152deg,#22795d 0%,#155741 100%);padding:28px 26px;color:#ffffff;">
        <div style="font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;opacity:.7;">
          ${done ? "Loan cleared" : "EMI paid"}
        </div>
        <div style="font-size:30px;font-weight:800;letter-spacing:-.02em;margin-top:6px;">${escapeHtml(formatINR(l.emi ?? 0))}</div>
        <div style="font-size:14px;opacity:.85;margin-top:2px;">towards ${who}</div>
      </div>
      <div style="padding:24px 26px;">
        <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#3d4c44;">
          Hi ${first}, your <b style="color:#14201a;">${who}</b> EMI was marked paid automatically.
          ${done ? "That was the last one — this loan is fully cleared. 🎉" : `You're <b style="color:#14201a;">${pct}%</b> of the way there.`}
        </p>

        <div style="height:10px;background:#eef2ec;border-radius:999px;overflow:hidden;margin:18px 0 8px;">
          <div style="height:10px;width:${pct}%;background:linear-gradient(90deg,#1c6b52,#22795d);border-radius:999px;"></div>
        </div>

        <table role="presentation" width="100%" style="border-collapse:collapse;margin-top:14px;">
          <tr>
            <td style="padding:12px 0;border-top:1px solid #eef2ec;font-size:14px;color:#6a7a70;">EMIs paid</td>
            <td style="padding:12px 0;border-top:1px solid #eef2ec;font-size:14px;font-weight:700;color:#14201a;text-align:right;">${paid} of ${total}</td>
          </tr>
          <tr>
            <td style="padding:12px 0;border-top:1px solid #eef2ec;font-size:14px;color:#6a7a70;">Still to pay</td>
            <td style="padding:12px 0;border-top:1px solid #eef2ec;font-size:14px;font-weight:700;color:#14201a;text-align:right;">${left} EMIs</td>
          </tr>
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
    <p style="text-align:center;font-size:12px;color:#8b958c;margin-top:18px;">Tally · your money, quietly kept in order</p>
  </div>
</div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        subject: done ? `${l.lender || l.name} loan cleared 🎉` : `EMI paid · ${l.lender || l.name} · ${paid}/${total}`,
        html,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
