"use client";

import { AlertTriangle, Trash2 } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store/useStore";
import { useUI } from "@/store/useUI";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";

export function DeleteGroupDialog() {
  const store = useStore();
  const id = useUI((s) => s.deleteGroupId);
  const close = useUI((s) => s.closeDeleteGroup);
  const { toast } = useToast();
  const router = useRouter();

  if (!id) return null;

  const group = store.groups.find((g) => g.id === id);
  if (!group) return null;

  function run() {
    store.deleteGroup(id!);
    toast({ message: "Group deleted", tone: "info" });
    close();
    
    // Also close group settings if open
    useUI.getState().closeGroupSettings();
    router.push("/groups");
  }

  return (
    <Sheet open={id !== null} onClose={close} title="Delete group">
      <div className="flex flex-col gap-5 pt-1 pb-6">
        <div className="flex items-start gap-3 rounded-[14px] border border-negative/30 bg-negative-soft p-4 text-negative">
          <AlertTriangle className="mt-0.5 h-4.5 w-4.5 shrink-0" />
          <p className="text-[0.85rem] font-medium leading-snug">
            This will permanently remove the group <b>{group.name}</b> and its settings. Existing expenses won&apos;t be deleted, but they will be detached from this group.
          </p>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Button variant="destructive" size="lg" fullWidth onClick={run} className="text-black">
            <Trash2 className="h-4.5 w-4.5 mr-2" /> Yes, delete group
          </Button>
          <Button variant="secondary" size="lg" fullWidth onClick={close}>
            Cancel
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
