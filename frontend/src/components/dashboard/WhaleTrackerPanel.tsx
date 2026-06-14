"use client";

import { Bot, Calendar, Package, TrendingUp, Waves } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { GlassCard } from "@/components/ui/GlassCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StockLink } from "@/components/ui/StockLink";
import { fetchDeliveryScan, fetchWhaleTracker } from "@/lib/api";
import { type WhaleDeal, type DeliveryBreakout } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function PredictedBuyerBadge({
  parent,
  confidence,
  isShell,
}: {
  parent: string | null;
  confidence: number;
  isShell: boolean;
}) {
  if (!parent && !isShell) return null;

  return (
    <div
      className="group/badge relative"
      title={parent ?? "Shell entity — prediction pending"}
    >
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[9px] font-bold tracking-wide",
          parent
            ? "border-indigo-400/30 bg-indigo-500/15 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.2)]"
            : "border-slate-500/20 bg-slate-500/10 text-slate-500",
        )}
      >
        <Bot className="h-2.5 w-2.5" />
        AI Predicted Buyer
      </span>

      <div className="pointer-events-none absolute top-full right-0 z-10 mt-1.5 w-48 rounded-lg border border-white/10 bg-slate-900/95 p-2.5 opacity-0 shadow-xl backdrop-blur-md transition-all duration-200 group-hover/badge:opacity-100">
        {parent ? (
          <>
            <p className="text-[10px] text-slate-500">Predicted Parent</p>
            <p className="mt-0.5 text-xs font-semibold text-indigo-300">{parent}</p>
            <p className="mt-1 font-mono text-[10px] text-emerald-400">
              {confidence}% confidence
            </p>
          </>
        ) : (
          <p className="text-[10px] text-slate-400">
            Shell entity detected — insufficient signal to unmask parent
          </p>
        )}
      </div>
    </div>
  );
}

export function WhaleDealRow({
  symbol,
  clientName,
  side,
  quantity,
  price,
  predictedParent,
  confidence,
  isShell,
  tradeDate,
}: WhaleDeal) {
  const isBuy = side === "BUY";
  const formattedDate = tradeDate
    ? new Date(tradeDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 transition hover:border-white/10 hover:bg-white/[0.04]">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <StockLink symbol={symbol} variant="whale" />
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[9px] font-bold",
              isBuy
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-rose-500/10 text-rose-500",
            )}
          >
            {side}
          </span>
        </div>
        {(predictedParent || isShell) && (
          <PredictedBuyerBadge
            parent={predictedParent}
            confidence={confidence}
            isShell={isShell}
          />
        )}
      </div>

      <Link
        href={`/stock/${symbol}`}
        className="block truncate text-xs text-slate-300 transition hover:text-white"
      >
        {clientName}
      </Link>

      <div className="mt-2 flex items-center justify-between font-mono text-[11px] tabular-nums">
        <span className="text-slate-400">
          Qty <span className="text-slate-200">{quantity}</span>
        </span>
        <span className="text-slate-400">
          @ <span className="text-slate-200">{price}</span>
        </span>
      </div>

      {formattedDate && (
        <div className="mt-1.5 flex items-center gap-1 text-[9px] text-slate-500">
          <Calendar className="h-2.5 w-2.5" />
          <span>{formattedDate}</span>
        </div>
      )}
    </div>
  );
}

type GroupedWhaleDeals = {
  symbol: string;
  deals: WhaleDeal[];
};

function groupDealsBySymbol(deals: WhaleDeal[]): GroupedWhaleDeals[] {
  const groups: Record<string, WhaleDeal[]> = {};
  for (const deal of deals) {
    if (!groups[deal.symbol]) {
      groups[deal.symbol] = [];
    }
    groups[deal.symbol].push(deal);
  }
  return Object.entries(groups).map(([symbol, groupDeals]) => ({
    symbol,
    deals: groupDeals,
  }));
}

function GroupedWhaleDealCard({ symbol, deals }: GroupedWhaleDeals) {
  const firstSide = deals[0].side;
  const allSameSide = deals.every((d) => d.side === firstSide);
  const tradeDate = deals[0].tradeDate;
  const formattedDate = tradeDate
    ? new Date(tradeDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 transition hover:border-white/10 hover:bg-white/[0.04]">
      {/* Group Header */}
      <div className="mb-2 flex items-center justify-between border-b border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <StockLink symbol={symbol} variant="whale" />
          <span className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-[9px] font-bold text-indigo-400">
            {deals.length} Trades
          </span>
        </div>
        <div className="flex items-center gap-2">
          {formattedDate && (
            <div className="flex items-center gap-1 text-[9px] text-slate-500">
              <Calendar className="h-2.5 w-2.5" />
              <span>{formattedDate}</span>
            </div>
          )}
          {allSameSide && (
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase",
                firstSide === "BUY"
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-rose-500/10 text-rose-500"
              )}
            >
              {firstSide}
            </span>
          )}
        </div>
      </div>

      {/* Sub-trades list */}
      <div className="space-y-3">
        {deals.map((deal) => {
          const isBuy = deal.side === "BUY";
          return (
            <div key={deal.id} className="text-xs">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/stock/${symbol}`}
                  className="truncate text-[11px] text-slate-300 transition hover:text-white"
                >
                  {deal.clientName}
                </Link>
                {!allSameSide && (
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[8px] font-bold shrink-0",
                      isBuy
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-rose-500/10 text-rose-500"
                    )}
                  >
                    {deal.side}
                  </span>
                )}
              </div>

              <div className="mt-1 flex items-center justify-between font-mono text-[10px] tabular-nums text-slate-400">
                <span>
                  Qty <span className="text-slate-200">{deal.quantity}</span>
                </span>
                <span>
                  @ <span className="text-slate-200">{deal.price}</span>
                </span>
              </div>

              {/* Small bot badge if AI unmasked */}
              {(deal.predictedParent || deal.isShell) && (
                <div className="mt-1 flex items-center gap-1 text-[9px]">
                  <Bot className="h-2.5 w-2.5 text-indigo-400" />
                  <span className="text-slate-400 truncate">
                    {deal.predictedParent ? `AI: ${deal.predictedParent}` : "Shell Entity"}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function WhaleTrackerPanel() {
  const [deals, setDeals] = useState<WhaleDeal[]>([]);
  const [breakouts, setBreakouts] = useState<DeliveryBreakout[]>([]);
  const [loadingDeals, setLoadingDeals] = useState(true);
  const [loadingBreakouts, setLoadingBreakouts] = useState(true);

  useEffect(() => {
    fetchWhaleTracker().then((data) => {
      setDeals(data);
      setLoadingDeals(false);
    });

    fetchDeliveryScan().then((data) => {
      setBreakouts(data);
      setLoadingBreakouts(false);
    });

    // Poll every 45s
    const timer = setInterval(() => {
      fetchWhaleTracker().then(setDeals);
      fetchDeliveryScan().then(setBreakouts);
    }, 45000);

    return () => clearInterval(timer);
  }, []);

  // Derive the deal date from the first deal
  const dealsDate = deals.length > 0 && deals[0].tradeDate
    ? new Date(deals[0].tradeDate).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
    : null;

  // Derive the delivery scan date from the first breakout item
  const deliveryScanDate = breakouts.length > 0 && breakouts[0].tradeDate
    ? new Date(breakouts[0].tradeDate).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <div className="flex h-full flex-col gap-4" id="large-deals">
      <GlassCard className="flex flex-1 flex-col p-4">
        <SectionHeader
          badge="NSE / BSE"
          title="Large Deals"
          subtitle={dealsDate ? `Bulk & block deals · ${dealsDate}` : "Bulk & block deals — live stream"}
          badgeClassName="text-indigo-400"
          action={
            <Link
              href="/#large-deals"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 transition hover:border-white/20 hover:bg-white/10"
              aria-label="Large deals section"
            >
              <Waves className="h-3.5 w-3.5 text-indigo-400" />
            </Link>
          }
        />

        <div className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
          {loadingDeals ? (
            <p className="text-xs text-slate-500 text-center py-8">Fetching large deals...</p>
          ) : deals.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">No large deals today</p>
          ) : (
            groupDealsBySymbol(deals).map((group) => {
              if (group.deals.length === 1) {
                return <WhaleDealRow key={group.deals[0].id} {...group.deals[0]} />;
              } else {
                return <GroupedWhaleDealCard key={group.symbol} {...group} />;
              }
            })
          )}
        </div>
      </GlassCard>

      <GlassCard className="p-4" glow="bullish" id="delivery">
        <SectionHeader
          badge="Delivery Scan"
          title="High Delivery Breakout"
          subtitle={deliveryScanDate ? `Stocks with >60% delivery volume · ${deliveryScanDate}` : "Stocks with >60% delivery volume"}
          badgeClassName="text-emerald-400"
          action={
            <Link
              href="/#delivery"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 transition hover:bg-emerald-500/20"
              aria-label="Delivery scan section"
            >
              <Package className="h-3.5 w-3.5 text-emerald-400" />
            </Link>
          }
        />

        <div className="space-y-2">
          {loadingBreakouts ? (
            <p className="text-xs text-slate-500 text-center py-4">Scanning bhavcopy...</p>
          ) : breakouts.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">No breakouts detected</p>
          ) : (
            breakouts.slice(0, 4).map((item) => (
              <Link
                key={item.symbol}
                href={`/stock/${item.symbol}`}
                className="flex items-center justify-between rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] px-3 py-2.5 transition hover:border-emerald-500/30 hover:bg-emerald-500/[0.08]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-bold text-white truncate">{item.symbol}</p>
                    <p className="text-[9px] text-slate-400 truncate">Vol {item.volume}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono text-xs font-bold text-emerald-400 text-glow-bullish">
                    {item.deliveryPercent.toFixed(1)}%
                  </p>
                  <p className="font-mono text-[9px] text-slate-400">{item.price}</p>
                </div>
              </Link>
            ))
          )}
        </div>
      </GlassCard>
    </div>
  );
}
