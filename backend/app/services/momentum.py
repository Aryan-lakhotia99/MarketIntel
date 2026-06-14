"""Stock momentum scoring from price, trend, RSI, and volume signals."""

from __future__ import annotations

from datetime import UTC, datetime

import pandas as pd
import yfinance as yf

from app.schemas.market import MomentumBreakdown, MomentumLabel, StockMomentumScore
from app.services.market_data import fetch_stock_quote, _normalize_symbol


def _pct_return(series: pd.Series, lookback: int) -> float | None:
    if len(series) <= lookback:
        return None
    start = float(series.iloc[-lookback - 1])
    end = float(series.iloc[-1])
    if start == 0:
        return None
    return ((end - start) / start) * 100


def _compute_rsi(closes: pd.Series, period: int = 14) -> float | None:
    if len(closes) < period + 1:
        return None

    delta = closes.diff()
    gains = delta.clip(lower=0)
    losses = -delta.clip(upper=0)

    avg_gain = gains.rolling(window=period).mean().iloc[-1]
    avg_loss = losses.rolling(window=period).mean().iloc[-1]

    if avg_loss == 0:
        return 100.0
    if pd.isna(avg_gain) or pd.isna(avg_loss):
        return None

    rs = avg_gain / avg_loss
    return float(100 - (100 / (1 + rs)))


def _return_score(pct: float | None) -> float:
    """Map return % to 0-100 (roughly -15% -> 0, +15% -> 100)."""
    if pct is None:
        return 50.0
    return max(0.0, min(100.0, 50.0 + (pct / 15.0) * 50.0))


def _rsi_momentum_score(rsi: float | None) -> float:
    """Momentum-friendly RSI scoring (favor strength, penalize weakness)."""
    if rsi is None:
        return 50.0
    if rsi >= 70:
        return 85.0
    if rsi >= 60:
        return 75.0 + (rsi - 60) * 1.0
    if rsi >= 50:
        return 60.0 + (rsi - 50) * 1.5
    if rsi >= 40:
        return 40.0 + (rsi - 40) * 2.0
    if rsi >= 30:
        return 20.0 + (rsi - 30) * 2.0
    return max(0.0, rsi * 0.66)


def _trend_score(price: float, sma20: float | None, sma50: float | None, sma200: float | None) -> float:
    score = 0.0
    checks = 0

    for level in (sma20, sma50, sma200):
        if level is not None and level > 0:
            checks += 1
            if price > level:
                score += 1.0

    if checks == 0:
        return 50.0

    base = (score / checks) * 100.0

    if sma20 is not None and sma50 is not None and sma20 > sma50:
        base = min(100.0, base + 8.0)
    if sma50 is not None and sma200 is not None and sma50 > sma200:
        base = min(100.0, base + 7.0)

    return base


def _volume_score(recent_avg: float | None, baseline_avg: float | None, return_20d: float | None) -> float:
    if not recent_avg or not baseline_avg or baseline_avg == 0:
        return 50.0

    ratio = recent_avg / baseline_avg
    if ratio >= 1.5:
        base = 85.0
    elif ratio >= 1.2:
        base = 75.0
    elif ratio >= 1.0:
        base = 60.0
    elif ratio >= 0.8:
        base = 45.0
    else:
        base = 30.0

    if return_20d is not None and return_20d > 0 and ratio >= 1.1:
        base = min(100.0, base + 10.0)
    elif return_20d is not None and return_20d < 0 and ratio >= 1.2:
        base = max(0.0, base - 15.0)

    return base


def _label_for_score(score: float) -> MomentumLabel:
    if score >= 75:
        return MomentumLabel.STRONG_BULLISH
    if score >= 60:
        return MomentumLabel.BULLISH
    if score >= 40:
        return MomentumLabel.NEUTRAL
    if score >= 25:
        return MomentumLabel.BEARISH
    return MomentumLabel.STRONG_BEARISH


def fetch_stock_momentum(symbol: str) -> StockMomentumScore:
    normalized = _normalize_symbol(symbol)
    quote = fetch_stock_quote(normalized)

    ticker = yf.Ticker(normalized)
    history = ticker.history(period="1y", interval="1d")
    if history.empty or len(history) < 30:
        return StockMomentumScore(
            symbol=normalized,
            name=quote.name,
            price=quote.price,
            score=50.0,
            label=MomentumLabel.NEUTRAL,
            breakdown=MomentumBreakdown(
                price_momentum=50.0,
                trend_alignment=50.0,
                rsi_momentum=50.0,
                volume_confirmation=50.0,
            ),
            return_5d=None,
            return_20d=None,
            return_60d=None,
            return_120d=None,
            rsi_14=None,
            sma_20=None,
            sma_50=None,
            sma_200=None,
            volume_ratio_10_50=None,
            computed_at=datetime.now(tz=UTC),
        )

    closes = history["Close"]
    volumes = history["Volume"]
    price = float(closes.iloc[-1])

    return_5d = _pct_return(closes, 5)
    return_20d = _pct_return(closes, 20)
    return_60d = _pct_return(closes, 60)
    return_120d = _pct_return(closes, 120)

    rsi_14 = _compute_rsi(closes, 14)
    sma_20 = float(closes.rolling(20).mean().iloc[-1]) if len(closes) >= 20 else None
    sma_50 = float(closes.rolling(50).mean().iloc[-1]) if len(closes) >= 50 else None
    sma_200 = float(closes.rolling(200).mean().iloc[-1]) if len(closes) >= 200 else None

    recent_vol = float(volumes.tail(10).mean()) if len(volumes) >= 10 else None
    baseline_vol = float(volumes.tail(50).mean()) if len(volumes) >= 50 else None
    volume_ratio = (recent_vol / baseline_vol) if recent_vol and baseline_vol else None

    price_momentum = (
        _return_score(return_5d) * 0.15
        + _return_score(return_20d) * 0.35
        + _return_score(return_60d) * 0.30
        + _return_score(return_120d) * 0.20
    )
    trend_alignment = _trend_score(price, sma_20, sma_50, sma_200)
    rsi_momentum = _rsi_momentum_score(rsi_14)
    volume_confirmation = _volume_score(recent_vol, baseline_vol, return_20d)

    score = round(
        price_momentum * 0.40
        + trend_alignment * 0.25
        + rsi_momentum * 0.20
        + volume_confirmation * 0.15,
        1,
    )

    return StockMomentumScore(
        symbol=normalized,
        name=quote.name,
        price=quote.price,
        score=score,
        label=_label_for_score(score),
        breakdown=MomentumBreakdown(
            price_momentum=round(price_momentum, 1),
            trend_alignment=round(trend_alignment, 1),
            rsi_momentum=round(rsi_momentum, 1),
            volume_confirmation=round(volume_confirmation, 1),
        ),
        return_5d=round(return_5d, 2) if return_5d is not None else None,
        return_20d=round(return_20d, 2) if return_20d is not None else None,
        return_60d=round(return_60d, 2) if return_60d is not None else None,
        return_120d=round(return_120d, 2) if return_120d is not None else None,
        rsi_14=round(rsi_14, 2) if rsi_14 is not None else None,
        sma_20=round(sma_20, 2) if sma_20 is not None else None,
        sma_50=round(sma_50, 2) if sma_50 is not None else None,
        sma_200=round(sma_200, 2) if sma_200 is not None else None,
        volume_ratio_10_50=round(volume_ratio, 2) if volume_ratio is not None else None,
        computed_at=datetime.now(tz=UTC),
    )


def fetch_stock_momentum_batch(symbols: list[str]) -> list[StockMomentumScore]:
    return [fetch_stock_momentum(symbol) for symbol in symbols]
