"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { WorkspaceGrid } from "@/components/dashboard/WorkspaceGrid";
import { GlassCard } from "@/components/ui/GlassCard";
import SectorHeatmap from "@/components/dashboard/SectorHeatmap";
import StockDirectory from "@/components/dashboard/StockDirectory";
import BreakoutScanner from "@/components/dashboard/BreakoutScanner";
import { StockDetailDrawer } from "@/components/dashboard/StockDetailDrawer";
import {
  fetchFiiDiiFlows,
  fetchWhaleTracker,
  fetchSectorHeatmap,
  fetchStockDirectory,
  fetchLiveNews,
  type SectorHeatmapCard,
  type StockDirectoryEntry,
} from "@/lib/api";

type PillState = {
  value: string;
  variant: "bullish" | "bearish" | "neutral";
};

function getNSEMarketState(): PillState {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const istOffset = 5.5 * 3600000;
  const istTime = new Date(utc + istOffset);

  const day = istTime.getDay(); // 0 = Sunday, 6 = Saturday
  const hours = istTime.getHours();
  const minutes = istTime.getMinutes();
  const timeVal = hours * 100 + minutes;

  if (day === 0 || day === 6) {
    return { value: "Closed", variant: "neutral" };
  }
  if (timeVal >= 900 && timeVal < 915) {
    return { value: "Pre-Open", variant: "neutral" };
  }
  if (timeVal >= 915 && timeVal < 1530) {
    return { value: "Open", variant: "bullish" };
  }
  return { value: "Closed", variant: "bearish" };
}

function getBSEMarketState(): PillState {
  return getNSEMarketState();
}

export default function Home() {
  const [marketState, setMarketState] = useState<PillState>({ value: "Closed", variant: "neutral" });
  const [bseMarketState, setBseMarketState] = useState<PillState>({ value: "Closed", variant: "neutral" });
  const [fiiFlow, setFiiFlow] = useState<PillState>({ value: "Loading...", variant: "neutral" });
  const [diiFlow, setDiiFlow] = useState<PillState>({ value: "Loading...", variant: "neutral" });
  const [largeDeals, setLargeDeals] = useState<PillState>({ value: "Loading...", variant: "neutral" });

  // Heatmap and Stock Directory States
  const [heatmapData, setHeatmapData] = useState<SectorHeatmapCard[]>([]);
  const [stockDirectory, setStockDirectory] = useState<StockDirectoryEntry[]>([]);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [loadingHeatmap, setLoadingHeatmap] = useState(true);
  const [loadingDirectory, setLoadingDirectory] = useState(true);

  // Load Heatmap Data
  useEffect(() => {
    setLoadingHeatmap(true);
    fetchSectorHeatmap()
      .then((data) => {
        setHeatmapData(data);
        setLoadingHeatmap(false);
      })
      .catch(() => setLoadingHeatmap(false));

    const interval = setInterval(() => {
      fetchSectorHeatmap().then(setHeatmapData).catch(() => {});
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Load Stock Directory Data (triggers when selectedSector changes)
  useEffect(() => {
    setLoadingDirectory(true);
    fetchStockDirectory(selectedSector || undefined)
      .then((data) => {
        setStockDirectory(data);
        setLoadingDirectory(false);
      })
      .catch(() => setLoadingDirectory(false));

    const interval = setInterval(() => {
      fetchStockDirectory(selectedSector || undefined)
        .then(setStockDirectory)
        .catch(() => {});
    }, 30000);

    return () => clearInterval(interval);
  }, [selectedSector]);

  useEffect(() => {
    // Check market state immediately and poll every minute
    setMarketState(getNSEMarketState());
    setBseMarketState(getBSEMarketState());
    const timer = setInterval(() => {
      setMarketState(getNSEMarketState());
      setBseMarketState(getBSEMarketState());
    }, 60000);

    // Fetch Confluence flows, news and deals in parallel to determine system bias
    Promise.all([
      fetchFiiDiiFlows().catch(() => null),
      fetchWhaleTracker().catch(() => []),
      fetchLiveNews().catch(() => ({ catalysts: [], risks: [] })),
    ]).then(([fiiDiiData, dealsData]) => {
      const fiiNet = fiiDiiData?.fii?.netValueCr ?? 0;
      const diiNet = fiiDiiData?.dii?.netValueCr ?? 0;
      const dealsCount = dealsData.length;




      setFiiFlow({
        value: fiiNet >= 0 ? "Net Buyers" : "Net Sellers",
        variant: fiiNet >= 0 ? "bullish" : "bearish",
      });
      setDiiFlow({
        value: diiNet >= 0 ? "Net Buyers" : "Net Sellers",
        variant: diiNet >= 0 ? "bullish" : "bearish",
      });
      setLargeDeals({
        value: `${dealsCount} Today`,
        variant: dealsCount > 0 ? "bullish" : "neutral",
      });
    });

    return () => clearInterval(timer);
  }, []);

  return (
    <main className="mx-auto max-w-[1920px] animate-fade-in px-4 py-6 sm:px-6 lg:px-8">
      {/* Executive status strip */}
      <GlassCard className="mb-5 p-5 sm:p-6" glow="indigo" id="dashboard">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1.5 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <span className="text-[10px] font-semibold tracking-widest text-indigo-400 uppercase">
                Executive Terminal
              </span>
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Market Intelligence Dashboard
            </h1>
          </div>

          <div className="flex flex-row items-center gap-3">
            <StatPill href="/#dashboard" label="BSE" value={bseMarketState.value} variant={bseMarketState.variant} />
            <StatPill href="/#dashboard" label="NSE" value={marketState.value} variant={marketState.variant} />
            <StatPill href="/#fii-dii" label="FII Flow" value={fiiFlow.value} variant={fiiFlow.variant} />
            <StatPill href="/#fii-dii" label="DII Flow" value={diiFlow.value} variant={diiFlow.variant} />
            <StatPill href="/#large-deals" label="Large Deals" value={largeDeals.value} variant={largeDeals.variant} />

          </div>
        </div>
      </GlassCard>

      {/* 3-column workspace */}
      <WorkspaceGrid />

      {/* Live Breakout & milestone scanner */}
      <div className="mt-8" id="breakouts">
        <BreakoutScanner />
      </div>

      {/* F&O Sector Heatmap & Money Rotation Section */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12" id="sectors">
        <div className="lg:col-span-12 space-y-6">
          <GlassCard className="p-6" glow="indigo">
            <SectorHeatmap
              sectors={heatmapData}
              selectedSector={selectedSector}
              onSelectSector={setSelectedSector}
              loading={loadingHeatmap}
            />
          </GlassCard>

          <GlassCard className="p-6">
            <div className="mb-4">
              <h2 className="text-sm font-semibold tracking-wide text-white uppercase font-sans">
                Main Stock Directory
              </h2>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                Composite Institutional Momentum Index (IMI) Score rankings and F&O position profiles
              </p>
            </div>
            <StockDirectory
              stocks={stockDirectory}
              loading={loadingDirectory}
            />
          </GlassCard>
        </div>
      </div>

      <StockDetailDrawer />
    </main>
  );
}

function StatPill({
  href,
  label,
  value,
  variant,
}: {
  href: string;
  label: string;
  value: string;
  variant: "bullish" | "bearish" | "neutral";
}) {
  const styles = {
    bullish:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:border-emerald-500/40 hover:bg-emerald-500/15",
    bearish:
      "border-rose-500/20 bg-rose-500/10 text-rose-400 hover:border-rose-500/40 hover:bg-rose-500/15",
    neutral:
      "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10",
  };

  return (
    <Link
      href={href}
      className={`rounded-xl border px-3.5 py-2.5 text-center transition-all duration-200 active:scale-[0.98] ${styles[variant]}`}
    >
      <p className="text-[9px] tracking-wider text-slate-500 uppercase">{label}</p>
      <p className="mt-0.5 text-xs font-semibold">{value}</p>
    </Link>
  );
}
