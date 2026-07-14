"use client";

import { useEffect, useState } from "react";
import { Mail, Copy, Share2, CircleCheckBig } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { useStore, useMe } from "@/store/useStore";
import { useUI } from "@/store/useUI";
import { useToast } from "@/components/ui/toast";
import { sendInvite } from "@/lib/api";
import { uid } from "@/lib/utils";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function InviteDialog() {
  const open = useUI((s) => s.inviteOpen);
  const close = useUI((s) => s.closeInvite);
  const groupId = useUI((s) => s.inviteGroupId);
  const groups = useStore((s) => s.groups);
  const refetch = useStore((s) => s.refetch);
  const me = useMe();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sentLink, setSentLink] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    if (open) {
      setEmail("");
      setSentLink(null);
      setEmailSent(false);
    }
  }, [open]);

  const group = groups.find((g) => g.id === groupId);
  const valid = EMAIL_RE.test(email);

  async function send() {
    if (!valid) return;
    setSending(true);
    const inviteId = uid("i_");
    const result = await sendInvite({
      email: email.trim(),
      inviteId,
      groupId: groupId ?? null,
      groupName: group?.name,
      groupIcon: group?.icon,
      inviterName: me?.name,
    });
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    setSentLink(result?.link ?? `${origin}/join/${inviteId}`);
    setEmailSent(Boolean(result?.sent));
    setSending(false);
    await refetch(); // pull the pending member into the group
    toast({ message: result?.sent ? `Invite emailed to ${email.trim()}` : "Invite created — share the link" });
  }

  async function shareLink() {
    if (!sentLink) return;
    const text = `Join me on Tally to split expenses${group ? ` in "${group.name}"` : ""}: ${sentLink}`;
    if (navigator.share) await navigator.share({ text }).catch(() => {});
    else {
      await navigator.clipboard.writeText(sentLink).catch(() => {});
      toast({ message: "Invite link copied" });
    }
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Invite a friend"
      description={group ? `They'll join "${group.name}"` : "They'll join your circle on Tally"}
    >
      {sentLink ? (
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-positive-soft text-positive">
            <CircleCheckBig className="h-7 w-7" />
          </div>
          <div>
            <p className="font-display text-lg font-semibold text-text">
              {emailSent ? "Invite on its way" : "Invite ready"}
            </p>
            <p className="mt-1 text-sm text-text-2">
              {emailSent
                ? `${email} will get an email to sign in with Google and join you.`
                : `Share this link with ${email} — they sign in with Google to join.`}
            </p>
          </div>
          <div className="flex w-full items-center gap-2 rounded-[13px] border border-border bg-surface-2 px-3 py-2.5">
            <span className="min-w-0 flex-1 truncate text-left text-[0.82rem] text-text-2">{sentLink}</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(sentLink).catch(() => {});
                toast({ message: "Link copied" });
              }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-2 hover:bg-surface-inset"
              aria-label="Copy link"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <div className="flex w-full gap-2 pt-1">
            <Button variant="secondary" size="lg" className="flex-1" onClick={shareLink}>
              <Share2 className="h-4 w-4" /> Share
            </Button>
            <Button variant="primary" size="lg" className="flex-1" onClick={close}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 pt-2">
          <div className="flex items-center gap-3 rounded-[14px] bg-brand-soft p-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-on-brand">
              <Mail className="h-5 w-5" />
            </div>
            <p className="text-[0.85rem] leading-snug text-brand-on-soft">
              Your friend signs in with Google — no passwords, and balances sync automatically.
            </p>
          </div>

          <Field label="Friend's email">
            <Input
              type="email"
              inputMode="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="friend@gmail.com"
              onKeyDown={(e) => e.key === "Enter" && send()}
            />
          </Field>

          <Button variant="primary" size="lg" fullWidth disabled={!valid} loading={sending} onClick={send}>
            Send invite
          </Button>
        </div>
      )}
    </Sheet>
  );
}
