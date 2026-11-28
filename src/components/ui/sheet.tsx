"use client";

import { useRef } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsDesktop } from "@/hooks/use-media-query";
import { ScrollLock } from "@/components/ui/scroll-lock";
import { useVisualViewport } from "@/hooks/use-visual-viewport";

const EASE_IN: [number, number, number, number] = [0.32, 0, 0.67, 0];

/** Slide up from the bottom on phones; fade and settle in the centre on desktop. */
function panelMotion(isDesktop: boolean) {
  return isDesktop
    ? {
        initial: { opacity: 0, scale: 0.96, y: 8 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.97, y: 6, transition: { duration: 0.15, ease: "easeIn" as const } },
      }
    : {
        initial: { y: "100%" },
        animate: { y: 0 },
        exit: { y: "100%", transition: { duration: 0.24, ease: EASE_IN } },
      };
}

/**
 * Tally's bottom sheet (a centred dialog on desktop), built on Base UI Dialog
 * parts: they bring the focus trap, focus return, Escape, hiding the page
 * from assistive tech while open, and the title/description wiring. On top of
 * that it keeps three things of its own:
 *
 * - the iOS keyboard fit: the viewport follows the *visual* viewport, so the
 *   sheet stays above the keys and below the notch;
 * - drag-to-dismiss on phones;
 * - the iOS-safe <ScrollLock>, inside the AnimatePresence subtree so it holds
 *   until the exit animation has finished. Base UI's own modal lock sees the
 *   page is already pinned and stands aside.
 */
export function Sheet({
  open,
  onClose,
  children,
  title,
  description,
  className,
  dismissable = true,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
  dismissable?: boolean;
}>) {
  const isDesktop = useIsDesktop();
  const vp = useVisualViewport(open && !isDesktop);
  const keyboard = vp.keyboard;
  const popupRef = useRef<HTMLDivElement>(null);

  return (
    <Dialog.Root
      open={open}
      modal
      disablePointerDismissal={!dismissable}
      onOpenChange={(next) => {
        if (!next && dismissable) onClose();
      }}
    >
      <AnimatePresence>
        {open && (
          <Dialog.Portal keepMounted>
            {/* Holds the page still until the sheet has finished sliding away. */}
            <ScrollLock />
            {/* AnimatePresence owns unmounting. Base UI would otherwise hide each
                part as soon as it stops seeing CSS/WAAPI animations — and motion's
                JS-driven slide is invisible to it, so the sheet would just vanish. */}
            <Dialog.Backdrop
              hidden={false}
              className="fixed inset-0 z-50"
              style={{ background: "var(--scrim)" }}
              render={
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.2, ease: "easeIn" } }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                />
              }
            />
            {/* With a keyboard up the visible area both shrinks and slides down the
                layout viewport; matching it keeps the sheet off the keys and its
                top out from under the notch. */}
            <Dialog.Viewport
              hidden={false}
              className="pointer-events-none fixed inset-0 z-50 flex justify-center md:items-center"
              style={keyboard > 0 ? { top: vp.top, height: vp.height, bottom: "auto" } : undefined}
            >
              <Dialog.Popup
                hidden={false}
                ref={popupRef}
                // Focus the panel itself: it moves focus into the dialog without
                // popping the phone keyboard open over a field. The panel isn't a
                // control, so it draws no focus ring (everything inside still does).
                initialFocus={popupRef}
                aria-modal="true"
                className={cn(
                  // Height is capped against whatever space is left — the viewport
                  // already stops short of the keyboard — minus the top safe-area
                  // inset, so the sheet never rides up under the notch.
                  // The content stays mounted while it slides away; data-closed (Base
                  // UI reads the live state from context, unlike the props AnimatePresence
                  // replays here) stops a second tap on its primary action landing then.
                  "pointer-events-auto data-closed:pointer-events-none relative mt-auto flex outline-none w-full max-h-[calc(100%-var(--overlay-top))] flex-col overflow-hidden border border-border bg-surface shadow-[var(--shadow-lg)]",
                  "rounded-t-[26px] md:mt-0 md:max-h-[88vh] md:max-w-[440px] md:rounded-[24px]",
                  className,
                )}
                render={
                  <motion.div
                    {...panelMotion(isDesktop)}
                    transition={{ type: "spring", stiffness: 340, damping: 34, mass: 0.9 }}
                    drag={isDesktop || !dismissable || keyboard > 0 ? false : "y"}
                    dragConstraints={{ top: 0, bottom: 0 }}
                    dragElastic={{ top: 0, bottom: 0.6 }}
                    onDragEnd={(_, info) => {
                      if (info.offset.y > 120 || info.velocity.y > 600) onClose();
                    }}
                  />
                }
              >
                <SheetHeader title={title} description={description} dismissable={dismissable} isDesktop={isDesktop} />
                <div
                  // With a <SheetFooter>, scroll padding keeps a focused field from
                  // ending up underneath it.
                  className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-2 pb-[var(--sheet-pb)] has-[[data-slot=sheet-footer]]:scroll-pb-28"
                  // The bottom padding is a variable so <SheetFooter> can sit flush over it.
                  style={{ "--sheet-pb": keyboard ? "1rem" : "max(var(--safe-bottom), 20px)" } as React.CSSProperties}
                >
                  {children}
                </div>
              </Dialog.Popup>
            </Dialog.Viewport>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

/** Grab handle (phones), title, description and the close button. */
function SheetHeader({
  title,
  description,
  dismissable,
  isDesktop,
}: Readonly<{ title?: string; description?: string; dismissable: boolean; isDesktop: boolean }>) {
  return (
    <>
      {!isDesktop && dismissable && (
        <div aria-hidden className="flex justify-center pt-2.5">
          <div className="h-1.5 w-10 rounded-full bg-border-strong" />
        </div>
      )}
      {(title || dismissable) && (
        <div className="flex items-start justify-between gap-3 px-5 pt-3.5 pb-1">
          <div className="min-w-0">
            {title && <Dialog.Title className="text-xl font-semibold text-text">{title}</Dialog.Title>}
            {description && <Dialog.Description className="mt-0.5 text-sm text-text-2">{description}</Dialog.Description>}
          </div>
          {dismissable && (
            <Dialog.Close
              aria-label="Close"
              render={<Button variant="ghost" size="icon-sm" className="-mt-0.5 -mr-1 rounded-full text-text-3" />}
            >
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          )}
        </div>
      )}
    </>
  );
}

/**
 * A bar pinned to the bottom of a sheet's scroll area (primary actions). It
 * cancels the area's bottom padding so nothing scrolls into a gap beneath it,
 * and carries that padding itself to clear the home indicator.
 */
export function SheetFooter({ children, className }: Readonly<{ children: React.ReactNode; className?: string }>) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn(
        "sticky -bottom-[var(--sheet-pb)] -mx-5 -mb-[var(--sheet-pb)] border-t border-border bg-surface px-5 pt-3 pb-[var(--sheet-pb)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
