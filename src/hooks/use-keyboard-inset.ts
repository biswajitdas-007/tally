"use client";

import { useEffect, useState } from "react";

/** Below this, the change is browser chrome hiding rather than a keyboard. */
const KEYBOARD_MIN = 80;

/**
 * How much of the screen the on-screen keyboard is covering.
 *
 * The layout viewport doesn't change when a keyboard opens, but the visual
 * viewport shrinks — the difference is the covered strip. A sheet can then sit
 * above the keyboard instead of underneath it, which is the difference between
 * watching what you type and typing blind.
 */
export function useKeyboardInset(active: boolean): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (!active) {
      setInset(0);
      return;
    }
    const vv = window.visualViewport;
    if (!vv) return;

    const read = () => {
      const covered = window.innerHeight - vv.height - vv.offsetTop;
      setInset(covered > KEYBOARD_MIN ? Math.round(covered) : 0);
    };
    read();
    vv.addEventListener("resize", read);
    vv.addEventListener("scroll", read);
    return () => {
      vv.removeEventListener("resize", read);
      vv.removeEventListener("scroll", read);
    };
  }, [active]);

  return inset;
}
