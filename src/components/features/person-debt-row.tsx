"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useStore, usePerson } from "@/store/useStore";
import { useUI } from "@/store/useUI";
import { formatINR, cn } from "@/lib/utils";
import type { PersonDebt, ScopeId } from "@/lib/balances";

/** A friend you have balances with, across one or more scopes (groups + direct). */
export function PersonDebtRow({ debt }: { debt: PersonDebt }) {
  const person = usePerson(debt.personId);
  const groups = useStore((s) => s.groups);
  const openSettle = useUI((s) => s.openSettle);
  const [open, setOpen] = useState(false);

  if (!person) return null;

  const theyOwe = debt.total > 0;
  const multi = debt.scopes.length > 1;
  const scopeLabel = (id: ScopeId) => (id === null ? "Direct" : groups.find((g) => g.id === id)?.name ?? "Group");

  return (
    <div>
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => multi && setOpen((v) => !v)}
          className={cn("flex min-w-0 flex-1 items-center gap-3 text-left", multi && "cursor-pointer")}
          aria-expanded={multi ? open : undefined}
        >
          <Avatar person={person} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-text">{person.name}</p>
            <p className="flex items-center gap-1 text-[0.82rem] text-text-2">
              {theyOwe ? "owes you " : "you owe "}
              <span className={cn("tnum font-semibold", theyOwe ? "text-positive" : "text-negative")}>
                {formatINR(Math.abs(debt.total))}
              </span>
              {multi ? (
                <span className="text-text-3">· {debt.scopes.length} places</span>
              ) : debt.scopes[0].scopeId !== null ? (
                <span className="truncate text-text-3">· {scopeLabel(debt.scopes[0].scopeId)}</span>
              ) : null}
              {multi && (
                <ChevronDown
                  className={cn("h-3.5 w-3.5 text-text-3 transition-transform", open && "rotate-180")}
                />
              )}
            </p>
          </div>
        </button>
        <Button
          size="sm"
          variant={theyOwe ? "soft" : "primary"}
          onClick={() => openSettle({ personId: debt.personId, amount: debt.total })}
        >
          {theyOwe ? "Remind" : "Settle up"}
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {multi && open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-1 px-4 pb-3 pl-[3.75rem]">
              {debt.scopes.map((s) => {
                const owe = s.amount < 0;
                return (
                  <button
                    key={s.scopeId ?? "direct"}
                    onClick={() => openSettle({ personId: debt.personId, amount: s.amount, groupId: s.scopeId })}
                    className="flex items-center gap-2 rounded-[10px] px-2.5 py-2 text-left transition-colors hover:bg-surface-inset"
                  >
                    <span className="min-w-0 flex-1 truncate text-[0.82rem] text-text-2">{scopeLabel(s.scopeId)}</span>
                    <span className={cn("tnum text-[0.82rem] font-semibold", owe ? "text-negative" : "text-positive")}>
                      {owe ? "you owe " : "owes you "}
                      {formatINR(Math.abs(s.amount))}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
