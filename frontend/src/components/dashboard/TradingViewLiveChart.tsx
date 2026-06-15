"use client";

import { useEffect, useRef, useState, useId, useCallback } from "react";
import { AlertTriangle } from "lucide-react";

type TradingViewLiveChartProps = {
  symbol: string;
  currency?: string;
};

export default function TradingViewLiveChart({ symbol, currency = "INR" }: TradingViewLiveChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const containerId = `tradingview-live-chart-${id.replace(/:/g, "")}`;
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Map backend symbols to TradingView symbols
  const getTVSymbol = useCallback((sym: string): string => {
    const cleanSym = sym.toUpperCase().trim();
    
    // 1. Index mappings (Standardized yfinance symbols to TradingView symbols)
    const indexMap: Record<string, string> = {
      // Indian Indices
      "^NSEI": "BSE:NIFTYBEES",
      "NIFTY": "BSE:NIFTYBEES",
      "^BSESN": "BSE:SENSEX",
      "SENSEX": "BSE:SENSEX",
      "^NSEBANK": "BSE:BANKBEES",
      "BANKNIFTY": "BSE:BANKBEES",
      "^NSEMDCP50": "BSE:MIDCAP",
      "^CNXIT": "BSE:INFY", // Fallback to a major constituent as IT index is restricted
      "^CNXAUTO": "BSE:TATAMOTORS",
      
      // Global Indices
      "^GSPC": "SP:SPX",
      "SP500": "SP:SPX",
      "^IXIC": "NASDAQ:IXIC",
      "NASDAQ": "NASDAQ:IXIC",
      "^DJI": "DJ:DJI",
      "DOW_JONES": "DJ:DJI",
      "^FTSE": "INDEX:FTSE",
      "^GDAXI": "INDEX:DAX",
      "^N225": "INDEX:N225",
      "^HSI": "INDEX:HSI",
      
      // Commodities
      "GC=F": "COMEX:GC1!",
      "GOLD": "COMEX:GC1!",
      "SI=F": "COMEX:SI1!",
      "SILVER": "COMEX:SI1!",
      "CL=F": "NYMEX:CL1!",
      "CRUDE_OIL": "NYMEX:CL1!",
      "NG=F": "NYMEX:NG1!",
      "NATURAL_GAS": "NYMEX:NG1!",
      "HG=F": "COMEX:HG1!",
      "COPPER": "COMEX:HG1!",
      
      // Currencies
      "USDINR=X": "FX_IDC:USDINR",
      "USDEUR=X": "FX_IDC:USDEUR",
      "USDGBP=X": "FX_IDC:USDGBP",
      "USDJPY=X": "FX_IDC:USDJPY",
    };

    if (indexMap[cleanSym]) {
      return indexMap[cleanSym];
    }

    // 2. NSE / BSE stocks (Map NSE (.NS) to BSE to bypass free widget restrictions)
    if (cleanSym.endsWith(".NS")) {
      return `BSE:${cleanSym.replace(".NS", "")}`;
    }
    if (cleanSym.endsWith(".BO")) {
      return `BSE:${cleanSym.replace(".BO", "")}`;
    }

    // 3. Fallbacks for other suffixes:
    if (cleanSym.endsWith("=F")) {
      return `COMEX:${cleanSym.replace("=F", "")}1!`;
    }
    if (cleanSym.endsWith("=X")) {
      return `FX_IDC:${cleanSym.replace("=X", "")}`;
    }
    if (cleanSym.startsWith("^")) {
      return `INDEX:${cleanSym.replace("^", "")}`;
    }

    // 4. Currency-based fallback for US stocks
    if (currency === "USD") {
      return cleanSym; // TradingView will auto-resolve standard US tickers correctly
    }

    // Default to BSE for other Indian stocks to ensure widget loads successfully
    return `BSE:${cleanSym}`;
  }, [currency]);

  const tvSymbol = getTVSymbol(symbol);
  const isIndianStock = tvSymbol.startsWith("BSE:") || tvSymbol.startsWith("NSE:") || currency === "INR";

  // Effect 1: Handle script loading (run once on mount)
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).TradingView) {
      setScriptLoaded(true);
      return;
    }

    const existingScript = document.getElementById("tradingview-widget-script") as HTMLScriptElement | null;
    if (existingScript) {
      if ((window as any).TradingView) {
        setScriptLoaded(true);
      } else {
        const handleLoad = () => setScriptLoaded(true);
        existingScript.addEventListener("load", handleLoad);
        return () => {
          existingScript.removeEventListener("load", handleLoad);
        };
      }
      return;
    }

    const script = document.createElement("script");
    script.id = "tradingview-widget-script";
    script.src = "https://s3.tradingview.com/tv.js";
    script.type = "text/javascript";
    script.async = true;
    const handleLoad = () => setScriptLoaded(true);
    script.addEventListener("load", handleLoad);
    document.head.appendChild(script);

    return () => {
      script.removeEventListener("load", handleLoad);
    };
  }, []);

  // Effect 2: Initialize widget when script is loaded or symbol changes
  useEffect(() => {
    if (!scriptLoaded) return;

    const initializeWidget = () => {
      const container = containerRef.current;
      if (container) {
        container.innerHTML = "";
      }

      if (typeof window !== "undefined" && (window as any).TradingView) {
        try {
          console.log("[TradingView] Input symbol:", symbol, "Resolved symbol:", tvSymbol, "Currency:", currency);
          new (window as any).TradingView.widget({
            autosize: true,
            symbol: tvSymbol,
            interval: "D",
            timezone: "Asia/Kolkata",
            theme: "dark",
            style: "1",
            locale: "en",
            enable_publishing: false,
            hide_side_toolbar: false,
            allow_symbol_change: true,
            container_id: containerId,
            studies: ["RSI@tv-basicstudies", "MASimple@tv-basicstudies"],
            loading_screen: {
              backgroundColor: "#0b0f19",
              foregroundColor: "#6366f1",
            },
          });
        } catch (e) {
          console.error("TradingView widget init error:", e);
        }
      }
    };

    const timer = setTimeout(initializeWidget, 100);
    return () => clearTimeout(timer);
  }, [symbol, scriptLoaded, containerId, currency, tvSymbol]);

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="relative h-[480px] w-full overflow-hidden rounded-xl border border-white/5 bg-slate-950/40 backdrop-blur-md">
        <div id={containerId} ref={containerRef} className="h-full w-full" />
        {!scriptLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 bg-slate-950/80">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            <p className="text-xs font-medium text-slate-400">Loading TradingView Terminal...</p>
          </div>
        )}
      </div>

      {isIndianStock && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-200/90 leading-relaxed shadow-sm">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-amber-300">Indian Market Restriction (BSE / NSE)</p>
            <p>
              TradingView&apos;s free widget does not license real-time intraday data feeds for Indian exchanges. Selecting small timeframes like <code className="bg-amber-950/40 px-1.5 py-0.5 rounded font-mono text-[10px] text-amber-300">1m</code>, <code className="bg-amber-950/40 px-1.5 py-0.5 rounded font-mono text-[10px] text-amber-300">30m</code>, or <code className="bg-amber-950/40 px-1.5 py-0.5 rounded font-mono text-[10px] text-amber-300">1h</code> will fail to load or display <span className="font-medium text-white">&quot;No data&quot;</span>.
            </p>
            <p className="pt-1 text-amber-400/95">
              💡 <span className="font-semibold text-white">Workaround:</span> Switch to the <strong className="text-indigo-400 font-bold">SMC Algorithmic Chart</strong> tab above. Our custom chart uses high-frequency data from Yahoo Finance, which fully supports all intraday timeframes (from 1 min up to 1 hour) for Indian stocks!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
