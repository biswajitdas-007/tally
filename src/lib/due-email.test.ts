import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Liability } from "./types";

const sendEmail = vi.hoisted(() => vi.fn());
vi.mock("./email", () => ({ sendEmail }));

import { sendBillDueEmail } from "./due-email";

const card: Liability = {
  id: "card-1",
  name: "Millennia",
  kind: "card",
  lender: "HDFC",
  outstanding: 24_500,
  dueDay: 3,
};

const loan: Liability = {
  id: "loan-1",
  name: "Home loan",
  kind: "loan",
  lender: "SBI",
  outstanding: 11_000,
  emi: 1_000,
  termMonths: 12,
  emisPaid: 1,
  dueDay: 5,
};

const lastEmail = () => sendEmail.mock.calls[0][0] as { subject: string; html: string; text: string };

describe("bill due email", () => {
  beforeEach(() => {
    sendEmail.mockReset().mockResolvedValue(true);
  });

  it("asks a card holder to confirm without claiming the bill is paid", async () => {
    await sendBillDueEmail("me@tally.test", "Biswajit Das", card, { period: "2026-08", dueCount: 1 });

    const { subject, html, text } = lastEmail();
    expect(subject).toBe("Bill due · HDFC");
    expect(html).toContain("Credit card bill due");
    expect(html).toContain("₹24,500.00");
    expect(html).toContain("3 Aug 2026");
    expect(html).toContain("confirmEmi=card-1&amp;period=2026-08");
    // The bug this guards: reusing the paid receipt for a reminder.
    expect(html).not.toMatch(/bill paid|marked paid/i);
    expect(text).not.toMatch(/bill paid|marked paid/i);
  });

  it("shows the EMI amount and flags earlier unconfirmed months", async () => {
    await sendBillDueEmail("me@tally.test", "Biswajit", loan, { period: "2026-08", dueCount: 3 });

    const { subject, html } = lastEmail();
    expect(subject).toBe("EMI due · SBI");
    expect(html).toContain("EMI due");
    expect(html).toContain("₹1,000.00");
    expect(html).toContain("2</b> earlier EMIs");
    expect(html).not.toMatch(/EMI paid|marked paid/i);
  });

  it("escapes a lender name rather than injecting it into the markup", async () => {
    await sendBillDueEmail("me@tally.test", "Biswajit", { ...card, lender: "<script>x</script>" }, {
      period: "2026-08",
      dueCount: 1,
    });

    expect(lastEmail().html).not.toContain("<script>");
  });

  it("sends nothing without a recipient", async () => {
    await expect(sendBillDueEmail("", "Biswajit", card, { period: "2026-08", dueCount: 1 })).resolves.toBe(false);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
