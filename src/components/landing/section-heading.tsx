import { cn } from "@/lib/utils";

/** The landing's section headline: large display type, tight tracking. */
export function SectionHeading({
  children,
  size = "md",
  className,
}: Readonly<{
  children: React.ReactNode;
  size?: "md" | "lg";
  className?: string;
}>) {
  return (
    <h2
      className={cn(
        "font-display font-bold tracking-[-0.04em] text-balance",
        // Line height lives in the size class: tailwind-merge drops a separate
        // leading-* when a font size follows it.
        size === "lg" ? "text-[clamp(2.2rem,6vw,4rem)]/[1.02]" : "text-[clamp(2.2rem,5vw,3.75rem)]/[1.02]",
        className,
      )}
    >
      {children}
    </h2>
  );
}
