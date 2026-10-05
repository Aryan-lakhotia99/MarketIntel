import type { FiiDiiSnapshot, IndexTicker, NewsItem, WhaleDeal, DeliveryBreakout } from "@/lib/mock-data";
import {
  MOCK_FII_DII,
  INDIAN_INDICES,
  GLOBAL_INDICES,
  CATALYST_NEWS,
  RISK_NEWS,
  WHALE_DEALS,
  DELIVERY_BREAKOUTS,
} from "@/lib/mock-data";

// ✅ FIXED: Use API_BASE exactly as provided in environment variable
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

console.log("✅ API Base URL:", API_BASE);

// Helper to map yfinance IndexQuote to IndexTicker format
function mapIndexQuote(q: any, region: "india" | "global"): any {
  return {
    key: q.key,
    name: q.name,
    symbol: q.symbol ?? (
      q.key === "nifty50" ? "^NSEI" :
      q.key === "sensex" ? "^BSESN" :
      q.key === "nifty_bank" ? "^NSEBANK" :
      q.key === "nifty_midcap" ? "^NSEMDCP50" : q.key
    ),
    price: q.price ?? 0,
    changePercent: q.changePercent ?? q.change_percent ?? 0,
    region,
    currency: q.currency ?? "INR",
    open: q.open ?? 0,
    dayHigh: q.dayHigh ?? q.day_high ?? 0,
    dayLow: q.dayLow ?? q.day_low ?? 0,
  };
}

export type LiveMarketSnapshot = {
  indianIndices: IndexTicker[];
  globalIndices: IndexTicker[];
  commodities: IndexTicker[];
  currencies: IndexTicker[];
};

export async function fetchMarketSnapshot(): Promise<LiveMarketSnapshot> {
  try {
    const response = await fetch(`${API_BASE}/indices`, { cache: "no-store" });
    if (!response.ok) throw new Error();
    const data = await response.json();
    return {
      indianIndices: (data.indianIndices ?? data.indian_indices ?? []).map((q: any) => mapIndexQuote(q, "india")),
      globalIndices: (data.globalIndices ?? data.global_indices ?? []).map((q: any) => mapIndexQuote(q, "global")),
      commodities: (data.commodities ?? []).map((q: any) => mapIndexQuote(q, "global")),
      currencies: (data.currencies ?? []).map((q: any) => mapIndexQuote(q, "global")),
    };
  } catch {
    const mockCommodities: IndexTicker[] = [
      { key: "gold", name: "Gold", price: 2320.4, changePercent: 0.45, region: "global", currency: "USD" },
      { key: "silver", name: "Silver", price: 29.8, changePercent: -0.2, region: "global", currency: "USD" },
      { key: "crude_oil", name: "Crude Oil", price: 78.3, changePercent: 1.15, region: "global", currency: "USD" },
      { key: "natural_gas", name: "Natural Gas", price: 2.92, changePercent: -2.3, region: "global", currency: "USD" },
      { key: "copper", name: "Copper", price: 4.52, changePercent: 0.12, region: "global", currency: "USD" },
    ];
    const mockCurrencies: IndexTicker[] = [
      { key: "usdinr", name: "USD / INR", price: 83.5, changePercent: 0.05, region: "global", currency: "INR" },
      { key: "usdeur", name: "USD / EUR", price: 0.92, changePercent: -0.12, region: "global", currency: "EUR" },
      { key: "usdgbp", name: "USD / GBP", price: 0.78, changePercent: 0.02, region: "global", currency: "GBP" },
      { key: "usdjpy", name: "USD / JPY", price: 156.8, changePercent: 0.25, region: "global", currency: "JPY" },
    ];
    return {
      indianIndices: INDIAN_INDICES,
      globalIndices: GLOBAL_INDICES,
      commodities: mockCommodities,
      currencies: mockCurrencies,
    };
  }
}

export async function fetchFiiDiiFlows(): Promise<FiiDiiSnapshot> {
  try {
    const response = await fetch(`${API_BASE}/flows/fii-dii`, { cache: "no-store" });
    if (!response.ok) throw new Error(`FII/DII fetch failed: ${response.status}`);
    return response.json();
  } catch {
    return MOCK_FII_DII;
  }
}

export async function fetchLiveNews(): Promise<{ catalysts: NewsItem[]; risks: NewsItem[] }> {
  try {
    const response = await fetch(`${API_BASE}/news`, { cache: "no-store" });
    if (!response.ok) throw new Error();
    const data = await response.json();
    return {
      catalysts: data.catalysts ?? [],
      risks: data.risks ?? [],
    };
  } catch {
    return {
      catalysts: CATALYST_NEWS,
      risks: RISK_NEWS,
    };
  }
}

export async function fetchWhaleTracker(): Promise<WhaleDeal[]> {
  try {
    const response = await fetch(`${API_BASE}/whale-tracker`, { cache: "no-store" });
    if (!response.ok) throw new Error();
    const data = await response.json();
    return (data.deals ?? []).map((deal: any, index: number) => {
      const qty = deal.quantity;
      const formattedQty = qty >= 10000000 ? `${(qty / 10000000).toFixed(1)}Cr` : qty >= 100000 ? `${(qty / 100000).toFixed(1)}L` : qty.toLocaleString();
      return {
        id: deal.id ?? `deal-${index}`,
        symbol: deal.symbol,
        clientName: deal.clientName ?? deal.client_name ?? "Unknown",
        side: deal.side,
        quantity: formattedQty,
        price: `₹${(deal.tradePrice ?? deal.trade_price ?? 0).toLocaleString("en-IN")}`,
        predictedParent: deal.prediction?.predictedParent ?? deal.prediction?.predicted_parent ?? null,
        confidence: deal.prediction?.confidence ?? 0,
        isShell: deal.prediction?.isShellEntity ?? deal.prediction?.is_shell_entity ?? false,
        tradeDate: deal.tradeDate ?? deal.trade_date ?? data.asOnDate ?? null,
      };
    });
  } catch {
    return WHALE_DEALS;
  }
}

export async function fetchDeliveryScan(): Promise<DeliveryBreakout[]> {
  try {
    const response = await fetch(`${API_BASE}/delivery/scan?minDeliveryPercent=60&minVolume=200000`, { cache: "no-store" });
    if (!response.ok) throw new Error();
    const data = await response.json();
    return (data.alerts ?? []).map((alert: any) => {
      const vol = alert.totalVolume ?? alert.total_volume ?? 0;
      const formattedVol = vol >= 10000000 ? `${(vol / 10000000).toFixed(1)}Cr` : vol >= 100000 ? `${(vol / 100000).toFixed(1)}L` : vol.toLocaleString();
      return {
        symbol: alert.symbol,
        deliveryPercent: alert.deliveryPercent ?? alert.delivery_percent ?? 0,
        volume: formattedVol,
        price: `₹${(alert.closePrice ?? alert.close_price ?? 0).toLocaleString("en-IN")}`,
        tradeDate: alert.tradeDate ?? alert.trade_date ?? data.tradeDate ?? data.trade_date ?? null,
      };
    });
  } catch {
    return DELIVERY_BREAKOUTS;
  }
}

export async function fetchStockQuote(symbol: string): Promise<any> {
  const response = await fetch(`${API_BASE}/stocks/${symbol}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Symbol ${symbol} not found`);
  return response.json();
}

export async function fetchStockHistory(symbol: string, period = "1mo", interval = "1d"): Promise<any> {
  const response = await fetch(`${API_BASE}/stocks/${symbol}/history?period=${period}&interval=${interval}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Symbol history failed`);
  return response.json();
}

export async function fetchStockMomentum(symbol: string): Promise<any> {
  const response = await fetch(`${API_BASE}/stocks/${symbol}/momentum`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Symbol momentum failed`);
  return response.json();
}

export async function fetchStockDeliveryHistory(symbol: string): Promise<any> {
  const response = await fetch(`${API_BASE}/delivery/${symbol}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Symbol delivery history failed`);
  return response.json();
}

export async function fetchStockAnnouncements(symbol: string): Promise<any> {
  const response = await fetch(`${API_BASE}/stocks/${symbol}/announcements`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Symbol announcements failed`);
  return response.json();
}

export async function fetchWatchlistQuotes(symbols: string[]): Promise<any[]> {
  if (symbols.length === 0) return [];
  try {
    const response = await fetch(`${API_BASE}/stocks?symbols=${symbols.join(",")}`, { cache: "no-store" });
    if (!response.ok) throw new Error();
    return response.json();
  } catch {
    return [];
  }
}

export type NSECompany = {
  symbol: string;
  name: string;
};

export async function fetchNSEList(): Promise<NSECompany[]> {
  try {
    const response = await fetch(`${API_BASE}/stocks/nse-list`, { next: { revalidate: 86400 } });
    if (!response.ok) throw new Error();
    return response.json();
  } catch {
    return [];
  }
}

export type SectorHeatmapCard = {
  name: string;
  symbol: string;
  price: number | null;
  changePercent: number | null;
  volume: number | null;
  avgVolume20d: number | null;
  volumeSpikePercent: number | null;
  sizeWeight: number | null;
  colorIntensity: number | null;
};

export type StockDirectoryEntry = {
  symbol: string;
  name: string;
  price: number | null;
  changePercent: number | null;
  volume: number | null;
  sector: string;
  deliveryPercent: number | null;
  imiScore: number;
  foCondition: string;
  pcr: number | null;
  currency?: string;
};

export type DerivativesSnapshot = {
  symbol: string;
  priceChangePercent: number;
  oiChangePercent: number;
  condition: string;
  putOi: number;
  callOi: number;
  pcr: number;
};

export async function fetchSectorHeatmap(): Promise<SectorHeatmapCard[]> {
  const response = await fetch(`${API_BASE}/analytics/heatmap`, { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to fetch sector heatmap");
  return response.json();
}

export async function fetchStockDirectory(sector?: string): Promise<StockDirectoryEntry[]> {
  const url = sector 
    ? `${API_BASE}/analytics/directory?sector=${encodeURIComponent(sector)}`
    : `${API_BASE}/analytics/directory`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to fetch stock directory");
  return response.json();
}

export async function fetchDerivativesDetail(symbol: string): Promise<DerivativesSnapshot> {
  const response = await fetch(`${API_BASE}/analytics/derivatives/${symbol}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to fetch derivatives detail");
  return response.json();
}

export type BreakoutEvent = {
  time: string;
  symbol: string;
  ltp: number | null;
  changePercent: number | null;
  volume: number | null;
  multiplierStatus: string;
  type: "52w_high" | "52w_low" | "volume_breakout";
  currency?: string;
};

export async function fetchBreakoutEvents(): Promise<BreakoutEvent[]> {
  try {
    const response = await fetch(`${API_BASE}/analytics/breakouts`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to fetch breakout events");
    return response.json();
  } catch (error: any) {
    console.warn("fetchBreakoutEvents failed:", error?.message || error);
    return [];
  }
}
