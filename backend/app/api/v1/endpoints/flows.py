from fastapi import APIRouter

from app.schemas.flows import FiiDiiSnapshot
from app.services.exchange.fii_dii import fetch_fii_dii_snapshot

router = APIRouter(prefix="/flows", tags=["flows"])


@router.get("/fii-dii", response_model=FiiDiiSnapshot)
def get_fii_dii_flows() -> FiiDiiSnapshot:
    """FII & DII cash-market net flows with day-over-day % change."""
    return fetch_fii_dii_snapshot()
