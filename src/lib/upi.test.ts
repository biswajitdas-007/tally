import { describe, expect, it } from "vitest";
import { isValidVpa, upiPayUri } from "./upi";

const params = (uri: string) => Object.fromEntries(new URLSearchParams(uri.split("?")[1]));

describe("isValidVpa", () => {
  it.each(["someone@okhdfcbank", "a.b-c_1@ybl", "9876543210@paytm"])("accepts %s", (v) => {
    expect(isValidVpa(v)).toBe(true);
  });

  it.each(["", "@ybl", "nobank@", "no-at-sign", "sp ace@ybl", "someone@ybl1", "someone@@ybl"])("rejects %s", (v) => {
    expect(isValidVpa(v)).toBe(false);
  });

  it("ignores surrounding whitespace", () => {
    expect(isValidVpa("  someone@okhdfcbank  ")).toBe(true);
  });
});

describe("upiPayUri", () => {
  it("builds the URI a UPI app expects", () => {
    const uri = upiPayUri({ vpa: "rahul@okhdfcbank", name: "Rahul", amount: 1250.5, note: "Goa trip" })!;
    expect(uri.startsWith("upi://pay?")).toBe(true);
    expect(params(uri)).toEqual({ pa: "rahul@okhdfcbank", pn: "Rahul", am: "1250.50", cu: "INR", tn: "Goa trip" });
  });

  it("always writes the amount to two decimals", () => {
    expect(params(upiPayUri({ vpa: "me@ybl", amount: 40 })!).am).toBe("40.00");
    expect(params(upiPayUri({ vpa: "me@ybl", amount: 40.567 })!).am).toBe("40.57");
  });

  it("refuses an invalid VPA rather than making a QR nobody can pay", () => {
    expect(upiPayUri({ vpa: "not-a-vpa", amount: 100 })).toBeNull();
    expect(upiPayUri({ vpa: "", amount: 100 })).toBeNull();
  });

  it("leaves the amount out when there isn't a real one", () => {
    for (const amount of [0, -50, NaN, Infinity, undefined]) {
      expect(upiPayUri({ vpa: "me@ybl", amount })).not.toContain("am=");
    }
  });

  it("leaves the @ in the VPA bare, the way every real UPI QR writes it", () => {
    const uri = upiPayUri({ vpa: "rahul@okhdfcbank", amount: 100 })!;
    expect(uri).toContain("pa=rahul@okhdfcbank");
    expect(uri).not.toContain("%40");
  });

  it("percent-encodes spaces, because not every app reads + as one", () => {
    const uri = upiPayUri({ vpa: "me@ybl", name: "Priya Sharma" })!;
    expect(uri).toContain("pn=Priya%20Sharma");
    expect(uri).not.toContain("+");
  });

  it("escapes characters that would end the parameter early", () => {
    const uri = upiPayUri({ vpa: "me@ybl", name: "Tom & Jerry", note: "50% split #2" })!;
    expect(params(uri).pn).toBe("Tom & Jerry");
    expect(params(uri).tn).toBe("50% split #2");
  });

  it("truncates to NPCI's 50-character limit", () => {
    const uri = upiPayUri({ vpa: "me@ybl", name: "x".repeat(80), note: "y".repeat(80) })!;
    expect(params(uri).pn).toHaveLength(50);
    expect(params(uri).tn).toHaveLength(50);
  });

  it("omits empty optional fields instead of sending blanks", () => {
    const uri = upiPayUri({ vpa: "me@ybl", name: "   ", note: "" })!;
    expect(uri).not.toContain("pn=");
    expect(uri).not.toContain("tn=");
    expect(params(uri)).toEqual({ pa: "me@ybl", cu: "INR" });
  });
});
