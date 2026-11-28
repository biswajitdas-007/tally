"use client";

import { useState } from "react";
import { CalendarDays, Info, Repeat, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { formatDate } from "@/lib/utils";

const CHIP = "h-10 gap-1.5 rounded-full border-[1.5px] px-3 text-[0.8125rem] font-bold";
const PRESSED = "data-pressed:border-transparent data-pressed:bg-brand-soft data-pressed:text-brand-on-soft";

function dayLabel(date: Date): string {
  return date.toDateString() === new Date().toDateString() ? "Today" : formatDate(date.toISOString(), true);
}

function ordinalNote(date: Date): string {
  const day = Math.min(date.getDate(), 28);
  return `${day}${date.getDate() > 28 ? "th (28th)" : ""}`;
}

/** Date, note and monthly repeat — the secondary details, tucked into one row. */
export function ExtrasRow({
  date,
  onDate,
  showNotes,
  onShowNotes,
  notes,
  onNotes,
  recurring,
  onRecurring,
}: Readonly<{
  date: Date;
  onDate: (d: Date) => void;
  showNotes: boolean;
  onShowNotes: (v: boolean) => void;
  notes: string;
  onNotes: (v: string) => void;
  recurring: boolean;
  onRecurring: (v: boolean) => void;
}>) {
  const [dateOpen, setDateOpen] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Popover open={dateOpen} onOpenChange={setDateOpen}>
          <PopoverTrigger
            render={
              <Button variant="outline" className={`${CHIP} shadow-none`}>
                <CalendarDays className="size-4" strokeWidth={1.8} aria-hidden />
                {dayLabel(date)}
                <span className="sr-only">, change date</span>
              </Button>
            }
          />
          <PopoverContent align="start" className="w-auto p-0">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => {
                if (d) onDate(d);
                setDateOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
        <Toggle variant="outline" pressed={showNotes} onPressedChange={onShowNotes} className={`${CHIP} ${PRESSED}`}>
          <StickyNote className="size-4" strokeWidth={1.8} aria-hidden />
          Note
        </Toggle>
        <Toggle variant="outline" pressed={recurring} onPressedChange={onRecurring} className={`${CHIP} ${PRESSED}`}>
          <Repeat className="size-4" strokeWidth={1.8} aria-hidden />
          Monthly
        </Toggle>
      </div>

      {recurring && (
        <p className="flex items-start gap-1.5 text-[0.8125rem] leading-snug text-text-2">
          <Info className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.8} aria-hidden />
          A fresh copy is added each month on the {ordinalNote(date)}, split the same way. Everyone in it gets told.
        </p>
      )}

      {showNotes && (
        <Textarea
          value={notes}
          onChange={(e) => onNotes(e.target.value)}
          placeholder="Add a note (optional)"
          aria-label="Note"
          rows={2}
          className="rounded-[16px]"
        />
      )}
    </div>
  );
}
