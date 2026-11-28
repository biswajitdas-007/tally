import { describe, expect, it } from "vitest";
import { DEFAULT_GROUP_ICON, GROUP_ICONS, groupIconEmoji, groupIconKey } from "./group-icons";

describe("group icons", () => {
  it("has unique keys and emoji", () => {
    expect(new Set(GROUP_ICONS.map((i) => i.key)).size).toBe(GROUP_ICONS.length);
    expect(new Set(GROUP_ICONS.map((i) => i.emoji)).size).toBe(GROUP_ICONS.length);
  });

  it("keeps known keys", () => {
    for (const { key } of GROUP_ICONS) expect(groupIconKey(key)).toBe(key);
    expect(groupIconKey(" trip ")).toBe("trip");
  });

  it("maps legacy emoji, with or without variation selectors", () => {
    expect(groupIconKey("🏝️")).toBe("trip");
    expect(groupIconKey("🏝")).toBe("trip");
    expect(groupIconKey("🏠")).toBe("home");
    expect(groupIconKey("🏋️")).toBe("fitness");
    expect(groupIconKey("🏖️")).toBe("trip");
    expect(groupIconKey("☕")).toBe("coffee");
  });

  it("falls back to the default for anything unknown", () => {
    for (const v of ["", null, undefined, "🦄", "<script>", "TRIP"]) expect(groupIconKey(v)).toBe(DEFAULT_GROUP_ICON);
  });

  it("gives emails an emoji", () => {
    expect(groupIconEmoji("trip")).toBe("🏝️");
    expect(groupIconEmoji("🏠")).toBe("🏠");
    expect(groupIconEmoji("🏖️")).toBe("🏖️"); // a legacy emoji is kept, not swapped for its key's emoji
    expect(groupIconEmoji("<b>")).toBe("👥");
    expect(groupIconEmoji("nonsense")).toBe("👥");
  });
});
