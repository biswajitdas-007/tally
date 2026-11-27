"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Tracks the href a user just tapped so the nav can highlight it *immediately*
 * (before the route finishes), then clears once the route lands.
 */
export function usePendingNav() {
  const pathname = usePathname();
  const [pending, setPending] = useState<string | null>(null);
  const [prevPath, setPrevPath] = useState(pathname);

  // Any route change (tap, back button, redirect) makes the tap stale: clear it in render.
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    setPending(null);
  }

  return [pending, setPending] as const;
}
