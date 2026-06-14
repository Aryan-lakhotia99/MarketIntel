"use client";

import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { fetchNSEList } from "@/lib/api";
import { SEARCH_SYMBOLS, type SearchSymbol } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type SymbolSearchDialogProps = {
  open: boolean;
  onClose: () => void;
};

const POPULAR_US_STOCKS = [
  { symbol: "AAPL", source: "Apple Inc." },
  { symbol: "MSFT", source: "Microsoft Corporation" },
  { symbol: "TSLA", source: "Tesla, Inc." },
  { symbol: "NVDA", source: "NVIDIA Corporation" },
  { symbol: "AMZN", source: "Amazon.com, Inc." },
  { symbol: "GOOGL", source: "Alphabet Inc." },
  { symbol: "META", source: "Meta Platforms, Inc." },
  { symbol: "NFLX", source: "Netflix, Inc." },
  { symbol: "AMD", source: "Advanced Micro Devices, Inc." },
  { symbol: "BABA", source: "Alibaba Group Holding Limited" },
  { symbol: "COIN", source: "Coinbase Global, Inc." },
];

function normalizeSymbol(symbol: string): string {
  return symbol.toUpperCase().replace(/\.(NS|BO)$/, "");
}

function filterSymbols(query: string, pool: SearchSymbol[]): SearchSymbol[] {
  const trimmed = query.trim().toUpperCase();
  if (!trimmed) return pool.slice(0, 8);

  return pool
    .filter(
      (item) =>
        item.symbol.includes(trimmed) || item.source.toUpperCase().includes(trimmed),
    )
    .slice(0, 8);
}

export function SymbolSearchDialog({ open, onClose }: SymbolSearchDialogProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [nseSymbols, setNseSymbols] = useState<SearchSymbol[]>([]);

  // Load NSE list on mount
  useEffect(() => {
    fetchNSEList()
      .then((list) => {
        const rawPool = list && list.length > 0
          ? list.map((c) => ({ symbol: c.symbol, source: c.name }))
          : SEARCH_SYMBOLS;
          
        // Deduplicate pool
        const uniquePool: SearchSymbol[] = [];
        const seen = new Set<string>();
        for (const item of [...POPULAR_US_STOCKS, ...rawPool]) {
          const sym = item.symbol.toUpperCase();
          if (!seen.has(sym)) {
            seen.add(sym);
            uniquePool.push(item);
          }
        }
        setNseSymbols(uniquePool);
      })
      .catch(() => {
        // Fallback with deduplicated static symbols
        const uniquePool: SearchSymbol[] = [];
        const seen = new Set<string>();
        for (const item of [...POPULAR_US_STOCKS, ...SEARCH_SYMBOLS]) {
          const sym = item.symbol.toUpperCase();
          if (!seen.has(sym)) {
            seen.add(sym);
            uniquePool.push(item);
          }
        }
        setNseSymbols(uniquePool);
      });
  }, []);

  const results = useMemo(() => {
    const pool = nseSymbols.length > 0 ? nseSymbols : SEARCH_SYMBOLS;
    const filtered = filterSymbols(query, pool);
    const trimmed = query.trim().toUpperCase();

    if (trimmed && !filtered.some((item) => item.symbol === trimmed)) {
      return [...filtered, { symbol: trimmed, source: `Open "${trimmed}" custom symbol...` }];
    }
    return filtered;
  }, [query, nseSymbols]);

  const handleClose = useCallback(() => {
    setQuery("");
    setActiveIndex(0);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((index) => Math.min(index + 1, results.length - 1));
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((index) => Math.max(index - 1, 0));
        return;
      }

      if (event.key === "Enter" && results[activeIndex]) {
        event.preventDefault();
        router.push(`/stock/${normalizeSymbol(results[activeIndex].symbol)}`);
        handleClose();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, results, activeIndex, router, handleClose]);

  if (!open) return null;

  const selectSymbol = (symbol: string) => {
    router.push(`/stock/${normalizeSymbol(symbol)}`);
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[calc(var(--header-total)+1.5rem)] sm:pt-[calc(var(--header-total)+3rem)]">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        aria-label="Close search"
        onClick={handleClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search symbols"
        className="glass-strong relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            placeholder="Search symbols..."
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={handleClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <ul className="max-h-72 overflow-y-auto py-2">
          {results.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-slate-500">
              No symbols found
            </li>
          ) : (
            results.map((item, index) => (
              <li key={item.symbol}>
                <button
                  type="button"
                  onClick={() => selectSymbol(item.symbol)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={cn(
                    "flex w-full items-center justify-between gap-4 px-4 py-2.5 text-left transition",
                    index === activeIndex
                      ? "bg-indigo-500/15 text-white"
                      : "text-slate-300 hover:bg-white/5",
                  )}
                >
                  <span className="font-mono text-sm font-semibold">{item.symbol}</span>
                  <span className="text-xs text-slate-500">{item.source}</span>
                </button>
              </li>
            ))
          )}
        </ul>

        <div className="flex items-center justify-between border-t border-white/10 px-4 py-2 text-[10px] text-slate-500">
          <span>↑↓ navigate · ↵ open · esc close</span>
          <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono">
            ⌘K
          </kbd>
        </div>
      </div>
    </div>
  );
}
