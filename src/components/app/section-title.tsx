import Link from "next/link";

/** A screen section heading with an optional "See all" link (v1 style). */
export function SectionTitle({
  id,
  title,
  href,
  linkLabel = "See all",
}: Readonly<{ id: string; title: string; href?: string; linkLabel?: string }>) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 id={id} className="text-xl font-semibold tracking-[-0.02em] text-text">
        {title}
      </h2>
      {href && (
        <Link
          href={href}
          aria-describedby={id}
          className="rounded-md text-sm font-bold text-brand-on-soft hover:underline underline-offset-4"
        >
          {linkLabel}
        </Link>
      )}
    </div>
  );
}
