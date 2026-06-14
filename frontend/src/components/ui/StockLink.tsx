import Link from "next/link";

import { cn } from "@/lib/utils";
import { useDashboard } from "@/context/DashboardContext";

type StockLinkProps = {
  symbol: string;
  className?: string;
  children?: React.ReactNode;
  variant?: "default" | "catalyst" | "risk" | "whale" | "delivery";
  title?: string;
};

const VARIANT_STYLES = {
  default:
    "border-white/10 bg-white/5 text-white hover:border-white/20 hover:bg-white/10",
  catalyst:
    "border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:border-emerald-500/40 hover:bg-emerald-500/20",
  risk: "border-rose-500/20 bg-rose-500/10 text-rose-400 hover:border-rose-500/40 hover:bg-rose-500/20",
  whale:
    "border-white/10 bg-white/5 text-white hover:border-indigo-400/30 hover:bg-indigo-500/10 hover:text-indigo-200",
  delivery:
    "border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:border-emerald-500/40 hover:bg-emerald-500/20",
};

export function StockLink({
  symbol,
  className,
  children,
  variant = "default",
  title,
}: StockLinkProps) {
  const { hoveredSymbol, setHoveredSymbol, setSelectedSymbol, setIsDrawerOpen } = useDashboard();
  const normalized = symbol.toUpperCase().replace(/\.(NS|BO)$/, "");
  
  // Exclude general "MARKET" tags
  const isMarketTag = normalized === "MARKET";
  const isHovered = !isMarketTag && hoveredSymbol === normalized;

  // Apply a vibrant purple/blue glow and subtle scale to highlight occurrences
  const glowStyle = isHovered
    ? "bg-indigo-500/35 border-indigo-400 text-white scale-[1.04] shadow-[0_0_15px_rgba(99,102,241,0.4)]"
    : "";

  return (
    <Link
      href={`/stock/${normalized}`}
      title={title}
      onMouseEnter={() => !isMarketTag && setHoveredSymbol(normalized)}
      onMouseLeave={() => !isMarketTag && setHoveredSymbol(null)}
      onClick={(e) => {
        if (!isMarketTag) {
          e.preventDefault();
          e.stopPropagation();
          setSelectedSymbol(normalized);
          setIsDrawerOpen(true);
        }
      }}
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[11px] font-bold transition-all duration-200 cursor-pointer",
        VARIANT_STYLES[variant],
        glowStyle,
        className,
      )}
    >
      {children ?? normalized}
    </Link>
  );
}

export function googleFinanceUrl(symbol: string): string {
  const normalized = symbol.toUpperCase().replace(/\.(NS|BO)$/, "");
  return `https://www.google.com/finance/quote/${normalized}:NSE`;
}
