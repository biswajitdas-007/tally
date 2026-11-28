"use client";

import { useState } from "react";
import { guessExpenseCategory } from "@/lib/categorise";
import type { ExpenseFormState } from "@/lib/expense-form";
import type { CategoryKey, Group, ID } from "@/lib/types";

/** Form state for the add/edit expense sheet, with its few non-trivial updates. */
export function useExpenseForm(initial: ExpenseFormState) {
  const [state, setState] = useState(initial);

  function set<K extends keyof ExpenseFormState>(key: K, value: ExpenseFormState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  /** Typing a description guesses the category until the user picks one. */
  function setDescription(description: string) {
    setState((prev) => {
      const guess = prev.categoryTouched ? null : guessExpenseCategory(description);
      return { ...prev, description, category: guess ?? prev.category };
    });
  }

  function setCategory(category: CategoryKey) {
    setState((prev) => ({ ...prev, category, categoryTouched: true }));
  }

  /** Moving to another group (or to friends) resets who's in, and the payer if they're not in it. */
  function switchGroup(groupId: ID | null, groups: Group[], myId: ID) {
    setState((prev) => {
      const participants = groupId ? (groups.find((g) => g.id === groupId)?.memberIds ?? [myId]) : [myId];
      return { ...prev, groupId, participants, paidBy: participants.includes(prev.paidBy) ? prev.paidBy : myId };
    });
  }

  function toggleParticipant(id: ID) {
    setState((prev) => ({
      ...prev,
      participants: prev.participants.includes(id)
        ? prev.participants.filter((p) => p !== id)
        : [...prev.participants, id],
    }));
  }

  function setExactShare(id: ID, value: string) {
    setState((prev) => ({ ...prev, exact: { ...prev.exact, [id]: value } }));
  }

  return { state, set, setDescription, setCategory, switchGroup, toggleParticipant, setExactShare };
}
