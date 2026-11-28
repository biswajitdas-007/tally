import { cn } from "@/lib/utils";
import { SectionHeading } from "./section-heading";

/** A headline + copy beside a visual; `reverse` puts the visual first on wide screens. */
export function FeatureSplit({
  id,
  title,
  body,
  link,
  visual,
  reverse,
}: {
  id: string;
  title: React.ReactNode;
  body: string;
  link: { href: string; label: string };
  visual: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <section
      id={id}
      className={cn("mx-auto flex max-w-6xl flex-wrap items-center gap-12 px-5 py-16 md:px-6 md:py-20", reverse && "md:flex-row-reverse")}
    >
      <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-5">
        <SectionHeading className="text-text">{title}</SectionHeading>
        <p className="max-w-[29rem] text-lg leading-relaxed text-text-2">{body}</p>
        <a href={link.href} className="self-start rounded-[10px] py-2 text-base font-semibold text-brand-on-soft hover:underline">
          {link.label} <span aria-hidden>→</span>
        </a>
      </div>
      <div className="flex flex-[1_1_420px] justify-center">{visual}</div>
    </section>
  );
}
