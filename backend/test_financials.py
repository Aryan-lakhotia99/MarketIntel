import yfinance as yf

symbols = ["AAPL", "RELIANCE.NS"]
for sym in symbols:
    print(f"\n--- Ticker: {sym} ---")
    try:
        t = yf.Ticker(sym)
        info = t.info
        print(f"trailingPE: {info.get('trailingPE')}")
        print(f"forwardPE: {info.get('forwardPE')}")
        print(f"returnOnEquity: {info.get('returnOnEquity')}")
        print(f"returnOnAssets: {info.get('returnOnAssets')}")
        print(f"operatingMargins: {info.get('operatingMargins')}")
        print(f"ebitdaMargins: {info.get('ebitdaMargins')}")
        print(f"grossMargins: {info.get('grossMargins')}")
        print(f"revenueGrowth: {info.get('revenueGrowth')}")
        print(f"earningsGrowth: {info.get('earningsGrowth')}")
        print(f"heldPercentInsiders: {info.get('heldPercentInsiders')}")
    except Exception as e:
        print(f"Error: {e}")
