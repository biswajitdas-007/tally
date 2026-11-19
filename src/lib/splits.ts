import { splitEqually } from "./utils";

/**
 * Whether saved shares are what an equal split of `total` would produce, so an
 * edited expense reopens in the mode it was saved in. Order doesn't matter —
 * which person got the spare paisa isn't a meaningful difference.
 */
export function isEqualSplit(total: number, amounts: number[]): boolean {
  const expected = splitEqually(total, amounts.length).sort((a, b) => a - b);
  const actual = [...amounts].sort((a, b) => a - b);
  return actual.every((v, i) => Math.abs(v - expected[i]) < 0.005);
}
