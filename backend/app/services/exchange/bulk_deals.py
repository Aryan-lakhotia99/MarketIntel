"""Bulk and block deal ingestion from NSE (and best-effort BSE)."""

from __future__ import annotations

from datetime import date, datetime

import pandas as pd

from app.schemas.exchange import BulkDealRecord, DealSide, DealType, Exchange
from app.services.exchange.bse_client import get_bse_client
from app.services.exchange.nse_client import get_nse_client


def _parse_nse_date(value: str) -> date:
    for fmt in ("%d-%b-%Y", "%d-%B-%Y", "%d-%b-%y", "%d-%B-%y"):
        try:
            return datetime.strptime(value.strip(), fmt).date()
        except ValueError:
            continue
    return datetime.strptime(value.strip(), "%d-%b-%Y").date()


def _safe_int(value: object) -> int:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return 0
    if isinstance(value, str):
        return int(value.replace(",", "").strip() or "0")
    return int(value)


def _safe_float(value: object) -> float:
    if isinstance(value, str):
        return float(value.replace(",", "").strip() or "0")
    return float(value)


def _parse_snapshot_deals(payload: dict, deal_type: DealType) -> list[BulkDealRecord]:
    rows = payload.get("BULK_DEALS_DATA") or []
    as_on = payload.get("as_on_date") or rows[0].get("date") if rows else None
    default_date = _parse_nse_date(as_on) if as_on else datetime.now().date()

    deals: list[BulkDealRecord] = []
    for row in rows:
        side_raw = str(row.get("buySell", "")).upper()
        deals.append(
            BulkDealRecord(
                exchange=Exchange.NSE,
                deal_type=deal_type,
                trade_date=_parse_nse_date(str(row.get("date", default_date))),
                symbol=str(row.get("symbol", "")).upper(),
                security_name=row.get("name"),
                client_name=str(row.get("clientName", "")).strip(),
                side=DealSide.BUY if side_raw == "BUY" else DealSide.SELL,
                quantity=_safe_int(row.get("qty")),
                trade_price=_safe_float(row.get("watp")),
                remarks=row.get("remarks"),
            )
        )
    return deals


def _parse_historical_csv(frame: pd.DataFrame, deal_type: DealType) -> list[BulkDealRecord]:
    deals: list[BulkDealRecord] = []
    for _, row in frame.iterrows():
        side_raw = str(
            row.get("Buy/Sell") or row.get("BuySell") or row.get("BUY/SELL") or ""
        ).upper()
        deals.append(
            BulkDealRecord(
                exchange=Exchange.NSE,
                deal_type=deal_type,
                trade_date=_parse_nse_date(str(row.get("Date", ""))),
                symbol=str(row.get("Symbol", "")).upper(),
                security_name=row.get("SecurityName") or row.get("Security Name"),
                client_name=str(row.get("ClientName") or row.get("Client Name", "")).strip(),
                side=DealSide.BUY if "BUY" in side_raw else DealSide.SELL,
                quantity=_safe_int(row.get("QuantityTraded") or row.get("Quantity Traded")),
                trade_price=_safe_float(
                    row.get("TradePrice/Wght.Avg.Price")
                    or row.get("TradePrice")
                    or row.get("Wght.Avg.Price")
                ),
                remarks=str(row.get("Remarks", "") or None),
            )
        )
    return deals


def fetch_live_bulk_deals(deal_type: DealType = DealType.BULK) -> list[BulkDealRecord]:
    client = get_nse_client()
    payload = client.fetch_live_bulk_deals("bulk" if deal_type == DealType.BULK else "block")
    deals = _parse_snapshot_deals(payload, deal_type)

    bse_client = get_bse_client()
    for row in bse_client.fetch_live_bulk_deals():
        side_raw = str(row.get("BuySell") or row.get("BUY_SELL") or "").upper()
        deals.append(
            BulkDealRecord(
                exchange=Exchange.BSE,
                deal_type=DealType.BULK,
                trade_date=datetime.now().date(),
                symbol=str(row.get("scripcode") or row.get("ScripCode") or "").upper(),
                security_name=row.get("ScripName") or row.get("SecurityName"),
                client_name=str(row.get("ClientName") or row.get("CLIENT_NAME") or "").strip(),
                side=DealSide.BUY if "BUY" in side_raw else DealSide.SELL,
                quantity=_safe_int(row.get("Qty") or row.get("Quantity")),
                trade_price=_safe_float(row.get("Price") or row.get("Rate")),
                remarks=row.get("Remarks"),
            )
        )
    return deals


def fetch_bulk_deals_for_date_range(
    from_date: date,
    to_date: date,
    deal_type: DealType = DealType.BULK,
) -> list[BulkDealRecord]:
    client = get_nse_client()
    if deal_type == DealType.BLOCK:
        frame = client.fetch_historical_block_deals(from_date, to_date)
    else:
        frame = client.fetch_historical_bulk_deals(from_date, to_date)
    return _parse_historical_csv(frame, deal_type)
