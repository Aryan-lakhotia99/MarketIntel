"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Flame, Zap, AlertTriangle, ArrowUpRight } from "lucide-react";
import { fetchBreakoutEvents, type BreakoutEvent } from "@/lib/api";
import { GlassCard } from "@/components/ui/GlassCard";
import { StockLink } from "@/components/ui/StockLink";
import { cn } from "@/lib/utils";

type TabType = "52w_high" | "volume_breakout" | "52w_low";

export default function BreakoutScanner() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("52w_high");
  const [events, setEvents] = useState<BreakoutEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [flashingKeys, setFlashingKeys] = useState<Set<string>>(new Set());
  const prevEventsRef = useRef<BreakoutEvent[]>([]);
  
  // Track last fetch time for visual indicator
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  const fetchEvents = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const data = await fetchBreakoutEvents();
      
      if (!isInitial && prevEventsRef.current.length > 0) {
        const newKeys: string[] = [];
        data.forEach(e => {
          const key = `${e.symbol}-${e.type}-${e.time}`;
          const alreadyExisted = prevEventsRef.current.some(
            pe => `${pe.symbol}-${pe.type}-${pe.time}` === key
          );
          if (!alreadyExisted) {
            newKeys.push(key);
          }
        });
        
        if (newKeys.length > 0) {
          setFlashingKeys(prev => {
            const next = new Set(prev);
            newKeys.forEach(k => next.add(k));
            return next;
          });
          
          setTimeout(() => {
            setFlashingKeys(prev => {
              const next = new Set(prev);
              newKeys.forEach(k => next.delete(k));
              return next;
            });
          }, 2000);
        }
      }
      
      // Update data and refs
      setEvents(data);
      prevEventsRef.current = data;
      setLastUpdated(new Date());
    } catch (err: any) {
      console.warn("Failed to load breakout events:", err?.message || err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchEvents(true);
    
    // Poll every 5 seconds for high-frequency updates
    const interval = setInterval(() => {
      fetchEvents();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const isUSStock = (symbol: string) => {
    const usSymbols = [
      "AAPL", "MSFT", "GOOG", "GOOGL", "AMZN", "TSLA", "META", "NVDA", "NFLX", 
      "AMD", "INTC", "QCOM", "AVGO", "CSCO", "ADBE", "AMAT", "TXN", "MU", "ISRG", 
      "LRCX", "HON", "AMGN", "SBUX", "MDLZ", "GILD", "PYPL", "ADSK", "NXPI", "PANW", 
      "COST", "PEP", "KO", "WMT", "NKE", "DIS", "HD", "MCD", "JPM", "BAC", "MS", 
      "GS", "V", "MA", "AXP", "C", "XOM", "CVX", "COP", "SLB", "CAT", "GE", "UNP", 
      "BA", "LLY", "JNJ", "UNH", "MRK", "ABBV", "PFE", "TMO"
    ];
    return usSymbols.includes(symbol.toUpperCase());
  };

  const formatPrice = (price: number | null, symbol: string, currency?: string) => {
    if (price === null || price === undefined) return "—";
    const isUSD = currency === "USD" || isUSStock(symbol);
    const prefix = isUSD ? "$" : "₹";
    const locale = isUSD ? "en-US" : "en-IN";
    return `${prefix}${price.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatVolume = (vol: number | null, symbol: string, currency?: string) => {
    if (vol === null || vol === undefined) return "—";
    const isUSD = currency === "USD" || isUSStock(symbol);
    const locale = isUSD ? "en-US" : "en-IN";
    if (isUSD) {
      if (vol >= 1000000) return `${(vol / 1000000).toFixed(1)}M`;
      if (vol >= 1000) return `${(vol / 1000).toFixed(1)}K`;
      return vol.toLocaleString(locale);
    } else {
      if (vol >= 10000000) return `${(vol / 10000000).toFixed(1)}Cr`;
      if (vol >= 100000) return `${(vol / 100000).toFixed(1)}L`;
      return vol.toLocaleString(locale);
    }
  };

  // Filter and sort events (newest time at top)
  const filteredEvents = useMemo(() => {
    const list = events.filter(e => e.type === activeTab);
    
    // Sort by time string descending (e.g. "18:15:30" > "18:14:00")
    return list.sort((a, b) => b.time.localeCompare(a.time));
  }, [events, activeTab]);

  return (
    <GlassCard className="p-5 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white tracking-tight">
              Live Market Pulse & Breakout Scanners
            </h2>
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse-glow" />
              <span>LIVE</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time milestone tracking for NSE & US Stocks. Polling every 5s.
          </p>
        </div>
        
        <div className="text-[10px] font-mono text-slate-400 sm:text-right">
          {mounted ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : "Last updated: —"}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          onClick={() => setActiveTab("52w_high")}
          className={cn(
            "flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-bold transition duration-300 cursor-pointer",
            activeTab === "52w_high"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.15)]"
              : "border-white/5 bg-white/5 text-slate-400 hover:text-slate-200"
          )}
        >
          <Flame className={cn("h-3.5 w-3.5", activeTab === "52w_high" ? "text-emerald-400" : "text-slate-500")} />
          <span>52W Highs</span>
        </button>

        <button
          onClick={() => setActiveTab("volume_breakout")}
          className={cn(
            "flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-bold transition duration-300 cursor-pointer",
            activeTab === "volume_breakout"
              ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.15)]"
              : "border-white/5 bg-white/5 text-slate-400 hover:text-slate-200"
          )}
        >
          <Zap className={cn("h-3.5 w-3.5", activeTab === "volume_breakout" ? "text-indigo-400" : "text-slate-500")} />
          <span>Volume Breakouts</span>
        </button>

        <button
          onClick={() => setActiveTab("52w_low")}
          className={cn(
            "flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-bold transition duration-300 cursor-pointer",
            activeTab === "52w_low"
              ? "border-rose-500/30 bg-rose-500/10 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.15)]"
              : "border-white/5 bg-white/5 text-slate-400 hover:text-slate-200"
          )}
        >
          <AlertTriangle className={cn("h-3.5 w-3.5", activeTab === "52w_low" ? "text-rose-400" : "text-slate-500")} />
          <span>52W Lows</span>
        </button>
      </div>

      {/* Grid Table */}
      <div className="rounded-xl border border-white/5 bg-slate-950/20 overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02] text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                <th className="p-3.5 w-24">Time</th>
                <th className="p-3.5">Symbol</th>
                <th className="p-3.5 text-right">LTP</th>
                <th className="p-3.5 text-right">% Change</th>
                <th className="p-3.5 text-right">Daily Volume</th>
                <th className="p-3.5 text-center">Multiplier Status</th>
                <th className="p-3.5 text-center w-12">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400 font-sans text-xs">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                      <span>Fetching live breakout stream...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400 font-sans">
                    No active breakouts detected in this category.
                  </td>
                </tr>
              ) : (
                filteredEvents.map(event => {
                  const key = `${event.symbol}-${event.type}-${event.time}`;
                  const isFlashing = flashingKeys.has(key);
                  const isPositive = (event.changePercent ?? 0) >= 0;
                  
                  // Pick flash animation class based on type
                  const flashClass = isFlashing
                    ? event.type === "52w_low"
                      ? "animate-flash-red"
                      : "animate-flash-green"
                    : "";

                  return (
                    <tr
                      key={key}
                      className={cn(
                        "group hover:bg-white/[0.02] transition duration-200 cursor-pointer",
                        flashClass
                      )}
                      onClick={() => router.push(`/stock/${event.symbol}`)}
                    >
                      {/* Time */}
                      <td className="p-3.5 text-slate-400 font-medium">
                        {event.time}
                      </td>

                      {/* Symbol */}
                      <td className="p-3.5 font-sans">
                        <div className="flex items-center gap-2">
                          <StockLink symbol={event.symbol} />
                          <span className="rounded bg-white/5 px-1.5 py-0.5 text-[8px] font-bold text-slate-400 uppercase tracking-wide">
                            {event.currency === "USD" || isUSStock(event.symbol) ? "US" : "NSE"}
                          </span>
                        </div>
                      </td>

                      {/* LTP */}
                      <td className="p-3.5 text-right font-bold text-white">
                        {formatPrice(event.ltp, event.symbol, event.currency)}
                      </td>

                      {/* % Change */}
                      <td className={cn(
                        "p-3.5 text-right font-extrabold",
                        isPositive ? "text-emerald-400" : "text-rose-500"
                      )}>
                        {isPositive ? "+" : ""}{(event.changePercent ?? 0).toFixed(2)}%
                      </td>

                      {/* Daily Volume */}
                      <td className="p-3.5 text-right text-slate-300 font-semibold">
                        {formatVolume(event.volume, event.symbol, event.currency)}
                      </td>

                      {/* Status / Multiplier Badge */}
                      <td className="p-3.5 text-center font-sans">
                        <span
                          className={cn(
                            "inline-flex rounded border px-2 py-0.5 text-[9px] font-bold tracking-wide uppercase",
                            event.type === "52w_high"
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                              : event.type === "52w_low"
                                ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
                                : "border-indigo-500/30 bg-indigo-500/10 text-indigo-300"
                          )}
                        >
                          {event.multiplierStatus}
                        </span>
                      </td>

                      {/* Action Icon */}
                      <td className="p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-center">
                          <Link
                            href={`/stock/${event.symbol}`}
                            className="flex h-6 w-6 items-center justify-center rounded-lg border border-white/5 bg-white/5 text-slate-400 transition group-hover:border-white/10 group-hover:bg-indigo-500/10 group-hover:text-indigo-400 cursor-pointer"
                          >
                            <ArrowUpRight className="h-3 w-3" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </GlassCard>
  );
}
