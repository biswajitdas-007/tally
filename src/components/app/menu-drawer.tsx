"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Contact, Activity, UserRound, Palette, UserPlus, LogOut, ChevronRight, Coffee } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Segmented } from "@/components/ui/segmented";
import { useUI } from "@/store/useUI";
import { useMe } from "@/store/useStore";
import { useAuth } from "@/hooks/use-auth";
import { useTheme, type ThemeChoice } from "@/components/theme-provider";
import { APP_VERSION } from "@/lib/version";

const MORE = [
  { href: "/friends", label: "Friends", icon: Contact },
  { href: "/activity", label: "Activity", icon: Activity },
];

function DrawerLink({ href, label, icon: Icon, onNavigate }: { href: string; label: string; icon: typeof Contact; onNavigate: () => void }) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-[0.92rem] font-medium text-text-2 transition-colors hover:bg-surface-inset hover:text-text active:scale-[0.99]"
    >
      <Icon className="h-[19px] w-[19px] text-text-3" strokeWidth={2} />
      <span className="flex-1">{label}</span>
      <ChevronRight className="h-4 w-4 text-text-3" />
    </Link>
  );
}

export function MenuDrawer() {
  const open = useUI((s) => s.menuOpen);
  const close = useUI((s) => s.closeMenu);
  const openInvite = useUI((s) => s.openInvite);
  const openSupport = useUI((s) => s.openSupport);
  const me = useMe();
  const { logout } = useAuth();
  const { choice, setChoice } = useTheme();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Lock scroll + Escape to close while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <motion.div
            className="absolute inset-0"
            style={{ background: "var(--scrim)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            onClick={close}
          />
          <motion.aside
            className="absolute inset-y-0 left-0 flex w-[84%] max-w-[320px] flex-col border-r border-border bg-surface shadow-[var(--shadow-lg)]"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 34, mass: 0.9 }}
          >
            {/* Profile */}
            <Link
              href="/account"
              onClick={close}
              className="flex items-center gap-3 border-b border-border px-5 pb-4 pt-[calc(env(safe-area-inset-top)+18px)] transition-colors hover:bg-surface-inset"
            >
              <Avatar person={me} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-[1.02rem] font-bold text-text">{me?.name ?? "You"}</p>
                <p className="truncate text-[0.78rem] text-text-3">{me?.email ?? "Signed in"}</p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-text-3" />
            </Link>

            {/* Sections */}
            <div className="flex-1 overflow-y-auto px-3 py-3">
              <p className="px-3 pb-1.5 pt-1 text-[0.66rem] font-semibold uppercase tracking-[0.09em] text-text-3">More</p>
              {MORE.map((item) => (
                <DrawerLink key={item.href} href={item.href} label={item.label} icon={item.icon} onNavigate={close} />
              ))}

              <div className="mx-3 my-2.5 h-px bg-border" />

              <p className="px-3 pb-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.09em] text-text-3">Settings</p>
              <DrawerLink href="/account" label="Account & profile" icon={UserRound} onNavigate={close} />
              <div className="px-3 pb-1 pt-2">
                <div className="mb-2 flex items-center gap-3 text-text-2">
                  <Palette className="h-[19px] w-[19px] text-text-3" strokeWidth={2} />
                  <span className="text-[0.92rem] font-medium">Appearance</span>
                </div>
                <Segmented<ThemeChoice>
                  value={choice}
                  onChange={setChoice}
                  className="w-full"
                  options={[
                    { value: "light", label: "Light" },
                    { value: "dark", label: "Dark" },
                    { value: "system", label: "System" },
                  ]}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-col gap-1 border-t border-border px-3 pb-[max(env(safe-area-inset-bottom),14px)] pt-2">
              <button
                onClick={() => {
                  close();
                  openSupport();
                }}
                className="flex items-center gap-3 rounded-[12px] bg-brass-soft px-3 py-2.5 text-[0.92rem] font-semibold text-brass-on-soft transition-all hover:brightness-[0.98]"
              >
                <Coffee className="h-[19px] w-[19px]" strokeWidth={2} />
                Support Tally ☕
              </button>
              <button
                onClick={() => {
                  openInvite(null);
                  close();
                }}
                className="flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-[0.92rem] font-semibold text-brand transition-colors hover:bg-surface-inset"
              >
                <UserPlus className="h-[19px] w-[19px]" strokeWidth={2} />
                Invite a friend
              </button>
              <button
                onClick={() => {
                  close();
                  logout();
                }}
                className="flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-[0.92rem] font-semibold text-negative transition-colors hover:bg-negative-soft"
              >
                <LogOut className="h-[19px] w-[19px]" strokeWidth={2} />
                Sign out
              </button>
              <span className="px-3 pb-1 pt-1 text-[0.72rem] text-text-3">Tally · v{APP_VERSION}</span>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
