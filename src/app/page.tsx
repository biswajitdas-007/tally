"use client";

import { Suspense, useMemo } from "react";
import { ArrowLeftRight, ChevronRight, Receipt } from "lucide-react";
import { BalanceHero } from "@/components/features/balance-hero";
import { QuickActions } from "@/components/features/quick-actions";
import { GroupTile, NewGroupTile } from "@/components/features/group-tile";
import { ExpenseRow } from "@/components/features/expense-row";
import { SplitOverviewCard } from "@/components/features/split-overview-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageGrid, PageCol } from "@/components/app/page-grid";
import { SectionTitle } from "@/components/app/section-title";
import { MoneyMovedBanner } from "@/components/app/money-moved-banner";
import { ShortcutAction } from "@/components/app/shortcut-action";
import { useStore, useMe, useMyId } from "@/store/useStore";
import { useUI } from "@/store/useUI";
import { useToast } from "@/components/ui/toast";
import { scopedDebts, splitOverview } from "@/lib/balances";
import { recentActivity } from "@/lib/activity";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function WhoOwesWhom() {
  return (
    <Button
      variant="outline"
      onClick={() => useUI.getState().openWhoOwesWhom()}
      className="h-auto w-full justify-start gap-3 rounded-[24px] border-[1.5px] px-4 py-3.5 text-left font-normal tracking-normal whitespace-normal shadow-none active:scale-100"
    >
      <span
        aria-hidden
        className="flex size-[42px] shrink-0 items-center justify-center rounded-[14px] bg-violet-soft text-violet-on-soft"
      >
        <ArrowLeftRight className="size-5" strokeWidth={1.7} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.9375rem] font-bold text-text">Who owes whom</span>
        <span className="block text-[0.8125rem] text-text-2">See all your outstanding balances</span>
      </span>
      <ChevronRight className="size-5 text-text-3" strokeWidth={1.7} aria-hidden />
    </Button>
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
  const { toast } = useToast();

  const debts = useMemo(() => scopedDebts(expenses, myId ?? ""), [expenses, myId]);
  const splits = useMemo(() => splitOverview(expenses, myId ?? ""), [expenses, myId]);
  const recent = useMemo(() => recentActivity(expenses, 7), [expenses]);
  const topGroups = groups.slice(0, 6);

  function quickSettle() {
    const debt = debts.find((b) => b.total < 0);
    if (debt) openSettle({ personId: debt.personId, amount: debt.total });
    else toast({ message: "You're all settled up 🎉", tone: "info" });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Reads the URL, so it needs its own boundary to keep the page prerendering. */}
      <Suspense fallback={null}>
        <ShortcutAction onAdd={() => openAdd()} onSettle={quickSettle} />
      </Suspense>

      <div>
        <p className="text-[0.9375rem] font-semibold text-text-2">{greeting()},</p>
        <h1 className="text-[2.125rem] leading-[1.1] font-semibold tracking-[-0.035em] text-text">
          Hi, <span className="font-accent tracking-[-0.01em]">{me?.name?.split(" ")[0] ?? "there"}</span>
        </h1>
      </div>

      <PageGrid>
        <PageCol>
          <BalanceHero />
          <QuickActions
            onAdd={() => openAdd()}
            onSettle={quickSettle}
            onCreateGroup={openCreateGroup}
            onInvite={() => openInvite(null)}
          />
          <SplitOverviewCard direct={splits.direct} group={splits.group} />
          <MoneyMovedBanner />
        </PageCol>

        <PageCol>
          <WhoOwesWhom />

          <section aria-labelledby="home-groups">
            <SectionTitle id="home-groups" title="Your groups" href="/groups" />
            {/* Bleeds to the screen edge so the next tile peeks in as a scroll hint; the
                padding keeps focus rings and the hover lift inside the scroller. */}
            <div className="-mx-4 -my-1.5 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 py-1.5 md:-mx-1.5 md:scroll-px-1.5 md:px-1.5">
              {topGroups.map((g) => (
                <GroupTile key={g.id} group={g} />
              ))}
              <NewGroupTile onClick={openCreateGroup} />
            </div>
          </section>

          <section aria-labelledby="home-recent">
            <SectionTitle id="home-recent" title="Recent activity" href="/activity" />
            {recent.length > 0 ? (
              <div className="-mx-4 flex flex-col md:-mx-2">
                {recent.map((e) => (
                  <ExpenseRow key={e.id} expense={e} showGroup className="rounded-[16px] py-2 md:px-2" />
                ))}
              </div>
            ) : (
              <Card>
                <EmptyState
                  icon={Receipt}
                  title="Nothing yet"
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
