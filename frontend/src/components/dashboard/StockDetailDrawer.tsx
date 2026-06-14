"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, TrendingUp, TrendingDown, Activity, ChevronRight, BarChart2, ShieldAlert, CheckCircle2 } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import {
  fetchStockQuote,
  fetchStockHistory,
  fetchStockMomentum,
  fetchDerivativesDetail,
  type DerivativesSnapshot,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const usSymbols = [
  "AAPL", "MSFT", "GOOG", "GOOGL", "AMZN", "TSLA", "META", "NVDA", "NFLX", 
  "AMD", "INTC", "QCOM", "AVGO", "CSCO", "ADBE", "AMAT", "TXN", "MU", "ISRG", 
  "LRCX", "HON", "AMGN", "SBUX", "MDLZ", "GILD", "PYPL", "ADSK", "NXPI", "PANW", 
  "COST", "PEP", "KO", "WMT", "NKE", "DIS", "HD", "MCD", "JPM", "BAC", "MS", 
  "GS", "V", "MA", "AXP", "C", "XOM", "CVX", "COP", "SLB", "CAT", "GE", "UNP", 
  "BA", "LLY", "JNJ", "UNH", "MRK", "ABBV", "PFE", "TMO"
];

function isUSStock(symbol: string): boolean {
  return usSymbols.includes(symbol.toUpperCase());
}

const foEligibleSymbols = [
  "HDFCBANK", "ICICIBANK", "SBIN", "AXISBANK", "KOTAKBANK", "YESBANK", 
  "HDFCLIFE", "SBILIFE", "BAJFINANCE", "BAJAJFINSV", "TCS", "INFY", 
  "WIPRO", "TECHM", "LTM", "TMPV", "MARUTI", "TATASTEEL", "JSWSTEEL", 
  "HINDALCO", "RELIANCE", "NTPC", "POWERGRID", "ONGC", "COALINDIA", 
  "LT", "ADANIENT", "ADANIPORTS", "HINDUNILVR", "ITC", "NESTLEIND", 
  "SUNPHARMA", "TITAN", "ETERNAL", "HAL", "BEL"
];

function isFoEligible(symbol: string): boolean {
  return foEligibleSymbols.includes(symbol.toUpperCase());
}

function computeEMA(bars: any[], period = 20): number | null {
  if (!bars || bars.length < period) return null;
  const prices = bars.map((b) => b.close);
  
  // Calculate initial SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += prices[i];
  }
  let ema = sum / period;
  
  const multiplier = 2 / (period + 1);
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  return ema;
}

export function StockDetailDrawer() {
  const router = useRouter();
  const { selectedSymbol, isDrawerOpen, setIsDrawerOpen } = useDashboard();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [quote, setQuote] = useState<any | null>(null);
  const [history, setHistory] = useState<any | null>(null);
  const [momentum, setMomentum] = useState<any | null>(null);
  const [derivatives, setDerivatives] = useState<DerivativesSnapshot | null>(null);

  useEffect(() => {
    if (!selectedSymbol || !isDrawerOpen) return;
    
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const isUS = isUSStock(selectedSymbol);
        const [quoteData, historyData, momentumData, derivativesData] = await Promise.all([
          fetchStockQuote(selectedSymbol).catch(() => null),
          fetchStockHistory(selectedSymbol, "3mo", "1d").catch(() => null),
          fetchStockMomentum(selectedSymbol).catch(() => null),
          isUS || !isFoEligible(selectedSymbol) ? Promise.resolve(null) : fetchDerivativesDetail(selectedSymbol).catch(() => null)
        ]);

        if (!isMounted) return;

        if (!quoteData) {
          throw new Error("Stock not found");
        }

        setQuote(quoteData);
        setHistory(historyData);
        setMomentum(momentumData);
        setDerivatives(derivativesData);
      } catch (err) {
        if (isMounted) {
          setError("Failed to compile dashboard intelligence for this ticker.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [selectedSymbol, isDrawerOpen]);

  if (!selectedSymbol) return null;

  const isUS = isUSStock(selectedSymbol);
  const currency = isUS ? "$" : "₹";
  const locale = isUS ? "en-US" : "en-IN";

  // Calculate EMA 20
  const ema20 = history && history.bars ? computeEMA(history.bars, 20) : null;
  const currentPrice = quote?.price ?? null;
  const isAboveEma20 = currentPrice !== null && ema20 !== null ? currentPrice >= ema20 : null;
  const emaDeviation = currentPrice !== null && ema20 !== null ? ((currentPrice - ema20) / ema20) * 100 : null;

  const getScoreColorClass = (score: number) => {
    if (score < 30) return "text-rose-400";
    if (score < 50) return "text-amber-400";
    if (score < 70) return "text-emerald-400";
    return "text-emerald-400";
  };

  const getScoreBgClass = (score: number) => {
    if (score < 30) return "bg-rose-500/10 border-rose-500/20 text-rose-400";
    if (score < 50) return "bg-amber-500/10 border-amber-500/20 text-amber-400";
    if (score < 70) return "bg-emerald-500/10 border-emerald-500/20 text-emerald-400";
    return "bg-emerald-500/20 border-emerald-500/30 text-emerald-400";
  };

  const getFoBadgeClass = (cond: string) => {
    switch (cond?.toUpperCase()) {
      case "LONG BUILDUP":
        return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
      case "SHORT COVERING":
        return "border-cyan-500/30 bg-cyan-500/10 text-cyan-400";
      case "SHORT BUILDUP":
        return "border-rose-500/30 bg-rose-500/10 text-rose-400";
      case "LONG UNWINDING":
        return "border-amber-500/30 bg-amber-500/10 text-amber-400";
      default:
        return "border-white/10 bg-white/5 text-slate-400";
    }
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
          isDrawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsDrawerOpen(false)}
      />

      {/* Drawer Panel */}
      <div
        className={cn(
          "fixed right-0 top-0 bottom-0 z-50 w-[460px] max-w-[95vw] glass-strong border-l border-white/10 shadow-2xl flex flex-col transition-transform duration-300 ease-out transform",
          isDrawerOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xl font-black text-white tracking-tight">
                {selectedSymbol}
              </span>
              <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] font-bold text-slate-400 tracking-wider">
                {isUS ? "US MARKET" : "NSE INDIA"}
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate max-w-[280px] mt-1">
              {quote?.name ?? "Loading quote name..."}
            </p>
          </div>
          
          <button
            onClick={() => setIsDrawerOpen(false)}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 font-sans">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
              <p className="text-xs text-slate-500 font-mono">Compiling Confluence Data...</p>
            </div>
          ) : error ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
              <ShieldAlert className="text-rose-500 h-10 w-10" />
              <p className="text-sm text-slate-400 font-semibold">{error}</p>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white hover:bg-white/10 transition"
              >
                Close Drawer
              </button>
            </div>
          ) : (
            <>
              {/* Quote Price Info */}
              <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">LTP Quote</p>
                  <p className="text-3xl font-black text-white tracking-tight mt-1 font-mono">
                    {currentPrice !== null ? `${currency}${currentPrice.toLocaleString(locale, { minimumFractionDigits: 2 })}` : "—"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Change %</p>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-sm font-extrabold mt-2 px-2.5 py-1 rounded-lg",
                      (quote?.changePercent ?? 0) >= 0
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    )}
                  >
                    {(quote?.changePercent ?? 0) >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {quote?.changePercent !== undefined ? `${(quote.changePercent >= 0 ? "+" : "")}${quote.changePercent.toFixed(2)}%` : "—"}
                  </span>
                </div>
              </div>

              {/* Institutional Momentum Score */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity size={14} className="text-indigo-400" />
                  Institutional Momentum
                </h4>
                
                {momentum ? (
                  <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className={cn("text-[10px] font-black uppercase px-2 py-0.5 rounded border tracking-wider", getScoreBgClass(momentum.score))}>
                          {momentum.label ?? "NEUTRAL"}
                        </span>
                        <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed max-w-[280px]">
                          {momentum.score >= 70 
                            ? "Strong institutional support with aligned buying velocity."
                            : momentum.score >= 50
                            ? "Moderately bullish with stable price and volume accumulation."
                            : momentum.score >= 30
                            ? "Neutral consolidation. Institutional flows remain mixed."
                            : "Bearish pressure active. Watch for distribution signs."}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Composite</p>
                        <p className={cn("text-3xl font-black font-mono tracking-tight mt-0.5", getScoreColorClass(momentum.score))}>
                          {momentum.score}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            momentum.score >= 70 ? "bg-emerald-500" : momentum.score >= 50 ? "bg-emerald-400" : momentum.score >= 30 ? "bg-amber-500" : "bg-rose-500"
                          )}
                          style={{ width: `${momentum.score}%` }}
                        />
                      </div>
                    </div>

                    {/* Indicator Breakdown */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      {[
                        { label: "Price momentum", val: momentum.breakdown?.priceMomentum ?? 50 },
                        { label: "Trend alignment", val: momentum.breakdown?.trendAlignment ?? 50 },
                        { label: "RSI Momentum", val: momentum.breakdown?.rsiMomentum ?? 50 },
                        { label: "Volume Confirmation", val: momentum.breakdown?.volumeConfirmation ?? 50 },
                      ].map((item, idx) => (
                        <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex justify-between items-center">
                          <span className="text-[10px] text-slate-400 font-semibold">{item.label}</span>
                          <span className={cn("text-xs font-bold font-mono", getScoreColorClass(item.val))}>
                            {item.val}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic p-3">Momentum model scoring not available.</p>
                )}
              </div>

              {/* EMA 20 Position */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart2 size={14} className="text-indigo-400" />
                  Exponential Moving Average (20 EMA)
                </h4>

                {ema20 !== null ? (
                  <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isAboveEma20 ? (
                          <CheckCircle2 size={18} className="text-emerald-400" />
                        ) : (
                          <ShieldAlert size={18} className="text-rose-400" />
                        )}
                        <span className={cn("text-xs font-extrabold uppercase tracking-wider", isAboveEma20 ? "text-emerald-400" : "text-rose-400")}>
                          {isAboveEma20 ? "Trading Above 20 EMA" : "Trading Below 20 EMA"}
                        </span>
                      </div>
                      <div className="text-right">
                        <span
                          className={cn(
                            "inline-flex text-[10px] font-bold font-mono px-2 py-0.5 rounded-md",
                            isAboveEma20 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          )}
                        >
                          {isAboveEma20 ? "+" : ""}{emaDeviation?.toFixed(2)}% deviation
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-1 font-mono text-xs">
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans">LTP Price</p>
                        <p className="text-white font-bold mt-1 text-sm">
                          {currentPrice !== null ? `${currency}${currentPrice.toLocaleString(locale, { minimumFractionDigits: 2 })}` : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans">20-Day EMA</p>
                        <p className="text-slate-300 font-bold mt-1 text-sm">
                          {currency}{ema20.toLocaleString(locale, { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic p-3">Historical bar series insufficient to calculate 20 EMA.</p>
                )}
              </div>

              {/* Derivatives Buildup */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart2 size={14} className="text-indigo-400" />
                  Derivatives OI Buildup
                </h4>

                {!isFoEligible(selectedSymbol) || isUS ? (
                  <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-4 text-center">
                    <p className="text-xs text-slate-400 font-medium font-sans">
                      Derivatives Option Chain details are not applicable for {isUS ? "US Equities" : "this stock"}.
                    </p>
                  </div>
                ) : derivatives ? (
                  <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">OI Buildup Condition</p>
                        <span className={cn("inline-flex rounded border px-2 py-0.5 text-xs font-bold tracking-wide uppercase mt-1.5", getFoBadgeClass(derivatives.condition))}>
                          {derivatives.condition ?? "NO BUILDUP"}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Put-Call Ratio (PCR)</p>
                        <p className="text-lg font-black text-white font-mono mt-1">
                          {derivatives.pcr?.toFixed(2) ?? "—"}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-1 font-mono text-xs border-t border-white/5 mt-2">
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans">Put open interest</p>
                        <p className="text-emerald-400 font-bold mt-1 text-xs">
                          {derivatives.putOi ? `${(derivatives.putOi / 100000).toFixed(1)}L` : "0"} qty
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans">Call open interest</p>
                        <p className="text-rose-400 font-bold mt-1 text-xs">
                          {derivatives.callOi ? `${(derivatives.callOi / 100000).toFixed(1)}L` : "0"} qty
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic p-3">F&O derivatives chain not active or loading...</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 bg-black/20">
          <button
            onClick={() => {
              setIsDrawerOpen(false);
              router.push(`/stock/${selectedSymbol}`);
            }}
            className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs tracking-wide flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(99,102,241,0.2)] hover:shadow-[0_0_25px_rgba(99,102,241,0.45)] transition duration-200"
          >
            Open Full Interactive Terminal
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </>
  );
}
