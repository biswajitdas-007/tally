import { cn, initials } from "@/lib/utils";
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
  const label = person?.name ?? name ?? "?";
  const bg = person?.avatarColor ?? color ?? "#1c6b52";
  const photo = person?.photoURL;

  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white",
        ring && "ring-2 ring-[var(--surface)]",
        sizeMap[size],
        className,
      )}
      style={{ background: photo ? undefined : `linear-gradient(140deg, ${bg}, ${bg}cc)` }}
      aria-hidden
    >
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="tracking-wide">{initials(label)}</span>
      )}
    </div>
  );
}

export function AvatarStack({
  people,
  size = "sm",
  max = 4,
}: {
  people: Person[];
  size?: keyof typeof sizeMap;
  max?: number;
}) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <div className="flex items-center">
      {shown.map((p, i) => (
        <div key={p.id} className={cn(i > 0 && "-ml-2.5")} style={{ zIndex: shown.length - i }}>
          <Avatar person={p} size={size} ring />
        </div>
      ))}
      {extra > 0 && (
        <div
          className={cn(
            "-ml-2.5 inline-flex items-center justify-center rounded-full bg-surface-inset font-semibold text-text-2 ring-2 ring-[var(--surface)]",
            sizeMap[size],
          )}
        >
          +{extra}
        </div>
      )}
    </div>
  );
}
