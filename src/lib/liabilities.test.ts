import { describe, expect, it } from "vitest";
import {
  anchorLastPaidMonth,
  applyAuto,
  editedPaidCountLastPaidMonth,
  emiNotice,
  initialLastPaidMonth,
  manualDue,
  markManualPaid,
  normalizeLiability,
  pendingEmis,
  remainingOf,
  stampNow,
} from "./liabilities";
import type { Liability } from "./types";

const loan = (patch: Partial<Liability> = {}): Liability => ({
  id: "loan-1",
  name: "Home loan",
  kind: "loan",
  outstanding: 100_000,
  emi: 10_000,
  termMonths: 12,
  emisPaid: 0,
  dueDay: 3,
  lastPaidMonth: "2026-07",
  ...patch,
});

const india = (value: string): Date => new Date(`${value}+05:30`);

describe("India calendar boundaries", () => {
  it("stamps months in Asia/Kolkata even while UTC is still in the prior month", () => {
    expect(stampNow(new Date("2026-07-31T18:29:59Z"))).toBe("2026-07");
    expect(stampNow(new Date("2026-07-31T18:30:00Z"))).toBe("2026-08");
  });

  it("does not make the current EMI due until India-local midnight on its due day", () => {
    const l = loan();
    expect(pendingEmis(l, new Date("2026-08-02T18:29:59Z"))).toEqual([]);
    expect(pendingEmis(l, new Date("2026-08-02T18:30:00Z"))).toEqual(["2026-08"]);
  });

  it("rolls due periods across the year boundary", () => {
    const l = loan({ lastPaidMonth: "2025-11", dueDay: 3 });
    expect(pendingEmis(l, india("2026-01-02T12:00:00"))).toEqual(["2025-12"]);
    expect(pendingEmis(l, india("2026-01-03T00:00:00"))).toEqual(["2025-12", "2026-01"]);
  });
});

describe("new and legacy cursor policy", () => {
  it("keeps today's or an upcoming due date eligible for a new schedule", () => {
    expect(initialLastPaidMonth(3, india("2026-08-02T12:00:00"))).toBe("2026-07");
    expect(initialLastPaidMonth(3, india("2026-08-03T12:00:00"))).toBe("2026-07");
  });

  it("skips a new schedule's current due date once that date has passed", () => {
    expect(initialLastPaidMonth(3, india("2026-08-04T00:00:00"))).toBe("2026-08");
  });

  it("does not let an early paid-count correction skip the upcoming EMI", () => {
    expect(editedPaidCountLastPaidMonth(3, india("2026-08-02T12:00:00"))).toBe("2026-07");
    expect(editedPaidCountLastPaidMonth(3, india("2026-08-03T00:00:00"))).toBe("2026-08");
  });

  it("does not retroactively apply an ambiguous legacy auto EMI after the due date", () => {
    const legacy = loan({ autoDebit: true, lastPaidMonth: undefined });
    expect(pendingEmis(legacy, india("2026-08-04T12:00:00"))).toEqual([]);
    expect(emiNotice(legacy, india("2026-08-04T12:00:00"))).toBeNull();
  });

  it("starts a legacy auto schedule at its next due date", () => {
    const legacy = loan({ autoDebit: true, lastPaidMonth: undefined });
    expect(emiNotice(legacy, india("2026-09-02T12:00:00"))).toEqual({
      key: "loan-1:2026-09:upcoming",
      period: "2026-09",
      kind: "upcoming",
      dueCount: 1,
    });
    expect(pendingEmis(legacy, india("2026-09-03T00:00:00"))).toEqual(["2026-09"]);
  });

  it("keeps a legacy auto schedule eligible when discovered on the due day", () => {
    const legacy = loan({ autoDebit: true, lastPaidMonth: undefined });
    expect(pendingEmis(legacy, india("2026-08-03T12:00:00"))).toEqual(["2026-08"]);
  });

  it("lets a legacy manual schedule ask for explicit confirmation", () => {
    const legacy = loan({ autoDebit: false, lastPaidMonth: undefined });
    const now = india("2026-08-04T12:00:00");
    expect(pendingEmis(legacy, now)).toEqual(["2026-08"]);
    expect(manualDue(legacy, now)).toBe(true);
    expect(emiNotice(legacy, now)).toEqual({
      key: "loan-1:2026-08:due",
      period: "2026-08",
      kind: "due",
      dueCount: 1,
    });
  });

  it("anchors an unconfirmed legacy manual EMI across a month boundary", () => {
    const legacy = loan({ autoDebit: false, lastPaidMonth: undefined });
    const anchor = anchorLastPaidMonth(legacy, india("2026-08-04T12:00:00"));
    expect(anchor).toBe("2026-07");

    const anchored = { ...legacy, lastPaidMonth: anchor, lastEmiReminder: "loan-1:2026-08:due" };
    expect(pendingEmis(anchored, india("2026-09-02T12:00:00"))).toEqual(["2026-08"]);
    expect(emiNotice(anchored, india("2026-09-02T12:00:00"))).toEqual({
      key: "loan-1:2026-09:upcoming",
      period: "2026-09",
      kind: "upcoming",
      dueCount: 2,
    });
  });
});

describe("legacy liability shape", () => {
  it("converts remaining months to paid count and removes the legacy field", () => {
    const legacy = {
      ...loan({ termMonths: 12, emisPaid: undefined }),
      remainingMonths: 3,
    } as Liability & { remainingMonths: number };

    const normalized = normalizeLiability(legacy);
    expect(normalized.emisPaid).toBe(9);
    expect(normalized).not.toHaveProperty("remainingMonths");
    expect(pendingEmis(normalized, india("2026-08-03T12:00:00"))).toEqual(["2026-08"]);
  });

  it("keeps an explicit paid count while removing stale legacy metadata", () => {
    const normalized = normalizeLiability({ ...loan({ emisPaid: 7 }), remainingMonths: 9 } as Liability & {
      remainingMonths: number;
    });
    expect(normalized.emisPaid).toBe(7);
    expect(normalized).not.toHaveProperty("remainingMonths");
  });
});

describe("pending periods", () => {
  it("returns arrears chronologically and caps them at the remaining term", () => {
    const l = loan({ lastPaidMonth: "2026-01", termMonths: 5, emisPaid: 3 });
    expect(remainingOf(l)).toBe(2);
    expect(pendingEmis(l, india("2026-05-03T12:00:00"))).toEqual(["2026-02", "2026-03"]);
  });

  it("includes older arrears before the current due day", () => {
    const l = loan({ lastPaidMonth: "2026-05" });
    expect(pendingEmis(l, india("2026-08-02T12:00:00"))).toEqual(["2026-06", "2026-07"]);
    expect(pendingEmis(l, india("2026-08-03T12:00:00"))).toEqual(["2026-06", "2026-07", "2026-08"]);
  });

  it.each([0, -1])("treats outstanding %i as ineligible", (outstanding) => {
    const l = loan({ autoDebit: true, outstanding });
    expect(pendingEmis(l, india("2026-08-03T12:00:00"))).toEqual([]);
    expect(emiNotice(l, india("2026-08-02T12:00:00"))).toBeNull();
    expect(applyAuto(l, india("2026-08-03T12:00:00"))).toEqual({ liability: l, applied: [] });
  });

  it("requires an EMI, a term, and a remaining installment", () => {
    const now = india("2026-08-03T12:00:00");
    expect(pendingEmis(loan({ emi: undefined }), now)).toEqual([]);
    expect(pendingEmis(loan({ termMonths: undefined }), now)).toEqual([]);
    expect(pendingEmis(loan({ termMonths: 4, emisPaid: 4 }), now)).toEqual([]);
  });
});

describe("application idempotency", () => {
  it("applies an auto EMI once and does not apply the same period again", () => {
    const now = india("2026-08-03T12:00:00");
    const first = applyAuto(loan({ autoDebit: true, emisPaid: 2 }), now);
    expect(first.applied).toEqual(["2026-08"]);
    expect(first.liability).toMatchObject({ emisPaid: 3, outstanding: 90_000, lastPaidMonth: "2026-08" });

    const second = applyAuto(first.liability, now);
    expect(second).toEqual({ liability: first.liability, applied: [] });
    expect(second.liability).toBe(first.liability);
  });

  it("applies all manual arrears once", () => {
    const now = india("2026-08-03T12:00:00");
    const l = loan({ lastPaidMonth: "2026-05", emisPaid: 2 });
    const paid = markManualPaid(l, now);
    expect(paid).toMatchObject({ emisPaid: 5, outstanding: 70_000, lastPaidMonth: "2026-08" });
    expect(markManualPaid(paid, now)).toBe(paid);
  });

  it("leaves a manual liability untouched when no EMI is due", () => {
    const l = loan({ lastPaidMonth: "2026-08", emisPaid: 2 });
    expect(markManualPaid(l, india("2026-08-03T12:00:00"))).toBe(l);
    expect(markManualPaid(l, india("2026-08-02T12:00:00"))).toBe(l);
  });
});

describe("EMI notice events", () => {
  it("emits an upcoming event exactly one India-calendar day before the due date", () => {
    const l = loan();
    expect(emiNotice(l, india("2026-08-01T12:00:00"))).toBeNull();
    expect(emiNotice(l, india("2026-08-02T00:00:00"))).toEqual({
      key: "loan-1:2026-08:upcoming",
      period: "2026-08",
      kind: "upcoming",
      dueCount: 1,
    });
  });

  it("handles a day-one pre-due event across the year boundary", () => {
    const l = loan({ dueDay: 1, lastPaidMonth: "2025-12" });
    expect(emiNotice(l, india("2025-12-31T12:00:00"))).toEqual({
      key: "loan-1:2026-01:upcoming",
      period: "2026-01",
      kind: "upcoming",
      dueCount: 1,
    });
  });

  it("emits one due event with the arrears count and newest due period", () => {
    const l = loan({ lastPaidMonth: "2026-05" });
    expect(emiNotice(l, india("2026-08-03T12:00:00"))).toEqual({
      key: "loan-1:2026-08:due",
      period: "2026-08",
      kind: "due",
      dueCount: 3,
    });
  });

  it("deduplicates an exact upcoming or due key", () => {
    const upcoming = loan({ lastEmiReminder: "loan-1:2026-08:upcoming" });
    expect(emiNotice(upcoming, india("2026-08-02T12:00:00"))).toBeNull();

    const due = loan({ lastEmiReminder: "loan-1:2026-08:due" });
    expect(emiNotice(due, india("2026-08-03T12:00:00"))).toBeNull();
  });

  it("allows the due event after an upcoming event for the same period", () => {
    const l = loan({ lastEmiReminder: "loan-1:2026-08:upcoming" });
    expect(emiNotice(l, india("2026-08-03T12:00:00"))).toEqual({
      key: "loan-1:2026-08:due",
      period: "2026-08",
      kind: "due",
      dueCount: 1,
    });
  });

  it("still emits the next pre-due event when earlier EMIs are in arrears", () => {
    const l = loan({ lastPaidMonth: "2026-07" });
    expect(emiNotice(l, india("2026-09-02T12:00:00"))).toEqual({
      key: "loan-1:2026-09:upcoming",
      period: "2026-09",
      kind: "upcoming",
      dueCount: 2,
    });
    expect(
      emiNotice({ ...l, lastEmiReminder: "loan-1:2026-09:upcoming" }, india("2026-09-02T12:00:00")),
    ).toBeNull();
  });

  it("clamps out-of-range due days to the supported 1-28 window", () => {
    const l = loan({ dueDay: 31, lastPaidMonth: "2026-07" });
    expect(emiNotice(l, india("2026-08-27T12:00:00"))?.kind).toBe("upcoming");
    expect(pendingEmis(l, india("2026-08-28T00:00:00"))).toEqual(["2026-08"]);
  });
});
