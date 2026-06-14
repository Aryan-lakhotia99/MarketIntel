"use client";

import React, { createContext, useContext, useState } from "react";

type DashboardContextType = {
  hoveredSymbol: string | null;
  setHoveredSymbol: (symbol: string | null) => void;
  selectedSymbol: string | null;
  setSelectedSymbol: (symbol: string | null) => void;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
};

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [hoveredSymbol, setHoveredSymbol] = useState<string | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleSetHoveredSymbol = (symbol: string | null) => {
    if (symbol) {
      setHoveredSymbol(symbol.toUpperCase().replace(/\.(NS|BO)$/, ""));
    } else {
      setHoveredSymbol(null);
    }
  };

  const handleSetSelectedSymbol = (symbol: string | null) => {
    if (symbol) {
      setSelectedSymbol(symbol.toUpperCase().replace(/\.(NS|BO)$/, ""));
    } else {
      setSelectedSymbol(null);
    }
  };

  return (
    <DashboardContext.Provider
      value={{
        hoveredSymbol,
        setHoveredSymbol: handleSetHoveredSymbol,
        selectedSymbol,
        setSelectedSymbol: handleSetSelectedSymbol,
        isDrawerOpen,
        setIsDrawerOpen,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
}
