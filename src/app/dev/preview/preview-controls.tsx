"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { FlaskConical, Moon, Monitor, Play, Square, Sun } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { TallyLogo } from "@/components/app/logo";
import { useTheme, type ThemeChoice } from "@/components/theme-provider";
import { isPreviewSession, startPreviewSession, stopPreviewSession } from "@/lib/preview";

const SCREENS = [
  { href: "/", label: "Home" },
  { href: "/groups", label: "Ledgers" },
  { href: "/groups/preview_goa", label: "Group detail" },
  { href: "/direct", label: "Direct splits" },
  { href: "/friends", label: "Friends" },
  { href: "/activity", label: "Activity" },
  { href: "/analytics", label: "Insights" },
  { href: "/account", label: "Account" },
  { href: "/offline", label: "Offline" },
];

const THEMES: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

const noopSubscribe = () => () => {};

export function PreviewControls() {
  const active = useSyncExternalStore(noopSubscribe, isPreviewSession, () => false);
  const { choice, setChoice } = useTheme();

  // A full page load (not client navigation) so the store, auth and sync all
  // restart in the new mode.
  const reloadHome = () => window.location.assign(new URL("/", window.location.origin).href);
  const start = () => {
    startPreviewSession();
    reloadHome();
  };
  const stop = () => {
    stopPreviewSession();
    reloadHome();
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-8 px-5 py-12">
      <TallyLogo size={32} />
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-bold">
          Preview <span className="font-accent">mode</span>
        </h1>
        <p className="text-text-2">
          Browse every screen with sample data, without signing in. Auth, sync, the API and the local cache are off for
          this tab. Development builds only.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {active ? (
          <Button variant="secondary" onClick={stop}>
            <Square aria-hidden /> Stop preview
          </Button>
        ) : (
          <Button onClick={start}>
            <Play aria-hidden /> Start preview
          </Button>
        )}
        <span className="inline-flex items-center gap-1.5 text-sm text-text-2">
          <FlaskConical aria-hidden className="size-4" /> {active ? "On in this tab" : "Off"}
        </span>
      </div>

      <section className="flex flex-col gap-3" aria-labelledby="preview-theme">
        <h2 id="preview-theme" className="text-sm font-semibold text-text-2">
          Theme
        </h2>
        <div className="flex gap-2">
          {THEMES.map(({ value, label, icon: Icon }) => (
            <Button
              key={value}
              size="sm"
              variant={choice === value ? "primary" : "secondary"}
              aria-pressed={choice === value}
              onClick={() => setChoice(value)}
            >
              <Icon aria-hidden /> {label}
            </Button>
          ))}
        </div>
      </section>

      {active && (
        <section className="flex flex-col gap-3" aria-labelledby="preview-screens">
          <h2 id="preview-screens" className="text-sm font-semibold text-text-2">
            Screens
          </h2>
          <div className="flex flex-wrap gap-2">
            {SCREENS.map((s) => (
              <Link key={s.href} href={s.href} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                {s.label}
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
