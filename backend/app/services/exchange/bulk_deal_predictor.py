"""Infer likely parent institutions behind bulk deal client names."""

from __future__ import annotations

from collections import Counter
from datetime import date

from app.data.entity_registry import is_shell_like_entity, match_known_entity
from app.schemas.exchange import (
    BulkDealRecord,
    BulkDealWithPrediction,
    DealSide,
    EntityPrediction,
    WhaleTrackerResponse,
)
from app.services.exchange.bulk_deals import fetch_live_bulk_deals
from app.schemas.exchange import DealType


def _predict_from_co_buyers(
    deal: BulkDealRecord,
    all_deals: list[BulkDealRecord],
) -> tuple[str | None, str | None, float, list[str]]:
    """
    When a shell entity buys, look for known institutions buying the same
    symbol on the same day (possible coordinated accumulation).
    """
    same_day_buys = [
        other
        for other in all_deals
        if other.symbol == deal.symbol
        and other.trade_date == deal.trade_date
        and other.side == DealSide.BUY
        and other.client_name != deal.client_name
    ]
    for other in same_day_buys:
        match = match_known_entity(other.client_name)
        if match:
            parent, category = match
            return (
                parent,
                category,
                62.0,
                [
                    f"Co-buyer on same day: {other.client_name}",
                    "Possible coordinated institutional accumulation",
                ],
            )
    return None, None, 0.0, []


def _predict_from_history(
    deal: BulkDealRecord,
    history: list[BulkDealRecord],
) -> tuple[str | None, str | None, float, list[str]]:
    """
    Map shell buyers that repeatedly appear on the same symbol to the most
    common known institution also active on that symbol.
    """
    symbol_deals = [item for item in history if item.symbol == deal.symbol]
    known_counter: Counter[str] = Counter()
    category_map: dict[str, str] = {}

    for item in symbol_deals:
        match = match_known_entity(item.client_name)
        if match:
            parent, category = match
            known_counter[parent] += 1
            category_map[parent] = category

    shell_hits = sum(
        1 for item in symbol_deals if is_shell_like_entity(item.client_name)
    )
    if not known_counter or shell_hits < 2:
        return None, None, 0.0, []

    parent, count = known_counter.most_common(1)[0]
    confidence = min(78.0, 45.0 + count * 8.0)
    return (
        parent,
        category_map.get(parent),
        confidence,
        [
            f"Symbol has {shell_hits} shell-entity deals in recent history",
            f"Most active known institution on symbol: {parent} ({count} deals)",
        ],
    )


def predict_entity(
    deal: BulkDealRecord,
    *,
    all_deals: list[BulkDealRecord],
    history: list[BulkDealRecord] | None = None,
) -> EntityPrediction:
    history = history or all_deals
    shell = is_shell_like_entity(deal.client_name)
    reasoning: list[str] = []

    known = match_known_entity(deal.client_name)
    if known:
        parent, category = known
        return EntityPrediction(
            client_name=deal.client_name,
            predicted_parent=parent,
            parent_category=category,
            confidence=95.0,
            is_shell_entity=shell,
            reasoning=[f"Direct match to known entity registry: {parent}"],
        )

    if not shell:
        return EntityPrediction(
            client_name=deal.client_name,
            predicted_parent=None,
            parent_category="Unknown / HNI",
            confidence=35.0,
            is_shell_entity=False,
            reasoning=["Unmapped client — likely domestic HNI or proprietary desk"],
        )

    reasoning.append("Shell-like entity detected (HUF/trust/person-name pattern)")

    parent, category, confidence, hist_reasons = _predict_from_co_buyers(deal, all_deals)
    if parent:
        return EntityPrediction(
            client_name=deal.client_name,
            predicted_parent=parent,
            parent_category=category,
            confidence=confidence,
            is_shell_entity=True,
            reasoning=reasoning + hist_reasons,
        )

    parent, category, confidence, hist_reasons = _predict_from_history(deal, history)
    if parent:
        return EntityPrediction(
            client_name=deal.client_name,
            predicted_parent=parent,
            parent_category=category,
            confidence=confidence,
            is_shell_entity=True,
            reasoning=reasoning + hist_reasons,
        )

    # Volume-tier heuristic for large shell accumulation.
    if deal.quantity >= 1_000_000 and deal.side == DealSide.BUY:
        return EntityPrediction(
            client_name=deal.client_name,
            predicted_parent="Probable Institutional Proxy (Unconfirmed)",
            parent_category="Inferred",
            confidence=48.0,
            is_shell_entity=True,
            reasoning=reasoning
            + [
                f"Large buy quantity ({deal.quantity:,} shares) via shell entity",
                "Pattern consistent with institutional routing",
            ],
        )

    return EntityPrediction(
        client_name=deal.client_name,
        predicted_parent=None,
        parent_category=None,
        confidence=25.0,
        is_shell_entity=True,
        reasoning=reasoning + ["Insufficient historical signal to infer parent"],
    )


def build_whale_tracker(
    *,
    deal_type: DealType = DealType.BULK,
    include_block: bool = True,
) -> WhaleTrackerResponse:
    bulk_deals = fetch_live_bulk_deals(DealType.BULK)
    all_deals = list(bulk_deals)
    if include_block:
        all_deals.extend(fetch_live_bulk_deals(DealType.BLOCK))
    elif deal_type == DealType.BLOCK:
        all_deals = fetch_live_bulk_deals(DealType.BLOCK)

    enriched: list[BulkDealWithPrediction] = []
    for deal in all_deals:
        if deal_type != DealType.BULK and deal.deal_type != deal_type:
            continue
        prediction = predict_entity(deal, all_deals=all_deals, history=all_deals)
        enriched.append(BulkDealWithPrediction(**deal.model_dump(), prediction=prediction))

    as_on = max((deal.trade_date for deal in enriched), default=date.today())
    buy_deals = [deal for deal in enriched if deal.side == DealSide.BUY]
    sell_deals = [deal for deal in enriched if deal.side == DealSide.SELL]

    return WhaleTrackerResponse(
        as_on_date=as_on,
        deals=enriched,
        buy_deals=buy_deals,
        sell_deals=sell_deals,
    )
