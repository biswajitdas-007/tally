"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, Trash2, Repeat, StickyNote } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { Avatar } from "@/components/ui/avatar";
import { CategoryIcon } from "@/components/ui/chip";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CATEGORY_LIST } from "@/lib/categories";
import { useStore } from "@/store/useStore";
import { useUI } from "@/store/useUI";
import { useToast } from "@/components/ui/toast";
import { ME_ID } from "@/lib/seed";
import { cn, formatINR, formatDate, splitEqually } from "@/lib/utils";
import type { CategoryKey, ID, Split } from "@/lib/types";

const GUESS: [RegExp, CategoryKey][] = [
  [/rent|deposit|maintenance|society|flat/i, "rent"],
  [/grocer|basket|zepto|blinkit|dinner|lunch|breakfast|pizza|swiggy|zomato|restaurant|cafe|coffee|chai|thali|biryani|snack|food|drink/i, "food"],
  [/uber|ola|cab|taxi|flight|train|bus|fuel|petrol|toll|travel|trip|hotel|villa|airbnb|scooter|auto/i, "travel"],
  [/movie|netflix|concert|club|party|game|spotify|bar|ticket/i, "fun"],
  [/electric|water|gas|wifi|broadband|bill|recharge|dth|internet|ott/i, "bills"],
  [/amazon|flipkart|myntra|shop|clothes|shoes|decor|sweets/i, "shopping"],
  [/pharmacy|medicine|doctor|hospital|gym|health/i, "health"],
];

function guessCategory(text: string): CategoryKey | null {
  for (const [re, cat] of GUESS) if (re.test(text)) return cat;
  return null;
}

export function AddExpenseSheet() {
  const open = useUI((s) => s.addOpen);
  const close = useUI((s) => s.closeAdd);
  const groupCtx = useUI((s) => s.addGroupId);
  const editId = useUI((s) => s.addEditId);

  const people = useStore((s) => s.people);
  const groups = useStore((s) => s.groups);
  const expenses = useStore((s) => s.expenses);
  const addExpense = useStore((s) => s.addExpense);
  const updateExpense = useStore((s) => s.updateExpense);
  const deleteExpense = useStore((s) => s.deleteExpense);
  const { toast } = useToast();

  const editing = editId ? expenses.find((e) => e.id === editId) ?? null : null;

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<CategoryKey>("food");
  const [catTouched, setCatTouched] = useState(false);
  const [groupId, setGroupId] = useState<ID | null>(null);
  const [paidBy, setPaidBy] = useState<ID>(ME_ID);
  const [participants, setParticipants] = useState<ID[]>([]);
  const [splitMode, setSplitMode] = useState<"equal" | "exact">("equal");
  const [exact, setExact] = useState<Record<ID, string>>({});
  const [date, setDate] = useState<Date>(new Date());
  const [dateOpen, setDateOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [recurring, setRecurring] = useState(false);

  const friends = people.filter((p) => p.id !== ME_ID);
  const inGroup = Boolean(groupCtx);
  const ctxGroup = groups.find((g) => g.id === groupCtx);
  const sortedGroups = [...groups].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  // Members available to split among, based on chosen group.
  const pool: ID[] = useMemo(() => {
    if (groupId) return groups.find((g) => g.id === groupId)?.memberIds ?? [ME_ID];
    return [ME_ID, ...friends.map((f) => f.id)];
  }, [groupId, groups, friends]);

  // Initialize when the sheet opens.
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setAmount(String(editing.amount));
      setDescription(editing.description);
      setCategory(editing.category);
      setCatTouched(true);
      setGroupId(editing.groupId);
      setPaidBy(editing.paidBy);
      setParticipants(editing.splits.map((s) => s.personId));
      setDate(new Date(editing.date));
      setNotes(editing.notes ?? "");
      setShowNotes(Boolean(editing.notes));
      setRecurring(editing.recurring === "monthly");
      setSplitMode("equal");
    } else {
      setAmount("");
      setDescription("");
      setCategory("food");
      setCatTouched(false);
      setGroupId(groupCtx);
      setPaidBy(ME_ID);
      const initPool = groupCtx
        ? groups.find((g) => g.id === groupCtx)?.memberIds ?? [ME_ID]
        : [ME_ID];
      setParticipants(initPool);
      setDate(new Date());
      setNotes("");
      setShowNotes(false);
      setRecurring(false);
      setSplitMode("equal");
      setExact({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const total = parseFloat(amount) || 0;

  function onDescription(v: string) {
    setDescription(v);
    if (!catTouched) {
      const g = guessCategory(v);
      if (g) setCategory(g);
    }
  }

  function switchGroup(id: ID | null) {
    setGroupId(id);
    const next = id ? groups.find((g) => g.id === id)?.memberIds ?? [ME_ID] : [ME_ID];
    setParticipants(next);
    if (!next.includes(paidBy)) setPaidBy(ME_ID);
  }

  function toggleParticipant(id: ID) {
    setParticipants((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  const exactSum = participants.reduce((a, id) => a + (parseFloat(exact[id]) || 0), 0);
  const exactRemaining = Math.round((total - exactSum) * 100) / 100;

  const splits: Split[] = useMemo(() => {
    if (participants.length === 0) return [];
    if (splitMode === "exact") {
      return participants.map((id) => ({ personId: id, amount: parseFloat(exact[id]) || 0 }));
    }
    const shares = splitEqually(total, participants.length);
    return participants.map((id, i) => ({ personId: id, amount: shares[i] }));
  }, [participants, splitMode, exact, total]);

  const valid =
    total > 0 &&
    description.trim().length > 0 &&
    participants.length > 0 &&
    (splitMode === "equal" || Math.abs(exactRemaining) < 0.01);

  function save() {
    if (!valid) return;
    const payload = {
      groupId,
      description: description.trim(),
      amount: total,
      category,
      paidBy,
      splits,
      date: date.toISOString(),
      notes: notes.trim() || undefined,
      recurring: (recurring ? "monthly" : "none") as "monthly" | "none",
    };
    if (editing) {
      updateExpense(editing.id, payload);
      toast({ message: "Expense updated" });
    } else {
      addExpense(payload);
      toast({ message: "Expense added" });
    }
    close();
  }

  const nameOf = (id: ID) => (id === ME_ID ? "You" : people.find((p) => p.id === id)?.name.split(" ")[0] ?? "—");
  const perHead = participants.length ? splitEqually(total, participants.length)[0] : 0;

  return (
    <Sheet open={open} onClose={close} title={editing ? "Edit expense" : "Add expense"}>
      <div className="flex flex-col gap-5 pt-1">
        {/* Amount */}
        <div className="flex flex-col items-center rounded-[18px] bg-surface-inset py-5">
          <span className="text-[0.72rem] font-semibold uppercase tracking-wide text-text-3">Amount</span>
          <div className="mt-1 flex items-center gap-1">
            <span className="font-display text-3xl font-semibold text-text-2">₹</span>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              inputMode="decimal"
              placeholder="0"
              className="w-[8ch] bg-transparent text-center font-display text-5xl font-bold tracking-tight text-text tnum outline-none placeholder:text-text-3"
            />
          </div>
        </div>

        {/* Description */}
        <Input
          value={description}
          onChange={(e) => onDescription(e.target.value)}
          placeholder="What was it for?"
          className="h-12 text-[1rem]"
        />

        {/* Category */}
        <div>
          <p className="mb-2 px-0.5 text-[0.8rem] font-semibold text-text-2">Category</p>
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
            {CATEGORY_LIST.map((c) => {
              const active = category === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => {
                    setCategory(c.key);
                    setCatTouched(true);
                  }}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-[0.82rem] font-medium transition-all",
                    active
                      ? "border-transparent bg-brand-soft text-brand-on-soft"
                      : "border-border bg-surface text-text-2 hover:border-border-strong",
                  )}
                >
                  <CategoryIcon category={c.key} size={22} />
                  {c.label.split(" ")[0]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Split within */}
        <div>
          <p className="mb-2 px-0.5 text-[0.8rem] font-semibold text-text-2">Split within</p>
          {inGroup && ctxGroup ? (
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3.5 py-2 text-[0.85rem] font-semibold text-brand-on-soft">
              <span>{ctxGroup.icon}</span>
              {ctxGroup.name}
            </div>
          ) : (
            <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
              <button
                onClick={() => switchGroup(null)}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-[0.82rem] font-medium transition-all",
                  groupId === null ? "border-transparent bg-brand text-on-brand" : "border-border text-text-2",
                )}
              >
                👥 Friends
              </button>
              {sortedGroups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => switchGroup(g.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-[0.82rem] font-medium transition-all",
                    groupId === g.id ? "border-transparent bg-brand text-on-brand" : "border-border text-text-2",
                  )}
                >
                  <span>{g.icon}</span>
                  {g.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Paid by */}
        <div>
          <p className="mb-2 px-0.5 text-[0.8rem] font-semibold text-text-2">Paid by</p>
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
            {pool.map((id) => {
              const person = people.find((p) => p.id === id);
              if (!person) return null;
              const active = paidBy === id;
              return (
                <button
                  key={id}
                  onClick={() => setPaidBy(id)}
                  className={cn(
                    "flex shrink-0 flex-col items-center gap-1.5 rounded-[14px] px-1 pt-1",
                  )}
                >
                  <span className={cn("rounded-full p-0.5 ring-2", active ? "ring-brand" : "ring-transparent")}>
                    <Avatar person={person} size="md" />
                  </span>
                  <span className={cn("text-[0.72rem]", active ? "font-semibold text-text" : "text-text-3")}>
                    {nameOf(id)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Participants + split */}
        <div>
          <div className="mb-2 flex items-center justify-between px-0.5">
            <p className="text-[0.8rem] font-semibold text-text-2">Split between</p>
            <Segmented
              value={splitMode}
              onChange={(v) => setSplitMode(v)}
              options={[
                { value: "equal", label: "Equally" },
                { value: "exact", label: "Exactly" },
              ]}
            />
          </div>

          <div className="overflow-hidden rounded-[16px] border border-border">
            {pool.map((id, i) => {
              const person = people.find((p) => p.id === id);
              if (!person) return null;
              const included = participants.includes(id);
              const share = splits.find((s) => s.personId === id)?.amount ?? 0;
              return (
                <div
                  key={id}
                  className={cn(
                    "flex items-center gap-3 px-3.5 py-2.5",
                    i > 0 && "border-t border-border",
                    !included && "opacity-45",
                  )}
                >
                  <button
                    onClick={() => toggleParticipant(id)}
                    aria-label={`Toggle ${nameOf(id)}`}
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
                      included ? "border-brand bg-brand text-on-brand" : "border-border-strong",
                    )}
                  >
                    {included && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                  </button>
                  <Avatar person={person} size="sm" />
                  <span className="flex-1 truncate text-[0.9rem] font-medium text-text">{nameOf(id)}</span>
                  {splitMode === "exact" && included ? (
                    <div className="flex items-center gap-1">
                      <span className="text-text-3">₹</span>
                      <input
                        value={exact[id] ?? ""}
                        onChange={(e) =>
                          setExact((prev) => ({ ...prev, [id]: e.target.value.replace(/[^0-9.]/g, "") }))
                        }
                        inputMode="decimal"
                        placeholder="0"
                        className="w-16 rounded-lg bg-surface-inset px-2 py-1 text-right text-[0.9rem] tnum outline-none focus:ring-2 focus:ring-brand"
                      />
                    </div>
                  ) : (
                    included && <span className="tnum text-[0.9rem] font-semibold text-text-2">{formatINR(share)}</span>
                  )}
                </div>
              );
            })}
          </div>

          <p className="mt-2 px-0.5 text-[0.78rem] text-text-3">
            {splitMode === "equal" ? (
              participants.length > 0 ? (
                <>
                  {formatINR(perHead)} per person · {participants.length}{" "}
                  {participants.length === 1 ? "person" : "people"}
                </>
              ) : (
                "Select at least one person"
              )
            ) : Math.abs(exactRemaining) < 0.01 ? (
              <span className="text-positive">Splits add up 🎉</span>
            ) : (
              <span className={exactRemaining < 0 ? "text-negative" : ""}>
                {formatINR(Math.abs(exactRemaining))} {exactRemaining > 0 ? "left to assign" : "over"}
              </span>
            )}
          </p>
        </div>

        {/* Date + options */}
        <div className="flex flex-wrap gap-2">
          <Popover open={dateOpen} onOpenChange={setDateOpen}>
            <PopoverTrigger
              render={
                <button className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-2 text-[0.82rem] font-medium text-text-2 transition-colors hover:border-border-strong">
                  <CalendarDays className="h-4 w-4" />
                  {formatDate(date.toISOString(), true)}
                </button>
              }
            />
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => {
                  if (d) setDate(d);
                  setDateOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>

          <button
            onClick={() => setShowNotes((v) => !v)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[0.82rem] font-medium transition-colors",
              showNotes ? "border-transparent bg-brand-soft text-brand-on-soft" : "border-border text-text-2 hover:border-border-strong",
            )}
          >
            <StickyNote className="h-4 w-4" />
            Note
          </button>

          <button
            onClick={() => setRecurring((v) => !v)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[0.82rem] font-medium transition-colors",
              recurring ? "border-transparent bg-brand-soft text-brand-on-soft" : "border-border text-text-2 hover:border-border-strong",
            )}
          >
            <Repeat className="h-4 w-4" />
            Monthly
          </button>
        </div>

        {showNotes && (
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add a note (optional)"
            rows={2}
          />
        )}

        {/* Actions */}
        <div className="sticky bottom-0 -mx-5 flex gap-3 border-t border-border bg-surface px-5 pb-1 pt-3">
          {editing && (
            <Button
              variant="dangerSoft"
              size="lg"
              onClick={() => {
                deleteExpense(editing.id);
                toast({ message: "Expense deleted", tone: "info" });
                close();
              }}
              aria-label="Delete expense"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button variant="primary" size="lg" fullWidth disabled={!valid} onClick={save}>
            {editing ? "Save changes" : "Add expense"}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
