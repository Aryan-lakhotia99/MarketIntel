from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class MarketRegion(str, Enum):
    INDIA = "india"
    GLOBAL = "global"


class IndexQuote(BaseModel):
    key: str
    name: str
    symbol: str
    region: MarketRegion
    price: float | None = None
    change: float | None = None
    change_percent: float | None = Field(None, alias="changePercent")
    previous_close: float | None = Field(None, alias="previousClose")
    open: float | None = None
    day_high: float | None = Field(None, alias="dayHigh")
    day_low: float | None = Field(None, alias="dayLow")
    volume: int | None = None
    currency: str | None = None
    market_state: str | None = Field(None, alias="marketState")
    last_updated: datetime | None = Field(None, alias="lastUpdated")

    model_config = {"populate_by_name": True}


class MarketSnapshot(BaseModel):
    fetched_at: datetime = Field(alias="fetchedAt")
    indian_indices: list[IndexQuote] = Field(alias="indianIndices")
    global_indices: list[IndexQuote] = Field(alias="globalIndices")
    commodities: list[IndexQuote] = Field(default=[], alias="commodities")
    currencies: list[IndexQuote] = Field(default=[], alias="currencies")

    model_config = {"populate_by_name": True}


class NewsTag(str, Enum):
    SUPER_POSITIVE = "SUPER POSITIVE"
    POSITIVE = "POSITIVE"
    NEUTRAL = "NEUTRAL"
    BAD = "BAD"
    CRITICAL_BAD = "CRITICAL BAD"


class NewsItem(BaseModel):
    id: str
    symbol: str
    headline: str
    source: str
    source_url: str = Field(alias="sourceUrl")
    time: str
    tag: NewsTag

    model_config = {"populate_by_name": True}


class NSECompany(BaseModel):
    symbol: str
    name: str


class StockQuote(BaseModel):
    symbol: str
    name: str | None = None
    exchange: str | None = None
    price: float | None = None
    change: float | None = None
    change_percent: float | None = Field(None, alias="changePercent")
    previous_close: float | None = Field(None, alias="previousClose")
    open: float | None = None
    day_high: float | None = Field(None, alias="dayHigh")
    day_low: float | None = Field(None, alias="dayLow")
    volume: int | None = None
    market_cap: float | None = Field(None, alias="marketCap")
    currency: str | None = None
    last_updated: datetime | None = Field(None, alias="lastUpdated")
    pe_ratio: float | None = Field(None, alias="peRatio")
    roe: float | None = None
    roce: float | None = None
    roa: float | None = None
    opm: float | None = None
    sales_growth: float | None = Field(None, alias="salesGrowth")
    profit_growth: float | None = Field(None, alias="profitGrowth")
    promoter_holding: float | None = Field(None, alias="promoterHolding")
    fifty_two_week_high: float | None = Field(None, alias="fiftyTwoWeekHigh")
    fifty_two_week_low: float | None = Field(None, alias="fiftyTwoWeekLow")

    model_config = {"populate_by_name": True}


class StockHistoryBar(BaseModel):
    date: datetime
    open: float
    high: float
    low: float
    close: float
    volume: int


class StockHistoryResponse(BaseModel):
    symbol: str
    period: str
    interval: str
    bars: list[StockHistoryBar]


class MomentumLabel(str, Enum):
    STRONG_BULLISH = "Strong Bullish"
    BULLISH = "Bullish"
    NEUTRAL = "Neutral"
    BEARISH = "Bearish"
    STRONG_BEARISH = "Strong Bearish"


class MomentumBreakdown(BaseModel):
    price_momentum: float = Field(alias="priceMomentum")
    trend_alignment: float = Field(alias="trendAlignment")
    rsi_momentum: float = Field(alias="rsiMomentum")
    volume_confirmation: float = Field(alias="volumeConfirmation")

    model_config = {"populate_by_name": True}


class StockMomentumScore(BaseModel):
    symbol: str
    name: str | None = None
    price: float | None = None
    score: float = Field(..., ge=0, le=100, description="Composite momentum score (0-100)")
    label: MomentumLabel
    breakdown: MomentumBreakdown
    return_5d: float | None = Field(None, alias="return5d")
    return_20d: float | None = Field(None, alias="return20d")
    return_60d: float | None = Field(None, alias="return60d")
    return_120d: float | None = Field(None, alias="return120d")
    rsi_14: float | None = Field(None, alias="rsi14")
    sma_20: float | None = Field(None, alias="sma20")
    sma_50: float | None = Field(None, alias="sma50")
    sma_200: float | None = Field(None, alias="sma200")
    volume_ratio_10_50: float | None = Field(None, alias="volumeRatio10_50")
    computed_at: datetime = Field(alias="computedAt")

    model_config = {"populate_by_name": True}


class AnnouncementCategory(str, Enum):
    ORDER_DETAILS = "Order Details"
    INVESTOR_MEETS = "Investor Meets"
    BOARD_MEETING = "Board Meeting"
    FINANCIAL_RESULTS = "Financial Results"
    GENERAL = "General Announcement"


class CorporateAnnouncement(BaseModel):
    id: str
    symbol: str
    category: AnnouncementCategory
    title: str
    description: str
    source: str
    source_url: str = Field(alias="sourceUrl")
    date: str
    sentiment: str

    model_config = {"populate_by_name": True}


class SectorHeatmapCard(BaseModel):
    name: str
    symbol: str
    price: float | None = None
    change_percent: float | None = Field(None, alias="changePercent")
    volume: int | None = None
    avg_volume_20d: float | None = Field(None, alias="avgVolume20d")
    volume_spike_percent: float | None = Field(None, alias="volumeSpikePercent")
    size_weight: float | None = Field(None, alias="sizeWeight")
    color_intensity: float | None = Field(None, alias="colorIntensity")

    model_config = {"populate_by_name": True}


class DerivativesSnapshot(BaseModel):
    symbol: str
    price_change_percent: float = Field(..., alias="priceChangePercent")
    oi_change_percent: float = Field(..., alias="oiChangePercent")
    condition: str
    put_oi: int = Field(..., alias="putOi")
    call_oi: int = Field(..., alias="callOi")
    pcr: float

    model_config = {"populate_by_name": True}


class StockDirectoryEntry(BaseModel):
    symbol: str
    name: str
    price: float | None = None
    change_percent: float | None = Field(None, alias="changePercent")
    volume: int | None = None
    sector: str
    delivery_percent: float | None = Field(None, alias="deliveryPercent")
    imi_score: int = Field(..., alias="imiScore")
    fo_condition: str = Field(..., alias="foCondition")
    pcr: float | None = None
    currency: str | None = None

    model_config = {"populate_by_name": True}


class BreakoutEvent(BaseModel):
    time: str
    symbol: str
    ltp: float | None = None
    change_percent: float | None = Field(None, alias="changePercent")
    volume: int | None = None
    multiplier_status: str = Field(..., alias="multiplierStatus")
    type: str  # "52w_high" | "52w_low" | "volume_breakout"
    currency: str | None = None

    model_config = {"populate_by_name": True}
