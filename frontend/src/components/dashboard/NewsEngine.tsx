"use client";

import { ArrowUpRight, ExternalLink, ShieldAlert, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { GlassCard } from "@/components/ui/GlassCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StockLink } from "@/components/ui/StockLink";
import { fetchLiveNews } from "@/lib/api";
import { type NewsItem } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const TAG_STYLES: Record<NewsItem["tag"], string> = {
  "SUPER POSITIVE": "border-emerald-400/30 bg-emerald-500/15 text-emerald-300",
  POSITIVE: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  NEUTRAL: "border-slate-500/20 bg-slate-500/10 text-slate-400",
  BAD: "border-rose-500/20 bg-rose-500/10 text-rose-400",
  "CRITICAL BAD": "border-rose-400/30 bg-rose-500/15 text-rose-300",
};

function NewsRow({ item, variant }: { item: NewsItem; variant: "catalyst" | "risk" }) {
  return (
    <article
      className={cn(
        "group rounded-xl border p-3 transition-all duration-200",
        variant === "catalyst"
          ? "border-emerald-500/10 bg-emerald-500/[0.03] hover:border-emerald-500/25 hover:bg-emerald-500/[0.06]"
          : "border-rose-500/10 bg-rose-500/[0.03] hover:border-rose-500/25 hover:bg-rose-500/[0.06]",
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <StockLink
          symbol={item.symbol}
          variant={variant === "catalyst" ? "catalyst" : "risk"}
        />
        <span
          className={cn(
            "shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold tracking-wide",
            TAG_STYLES[item.tag],
          )}
        >
          {item.tag}
        </span>
      </div>

      <Link
        href={item.symbol === "MARKET" ? "#" : `/stock/${item.symbol}`}
        className={cn(
          "block text-xs leading-relaxed text-slate-300 transition hover:text-white",
          item.symbol === "MARKET" ? "pointer-events-none" : ""
        )}
      >
        {item.headline}
      </Link>

      <div className="mt-2 flex items-center justify-between text-[10px]">
        <a
          href={item.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-slate-400 transition hover:text-indigo-400"
        >
          {item.source}
          <ExternalLink className="h-2.5 w-2.5" />
        </a>
        <span className="text-slate-500">{item.time}</span>
      </div>
    </article>
  );
}

function NewsColumn({
  title,
  icon: Icon,
  items,
  variant,
  borderAccent,
  loading,
}: {
  title: string;
  icon: React.ElementType;
  items: NewsItem[];
  variant: "catalyst" | "risk";
  borderAccent: string;
  loading: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col rounded-xl border p-3",
        borderAccent,
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <Icon
          className={cn(
            "h-3.5 w-3.5",
            variant === "catalyst" ? "text-emerald-400" : "text-rose-500",
          )}
        />
        <h3 className="text-xs font-semibold tracking-wide text-white uppercase">
          {title}
        </h3>
        <span
          className={cn(
            "ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold",
            variant === "catalyst"
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-rose-500/10 text-rose-400",
          )}
        >
          {items.length}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
        {loading ? (
          <p className="text-xs text-slate-500 text-center py-8">Fetching stories...</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8">No stories found</p>
        ) : (
          items.map((item) => (
            <NewsRow key={item.id} item={item} variant={variant} />
          ))
        )}
      </div>
    </div>
  );
}

export function NewsEngine() {
  const [news, setNews] = useState<{ catalysts: NewsItem[]; risks: NewsItem[] }>({
    catalysts: [],
    risks: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLiveNews().then((data) => {
      setNews(data);
      setLoading(false);
    });

    // Poll every 60s
    const timer = setInterval(() => {
      fetchLiveNews().then(setNews);
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  return (
    <GlassCard className="flex h-full flex-col p-4" glow="indigo">
      <SectionHeader
        badge="Sentiment"
        title="News Feed"
        subtitle="Catalyst vs. risk — split-screen intelligence"
        badgeClassName="text-indigo-400"
        action={
          <Link
            href="/#news"
            className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] font-medium text-slate-400 transition hover:border-white/20 hover:text-white"
          >
            View All
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        }
      />

      <div className="flex min-h-[520px] flex-1 flex-col gap-3 lg:flex-row">
        <NewsColumn
          title="Catalyst Feed"
          icon={Sparkles}
          items={news.catalysts}
          variant="catalyst"
          borderAccent="border-emerald-500/20 bg-emerald-500/[0.02]"
          loading={loading}
        />
        <NewsColumn
          title="Risk Feed"
          icon={ShieldAlert}
          items={news.risks}
          variant="risk"
          borderAccent="border-rose-500/20 bg-rose-500/[0.02]"
          loading={loading}
        />
      </div>
    </GlassCard>
  );
}
