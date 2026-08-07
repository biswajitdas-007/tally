"use client";

import { Sheet } from "@/components/ui/sheet";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useStore, useMyId } from "@/store/useStore";
import { useUI } from "@/store/useUI";
import { useToast } from "@/components/ui/toast";
import { Trash2, UserPlus, Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { resendInviteApi } from "@/lib/api";

export function GroupSettingsSheet() {
  const router = useRouter();
  const { toast } = useToast();
  const [resendingId, setResendingId] = useState<string | null>(null);
  
  const id = useUI((s) => s.groupSettingsId);
  const close = useUI((s) => s.closeGroupSettings);
  const openInvite = useUI((s) => s.openInvite);
  const openDeleteGroup = useUI((s) => s.openDeleteGroup);
  
  const groups = useStore((s) => s.groups);
  const people = useStore((s) => s.people);
  const pendingInvitesAll = useStore((s) => s.pendingInvites);
  const updateGroup = useStore((s) => s.updateGroup);
  const myId = useMyId();

  const group = id ? groups.find((g) => g.id === id) ?? null : null;
  if (!group || !myId) return null;

  const members = group.memberIds
    .map((mid) => people.find((p) => p.id === mid))
    .filter((p) => p != null);

  const pendingInvites = pendingInvitesAll.filter((i) => i.groupId === group.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const offlineIds = group.offlineIds ?? [];

  function handleToggleOffline(memberId: string, isNowOffline: boolean) {
    if (memberId !== myId) return; // double check

    const newOfflineIds = isNowOffline
      ? [...offlineIds, memberId]
      : offlineIds.filter((id) => id !== memberId);
      
    updateGroup(group!.id, { offlineIds: newOfflineIds });
  }

  function handleDelete() {
    openDeleteGroup(group!.id);
  }

  async function resendInvite(inviteId: string) {
    setResendingId(inviteId);
    try {
      const res = await resendInviteApi(inviteId);
      if (!res) {
        toast({ message: "Session expired. Please sign in again.", tone: "error" });
        return;
      }
      if (res.ok) {
        const data = await res.json();
        if (data.sent) {
          toast({ message: "Invitation resent!", tone: "success" });
        } else {
          toast({ message: "Email not configured. Resend simulated.", tone: "info" });
        }
      } else {
        toast({ message: "Failed to resend invitation", tone: "error" });
      }
    } catch {
      toast({ message: "Something went wrong", tone: "error" });
    } finally {
      setResendingId(null);
    }
  }

  return (
    <Sheet open={id !== null} onClose={close} title="Group Info">
      <div className="flex flex-col gap-5 pb-6 pt-1">
        <div className="flex items-center gap-4">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[16px] text-3xl"
            style={{ background: `color-mix(in srgb, ${group.color} 16%, transparent)` }}
          >
            {group.icon}
          </div>
          <div>
            <h2 className="font-display text-xl font-bold tracking-[-0.02em]">{group.name}</h2>
            <p className="text-[0.85rem] text-text-2">
              {members.length} member{members.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div>
          <p className="mb-2 px-1 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-text-3">Members</p>
          <div className="rounded-[16px] border border-border bg-surface shadow-sm p-2">
            <div className="flex flex-col">
              {members.map((m) => {
                const isMe = m.id === myId;
                const isOffline = offlineIds.includes(m.id);
                return (
                  <div key={m.id} className="flex items-center gap-3 rounded-[12px] px-2 py-2">
                    <Avatar person={m} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-[0.9rem] font-medium text-text">
                        {isMe ? "You" : m.name}
                      </p>
                    </div>
                    {isMe ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[0.7rem] font-medium text-text-3">
                          {isOffline ? "Offline" : "Active"}
                        </span>
                        <Switch
                          checked={!isOffline}
                          onChange={(active) => handleToggleOffline(m.id, !active)}
                          label="Toggle status"
                        />
                      </div>
                    ) : (
                      <span className={`text-[0.7rem] font-medium ${isOffline ? 'text-text-3' : 'text-positive'}`}>
                        {isOffline ? "Offline" : "Active"}
                      </span>
                    )}
                  </div>
                );
              })}
              
              <button
                onClick={() => {
                  close();
                  openInvite(group.id);
                }}
                className="flex items-center gap-3 rounded-[12px] px-2 py-2 text-brand transition-colors hover:bg-surface-inset"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed border-brand/40">
                  <UserPlus className="h-4 w-4" />
                </span>
                <span className="text-[0.9rem] font-semibold">Invite a friend</span>
              </button>
            </div>
          </div>
          <p className="mt-2.5 flex items-start gap-1.5 px-1 text-[0.76rem] leading-snug text-text-3">
            <Info className="mt-px h-3.5 w-3.5 shrink-0" />
            Toggling yourself to Offline means you won&apos;t be automatically selected when someone splits a new expense in this group.
          </p>
        </div>

        {pendingInvites.length > 0 && (
          <div>
            <p className="mb-2 px-1 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-text-3">Pending Invites</p>
            <div className="rounded-[16px] border border-border bg-surface shadow-sm overflow-hidden">
              <div className="divide-y divide-border">
                {pendingInvites.map((inv) => (
                  <div key={inv.id} className="flex items-center gap-3 px-4 py-3 text-left">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-text-3">
                      <UserPlus className="h-4 w-4 opacity-50" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-text">{inv.email}</p>
                      <p className="truncate text-[0.78rem] text-text-3">
                        Sent on {new Date(inv.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={resendingId === inv.id}
                      onClick={() => resendInvite(inv.id)}
                    >
                      Resend
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="pt-2">
          <Button variant="dangerSoft" fullWidth onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete group
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
