export type IndexTicker = {
  key: string;
  name: string;
  symbol?: string;
  price: number;
  changePercent: number;
  region: "india" | "global";
  currency: string;
};

export const INDIAN_INDICES: IndexTicker[] = [
  { key: "nifty50", name: "NIFTY 50", symbol: "^NSEI", price: 23363.35, changePercent: 0.52, region: "india", currency: "INR" },
  { key: "sensex", name: "SENSEX", symbol: "^BSESN", price: 76842.8, changePercent: 0.48, region: "india", currency: "INR" },
  { key: "nifty_bank", name: "NIFTY BANK", symbol: "^NSEBANK", price: 52104.25, changePercent: -0.31, region: "india", currency: "INR" },
  { key: "nifty_midcap", name: "NIFTY MIDCAP", symbol: "^NSEMDCP50", price: 12847.6, changePercent: 0.74, region: "india", currency: "INR" },
];

export const GLOBAL_INDICES: IndexTicker[] = [
  { key: "sp500", name: "S&P 500", symbol: "^GSPC", price: 7386.65, changePercent: -0.26, region: "global", currency: "USD" },
  { key: "nasdaq", name: "NASDAQ", symbol: "^IXIC", price: 21842.33, changePercent: 0.18, region: "global", currency: "USD" },
  { key: "dow_jones", name: "DOW JONES", symbol: "^DJI", price: 42876.5, changePercent: -0.12, region: "global", currency: "USD" },
  { key: "gift_nifty", name: "GIFT NIFTY", symbol: "^NSEI", price: 23410.0, changePercent: 0.41, region: "global", currency: "INR" },
  { key: "ftse100", name: "FTSE 100", symbol: "^FTSE", price: 8214.2, changePercent: 0.09, region: "global", currency: "USD" },
  { key: "nikkei225", name: "NIKKEI 225", symbol: "^N225", price: 38472.5, changePercent: -0.55, region: "global", currency: "USD" },
];

export type NavItem = {
  label: string;
  href: string;
  active?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/#dashboard", active: true },
  { label: "Large Deals", href: "/#large-deals" },
  { label: "News Engine", href: "/#news" },
  { label: "Delivery Scan", href: "/#delivery" },
  { label: "Heatmap", href: "/#sectors" },
  { label: "Breakout Scanners", href: "/#breakouts" },
];

export type SparkPoint = { v: number };

export type MacroCard = {
  key: string;
  label: string;
  value: string;
  change: number;
  sparkline: SparkPoint[];
  region: "india" | "global";
};

export const MACRO_CARDS: MacroCard[] = [
  {
    key: "nifty50",
    label: "NIFTY 50",
    value: "23,363",
    change: 0.52,
    region: "india",
    sparkline: [{ v: 23100 }, { v: 23180 }, { v: 23140 }, { v: 23220 }, { v: 23280 }, { v: 23320 }, { v: 23363 }],
  },
  {
    key: "sensex",
    label: "SENSEX",
    value: "76,843",
    change: 0.48,
    region: "india",
    sparkline: [{ v: 76200 }, { v: 76400 }, { v: 76350 }, { v: 76600 }, { v: 76750 }, { v: 76800 }, { v: 76843 }],
  },
  {
    key: "sp500",
    label: "S&P 500",
    value: "7,387",
    change: -0.26,
    region: "global",
    sparkline: [{ v: 7420 }, { v: 7410 }, { v: 7400 }, { v: 7395 }, { v: 7390 }, { v: 7388 }, { v: 7387 }],
  },
  {
    key: "nasdaq",
    label: "NASDAQ",
    value: "21,842",
    change: 0.18,
    region: "global",
    sparkline: [{ v: 21780 }, { v: 21800 }, { v: 21790 }, { v: 21820 }, { v: 21830 }, { v: 21840 }, { v: 21842 }],
  },
  {
    key: "gift_nifty",
    label: "GIFT NIFTY",
    value: "23,410",
    change: 0.41,
    region: "global",
    sparkline: [{ v: 23300 }, { v: 23320 }, { v: 23350 }, { v: 23360 }, { v: 23380 }, { v: 23400 }, { v: 23410 }],
  },
  {
    key: "dax",
    label: "DAX",
    value: "18,942",
    change: -0.38,
    region: "global",
    sparkline: [{ v: 19020 }, { v: 19000 }, { v: 18980 }, { v: 18960 }, { v: 18950 }, { v: 18945 }, { v: 18942 }],
  },
];

export type NewsItem = {
  id: string;
  symbol: string;
  headline: string;
  source: string;
  sourceUrl: string;
  time: string;
  tag: "SUPER POSITIVE" | "POSITIVE" | "NEUTRAL" | "BAD" | "CRITICAL BAD";
};

export const CATALYST_NEWS: NewsItem[] = [
  {
    id: "c1",
    symbol: "RELIANCE",
    headline: "Promoter entity acquires 0.8% stake via open market — debt-free balance sheet reaffirmed",
    source: "Economic Times",
    sourceUrl: "https://economictimes.indiatimes.com/markets/stocks/news",
    time: "12m ago",
    tag: "SUPER POSITIVE",
  },
  {
    id: "c2",
    symbol: "LT",
    headline: "L&T wins ₹4,200 Cr metro rail order in Middle East — order book expands 11% YoY",
    source: "Moneycontrol",
    sourceUrl: "https://www.moneycontrol.com/news/business/stocks/",
    time: "28m ago",
    tag: "POSITIVE",
  },
  {
    id: "c3",
    symbol: "TITAN",
    headline: "Tanishq same-store sales grow 18% in Q1 — management guides double-digit growth",
    source: "BloombergQuint",
    sourceUrl: "https://www.bqprime.com/markets",
    time: "45m ago",
    tag: "POSITIVE",
  },
  {
    id: "c4",
    symbol: "HDFCBANK",
    headline: "Net interest margin expands 12bps QoQ — asset quality stable at 1.2% GNPA",
    source: "Exchange Filing",
    sourceUrl: "https://www.nseindia.com/companies-listing/corporate-filings-announcements",
    time: "1h ago",
    tag: "POSITIVE",
  },
  {
    id: "c5",
    symbol: "ADANIPORTS",
    headline: "Mundra port volume hits record high — capacity expansion on track for FY27",
    source: "Economic Times",
    sourceUrl: "https://economictimes.indiatimes.com/markets/stocks/news",
    time: "1h ago",
    tag: "POSITIVE",
  },
];

export const RISK_NEWS: NewsItem[] = [
  {
    id: "r1",
    symbol: "YESBANK",
    headline: "Forensic audit initiated on related-party transactions — regulator seeks clarification",
    source: "Economic Times",
    sourceUrl: "https://economictimes.indiatimes.com/markets/stocks/news",
    time: "8m ago",
    tag: "CRITICAL BAD",
  },
  {
    id: "r2",
    symbol: "ETERNAL",
    headline: "EBITDA margin contracts 240bps — quick-commerce burn rate raises concerns",
    source: "Moneycontrol",
    sourceUrl: "https://www.moneycontrol.com/news/business/stocks/",
    time: "22m ago",
    tag: "BAD",
  },
  {
    id: "r3",
    symbol: "PAYTM",
    headline: "Promoter pledges additional 3.2% stake — total pledge now at 18.7%",
    source: "Exchange Filing",
    sourceUrl: "https://www.nseindia.com/companies-listing/corporate-filings-announcements",
    time: "38m ago",
    tag: "CRITICAL BAD",
  },
  {
    id: "r4",
    symbol: "INFY",
    headline: "Q1 revenue misses street estimates by 2.1% — attrition ticks up to 14.2%",
    source: "BloombergQuint",
    sourceUrl: "https://www.bqprime.com/markets",
    time: "55m ago",
    tag: "BAD",
  },
  {
    id: "r5",
    symbol: "SUZLON",
    headline: "SEBI imposes ₹2.5 Cr penalty for disclosure lapses in FY24 annual report",
    source: "Economic Times",
    sourceUrl: "https://economictimes.indiatimes.com/markets/stocks/news",
    time: "1h ago",
    tag: "CRITICAL BAD",
  },
];

export type WhaleDeal = {
  id: string;
  symbol: string;
  clientName: string;
  side: "BUY" | "SELL";
  quantity: string;
  price: string;
  predictedParent: string | null;
  confidence: number;
  isShell: boolean;
  tradeDate?: string;
};

export const WHALE_DEALS: WhaleDeal[] = [
  {
    id: "w1",
    symbol: "RELIANCE",
    clientName: "HIMANSHU B. AMIN (HUF)",
    side: "BUY",
    quantity: "12.5L",
    price: "₹1,279",
    predictedParent: null,
    confidence: 25,
    isShell: true,
  },
  {
    id: "w2",
    symbol: "HDFCBANK",
    clientName: "LIFE INSURANCE CORPORATION",
    side: "BUY",
    quantity: "45.2L",
    price: "₹1,698",
    predictedParent: "Life Insurance Corporation (LIC)",
    confidence: 95,
    isShell: false,
  },
  {
    id: "w3",
    symbol: "TCS",
    clientName: "MORGAN STANLEY ASIA (SINGAPORE)",
    side: "SELL",
    quantity: "8.1L",
    price: "₹2,168",
    predictedParent: "Morgan Stanley",
    confidence: 95,
    isShell: false,
  },
  {
    id: "w4",
    symbol: "BAJFINANCE",
    clientName: "RADHIKA TRUST",
    side: "BUY",
    quantity: "22.0L",
    price: "₹7,245",
    predictedParent: "ICICI Prudential AMC",
    confidence: 62,
    isShell: true,
  },
  {
    id: "w5",
    symbol: "ICICIBANK",
    clientName: "VANGUARD TOTAL INTERNATIONAL",
    side: "BUY",
    quantity: "31.5L",
    price: "₹1,412",
    predictedParent: "Vanguard Group",
    confidence: 95,
    isShell: false,
  },
];

export type DeliveryBreakout = {
  symbol: string;
  deliveryPercent: number;
  volume: string;
  price: string;
  tradeDate?: string | null;
};

export const DELIVERY_BREAKOUTS: DeliveryBreakout[] = [
  { symbol: "RELIANCE", deliveryPercent: 61.4, volume: "1.52 Cr", price: "₹1,269" },
  { symbol: "SBIN", deliveryPercent: 72.8, volume: "2.84 Cr", price: "₹823" },
  { symbol: "TATASTEEL", deliveryPercent: 68.3, volume: "1.91 Cr", price: "₹158" },
  { symbol: "COALINDIA", deliveryPercent: 64.1, volume: "98.4L", price: "₹412" },
];

export type FlowTrend = "INCREASED" | "DECREASED" | "UNCHANGED";

export type FiiDiiFlow = {
  category: string;
  tradeDate: string;
  buyValueCr: number;
  sellValueCr: number;
  netValueCr: number;
  buySharePercent: number;
  netFlowPercent: number;
  changePercent: number | null;
  trend: FlowTrend;
};

export type FiiDiiSnapshot = {
  fetchedAt: string;
  tradeDate: string;
  fii: FiiDiiFlow;
  dii: FiiDiiFlow;
};

export type SearchSymbol = {
  symbol: string;
  source: string;
};

export const SEARCH_SYMBOLS: SearchSymbol[] = Array.from(
  new Map(
    [
      ...CATALYST_NEWS.map((n) => ({ symbol: n.symbol, source: "Catalyst News" })),
      ...RISK_NEWS.map((n) => ({ symbol: n.symbol, source: "Risk News" })),
      ...WHALE_DEALS.map((w) => ({ symbol: w.symbol, source: "Large Deals" })),
      ...DELIVERY_BREAKOUTS.map((d) => ({ symbol: d.symbol, source: "Delivery Scan" })),
    ].map((item) => [item.symbol, item] as const),
  ).values(),
).sort((a, b) => a.symbol.localeCompare(b.symbol));

export const MOCK_FII_DII: FiiDiiSnapshot = {
  fetchedAt: new Date().toISOString(),
  tradeDate: "2026-06-09",
  fii: {
    category: "FII",
    tradeDate: "2026-06-09",
    buyValueCr: 14735.47,
    sellValueCr: 19301.5,
    netValueCr: -4566.03,
    buySharePercent: 43.28,
    netFlowPercent: -13.4,
    changePercent: -117.1,
    trend: "DECREASED",
  },
  dii: {
    category: "DII",
    tradeDate: "2026-06-09",
    buyValueCr: 17664.98,
    sellValueCr: 11505.5,
    netValueCr: 6159.48,
    buySharePercent: 60.55,
    netFlowPercent: 21.12,
    changePercent: 47.06,
    trend: "INCREASED",
  },
};
