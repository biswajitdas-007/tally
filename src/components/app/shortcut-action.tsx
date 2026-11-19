"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@/store/useStore";

type Shortcut = "add" | "settle";
const isShortcut = (a: string | null): a is Shortcut => a === "add" || a === "settle";

/**
 * Runs what an installed-app shortcut asked for (`/?action=add|settle`). Waits
 * for the user's data so "Settle up" sees real balances on a cold start, runs
 * once, then drops the parameter so a refresh doesn't repeat it.
 */
export function ShortcutAction({ onAdd, onSettle }: { onAdd: () => void; onSettle: () => void }) {
  const action = useSearchParams().get("action");
  const router = useRouter();
  const dataReady = useStore((s) => s.dataReady);
  const handled = useRef(false);

  useEffect(() => {
    const ready = dataReady && !handled.current;
    if (!ready || !isShortcut(action)) return;
    handled.current = true;
    if (action === "add") onAdd();
    else onSettle();
    router.replace("/", { scroll: false });
  }, [action, dataReady, onAdd, onSettle, router]);

  return null;
}
