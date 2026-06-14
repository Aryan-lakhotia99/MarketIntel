from fastapi import APIRouter, HTTPException, Query

from app.schemas.market import IndexQuote, MarketSnapshot, StockHistoryResponse, StockQuote
from app.services.market_data import (
    fetch_index_by_key,
    fetch_market_snapshot,
    fetch_stock_history,
    fetch_stock_quote,
    fetch_stock_quotes,
)

router = APIRouter(prefix="/indices", tags=["indices"])


@router.get("", response_model=MarketSnapshot)
def get_all_indices() -> MarketSnapshot:
    """Return live/delayed quotes for all configured Indian and global indices."""
    return fetch_market_snapshot()


@router.get("/{key}", response_model=IndexQuote)
def get_index(key: str) -> IndexQuote:
    """Return a single index quote by key (e.g. nifty50, sp500)."""
    quote = fetch_index_by_key(key)
    if quote is None:
        raise HTTPException(status_code=404, detail=f"Unknown index key: {key}")
    return quote
