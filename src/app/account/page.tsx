"use client";

import { useState } from "react";
import { LogOut, Trash2, ShieldCheck, Bell, Wallet, Check, CircleUserRound } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Segmented } from "@/components/ui/segmented";
import { Avatar } from "@/components/ui/avatar";
import { useMe, useStore } from "@/store/useStore";
import { useAuth } from "@/hooks/use-auth";
import { useTheme, type ThemeChoice } from "@/components/theme-provider";
import { useToast } from "@/components/ui/toast";
import { isValidVpa } from "@/lib/upi";
import { ME_ID } from "@/lib/seed";

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-3 px-4 py-3.5">{children}</div>;
}

export default function AccountPage() {
  const me = useMe();
  const updatePerson = useStore((s) => s.updatePerson);
  const resetAll = useStore((s) => s.resetAll);
  const { logout, isFirebaseConfigured } = useAuth();
  const { choice, setChoice } = useTheme();
  const { toast } = useToast();

  const [upi, setUpi] = useState(me?.upiId ?? "");
  const [notifications, setNotifications] = useState(false);

  const upiChanged = upi.trim() !== (me?.upiId ?? "");

  async function enableNotifications(v: boolean) {
    setNotifications(v);
    if (v && "Notification" in window) {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setNotifications(false);
        toast({ message: "Notifications blocked in browser settings", tone: "error" });
      } else {
        toast({ message: "Notifications on" });
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Account" />

      {/* Profile */}
      <Card className="flex items-center gap-4 p-5">
        <Avatar person={me} size="xl" />
        <div className="min-w-0">
          <p className="truncate font-display text-xl font-bold">{me?.name ?? "You"}</p>
          <p className="truncate text-sm text-text-2">{me?.email ?? "Signed in"}</p>
        </div>
      </Card>

      {/* UPI */}
      <section>
        <p className="mb-2 px-1 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-text-3">
          Your UPI ID
        </p>
        <Card className="p-4">
          <div className="mb-2 flex items-center gap-2 text-text-2">
            <Wallet className="h-4 w-4" />
            <span className="text-[0.82rem]">Friends use this to pay you back instantly.</span>
          </div>
          <div className="flex gap-2">
            <Input
              value={upi}
              onChange={(e) => setUpi(e.target.value)}
              placeholder="yourname@okhdfcbank"
              className="h-11"
            />
            <Button
              disabled={!upiChanged || (upi.trim() !== "" && !isValidVpa(upi))}
              onClick={() => {
                updatePerson(ME_ID, { upiId: upi.trim() });
                toast({ message: "UPI ID saved" });
              }}
            >
              <Check className="h-4 w-4" /> Save
            </Button>
          </div>
        </Card>
      </section>

      {/* Appearance */}
      <section>
        <p className="mb-2 px-1 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-text-3">
          Appearance
        </p>
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

      {/* Preferences */}
      <section>
        <p className="mb-2 px-1 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-text-3">
          Preferences
        </p>
        <Card className="divide-y divide-border">
          <Row>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-info-soft text-info">
              <Bell className="h-4.5 w-4.5" />
            </div>
            <div className="flex-1">
              <p className="text-[0.9rem] font-medium text-text">Notifications</p>
              <p className="text-[0.76rem] text-text-3">Reminders when you&apos;re owed money</p>
            </div>
            <Switch checked={notifications} onChange={enableNotifications} label="Notifications" />
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
            <span className="flex items-center gap-1.5 text-[0.76rem] font-semibold text-text-2">
              {isFirebaseConfigured ? <CircleUserRound className="h-4 w-4" /> : null}
              {isFirebaseConfigured ? "Google" : "Local"}
            </span>
          </Row>
        </Card>
      </section>

      {/* Danger zone */}
      <section className="flex flex-col gap-2.5">
        <Button variant="secondary" size="lg" fullWidth onClick={logout}>
          <LogOut className="h-4.5 w-4.5" /> Sign out
        </Button>
        <Button
          variant="dangerSoft"
          size="lg"
          fullWidth
          onClick={() => {
            if (confirm("Clear all your groups and expenses? This can't be undone.")) {
              resetAll();
              toast({ message: "All data cleared" });
            }
          }}
        >
          <Trash2 className="h-4.5 w-4.5" /> Clear all data
        </Button>
      </section>

      <p className="pb-4 text-center text-[0.72rem] text-text-3">Tally · Split expenses, settle over UPI</p>
    </div>
  );
}
