"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Plus, Minus, ArrowLeftRight, Users, UserPlus, ChevronRight, Receipt, Sparkles, Check,
  Wallet, ArrowDownLeft, ArrowUpRight, PiggyBank, X,
} from "lucide-react";
import { BalanceHero } from "@/components/features/balance-hero";
import { GroupCard } from "@/components/features/group-card";
import { ExpenseRow } from "@/components/features/expense-row";
import { PersonDebtRow } from "@/components/features/person-debt-row";
import { SplitOverviewCard } from "@/components/features/split-overview-card";
import { PendingSplitsCard } from "@/components/features/pending-splits-card";
import { MoneyRow } from "@/components/features/money-row";
import { Card, SectionHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageGrid, PageCol } from "@/components/app/page-grid";
import { useStore, useMe, useMyId } from "@/store/useStore";
import { useUI } from "@/store/useUI";
import { useToast } from "@/components/ui/toast";
import { scopedDebts, splitOverview, pendingFromSplits } from "@/lib/balances";
import { recentActivity } from "@/lib/activity";
import { monthlyMoney } from "@/lib/money";
import { healthScore, type SetupKey } from "@/lib/health";
import { usesMoney } from "@/lib/money-mode";
import { formatINR, monthKey, cn } from "@/lib/utils";

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

/** This month's cashflow — the headline for anyone tracking their own money. */
function MonthHero({ income, spend, net }: { income: number; spend: number; net: number }) {
  const over = net < -0.5;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 240, damping: 26 }}
    >
      <Link
        href="/money"
        className="relative block overflow-hidden rounded-[24px] p-5 text-white shadow-[var(--shadow-lg)]"
        style={{
          background: over
            ? "linear-gradient(152deg,#c2623f 0%,#a4462a 48%,#7f321d 100%)"
            : "linear-gradient(152deg,#22795d 0%,#185a44 46%,#0f3f2e 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage: "repeating-linear-gradient(90deg, rgba(255,255,255,0.6) 0 1px, transparent 1px 27px)",
            maskImage: "linear-gradient(to bottom, transparent, #000 30%, #000 70%, transparent)",
          }}
        />
        <div className="relative">
          <div className="flex items-center justify-between">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-white/60">
              {over ? "Over budget this month" : "Left this month"}
            </p>
            <ChevronRight className="h-4 w-4 text-white/50" />
          </div>
          <p className="mt-1 font-display text-[2.5rem] font-bold leading-none tracking-[-0.03em] tnum">
            {formatINR(Math.abs(net))}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <div className="rounded-[14px] bg-white/10 p-3 ring-1 ring-white/10">
              <div className="flex items-center gap-1.5 text-white/70">
                <ArrowDownLeft className="h-3.5 w-3.5" />
                <span className="text-[0.72rem] font-medium">Money in</span>
              </div>
              <p className="mt-1 font-display text-xl font-bold tnum" style={{ color: "#a6f2cf" }}>
                {formatINR(income)}
              </p>
            </div>
            <div className="rounded-[14px] bg-white/10 p-3 ring-1 ring-white/10">
              <div className="flex items-center gap-1.5 text-white/70">
                <ArrowUpRight className="h-3.5 w-3.5" />
                <span className="text-[0.72rem] font-medium">Money out</span>
              </div>
              <p className="mt-1 font-display text-xl font-bold tnum" style={{ color: "#ffc0a6" }}>
                {formatINR(spend)}
              </p>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function HomePage() {
  const me = useMe();
  const myId = useMyId();
  const expenses = useStore((s) => s.expenses);
  const groups = useStore((s) => s.groups);
  const finance = useStore((s) => s.finance);
  const budget = useStore((s) => s.budget);
  const accounts = useStore((s) => s.accounts);
  const liabilities = useStore((s) => s.liabilities);
  const emergency = useStore((s) => s.emergency);
  const moneyMode = useStore((s) => s.moneyMode);
  const updateProfile = useStore((s) => s.updateProfile);
  const openAdd = useUI((s) => s.openAdd);
  const openMoney = useUI((s) => s.openMoney);
  const openWealth = useUI((s) => s.openWealth);
  const openEmergency = useUI((s) => s.openEmergency);
  const openInvite = useUI((s) => s.openInvite);
  const openCreateGroup = useUI((s) => s.openCreateGroup);
  const openSettle = useUI((s) => s.openSettle);
  const { toast } = useToast();

  const money = usesMoney({ pref: moneyMode ?? undefined, finance, accounts, liabilities, budget, emergency });

  const debts = useMemo(() => scopedDebts(expenses, myId ?? ""), [expenses, myId]);
  const splits = useMemo(() => splitOverview(expenses, myId ?? ""), [expenses, myId]);
  const month = useMemo(
    () => monthlyMoney(finance, expenses, myId ?? "", monthKey(new Date().toISOString())),
    [finance, expenses, myId],
  );
  const health = useMemo(
    () => healthScore({ finance, expenses, meId: myId ?? "", budget, accounts, liabilities, emergency }),
    [finance, expenses, myId, budget, accounts, liabilities, emergency],
  );
  const recent = useMemo(() => recentActivity(expenses, finance, 7, money), [expenses, finance, money]);
  const pending = useMemo(() => pendingFromSplits(expenses, myId ?? ""), [expenses, myId]);
  const topGroups = groups.slice(0, 3);

  // Only for a genuinely new account. Someone who already has accounts or
  // logged spending doesn't need a welcome — and the same checklist already
  // lives on Wealth, where it belongs once they're going.
  const fresh =
    money && !health.ready && finance.length === 0 && accounts.length === 0 && liabilities.length === 0;

  function quickSettle() {
    const debt = debts.find((b) => b.total < 0);
    if (debt) openSettle({ personId: debt.personId, amount: debt.total });
    else toast({ message: "You're all settled up 🎉", tone: "info" });
  }

  function runSetup(key: SetupKey) {
    if (key === "income") openMoney("income");
    else if (key === "spending") openMoney("expense");
    else if (key === "accounts") openWealth("asset");
    else openEmergency();
  }

  const debtList = (
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
  );

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
              <p className="text-[0.78rem] leading-snug text-text-3">Three quick things and it starts working for you.</p>
            </div>
            <span className="shrink-0 tnum text-[0.78rem] font-semibold text-text-2">
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
          {/* The headline depends on what this person uses Tally for. */}
          {money ? <MonthHero income={month.income} spend={month.spend} net={month.net} /> : <BalanceHero />}

          <div className="flex gap-2.5">
            {money ? (
              <>
                <QuickAction icon={Minus} label="Expense" tint="var(--negative)" onClick={() => openMoney("expense")} />
                <QuickAction icon={Plus} label="Income" tint="var(--positive)" onClick={() => openMoney("income")} />
                <QuickAction icon={Users} label="Split" tint="var(--brand)" onClick={() => openAdd()} />
                <QuickAction icon={ArrowLeftRight} label="Settle" tint="var(--info)" onClick={quickSettle} />
              </>
            ) : (
              <>
                <QuickAction icon={Plus} label="Add" tint="var(--brand)" onClick={() => openAdd()} />
                <QuickAction icon={ArrowLeftRight} label="Settle" tint="var(--info)" onClick={quickSettle} />
                <QuickAction icon={Users} label="Group" tint="var(--cat-fun)" onClick={openCreateGroup} />
                <QuickAction icon={UserPlus} label="Invite" tint="var(--brass)" onClick={() => openInvite(null)} />
              </>
            )}
          </div>

          {/* Splits, broken into the two kinds people actually think in */}
          <section>
            <SectionHeader title="Your splits" />
            <SplitOverviewCard direct={splits.direct} group={splits.group} />
          </section>

          {money && pending.any && <PendingSplitsCard pending={pending} />}

          {money && debtList}

          {money && (
            <Link
              href="/money"
              className="flex items-center gap-3.5 rounded-[16px] border border-border bg-surface p-4 shadow-[var(--shadow-xs)] transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[var(--shadow-md)]"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                <Wallet className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[0.9rem] font-semibold text-text">Your money</p>
                <p className="text-[0.76rem] leading-snug text-text-3">
                  Budget, net worth, repeats and your health score.
                </p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-text-3" />
            </Link>
          )}
        </PageCol>

        <PageCol>
          {!money && debtList}

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
                  {recent.map((item) =>
                    item.kind === "split" ? (
                      <ExpenseRow key={item.id} expense={item.expense} showGroup />
                    ) : (
                      <MoneyRow key={item.id} entry={item.entry} showKind />
                    ),
                  )}
                </div>
              </Card>
            ) : (
              <Card>
                <EmptyState
                  icon={Receipt}
                  title="Nothing yet"
                  description={
                    money
                      ? "Your spending and splits will show up here."
                      : "Tap the + button to add your first shared expense."
                  }
                />
              </Card>
            )}
          </section>

          {/* Split-only: offer the money side once, without nagging */}
          {!money && (
            <button
              onClick={() => {
                updateProfile({ moneyMode: true });
                toast({ message: "Money tracking is on — your home screen has changed" });
              }}
              className="flex items-center gap-3.5 rounded-[16px] border border-border bg-surface p-4 text-left shadow-[var(--shadow-xs)] transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[var(--shadow-md)]"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                <PiggyBank className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[0.9rem] font-semibold text-text">Track your own money too?</p>
                <p className="text-[0.76rem] leading-snug text-text-3">
                  Income, spending, budgets and net worth — alongside your splits.
                </p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-text-3" />
            </button>
          )}

          {/* And a way back out, while there's nothing to lose */}
          {money && moneyMode === true && finance.length === 0 && accounts.length === 0 && (
            <button
              onClick={() => {
                updateProfile({ moneyMode: false });
                toast({ message: "Back to splits only", tone: "info" });
              }}
              className="flex items-center gap-2 self-start rounded-full border border-border px-3.5 py-2 text-[0.78rem] font-medium text-text-3 transition-colors hover:border-border-strong hover:text-text-2"
            >
              <X className="h-3.5 w-3.5" /> Just splitting, actually
            </button>
          )}
        </PageCol>
      </PageGrid>
    </div>
  );
}
