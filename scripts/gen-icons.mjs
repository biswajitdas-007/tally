import sharp from "sharp";
import { writeFileSync, mkdirSync } from "node:fs";

mkdirSync("public", { recursive: true });

const grad = `
  <linearGradient id="g" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
    <stop stop-color="#238063"/><stop offset="1" stop-color="#155741"/>
  </linearGradient>`;

const strokes = `
  <g stroke="#eef3ea" stroke-width="3.1" stroke-linecap="round">
    <line x1="16" y1="15" x2="16" y2="33"/>
    <line x1="21.3" y1="15" x2="21.3" y2="33"/>
    <line x1="26.6" y1="15" x2="26.6" y2="33"/>
    <line x1="31.9" y1="15" x2="31.9" y2="33"/>
  </g>
  <line x1="13" y1="34.5" x2="35" y2="13.5" stroke="#e0b467" stroke-width="3.2" stroke-linecap="round"/>`;

const regular = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><defs>${grad}</defs><rect width="48" height="48" rx="14" fill="url(#g)"/>${strokes}</svg>`;

const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><defs>${grad}</defs><rect width="48" height="48" fill="url(#g)"/><g transform="translate(24 24) scale(0.7) translate(-24 -24)">${strokes}</g></svg>`;

writeFileSync("public/icon.svg", regular);

const jobs = [
  [regular, 192, "public/icon-192.png"],
  [regular, 512, "public/icon-512.png"],
  [maskable, 512, "public/icon-maskable-512.png"],
  [maskable, 180, "public/apple-icon.png"],
  [maskable, 512, "public/og-mark.png"],
];

await Promise.all(
  jobs.map(([svg, size, out]) =>
    sharp(Buffer.from(svg)).resize(size, size).png().toFile(out).then(() => console.log("✓", out)),
  ),
);
