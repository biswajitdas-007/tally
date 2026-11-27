/**
 * Regenerates every raster/vector icon from the mark defined in src/lib/brand.ts.
 *
 *   npm run brand:icons
 *
 * Writes:
 *   public/icon.svg               rounded app tile (browser tab icon)
 *   public/icon-192.png           rounded tile, PWA "any"
 *   public/icon-512.png           rounded tile, PWA "any"
 *   public/icon-maskable-512.png  full-bleed square, mark inside the 80% safe zone
 *   public/apple-icon.png         180px full-bleed square (iOS rounds it)
 *   src/app/favicon.ico           16/32/48px rounded tile
 */
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { markSvg, type MarkSvgOptions } from "../../src/lib/brand";

const root = join(__dirname, "..", "..");

async function png(px: number, opts: MarkSvgOptions): Promise<Buffer> {
  // Render the SVG at the target size so edges stay crisp at every resolution.
  return sharp(Buffer.from(markSvg({ ...opts, size: px })))
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** Pack PNG images into a .ico container (PNG-in-ICO, supported by every current browser). */
function ico(images: { px: number; data: Buffer }[]): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);

  const entries: Buffer[] = [];
  let offset = 6 + 16 * images.length;
  for (const { px, data } of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(px >= 256 ? 0 : px, 0); // width (0 means 256)
    entry.writeUInt8(px >= 256 ? 0 : px, 1); // height
    entry.writeUInt8(0, 2); // palette size
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += data.length;
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

async function main() {
  const out = (rel: string) => join(root, rel);

  await writeFile(out("public/icon.svg"), `${markSvg({ tile: "rounded" })}\n`);
  await writeFile(out("public/icon-192.png"), await png(192, { tile: "rounded" }));
  await writeFile(out("public/icon-512.png"), await png(512, { tile: "rounded" }));
  // Maskable icons get cropped to a circle or squircle: keep the mark within the
  // central 80% (the platform's safe zone).
  await writeFile(out("public/icon-maskable-512.png"), await png(512, { tile: "square", scale: 0.72 }));
  await writeFile(out("public/apple-icon.png"), await png(180, { tile: "square", scale: 0.82 }));

  const favicon = await Promise.all(
    [16, 32, 48].map(async (px) => ({ px, data: await png(px, { tile: "rounded" }) })),
  );
  await writeFile(out("src/app/favicon.ico"), ico(favicon));

  console.log("Brand icons regenerated.");
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
