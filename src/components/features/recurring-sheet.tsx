"use client";

import { useState } from "react";
import { Check, Trash2, Info } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { AccountPicker } from "./account-picker";
import { CATEGORY_LIST, INCOME_LIST } from "@/lib/categories";
import { DEFAULT_RECUR_DAY, WEEKDAYS, nextOccurrence, stampCurrent } from "@/lib/recurring";
import { useStore } from "@/store/useStore";
import { useUI } from "@/store/useUI";
import { useToast } from "@/components/ui/toast";
import { cn, formatDate, uid as newId } from "@/lib/utils";
import type { FinanceType, RecurFreq, Recurring } from "@/lib/types";

export function RecurringSheet() {
  const open = useUI((s) => s.recurOpen);
  const editId = useUI((s) => s.recurEditId);
  const seedType = useUI((s) => s.recurSeed);
  const close = useUI((s) => s.closeRecur);
  const recurrings = useStore((s) => s.recurrings);
  const saveRecurring = useStore((s) => s.saveRecurring);
  const deleteRecurring = useStore((s) => s.deleteRecurring);
  const { toast } = useToast();

  const editing = editId ? recurrings.find((r) => r.id === editId) ?? null : null;

  const [type, setType] = useState<FinanceType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("rent");
  const [freq, setFreq] = useState<RecurFreq>("monthly");
  const [day, setDay] = useState(String(DEFAULT_RECUR_DAY));
  const [note, setNote] = useState("");
  const [accountId, setAccountId] = useState<string | null>(null);
  const [auto, setAuto] = useState(true);

  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    if (editing) {
      setType(editing.type);
      setAmount(String(editing.amount));
      setCategory(editing.category);
      setFreq(editing.freq);
      setDay(String(editing.day));
      setNote(editing.note ?? "");
      setAccountId(editing.accountId ?? null);
      setAuto(editing.auto);
    } else {
      const t = seedType ?? "expense";
      setType(t);
      setAmount("");
      setCategory(t === "income" ? "salary" : "rent");
      setFreq("monthly");
      setDay(String(DEFAULT_RECUR_DAY));
      setNote("");
      setAccountId(null);
      setAuto(true);
    }
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  const isIncome = type === "income";
  const cats = isIncome ? INCOME_LIST : CATEGORY_LIST;
  const total = parseFloat(amount) || 0;
  const dayNum = parseInt(day, 10);
  const dayValid = freq === "monthly" ? dayNum >= 1 && dayNum <= 28 : dayNum >= 0 && dayNum <= 6;
  const valid = total > 0 && dayValid;
  const nextOn = dayValid ? nextOccurrence(freq, dayNum) : null;

  function switchType(t: FinanceType) {
    setType(t);
    setCategory(t === "income" ? "salary" : "rent");
  }

  function switchFreq(f: RecurFreq) {
    setFreq(f);
    setDay(f === "monthly" ? String(DEFAULT_RECUR_DAY) : "1");
  }

  function save() {
    if (!valid) return;
    // Re-stamp when the schedule changes: the stamp's format follows the
    // frequency, so an old one would be meaningless (and could fire a backlog).
    const scheduleChanged = !editing || editing.freq !== freq || editing.day !== dayNum;
    const rule: Recurring = {
      id: editing?.id ?? newId("rec_"),
      type,
      amount: total,
      category,
      freq,
      day: dayNum,
      auto,
      note: note.trim() || undefined,
      accountId: accountId ?? undefined,
      lastRun: scheduleChanged ? stampCurrent(freq, dayNum) : editing?.lastRun,
      paused: editing?.paused,
      createdAt: editing?.createdAt ?? new Date().toISOString(),
    };
    saveRecurring(rule);
    toast({ message: editing ? "Repeat updated" : "Repeat set up" });
    close();
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      title={editing ? "Edit repeat" : "New repeat"}
      description="Salary, rent, a subscription — set it once and stop typing it in."
    >
      <div className="flex flex-col gap-5 pt-1">
        {!editing && (
          <Segmented<FinanceType>
            value={type}
            onChange={switchType}
            className="w-full"
            options={[
              { value: "expense", label: "Money out" },
              { value: "income", label: "Money in" },
            ]}
          />
        )}

        {/* Amount */}
        <div className="flex flex-col items-center rounded-[18px] bg-surface-inset py-5">
          <span className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-text-3">
            {isIncome ? "Comes in" : "Goes out"}
          </span>
          <div className="mt-1.5 flex items-baseline justify-center gap-1">
            <span className={cn("font-display text-3xl font-semibold", isIncome ? "text-positive" : "text-text-2")}>₹</span>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              inputMode="decimal"
              placeholder="0"
              autoFocus
              style={{ width: `${Math.max((amount || "0").length, 1)}ch`, outline: "none", boxShadow: "none" }}
              className={cn(
                "bg-transparent text-left font-display text-[3rem] font-bold leading-none tracking-tight tnum outline-none placeholder:text-text-3",
                isIncome ? "text-positive" : "text-text",
              )}
            />
          </div>
        </div>

        {/* Category */}
        <div>
          <p className="mb-2 px-0.5 text-[0.8rem] font-semibold text-text-2">Category</p>
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
            {cats.map((c) => {
              const Icon = c.icon;
              const active = category === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => setCategory(c.key)}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-[0.82rem] font-medium transition-all",
                    active
                      ? "border-transparent bg-brand-soft text-brand-on-soft"
                      : "border-border bg-surface text-text-2 hover:border-border-strong",
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                  {c.label.split(" ")[0]}
                </button>
              );
            })}
          </div>
        </div>

        {/* How often */}
        <div>
          <p className="mb-2 px-0.5 text-[0.8rem] font-semibold text-text-2">How often</p>
          <Segmented<RecurFreq>
            value={freq}
            onChange={switchFreq}
            className="w-full"
            options={[
              { value: "monthly", label: "Monthly" },
              { value: "weekly", label: "Weekly" },
            ]}
          />

          {freq === "monthly" ? (
            <div className="mt-3 flex items-center gap-2 rounded-[14px] border border-border bg-surface px-4 py-3">
              <input
                value={day}
                onChange={(e) => setDay(e.target.value.replace(/[^0-9]/g, ""))}
                inputMode="numeric"
                placeholder="1"
                className="w-10 bg-transparent text-center font-display text-[1rem] font-bold tnum outline-none placeholder:text-text-3"
              />
              <span className="text-[0.82rem] text-text-3">of every month · the 29th–31st aren&apos;t available</span>
            </div>
          ) : (
            <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1">
              {WEEKDAYS.map((w, i) => (
                <button
                  key={w}
                  onClick={() => setDay(String(i))}
                  className={cn(
                    "shrink-0 rounded-full border px-3.5 py-2 text-[0.82rem] font-medium transition-all",
                    dayNum === i
                      ? "border-transparent bg-brand-soft text-brand-on-soft"
                      : "border-border bg-surface text-text-2 hover:border-border-strong",
                  )}
                >
                  {w.slice(0, 3)}
                </button>
              ))}
            </div>
          )}

          {nextOn && (
            <p className="mt-2 px-0.5 text-[0.76rem] text-text-3">
              Next on <b className="font-semibold text-text-2">{formatDate(nextOn.toISOString(), true)}</b>
            </p>
          )}
        </div>

        {/* Account */}
        <AccountPicker value={accountId} onChange={setAccountId} label={isIncome ? "Into which account?" : "Paid from"} />

        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={isIncome ? "Monthly salary" : "Flat rent"}
          rows={2}
        />

        {/* Auto vs remind */}
        <div className="rounded-[16px] border border-border bg-surface-2 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[0.9rem] font-semibold text-text">Add it for me</p>
              <p className="text-[0.78rem] text-text-2">No typing — it just appears.</p>
            </div>
            <Switch checked={auto} onChange={setAuto} label="Add automatically" />
          </div>
          <p className="mt-2.5 flex items-start gap-1.5 text-[0.76rem] leading-snug text-text-3">
            <Info className="mt-px h-3.5 w-3.5 shrink-0" />
            {auto
              ? "We'll log it on the day and let you know. Amount changed? Just edit the entry."
              : "We'll only remind you it's due — nothing is logged until you add it."}
          </p>
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 -mx-5 flex gap-3 border-t border-border bg-surface px-5 pb-1 pt-3">
          {editing && (
            <Button
              variant="dangerSoft"
              size="lg"
              onClick={() => {
                deleteRecurring(editing.id);
                toast({ message: "Repeat removed", tone: "info" });
                close();
              }}
              aria-label="Remove repeat"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button variant="primary" size="lg" fullWidth disabled={!valid} onClick={save}>
            <Check className="h-4.5 w-4.5" /> {editing ? "Save changes" : "Set up repeat"}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
