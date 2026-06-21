import sys
import os

# Adjust path to import from app
scratch_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(scratch_dir)
sys.path.append(backend_dir)

import yfinance as yf
from app.services.market_data import fetch_stock_quotes, YF_SESSION

def main():
    print("Testing yf.download directly for GE and INTC...")
    try:
        df = yf.download(["GE", "INTC"], period="1y", interval="1d", group_by="ticker", session=YF_SESSION)
        print("Success! Dataframe columns:", df.columns)
        if not df.empty:
            for t in ["GE", "INTC"]:
                if isinstance(df.columns, os.sys.modules['pandas'].MultiIndex):
                    sym_df = df[t].dropna(subset=["Close"])
                else:
                    sym_df = df.dropna(subset=["Close"])
                print(f"{t} live close price from yf.download: {sym_df.iloc[-1]['Close']}")
    except Exception as e:
        print("yf.download failed:", e)

    print("\nTesting fetch_stock_quotes function...")
    try:
        quotes = fetch_stock_quotes(["GE", "INTC"])
        for q in quotes:
            print(f"{q.symbol}: price={q.price}, change_percent={q.change_percent}%")
    except Exception as e:
        print("fetch_stock_quotes failed:", e)

if __name__ == "__main__":
    main()
