"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogOut, ShieldCheck, Bell, Wallet, Check, BellRing, Contact, ChevronRight, Download, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DeleteAccountDialog } from "@/components/features/delete-account-dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Segmented } from "@/components/ui/segmented";
import { Avatar } from "@/components/ui/avatar";
import { useMe, useStore, useMyId } from "@/store/useStore";
import { useAuth } from "@/hooks/use-auth";
import { usePush } from "@/hooks/use-push";
import { useTheme, type ThemeChoice } from "@/components/theme-provider";
import { useToast } from "@/components/ui/toast";
import { isValidVpa } from "@/lib/upi";
import { buildExport, downloadJson, exportFilename } from "@/lib/export";

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-3 px-4 py-3.5">{children}</div>;
}

export default function AccountPage() {
  const me = useMe();
  const people = useStore((s) => s.people);
  const myId = useMyId() ?? "";
  const friendCount = people.filter((p) => p.id !== myId).length;
  const updateProfile = useStore((s) => s.updateProfile);
  const { logout, isFirebaseConfigured } = useAuth();
  const { choice, setChoice } = useTheme();
  const { supported, enabled, busy, enable, disable } = usePush();
  const { toast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const store = useStore();

  function exportData() {
    downloadJson(
      buildExport({
        me: store.me,
        people: store.people,
        accounts: store.accounts,
        liabilities: store.liabilities,
        emergency: store.emergency,
        budget: store.budget,
        recurrings: store.recurrings,
        finance: store.finance,
        groups: store.groups,
        expenses: store.expenses,
      }),
      exportFilename(),
    );
    toast({ message: "Your data is downloading" });
  }

  const [upi, setUpi] = useState("");
  useEffect(() => setUpi(me?.upiId ?? ""), [me?.upiId]);

  const upiChanged = upi.trim() !== (me?.upiId ?? "");

  async function toggleNotifications(v: boolean) {
    if (v) {
      const ok = await enable();
      toast({
        message: ok ? "Notifications on — even when your phone is locked" : "Couldn't enable notifications",
        tone: ok ? "success" : "error",
      });
    } else {
      await disable();
      toast({ message: "Notifications off", tone: "info" });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Account" />

      <Card className="flex items-center gap-4 p-5">
        <Avatar person={me} size="xl" />
        <div className="min-w-0">
          <p className="truncate font-display text-xl font-bold">{me?.name ?? "You"}</p>
          <p className="truncate text-sm text-text-2">{me?.email ?? "Signed in"}</p>
        </div>
      </Card>

      <Link
        href="/friends"
        className="flex items-center gap-3 rounded-[16px] border border-border bg-surface p-4 shadow-[var(--shadow-xs)] transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[var(--shadow-sm)]"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
          <Contact className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[0.92rem] font-medium text-text">Friends</p>
          <p className="text-[0.76rem] text-text-3">
            {friendCount} {friendCount === 1 ? "person" : "people"} you split with
          </p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-text-3" />
      </Link>

      <section>
        <p className="mb-2 px-1 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-text-3">Your UPI ID</p>
        <Card className="p-4">
          <div className="mb-2 flex items-center gap-2 text-text-2">
            <Wallet className="h-4 w-4" />
            <span className="text-[0.82rem]">Friends use this to pay you back instantly.</span>
          </div>
          <div className="flex gap-2">
            <Input value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="yourname@okhdfcbank" className="h-11" />
            <Button
              disabled={!upiChanged || (upi.trim() !== "" && !isValidVpa(upi))}
              onClick={() => {
                updateProfile({ upiId: upi.trim() });
                toast({ message: "UPI ID saved" });
              }}
            >
              <Check className="h-4 w-4" /> Save
            </Button>
          </div>
        </Card>
      </section>

      <section>
        <p className="mb-2 px-1 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-text-3">Appearance</p>
        <Card className="p-4">
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
        </Card>
      </section>

      <section>
        <p className="mb-2 px-1 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-text-3">Preferences</p>
        <Card className="divide-y divide-border">
          <Row>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-info-soft text-info">
              {enabled ? <BellRing className="h-4.5 w-4.5" /> : <Bell className="h-4.5 w-4.5" />}
            </div>
            <div className="flex-1">
              <p className="text-[0.9rem] font-medium text-text">Notifications</p>
              <p className="text-[0.76rem] text-text-3">
                {supported ? "Get alerted when a group updates" : "Install the app to enable"}
              </p>
            </div>
            <Switch checked={enabled} onChange={toggleNotifications} label="Notifications" />
          </Row>
          <Row>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-positive-soft text-positive">
              <ShieldCheck className="h-4.5 w-4.5" />
            </div>
            <div className="flex-1">
              <p className="text-[0.9rem] font-medium text-text">Account</p>
              <p className="text-[0.76rem] text-text-3">
                {isFirebaseConfigured ? "Signed in with Google · synced" : "Local — data on this device"}
              </p>
            </div>
            <span className="text-[0.76rem] font-semibold text-text-2">{isFirebaseConfigured ? "Google" : "Local"}</span>
          </Row>
        </Card>
      </section>

      <section>
        <p className="mb-2 px-1 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-text-3">Your data</p>
        <Card className="divide-y divide-border">
          <button onClick={exportData} className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-surface-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-brand">
              <Download className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[0.9rem] font-medium text-text">Download everything</p>
              <p className="text-[0.76rem] leading-snug text-text-3">
                One JSON file with your accounts, money, groups and splits.
              </p>
            </div>
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-negative-soft"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-negative-soft text-negative">
              <Trash2 className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[0.9rem] font-medium text-negative">Delete my account</p>
              <p className="text-[0.76rem] leading-snug text-text-3">Permanently removes your data. Can&apos;t be undone.</p>
            </div>
          </button>
        </Card>
      </section>

      <Button variant="secondary" size="lg" fullWidth onClick={logout} disabled={busy}>
        <LogOut className="h-4.5 w-4.5" /> Sign out
      </Button>

      <DeleteAccountDialog open={confirmDelete} onClose={() => setConfirmDelete(false)} />

      <p className="pb-4 text-center text-[0.72rem] text-text-3">Tally · Split expenses, settle over UPI</p>
    </div>
  );
}
