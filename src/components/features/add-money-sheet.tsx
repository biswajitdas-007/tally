"use client";

import { useState } from "react";
import { CalendarDays, Check, Trash2 } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CATEGORIES, CATEGORY_LIST, INCOME_LIST } from "@/lib/categories";
import { AccountPicker } from "./account-picker";
import { useStore, useMyId } from "@/store/useStore";
import { useUI } from "@/store/useUI";
import { useToast } from "@/components/ui/toast";
import { budgetIncome, crossingWarning, monthlyMoney, spendByCategory } from "@/lib/money";
import { cn, formatDate, monthKey } from "@/lib/utils";
import type { CategoryKey, FinanceType } from "@/lib/types";

export function AddMoneySheet() {
  const open = useUI((s) => s.moneyOpen);
  const initialType = useUI((s) => s.moneyType);
  const editId = useUI((s) => s.moneyEditId);
  const close = useUI((s) => s.closeMoney);
  const finance = useStore((s) => s.finance);
  const expenses = useStore((s) => s.expenses);
  const budget = useStore((s) => s.budget);
  const addFinance = useStore((s) => s.addFinance);
  const updateFinance = useStore((s) => s.updateFinance);
  const deleteFinance = useStore((s) => s.deleteFinance);
  const myId = useMyId() ?? "";
  const { toast } = useToast();

  const editing = editId ? finance.find((f) => f.id === editId) ?? null : null;

  const [type, setType] = useState<FinanceType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>("food");
  const [date, setDate] = useState<Date>(new Date());
  const [dateOpen, setDateOpen] = useState(false);
  const [note, setNote] = useState("");
  const [accountId, setAccountId] = useState<string | null>(null);

  // Initialize during render when the sheet opens — no flash of stale values.
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    if (editing) {
      setType(editing.type);
      setAmount(String(editing.amount));
      setCategory(editing.category);
      setDate(new Date(editing.date));
      setNote(editing.note ?? "");
      setAccountId(editing.accountId ?? null);
    } else {
      setType(initialType);
      setAmount("");
      setCategory(initialType === "income" ? "salary" : "food");
      setDate(new Date());
      setNote("");
      setAccountId(null);
    }
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  const isIncome = type === "income";
  const cats = isIncome ? INCOME_LIST : CATEGORY_LIST;
  const total = parseFloat(amount) || 0;
  const valid = total > 0;

  function switchType(t: FinanceType) {
    setType(t);
    setCategory(t === "income" ? "salary" : "food");
  }

  // A nudge if a new current-month expense crosses a category cap or your income.
  function budgetWarning(): string | null {
    if (isIncome) return null;
    const mKey = monthKey(date.toISOString());
    if (mKey !== monthKey(new Date().toISOString())) return null;
    const mm = monthlyMoney(finance, expenses, myId, mKey);

    const cap = budget.limits[category as CategoryKey];
    if (cap) {
      const catBefore = spendByCategory(finance, expenses, myId, mKey).find((c) => c.category === category)?.amount ?? 0;
      const w = crossingWarning(catBefore, catBefore + total, cap, CATEGORIES[category as CategoryKey]?.label ?? "category");
      if (w) return w;
    }
    return crossingWarning(mm.spend, mm.spend + total, budgetIncome(budget, mm.income), "monthly income");
  }

  function save() {
    if (!valid) return;
    const payload = { type, amount: total, category, date: date.toISOString(), note: note.trim() || undefined, accountId: accountId ?? undefined };
    if (editing) {
      updateFinance(editing.id, payload);
      toast({ message: "Entry updated" });
    } else {
      const warn = budgetWarning();
      addFinance(payload);
      toast(warn ? { message: warn, tone: "info" } : { message: isIncome ? "Income added" : "Expense added" });
    }
    close();
  }

  return (
    <Sheet open={open} onClose={close} title={`${editing ? "Edit" : "Add"} ${isIncome ? "income" : "expense"}`}>
      <div className="flex flex-col gap-5 pt-1">
        {/* Type */}
        <Segmented<FinanceType>
          value={type}
          onChange={switchType}
          className="w-full"
          options={[
            { value: "expense", label: "Expense" },
            { value: "income", label: "Income" },
          ]}
        />

        {/* Amount */}
        <div className="flex flex-col items-center rounded-[18px] bg-surface-inset py-5">
          <span className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-text-3">
            {isIncome ? "Money in" : "Money out"}
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
                "bg-transparent text-left font-display text-[3.25rem] font-bold leading-none tracking-tight tnum outline-none placeholder:text-text-3",
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

        {/* Account */}
        <AccountPicker value={accountId} onChange={setAccountId} label={isIncome ? "Into which account?" : "Paid from"} />

        {/* Date + note */}
        <div>
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
        </div>

        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note (optional)" rows={2} />

        {/* Actions */}
        <div className="sticky bottom-0 -mx-5 flex gap-3 border-t border-border bg-surface px-5 pb-1 pt-3">
          {editing && (
            <Button
              variant="dangerSoft"
              size="lg"
              onClick={() => {
                deleteFinance(editing.id);
                toast({ message: "Entry deleted", tone: "info" });
                close();
              }}
              aria-label="Delete entry"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button variant="primary" size="lg" fullWidth disabled={!valid} onClick={save}>
            <Check className="h-4.5 w-4.5" />
            {editing ? "Save changes" : isIncome ? "Add income" : "Add expense"}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
