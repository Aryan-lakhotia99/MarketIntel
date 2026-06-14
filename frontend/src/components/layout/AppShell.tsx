"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { GlassNav } from "./GlassNav";
import { MarketMarquee } from "./MarketMarquee";
import { DashboardProvider } from "@/context/DashboardContext";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, loading } = useAuth();

  const isAuthPage = ["/login", "/signup", "/forgot-password"].includes(pathname || "");

  if (loading) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-[#06080c]">
        <div className="cinematic-bg" aria-hidden="true" />
        <div className="flex flex-col items-center gap-4 z-10 bg-slate-950/40 p-8 rounded-2xl border border-slate-800/40 backdrop-blur-xl">
          <div className="w-10 h-10 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
          <p className="text-xs font-semibold text-indigo-400/90 tracking-widest uppercase animate-pulse">
            Authorizing Session...
          </p>
        </div>
      </div>
    );
  }

  // Render a secondary redirecting shield if unauthenticated user hits a protected route
  if (!isAuthenticated && !isAuthPage) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-[#06080c]">
        <div className="cinematic-bg" aria-hidden="true" />
        <div className="flex flex-col items-center gap-4 z-10 bg-slate-950/40 p-8 rounded-2xl border border-slate-800/40 backdrop-blur-xl">
          <div className="w-10 h-10 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
          <p className="text-xs font-semibold text-indigo-400/90 tracking-widest uppercase animate-pulse">
            Routing to Login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <DashboardProvider>
      <div className="cinematic-bg" aria-hidden="true" />
      {!isAuthPage && <GlassNav />}
      {!isAuthPage && <MarketMarquee />}
      <div className={`relative min-h-screen ${isAuthPage ? "" : "pt-[var(--header-total)]"}`}>
        {children}
      </div>
    </DashboardProvider>
  );
}
