"""NSE/BSE delivery data parsing and bullish accumulation detection."""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta

import pandas as pd

from app.schemas.exchange import (
    BullishAccumulationAlert,
    DeliveryRecord,
    DeliveryScanResponse,
    Exchange,
    SymbolDeliveryHistoryResponse,
)
from app.services.exchange.nse_client import get_nse_client


def _parse_nse_date(value: str) -> date:
    return datetime.strptime(value.strip(), "%d-%b-%Y").date()


def _safe_int(value: object) -> int:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return 0
    if isinstance(value, str):
        return int(value.replace(",", "").strip() or "0")
    return int(value)


def _safe_float(value: object) -> float | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    if isinstance(value, str):
        cleaned = value.replace(",", "").strip()
        return float(cleaned) if cleaned else None
    return float(value)


def _frame_to_delivery_records(frame: pd.DataFrame, exchange: Exchange) -> list[DeliveryRecord]:
    records: list[DeliveryRecord] = []
    for _, row in frame.iterrows():
        symbol = str(row.get("SYMBOL", "")).strip().upper()
        if not symbol:
            continue
        delivery_pct = _safe_float(row.get("DELIV_PER"))
        if delivery_pct is None:
            continue
        records.append(
            DeliveryRecord(
                symbol=symbol,
                series=str(row.get("SERIES", "EQ")).strip(),
                trade_date=_parse_nse_date(str(row.get("DATE1", ""))),
                close_price=_safe_float(row.get("CLOSE_PRICE")),
                total_volume=_safe_int(row.get("TTL_TRD_QNTY")),
                delivery_quantity=_safe_int(row.get("DELIV_QTY")),
                delivery_percent=delivery_pct,
                exchange=exchange,
            )
        )
    return records


def _build_alert(record: DeliveryRecord, reason: str) -> BullishAccumulationAlert:
    return BullishAccumulationAlert(
        symbol=record.symbol,
        security_name=None,
        trade_date=record.trade_date,
        delivery_percent=record.delivery_percent,
        total_volume=record.total_volume,
        delivery_quantity=record.delivery_quantity,
        close_price=record.close_price,
        exchange=record.exchange,
        alert_reason=reason,
    )


def scan_bullish_accumulation(
    trade_date: date | None = None,
    *,
    min_delivery_percent: float = 60.0,
    min_volume: int = 500_000,
) -> DeliveryScanResponse:
    """
    Scan daily bhavcopy for high delivery % + high volume setups.
    """
    client = get_nse_client()
    if trade_date is None:
        trade_date = datetime.now(tz=UTC).date()

    # Walk back up to 5 calendar days to find the latest available bhavcopy.
    frame: pd.DataFrame | None = None
    resolved_date = trade_date
    for offset in range(6):
        candidate = trade_date - timedelta(days=offset)
        try:
            frame = client.fetch_bhavcopy_with_delivery(candidate)
            resolved_date = candidate
            break
        except Exception:
            continue

    if frame is None or frame.empty:
        return DeliveryScanResponse(
            trade_date=trade_date,
            exchange=Exchange.NSE,
            scanned_count=0,
            alerts=[],
            top_delivery=[],
        )

    eq_frame = frame[frame["SERIES"].astype(str).str.strip() == "EQ"].copy()
    records = _frame_to_delivery_records(eq_frame, Exchange.NSE)

    alerts: list[BullishAccumulationAlert] = []
    for record in records:
        if (
            record.delivery_percent >= min_delivery_percent
            and record.total_volume >= min_volume
        ):
            alerts.append(
                _build_alert(
                    record,
                    (
                        f"Delivery {record.delivery_percent:.1f}% with "
                        f"{record.total_volume:,} shares traded"
                    ),
                )
            )

    alerts.sort(key=lambda item: (item.delivery_percent, item.total_volume), reverse=True)
    top_delivery = sorted(records, key=lambda item: item.delivery_percent, reverse=True)[:25]

    return DeliveryScanResponse(
        trade_date=resolved_date,
        exchange=Exchange.NSE,
        scanned_count=len(records),
        alerts=alerts,
        top_delivery=top_delivery,
    )


def fetch_symbol_delivery_history(
    symbol: str,
    *,
    days: int = 30,
    exchange: Exchange = Exchange.NSE,
) -> SymbolDeliveryHistoryResponse:
    if exchange != Exchange.NSE:
        return SymbolDeliveryHistoryResponse(symbol=symbol.upper(), exchange=exchange, records=[])

    client = get_nse_client()
    to_date = datetime.now(tz=UTC).date()
    from_date = to_date - timedelta(days=days)
    frame = client.fetch_symbol_delivery_history(symbol.upper(), from_date, to_date)

    records: list[DeliveryRecord] = []
    for _, row in frame.iterrows():
        delivery_pct = _safe_float(row.get("%DlyQttoTradedQty") or row.get("DELIV_PER"))
        if delivery_pct is None:
            continue
        records.append(
            DeliveryRecord(
                symbol=symbol.upper(),
                series=str(row.get("Series", "EQ")).strip(),
                trade_date=_parse_nse_date(str(row.get("Date", ""))),
                close_price=None,
                total_volume=_safe_int(row.get("TradedQty")),
                delivery_quantity=_safe_int(row.get("DeliverableQty")),
                delivery_percent=delivery_pct,
                exchange=Exchange.NSE,
            )
        )

    records.sort(key=lambda item: item.trade_date, reverse=True)
    return SymbolDeliveryHistoryResponse(
        symbol=symbol.upper(),
        exchange=Exchange.NSE,
        records=records,
    )
