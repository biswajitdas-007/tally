import { useStore, useMyId } from "@/store/useStore";
import { useUI } from "@/store/useUI";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/utils";
import { liveLiabilityOutstanding } from "@/lib/liabilities";
import { LIABILITY_KIND_META } from "@/lib/categories";
import { CreditCard, Settings, Plus } from "lucide-react";
import type { LiabilityKind } from "@/lib/types";

export function CardDashboardSheet() {
  const open = useUI((s) => s.cardDashboardId !== null);
  const cardId = useUI((s) => s.cardDashboardId);
  const close = useUI((s) => s.closeCardDashboard);
  
  const liabilities = useStore((s) => s.liabilities);
  const finance = useStore((s) => s.finance);
  const expenses = useStore((s) => s.expenses);
  const myId = useMyId() ?? "";
  
  const openTransfer = useUI((s) => s.openTransfer);
  const openWealth = useUI((s) => s.openWealth);

  const card = cardId ? liabilities.find((l) => l.id === cardId) : null;
  
  if (!card) {
    return <Sheet open={open} onClose={close} title=""><></></Sheet>;
  }

  const outstanding = card.outstanding;
  const limit = card.limit ?? 0;
  const available = limit > 0 ? Math.max(0, limit - outstanding) : 0;
  const utilization = limit > 0 ? (outstanding / limit) * 100 : 0;
  
  const Icon = LIABILITY_KIND_META[card.kind as LiabilityKind]?.icon ?? CreditCard;
  
  const cardPayments = finance
    .filter((f) => f.accountId === card.id && f.type === "income" && f.transfer === true)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));

  return (
    <Sheet open={open} onClose={close} title="Card Details">
      <div className="flex flex-col gap-6 pt-1">
        
        {/* Hero Card */}
        <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-brand to-brand-dark p-6 shadow-xl shadow-brand/20">
          <div className="absolute right-0 top-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-white opacity-10 blur-2xl" />
          <div className="absolute bottom-0 left-0 -mb-8 -ml-8 h-24 w-24 rounded-full bg-white opacity-10 blur-xl" />
          
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-md">
                <Icon className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col text-white">
                <span className="font-semibold">{card.name}</span>
                {card.lender && <span className="text-[0.75rem] text-white/70">{card.lender}</span>}
              </div>
            </div>
          </div>
          
          <div className="relative mt-8 flex flex-col text-white">
            <span className="text-[0.8rem] font-medium text-white/80">Amount Owed</span>
            <span className="font-display text-4xl font-bold tracking-tight">{formatINR(outstanding)}</span>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => {
              close();
              setTimeout(() => openTransfer(card.id), 200);
            }}
          >
            <Plus className="mr-2 h-4.5 w-4.5" /> Pay Bill
          </Button>
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            onClick={() => {
              close();
              setTimeout(() => openWealth("liability", card.id), 200);
            }}
          >
            <Settings className="mr-2 h-4.5 w-4.5" /> Manage
          </Button>
        </div>

        {/* Progress */}
        {limit > 0 && (
          <div className="flex flex-col gap-2 rounded-[16px] border border-border bg-surface-2 p-5">
            <div className="flex items-center justify-between">
              <p className="text-[0.85rem] font-semibold text-text">Credit Utilization</p>
              <span className="text-[0.75rem] font-bold text-text-3">{utilization.toFixed(0)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-border/50">
              <div 
                className="h-full bg-brand transition-all duration-500 ease-out" 
                style={{ width: `${Math.min(utilization, 100)}%` }} 
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-[0.75rem]">
              <span className="text-text-2">
                Available: <strong className="font-semibold text-text">{formatINR(available)}</strong>
              </span>
              <span className="text-text-2">
                Limit: <strong className="font-semibold text-text">{formatINR(limit)}</strong>
              </span>
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="flex flex-col gap-3 rounded-[16px] border border-border bg-surface-2 p-5">
          <p className="mb-1 text-[0.85rem] font-semibold text-text">Payment History</p>
          
          {cardPayments.length === 0 ? (
            <p className="py-6 text-center text-[0.8rem] text-text-3">No payments recorded yet.</p>
          ) : (
            <div className="relative mt-2 ml-1 space-y-6">
              
              {cardPayments.map((p) => (
                <div key={p.id} className="relative z-10 flex gap-4">
                  {/* Dot */}
                  <div className="mt-1.5 h-3 w-3 shrink-0 rounded-full bg-surface border-2 border-brand" />
                  
                  {/* Content */}
                  <div className="flex flex-col gap-0.5 flex-1">
                    <span className="text-[0.75rem] text-text-3 font-medium">
                      {new Date(p.date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric"
                      })}
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-[0.85rem] font-semibold text-text">Payment received</span>
                      <span className="text-[0.85rem] font-bold text-brand">+{formatINR(p.amount)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </Sheet>
  );
}
