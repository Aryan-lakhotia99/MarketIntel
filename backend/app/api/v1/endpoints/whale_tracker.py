from datetime import date

from fastapi import APIRouter, Query

from app.schemas.exchange import BulkDealRecord, BulkDealWithPrediction, DealType, WhaleTrackerResponse
from app.services.exchange.bulk_deal_predictor import build_whale_tracker, predict_entity
from app.services.exchange.bulk_deals import fetch_bulk_deals_for_date_range, fetch_live_bulk_deals

router = APIRouter(prefix="/whale-tracker", tags=["whale-tracker"])


@router.get("", response_model=WhaleTrackerResponse)
def get_whale_tracker(
    deal_type: DealType = Query(DealType.BULK, alias="dealType"),
    include_block: bool = Query(True, alias="includeBlock"),
) -> WhaleTrackerResponse:
    """Today's bulk/block deals with AI entity predictions."""
    return build_whale_tracker(deal_type=deal_type, include_block=include_block)


@router.get("/deals", response_model=list[BulkDealRecord])
def get_bulk_deals(
    deal_type: DealType = Query(DealType.BULK, alias="dealType"),
) -> list[BulkDealRecord]:
    """Raw bulk/block deals without predictions."""
    return fetch_live_bulk_deals(deal_type)


@router.get("/history", response_model=list[BulkDealRecord])
def get_bulk_deals_history(
    from_date: date = Query(..., alias="fromDate"),
    to_date: date = Query(..., alias="toDate"),
    deal_type: DealType = Query(DealType.BULK, alias="dealType"),
) -> list[BulkDealRecord]:
    """Historical bulk/block deals for a date range."""
    return fetch_bulk_deals_for_date_range(from_date, to_date, deal_type)


@router.get("/predict", response_model=BulkDealWithPrediction)
def predict_bulk_deal_client(
    symbol: str,
    client_name: str = Query(..., alias="clientName"),
    side: str = Query("BUY"),
    quantity: int = Query(..., ge=1),
    trade_price: float = Query(..., alias="tradePrice", ge=0),
    deal_type: DealType = Query(DealType.BULK, alias="dealType"),
) -> BulkDealWithPrediction:
    """Run entity predictor on a single deal (useful for testing)."""
    from datetime import datetime

    from app.schemas.exchange import DealSide, Exchange

    deal = BulkDealRecord(
        exchange=Exchange.NSE,
        deal_type=deal_type,
        trade_date=datetime.now().date(),
        symbol=symbol.upper(),
        security_name=None,
        client_name=client_name,
        side=DealSide.BUY if side.upper() == "BUY" else DealSide.SELL,
        quantity=quantity,
        trade_price=trade_price,
    )
    live_deals = fetch_live_bulk_deals(deal_type)
    prediction = predict_entity(deal, all_deals=live_deals, history=live_deals)
    return BulkDealWithPrediction(**deal.model_dump(), prediction=prediction)
