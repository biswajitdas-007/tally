import { describe, expect, it } from "vitest";
import { FALLBACK_GROUP_COLOR, groupFill, safeGroupColor } from "./group-colour";

describe("safeGroupColor", () => {
  it("keeps the category tokens the picker stores", () => {
    expect(safeGroupColor("var(--cat-travel)")).toBe("var(--cat-travel)");
    expect(safeGroupColor(" var(--cat-rent) ")).toBe("var(--cat-rent)");
  });

  it("falls back for unknown tokens, raw colours and anything that could break out of CSS", () => {
    for (const bad of [
      "var(--cat-zzz)",
      "#ffff00",
      "#000080",
      "red",
      "var(--brand)",
      "url(https://example.com/x.png)",
      "var(--cat-food)); background: url(x)",
      "",
      null,
      undefined,
    ]) {
      expect(safeGroupColor(bad)).toBe(FALLBACK_GROUP_COLOR);
    }
  });
});

describe("groupFill", () => {
  it("shades the safe colour toward ink by --tile-shade", () => {
    expect(groupFill("var(--cat-rent)")).toBe("color-mix(in oklab, var(--cat-rent), #17123a var(--tile-shade))");
    expect(groupFill("expression(alert(1))")).toContain(FALLBACK_GROUP_COLOR);
  });
});
