"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Plus, ArrowLeftRight, Users, UserPlus, ChevronRight, Receipt, Sparkles, Check } from "lucide-react";
import { BalanceHero } from "@/components/features/balance-hero";
import { GroupCard } from "@/components/features/group-card";
import { ExpenseRow } from "@/components/features/expense-row";
import { PersonDebtRow } from "@/components/features/person-debt-row";
import { Card, SectionHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageGrid, PageCol } from "@/components/app/page-grid";
import { useStore, useMe, useMyId } from "@/store/useStore";
import { useUI } from "@/store/useUI";
import { useToast } from "@/components/ui/toast";
import { scopedDebts } from "@/lib/balances";
import { healthScore, type SetupKey } from "@/lib/health";
import { cn } from "@/lib/utils";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function QuickAction({
  icon: Icon,
  label,
  onClick,
  tint,
}: {
  icon: typeof Plus;
  label: string;
  onClick: () => void;
  tint: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-1 flex-col items-center gap-1.5 rounded-[16px] border border-border bg-surface py-3 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)]"
    >
      <span
        className="flex h-9 w-9 items-center justify-center rounded-full"
        style={{ background: `color-mix(in srgb, ${tint} 15%, transparent)`, color: tint }}
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="text-[0.72rem] font-semibold text-text-2">{label}</span>
    </button>
  );
}

export default function HomePage() {
  const me = useMe();
  const myId = useMyId();
  const expenses = useStore((s) => s.expenses);
  const groups = useStore((s) => s.groups);
  const openAdd = useUI((s) => s.openAdd);
  const openInvite = useUI((s) => s.openInvite);
  const openCreateGroup = useUI((s) => s.openCreateGroup);
  const openSettle = useUI((s) => s.openSettle);
  const openMoney = useUI((s) => s.openMoney);
  const openWealth = useUI((s) => s.openWealth);
  const openEmergency = useUI((s) => s.openEmergency);
  const finance = useStore((s) => s.finance);
  const budget = useStore((s) => s.budget);
  const accounts = useStore((s) => s.accounts);
  const liabilities = useStore((s) => s.liabilities);
  const emergency = useStore((s) => s.emergency);
  const { toast } = useToast();

  const health = useMemo(
    () => healthScore({ finance, expenses, meId: myId ?? "", budget, accounts, liabilities, emergency }),
    [finance, expenses, myId, budget, accounts, liabilities, emergency],
  );
  // Only worth showing while they're actually getting started.
  const fresh = !health.ready && expenses.length === 0;

  function runSetup(key: SetupKey) {
    if (key === "income") openMoney("income");
    else if (key === "spending") openMoney("expense");
    else if (key === "accounts") openWealth("asset");
    else openEmergency();
  }

  const debts = useMemo(() => scopedDebts(expenses, myId ?? ""), [expenses, myId]);
  const recent = useMemo(
    () => [...expenses].sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, 6),
    [expenses],
  );
  const topGroups = groups.slice(0, 3);

  function quickSettle() {
    const debt = debts.find((b) => b.total < 0);
    if (debt) openSettle({ personId: debt.personId, amount: debt.total });
    else toast({ message: "You're all settled up 🎉", tone: "info" });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-text-2">{greeting()},</p>
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em] text-text">
          {me?.name?.split(" ")[0] ?? "there"}
        </h1>
      </div>

      {fresh && (
        <Card className="p-5">
          <div className="flex items-center gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[0.95rem] font-semibold text-text">Welcome to Tally</p>
              <p className="text-[0.78rem] leading-snug text-text-3">
                Three quick things and it starts working for you.
              </p>
            </div>
            <span className="shrink-0 text-[0.78rem] font-semibold text-text-2 tnum">
              {health.setupDone}/{health.setupTotal}
            </span>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            {health.setup.map((step) => (
              <button
                key={step.key}
                onClick={() => runSetup(step.key)}
                disabled={step.done}
                className={cn(
                  "flex items-center gap-3 rounded-[13px] border px-3.5 py-2.5 text-left transition-all",
                  step.done
                    ? "border-transparent bg-surface-inset"
                    : "border-border bg-surface hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[var(--shadow-sm)]",
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                    step.done ? "border-transparent bg-positive text-white" : "border-border-strong text-text-3",
                  )}
                >
                  {step.done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <Plus className="h-3.5 w-3.5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-[0.88rem] font-medium", step.done ? "text-text-3 line-through" : "text-text")}>
                    {step.label}
                  </span>
                  {!step.done && <span className="block text-[0.74rem] leading-snug text-text-3">{step.hint}</span>}
                </span>
              </button>
            ))}
          </div>
        </Card>
      )}

      <PageGrid>
        <PageCol>
          <BalanceHero />

          <div className="flex gap-2.5">
            <QuickAction icon={Plus} label="Add" tint="var(--brand)" onClick={() => openAdd()} />
            <QuickAction icon={ArrowLeftRight} label="Settle" tint="var(--info)" onClick={quickSettle} />
            <QuickAction icon={Users} label="Group" tint="var(--cat-fun)" onClick={openCreateGroup} />
            <QuickAction icon={UserPlus} label="Invite" tint="var(--brass)" onClick={() => openInvite(null)} />
          </div>

          {/* Balances by person */}
          <section>
            <SectionHeader title="Who owes whom" />
            {debts.length > 0 ? (
              <Card className="overflow-hidden">
                <div className="divide-y divide-border">
                  {debts.slice(0, 5).map((d) => (
                    <PersonDebtRow key={d.personId} debt={d} />
                  ))}
                </div>
              </Card>
            ) : (
              <Card>
                <EmptyState
                  icon={ArrowLeftRight}
                  title="All settled up"
                  description="No outstanding balances. Add an expense to start splitting."
                />
              </Card>
            )}
          </section>
        </PageCol>

        <PageCol>
          {/* Groups */}
          <section>
            <SectionHeader
              title="Your groups"
              action={
                <Link href="/groups" className="flex items-center gap-0.5 text-[0.78rem] font-semibold text-brand">
                  See all <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              }
            />
            <div className="flex flex-col gap-2.5">
              {topGroups.map((g) => (
                <GroupCard key={g.id} group={g} />
              ))}
              <button
                onClick={openCreateGroup}
                className="flex items-center justify-center gap-2 rounded-[16px] border border-dashed border-border-strong py-3 text-[0.85rem] font-semibold text-text-2 transition-colors hover:bg-surface-inset"
              >
                <Plus className="h-4 w-4" /> New group
              </button>
            </div>
          </section>

          {/* Recent activity */}
          <section>
            <SectionHeader
              title="Recent activity"
              action={
                <Link href="/activity" className="flex items-center gap-0.5 text-[0.78rem] font-semibold text-brand">
                  See all <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              }
            />
            {recent.length > 0 ? (
              <Card className="overflow-hidden">
                <div className="divide-y divide-border">
                  {recent.map((e) => (
                    <ExpenseRow key={e.id} expense={e} showGroup />
                  ))}
                </div>
              </Card>
            ) : (
              <Card>
                <EmptyState
                  icon={Receipt}
                  title="No expenses yet"
                  description="Tap the + button to add your first shared expense."
                />
              </Card>
            )}
          </section>
        </PageCol>
      </PageGrid>
    </div>
  );
}
