"""
CLI utility to fetch and print Indian & global market indices.

Usage (from backend/ directory):
    python -m scripts.fetch_indices
    python -m scripts.fetch_indices --key nifty50
    python -m scripts.fetch_indices --stock RELIANCE
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# Allow running as: python -m scripts.fetch_indices
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.market_data import (  # noqa: E402
    fetch_index_by_key,
    fetch_market_snapshot,
    fetch_stock_quote,
)
from app.services.momentum import fetch_stock_momentum  # noqa: E402


def _print_json(data: object) -> None:
    if hasattr(data, "model_dump"):
        payload = data.model_dump(mode="json", by_alias=True)
    elif isinstance(data, list) and data and hasattr(data[0], "model_dump"):
        payload = [item.model_dump(mode="json", by_alias=True) for item in data]
    else:
        payload = data
    print(json.dumps(payload, indent=2, default=str))


def main() -> None:
    parser = argparse.ArgumentParser(description="Fetch market indices and stock quotes via yfinance")
    parser.add_argument("--key", help="Fetch a single index by key (e.g. nifty50, sp500)")
    parser.add_argument("--stock", help="Fetch a single stock quote (e.g. RELIANCE, TCS.NS)")
    parser.add_argument("--momentum", help="Fetch momentum score for a stock (e.g. RELIANCE)")
    args = parser.parse_args()

    if args.momentum:
        _print_json(fetch_stock_momentum(args.momentum))
        return

    if args.stock:
        _print_json(fetch_stock_quote(args.stock))
        return

    if args.key:
        quote = fetch_index_by_key(args.key)
        if quote is None:
            print(f"Unknown index key: {args.key}", file=sys.stderr)
            sys.exit(1)
        _print_json(quote)
        return

    _print_json(fetch_market_snapshot())


if __name__ == "__main__":
    main()
