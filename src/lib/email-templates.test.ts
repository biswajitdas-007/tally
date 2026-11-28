import { beforeEach, describe, expect, it, vi } from "vitest";

type Sent = { to: string; subject: string; html: string; text: string };

// sendEmail is mocked for the templates that import it; the welcome email lives
// in email.ts itself, so Resend is mocked underneath it instead.
const { sendEmail, resendSend } = vi.hoisted(() => {
  process.env.RESEND_API_KEY = "test-key";
  process.env.NEXT_PUBLIC_APP_URL = "https://tally.test";
  return {
    sendEmail: vi.fn<(o: Sent) => Promise<boolean>>(async () => true),
    resendSend: vi.fn<(o: Sent) => Promise<{ error: null }>>(async () => ({ error: null })),
  };
});

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: resendSend };
  },
}));

vi.mock("./email", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./email")>()),
  sendEmail,
}));

import { sendSettleReminderEmail } from "./reminder-email";
import { sendSettlementEmail } from "./settlement-email";
import { sendSettledEmail } from "./settled-email";
import { EMAIL_COLORS } from "./email-layout";

const lastSent = (): Sent => sendEmail.mock.calls.at(-1)![0];

beforeEach(() => {
  sendEmail.mockClear();
  resendSend.mockClear();
});

describe("welcome email", () => {
  it("greets the user by escaped first name with a link into the app", async () => {
    const { sendWelcomeEmail } = await vi.importActual<typeof import("./email")>("./email");
    expect(await sendWelcomeEmail("a@b.test", "Ri<ya> Sharma")).toBe(true);
    const sent = resendSend.mock.calls[0][0];
    expect(sent.to).toBe("a@b.test");
    expect(sent.html).toContain("Hi Ri&lt;ya&gt;, welcome to Tally!");
    expect(sent.html).toContain('href="https://tally.test"');
    expect(sent.html).toContain("Quick start");
  });
});

describe("settle reminder email", () => {
  it("lists only the balances that matter, coloured by direction", async () => {
    await sendSettleReminderEmail("a@b.test", "Ri<ya> S", { owedToYou: 1200, youOwe: 0.2, people: 1 });
    const sent = lastSent();
    expect(sent.subject).toBe("Time to settle up on Tally");
    expect(sent.html).toContain("Owed to you");
    expect(sent.html).not.toContain("You owe");
    expect(sent.html).toContain(`color:${EMAIL_COLORS.positive}`);
    expect(sent.html).toContain("1 person");
    expect(sent.html).toContain("Hi Ri&lt;ya&gt;");
    // The plain-text part isn't HTML: the name stays raw there.
    expect(sent.text).toContain("Hi Ri<ya>,");
  });

  it("shows what you owe and skips sending without an address", async () => {
    await sendSettleReminderEmail("a@b.test", "", { owedToYou: 0, youOwe: 300, people: 3 });
    const { html } = lastSent();
    expect(html).toContain("You owe");
    expect(html).not.toContain("Owed to you");
    expect(html).toContain(`color:${EMAIL_COLORS.negative}`);
    expect(html).toContain("3 people");
    expect(await sendSettleReminderEmail("", "x", { owedToYou: 1, youOwe: 1, people: 1 })).toBe(false);
  });
});

describe("settlement receipt", () => {
  const info = { amount: 820, payerName: "Riya", receiverName: "Aarav", groupName: "Flat <4B>", note: "rent & wifi" };

  it("tells the receiver who paid them, in which group", async () => {
    await sendSettlementEmail("a@b.test", "Aa<rav> K", "received", info);
    const { html, subject } = lastSent();
    expect(subject).toContain("Riya settled up with you");
    expect(html).toContain("Payment received");
    expect(html).toContain("Hi Aa&lt;rav&gt;,");
    expect(html).toContain("just settled up with you. It's recorded in your");
    expect(html).toContain("Flat &lt;4B&gt;</b> ledger.");
    expect(html).not.toContain("<4B>");
    expect(html).toContain("rent &amp; wifi");
    expect(html).not.toContain("reply to this email");
  });

  it("shows a group's icon key as its emoji, never the raw key", async () => {
    await sendSettlementEmail("a@b.test", "Aarav", "received", { ...info, groupIcon: "trip" });
    const { html } = lastSent();
    expect(html).toContain("🏝️ Flat &lt;4B&gt;");
    expect(html).not.toContain("trip Flat");
  });

  it("leaves the group out for a direct settlement the receiver gets", async () => {
    await sendSettlementEmail("a@b.test", "Aarav", "received", { ...info, groupName: null });
    expect(lastSent().html).not.toContain("It's recorded in your");
    expect(lastSent().html).toContain("Direct settlement");
  });

  it("confirms the payer's payment in the group", async () => {
    await sendSettlementEmail("a@b.test", "Riya", "sent", info);
    expect(lastSent().html).toContain("is recorded in <b");
    expect(lastSent().html).toContain("Flat &lt;4B&gt;</b>. You're all square");
  });

  it("confirms the payer's payment, with a direct-settlement fallback", async () => {
    await sendSettlementEmail("a@b.test", "Riya", "sent", { ...info, groupName: null, note: null });
    const { html, subject } = lastSent();
    expect(subject).toContain("Payment recorded");
    expect(html).toContain("Payment sent");
    expect(html).toContain("is recorded. You're all square on this one.");
    expect(html).toContain("Direct settlement");
    expect(html).not.toContain(">Note<");
  });
});

describe("group settled email", () => {
  it("summarises the group and who paid what", async () => {
    await sendSettledEmail("a@b.test", "Aarav", {
      groupName: "Goa & co",
      groupIcon: "🏖️",
      totalSpent: 24000,
      expenseCount: 12,
      contributions: [{ name: "<Riya>", paid: 14000 }],
      closedByPayerName: "Kabir",
      closedByReceiverName: "Riya",
      closedAmount: 720,
    });
    const { html, subject } = lastSent();
    expect(subject).toBe("Goa & co is all settled up 🎉");
    expect(html).toContain("settled across 🏖️ Goa &amp; co");
    expect(html).toContain("every balance in <b style=\"color:#17123a;\">Goa &amp; co</b>");
    expect(html).not.toContain("Goa & co");
    expect(html).toContain("₹0 · all clear");
    expect(html).toContain("&lt;Riya&gt;");
    expect(html).toContain("Who paid what");
  });
});
