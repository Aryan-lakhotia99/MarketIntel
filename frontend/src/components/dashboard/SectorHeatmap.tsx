"use client";

import { SectorHeatmapCard } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Activity, Flame, TrendingDown, TrendingUp } from "lucide-react";

type SectorHeatmapProps = {
  sectors: SectorHeatmapCard[];
  selectedSector: string | null;
  onSelectSector: (sectorName: string | null) => void;
  loading: boolean;
};

export default function SectorHeatmap({
  sectors,
  selectedSector,
  onSelectSector,
  loading,
}: SectorHeatmapProps) {

  // Map volume spike percentage to grid span classes
  const getGridSpan = (volSpike: number) => {
    if (volSpike >= 180) return "col-span-2 row-span-2 md:h-[184px]";
    if (volSpike >= 130) return "col-span-2 row-span-1 md:h-[88px]";
    return "col-span-1 row-span-1 md:h-[88px]";
  };

  // Map price change percent to HSL background colors
  const getBoxStyle = (change: number) => {
    const absChange = Math.abs(change);
    // Scale opacity between 0.15 and 0.85
    const alpha = Math.min(0.85, Math.max(0.15, absChange / 2.0));
    
    if (change >= 0) {
      // Emerald Green HSL
      return {
        backgroundColor: `hsla(160, 84%, 39%, ${alpha})`,
        border: `1px solid hsla(160, 84%, 39%, ${alpha + 0.1})`,
        glow: `shadow-[0_0_15px_rgba(16,185,129,${alpha * 0.4})]`,
      };
    } else {
      // Rose Red HSL
      return {
        backgroundColor: `hsla(343, 90%, 60%, ${alpha})`,
        border: `1px solid hsla(343, 90%, 60%, ${alpha + 0.1})`,
        glow: `shadow-[0_0_15px_rgba(244,63,94,${alpha * 0.4})]`,
      };
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-sans">
            Sectoral Flow & Money Rotation Heatmap
          </h3>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">
            Color intensity = price change % · Box physical size = volume spike vs 20-day avg
          </p>
        </div>
        
        {selectedSector && (
          <button
            onClick={() => onSelectSector(null)}
            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold text-slate-300 transition hover:bg-white/10 hover:text-white cursor-pointer"
          >
            Clear Filter
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid h-48 items-center justify-center rounded-xl border border-white/5 bg-slate-950/20">
          <div className="flex flex-col items-center gap-2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            <p className="text-[10px] text-slate-500 font-mono">Loading sector intelligence...</p>
          </div>
        </div>
      ) : sectors.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-white/5 bg-slate-950/20">
          <p className="text-xs text-slate-500">No sectoral flow data recorded.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 md:grid-cols-6 auto-rows-[88px]">
          {sectors.map((sec) => {
            const change = sec.changePercent ?? 0;
            const positive = change >= 0;
            const volSpike = sec.volumeSpikePercent ?? 100;
            
            const boxStyle = getBoxStyle(change);
            const gridClass = getGridSpan(volSpike);
            const isSelected = selectedSector === sec.name;

            return (
              <button
                key={sec.name}
                type="button"
                onClick={() => onSelectSector(isSelected ? null : sec.name)}
                style={{
                  backgroundColor: boxStyle.backgroundColor,
                  border: boxStyle.border,
                }}
                className={cn(
                  gridClass,
                  "relative flex flex-col justify-between rounded-xl p-3 text-left transition-all duration-300 cursor-pointer overflow-hidden",
                  "hover:scale-[1.01] hover:brightness-[1.1] active:scale-[0.99]",
                  boxStyle.glow,
                  isSelected 
                    ? "ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-950 scale-[1.01]" 
                    : "opacity-85 hover:opacity-100"
                )}
              >
                {/* Sector Header Title */}
                <div className="flex items-start justify-between gap-2 z-10">
                  <span className="font-sans text-xs font-bold leading-tight text-white tracking-wide truncate pr-6">
                    {sec.name}
                  </span>
                  {volSpike >= 130 && (
                    <span className="flex shrink-0 items-center justify-center rounded bg-white/10 p-0.5" title="Volume breakout spike">
                      <Flame className={cn("h-3 w-3", volSpike >= 180 ? "text-amber-400 animate-pulse" : "text-slate-300")} />
                    </span>
                  )}
                </div>

                {/* Index price change readout */}
                <div className="flex flex-col z-10 font-mono">
                  <div className="flex items-center gap-1">
                    {positive ? (
                      <TrendingUp className="h-3 w-3 text-white/95 shrink-0" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-white/95 shrink-0" />
                    )}
                    <span className="text-sm font-extrabold text-white">
                      {positive ? "+" : ""}{change.toFixed(2)}%
                    </span>
                  </div>

                  {/* Volume readout (only visible on large blocks) */}
                  {volSpike >= 130 && (
                    <div className="mt-1.5 flex items-center gap-1 text-[9px] text-white/70 font-semibold uppercase tracking-wider font-sans">
                      <Activity className="h-2.5 w-2.5" />
                      <span>Vol: {volSpike.toFixed(0)}% Spike</span>
                    </div>
                  )}
                </div>

                {/* Subtle visual card watermark grid */}
                <div className="absolute -bottom-2 -right-2 opacity-5 pointer-events-none z-0">
                  <span className="text-[60px] font-black font-sans">{sec.name.slice(6, 8)}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
