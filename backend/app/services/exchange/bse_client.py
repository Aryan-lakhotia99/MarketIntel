"""BSE India client — bulk/block deal ingestion (best-effort stub)."""

from __future__ import annotations

from datetime import date
from typing import Any

import httpx

BSE_HOME = "https://www.bseindia.com"

DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Referer": f"{BSE_HOME}/markets/equity/EQReports/bulk_deals.aspx",
    "Origin": BSE_HOME,
}


class BSEClient:
    """
    BSE endpoints are intermittently protected. This client returns parsed JSON
    when available and an empty payload otherwise so NSE data can still flow.
    """

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
        self._client.get(BSE_HOME)
        self._bootstrapped = True

    def fetch_live_bulk_deals(self) -> list[dict[str, Any]]:
        try:
            self._bootstrap()
            url = "https://api.bseindia.com/BseIndiaAPI/api/BulkDeal/w"
            response = self._client.get(url, params={"flag": "0"})
            if response.status_code != 200 or "application/json" not in response.headers.get(
                "content-type", ""
            ):
                return []
            payload = response.json()
            if isinstance(payload, list):
                return payload
            if isinstance(payload, dict):
                return payload.get("Table", []) or payload.get("data", [])
        except Exception:
            return []
        return []

    def fetch_delivery_bhavcopy(self, trade_date: date) -> list[dict[str, Any]]:
        # BSE delivery bhavcopy integration point for Step 2+.
        _ = trade_date
        return []

    def close(self) -> None:
        self._client.close()


_bse_client: BSEClient | None = None


def get_bse_client() -> BSEClient:
    global _bse_client
    if _bse_client is None:
        _bse_client = BSEClient()
    return _bse_client
