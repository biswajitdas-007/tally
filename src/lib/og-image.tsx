import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { BRAND_COLORS, markSvg } from "@/lib/brand";

/** Shared Open Graph / Twitter card: 1200×630, brand lockup + headline. */
export const SOCIAL_IMAGE_SIZE = { width: 1200, height: 630 };
export const SOCIAL_IMAGE_ALT = "Tally — split anything, settle in seconds over UPI";

// Static TTF subsets (ImageResponse can't read woff2); read once at module scope.
const fontDir = join(process.cwd(), "src/app/fonts/og");
const fonts = Promise.all([
  readFile(join(fontDir, "instrument-sans-bold.ttf")),
  readFile(join(fontDir, "instrument-serif-italic.ttf")),
]);

const markDataUri = `data:image/svg+xml;base64,${Buffer.from(markSvg({ size: 120 })).toString("base64")}`;

export async function renderSocialImage(): Promise<ImageResponse> {
  const [sans, serif] = await fonts;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: BRAND_COLORS.ink,
          color: BRAND_COLORS.white,
          fontFamily: "Instrument Sans",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- rendered by ImageResponse, not the browser */}
          <img src={markDataUri} width={96} height={96} alt="" />
          <span style={{ fontSize: 76, letterSpacing: "-0.05em" }}>tally</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 92, lineHeight: 1, letterSpacing: "-0.045em" }}>Split anything.</div>
          <div style={{ display: "flex", fontSize: 92, lineHeight: 1, letterSpacing: "-0.045em" }}>
            <span style={{ fontFamily: "Instrument Serif", fontStyle: "italic", color: "#ff5c93", letterSpacing: "-0.01em" }}>
              Settle
            </span>
            <span>&nbsp;in seconds.</span>
          </div>
          <div style={{ fontSize: 32, color: "#c9c5e6", marginTop: 14 }}>
            Track who owes whom, then settle up over UPI.
          </div>
        </div>
      </div>
    ),
    {
      ...SOCIAL_IMAGE_SIZE,
      fonts: [
        { name: "Instrument Sans", data: sans, weight: 700, style: "normal" },
        { name: "Instrument Serif", data: serif, weight: 400, style: "italic" },
      ],
    },
  );
}
