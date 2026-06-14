from fastapi import APIRouter, Query

from app.schemas.market import StockHistoryResponse, StockMomentumScore, StockQuote, NSECompany, CorporateAnnouncement
from app.services.market_data import fetch_stock_history, fetch_stock_quote, fetch_stock_quotes, fetch_nse_listed_companies, fetch_stock_announcements
from app.services.momentum import fetch_stock_momentum, fetch_stock_momentum_batch

router = APIRouter(prefix="/stocks", tags=["stocks"])


@router.get("/nse-list", response_model=list[NSECompany])
def get_nse_list() -> list[NSECompany]:
    """Return the list of all NSE-listed equities."""
    return fetch_nse_listed_companies()


@router.get("", response_model=list[StockQuote])
def get_stocks(
    symbols: str = Query(..., description="Comma-separated symbols, e.g. RELIANCE,TCS,INFY"),
) -> list[StockQuote]:
    """Return quotes for multiple stocks."""
    symbol_list = [s.strip() for s in symbols.split(",") if s.strip()]
    return fetch_stock_quotes(symbol_list)


@router.get("/momentum", response_model=list[StockMomentumScore])
def get_stocks_momentum(
    symbols: str = Query(..., description="Comma-separated symbols, e.g. RELIANCE,TCS,INFY"),
) -> list[StockMomentumScore]:
    """Return momentum scores for multiple stocks, sorted highest score first."""
    symbol_list = [s.strip() for s in symbols.split(",") if s.strip()]
    scores = fetch_stock_momentum_batch(symbol_list)
    return sorted(scores, key=lambda item: item.score, reverse=True)


@router.get("/{symbol}/history", response_model=StockHistoryResponse)
def get_stock_history(
    symbol: str,
    period: str = Query("1mo", description="yfinance period: 1d, 5d, 1mo, 3mo, 6mo, 1y, 3y, 5y, max"),
    interval: str = Query("1d", description="yfinance interval: 1m, 5m, 15m, 1h, 1d, 1wk"),
) -> StockHistoryResponse:
    """Return OHLCV history for a stock."""
    return fetch_stock_history(symbol, period=period, interval=interval)


@router.get("/{symbol}/momentum", response_model=StockMomentumScore)
def get_stock_momentum(symbol: str) -> StockMomentumScore:
    """Return composite momentum score (0-100) with indicator breakdown."""
    return fetch_stock_momentum(symbol)


@router.get("/{symbol}", response_model=StockQuote)
def get_stock(symbol: str) -> StockQuote:
    """
    Return a single stock quote.

    Examples: RELIANCE, TCS.NS, INFY.BO
    """
    return fetch_stock_quote(symbol)


@router.get("/{symbol}/announcements", response_model=list[CorporateAnnouncement])
def get_stock_announcements(symbol: str) -> list[CorporateAnnouncement]:
    """Return corporate announcements for a stock from Moneycontrol and Economic Times."""
    return fetch_stock_announcements(symbol)
