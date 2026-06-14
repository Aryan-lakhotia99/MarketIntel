from datetime import datetime
import uuid
import yfinance as yf
import pandas as pd
from fastapi import APIRouter
from app.schemas.market import NewsItem, NewsTag
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
import email.utils
import re

router = APIRouter(prefix="/news", tags=["news"])

# Mock news as a fallback
CATALYST_FALLBACK = [
    {
        "id": "c1",
        "symbol": "RELIANCE",
        "headline": "Promoter entity acquires 0.8% stake via open market — debt-free balance sheet reaffirmed",
        "source": "Economic Times",
        "sourceUrl": "https://economictimes.indiatimes.com/markets/stocks/news",
        "time": "12m ago",
        "tag": "SUPER POSITIVE",
    },
    {
        "id": "c2",
        "symbol": "LT",
        "headline": "L&T wins ₹4,200 Cr metro rail order in Middle East — order book expands 11% YoY",
        "source": "Moneycontrol",
        "sourceUrl": "https://www.moneycontrol.com/news/business/stocks/",
        "time": "28m ago",
        "tag": "POSITIVE",
    },
    {
        "id": "c3",
        "symbol": "TITAN",
        "headline": "Tanishq same-store sales grow 18% in Q1 — management guides double-digit growth",
        "source": "Economic Times",
        "sourceUrl": "https://economictimes.indiatimes.com/markets/stocks/news",
        "time": "45m ago",
        "tag": "POSITIVE",
    },
    {
        "id": "c4",
        "symbol": "HDFCBANK",
        "headline": "Net interest margin expands 12bps QoQ — asset quality stable at 1.2% GNPA",
        "source": "Exchange Filing",
        "sourceUrl": "https://www.nseindia.com/companies-listing/corporate-filings-announcements",
        "time": "1h ago",
        "tag": "POSITIVE",
    },
    {
        "id": "c5",
        "symbol": "ADANIPORTS",
        "headline": "Mundra port volume hits record high — capacity expansion on track for FY27",
        "source": "Economic Times",
        "sourceUrl": "https://economictimes.indiatimes.com/markets/stocks/news",
        "time": "1h ago",
        "tag": "POSITIVE",
    }
]

RISK_FALLBACK = [
    {
        "id": "r1",
        "symbol": "YESBANK",
        "headline": "Forensic audit initiated on related-party transactions — regulator seeks clarification",
        "source": "Economic Times",
        "sourceUrl": "https://economictimes.indiatimes.com/markets/stocks/news",
        "time": "8m ago",
        "tag": "CRITICAL BAD",
    },
    {
        "id": "r2",
        "symbol": "ETERNAL",
        "headline": "EBITDA margin contracts 240bps — quick-commerce burn rate raises concerns",
        "source": "Moneycontrol",
        "sourceUrl": "https://www.moneycontrol.com/news/business/stocks/",
        "time": "22m ago",
        "tag": "BAD",
    },
    {
        "id": "r3",
        "symbol": "PAYTM",
        "headline": "Promoter pledges additional 3.2% stake — total pledge now at 18.7%",
        "source": "Exchange Filing",
        "sourceUrl": "https://www.nseindia.com/companies-listing/corporate-filings-announcements",
        "time": "38m ago",
        "tag": "CRITICAL BAD",
    },
    {
        "id": "r4",
        "symbol": "INFY",
        "headline": "Q1 revenue misses street estimates by 2.1% — attrition ticks up to 14.2%",
        "source": "Moneycontrol",
        "sourceUrl": "https://www.moneycontrol.com/news/business/stocks/",
        "time": "55m ago",
        "tag": "BAD",
    },
    {
        "id": "r5",
        "symbol": "SUZLON",
        "headline": "SEBI imposes ₹2.5 Cr penalty for disclosure lapses in FY24 annual report",
        "source": "Economic Times",
        "sourceUrl": "https://economictimes.indiatimes.com/markets/stocks/news",
        "time": "1h ago",
        "tag": "CRITICAL BAD",
    }
]

def classify_headline(title: str) -> NewsTag:
    title_lower = title.lower()
    super_pos_words = ["record high", "blockbuster", "surges", "soars", "double-digit", "multi-year high", "skyrockets", "acquire"]
    pos_words = ["win", "profit", "rise", "grow", "gain", "expand", "buy", "order", "positive", "partnership", "invests", "up", "contract", "bull", "rebound"]
    crit_bad_words = ["fraud", "forensic", "scam", "regulator action", "sebi penalty", "crash", "plunge", "default", "bankruptcy", "probe", "investigate"]
    bad_words = ["loss", "decline", "down", "miss", "penalty", "sebi", "audit", "pledge", "concern", "bad", "contracts", "fall", "drop", "investigation", "sell"]
    
    if any(w in title_lower for w in super_pos_words):
        return NewsTag.SUPER_POSITIVE
    if any(w in title_lower for w in crit_bad_words):
        return NewsTag.CRITICAL_BAD
    if any(w in title_lower for w in pos_words):
        return NewsTag.POSITIVE
    if any(w in title_lower for w in bad_words):
        return NewsTag.BAD
    return NewsTag.NEUTRAL

def format_time_ago(publish_time: int) -> str:
    diff = datetime.now().timestamp() - publish_time
    if diff < 60:
        return "Just now"
    mins = int(diff // 60)
    if mins < 60:
        return f"{mins}m ago"
    hours = int(mins // 60)
    if hours < 24:
        return f"{hours}h ago"
    days = int(hours // 24)
    return f"{days}d ago"

MAJOR_SYMBOLS = [
    "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "SBIN", "BHARTIARTL",
    "LTM", "LTIM", "HINDUNILVR", "ITC", "LT", "AXISBANK", "KOTAKBANK", "MARUTI",
    "ADANIENT", "ADANIPORTS", "BAJFINANCE", "BAJAJFINSV", "SUNPHARMA", "TITAN",
    "ULTRACEMCO", "JSWSTEEL", "TATASTEEL", "NTPC", "POWERGRID", "ONGC", "COALINDIA",
    "TMPV", "TATAMOTORS", "NESTLEIND", "GRASIM", "HINDALCO", "TECHM", "WIPRO",
    "HDFCLIFE", "SBILIFE", "ADANIPOWER", "HAL", "BEL", "ETERNAL", "ZOMATO", "PAYTM", "YESBANK", "SUZLON"
]

def find_matching_symbol(title: str) -> str:
    title_upper = title.upper()
    for symbol in MAJOR_SYMBOLS:
        pattern = rf"\b{re.escape(symbol)}\b"
        if re.search(pattern, title_upper):
            # Normalize old tickers to new active ones for catalog mapping
            if symbol == "LTIM":
                return "LTM"
            if symbol == "TATAMOTORS":
                return "TMPV"
            if symbol == "ZOMATO":
                return "ETERNAL"
            return symbol
    
    if "NIFTY" in title_upper or "SENSEX" in title_upper or "STOCK MARKET" in title_upper or "SHARE MARKET" in title_upper:
        return "MARKET"
    if "OIL" in title_upper or "CRUDE" in title_upper:
        return "CL=F"
    if "GOLD" in title_upper:
        return "GC=F"
    if "SILVER" in title_upper:
        return "SI=F"
    
    name_mappings = {
        "TATA": "TATASTEEL",
        "ADANI": "ADANIENT",
        "AMBANI": "RELIANCE",
        "BIRLA": "GRASIM",
        "VEDANTA": "HINDALCO",
        "INFOSYS": "INFY",
    }
    for k, v in name_mappings.items():
        if k in title_upper:
            return v
            
    return "MARKET"

def fetch_google_news_rss(query: str) -> list[dict]:
    url = f"https://news.google.com/rss/search?q={urllib.parse.quote(query)}&hl=en-IN&gl=IN&ceid=IN:en"
    items_list = []
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5.0) as response:
            xml_data = response.read()
        
        root = ET.fromstring(xml_data)
        items = root.findall('.//item')
        for item in items:
            title = item.find('title').text or ""
            link = item.find('link').text or ""
            pub_date_str = item.find('pubDate').text or ""
            source = item.find('source').text or "Google News"
            
            clean_title = title
            if " - " in title:
                parts = title.rsplit(" - ", 1)
                clean_title = parts[0]
                source = parts[1]
                
            pub_time = 0
            if pub_date_str:
                try:
                    dt = email.utils.parsedate_to_datetime(pub_date_str)
                    pub_time = int(dt.timestamp())
                except Exception:
                    pub_time = int(datetime.now().timestamp())
                
            items_list.append({
                "title": clean_title,
                "link": link,
                "pub_time": pub_time,
                "source": source
            })
    except Exception as e:
        print(f"Error fetching Google News RSS for query '{query}': {e}")
    return items_list

@router.get("", response_model=dict[str, list[NewsItem]])
def get_live_news() -> dict[str, list[NewsItem]]:
    queries = [
        "nifty OR sensex OR stock market OR share market OR stocks to watch (site:economictimes.indiatimes.com OR site:moneycontrol.com)",
        "global markets OR crude oil OR gold price OR rupee OR block deals OR bulk deals (site:economictimes.indiatimes.com OR site:moneycontrol.com)"
    ]
    
    articles = []
    seen_links = set()
    
    for q in queries:
        items = fetch_google_news_rss(q)
        for item in items:
            link = item.get("link", "")
            if link and link not in seen_links:
                seen_links.add(link)
                articles.append(item)
                
    articles.sort(key=lambda x: x.get("pub_time", 0), reverse=True)
    
    catalysts: list[NewsItem] = []
    risks: list[NewsItem] = []
    
    for item in articles:
        title = item.get("title", "")
        link = item.get("link", "")
        source = item.get("source", "Market News")
        pub_time = item.get("pub_time", 0)
        
        if not title or not link:
            continue
            
        tag = classify_headline(title)
        symbol = find_matching_symbol(title)
        
        news_item = NewsItem(
            id=str(uuid.uuid4()),
            symbol=symbol,
            headline=title,
            source=source,
            sourceUrl=link,
            time=format_time_ago(pub_time) if pub_time else "1h ago",
            tag=tag
        )
        
        if tag in (NewsTag.BAD, NewsTag.CRITICAL_BAD):
            risks.append(news_item)
        else:
            catalysts.append(news_item)

    # Dynamic time generation for fallback in case of complete internet/API failure
    now_ts = datetime.now().timestamp()
    if not catalysts:
        catalysts = []
        for i, item in enumerate(CATALYST_FALLBACK):
            offset_mins = [12, 28, 45, 60, 75][i % 5]
            time_str = format_time_ago(int(now_ts - offset_mins * 60))
            item_copy = item.copy()
            item_copy["time"] = time_str
            catalysts.append(NewsItem(**item_copy))

    if not risks:
        risks = []
        for i, item in enumerate(RISK_FALLBACK):
            offset_mins = [8, 22, 38, 55, 65][i % 5]
            time_str = format_time_ago(int(now_ts - offset_mins * 60))
            item_copy = item.copy()
            item_copy["time"] = time_str
            risks.append(NewsItem(**item_copy))

    return {
        "catalysts": catalysts[:10],
        "risks": risks[:10]
    }
