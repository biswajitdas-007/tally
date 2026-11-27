"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { isPreviewSession } from "@/lib/preview";

const noopSubscribe = () => () => {};

/** Marks a dev preview session so sample data is never mistaken for a real account. */
export function PreviewBadge() {
  const active = useSyncExternalStore(noopSubscribe, isPreviewSession, () => false);
  if (!active) return null;
  return (
    <Link
      href="/dev/preview"
      className="fixed bottom-[calc(var(--safe-bottom)+104px)] right-4 z-10 inline-flex items-center gap-1.5 rounded-full border border-violet bg-violet-soft px-3 py-1.5 text-xs font-semibold text-violet-on-soft shadow-[var(--shadow-md)] md:bottom-6"
    >
      <FlaskConical aria-hidden className="size-3.5" />
      Preview · sample data
    </Link>
  );
}
