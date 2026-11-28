"use client";

import { Sheet } from "@/components/ui/sheet";
import { ExpenseForm } from "@/components/features/expense-form/expense-form";
import { useStore } from "@/store/useStore";
import { useUI } from "@/store/useUI";

/** The add / edit expense sheet. The form inside is keyed per open, so it always starts fresh. */
export function AddExpenseSheet() {
  const open = useUI((s) => s.addOpen);
  const close = useUI((s) => s.closeAdd);
  const groupCtx = useUI((s) => s.addGroupId);
  const editId = useUI((s) => s.addEditId);
  const session = useUI((s) => s.addSession);
  const editing = useStore((s) => (editId ? (s.expenses.find((e) => e.id === editId) ?? null) : null));

  return (
    <Sheet open={open} onClose={close} title={editing ? "Edit expense" : "Add expense"}>
      <ExpenseForm key={session} editing={editing} groupCtx={groupCtx} onDone={close} />
    </Sheet>
  );
}
