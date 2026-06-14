"use client";

import { useEffect, useState } from "react";
import { fetchMarketSnapshot, type LiveMarketSnapshot } from "@/lib/api";
import { GLOBAL_INDICES, INDIAN_INDICES, type IndexTicker } from "@/lib/mock-data";
import { cn, formatChange, formatPrice } from "@/lib/utils";

function getCurrencySymbol(currency: string): string {
  switch (currency?.toUpperCase()) {
    case "INR":
      return "₹";
    case "EUR":
      return "€";
    case "GBP":
      return "£";
    case "JPY":
      return "¥";
    case "CAD":
      return "C$";
    case "AUD":
      return "A$";
    default:
      return "$";
  }
}

function TickerPill({ ticker }: { ticker: IndexTicker }) {
  const isPositive = ticker.changePercent >= 0;
  const isFx = ticker.key.toLowerCase().includes("usd") || ticker.name.toLowerCase().includes("usd") || ticker.key.toLowerCase().endsWith("=x");
  const formattedVal = isFx
    ? ticker.price.toLocaleString(ticker.currency === "INR" ? "en-IN" : "en-US", { minimumFractionDigits: 3, maximumFractionDigits: 4 })
    : formatPrice(ticker.price, ticker.currency);

  return (
    <div className="flex shrink-0 items-center gap-3 px-5">
      <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
        {ticker.name}
      </span>
      <span className="font-mono text-sm font-medium text-slate-100 tabular-nums">
        {getCurrencySymbol(ticker.currency)}
        {formattedVal}
      </span>
      <span
        className={cn(
          "rounded-md px-2 py-0.5 font-mono text-xs font-semibold tabular-nums",
          isPositive
            ? "bg-emerald-500/10 text-emerald-400 text-glow-bullish"
            : "bg-rose-500/10 text-rose-500 text-glow-bearish",
        )}
      >
        {formatChange(ticker.changePercent)}
      </span>
      <span className="h-3 w-px bg-white/10" />
    </div>
  );
}

function MarqueeSection({
  label,
  tickers,
  accentClass,
  className,
}: {
  label: string;
  tickers: IndexTicker[];
  accentClass: string;
  className?: string;
}) {
  const doubled = [...tickers, ...tickers];

  return (
    <div className={cn("flex min-w-0 flex-1 items-center", className)}>
      <div
        className={cn(
          "mr-3 shrink-0 rounded-md border px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase",
          accentClass,
        )}
      >
        {label}
      </div>
      <div className="marquee-fade-left relative min-w-0 flex-1 overflow-hidden px-4">
        <div className="marquee-track">
          {doubled.map((ticker, i) => (
            <TickerPill key={`${ticker.key}-${i}`} ticker={ticker} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function MarketMarquee() {
  const [snapshot, setSnapshot] = useState<LiveMarketSnapshot | null>(null);

  useEffect(() => {
    fetchMarketSnapshot().then(setSnapshot).catch(() => {});

    const interval = setInterval(() => {
      fetchMarketSnapshot().then(setSnapshot).catch(() => {});
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const indian = snapshot?.indianIndices ?? INDIAN_INDICES;
  const global = snapshot?.globalIndices ?? GLOBAL_INDICES;
  const currencies = snapshot?.currencies ?? [];

  const currenciesToDisplay = currencies.length > 0 ? currencies : [
    { key: "usdinr", name: "USD / INR", price: 83.5, changePercent: 0.05, region: "global", currency: "INR" },
    { key: "usdeur", name: "USD / EUR", price: 0.92, changePercent: -0.12, region: "global", currency: "EUR" },
    { key: "usdgbp", name: "USD / GBP", price: 0.78, changePercent: 0.02, region: "global", currency: "GBP" },
    { key: "usdjpy", name: "USD / JPY", price: 156.8, changePercent: 0.25, region: "global", currency: "JPY" },
  ] as IndexTicker[];

  return (
    <div
      className="glass-marquee fixed top-[var(--nav-height)] right-0 left-0 z-40 flex h-[var(--marquee-height)] items-center border-t border-white/5"
      aria-label="Live market ticker"
    >
      <div className="mx-auto flex h-full w-full max-w-[1920px] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex shrink-0 items-center gap-2 pr-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <span className="text-[10px] font-semibold tracking-widest text-emerald-400/80 uppercase">
            Live
          </span>
        </div>

        <div className="hidden h-4 w-px bg-white/10 lg:block" />

        <MarqueeSection
          label="India"
          tickers={indian}
          accentClass="border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
        />

        <div className="hidden h-4 w-px shrink-0 bg-white/10 md:block" />

        <MarqueeSection
          label="Global"
          tickers={global}
          accentClass="border-indigo-500/20 bg-indigo-500/10 text-indigo-400"
          className="hidden md:flex"
        />

        <div className="hidden h-4 w-px shrink-0 bg-white/10 lg:block" />

        <MarqueeSection
          label="Forex"
          tickers={currenciesToDisplay}
          accentClass="border-amber-500/20 bg-amber-500/10 text-amber-400"
          className="hidden lg:flex"
        />
      </div>
    </div>
  );
}
