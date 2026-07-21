"use client";

import { Coffee, Copy, Heart, Star } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useUI } from "@/store/useUI";
import { useToast } from "@/components/ui/toast";
import { REPO_URL, SPONSORS_URL, SUPPORT_UPI } from "@/lib/version";

export function SupportSheet() {
  const open = useUI((s) => s.supportOpen);
  const close = useUI((s) => s.closeSupport);
  const { toast } = useToast();

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Support Tally ☕"
      description="Tally is free & open-source — thank you for keeping it going 🙏"
    >
      <div className="flex flex-col gap-3 pt-1">
        {/* Buy me a coffee over UPI */}
        <div className="rounded-[16px] border border-border bg-surface-2 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brass-soft text-brass-on-soft">
              <Coffee className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[0.92rem] font-semibold text-text">Buy me a coffee over UPI</p>
              <p className="text-[0.76rem] text-text-3">Pay any amount in any UPI app</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-[12px] bg-surface-inset px-3 py-2.5">
            <span className="min-w-0 flex-1 truncate font-display text-[1rem] font-bold text-text">{SUPPORT_UPI}</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(SUPPORT_UPI).catch(() => {});
                toast({ message: "UPI ID copied — thank you! ☕" });
              }}
            >
              <Copy className="h-4 w-4" /> Copy
            </Button>
          </div>
        </div>

        {/* Sponsor on GitHub */}
        <a
          href={SPONSORS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-[14px] border border-border bg-surface p-3.5 transition-all hover:border-border-strong hover:bg-surface-2 active:scale-[0.99]"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-negative-soft text-negative">
            <Heart className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[0.92rem] font-semibold text-text">Sponsor on GitHub</p>
            <p className="text-[0.76rem] text-text-3">One-time or recurring</p>
          </div>
        </a>

        {/* Star the repo */}
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-[14px] border border-border bg-surface p-3.5 transition-all hover:border-border-strong hover:bg-surface-2 active:scale-[0.99]"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
            <Star className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[0.92rem] font-semibold text-text">Star the repo</p>
            <p className="text-[0.76rem] text-text-3">Free — and it genuinely helps</p>
          </div>
        </a>
      </div>
    </Sheet>
  );
}
