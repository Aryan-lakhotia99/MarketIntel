from datetime import date

from fastapi import APIRouter, Query

from app.schemas.exchange import DeliveryScanResponse, Exchange, SymbolDeliveryHistoryResponse
from app.services.exchange.delivery import fetch_symbol_delivery_history, scan_bullish_accumulation

router = APIRouter(prefix="/delivery", tags=["delivery"])


@router.get("/scan", response_model=DeliveryScanResponse)
def scan_delivery_breakouts(
    trade_date: date | None = Query(None, alias="tradeDate"),
    min_delivery_percent: float = Query(60.0, alias="minDeliveryPercent", ge=0, le=100),
    min_volume: int = Query(500_000, alias="minVolume", ge=0),
) -> DeliveryScanResponse:
    """Scan NSE bhavcopy for high delivery % + high volume (bullish accumulation)."""
    return scan_bullish_accumulation(
        trade_date,
        min_delivery_percent=min_delivery_percent,
        min_volume=min_volume,
    )


@router.get("/{symbol}", response_model=SymbolDeliveryHistoryResponse)
def get_symbol_delivery(
    symbol: str,
    days: int = Query(30, ge=5, le=365),
    exchange: Exchange = Query(Exchange.NSE),
) -> SymbolDeliveryHistoryResponse:
    """Return delivery % history for a single symbol."""
    return fetch_symbol_delivery_history(symbol, days=days, exchange=exchange)
