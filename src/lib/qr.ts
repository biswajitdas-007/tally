import { encode } from "uqr";

/** Blank modules around the code. Below 4 a scanner can't find the edges. */
export const QUIET = 4;

export interface QrBitmap {
  /** Width and height in pixels — a QR is always square. */
  px: number;
  /** RGBA, row-major, black modules on white. Backed by a plain ArrayBuffer so
   *  it can go straight into an ImageData without a copy. */
  rgba: Uint8ClampedArray<ArrayBuffer>;
  /** Pixels per module. */
  scale: number;
}

/**
 * Rasterises a QR to raw pixels: black on white, quiet zone included.
 *
 * Kept out of the component and free of canvas so it can be decoded in a test —
 * a QR that draws but doesn't scan looks exactly like one that works.
 */
export function qrBitmap(text: string, targetPx = 560): QrBitmap {
  const { size, data } = encode(text, { ecc: "M", border: QUIET });
  // Whole pixels per module, so none straddles a boundary and blurs.
  const scale = Math.max(1, Math.floor(targetPx / size));
  const px = size * scale;

  const rgba = new Uint8ClampedArray(px * px * 4).fill(255);
  for (let my = 0; my < size; my++) {
    for (let mx = 0; mx < size; mx++) {
      if (!data[my][mx]) continue;
      for (let y = my * scale; y < (my + 1) * scale; y++) {
        for (let x = mx * scale; x < (mx + 1) * scale; x++) {
          const i = (y * px + x) * 4;
          rgba[i] = 0;
          rgba[i + 1] = 0;
          rgba[i + 2] = 0;
        }
      }
    }
  }
  return { px, rgba, scale };
}
