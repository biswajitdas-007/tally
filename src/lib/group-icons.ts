/**
 * Group icons. Groups store an icon *key* (e.g. "trip"), rendered as a themed
 * line icon by <GroupIcon>. Groups created before the switch stored an emoji;
 * those map to the matching key, so old data needs no migration. Emails can't
 * render the icons, so they get the emoji back via groupIconEmoji().
 */
export const GROUP_ICONS = [
  { key: "friends", label: "Friends", emoji: "👥" },
  { key: "home", label: "Home", emoji: "🏠" },
  { key: "trip", label: "Trip", emoji: "🏝️" },
  { key: "travel", label: "Travel", emoji: "✈️" },
  { key: "roadtrip", label: "Road trip", emoji: "🚗" },
  { key: "food", label: "Food", emoji: "🍜" },
  { key: "coffee", label: "Coffee", emoji: "☕" },
  { key: "groceries", label: "Groceries", emoji: "🛒" },
  { key: "party", label: "Party", emoji: "🎉" },
  { key: "movies", label: "Movies", emoji: "🎬" },
  { key: "sports", label: "Sports", emoji: "⚽" },
  { key: "fitness", label: "Fitness", emoji: "🏋️" },
  { key: "work", label: "Work", emoji: "💼" },
  { key: "study", label: "Study", emoji: "🎓" },
  { key: "gift", label: "Gift", emoji: "🎁" },
  { key: "couple", label: "Couple", emoji: "❤️" },
] as const;

export type GroupIconKey = (typeof GROUP_ICONS)[number]["key"];

export const DEFAULT_GROUP_ICON: GroupIconKey = "friends";

/** Emoji without variation selectors / ZWJ, so "🏝" and "🏝️" match. */
function bare(s: string): string {
  return s.replace(/\uFE0E|\uFE0F|\u200D/g, "");
}

const BY_KEY = new Map<string, (typeof GROUP_ICONS)[number]>(GROUP_ICONS.map((i) => [i.key, i]));

const BY_EMOJI = new Map<string, GroupIconKey>([
  ...GROUP_ICONS.map((i) => [bare(i.emoji), i.key] as const),
  // Other emoji older clients or copy have used.
  [bare("🏖️"), "trip"],
  [bare("🍕"), "food"],
  [bare("🍽️"), "food"],
  [bare("🏡"), "home"],
  [bare("🎂"), "party"],
  [bare("🧳"), "travel"],
]);

/** The icon key for whatever a group has stored: a key, a legacy emoji, or nothing. */
export function groupIconKey(icon: string | null | undefined): GroupIconKey {
  const value = (icon ?? "").trim();
  const known = BY_KEY.get(value);
  if (known) return known.key;
  return BY_EMOJI.get(bare(value)) ?? DEFAULT_GROUP_ICON;
}

/**
 * The emoji for a group icon, for plain-text and email surfaces. A legacy
 * emoji the group already has is kept as-is; a key becomes its emoji.
 */
export function groupIconEmoji(icon: string | null | undefined): string {
  const value = (icon ?? "").trim();
  if (BY_EMOJI.has(bare(value))) return value;
  return (BY_KEY.get(groupIconKey(value)) ?? GROUP_ICONS[0]).emoji;
}
