"use client";

import { useState } from "react";
import { cn, DEFAULT_AVATAR_COLOR, initials } from "@/lib/utils";
import type { Person } from "@/lib/types";

const sizeMap = {
  xs: "h-6 w-6 text-[0.6rem]",
  sm: "h-8 w-8 text-[0.7rem]",
  md: "h-10 w-10 text-xs",
  lg: "h-12 w-12 text-sm",
  xl: "h-16 w-16 text-lg",
};

export function Avatar({
  person,
  name,
  color,
  size = "md",
  className,
  ring,
}: {
  person?: Person | null;
  name?: string;
  color?: string;
  size?: keyof typeof sizeMap;
  className?: string;
  ring?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  const label = person?.name ?? name ?? "?";
  const bg = person?.avatarColor ?? color ?? DEFAULT_AVATAR_COLOR;
  const photo = person?.photoURL;
  const showPhoto = Boolean(photo) && !broken;

  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white",
        ring && "ring-2 ring-[var(--surface)]",
        sizeMap[size],
        className,
      )}
      style={{ background: `linear-gradient(140deg, ${bg}, ${bg}cc)` }}
      aria-hidden
    >
      <span className="tracking-wide">{initials(label)}</span>
      {showPhoto && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo}
          alt=""
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={() => setBroken(true)}
          className="absolute inset-0 block h-full w-full object-cover"
        />
      )}
    </div>
  );
}

export function AvatarStack({
  people,
  size = "sm",
  max = 4,
  ringClassName,
}: Readonly<{
  people: Person[];
  size?: keyof typeof sizeMap;
  max?: number;
  /** Ring colour override, to match a coloured background (defaults to the surface). */
  ringClassName?: string;
}>) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <div className="flex items-center">
      {shown.map((p, i) => (
        <div key={p.id} className={cn(i > 0 && "-ml-2.5")} style={{ zIndex: shown.length - i }}>
          <Avatar person={p} size={size} ring className={ringClassName} />
        </div>
      ))}
      {extra > 0 && (
        <div
          className={cn(
            "-ml-2.5 inline-flex items-center justify-center rounded-full bg-surface-inset font-semibold text-text-2 ring-2 ring-[var(--surface)]",
            sizeMap[size],
            ringClassName,
          )}
        >
          +{extra}
        </div>
      )}
    </div>
  );
}
