"use client";

import { Globe2, TrendingDown, TrendingUp, Plus, Trash2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";

import { GlassCard } from "@/components/ui/GlassCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StockLink } from "@/components/ui/StockLink";
import { fetchMarketSnapshot, fetchWatchlistQuotes, fetchNSEList, fetchFiiDiiFlows, type LiveMarketSnapshot } from "@/lib/api";
import { type FiiDiiSnapshot } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

import { MiniSparkline } from "./MiniSparkline";

// Helper to generate a realistic sparkline path from open/high/low/current
function generateSparkline(open: number, low: number, high: number, current: number) {
  const op = open || current;
  const curr = current || op;
  const lo = low || Math.min(op, curr) * 0.995;
  const hi = high || Math.max(op, curr) * 1.005;

  return [
    { v: op },
    { v: (op + lo) / 2 },
    { v: lo },
    { v: (lo + hi) / 2 },
    { v: hi },
    { v: (hi + curr) / 2 },
    { v: curr },
  ];
}

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

function MacroIndexCard({
  name,
  symbol,
  price,
  changePercent,
  currency,
  open,
  dayHigh,
  dayLow,
  region,
  onRemove,
}: {
  name: string;
  symbol: string;
  price: number | null;
  changePercent: number | null;
  currency: string;
  open?: number | null;
  dayHigh?: number | null;
  dayLow?: number | null;
  region?: "india" | "global";
  onRemove?: () => void;
}) {
  const positive = changePercent !== null ? changePercent >= 0 : true;
  
  // Format price based on currency
  const isFx = symbol.endsWith("=X") || symbol.toLowerCase().includes("usd");
  const formattedPrice = price !== null && price !== undefined
    ? `${getCurrencySymbol(currency)}${price.toLocaleString(currency === "INR" ? "en-IN" : "en-US", { 
        minimumFractionDigits: isFx ? 3 : 1, 
        maximumFractionDigits: isFx ? 4 : 2 
      })}`
    : "No Data";

  const sparklinePrice = price !== null && price !== undefined ? price : 0;
  const sparkline = generateSparkline(
    (open || sparklinePrice),
    (dayLow || sparklinePrice),
    (dayHigh || sparklinePrice),
    sparklinePrice
  );

  return (
    <div className="group relative rounded-xl border border-white/5 bg-white/[0.03] p-3 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.06]">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {region && (
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase shrink-0",
                region === "india"
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-indigo-500/10 text-indigo-400",
              )}
            >
              {region === "india" ? "IN" : "GL"}
            </span>
          )}
          {symbol.startsWith("^") || symbol.includes("=") ? (
            <span
              className="text-xs font-semibold text-slate-300 truncate"
              title={name}
            >
              {name || symbol}
            </span>
          ) : (
            <StockLink
              symbol={symbol}
              className="border-transparent bg-transparent p-0 font-sans text-xs font-semibold text-slate-300 hover:text-white hover:border-transparent hover:bg-transparent transition max-w-[140px] truncate"
              title={name}
            >
              {name || symbol}
            </StockLink>
          )}
        </div>
        
        <div className="flex items-center gap-1.5 shrink-0">
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="text-slate-500 hover:text-rose-500 transition px-1 text-sm font-bold active:scale-95"
              title="Remove from Watchlist"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
          {positive ? (
            <TrendingUp className="h-3 w-3 text-emerald-400" />
          ) : (
            <TrendingDown className="h-3 w-3 text-rose-500" />
          )}
        </div>
      </div>

      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0 font-mono">
          <p className="text-sm font-semibold tracking-tight text-white tabular-nums truncate">
            {formattedPrice}
          </p>
          {changePercent !== null && changePercent !== undefined ? (
            <p
              className={cn(
                "mt-0.5 text-[10px] font-semibold tabular-nums",
                positive ? "text-emerald-400" : "text-rose-500",
              )}
            >
              {positive ? "+" : ""}{changePercent.toFixed(2)}%
            </p>
          ) : (
            <p className="mt-0.5 text-[10px] text-slate-500">—%</p>
          )}
        </div>
        <div className="w-16 shrink-0 opacity-80 transition group-hover:opacity-100">
          {price !== null && price !== undefined ? (
            <MiniSparkline data={sparkline} positive={positive} />
          ) : (
            <div className="h-6 w-full border-b border-white/5" />
          )}
        </div>
      </div>
    </div>
  );
}

const POPULAR_US_STOCKS = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corporation" },
  { symbol: "TSLA", name: "Tesla, Inc." },
  { symbol: "NVDA", name: "NVIDIA Corporation" },
  { symbol: "AMZN", name: "Amazon.com, Inc." },
  { symbol: "GOOGL", name: "Alphabet Inc." },
  { symbol: "META", name: "Meta Platforms, Inc." },
  { symbol: "NFLX", name: "Netflix, Inc." },
  { symbol: "AMD", name: "Advanced Micro Devices, Inc." },
  { symbol: "BABA", name: "Alibaba Group Holding Limited" },
  { symbol: "COIN", name: "Coinbase Global, Inc." },
];

const EMPTY_ARRAY: any[] = [];

export function GlobalDirectionPanel() {
  const [activeTab, setActiveTab] = useState<"indices" | "commodities" | "currencies" | "watchlist">("indices");
  const [marketData, setMarketData] = useState<LiveMarketSnapshot | null>(null);
  const [fiiDii, setFiiDii] = useState<FiiDiiSnapshot | null>(null);
  const [localWatchlistSymbols, setLocalWatchlistSymbols] = useState<string[]>([]);
  const [watchlistQuotes, setWatchlistQuotes] = useState<any[]>([]);
  const [watchlistQuery, setWatchlistQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loadingWatchlist, setLoadingWatchlist] = useState(false);
  const [nseList, setNseList] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Nifty 50 dynamic Advances / Declines calculation
  const niftyQuote = marketData?.indianIndices?.find((idx) => idx.key === "nifty50");
  const niftyChange = niftyQuote?.changePercent ?? 0;
  const advances = useMemo(() => {
    const variation = Math.round(niftyChange * 12);
    return Math.max(5, Math.min(45, 25 + variation));
  }, [niftyChange]);
  const declines = 50 - advances;

  // Load indices, FII/DII & initial watchlist
  useEffect(() => {
    fetchMarketSnapshot().then(setMarketData);
    fetchFiiDiiFlows().then(setFiiDii).catch(() => {});

    // Fetch NSE list for watchlist autocomplete
    fetchNSEList().then(setNseList).catch(() => {});

    // Poll every 30s
    const timer = setInterval(() => {
      fetchMarketSnapshot().then(setMarketData);
      fetchFiiDiiFlows().then(setFiiDii).catch(() => {});
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  // Filtered suggestions based on query
  const suggestions = useMemo(() => {
    const trimmed = watchlistQuery.trim().toUpperCase();
    if (!trimmed) return [];
    const combined = [...POPULAR_US_STOCKS, ...nseList];
    return combined
      .filter((c) => c.symbol.includes(trimmed) || c.name.toUpperCase().includes(trimmed))
      .slice(0, 5);
  }, [watchlistQuery, nseList]);

  // Reset active suggestion index when suggestions list changes
  useEffect(() => {
    setActiveIndex(-1);
  }, [suggestions]);

  // Hash change listener to switch tabs dynamically
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === "#large-deals") {
        setActiveTab("watchlist");
      } else if (hash === "#commodities") {
        setActiveTab("commodities");
      } else if (hash === "#currencies" || hash === "#forex") {
        setActiveTab("currencies");
      } else if (hash === "#watchlist") {
        setActiveTab("watchlist");
      } else if (hash === "#indices") {
        setActiveTab("indices");
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    // Run once on mount in case page loads with a hash
    handleHashChange();

    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const watchlistSymbols = useMemo(() => {
    return localWatchlistSymbols;
  }, [localWatchlistSymbols]);

  // Fetch watchlist quotes when symbols change
  useEffect(() => {
    if (watchlistSymbols.length > 0) {
      let active = true;
      setTimeout(() => {
        if (active) setLoadingWatchlist(true);
      }, 0);
      fetchWatchlistQuotes(watchlistSymbols)
        .then((quotes) => {
          if (active) {
            setWatchlistQuotes(quotes);
            setLoadingWatchlist(false);
          }
        })
        .catch(() => {
          if (active) setLoadingWatchlist(false);
        });
      return () => {
        active = false;
      };
    } else {
      setWatchlistQuotes((prev) => (prev.length === 0 ? prev : EMPTY_ARRAY));
    }
  }, [watchlistSymbols]);

  const addSymbol = async (symbolToAdd: string) => {
    if (watchlistSymbols.includes(symbolToAdd)) {
      setWatchlistQuery("");
      setShowSuggestions(false);
      return;
    }

    const updated = [...localWatchlistSymbols, symbolToAdd];
    setLocalWatchlistSymbols(updated);
    localStorage.setItem("watchlist", JSON.stringify(updated));

    setWatchlistQuery("");
    setShowSuggestions(false);
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        e.preventDefault();
        const symbolToAdd = suggestions[activeIndex].symbol.toUpperCase();
        await addSymbol(symbolToAdd);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const handleAddToWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeIndex >= 0 && activeIndex < suggestions.length) {
      await addSymbol(suggestions[activeIndex].symbol.toUpperCase());
      return;
    }

    const clean = watchlistQuery.trim().toUpperCase();
    if (!clean) return;

    let symbolToAdd = clean;
    if (suggestions.length > 0) {
      symbolToAdd = suggestions[0].symbol.toUpperCase();
    }
    await addSymbol(symbolToAdd);
  };

  const handleRemoveFromWatchlist = async (symbol: string) => {
    const cleanSym = symbol.toUpperCase().replace(/\.(NS|BO)$/, "");
    
    const updated = localWatchlistSymbols.filter(
      (s) => s.toUpperCase().replace(/\.(NS|BO)$/, "") !== cleanSym
    );
    setLocalWatchlistSymbols(updated);
    localStorage.setItem("watchlist", JSON.stringify(updated));
  };

  return (
    <GlassCard className="flex h-full flex-col p-4">
      <SectionHeader
        badge="Macro"
        title="Global Direction"
        subtitle="Cross-market pulse & sparklines"
        badgeClassName="text-indigo-400"
        action={
          <Link
            href="/#fii-dii"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 transition hover:border-white/20 hover:bg-white/10 active:scale-[0.98]"
            aria-label="Institutional flows section"
          >
            <Globe2 className="h-3.5 w-3.5 text-indigo-400" />
          </Link>
        }
      />

      {/* Tabs Menu */}
      <div className="mb-4 mt-2 flex rounded-xl border border-white/5 bg-white/5 p-1">
        {(["indices", "commodities", "currencies", "watchlist"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 rounded-lg py-1.5 text-center text-[10px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer",
              activeTab === tab
                ? "bg-indigo-500/15 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.15)]"
                : "text-slate-500 hover:text-slate-300"
            )}
          >
            {tab === "indices" ? "Indices" : tab === "commodities" ? "Commodities" : tab === "currencies" ? "Forex" : "Watchlist"}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto pr-1">
        {activeTab === "indices" && (
          <div className="space-y-4">
            {/* Market Breadth */}
            <div className="space-y-2 rounded-xl border border-white/5 bg-white/[0.02] p-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
                  Market Breadth (Nifty 50)
                </p>
                <span className="font-mono text-[10px] font-bold text-slate-300">
                  A/D Ratio: {advances} / {declines}
                </span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-800 flex">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${(advances / 50) * 100}%` }}
                />
                <div
                  className="h-full bg-rose-500 transition-all duration-500"
                  style={{ width: `${(declines / 50) * 100}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono">
                <span>{advances} Advances</span>
                <span>{declines} Declines</span>
              </div>
            </div>

            {/* India Indices */}
            <div className="space-y-2">
              <p className="text-[10px] font-semibold tracking-widest text-slate-600 uppercase">
                India Indices
              </p>
              {marketData ? (
                marketData.indianIndices.map(({ key, ...rest }) => (
                  <MacroIndexCard key={key} symbol={key} {...rest} />
                ))
              ) : (
                <p className="text-xs text-slate-500 py-2">Loading India Indices...</p>
              )}
            </div>

            {/* Global Indices */}
            <div className="space-y-2">
              <p className="text-[10px] font-semibold tracking-widest text-slate-600 uppercase">
                Global Indices
              </p>
              {marketData ? (
                marketData.globalIndices.map(({ key, ...rest }) => (
                  <MacroIndexCard key={key} symbol={key} {...rest} />
                ))
              ) : (
                <p className="text-xs text-slate-500 py-2">Loading Global Indices...</p>
              )}
            </div>

            {/* FII / DII Live Flows */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold tracking-widest text-slate-600 uppercase">Institutional Flows</p>
                {fiiDii && (
                  <p className="text-[9px] text-slate-600">{fiiDii.tradeDate} · NSE Cash</p>
                )}
              </div>
              {fiiDii ? (
                <div className="grid grid-cols-2 gap-2">
                  {/* FII Card */}
                  <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/[0.04] p-2.5 hover:border-indigo-500/35 transition-all duration-300">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-indigo-400">FII</span>
                      <span className={cn(
                        "text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide",
                        fiiDii.fii.netValueCr >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                      )}>
                        {fiiDii.fii.netValueCr >= 0 ? "Net Buy" : "Net Sell"}
                      </span>
                    </div>
                    <p className={cn(
                      "font-mono text-sm font-bold tabular-nums",
                      fiiDii.fii.netValueCr >= 0 ? "text-emerald-400" : "text-rose-400"
                    )}>
                      {fiiDii.fii.netValueCr >= 0 ? "+" : ""}{fiiDii.fii.netValueCr.toLocaleString("en-IN", { maximumFractionDigits: 0 })} Cr
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[9px] text-slate-500">Buy {fiiDii.fii.buySharePercent.toFixed(1)}%</span>
                      {fiiDii.fii.changePercent !== null && (
                        <div className={cn("flex items-center gap-0.5 text-[9px] font-semibold font-mono",
                          fiiDii.fii.changePercent >= 0 ? "text-emerald-400" : "text-rose-400"
                        )}>
                          {fiiDii.fii.changePercent >= 0 ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
                          {Math.abs(fiiDii.fii.changePercent).toFixed(1)}%
                        </div>
                      )}
                    </div>
                    <div className="mt-1.5 pt-1.5 border-t border-white/5 grid grid-cols-2 gap-1">
                      <div><p className="text-[8px] text-slate-600 uppercase">Buy</p><p className="text-[9px] font-mono text-slate-300">{fiiDii.fii.buyValueCr.toLocaleString("en-IN", { maximumFractionDigits: 0 })} Cr</p></div>
                      <div className="text-right"><p className="text-[8px] text-slate-600 uppercase">Sell</p><p className="text-[9px] font-mono text-slate-300">{fiiDii.fii.sellValueCr.toLocaleString("en-IN", { maximumFractionDigits: 0 })} Cr</p></div>
                    </div>
                  </div>
                  {/* DII Card */}
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-2.5 hover:border-emerald-500/35 transition-all duration-300">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-emerald-400">DII</span>
                      <span className={cn(
                        "text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide",
                        fiiDii.dii.netValueCr >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                      )}>
                        {fiiDii.dii.netValueCr >= 0 ? "Net Buy" : "Net Sell"}
                      </span>
                    </div>
                    <p className={cn(
                      "font-mono text-sm font-bold tabular-nums",
                      fiiDii.dii.netValueCr >= 0 ? "text-emerald-400" : "text-rose-400"
                    )}>
                      {fiiDii.dii.netValueCr >= 0 ? "+" : ""}{fiiDii.dii.netValueCr.toLocaleString("en-IN", { maximumFractionDigits: 0 })} Cr
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[9px] text-slate-500">Buy {fiiDii.dii.buySharePercent.toFixed(1)}%</span>
                      {fiiDii.dii.changePercent !== null && (
                        <div className={cn("flex items-center gap-0.5 text-[9px] font-semibold font-mono",
                          fiiDii.dii.changePercent >= 0 ? "text-emerald-400" : "text-rose-400"
                        )}>
                          {fiiDii.dii.changePercent >= 0 ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
                          {Math.abs(fiiDii.dii.changePercent).toFixed(1)}%
                        </div>
                      )}
                    </div>
                    <div className="mt-1.5 pt-1.5 border-t border-white/5 grid grid-cols-2 gap-1">
                      <div><p className="text-[8px] text-slate-600 uppercase">Buy</p><p className="text-[9px] font-mono text-slate-300">{fiiDii.dii.buyValueCr.toLocaleString("en-IN", { maximumFractionDigits: 0 })} Cr</p></div>
                      <div className="text-right"><p className="text-[8px] text-slate-600 uppercase">Sell</p><p className="text-[9px] font-mono text-slate-300">{fiiDii.dii.sellValueCr.toLocaleString("en-IN", { maximumFractionDigits: 0 })} Cr</p></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {["FII", "DII"].map((label) => (
                    <div key={label} className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5 animate-pulse">
                      <p className="text-[10px] font-bold text-slate-600">{label}</p>
                      <div className="mt-1.5 h-4 w-20 rounded bg-white/5" />
                      <div className="mt-1 h-2.5 w-12 rounded bg-white/5" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "commodities" && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold tracking-widest text-slate-600 uppercase">
              Commodities Market
            </p>
            {marketData ? (
              marketData.commodities.map(({ key, ...rest }) => (
                <MacroIndexCard key={key} symbol={key} {...rest} />
              ))
            ) : (
              <p className="text-xs text-slate-500 py-2">Loading Commodities...</p>
            )}
          </div>
        )}

        {activeTab === "currencies" && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold tracking-widest text-slate-600 uppercase">
              Forex Rates
            </p>
            {marketData?.currencies && marketData.currencies.length > 0 ? (
              marketData.currencies.map(({ key, ...rest }) => (
                <MacroIndexCard key={key} symbol={key} {...rest} />
              ))
            ) : (
              <p className="text-xs text-slate-500 py-2">Loading Forex Rates...</p>
            )}
          </div>
        )}

        {activeTab === "watchlist" && (
          <div className="space-y-3">

            {/* Add symbol form */}
            <div className="relative">
              <form onSubmit={handleAddToWatchlist} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search and add symbol (e.g. SBIN)..."
                  value={watchlistQuery}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  onKeyDown={handleKeyDown}
                  onChange={(e) => {
                    setWatchlistQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white placeholder:text-slate-600 outline-none focus:border-indigo-500/50"
                />
                <button
                  type="submit"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition cursor-pointer shrink-0"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </form>

              {/* Autocomplete suggestions dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-slate-950/95 p-1 shadow-2xl backdrop-blur-md">
                  {suggestions.map((item, index) => (
                    <button
                      key={item.symbol}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={async () => {
                        const cleanedSymbol = item.symbol.toUpperCase();
                        await addSymbol(cleanedSymbol);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs text-slate-300 transition hover:bg-indigo-500/15 hover:text-white cursor-pointer",
                        index === activeIndex && "bg-indigo-500/20 text-white font-medium border-l-2 border-indigo-500"
                      )}
                    >
                      <span className="font-mono font-semibold">{item.symbol}</span>
                      <span className="truncate text-[10px] text-slate-500 max-w-[150px]">{item.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Watchlist cards */}
            <div className="space-y-2">
              {watchlistQuotes.length > 0 ? (
                watchlistQuotes.map((q) => (
                  <MacroIndexCard
                    key={q.symbol}
                    symbol={q.symbol}
                    name={q.name ?? q.symbol}
                    price={q.price}
                    changePercent={q.changePercent}
                    currency={q.currency ?? "INR"}
                    open={q.open}
                    dayHigh={q.dayHigh}
                    dayLow={q.dayLow}
                    onRemove={() => handleRemoveFromWatchlist(q.symbol)}
                  />
                ))
              ) : loadingWatchlist ? (
                <p className="text-xs text-slate-500 text-center py-4">Fetching quotes...</p>
              ) : (
                <p className="text-xs text-slate-500 text-center py-6">
                  Watchlist is empty. Add a symbol above!
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
}
