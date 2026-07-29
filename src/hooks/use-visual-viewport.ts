"use client";

import { useEffect, useState } from "react";

/** Below this, the change is browser chrome hiding rather than a keyboard. */
const KEYBOARD_MIN = 80;

export interface ViewportBox {
  /** Where the visible area starts, measured from the top of the layout viewport. */
  top: number;
  /** How tall the visible area is. */
  height: number;
  /** How much of the screen the on-screen keyboard covers, 0 when there's none. */
  keyboard: number;
}

const NONE: ViewportBox = { top: 0, height: 0, keyboard: 0 };

/**
 * Where the user can actually see, as opposed to where the page thinks it is.
 *
 * Opening a keyboard doesn't resize the layout viewport — it shrinks the
 * *visual* one, and on iOS it also scrolls it down inside the layout viewport.
 * A `position: fixed` overlay is placed against the layout viewport, so it ends
 * up shifted up by that scroll and its top slides under the notch. Measuring
 * both the offset and the height lets an overlay sit exactly over what's
 * visible instead.
 */
export function useVisualViewport(active: boolean): ViewportBox {
  const [box, setBox] = useState<ViewportBox>(NONE);

  useEffect(() => {
    if (!active) {
      setBox(NONE);
      return;
    }
    const vv = window.visualViewport;
    if (!vv) return;

    const read = () => {
      const covered = window.innerHeight - vv.height - vv.offsetTop;
      setBox({
        top: Math.round(vv.offsetTop),
        height: Math.round(vv.height),
        keyboard: covered > KEYBOARD_MIN ? Math.round(covered) : 0,
      });
    };
    read();
    vv.addEventListener("resize", read);
    vv.addEventListener("scroll", read);
    return () => {
      vv.removeEventListener("resize", read);
      vv.removeEventListener("scroll", read);
    };
  }, [active]);

  return box;
}
