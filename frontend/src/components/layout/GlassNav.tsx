"use client";

import {
  Activity,
  Bell,
  LayoutDashboard,
  Search,
  TrendingUp,
  Waves,
  Grid,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { SymbolSearchDialog } from "@/components/layout/SymbolSearchDialog";
import { fetchLiveNews } from "@/lib/api";
import { NAV_ITEMS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

const iconMap = {
  Dashboard: LayoutDashboard,
  "Large Deals": Waves,
  "News Engine": Activity,
  "Delivery Scan": TrendingUp,
  Heatmap: Grid,
  "Breakout Scanners": Zap,
} as const;

export function GlassNav() {
  const { user, logout } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeHash, setActiveHash] = useState("#dashboard");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  useEffect(() => {
    const handleHashChange = () => {
      setActiveHash(window.location.hash || "#dashboard");
    };
    window.addEventListener("hashchange", handleHashChange);
    handleHashChange(); // run once on mount

    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", onKeyDown);

    // Fetch and check watchlist alerts
    const saved = localStorage.getItem("watchlist");
    const watchlist = saved ? JSON.parse(saved) : ["RELIANCE", "TCS", "INFY"];
    
    fetchLiveNews().then((data) => {
      const allNews = [...(data.catalysts || []), ...(data.risks || [])];
      const watchlistAlerts = allNews.filter((item) =>
        watchlist.includes(item.symbol.toUpperCase()) &&
        (item.tag === "CRITICAL BAD" || item.tag === "BAD" || item.tag === "SUPER POSITIVE")
      );
      setAlerts(watchlistAlerts);
    }).catch(() => {});

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <header className="glass-nav fixed top-0 right-0 left-0 z-50 h-[var(--nav-height)]">
      <div className="mx-auto flex h-full max-w-[1920px] items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link
          href="/#dashboard"
          className="flex shrink-0 items-center gap-3 transition-opacity hover:opacity-90"
        >
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 shadow-[var(--glow-indigo)]">
            <TrendingUp className="h-[18px] w-[18px] text-indigo-400" strokeWidth={2} />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold tracking-tight text-white">
              Market<span className="text-indigo-400">Intel</span>
            </p>
            <p className="text-[10px] tracking-widest text-slate-500 uppercase">
              Intelligence Terminal
            </p>
          </div>
        </Link>

        {/* Nav links — desktop */}
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => {
            const Icon = iconMap[item.label as keyof typeof iconMap];
            const isActive = item.href.endsWith(activeHash);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "border border-white/10 bg-white/10 text-white shadow-[0_0_20px_rgba(99,102,241,0.15)]"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
                )}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Nav links — tablet/mobile scroll */}
        <nav className="flex items-center gap-1 overflow-x-auto lg:hidden">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href.endsWith(activeHash);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-medium whitespace-nowrap transition",
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-slate-500 hover:text-slate-300",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={openSearch}
            className="hidden items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-400 transition hover:border-white/20 hover:bg-white/10 hover:text-slate-200 active:scale-[0.98] sm:flex"
            aria-label="Search symbols"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="text-xs">Search symbols...</span>
            <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
              ⌘K
            </kbd>
          </button>

          <button
            type="button"
            onClick={openSearch}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 transition hover:border-white/20 hover:bg-white/10 hover:text-white active:scale-[0.98] sm:hidden"
            aria-label="Search symbols"
          >
            <Search className="h-4 w-4" />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className={cn(
                "relative flex h-9 w-9 items-center justify-center rounded-lg border transition active:scale-[0.98] cursor-pointer",
                notificationsOpen
                  ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-400"
                  : "border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:bg-white/10 hover:text-white"
              )}
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {alerts.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-[0_0_8px_rgba(244,63,94,0.5)]">
                  {alerts.length}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-white/10 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-md animate-fade-in">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold text-white">Watchlist Alerts</p>
                  <span className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-indigo-400">
                    {alerts.length} Alerts
                  </span>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                  {alerts.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-6">
                      No critical news for watchlist items.
                    </p>
                  ) : (
                    alerts.map((item) => {
                      const isBad = item.tag.includes("BAD");
                      return (
                        <Link
                          key={item.id}
                          href={`/stock/${item.symbol}`}
                          onClick={() => setNotificationsOpen(false)}
                          className="block rounded-lg border border-white/5 bg-white/[0.02] p-2.5 transition hover:border-white/10 hover:bg-white/[0.04]"
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="font-mono text-[10px] font-bold text-white">
                              {item.symbol}
                            </span>
                            <span
                              className={cn(
                                "rounded px-1.5 py-0.5 text-[8px] font-bold uppercase",
                                isBad
                                  ? "bg-rose-500/10 text-rose-400"
                                  : "bg-emerald-500/10 text-emerald-400"
                              )}
                            >
                              {item.tag}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-slate-300 line-clamp-2">
                            {item.headline}
                          </p>
                          <p className="mt-1 text-[9px] text-slate-500">{item.source} • {item.time}</p>
                        </Link>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>



          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileOpen(!profileOpen)}
              className="hidden h-9 w-9 items-center justify-center rounded-full border border-indigo-500/30 bg-indigo-500/10 text-xs font-semibold text-indigo-300 cursor-pointer sm:flex hover:bg-indigo-500/20 transition-colors"
            >
              {user?.email ? user.email.slice(0, 1).toUpperCase() : "U"}
            </button>
            {profileOpen && (
              <div className="absolute right-0 z-50 mt-2 w-48 rounded-xl border border-white/10 bg-[#0c0f16]/95 p-2.5 shadow-2xl backdrop-blur-md animate-fade-in">
                <div className="px-2 py-1.5 border-b border-white/5 mb-1.5">
                  <p className="text-[9px] text-slate-500 uppercase tracking-wider">Signed In As</p>
                  <p className="text-xs font-medium text-indigo-300 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    logout();
                  }}
                  className="w-full text-left rounded-lg px-2 py-1.5 text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <SymbolSearchDialog open={searchOpen} onClose={closeSearch} />
    </header>
  );
}
