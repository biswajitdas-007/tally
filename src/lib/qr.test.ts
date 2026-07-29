import { describe, expect, it } from "vitest";
import jsQR from "jsqr";
import { qrBitmap, QUIET } from "./qr";
import { upiPayUri } from "./upi";

/** Reads the bitmap back the way a phone camera would. */
const decode = (text: string, targetPx?: number) => {
  const { px, rgba } = qrBitmap(text, targetPx);
  return jsQR(rgba, px, px)?.data ?? null;
};

describe("qrBitmap", () => {
  it("produces a QR that actually scans back to the URI", () => {
    const uri = upiPayUri({ vpa: "rahul@okhdfcbank", name: "Rahul Sharma", amount: 1250.5, note: "Tally · Goa trip" })!;
    expect(decode(uri)).toBe(uri);
  });

  it("survives the long end of what a settle-up can produce", () => {
    const uri = upiPayUri({
      vpa: "averylongvpahandle.with.dots-and_stuff@okhdfcbank",
      name: "Someone With A Fairly Long Name Indeed",
      amount: 999999.99,
      note: "Tally · A Group Name That Runs Long Too",
    })!;
    expect(decode(uri)).toBe(uri);
  });

  it("still scans at the small end", () => {
    const uri = upiPayUri({ vpa: "me@ybl", amount: 40 })!;
    expect(decode(uri, 120)).toBe(uri);
  });

  it("is square and sized to whole modules", () => {
    const { px, rgba } = qrBitmap("upi://pay?pa=me@ybl&cu=INR", 560);
    expect(rgba).toHaveLength(px * px * 4);
    expect(px).toBeLessThanOrEqual(560);
  });

  it("leaves the quiet zone blank, or scanners can't find the edges", () => {
    const { px, rgba, scale } = qrBitmap("upi://pay?pa=me@ybl&cu=INR", 560);
    const white = (x: number, y: number) => rgba[(y * px + x) * 4] === 255;
    const band = scale * QUIET;
    for (let i = 0; i < band; i++) {
      expect(white(i, i)).toBe(true);
      expect(white(px - 1 - i, px - 1 - i)).toBe(true);
    }
    // ...and there is something drawn just past it.
    expect(white(band, band)).toBe(false);
  });
});
