"use client";

import { useMemo } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SheetFooter } from "@/components/ui/sheet";
import { Field, Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useExpenseForm } from "@/hooks/use-expense-form";
import { useStore, useMyId } from "@/store/useStore";
import {
  computeSplits,
  exactRemaining,
  expensePayload,
  initialExpenseForm,
  isExpenseFormValid,
  splitPool,
} from "@/lib/expense-form";
import type { Expense, ID, Person } from "@/lib/types";
import { AmountField } from "./amount-field";
import { CategoryPicker } from "./category-picker";
import { GroupPicker, PayerPicker } from "./scope-pickers";
import { ParticipantPicker } from "./participant-picker";
import { ExtrasRow } from "./extras-row";

/** Save / delete bar pinned to the bottom of the sheet. */
function FormActions({
  editing,
  valid,
  onSave,
  onDelete,
}: Readonly<{ editing: boolean; valid: boolean; onSave: () => void; onDelete: () => void }>) {
  return (
    <SheetFooter className="flex gap-3">
      {editing && (
        <Button variant="dangerSoft" size="lg" onClick={onDelete} aria-label="Delete expense" className="size-14 rounded-full px-0">
          <Trash2 className="size-5" strokeWidth={1.8} aria-hidden />
        </Button>
      )}
      <Button size="lg" fullWidth disabled={!valid} onClick={onSave} className="h-14 rounded-full text-base font-bold">
        {editing ? "Save changes" : "Add expense"}
      </Button>
    </SheetFooter>
  );
}

/**
 * The add/edit expense form. Mounted fresh each time the sheet opens (the
 * sheet only renders its content while open, and it's keyed per open), so its
 * initial state comes straight from props — no resetting during render.
 */
export function ExpenseForm({
  editing,
  groupCtx,
  onDone,
}: Readonly<{ editing: Expense | null; groupCtx: ID | null; onDone: () => void }>) {
  const people = useStore((s) => s.people);
  const groups = useStore((s) => s.groups);
  const addExpense = useStore((s) => s.addExpense);
  const updateExpense = useStore((s) => s.updateExpense);
  const deleteExpense = useStore((s) => s.deleteExpense);
  const { toast } = useToast();
  const myId = useMyId() ?? "";

  const form = useExpenseForm(initialExpenseForm({ editing, groupCtx, groups, myId }));
  const { state } = form;

  const sortedGroups = useMemo(
    () => [...groups].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [groups],
  );
  const poolPeople = useMemo(() => {
    const friendIds = people.filter((p) => p.id !== myId).map((p) => p.id);
    return splitPool(state.groupId, groups, friendIds, myId)
      .map((id) => people.find((p) => p.id === id))
      .filter((p): p is Person => Boolean(p));
  }, [state.groupId, groups, people, myId]);

  const nameOf = (id: ID) => (id === myId ? "You" : (people.find((p) => p.id === id)?.name.split(" ")[0] ?? "—"));
  const perHead = computeSplits({ ...state, splitMode: "equal" })[0]?.amount ?? 0;
  const valid = isExpenseFormValid(state);

  function save() {
    if (!valid) return;
    const payload = expensePayload(state, editing);
    if (editing) {
      updateExpense(editing.id, payload);
      toast({ message: "Expense updated" });
    } else {
      addExpense(payload);
      toast({ message: "Expense added" });
    }
    onDone();
  }

  function remove() {
    if (!editing) return;
    deleteExpense(editing.id);
    toast({ message: "Expense deleted", tone: "info" });
    onDone();
  }

  return (
    <div className="flex flex-col gap-5 pt-1">
      <AmountField value={state.amount} onChange={(v) => form.set("amount", v)} />

      <Field label="What was it for?" htmlFor="expense-description">
        <Input
          id="expense-description"
          value={state.description}
          onChange={(e) => form.setDescription(e.target.value)}
          placeholder="e.g. Beach shack dinner"
          autoComplete="off"
          className="h-12 rounded-[16px] border-[1.5px] bg-surface text-[0.9375rem] font-semibold"
        />
      </Field>

      <CategoryPicker value={state.category} onChange={form.setCategory} />

      <div className="grid grid-cols-2 gap-3">
        <GroupPicker
          groups={sortedGroups}
          groupId={state.groupId}
          locked={Boolean(groupCtx && groups.some((g) => g.id === groupCtx))}
          onChange={(id) => form.switchGroup(id, groups, myId)}
        />
        <PayerPicker people={poolPeople} paidBy={state.paidBy} nameOf={nameOf} onChange={(id) => form.set("paidBy", id)} />
      </div>

      <ParticipantPicker
        people={poolPeople}
        participants={state.participants}
        mode={state.splitMode}
        exact={state.exact}
        perHead={perHead}
        remaining={exactRemaining(state)}
        nameOf={nameOf}
        onModeChange={(m) => form.set("splitMode", m)}
        onToggle={form.toggleParticipant}
        onExactChange={form.setExactShare}
      />

      <ExtrasRow
        date={state.date}
        onDate={(d) => form.set("date", d)}
        showNotes={state.showNotes}
        onShowNotes={(v) => form.set("showNotes", v)}
        notes={state.notes}
        onNotes={(v) => form.set("notes", v)}
        recurring={state.recurring}
        onRecurring={(v) => form.set("recurring", v)}
      />

      <FormActions editing={Boolean(editing)} valid={valid} onSave={save} onDelete={remove} />
    </div>
  );
}
