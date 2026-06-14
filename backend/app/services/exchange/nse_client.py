"""NSE India HTTP client with browser-like session handling."""

from __future__ import annotations

from datetime import date, datetime
from io import BytesIO
from typing import Any

import httpx
import pandas as pd

NSE_HOME = "https://www.nseindia.com"
ARCHIVES_BASE = "https://nsearchives.nseindia.com"

DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, text/csv, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": f"{NSE_HOME}/",
    "Connection": "keep-alive",
}


class NSEClient:
    def __init__(self) -> None:
        self._client = httpx.Client(
            headers=DEFAULT_HEADERS,
            follow_redirects=True,
            timeout=30.0,
        )
        self._bootstrapped = False

    def _bootstrap(self) -> None:
        if self._bootstrapped:
            return
        self._client.get(NSE_HOME)
        self._bootstrapped = True

    def get_json(self, path: str, *, referer: str | None = None) -> dict[str, Any]:
        self._bootstrap()
        headers = {"Referer": referer or f"{NSE_HOME}/"}
        response = self._client.get(f"{NSE_HOME}{path}", headers=headers)
        response.raise_for_status()
        return response.json()

    def get_bytes(self, url: str, *, referer: str | None = None) -> bytes:
        self._bootstrap()
        headers = {"Referer": referer or f"{NSE_HOME}/"}
        response = self._client.get(url, headers=headers)
        response.raise_for_status()
        return response.content

    def fetch_live_bulk_deals(self, deal_type: str = "bulk") -> dict[str, Any]:
        return self.get_json(
            f"/api/snapshot-capital-market-largedeal?index=equities&type={deal_type}",
            referer=f"{NSE_HOME}/market-data/bulk-deals",
        )

    def fetch_bhavcopy_with_delivery(self, trade_date: date) -> pd.DataFrame:
        date_token = trade_date.strftime("%d%m%Y")
        url = f"{ARCHIVES_BASE}/products/content/sec_bhavdata_full_{date_token}.csv"
        content = self.get_bytes(url, referer=f"{NSE_HOME}/all-reports")
        frame = pd.read_csv(BytesIO(content))
        frame.columns = [name.replace(" ", "") for name in frame.columns]
        return frame

    def fetch_symbol_delivery_history(
        self,
        symbol: str,
        from_date: date,
        to_date: date,
    ) -> pd.DataFrame:
        payload = (
            "from={from_d}&to={to_d}&symbol={symbol}&type=deliverable&series=ALL&csv=true"
        ).format(
            from_d=from_date.strftime("%d-%m-%Y"),
            to_d=to_date.strftime("%d-%m-%Y"),
            symbol=symbol.upper(),
        )
        url = f"{NSE_HOME}/api/historicalOR/generateSecurityWiseHistoricalData?{payload}"
        content = self.get_bytes(url, referer=f"{NSE_HOME}/report-detail/eq_security")
        frame = pd.read_csv(BytesIO(content))
        frame.columns = [name.replace(" ", "") for name in frame.columns]
        return frame

    def fetch_historical_bulk_deals(self, from_date: date, to_date: date) -> pd.DataFrame:
        payload = (
            f"optionType=bulk_deals&from={from_date.strftime('%d-%m-%Y')}"
            f"&to={to_date.strftime('%d-%m-%Y')}&csv=true"
        )
        url = f"{NSE_HOME}/api/historicalOR/bulk-block-short-deals?{payload}"
        content = self.get_bytes(url, referer=NSE_HOME)
        frame = pd.read_csv(BytesIO(content))
        frame.columns = [name.replace(" ", "") for name in frame.columns]
        return frame

    def fetch_historical_block_deals(self, from_date: date, to_date: date) -> pd.DataFrame:
        payload = (
            f"optionType=block_deals&from={from_date.strftime('%d-%m-%Y')}"
            f"&to={to_date.strftime('%d-%m-%Y')}&csv=true"
        )
        url = f"{NSE_HOME}/api/historicalOR/bulk-block-short-deals?{payload}"
        content = self.get_bytes(url, referer=NSE_HOME)
        frame = pd.read_csv(BytesIO(content))
        frame.columns = [name.replace(" ", "") for name in frame.columns]
        return frame

    def close(self) -> None:
        self._client.close()


_nse_client: NSEClient | None = None


def get_nse_client() -> NSEClient:
    global _nse_client
    if _nse_client is None:
        _nse_client = NSEClient()
    return _nse_client
