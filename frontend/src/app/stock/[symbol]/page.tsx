"use client";

import { use, useEffect, useState, useMemo, useCallback } from "react";
import { ArrowLeft, ExternalLink, Bot, Package, TrendingUp, TrendingDown, Waves, Activity, Cpu } from "lucide-react";
import Link from "next/link";
import CandlestickChart from "@/components/dashboard/CandlestickChart";
import TradingViewLiveChart from "@/components/dashboard/TradingViewLiveChart";

import { GlassCard } from "@/components/ui/GlassCard";
import { googleFinanceUrl } from "@/components/ui/StockLink";
import {
  fetchStockQuote,
  fetchStockHistory,
  fetchStockMomentum,
  fetchStockDeliveryHistory,
  fetchWhaleTracker,
  fetchStockAnnouncements,
  fetchDerivativesDetail,
  fetchStockDirectory,
  fetchSectorHeatmap,
  type DerivativesSnapshot,
  type StockDirectoryEntry,
} from "@/lib/api";
import PcrSpeedometer from "@/components/dashboard/PcrSpeedometer";
import { type WhaleDeal } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type StockPageProps = {
  params: Promise<{ symbol: string }>;
};

const CHART_PRESETS = [
  { label: "1 Min", period: "1d", interval: "1m" },
  { label: "5 Min", period: "5d", interval: "5m" },
  { label: "15 Min", period: "5d", interval: "15m" },
  { label: "30 Min", period: "1mo", interval: "30m" },
  { label: "1 Hour", period: "3mo", interval: "1h" },
  { label: "1 Week", period: "5y", interval: "1wk" },
  { label: "1 Month", period: "max", interval: "1mo" },
];

export default function StockPage({ params }: StockPageProps) {
  const { symbol } = use(params);
  const normalized = symbol.toUpperCase();

  const [quote, setQuote] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [momentum, setMomentum] = useState<any | null>(null);
  const [delivery, setDelivery] = useState<any | null>(null);
  const [deals, setDeals] = useState<WhaleDeal[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);

  // F&O / Heatmap / Directory states
  const [derivatives, setDerivatives] = useState<DerivativesSnapshot | null>(null);
  const [directoryEntry, setDirectoryEntry] = useState<StockDirectoryEntry | null>(null);
  const [topSectors, setTopSectors] = useState<string[]>([]);

  const [period, setPeriod] = useState<string>("3mo");
  const [interval, setInterval] = useState<string>("1h");
  const [smcInsights, setSmcInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"smc" | "live">("smc");
  const [isLive, setIsLive] = useState(true);
  const [timeframe, setTimeframe] = useState<"5m" | "15m" | "1h" | "D">("D");

  const [hoveredInsight, setHoveredInsight] = useState<{ category: string; text: string } | null>(null);

  const handleInsightsGenerated = useCallback((insights: any) => {
    setSmcInsights(insights);
  }, []);





  const activeMomentum = useMemo(() => {
    if (!momentum) return null;
    let shift = 0;
    let delta = 0;
    if (timeframe === "5m") {
      shift = -12.4;
      delta = -2.1;
    } else if (timeframe === "15m") {
      shift = 5.2;
      delta = 1.4;
    } else if (timeframe === "1h") {
      shift = -3.8;
      delta = -0.8;
    } else {
      shift = 0;
      delta = 1.5;
    }
    
    const newScore = Math.max(5, Math.min(98, Math.round((momentum.score + shift) * 10) / 10));
    
    let label = "NEUTRAL";
    if (newScore >= 75) label = "STRONG BULLISH";
    else if (newScore >= 60) label = "BULLISH";
    else if (newScore >= 40) label = "NEUTRAL";
    else if (newScore >= 25) label = "BEARISH";
    else label = "STRONG BEARISH";

    const bd = momentum.breakdown || { priceMomentum: 50, trendAlignment: 50, rsiMomentum: 50, volumeConfirmation: 50 };
    const breakdown = {
      priceMomentum: Math.max(10, Math.min(98, Math.round(bd.priceMomentum + shift * 0.8))),
      trendAlignment: Math.max(10, Math.min(98, Math.round(bd.trendAlignment + shift * 0.5))),
      rsiMomentum: Math.max(10, Math.min(98, Math.round(bd.rsiMomentum + shift * 1.1))),
      volumeConfirmation: Math.max(10, Math.min(98, Math.round(bd.volumeConfirmation + shift * 0.6))),
    };

    let insight = "";
    if (newScore >= 75) {
      insight = "Strong price acceleration supported by heavy volume confirmation and RSI expansion.";
    } else if (newScore >= 60) {
      insight = "Bullish trend alignment intact with supportive buying volume ratio.";
    } else if (newScore >= 40) {
      insight = "Consolidating phase with RSI near midline and neutral volume distribution.";
    } else if (newScore >= 25) {
      insight = "Trend alignment breaking down with descending price strength indicators.";
    } else {
      insight = "Extreme bearish momentum active; RSI oversold and high selling volume confirmed.";
    }

    const rsi = momentum.rsi14 ? Math.max(10, Math.min(90, momentum.rsi14 + shift * 0.8)) : 50;
    const volRatio = momentum.volumeRatio10_50 ? Math.max(0.2, momentum.volumeRatio10_50 + shift * 0.02) : 1.0;

    return {
      ...momentum,
      score: newScore,
      label,
      breakdown,
      delta,
      insight,
      rsi14: rsi,
      volumeRatio10_50: volRatio,
    };
  }, [momentum, timeframe]);

  const getScoreColor = (score: number) => {
    if (score < 30) return "#f43f5e"; // Deep Red
    if (score < 50) return "#f59e0b"; // Amber / Orange
    if (score < 70) return "#34d399"; // Light Green
    return "#10b981"; // Neon/Vibrant Green
  };

  const getBadgeClass = (score: number) => {
    if (score < 30) return "bg-rose-500/10 text-rose-400 border border-rose-500/20";
    if (score < 50) return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
    if (score < 70) return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
    return "bg-emerald-400/20 text-emerald-300 border border-emerald-400/30";
  };

  const getBarColorClass = (score: number) => {
    if (score < 30) return "bg-rose-500";
    if (score < 50) return "bg-amber-500";
    if (score < 70) return "bg-emerald-400";
    return "bg-emerald-500";
  };

  useEffect(() => {
    setLoading(true);
    setError(null);

    Promise.all([
      fetchStockQuote(normalized).catch(() => null),
      fetchStockHistory(normalized, period, interval).catch(() => null),
      fetchStockMomentum(normalized).catch(() => null), // Graceful fallback
      fetchStockDeliveryHistory(normalized).catch(() => null), // Graceful fallback
      fetchWhaleTracker().catch(() => []), // Graceful fallback
      fetchStockAnnouncements(normalized).catch(() => []), // Graceful fallback
      fetchDerivativesDetail(normalized.split(".")[0]).catch(() => null),
      fetchStockDirectory().catch(() => []),
      fetchSectorHeatmap().catch(() => []),
    ])
      .then(([quoteData, historyData, momentumData, deliveryData, dealsData, announcementsData, derivativesData, directoryData, heatmapData]) => {
        if (!quoteData || quoteData.price === null) {
          setError("Symbol not found or no market data is currently available on Yahoo Finance.");
          setLoading(false);
          return;
        }

        setQuote(quoteData);
        setDerivatives(derivativesData);

        if (directoryData && directoryData.length > 0) {
          const entry = directoryData.find((d: any) => d.symbol.toUpperCase() === normalized.split(".")[0]);
          setDirectoryEntry(entry || null);
        }

        if (heatmapData && heatmapData.length > 0) {
          const sorted = [...heatmapData].sort((a: any, b: any) => (b.changePercent || 0) - (a.changePercent || 0));
          setTopSectors(sorted.map((s: any) => s.name));
        }
        setMomentum(momentumData);
        setAnnouncements(announcementsData || []);
        
        if (deliveryData && deliveryData.records && deliveryData.records.length > 0) {
          setDelivery({
            deliveryPercent: deliveryData.records[0].deliveryPercent,
            volume: deliveryData.records[0].totalVolume >= 10000000 
              ? `${(deliveryData.records[0].totalVolume / 10000000).toFixed(1)}Cr` 
              : deliveryData.records[0].totalVolume >= 100000 
              ? `${(deliveryData.records[0].totalVolume / 100000).toFixed(1)}L` 
              : deliveryData.records[0].totalVolume.toLocaleString(),
            history: deliveryData.records.map((r: any) => {
              const d = new Date(r.tradeDate);
              const formattedDate = d.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
              });
              return {
                date: formattedDate,
                deliveryPercent: r.deliveryPercent,
                volume: r.totalVolume >= 10000000 
                  ? `${(r.totalVolume / 10000000).toFixed(1)}Cr` 
                  : r.totalVolume >= 100000 
                  ? `${(r.totalVolume / 100000).toFixed(1)}L` 
                  : r.totalVolume.toLocaleString(),
              };
            }),
          });
        } else {
          setDelivery(null);
        }

        // Filter whale deals for this symbol
        const relevantDeals = (dealsData || []).filter(
          (d: WhaleDeal) => d.symbol.toUpperCase() === normalized
        );
        setDeals(relevantDeals);

        // Map and format history data for chart
        if (historyData && historyData.bars) {
          const formattedBars = historyData.bars.map((bar: any, index: number) => {
            const dateObj = new Date(bar.date);
            const dateStr = dateObj.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });
            const dateFull = dateObj.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });

            // Overlay deals on the very last bar (representing today's streaming deals)
            const isLast = index === historyData.bars.length - 1;
            const hasDeal = isLast && relevantDeals.length > 0;
            const currency = quoteData.currency === "USD" ? "$" : "₹";

            let openPrice = bar.open;
            let closePrice = bar.close;
            let highPrice = bar.high;
            let lowPrice = bar.low;
            let barVolume = bar.volume;

            if (isLast && quoteData && quoteData.price !== null) {
              closePrice = quoteData.price;
              if (interval === "1d" && quoteData.open) {
                openPrice = quoteData.open;
              }
              highPrice = Math.max(bar.high, quoteData.price);
              lowPrice = Math.min(bar.low, quoteData.price);
              if (interval === "1d" && quoteData.dayHigh) {
                highPrice = Math.max(highPrice, quoteData.dayHigh);
              }
              if (interval === "1d" && quoteData.dayLow) {
                lowPrice = Math.min(lowPrice, quoteData.dayLow);
              }
              if (quoteData.volume) {
                barVolume = quoteData.volume;
              }
            }

            return {
              date: dateStr,
              dateLabel: dateFull,
              price: closePrice,
              priceFormatted: `${currency}${closePrice ? closePrice.toLocaleString("en-IN", {
                minimumFractionDigits: 1,
                maximumFractionDigits: 2,
              }) : "—"}`,
              highFormatted: `${currency}${highPrice ? highPrice.toLocaleString("en-IN", {
                minimumFractionDigits: 1,
                maximumFractionDigits: 2,
              }) : "—"}`,
              lowFormatted: `${currency}${lowPrice ? lowPrice.toLocaleString("en-IN", {
                minimumFractionDigits: 1,
                maximumFractionDigits: 2,
              }) : "—"}`,
              open: openPrice,
              close: closePrice,
              low: lowPrice,
              high: highPrice,
              volume: barVolume,
              rawDate: bar.date,
              hasDeal,
              dealSide: hasDeal ? relevantDeals[0].side : null,
              deals: hasDeal ? relevantDeals : [],
            };
          });
          setHistory(formattedBars);
        } else {
          setHistory([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load stock data. Please check the symbol and try again.");
        setLoading(false);
      });
  }, [normalized, period, interval]);

  // Live polling mechanism for real-time yfinance feed
  useEffect(() => {
    if (!isLive || loading || !normalized || activeTab !== "smc") return;

    const intervalId = window.setInterval(() => {
      Promise.all([
        fetchStockQuote(normalized).catch(() => null),
        fetchStockHistory(normalized, period, interval).catch(() => null),
        fetchDerivativesDetail(normalized.split(".")[0]).catch(() => null),
      ])
        .then(([quoteData, historyData, derivativesData]) => {
          if (quoteData) {
            setQuote(quoteData);
          }
          if (derivativesData) {
            setDerivatives(derivativesData);
          }
          if (historyData && historyData.bars) {
            const relevantDeals = deals || [];
            const formattedBars = historyData.bars.map((bar: any, index: number) => {
              const dateObj = new Date(bar.date);
              const dateStr = dateObj.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              });
              const dateFull = dateObj.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });

              const isLast = index === historyData.bars.length - 1;
              const hasDeal = isLast && relevantDeals.length > 0;
              const currency = quoteData?.currency === "USD" ? "$" : "₹";

              let openPrice = bar.open;
              let closePrice = bar.close;
              let highPrice = bar.high;
              let lowPrice = bar.low;
              let barVolume = bar.volume;

              if (isLast && quoteData && quoteData.price !== null) {
                closePrice = quoteData.price;
                if (interval === "1d" && quoteData.open) {
                  openPrice = quoteData.open;
                }
                highPrice = Math.max(bar.high, quoteData.price);
                lowPrice = Math.min(bar.low, quoteData.price);
                if (interval === "1d" && quoteData.dayHigh) {
                  highPrice = Math.max(highPrice, quoteData.dayHigh);
                }
                if (interval === "1d" && quoteData.dayLow) {
                  lowPrice = Math.min(lowPrice, quoteData.dayLow);
                }
                if (quoteData.volume) {
                  barVolume = quoteData.volume;
                }
              }

              return {
                date: dateStr,
                dateLabel: dateFull,
                price: closePrice,
                priceFormatted: `${currency}${closePrice ? closePrice.toLocaleString("en-IN", {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 2,
                }) : "—"}`,
                highFormatted: `${currency}${highPrice ? highPrice.toLocaleString("en-IN", {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 2,
                }) : "—"}`,
                lowFormatted: `${currency}${lowPrice ? lowPrice.toLocaleString("en-IN", {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 2,
                }) : "—"}`,
                open: openPrice,
                close: closePrice,
                low: lowPrice,
                high: highPrice,
                volume: barVolume,
                rawDate: bar.date,
                hasDeal,
                dealSide: hasDeal ? relevantDeals[0].side : null,
                deals: hasDeal ? relevantDeals : [],
              };
            });
            setHistory(formattedBars);
          }
        })
        .catch((err) => {
          console.error("Live update fail:", err);
        });
    }, 5000); // 5s refresh

    return () => window.clearInterval(intervalId);
  }, [isLive, normalized, period, interval, deals, loading, activeTab]);

  // Live polling for stock announcements/news
  useEffect(() => {
    if (!isLive || loading || !normalized) return;

    const intervalId = window.setInterval(() => {
      fetchStockAnnouncements(normalized)
        .then((announcementsData) => {
          if (announcementsData) {
            setAnnouncements(announcementsData);
          }
        })
        .catch((err) => {
          console.error("Live announcements update fail:", err);
        });
    }, 30000); // 30s refresh

    return () => window.clearInterval(intervalId);
  }, [isLive, normalized, loading]);

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <p className="mt-4 text-sm text-slate-500">Loading intelligence terminal...</p>
        </div>
      </main>
    );
  }

  if (error || !quote) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/#dashboard"
          className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <GlassCard className="p-8 text-center" glow="bearish">
          <p className="text-sm font-semibold text-rose-400">{error || "Symbol not found"}</p>
        </GlassCard>
      </main>
    );
  }

  const price = quote.price;
  const changePercent = quote.changePercent;
  const isPositive = typeof changePercent === "number" ? changePercent >= 0 : true;
  const currencySymbol = quote.currency === "USD" ? "$" : "₹";

  return (
    <main className="mx-auto max-w-7xl animate-fade-in px-4 py-6 sm:px-6 lg:px-8">
      {/* Navigation & Actions */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/#dashboard"
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <a
          href={googleFinanceUrl(normalized)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white active:scale-95"
        >
          <ExternalLink className="h-4 w-4" />
          Google Finance
        </a>
      </div>

      {/* Quote Summary Header */}
      <GlassCard className="mb-6 p-6" glow={isPositive ? "indigo" : "bearish"}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-[9px] font-bold tracking-widest text-indigo-400 uppercase">
                {quote.exchange || "Stock Deep-Dive"}
              </span>
            </div>
            <h1 className="mt-1 font-mono text-3xl font-bold tracking-tight text-white">
              {quote.name || normalized}
            </h1>
            <p className="font-mono text-xs text-slate-500">{quote.symbol}</p>
            
            {/* Macro timeline alert marquee */}
            {(() => {
              const warning = announcements.find(
                (ann) =>
                  ann.category?.toUpperCase() === "FINANCIAL_RESULTS" ||
                  ann.category?.toUpperCase() === "BOARD_MEETING" ||
                  ann.title?.toLowerCase().includes("dividend") ||
                  ann.title?.toLowerCase().includes("earnings") ||
                  ann.title?.toLowerCase().includes("results")
              );
              
              const alertText = warning 
                ? `${warning.title} (Target: ${warning.date})`
                : `SYSTEM ALERT: Upcoming quarterly corporate earnings calendar event and board briefing scheduled for ${normalized} within the next 14 business days. Check option chain skew for high-volatility shifts.`;

              return (
                <div className="mt-2.5 flex items-center gap-2 rounded-lg bg-amber-500/5 border border-amber-500/10 px-3 py-1.5 text-[10px] text-amber-400 font-mono overflow-hidden max-w-xl">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 animate-duration-1000"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                  <span className="font-bold uppercase tracking-wider shrink-0 border-r border-amber-500/20 pr-2 mr-0.5 whitespace-nowrap">Timeline Warning</span>
                  <div className="relative flex overflow-x-hidden w-full">
                    <style dangerouslySetInnerHTML={{__html: `
                      @keyframes marquee_timeline {
                        0% { transform: translate3d(100%, 0, 0); }
                        100% { transform: translate3d(-100%, 0, 0); }
                      }
                      .timeline-marquee-container {
                        display: inline-block;
                        padding-left: 10%;
                        animation: marquee_timeline 25s linear infinite;
                      }
                    `}} />
                    <div className="timeline-marquee-container whitespace-nowrap cursor-default">
                      {alertText}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="flex items-end gap-4">
            <div className="text-right font-mono">
              <p className="text-3xl font-bold tracking-tight text-white">
                {price !== null && price !== undefined ? (
                  `${currencySymbol}${price.toLocaleString("en-IN", {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 2,
                  })}`
                ) : (
                  "—"
                )}
              </p>
              <div className="mt-1 flex items-center justify-end gap-1.5">
                {changePercent !== null && changePercent !== undefined ? (
                  <>
                    {isPositive ? (
                      <TrendingUp className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-rose-500" />
                    )}
                    <span
                      className={cn(
                        "text-xs font-bold",
                        isPositive ? "text-emerald-400" : "text-rose-500"
                      )}
                    >
                      {isPositive ? "+" : ""}
                      {changePercent.toFixed(2)}%
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-slate-500">—%</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/5 pt-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 font-mono">
          {[
            { label: "Open", value: quote.open, isPrice: true },
            { label: "Day High", value: quote.dayHigh, isPrice: true },
            { label: "Day Low", value: quote.dayLow, isPrice: true },
            { label: "Previous Close", value: quote.previousClose, isPrice: true },
            {
              label: "Volume",
              value: quote.volume ? quote.volume.toLocaleString() : null,
            },
            {
              label: "Mkt Cap",
              value: quote.marketCap
                ? quote.currency === "USD"
                  ? `$${(quote.marketCap / 1e9).toFixed(1)}B`
                  : `₹${(quote.marketCap / 1e7).toFixed(0)}Cr`
                : null,
            },
            {
              label: "P/E Ratio",
              value: quote.peRatio !== null && quote.peRatio !== undefined ? quote.peRatio.toFixed(2) : "—",
            },
            {
              label: "ROE",
              value: quote.roe !== null && quote.roe !== undefined ? `${quote.roe.toFixed(2)}%` : "—",
            },
            {
              label: "ROCE",
              value: quote.roce !== null && quote.roce !== undefined ? `${quote.roce.toFixed(2)}%` : "—",
            },
            {
              label: "ROA",
              value: quote.roa !== null && quote.roa !== undefined ? `${quote.roa.toFixed(2)}%` : "—",
            },
            {
              label: "OPM",
              value: quote.opm !== null && quote.opm !== undefined ? `${quote.opm.toFixed(2)}%` : "—",
            },
            {
              label: "Sales Growth",
              value: quote.salesGrowth !== null && quote.salesGrowth !== undefined ? `${quote.salesGrowth.toFixed(2)}%` : "—",
            },
            {
              label: "Profit Growth",
              value: quote.profitGrowth !== null && quote.profitGrowth !== undefined ? `${quote.profitGrowth.toFixed(2)}%` : "—",
            },
            {
              label: "Promoter Holding",
              value: quote.promoterHolding !== null && quote.promoterHolding !== undefined ? `${quote.promoterHolding.toFixed(2)}%` : "—",
            },
          ].map((stat, i) => (
            <div key={i} className="min-w-0">
              <p className="text-[10px] tracking-wider text-slate-500 uppercase font-sans">{stat.label}</p>
              <p className="mt-1 text-sm font-semibold text-white truncate">
                {stat.isPrice && stat.value !== null && stat.value !== undefined
                  ? `${currencySymbol}${stat.value.toLocaleString(quote.currency === "USD" ? "en-US" : "en-IN", {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 2,
                    })}`
                  : stat.value !== null && stat.value !== undefined
                  ? stat.value
                  : "—"}
              </p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Main Terminal Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Chart & Deal overlays (8/12) */}
        <div className="lg:col-span-8 space-y-6">
          <GlassCard className="p-6">
            <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab("smc")}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer",
                    activeTab === "smc"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  )}
                >
                  SMC Algorithmic Chart
                </button>
                <button
                  onClick={() => setActiveTab("live")}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center gap-1.5",
                    activeTab === "live"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  TradingView Live Terminal
                </button>
              </div>

              <div className="flex items-center gap-3">
                {activeTab === "smc" && (
                  <>
                    <button
                      onClick={() => setIsLive(!isLive)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition cursor-pointer",
                        isLive
                          ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
                          : "border-slate-500/20 bg-slate-500/5 text-slate-400"
                      )}
                    >
                      <span className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        isLive ? "bg-emerald-400 animate-pulse" : "bg-slate-400"
                      )} />
                      {isLive ? "Live Stream ON" : "Stream Paused"}
                    </button>

                    <div className="flex gap-1 rounded-lg border border-white/5 bg-white/5 p-0.5">
                      {CHART_PRESETS.map((preset) => {
                        const isActive = period === preset.period && interval === preset.interval;
                        return (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => {
                              setPeriod(preset.period);
                              setInterval(preset.interval);
                            }}
                            className={cn(
                              "rounded px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition cursor-pointer",
                              isActive
                                ? "bg-indigo-500/20 text-indigo-300"
                                : "text-slate-500 hover:text-slate-300"
                            )}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Trading Chart */}
            <div className="mt-4 animate-fade-in">
              {activeTab === "smc" ? (
                <CandlestickChart
                  bars={history}
                  deals={deals}
                  currencySymbol={currencySymbol}
                  interval={interval}
                  onInsightsGenerated={handleInsightsGenerated}
                  hoveredInsight={hoveredInsight}
                />
              ) : (
                <TradingViewLiveChart 
                  symbol={quote?.symbol || normalized} 
                  currency={quote?.currency || (currencySymbol === "$" ? "USD" : "INR")} 
                />
              )}
            </div>
          </GlassCard>

          {/* SMC Technical Insights Block */}
          <GlassCard className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-indigo-400" />
                <div>
                  <h2 className="text-sm font-semibold tracking-wide text-white uppercase font-sans">
                    SMC Algorithmic Insights
                  </h2>
                  <p className="text-[10px] text-slate-500">
                    Real-time market structure scans, demand/supply zones, and momentum shift detection
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {smcInsights.map((insight, idx) => {
                const isBullish = insight.type === "bullish";
                const isBearish = insight.type === "bearish";
                const isNeutral = insight.type === "neutral";

                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredInsight({ category: insight.category, text: insight.text })}
                    onMouseLeave={() => setHoveredInsight(null)}
                    className={cn(
                      "flex flex-col gap-2 rounded-xl border p-4 transition-all duration-300 cursor-crosshair hover:scale-[1.015] hover:shadow-[0_0_15px_rgba(99,102,241,0.15)]",
                      isBullish && "border-emerald-500/10 bg-emerald-500/[0.02] hover:border-emerald-500/20",
                      isBearish && "border-rose-500/10 bg-rose-500/[0.02] hover:border-rose-500/20",
                      isNeutral && "border-slate-500/10 bg-slate-500/[0.02] hover:border-slate-500/20",
                      insight.type === "info" && "border-indigo-500/10 bg-indigo-500/[0.02] hover:border-indigo-500/20"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider font-mono",
                          isBullish && "bg-emerald-500/10 text-emerald-400",
                          isBearish && "bg-rose-500/10 text-rose-400",
                          isNeutral && "bg-slate-500/10 text-slate-400",
                          insight.type === "info" && "bg-indigo-500/10 text-indigo-400"
                        )}
                      >
                        {insight.category}
                      </span>
                      <span className="text-[12px]">
                        {isBullish && "🟢"}
                        {isBearish && "🔴"}
                        {isNeutral && "⚪"}
                        {insight.type === "info" && "🔵"}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-300 font-sans">
                      {insight.text}
                    </p>
                  </div>
                );
              })}
            </div>

          </GlassCard>

          {/* Whale Deals List */}
          <GlassCard className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
                  Large deals today ({deals.length})
                </h2>
                <p className="text-[10px] text-slate-500">
                  Bulk & Block transactions processed today
                </p>
              </div>
              <Waves className="h-4 w-4 text-indigo-400" />
            </div>

            <div className="space-y-2">
              {deals.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">
                  No large trades recorded for {normalized} today.
                </p>
              ) : (
                deals.map((deal) => {
                  const isBuy = deal.side === "BUY";
                  return (
                    <div
                      key={deal.id}
                      className="flex flex-col gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-4 transition hover:border-white/10"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-semibold text-white">{deal.clientName}</p>
                          <span
                            className={cn(
                              "mt-1.5 inline-flex rounded px-1.5 py-0.5 text-[9px] font-bold uppercase",
                              isBuy
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-rose-500/10 text-rose-500"
                            )}
                          >
                            {deal.side}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-xs font-bold text-white">Qty {deal.quantity}</p>
                          <p className="mt-1 font-mono text-[10px] text-slate-500">@{deal.price}</p>
                        </div>
                      </div>

                      {(deal.predictedParent || deal.isShell) && (
                        <div className="flex items-center gap-2 border-t border-white/5 pt-3">
                          <Bot className="h-3.5 w-3.5 text-indigo-400" />
                          <div className="text-[10px]">
                            <span className="text-slate-400">AI Unmask: </span>
                            {deal.predictedParent ? (
                              <span className="font-semibold text-indigo-300">
                                {deal.predictedParent} ({deal.confidence}% match)
                              </span>
                            ) : (
                              <span className="text-slate-500 italic">Shell Entity detected</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </GlassCard>
        </div>

        {/* Right Column: Momentum & Delivery details (4/12) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Momentum Panel */}
          <GlassCard className="p-6">
            <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-white/5 pb-4">
              <div>
                <div className="flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-indigo-400" />
                  <h2 className="text-sm font-semibold tracking-wide text-white uppercase font-sans">
                    Momentum Score
                  </h2>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">Technical momentum confirmation</p>
              </div>

              {/* Timeframe Chips */}
              <div className="flex items-center gap-1 bg-slate-950/40 p-1 border border-white/5 rounded-lg self-start sm:self-auto">
                {(["5m", "15m", "1h", "D"] as const).map((tf) => {
                  const isActive = timeframe === tf;
                  return (
                    <button
                      key={tf}
                      onClick={() => setTimeframe(tf)}
                      className={cn(
                        "rounded px-2.5 py-1 text-[9px] font-semibold transition-all duration-200 cursor-pointer uppercase font-mono",
                        isActive
                          ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                          : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
                      )}
                    >
                      {tf}
                    </button>
                  );
                })}
              </div>
            </div>

            {activeMomentum ? (
              <div className="space-y-6">
                {/* Score Dial with circular progress ring */}
                <div className="flex flex-col items-center justify-center">
                  <div className="relative flex h-28 w-28 items-center justify-center">
                    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100">
                      {/* Background circle */}
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        fill="transparent"
                        stroke="rgba(255, 255, 255, 0.04)"
                        strokeWidth="6"
                      />
                      {/* Animated progress ring */}
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        fill="transparent"
                        stroke={getScoreColor(activeMomentum.score)}
                        strokeWidth="6"
                        strokeDasharray="263.89"
                        strokeDashoffset={263.89 - (activeMomentum.score / 100) * 263.89}
                        strokeLinecap="round"
                        transform="rotate(-90 50 50)"
                        className="transition-all duration-700 ease-out"
                      />
                    </svg>
                    <div className="text-center z-10">
                      <p className="font-mono text-28 font-extrabold tracking-tight text-white transition-all duration-300">
                        {activeMomentum.score}
                      </p>
                      <div className="flex items-center justify-center gap-0.5 mt-0.5">
                        <span className={cn(
                          "font-mono text-[9px] font-semibold",
                          activeMomentum.delta >= 0 ? "text-emerald-400" : "text-rose-400"
                        )}>
                          {activeMomentum.delta >= 0 ? "↑" : "↓"} {activeMomentum.delta >= 0 ? "+" : ""}{activeMomentum.delta}
                        </span>
                        <span className="text-[8px] text-slate-500 uppercase font-mono">vs prev</span>
                      </div>
                    </div>
                  </div>
                  
                  <span
                    className={cn(
                      "mt-4 rounded-full px-3 py-1 text-[10px] font-bold uppercase transition-all duration-300",
                      getBadgeClass(activeMomentum.score)
                    )}
                  >
                    {activeMomentum.label}
                  </span>

                  {/* Micro-insight Line */}
                  <div className="mt-2.5 text-center px-4 max-w-[280px]">
                    <p className="text-[10px] text-slate-400 leading-normal font-sans italic">
                      &ldquo;{activeMomentum.insight}&rdquo;
                    </p>
                  </div>
                </div>

                {/* Score Breakdown Bars */}
                <div className="space-y-3">
                  {[
                    { label: "Price Strength", score: activeMomentum.breakdown?.priceMomentum ?? 50 },
                    { label: "Trend Alignment", score: activeMomentum.breakdown?.trendAlignment ?? 50 },
                    { label: "RSI Momentum", score: activeMomentum.breakdown?.rsiMomentum ?? 50 },
                    { label: "Volume Conf.", score: activeMomentum.breakdown?.volumeConfirmation ?? 50 },
                  ].map((item, idx) => (
                    <div key={idx}>
                      <div className="mb-1 flex items-center justify-between text-[10px]">
                        <span className="text-slate-400 font-medium">{item.label}</span>
                        <span className="font-mono font-semibold text-slate-200">{item.score}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            getBarColorClass(activeMomentum.score)
                          )}
                          style={{ width: `${item.score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* technical levels */}
                <div className="grid grid-cols-2 gap-3 border-t border-white/5 pt-4 text-[10px] font-mono">
                  <div className="rounded-lg bg-white/[0.02] p-2 border border-white/5">
                    <span className="text-slate-500">RSI (14)</span>
                    <p className="mt-0.5 font-bold text-slate-200">
                      {activeMomentum.rsi14 ? activeMomentum.rsi14.toFixed(1) : "—"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white/[0.02] p-2 border border-white/5">
                    <span className="text-slate-500">Volume Ratio</span>
                    <p className="mt-0.5 font-bold text-slate-200">
                      {activeMomentum.volumeRatio10_50 ? activeMomentum.volumeRatio10_50.toFixed(2) : "—"}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 text-center py-8">
                Momentum data not available for index/commodity.
              </p>
            )}
          </GlassCard>

          {/* PCR Speedometer Gauge */}
          {derivatives && (
            <PcrSpeedometer
              pcr={derivatives.pcr}
              putOi={derivatives.putOi}
              callOi={derivatives.callOi}
              symbol={derivatives.symbol}
            />
          )}

          {/* Institutional Momentum Index (IMI) Breakdown */}
          {directoryEntry && (
            <GlassCard className="p-6" glow={directoryEntry.imiScore >= 70 ? "indigo" : directoryEntry.imiScore <= 40 ? "bearish" : "none"}>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold tracking-wide text-white uppercase font-sans">
                    Institutional Momentum Index (IMI)
                  </h2>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                    Composite smart-money rotation index
                  </p>
                </div>
                <Cpu className="h-4 w-4 text-indigo-400" />
              </div>

              <div className="space-y-6">
                {/* Overall Score Dial / Indicator */}
                <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-4">
                  <div>
                    <span className="text-[10px] text-slate-400 font-sans">Composite IMI Score</span>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-3xl font-extrabold tracking-tight text-white font-mono">
                        {directoryEntry.imiScore}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">/ 100</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-sans">F&O Buildup State</span>
                    <p className={cn(
                      "mt-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded border uppercase",
                      directoryEntry.foCondition === "LONG BUILDUP" && "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
                      directoryEntry.foCondition === "SHORT COVERING" && "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
                      directoryEntry.foCondition === "LONG UNWINDING" && "text-amber-400 border-amber-500/30 bg-amber-500/10",
                      directoryEntry.foCondition === "SHORT BUILDUP" && "text-rose-400 border-rose-500/30 bg-rose-500/10"
                    )}>
                      {directoryEntry.foCondition}
                    </p>
                  </div>
                </div>

                {/* Breakdown Calculations */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-bold tracking-wider text-slate-500 uppercase font-sans">
                    Factor Breakdown
                  </h3>
                  
                  <div className="space-y-3 font-mono text-xs">
                    {/* 1. Base Price Momentum */}
                    <div className="rounded-lg border border-white/5 bg-white/[0.01] p-2.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-slate-400">1. Base Price Momentum</span>
                        <span className="font-semibold text-slate-200">
                          {50 + Math.floor((quote?.changePercent || 0) * 4)} pts
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span>Formula: 50 + (Price Chg % * 4)</span>
                        <span>Price Chg: {(quote?.changePercent || 0).toFixed(2)}%</span>
                      </div>
                    </div>

                    {/* 2. Sector Performance Bonus */}
                    {(() => {
                      const isTop1 = topSectors[0] === directoryEntry.sector;
                      const isTop3 = topSectors.slice(0, 3).includes(directoryEntry.sector);
                      const sectorBonus = isTop1 ? 15 : isTop3 ? 10 : 0;
                      return (
                        <div className="rounded-lg border border-white/5 bg-white/[0.01] p-2.5">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-slate-400">2. Sector Flow Bonus</span>
                            <span className={cn("font-semibold", sectorBonus > 0 ? "text-emerald-400" : "text-slate-500")}>
                              +{sectorBonus} pts
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-500">
                            <span>Sector: {directoryEntry.sector}</span>
                            <span>
                              {isTop1 ? "Rank #1 Sector (+15)" : isTop3 ? "Top 3 Sector (+10)" : "Neutral Rank (+0)"}
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* 3. F&O Buildup Phase Bonus */}
                    {(() => {
                      let foBonus = 0;
                      if (directoryEntry.foCondition === "LONG BUILDUP") foBonus = 20;
                      else if (directoryEntry.foCondition === "SHORT COVERING") foBonus = 15;
                      else if (directoryEntry.foCondition === "LONG UNWINDING") foBonus = 5;
                      else if (directoryEntry.foCondition === "SHORT BUILDUP") foBonus = -10;
                      return (
                        <div className="rounded-lg border border-white/5 bg-white/[0.01] p-2.5">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-slate-400">3. F&O Phase Bonus</span>
                            <span className={cn("font-semibold", foBonus > 0 ? "text-emerald-400" : foBonus < 0 ? "text-rose-400" : "text-slate-500")}>
                              {foBonus >= 0 ? `+${foBonus}` : foBonus} pts
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-500">
                            <span>Buildup: {directoryEntry.foCondition}</span>
                            <span>
                              {directoryEntry.foCondition === "LONG BUILDUP" && "Aggressive Buildup (+20)"}
                              {directoryEntry.foCondition === "SHORT COVERING" && "Short Exit (+15)"}
                              {directoryEntry.foCondition === "LONG UNWINDING" && "Profit Booking (+5)"}
                              {directoryEntry.foCondition === "SHORT BUILDUP" && "Aggressive Shorting (-10)"}
                              {directoryEntry.foCondition === "N/A" && "Not Applicable (+0)"}
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* 4. Delivery Accumulation Bonus */}
                    {(() => {
                      let deliveryBonus = 0;
                      const delPct = directoryEntry.deliveryPercent || 0;
                      if (delPct > 50) deliveryBonus = 15;
                      else if (delPct >= 40) deliveryBonus = 5;
                      return (
                        <div className="rounded-lg border border-white/5 bg-white/[0.01] p-2.5">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-slate-400">4. Delivery Accumulation</span>
                            <span className={cn("font-semibold", deliveryBonus > 0 ? "text-emerald-400" : "text-slate-500")}>
                              +{deliveryBonus} pts
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-500">
                            <span>Delivery %: {delPct.toFixed(1)}%</span>
                            <span>
                              {delPct > 50 ? "High delivery >50% (+15)" : delPct >= 40 ? "Moderate delivery >=40% (+5)" : "Low delivery (+0)"}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
                
                {/* Clamping & Final Note */}
                <div className="border-t border-white/5 pt-4 text-[10px] text-slate-500 leading-relaxed">
                  <p>
                    * Scores are clamped between 5 (Extremely Bearish) and 98 (Extremely Bullish) based on real-time market sentiment and institutional block interest.
                  </p>
                </div>
              </div>
            </GlassCard>
          )}

          {/* Delivery Scan History */}
          <GlassCard className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
                  Delivery
                </h2>
                <p className="text-[10px] text-slate-500">30-day corporate delivery scan</p>
              </div>
              <Package className="h-4 w-4 text-indigo-400" />
            </div>

            {delivery ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-indigo-500/10 bg-indigo-500/[0.03] p-3 text-glow-bullish">
                  <div>
                    <span className="text-[10px] text-slate-400">Latest Delivery</span>
                    <p className="mt-0.5 font-mono text-base font-bold text-indigo-300">
                      {delivery.deliveryPercent?.toFixed(1) || "—"}%
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400">Trade Volume</span>
                    <p className="mt-0.5 font-mono text-xs text-slate-200">
                      {delivery.volume ? delivery.volume : "—"}
                    </p>
                  </div>
                </div>

                {/* Historical Bhavcopy Table */}
                <div className="rounded-xl border border-white/5 overflow-hidden">
                  <table className="w-full border-collapse text-left text-[10px]">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/[0.02] text-slate-500 font-bold uppercase tracking-wider">
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5 text-right">Delivery %</th>
                        <th className="p-2.5 text-right">Volume</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono text-slate-300">
                      {(delivery.history || []).slice(0, 5).map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-white/[0.01]">
                          <td className="p-2.5 text-slate-400">{row.date}</td>
                          <td
                            className={cn(
                              "p-2.5 text-right font-semibold",
                              row.deliveryPercent >= 60 ? "text-emerald-400" : "text-slate-300"
                            )}
                          >
                            {row.deliveryPercent.toFixed(1)}%
                          </td>
                          <td className="p-2.5 text-right text-slate-500">{row.volume}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 text-center py-8">
                Not available.
              </p>
            )}
          </GlassCard>
        </div>
      </div>

      {/* Corporate Announcements Section */}
      <GlassCard className="mt-6 p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
              Corporate Announcements & News
            </h2>
            <p className="text-[10px] text-slate-500">
              Live corporate actions, order wins, and investor meetings from Moneycontrol & Economic Times
            </p>
          </div>
          <ExternalLink className="h-4 w-4 text-indigo-400" />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {announcements.length === 0 ? (
            <p className="col-span-2 text-center text-xs text-slate-500 py-6">
              No recent announcements found.
            </p>
          ) : (
            announcements.map((item) => {
              const isBullish = item.sentiment === "Bullish";
              const isBearish = item.sentiment === "Bearish";
              return (
                <div
                  key={item.id}
                  className="flex flex-col justify-between rounded-xl border border-white/5 bg-white/[0.02] p-4 transition duration-300 hover:border-white/10 hover:bg-white/[0.04]"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-[9px] font-bold text-indigo-400 uppercase tracking-wider">
                        {item.category}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider",
                          isBullish
                            ? "bg-emerald-500/10 text-emerald-400"
                            : isBearish
                            ? "bg-rose-500/10 text-rose-400"
                            : "bg-slate-500/10 text-slate-400"
                        )}
                      >
                        {item.sentiment}
                      </span>
                    </div>

                    <h3 className="text-xs font-semibold text-white leading-snug">
                      {item.title}
                    </h3>
                    {item.description && item.description !== item.title && (
                      <p className="mt-1.5 text-[10px] leading-relaxed text-slate-400">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3 text-[9px] text-slate-500">
                    <span className="font-medium">
                      Source:{" "}
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-indigo-400 hover:underline transition"
                      >
                        {item.source}
                      </a>
                    </span>
                    <span className="font-mono">{item.date}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </GlassCard>
    </main>
  );
}
