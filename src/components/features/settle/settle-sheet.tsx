"use client";

import { useEffect } from "react";
import { Sheet } from "@/components/ui/sheet";
import { useStore, useMyId } from "@/store/useStore";
import { useUI } from "@/store/useUI";
import { SettleForm } from "./settle-form";

/**
 * The settle up sheet. The target stays in the store after closing, so the
 * content is still there while the sheet slides away; the form inside is keyed
 * per open, so it always starts fresh.
 */
export function SettleSheet() {
  const open = useUI((s) => s.settleOpen);
  const target = useUI((s) => s.settle);
  const session = useUI((s) => s.settleSession);
  const close = useUI((s) => s.closeSettle);
  const myId = useMyId();
  const person = useStore((s) => (target ? (s.people.find((p) => p.id === target.personId) ?? null) : null));
  const ready = Boolean(person && myId);

  // Nobody to settle with (or not signed in): stand down instead of staying
  // "open" and popping up on its own once the data turns up later.
  useEffect(() => {
    if (open && !ready) close();
  }, [open, ready, close]);

  return (
    <Sheet open={open && ready} onClose={close} title="Settle up">
      {target && person && myId && <SettleForm key={session} target={target} person={person} myId={myId} onDone={close} />}
    </Sheet>
  );
}
