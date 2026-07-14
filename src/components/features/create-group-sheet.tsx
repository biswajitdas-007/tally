"use client";

import { useEffect, useState } from "react";
import { Check, UserPlus } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { useStore, useMyId } from "@/store/useStore";
import { useUI } from "@/store/useUI";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { ID } from "@/lib/types";

const EMOJIS = ["🏠", "🏝️", "🍜", "🎉", "✈️", "🏋️", "💼", "🛒", "🎬", "☕", "⚽", "🎓"];
const COLORS = [
  "var(--cat-rent)",
  "var(--cat-travel)",
  "var(--cat-food)",
  "var(--cat-fun)",
  "var(--cat-shopping)",
  "var(--cat-health)",
  "var(--cat-bills)",
];

export function CreateGroupSheet() {
  const open = useUI((s) => s.groupOpen);
  const close = useUI((s) => s.closeCreateGroup);
  const openInvite = useUI((s) => s.openInvite);
  const people = useStore((s) => s.people);
  const addGroup = useStore((s) => s.addGroup);
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [icon, setIcon] = useState(EMOJIS[0]);
  const [color, setColor] = useState(COLORS[0]);
  const [members, setMembers] = useState<ID[]>([]);

  useEffect(() => {
    if (open) {
      setName("");
      setIcon(EMOJIS[0]);
      setColor(COLORS[0]);
      setMembers([]);
    }
  }, [open]);

  const myId = useMyId() ?? "";
  const friends = people.filter((p) => p.id !== myId);
  const valid = name.trim().length > 0;

  function toggle(id: ID) {
    setMembers((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  }

  function create() {
    if (!valid) return;
    addGroup({ name: name.trim(), icon, color, memberIds: members });
    toast({ message: `"${name.trim()}" created` });
    close();
  }

  return (
    <Sheet open={open} onClose={close} title="New group">
      <div className="flex flex-col gap-5 pt-1">
        <div className="flex items-center gap-3">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] text-3xl"
            style={{ background: `color-mix(in srgb, ${color} 18%, transparent)` }}
          >
            {icon}
          </div>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Group name (e.g. Goa Trip)"
            className="h-12 text-[1rem]"
          />
        </div>

        <div>
          <p className="mb-2 px-0.5 text-[0.8rem] font-semibold text-text-2">Icon</p>
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => setIcon(e)}
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] text-xl transition-all",
                  icon === e ? "bg-brand-soft ring-2 ring-brand" : "bg-surface-inset",
                )}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 px-0.5 text-[0.8rem] font-semibold text-text-2">Colour</p>
          <div className="flex gap-2.5">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                aria-label="Choose colour"
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full transition-transform",
                  color === c && "scale-110 ring-2 ring-offset-2 ring-offset-[var(--surface)]",
                )}
                style={{ background: c, boxShadow: color === c ? `0 0 0 2px ${c}` : undefined }}
              >
                {color === c && <Check className="h-4 w-4 text-white" strokeWidth={3} />}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between px-0.5">
            <p className="text-[0.8rem] font-semibold text-text-2">Members</p>
            <button
              onClick={() => openInvite(null)}
              className="flex items-center gap-1 text-[0.8rem] font-semibold text-brand"
            >
              <UserPlus className="h-3.5 w-3.5" /> Invite
            </button>
          </div>
          <div className="flex flex-col gap-1">
            {friends.map((f) => {
              const active = members.includes(f.id);
              return (
                <button
                  key={f.id}
                  onClick={() => toggle(f.id)}
                  className="flex items-center gap-3 rounded-[13px] px-2 py-2 transition-colors hover:bg-surface-inset"
                >
                  <Avatar person={f} size="md" />
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate text-[0.9rem] font-medium text-text">{f.name}</p>
                    {f.email && <p className="truncate text-[0.75rem] text-text-3">{f.email}</p>}
                  </div>
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors",
                      active ? "border-brand bg-brand text-on-brand" : "border-border-strong",
                    )}
                  >
                    {active && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="sticky bottom-0 -mx-5 border-t border-border bg-surface px-5 pb-1 pt-3">
          <Button variant="primary" size="lg" fullWidth disabled={!valid} onClick={create}>
            Create group
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
