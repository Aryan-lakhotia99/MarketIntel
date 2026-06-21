"use client";

import { GlassNav } from "./GlassNav";
import { MarketMarquee } from "./MarketMarquee";
import { DashboardProvider } from "@/context/DashboardContext";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <div className="cinematic-bg" aria-hidden="true" />
      <GlassNav />
      <MarketMarquee />
      <div className="relative min-h-screen pt-[var(--header-total)]">
        {children}
      </div>
    </DashboardProvider>
  );
}
