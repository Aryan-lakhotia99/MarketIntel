"use client";

import { ArrowDownRight, ArrowUpRight, Building2, Globe } from "lucide-react";
import { useEffect, useState } from "react";

import type { FiiDiiFlow, FiiDiiSnapshot } from "@/lib/mock-data";
import { MOCK_FII_DII } from "@/lib/mock-data";
import { fetchFiiDiiFlows } from "@/lib/api";
import { cn, formatChange } from "@/lib/utils";

function FlowCard({ flow, icon: Icon, accent }: {
  flow: FiiDiiFlow;
  icon: React.ElementType;
  accent: "indigo" | "emerald";
}) {
  const isNetPositive = flow.netValueCr >= 0;
  const change = flow.changePercent;

  return (
    <div
      className={cn(
        "rounded-xl border p-3 transition-all duration-300 min-w-0",
        accent === "indigo"
          ? "border-indigo-500/20 bg-indigo-500/[0.04] hover:border-indigo-500/35"
          : "border-emerald-500/20 bg-emerald-500/[0.04] hover:border-emerald-500/35",
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border",
              accent === "indigo"
                ? "border-indigo-500/20 bg-indigo-500/10"
                : "border-emerald-500/20 bg-emerald-500/10",
            )}
          >
            <Icon
              className={cn(
                "h-3.5 w-3.5",
                accent === "indigo" ? "text-indigo-400" : "text-emerald-400",
              )}
            />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">{flow.category}</p>
            <p className="text-[9px] text-slate-400 truncate">Cash net flow</p>
          </div>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-md px-1.5 py-0.5 text-[8px] font-bold tracking-wide uppercase",
            flow.trend === "INCREASED"
              ? "bg-emerald-500/10 text-emerald-400"
              : flow.trend === "DECREASED"
                ? "bg-rose-500/10 text-rose-500"
                : "bg-slate-500/10 text-slate-400",
          )}
        >
          {flow.trend === "INCREASED" ? "Net Buying" : flow.trend === "DECREASED" ? "Net Selling" : "Flat"}
        </span>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-x-2 gap-y-1.5 min-w-0">
        <div className="min-w-0">
          <p
            className={cn(
              "font-mono text-lg font-bold tracking-tight tabular-nums truncate",
              isNetPositive ? "text-emerald-400 text-glow-bullish" : "text-rose-500 text-glow-bearish",
            )}
          >
            {isNetPositive ? "+" : ""}
            {flow.netValueCr.toLocaleString("en-IN", { maximumFractionDigits: 1 })} Cr
          </p>
          <p className="mt-0.5 text-[9px] text-slate-400 truncate">
            Buy share {flow.buySharePercent.toFixed(1)}%
          </p>
        </div>

        {change !== null && (
          <div className="text-right shrink-0">
            <div
              className={cn(
                "flex items-center justify-end gap-0.5 font-mono text-xs font-semibold tabular-nums",
                change >= 0 ? "text-emerald-400" : "text-rose-500",
              )}
            >
              {change >= 0 ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {formatChange(change)}
            </div>
            <p className="text-[8px] tracking-wide text-slate-500 uppercase">vs prev session</p>
          </div>
        )}
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-white/5 pt-2.5 min-w-0">
        <div className="min-w-0">
          <p className="text-[8px] text-slate-500 uppercase">Buy</p>
          <p className="font-mono text-[10px] text-slate-300 tabular-nums truncate" title={`${flow.buyValueCr.toLocaleString("en-IN")} Cr`}>
            {flow.buyValueCr.toLocaleString("en-IN", { maximumFractionDigits: 0 })} Cr
          </p>
        </div>
        <div className="text-right min-w-0">
          <p className="text-[8px] text-slate-500 uppercase">Sell</p>
          <p className="font-mono text-[10px] text-slate-300 tabular-nums truncate" title={`${flow.sellValueCr.toLocaleString("en-IN")} Cr`}>
            {flow.sellValueCr.toLocaleString("en-IN", { maximumFractionDigits: 0 })} Cr
          </p>
        </div>
      </div>
    </div>
  );
}

export function FiiDiiPanel() {
  const [data, setData] = useState<FiiDiiSnapshot>(MOCK_FII_DII);

  useEffect(() => {
    fetchFiiDiiFlows().then(setData);
  }, []);

  return (
    <div className="mb-4" id="fii-dii">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
          Institutional Flows
        </p>
        <p className="text-[9px] text-slate-500 truncate">
          {data.tradeDate} · NSE Cash
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-1">
        <FlowCard flow={data.fii} icon={Globe} accent="indigo" />
        <FlowCard flow={data.dii} icon={Building2} accent="emerald" />
      </div>
    </div>
  );
}
