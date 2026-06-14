"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { createChart, ColorType, LineStyle, IChartApi, ISeriesApi, CandlestickSeries, LineSeries, HistogramSeries, createSeriesMarkers, TickMarkType } from "lightweight-charts";
import { type WhaleDeal } from "@/lib/mock-data";
import { computeSMC, OHLCVBar } from "@/lib/smcEngine";
import { Eye, EyeOff, Sliders, TrendingUp, HelpCircle } from "lucide-react";

type CandlestickChartProps = {
  bars: any[];
  deals: WhaleDeal[];
  currencySymbol: string;
  interval: string;
  onInsightsGenerated?: (insights: { type: "info" | "bullish" | "bearish" | "neutral"; category: string; text: string }[]) => void;
  hoveredInsight?: { category: string; text: string } | null;
};

export default function CandlestickChart({
  bars,
  deals,
  currencySymbol,
  interval,
  onInsightsGenerated,
  hoveredInsight,
}: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Ref to track maximum timestamp in the data to hide future timescale ticks/crosshairs
  const maxTimestampRef = useRef<number | null>(null);
  
  // Persistent chart and series references
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const markersPluginRef = useRef<any>(null);
  
  // Track dynamically added overlays (EMA, OB lines, FVG lines) so they can be removed/updated
  const activeSeriesListRef = useRef<ISeriesApi<any>[]>([]);
  
  const isFirstRender = useRef(true);
  const prevInterval = useRef(interval);

  // Toggle states
  const [showEma, setShowEma] = useState(true);
  const [showStructure, setShowStructure] = useState(true);
  const [showOBs, setShowOBs] = useState(true);
  const [showFVGs, setShowFVGs] = useState(true);

  // Pre-process, sort, and deduplicate SMC metrics and chart bars
  const { formattedBars, smcResult } = useMemo(() => {
    if (!bars || bars.length === 0) {
      return { formattedBars: [], smcResult: null };
    }

    const isIntraday = ["1m", "2m", "5m", "15m", "30m", "1h"].includes(interval);
    
    const toChartTime = (isoDate: string): any => {
      if (isIntraday) {
        return Math.floor(new Date(isoDate).getTime() / 1000) as any;
      }
      try {
        const d = new Date(isoDate);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      } catch (e) {
        return isoDate.split("T")[0].split(" ")[0];
      }
    };

    const toChartTimeValue = (isoDate: string): number => {
      try {
        return Math.floor(new Date(isoDate).getTime() / 1000);
      } catch (e) {
        return 0;
      }
    };

    // Map yfinance backend history bars and compute time values
    const mapped = bars.map((bar) => {
      const dateStr = bar.rawDate || bar.date || bar.time;
      return {
        date: dateStr,
        chartTimeVal: toChartTimeValue(dateStr),
        chartTime: toChartTime(dateStr),
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close || bar.price,
        volume: bar.volume || 0,
      };
    });

    // Sort chronologically ascending
    mapped.sort((a, b) => a.chartTimeVal - b.chartTimeVal);

    // Filter out any duplicate timestamps on the timescale
    const uniqueBars: typeof mapped = [];
    mapped.forEach((bar) => {
      if (uniqueBars.length === 0 || bar.chartTime !== uniqueBars[uniqueBars.length - 1].chartTime) {
        uniqueBars.push(bar);
      }
    });

    const cleaned = uniqueBars.map((b) => ({
      date: b.date,
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
      volume: b.volume,
    }));

    // Compute standard SMC structures
    const result = computeSMC(cleaned);
    return { formattedBars: cleaned, smcResult: result };
  }, [bars, interval]);

  // Update maxTimestampRef when formattedBars changes to lock future labels
  useEffect(() => {
    if (formattedBars.length > 0) {
      const isIntraday = ["1m", "2m", "5m", "15m", "30m", "1h"].includes(interval);
      if (isIntraday) {
        const lastBar = formattedBars[formattedBars.length - 1];
        maxTimestampRef.current = Math.floor(new Date(lastBar.date).getTime() / 1000);
      } else {
        maxTimestampRef.current = null;
      }
    } else {
      maxTimestampRef.current = null;
    }
  }, [formattedBars, interval]);

  // Report insights to parent page when computed
  useEffect(() => {
    if (smcResult && onInsightsGenerated) {
      onInsightsGenerated(smcResult.insights);
    }
  }, [smcResult, onInsightsGenerated]);

  // Unmount cleanup
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        candlestickSeriesRef.current = null;
        volumeSeriesRef.current = null;
        activeSeriesListRef.current = [];
        markersPluginRef.current = null;
      }
    };
  }, []);

  // Main chart instantiation and render
  useEffect(() => {
    if (!containerRef.current || formattedBars.length === 0) return;

    const container = containerRef.current;
    const isIntraday = ["1m", "2m", "5m", "15m", "30m", "1h"].includes(interval);

    // Reset chart instance if interval changed
    if (prevInterval.current !== interval) {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        candlestickSeriesRef.current = null;
        volumeSeriesRef.current = null;
        activeSeriesListRef.current = [];
        markersPluginRef.current = null;
        isFirstRender.current = true;
      }
      prevInterval.current = interval;
    }

    let chart = chartRef.current;
    let candlestickSeries = candlestickSeriesRef.current;
    let volumeSeries = volumeSeriesRef.current;

    // 1. Initialize chart if not already created
    if (!chart) {
      chart = createChart(container, {
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: "#94a3b8",
          fontSize: 10,
          fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
        },
        localization: {
          timeFormatter: (timeVal: any) => {
            if (!timeVal) return "";
            let date: Date;
            if (typeof timeVal === "number") {
              if (maxTimestampRef.current && timeVal > maxTimestampRef.current) {
                return "";
              }
              date = new Date(timeVal * 1000);
            } else if (typeof timeVal === "string") {
              date = new Date(timeVal);
            } else if (timeVal && typeof timeVal === "object" && "year" in timeVal && "month" in timeVal && "day" in timeVal) {
              date = new Date(timeVal.year, timeVal.month - 1, timeVal.day);
            } else {
              date = new Date(timeVal);
            }

            if (isNaN(date.getTime())) {
              return String(timeVal);
            }

            const tz = currencySymbol === "$" ? "America/New_York" : "Asia/Kolkata";
            const datePart = date.toLocaleDateString("en-US", {
              timeZone: tz,
              month: "short",
              day: "numeric",
              year: "numeric",
            });

            if (isIntraday && typeof timeVal === "number") {
              const timePart = date.toLocaleTimeString("en-US", {
                timeZone: tz,
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              });
              return `${datePart} ${timePart}`;
            }
            return datePart;
          },
        },
        grid: {
          vertLines: { color: "rgba(255, 255, 255, 0.03)" },
          horzLines: { color: "rgba(255, 255, 255, 0.03)" },
        },
        crosshair: {
          mode: 1, // CrosshairMode.Normal
          vertLine: {
            color: "#6366f1",
            width: 1,
            style: 3, // LineStyle.Dashed
            labelBackgroundColor: "#312e81",
          },
          horzLine: {
            color: "#6366f1",
            width: 1,
            style: 3, // LineStyle.Dashed
            labelBackgroundColor: "#312e81",
          },
        },
        rightPriceScale: {
          borderColor: "rgba(255, 255, 255, 0.08)",
          textColor: "#94a3b8",
        },
        timeScale: {
          borderColor: "rgba(255, 255, 255, 0.08)",
          timeVisible: isIntraday,
          secondsVisible: false,
          fixRightEdge: true,
          tickMarkFormatter: (time: any, tickMarkType: any, locale: string) => {
            if (typeof time === "number") {
              if (maxTimestampRef.current && time > maxTimestampRef.current) {
                return "";
              }
              const date = new Date(time * 1000);
              const tz = currencySymbol === "$" ? "America/New_York" : "Asia/Kolkata";
              if (tickMarkType <= TickMarkType.DayOfMonth) {
                return date.toLocaleDateString("en-US", {
                  timeZone: tz,
                  month: "short",
                  day: "numeric",
                });
              }
              return date.toLocaleTimeString("en-US", {
                timeZone: tz,
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              });
            }
            return null; // Fallback to default built-in formatter for daily/weekly/monthly charts
          },
        },
        handleScale: {
          axisPressedMouseMove: true,
          mouseWheel: true,
          pinch: true,
        },
        handleScroll: {
          mouseWheel: true,
          pressedMouseMove: true,
          horzTouchDrag: true,
          vertTouchDrag: true,
        },
        width: container.clientWidth,
        height: 380,
      });

      chartRef.current = chart;

      // Create main series
      candlestickSeries = chart.addSeries(CandlestickSeries, {
        upColor: "#10b981",
        downColor: "#f43f5e",
        borderVisible: true,
        borderUpColor: "#10b981",
        borderDownColor: "#f43f5e",
        wickUpColor: "#10b981",
        wickDownColor: "#f43f5e",
      });
      candlestickSeriesRef.current = candlestickSeries;

      volumeSeries = chart.addSeries(HistogramSeries, {
        color: "#4f46e5",
        priceFormat: {
          type: "volume",
        },
        priceScaleId: "volume-scale",
      });
      volumeSeriesRef.current = volumeSeries;

      chart.priceScale("volume-scale").applyOptions({
        scaleMargins: {
          top: 0.8, // volume takes bottom 20%
          bottom: 0,
        },
      });
    }

    if (!chart || !candlestickSeries || !volumeSeries) return;

    // Determine intraday vs daily for lightweight-charts time format
    const toChartTime = (isoDate: string): any => {
      if (isIntraday) {
        return Math.floor(new Date(isoDate).getTime() / 1000) as any;
      }
      try {
        const d = new Date(isoDate);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      } catch (e) {
        return isoDate.split("T")[0].split(" ")[0];
      }
    };

    // Deduplicate helper: remove entries with duplicate time values
    const dedup = <T extends { time: any }>(arr: T[]): T[] =>
      arr.filter((item, i, a) => i === 0 || item.time !== a[i - 1].time);

    // 2. Clear previous dynamic overlay series
    activeSeriesListRef.current.forEach((s) => {
      try {
        chart?.removeSeries(s);
      } catch (e) {
        // Series might have been removed already
      }
    });
    activeSeriesListRef.current = [];

    // 3. Update core candlestick data
    const candleData = dedup(formattedBars.map((bar) => ({
      time: toChartTime(bar.date),
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
    })));
    candlestickSeries.setData(candleData);

    // 4. Update core volume data
    const volumeData = dedup(formattedBars.map((bar) => {
      const isUp = bar.close >= bar.open;
      return {
        time: toChartTime(bar.date),
        value: bar.volume,
        color: isUp ? "rgba(16, 185, 129, 0.2)" : "rgba(244, 63, 94, 0.2)",
      };
    }));
    volumeSeries.setData(volumeData);

    // 5. Add EMA 20 Overlay (recreated dynamically)
    const isEmaHovered = hoveredInsight && (hoveredInsight.category === "EMA 20 Trend" || hoveredInsight.category === "EMA 20 Crossover");
    if (showEma && smcResult) {
      const emaSeries = chart.addSeries(LineSeries, {
        color: isEmaHovered ? "#22d3ee" : "#06b6d4",
        lineWidth: isEmaHovered ? 4 : 2,
        priceScaleId: "right",
      });

      const emaData = dedup(formattedBars
        .map((bar, i) => {
          const val = smcResult.ema20[i];
          if (val === null) return null;
          return { time: toChartTime(bar.date), value: val };
        })
        .filter((item): item is { time: any; value: number } => item !== null));

      emaSeries.setData(emaData);
      activeSeriesListRef.current.push(emaSeries);
    }

    // 6. Draw BOS / CHoCH Structure & Whale deals markers
    const markers: any[] = [];
    if (showStructure && smcResult) {
      smcResult.breaks.forEach((br) => {
        const isBullish = br.direction === "bullish";
        const isBreakHovered = hoveredInsight && hoveredInsight.category === br.type &&
          (hoveredInsight.text.includes(br.price.toLocaleString("en-IN")) || 
           hoveredInsight.text.includes(new Date(br.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })));

        markers.push({
          time: toChartTime(br.date),
          position: isBullish ? "belowBar" : "aboveBar",
          color: br.type === "CHoCH" ? (isBullish ? "#3b82f6" : "#a855f7") : (isBullish ? "#10b981" : "#f43f5e"),
          shape: isBullish ? "arrowUp" : "arrowDown",
          text: br.type,
          size: isBreakHovered ? 2.5 : 1,
        });
      });
    }

    if (deals && deals.length > 0 && formattedBars.length > 0) {
      const lastBarTime = toChartTime(formattedBars[formattedBars.length - 1].date);
      deals.forEach((deal) => {
        const isBuy = deal.side === "BUY";
        markers.push({
          time: lastBarTime,
          position: isBuy ? "belowBar" : "aboveBar",
          color: isBuy ? "#10b981" : "#ef4444",
          shape: "circle",
          text: `Large Deal (${deal.quantity})`,
          size: 1.5,
        });
      });
    }

    markers.sort((a, b) => {
      const ta = typeof a.time === "number" ? a.time : new Date(a.time).getTime() / 1000;
      const tb = typeof b.time === "number" ? b.time : new Date(b.time).getTime() / 1000;
      return ta - tb;
    });
    if (!markersPluginRef.current) {
      markersPluginRef.current = createSeriesMarkers(candlestickSeries, markers);
    } else {
      markersPluginRef.current.setMarkers(markers);
    }

    // 7. Draw Order Blocks (OB)
    if (showOBs && smcResult) {
      const activeOBs = smcResult.orderBlocks.filter((ob) => !ob.broken).slice(-2);
      const brokenOBs = smcResult.orderBlocks.filter((ob) => ob.broken).slice(-2);
      const renderOBs = [...activeOBs, ...brokenOBs];

      renderOBs.forEach((ob) => {
        const isObHovered = hoveredInsight && hoveredInsight.category === "Order Block" &&
          (hoveredInsight.text.includes(ob.low.toFixed(1)) || hoveredInsight.text.includes(ob.high.toFixed(1)));

        let color = ob.type === "bullish" 
          ? (ob.broken ? "rgba(16, 185, 129, 0.15)" : "rgba(16, 185, 129, 0.7)") 
          : (ob.broken ? "rgba(244, 63, 94, 0.15)" : "rgba(244, 63, 94, 0.7)");

        if (isObHovered) {
          color = ob.type === "bullish" ? "rgba(16, 185, 129, 1.0)" : "rgba(244, 63, 94, 1.0)";
        }

        const topSeries = chart?.addSeries(LineSeries, {
          color,
          lineWidth: isObHovered ? 4 : (ob.broken ? 1 : 2),
          lineStyle: ob.broken && !isObHovered ? LineStyle.Dotted : LineStyle.Solid,
          title: "",
        });

        const bottomSeries = chart?.addSeries(LineSeries, {
          color,
          lineWidth: isObHovered ? 4 : (ob.broken ? 1 : 2),
          lineStyle: ob.broken && !isObHovered ? LineStyle.Dotted : LineStyle.Solid,
          title: "",
        });

        if (topSeries && bottomSeries) {
          const endIdx = ob.endIndex ?? (formattedBars.length - 1);
          const lineDataTop: any[] = [];
          const lineDataBottom: any[] = [];

          for (let j = ob.startIndex; j <= endIdx; j++) {
            lineDataTop.push({ time: toChartTime(formattedBars[j].date), value: ob.high });
            lineDataBottom.push({ time: toChartTime(formattedBars[j].date), value: ob.low });
          }

          topSeries.setData(lineDataTop);
          bottomSeries.setData(lineDataBottom);

          activeSeriesListRef.current.push(topSeries, bottomSeries);
        }
      });
    }

    // 8. Draw Fair Value Gaps (FVG)
    if (showFVGs && smcResult) {
      const recentFVGs = smcResult.fvgs.slice(-3);

      recentFVGs.forEach((fvg) => {
        const isFvgHovered = hoveredInsight && hoveredInsight.category === "Fair Value Gap" &&
          (hoveredInsight.text.includes(fvg.low.toFixed(1)) || hoveredInsight.text.includes(fvg.high.toFixed(1)));

        let color = fvg.type === "bullish" 
          ? "rgba(234, 179, 8, 0.4)" 
          : "rgba(168, 85, 247, 0.4)";

        if (isFvgHovered) {
          color = fvg.type === "bullish" ? "rgba(234, 179, 8, 1.0)" : "rgba(168, 85, 247, 1.0)";
        }

        const topSeries = chart?.addSeries(LineSeries, {
          color,
          lineWidth: isFvgHovered ? 3 : 1,
          lineStyle: isFvgHovered ? LineStyle.Solid : LineStyle.Dashed,
        });

        const bottomSeries = chart?.addSeries(LineSeries, {
          color,
          lineWidth: isFvgHovered ? 3 : 1,
          lineStyle: isFvgHovered ? LineStyle.Solid : LineStyle.Dashed,
        });

        if (topSeries && bottomSeries) {
          const startIndex = Math.max(0, fvg.index - 1);
          const endIdx = formattedBars.length - 1;
          const lineDataTop: any[] = [];
          const lineDataBottom: any[] = [];

          for (let j = startIndex; j <= endIdx; j++) {
            lineDataTop.push({ time: toChartTime(formattedBars[j].date), value: fvg.high });
            lineDataBottom.push({ time: toChartTime(formattedBars[j].date), value: fvg.low });
          }

          topSeries.setData(lineDataTop);
          bottomSeries.setData(lineDataBottom);

          activeSeriesListRef.current.push(topSeries, bottomSeries);
        }
      });
    }



    // 9. Fit content ONLY on first render
    if (isFirstRender.current) {
      chart.timeScale().fitContent();
      isFirstRender.current = false;
    }

    // Setup resize observer
    const handleResize = () => {
      if (chartRef.current && container) {
        chartRef.current.applyOptions({ width: container.clientWidth });
      }
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [formattedBars, showEma, showStructure, showOBs, showFVGs, deals, smcResult, interval, hoveredInsight]);

  return (
    <div className="flex flex-col space-y-4">
      {/* Indicator control toggles strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Sliders className="h-4 w-4 text-indigo-400" />
          <span className="text-xs font-semibold uppercase tracking-wider font-sans">
            SMC & Overlays Controls
          </span>
        </div>

        {/* Toggle Switches */}
        <div className="flex flex-wrap gap-2">
          {/* EMA 20 */}
          <button
            onClick={() => setShowEma(!showEma)}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-bold tracking-wide transition cursor-pointer ${
              showEma
                ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                : "border-white/5 bg-white/5 text-slate-500 hover:text-slate-300"
            }`}
          >
            {showEma ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            EMA 20
          </button>

          {/* BOS & CHoCH */}
          <button
            onClick={() => setShowStructure(!showStructure)}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-bold tracking-wide transition cursor-pointer ${
              showStructure
                ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-300"
                : "border-white/5 bg-white/5 text-slate-500 hover:text-slate-300"
            }`}
          >
            {showStructure ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            BOS/CHoCH
          </button>

          {/* Order Blocks */}
          <button
            onClick={() => setShowOBs(!showOBs)}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-bold tracking-wide transition cursor-pointer ${
              showOBs
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-white/5 bg-white/5 text-slate-500 hover:text-slate-300"
            }`}
          >
            {showOBs ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            Order Blocks (OB)
          </button>

          {/* FVGs */}
          <button
            onClick={() => setShowFVGs(!showFVGs)}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-bold tracking-wide transition cursor-pointer ${
              showFVGs
                ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                : "border-white/5 bg-white/5 text-slate-500 hover:text-slate-300"
            }`}
          >
            {showFVGs ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            FVG Imbalances
          </button>
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="relative w-full rounded-xl border border-white/5 bg-slate-950/40 p-1.5">
        {formattedBars.length === 0 ? (
          <div className="flex h-[380px] items-center justify-center">
            <div className="text-center">
              <p className="text-xs text-slate-500">Retrieving security history bars...</p>
            </div>
          </div>
        ) : (
          <div ref={containerRef} className="w-full" style={{ height: "380px" }} />
        )}
      </div>

      {/* Mini Legend Description */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] text-slate-500 font-mono">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-3 bg-[#10b981]" />
            Bullish Candle
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-3 bg-[#f43f5e]" />
            Bearish Candle
          </span>
          {showEma && (
            <span className="flex items-center gap-1.5 text-cyan-400/80">
              <span className="h-[1px] w-4 bg-[#06b6d4]" />
              EMA(20)
            </span>
          )}
          {showOBs && (
            <span className="flex items-center gap-1.5">
              <span className="h-[1px] w-4 border-t border-dashed border-emerald-400" />
              Order Blocks
            </span>
          )}
          {showFVGs && (
            <span className="flex items-center gap-1.5">
              <span className="h-[1px] w-4 border-t border-dashed border-amber-400" />
              Fair Value Gap
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <HelpCircle className="h-3 w-3 text-slate-600" />
          <span>Use mouse scroll wheel to zoom, drag to scroll.</span>
        </div>
      </div>
    </div>
  );
}
