"use client";

import { useState } from "react";
import { Trash2, AlertTriangle, Download } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/store/useStore";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/toast";
import { buildExport, downloadJson, exportFilename } from "@/lib/export";
import { deleteAccount } from "@/lib/api";
import { formatINR } from "@/lib/utils";

const PHRASE = "DELETE";

/**
 * Deleting is permanent, so this asks for the word to be typed rather than
 * relying on a button press, and offers a download first. The server refuses
 * while any balance is outstanding — that's surfaced here rather than silently
 * failing.
 */
export function DeleteAccountDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const store = useStore();
  const { logout } = useAuth();
  const { toast } = useToast();
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState<{ people: number; amount: number } | null>(null);

  async function run() {
    setBusy(true);
    setBlocked(null);
    const res = await deleteAccount();
    setBusy(false);

    if (res.ok) {
      toast({ message: "Your account has been deleted" });
      await logout();
      return;
    }
    if (res.unsettled) {
      setBlocked({ people: res.people ?? 0, amount: res.amount ?? 0 });
      return;
    }
    toast({ message: "Couldn't delete your account. Try again in a moment.", tone: "info" });
  }

  return (
    <Sheet open={open} onClose={onClose} title="Delete your account">
      <div className="flex flex-col gap-5 pt-1">
        <div className="flex items-start gap-3 rounded-[14px] border border-negative/30 bg-negative-soft p-4 text-negative">
          <AlertTriangle className="mt-0.5 h-4.5 w-4.5 shrink-0" />
          <p className="text-[0.85rem] font-medium leading-snug">
            This removes your profile, accounts, loans, budget, repeats and every money entry. It can&apos;t be undone.
          </p>
        </div>

        <p className="text-[0.85rem] leading-snug text-text-2">
          Expenses you share with other people will stay in <i>their</i> ledgers with you removed, so nobody&apos;s
          history breaks. Anything that was only ever yours goes completely.
        </p>

        <Button
          variant="secondary"
          size="lg"
          fullWidth
          onClick={() => {
            downloadJson(
              buildExport({
                me: store.me, people: store.people, accounts: store.accounts,
                liabilities: store.liabilities, emergency: store.emergency, budget: store.budget,
                recurrings: store.recurrings, finance: store.finance, groups: store.groups, expenses: store.expenses,
              }),
              exportFilename(),
            );
          }}
        >
          <Download className="h-4.5 w-4.5" /> Download a copy first
        </Button>

        {blocked && (
          <div className="flex items-start gap-2.5 rounded-[14px] border border-warning/30 bg-warning-soft p-4 text-warning">
            <AlertTriangle className="mt-0.5 h-4.5 w-4.5 shrink-0" />
            <p className="text-[0.85rem] font-medium leading-snug">
              You still have {formatINR(blocked.amount)} outstanding with{" "}
              {blocked.people === 1 ? "someone" : `${blocked.people} people`}. Settle up first — otherwise they&apos;d be
              left with a balance against an account that no longer exists.
            </p>
          </div>
        )}

        <div>
          <p className="mb-2 px-0.5 text-[0.8rem] font-semibold text-text-2">
            Type <b className="text-text">{PHRASE}</b> to confirm
          </p>
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={PHRASE} className="h-12" />
        </div>

        <div className="sticky bottom-0 -mx-5 flex gap-3 border-t border-border bg-surface px-5 pb-1 pt-3">
          <Button variant="secondary" size="lg" onClick={onClose}>
            Keep it
          </Button>
          <Button variant="destructive" size="lg" fullWidth disabled={typed !== PHRASE || busy} onClick={run}>
            <Trash2 className="h-4.5 w-4.5" /> Delete for good
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
