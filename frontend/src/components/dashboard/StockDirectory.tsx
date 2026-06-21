"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { type StockDirectoryEntry } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ArrowUpRight, Search, SlidersHorizontal } from "lucide-react";
import { StockLink } from "@/components/ui/StockLink";

type StockDirectoryProps = {
  stocks: StockDirectoryEntry[];
  loading: boolean;
};

type SortField = "symbol" | "price" | "changePercent" | "imiScore" | "pcr" | "deliveryPercent";
type SortOrder = "asc" | "desc";

export default function StockDirectory({
  stocks,
  loading,
}: StockDirectoryProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("imiScore");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [activeFoFilter, setActiveFoFilter] = useState<string>("ALL");

  // Format delivery/volume
  const getFoBadge = (cond: string) => {
    switch (cond) {
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

  // IMI color mapping
  const getImiStyle = (score: number) => {
    if (score >= 70) return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.25)]";
    if (score >= 45) return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    return "bg-rose-500/15 text-rose-400 border-rose-500/30";
  };

  // Change sort field
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc"); // default desc on new field
    }
  };

  // Process search + filters + sorting
  const processedStocks = useMemo(() => {
    let list = [...stocks];

    // Search query filter
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      list = list.filter(
        (s) => s.symbol.toLowerCase().includes(query) || s.name.toLowerCase().includes(query)
      );
    }

    // F&O condition filter
    if (activeFoFilter !== "ALL") {
      list = list.filter((s) => s.foCondition === activeFoFilter);
    }

    // Sorting
    list.sort((a, b) => {
      let valA = a[sortField] ?? 0;
      let valB = b[sortField] ?? 0;

      // Handle strings
      if (typeof valA === "string") {
        valA = valA.toUpperCase();
        valB = (valB as string).toUpperCase();
        return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      // Handle numbers
      return sortOrder === "asc" ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });

    return list;
  }, [stocks, searchQuery, activeFoFilter, sortField, sortOrder]);

  return (
    <div className="flex flex-col space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-3">
        {/* Search Input */}
        <div className="relative flex max-w-xs flex-1 items-center">
          <Search className="absolute left-3 h-3.5 w-3.5 text-slate-500" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search stocks by name or symbol..."
            className="w-full rounded-xl border border-white/10 bg-slate-900/50 py-2 pl-9 pr-4 text-xs text-white outline-none placeholder:text-slate-500 focus:border-indigo-500/50 transition"
          />
        </div>

        {/* F&O Condition Quick Filters */}
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
          <span className="text-slate-500 flex items-center gap-1 mr-1.5 uppercase tracking-wide font-semibold font-sans">
            <SlidersHorizontal className="h-3.5 w-3.5 text-indigo-400" /> F&O Phase:
          </span>
          {["ALL", "LONG BUILDUP", "SHORT COVERING", "SHORT BUILDUP", "LONG UNWINDING"].map((cond) => (
            <button
              key={cond}
              onClick={() => setActiveFoFilter(cond)}
              className={cn(
                "rounded-lg border px-2.5 py-1 font-bold cursor-pointer transition",
                activeFoFilter === cond
                  ? "border-indigo-500/30 bg-indigo-500/15 text-indigo-300"
                  : "border-white/5 bg-white/5 text-slate-500 hover:text-slate-300"
              )}
            >
              {cond.replace(" ", "\u00A0")}
            </button>
          ))}
        </div>
      </div>

      {/* Directory Content Table */}
      <div className="rounded-xl border border-white/5 bg-slate-950/20 overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02] text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                <th className="p-3.5 cursor-pointer hover:bg-white/[0.02] transition" onClick={() => handleSort("symbol")}>
                  Stock {sortField === "symbol" && (sortOrder === "asc" ? "▲" : "▼")}
                </th>
                <th className="p-3.5">Sector</th>
                <th className="p-3.5 cursor-pointer hover:bg-white/[0.02] transition text-right" onClick={() => handleSort("price")}>
                  Price {sortField === "price" && (sortOrder === "asc" ? "▲" : "▼")}
                </th>
                <th className="p-3.5 cursor-pointer hover:bg-white/[0.02] transition text-right" onClick={() => handleSort("changePercent")}>
                  Change % {sortField === "changePercent" && (sortOrder === "asc" ? "▲" : "▼")}
                </th>
                <th className="p-3.5 cursor-pointer hover:bg-white/[0.02] transition text-right" onClick={() => handleSort("pcr")}>
                  PCR {sortField === "pcr" && (sortOrder === "asc" ? "▲" : "▼")}
                </th>
                <th className="p-3.5">Derivatives Build-Up</th>
                <th className="p-3.5 cursor-pointer hover:bg-white/[0.02] transition text-right" onClick={() => handleSort("deliveryPercent")}>
                  Dly % {sortField === "deliveryPercent" && (sortOrder === "asc" ? "▲" : "▼")}
                </th>
                <th className="p-3.5 cursor-pointer hover:bg-white/[0.02] transition text-right" onClick={() => handleSort("imiScore")}>
                  IMI Score {sortField === "imiScore" && (sortOrder === "asc" ? "▲" : "▼")}
                </th>
                <th className="p-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-500 font-sans text-xs">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                      <span>Fetching directory pricing feed...</span>
                    </div>
                  </td>
                </tr>
              ) : processedStocks.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-500 font-sans">
                    No directory records found matching active filters.
                  </td>
                </tr>
              ) : (
                processedStocks.map((stock) => {
                  const positive = (stock.changePercent ?? 0) >= 0;
                  return (
                    <tr
                      key={stock.symbol}
                      className="group hover:bg-white/[0.02] transition duration-200 cursor-pointer"
                      onClick={() => router.push(`/stock/${stock.symbol}`)}
                    >
                      {/* Name/Symbol */}
                      <td className="p-3.5 font-sans">
                        <div className="min-w-0 flex items-center gap-2">
                          <StockLink symbol={stock.symbol} />
                          <span className="text-[10px] text-slate-500 truncate max-w-[120px]">
                            {stock.name}
                          </span>
                        </div>
                      </td>
                      
                      {/* Sector */}
                      <td className="p-3.5 font-sans">
                        <span className="rounded bg-white/5 px-2 py-0.5 text-[9px] font-bold text-slate-400">
                          {stock.sector}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="p-3.5 text-right font-bold text-white">
                        {stock.currency === "USD" ? "$" : "₹"}
                        {stock.price ? stock.price.toLocaleString(stock.currency === "USD" ? "en-US" : "en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 2 }) : "—"}
                      </td>

                      {/* Change % */}
                      <td className={cn(
                        "p-3.5 text-right font-extrabold",
                        positive ? "text-emerald-400" : "text-rose-500"
                      )}>
                        {positive ? "+" : ""}{(stock.changePercent ?? 0).toFixed(2)}%
                      </td>

                      {/* PCR */}
                      <td className="p-3.5 text-right text-slate-300 font-semibold">
                        {typeof stock.pcr === "number" ? stock.pcr.toFixed(2) : "—"}
                      </td>

                      {/* Build-up */}
                      <td className="p-3.5 font-sans">
                        <span className={cn("inline-flex rounded border px-2 py-0.5 text-[9px] font-bold tracking-wide", getFoBadge(stock.foCondition))}>
                          {stock.foCondition}
                        </span>
                      </td>

                      {/* Delivery % */}
                      <td className="p-3.5 text-right font-semibold text-slate-400">
                        {stock.deliveryPercent ? `${stock.deliveryPercent}%` : "—"}
                      </td>

                      {/* IMI Score Badge */}
                      <td className="p-3.5 text-right">
                        <span className={cn("inline-flex rounded-md border px-2 py-0.5 text-xs font-black font-sans tracking-tight", getImiStyle(stock.imiScore))}>
                          {stock.imiScore}/100
                        </span>
                      </td>

                      {/* Action Icon */}
                      <td className="p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-center">
                          <Link
                            href={`/stock/${stock.symbol}`}
                            className="flex h-6 w-6 items-center justify-center rounded-lg border border-white/5 bg-white/5 text-slate-500 transition group-hover:border-white/10 group-hover:bg-indigo-500/10 group-hover:text-indigo-400 cursor-pointer"
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
    </div>
  );
}
