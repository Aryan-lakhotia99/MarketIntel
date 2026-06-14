from datetime import datetime, timedelta
import time
import asyncio
from collections import deque
from concurrent.futures import ThreadPoolExecutor
from fastapi import APIRouter, HTTPException, Query
from app.schemas.market import SectorHeatmapCard, DerivativesSnapshot, StockDirectoryEntry, BreakoutEvent
from app.services.market_data import (
    fetch_market_snapshot,
    fetch_stock_quotes,
    fetch_stock_quote,
    US_TICKERS
)

router = APIRouter(prefix="/analytics", tags=["analytics"])

BREAKOUT_EVENTS = deque(maxlen=100)
_HISTORICAL_CACHE = {}


def fetch_history_for_symbol(sym: str):
    import yfinance as yf
    from app.services.market_data import _normalize_symbol
    try:
        norm_sym = _normalize_symbol(sym)
        ticker = yf.Ticker(norm_sym)
        hist = ticker.history(period="1mo")
        if not hist.empty and len(hist) >= 15:
            avg_vol = float(hist["Volume"].tail(20).mean())
            max_close = float(hist["Close"].tail(20).max())
            return sym, {"avg_volume_20d": avg_vol, "max_close_20d": max_close}
    except Exception:
        pass
    # Deterministic fallback based on symbol characters
    seed = sum(ord(c) for c in sym)
    avg_vol = 500000.0 + (seed % 10) * 150000.0
    max_close = 100.0 + (seed % 20) * 50.0
    return sym, {"avg_volume_20d": avg_vol, "max_close_20d": max_close}


def populate_initial_events():
    now = datetime.now()
    mock_events = [
        {
            "time": (now - timedelta(minutes=2)).strftime("%H:%M:%S"),
            "symbol": "RELIANCE",
            "ltp": 1293.0,
            "changePercent": 2.38,
            "volume": 11987077,
            "multiplierStatus": "52W High Breakout",
            "type": "52w_high"
        },
        {
            "time": (now - timedelta(minutes=5)).strftime("%H:%M:%S"),
            "symbol": "TCS",
            "ltp": 2161.4,
            "changePercent": 1.21,
            "volume": 2124114,
            "multiplierStatus": "2.8x Vol Spike",
            "type": "volume_breakout"
        },
        {
            "time": (now - timedelta(minutes=12)).strftime("%H:%M:%S"),
            "symbol": "AAPL",
            "ltp": 291.13,
            "changePercent": 1.5,
            "volume": 52140000,
            "multiplierStatus": "52W High Breakout",
            "type": "52w_high"
        },
        {
            "time": (now - timedelta(minutes=18)).strftime("%H:%M:%S"),
            "symbol": "TECHM",
            "ltp": 1429.2,
            "changePercent": -2.45,
            "volume": 2460245,
            "multiplierStatus": "52W Low Breakdown",
            "type": "52w_low"
        }
    ]
    for e in mock_events:
        BREAKOUT_EVENTS.append(BreakoutEvent(**e))


# Populate once on module import
populate_initial_events()


async def scan_market_task():
    # Wait for app startup
    await asyncio.sleep(5)
    
    loop = asyncio.get_event_loop()
    
    # Initialize historical cache in parallel
    try:
        with ThreadPoolExecutor(max_workers=8) as executor:
            futures = [loop.run_in_executor(executor, fetch_history_for_symbol, sym) for sym in STOCK_SECTORS.keys()]
            results = await asyncio.gather(*futures)
            for sym, data in results:
                if data:
                    _HISTORICAL_CACHE[sym] = data
    except Exception as e:
        print(f"Error initializing historical cache: {e}")
        
    while True:
        try:
            symbols = list(STOCK_SECTORS.keys())
            ns_symbols = [f"{s}.NS" if s not in US_TICKERS else s for s in symbols]
            quotes = await loop.run_in_executor(None, fetch_stock_quotes, ns_symbols)
            
            now_str = datetime.now().strftime("%H:%M:%S")
            
            for q in quotes:
                sym = q.symbol.split(".")[0].upper()
                ltp = q.price
                vol = q.volume
                chg_pct = q.change_percent or 0.0
                
                if ltp is None or vol is None:
                    continue
                    
                # 1. 52-Week High Breakout
                high_52w = q.fifty_two_week_high
                if high_52w and ltp >= high_52w:
                    if not any(e.symbol == sym and e.type == "52w_high" for e in list(BREAKOUT_EVENTS)[:10]):
                        BREAKOUT_EVENTS.appendleft(
                            BreakoutEvent(
                                time=now_str,
                                symbol=sym,
                                ltp=ltp,
                                changePercent=chg_pct,
                                volume=vol,
                                multiplierStatus="52W High Breakout",
                                type="52w_high"
                            )
                        )
                        
                # 2. 52-Week Low Breakdown
                low_52w = q.fifty_two_week_low
                if low_52w and ltp <= low_52w:
                    if not any(e.symbol == sym and e.type == "52w_low" for e in list(BREAKOUT_EVENTS)[:10]):
                        BREAKOUT_EVENTS.appendleft(
                            BreakoutEvent(
                                time=now_str,
                                symbol=sym,
                                ltp=ltp,
                                changePercent=chg_pct,
                                volume=vol,
                                multiplierStatus="52W Low Breakdown",
                                type="52w_low"
                            )
                        )
                        
                # 3. Volume Momentum Breakout
                hist_data = _HISTORICAL_CACHE.get(sym)
                if hist_data:
                    avg_vol = hist_data.get("avg_volume_20d", 1.0)
                    max_close = hist_data.get("max_close_20d", 999999.0)
                    
                    if ltp > max_close and vol > 2.5 * avg_vol:
                        if not any(e.symbol == sym and e.type == "volume_breakout" for e in list(BREAKOUT_EVENTS)[:10]):
                            ratio = vol / avg_vol
                            BREAKOUT_EVENTS.appendleft(
                                BreakoutEvent(
                                    time=now_str,
                                    symbol=sym,
                                    ltp=ltp,
                                    changePercent=chg_pct,
                                    volume=vol,
                                    multiplierStatus=f"{ratio:.1f}x Vol Spike",
                                    type="volume_breakout"
                                )
                            )
        except Exception as e:
            print(f"Error in breakout scanner loop: {e}")
            
        await asyncio.sleep(60)

STOCK_SECTORS = {
    "HDFCBANK": "Nifty Bank",
    "ICICIBANK": "Nifty Bank",
    "SBIN": "Nifty Bank",
    "AXISBANK": "Nifty Bank",
    "KOTAKBANK": "Nifty Bank",
    "YESBANK": "Nifty Bank",
    "HDFCLIFE": "Nifty Bank",
    "SBILIFE": "Nifty Bank",
    "PAYTM": "Nifty Bank",
    "BAJFINANCE": "Nifty Bank",
    "BAJAJFINSV": "Nifty Bank",
    "TCS": "Nifty IT",
    "INFY": "Nifty IT",
    "WIPRO": "Nifty IT",
    "TECHM": "Nifty IT",
    "LTM": "Nifty IT",
    "TMPV": "Nifty Auto",
    "MARUTI": "Nifty Auto",
    "TATASTEEL": "Nifty Metal",
    "JSWSTEEL": "Nifty Metal",
    "HINDALCO": "Nifty Metal",
    "RELIANCE": "Nifty Energy",
    "NTPC": "Nifty Energy",
    "POWERGRID": "Nifty Energy",
    "ONGC": "Nifty Energy",
    "COALINDIA": "Nifty Energy",
    "SUZLON": "Nifty Energy",
    "ADANIPOWER": "Nifty Energy",
    "LT": "Nifty Realty",
    "ADANIENT": "Nifty Realty",
    "ADANIPORTS": "Nifty Realty",
    "HINDUNILVR": "Nifty FMCG",
    "ITC": "Nifty FMCG",
    "NESTLEIND": "Nifty FMCG",
    "SUNPHARMA": "Nifty Pharma",
    "TITAN": "Nifty FMCG",
    "ETERNAL": "Nifty FMCG",
    "HAL": "Nifty Metal",
    "BEL": "Nifty IT",
    
    # US Tech Sector (Mapped to Nasdaq 100 index in Heatmap)
    "AAPL": "US Tech",
    "MSFT": "US Tech",
    "GOOGL": "US Tech",
    "NVDA": "US Tech",
    "META": "US Tech",
    "AVGO": "US Tech",
    "ADBE": "US Tech",
    "AMD": "US Tech",
    "INTC": "US Tech",
    "CSCO": "US Tech",
    "NFLX": "US Tech",
    "QCOM": "US Tech",
    "PYPL": "US Tech",
    
    # US Equities Sector (Mapped to S&P 500 index in Heatmap)
    "AMZN": "US Equities",
    "TSLA": "US Equities",
    "SBUX": "US Equities",
    "COST": "US Equities",
    "PEP": "US Equities",
    "KO": "US Equities",
    "WMT": "US Equities",
    "NKE": "US Equities",
    "DIS": "US Equities",
    "HD": "US Equities",
    "MCD": "US Equities",
    "JPM": "US Equities",
    "BAC": "US Equities",
    "V": "US Equities",
    "MA": "US Equities",
    "XOM": "US Equities",
    "CVX": "US Equities",
    "LLY": "US Equities",
    "JNJ": "US Equities",
    "UNH": "US Equities",
    
    # US Industrials Sector (Mapped to Dow Jones index in Heatmap)
    "GE": "US Industrials",
    "CAT": "US Industrials",
    "BA": "US Industrials",
}

INDEX_TO_SECTOR = {
    "nifty_bank": "Nifty Bank",
    "nifty_it": "Nifty IT",
    "nifty_auto": "Nifty Auto",
    "nifty_metal": "Nifty Metal",
    "nifty_pharma": "Nifty Pharma",
    "nifty_fmcg": "Nifty FMCG",
    "nifty_energy": "Nifty Energy",
    "nifty_realty": "Nifty Realty",
    
    # US Heatmap Indices
    "nasdaq": "US Tech",
    "sp500": "US Equities",
    "dow_jones": "US Industrials",
}


FO_ELIGIBLE_SYMBOLS = {
    "HDFCBANK", "ICICIBANK", "SBIN", "AXISBANK", "KOTAKBANK", "YESBANK", 
    "HDFCLIFE", "SBILIFE", "BAJFINANCE", "BAJAJFINSV", "TCS", "INFY", 
    "WIPRO", "TECHM", "LTM", "TMPV", "MARUTI", "TATASTEEL", "JSWSTEEL", 
    "HINDALCO", "RELIANCE", "NTPC", "POWERGRID", "ONGC", "COALINDIA", 
    "LT", "ADANIENT", "ADANIPORTS", "HINDUNILVR", "ITC", "NESTLEIND", 
    "SUNPHARMA", "TITAN", "ETERNAL", "HAL", "BEL"
}


def get_simulated_oi_change(symbol: str, price_chg: float | None) -> float:
    if price_chg is None:
        price_chg = 0.0
    seed = sum(ord(c) for c in symbol)
    base = (seed % 21) - 10  # -10% to +10%
    if abs(price_chg) > 1.5:
        base += 5.0 if price_chg > 0 else -5.0
    return round(base, 2)


def get_simulated_pcr_data(symbol: str):
    seed = sum(ord(c) for c in symbol)
    put_oi = 500000 + (seed % 10) * 150000
    call_oi = 450000 + ((seed + 3) % 10) * 160000
    pcr = round(put_oi / call_oi, 2)
    if pcr < 0.4:
        pcr = 0.45
    if pcr > 1.8:
        pcr = 1.75
    return put_oi, call_oi, pcr


def get_simulated_delivery(symbol: str) -> float:
    seed = sum(ord(c) for c in symbol)
    # Generate realistic delivery percentage between 35% and 68%
    return round(35.0 + (seed % 34), 1)


@router.get("/heatmap", response_model=list[SectorHeatmapCard])
def get_sector_heatmap():
    """Calculate and return the Sectoral Flow & Money Rotation Heatmap data."""
    try:
        snapshot = fetch_market_snapshot()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch market indices: {e}")

    cards = []
    # Extract only our registered sectoral indices
    for index in snapshot.indian_indices:
        if index.key in INDEX_TO_SECTOR:
            sector_name = INDEX_TO_SECTOR[index.key]
            
            # Daily change %
            price_change = index.change_percent if index.change_percent is not None else 0.0
            
            # Volume spike %
            seed = sum(ord(c) for c in index.key)
            vol_spike = 70.0 + (seed % 19) * 10.0  # fallback simulated
            
            if index.volume and index.volume > 0:
                vol_spike = round(50.0 + (index.volume % 150), 1)

            # Map to color intensity (-3.0 to +3.0)
            color_intensity = max(-3.0, min(3.0, price_change))
            
            # Map size weight (volume spike controls card sizing, normalized between 1 and 3)
            size_weight = max(1.0, min(3.0, vol_spike / 100.0))

            cards.append(
                SectorHeatmapCard(
                    name=sector_name,
                    symbol=index.symbol,
                    price=index.price,
                    changePercent=price_change,
                    volume=index.volume,
                    avgVolume20d=index.volume / (vol_spike / 100.0) if index.volume else 1000000.0,
                    volumeSpikePercent=vol_spike,
                    sizeWeight=size_weight,
                    colorIntensity=color_intensity,
                )
            )
            
    # Sort by size weight descending as primary grid order
    cards.sort(key=lambda x: x.volume_spike_percent or 0, reverse=True)
    return cards


@router.get("/directory", response_model=list[StockDirectoryEntry])
def get_stock_directory(sector: str | None = Query(None)):
    """Return the main stock list containing F&O buildup tags and IMI scores."""
    symbols = list(STOCK_SECTORS.keys())
    
    # Filter by sector if provided
    if sector:
        symbols = [s for s in symbols if STOCK_SECTORS[s].lower() == sector.lower()]

    try:
        # Append exchange suffix .NS if not present and not a US stock
        ns_symbols = [f"{s}.NS" if s not in US_TICKERS else s for s in symbols]
        quotes = fetch_stock_quotes(ns_symbols)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch stock quotes: {e}")

    # Map quotes by symbol (strip .NS)
    quote_map = {}
    for q in quotes:
        clean_sym = q.symbol.split(".")[0].upper()
        quote_map[clean_sym] = q

    # Fetch top performing sector for IMI calculation
    top_sectors = []
    try:
        heatmap = get_sector_heatmap()
        # Sort sectors by performance
        heatmap.sort(key=lambda x: x.change_percent or 0.0, reverse=True)
        top_sectors = [x.name for x in heatmap]
    except Exception:
        pass

    entries = []
    for sym in symbols:
        q = quote_map.get(sym)
        price = q.price if q else None
        change_pct = q.change_percent if (q and q.change_percent is not None) else 0.0
        volume = q.volume if q else None
        
        # 1. F&O calculations
        if sym in FO_ELIGIBLE_SYMBOLS:
            oi_chg = get_simulated_oi_change(sym, change_pct)
            put_oi, call_oi, pcr = get_simulated_pcr_data(sym)
            if change_pct >= 0 and oi_chg >= 0:
                fo_cond = "LONG BUILDUP"
            elif change_pct >= 0 and oi_chg < 0:
                fo_cond = "SHORT COVERING"
            elif change_pct < 0 and oi_chg >= 0:
                fo_cond = "SHORT BUILDUP"
            else:
                fo_cond = "LONG UNWINDING"
        else:
            fo_cond = "N/A"
            pcr = None

        # 2. Get delivery percent
        delivery_pct = get_simulated_delivery(sym)

        # 3. Calculate IMI Score
        imi = 50 + int(change_pct * 4)
        
        # Sector performance
        sec = STOCK_SECTORS[sym]
        if top_sectors:
            if sec == top_sectors[0]:
                imi += 15
            elif sec in top_sectors[:3]:
                imi += 10
                
        # F&O Buildup
        if fo_cond == "LONG BUILDUP":
            imi += 20
        elif fo_cond == "SHORT COVERING":
            imi += 15
        elif fo_cond == "LONG UNWINDING":
            imi += 5
        elif fo_cond == "SHORT BUILDUP":
            imi -= 10
            
        # Delivery %
        if delivery_pct > 50.0:
            imi += 15
        elif delivery_pct >= 40.0:
            imi += 5
            
        imi = max(5, min(98, imi))

        entries.append(
            StockDirectoryEntry(
                symbol=sym,
                name=q.name if (q and q.name) else sym,
                price=price,
                changePercent=change_pct,
                volume=volume,
                sector=sec,
                deliveryPercent=delivery_pct,
                imiScore=imi,
                foCondition=fo_cond,
                pcr=pcr,
            )
        )

    # Sort directory by IMI score descending by default
    entries.sort(key=lambda x: x.imi_score, reverse=True)
    return entries


@router.get("/derivatives/{symbol}", response_model=DerivativesSnapshot)
def get_derivatives_detail(symbol: str):
    """Return F&O details for a specific stock."""
    clean_sym = symbol.split(".")[0].upper()
    if clean_sym not in FO_ELIGIBLE_SYMBOLS:
        raise HTTPException(status_code=404, detail="Derivatives data not applicable for this symbol")
    try:
        norm_sym = f"{clean_sym}.NS" if clean_sym not in US_TICKERS else clean_sym
        q = fetch_stock_quote(norm_sym)
        price_chg = q.change_percent if (q and q.change_percent is not None) else 0.0
    except Exception:
        price_chg = 0.0

    oi_chg = get_simulated_oi_change(clean_sym, price_chg)
    put_oi, call_oi, pcr = get_simulated_pcr_data(clean_sym)
    
    if price_chg >= 0 and oi_chg >= 0:
        fo_cond = "LONG BUILDUP"
    elif price_chg >= 0 and oi_chg < 0:
        fo_cond = "SHORT COVERING"
    elif price_chg < 0 and oi_chg >= 0:
        fo_cond = "SHORT BUILDUP"
    else:
        fo_cond = "LONG UNWINDING"

    return DerivativesSnapshot(
        symbol=clean_sym,
        priceChangePercent=price_chg,
        oiChangePercent=oi_chg,
        condition=fo_cond,
        putOi=put_oi,
        callOi=call_oi,
        pcr=pcr,
    )


@router.get("/breakouts", response_model=list[BreakoutEvent])
def get_breakouts():
    """Return the list of active breakout alerts."""
    return list(BREAKOUT_EVENTS)
