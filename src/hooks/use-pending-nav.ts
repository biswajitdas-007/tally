"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Tracks the href a user just tapped so the nav can highlight it *immediately*
 * (before the route finishes), then clears once the route lands.
 */
export function usePendingNav() {
  const pathname = usePathname();
  const [pending, setPending] = useState<string | null>(null);
  useEffect(() => setPending(null), [pathname]);
  return [pending, setPending] as const;
}
