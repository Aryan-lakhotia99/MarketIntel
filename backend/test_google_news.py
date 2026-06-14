import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
from datetime import datetime
import json

def fetch_google_news_rss(query: str) -> list[dict]:
    url = f"https://news.google.com/rss/search?q={urllib.parse.quote(query)}&hl=en-IN&gl=IN&ceid=IN:en"
    items_list = []
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5.0) as response:
            xml_data = response.read()
        
        root = ET.fromstring(xml_data)
        items = root.findall('.//item')
        for item in items[:25]:
            title = item.find('title').text or ""
            link = item.find('link').text or ""
            pub_date_str = item.find('pubDate').text or ""
            source = item.find('source').text or "Google News"
            
            clean_title = title
            if " - " in title:
                parts = title.rsplit(" - ", 1)
                clean_title = parts[0]
                source = parts[1]
                
            items_list.append({
                "title": clean_title,
                "link": link,
                "pubDate": pub_date_str,
                "source": source
            })
    except Exception as e:
        print(f"Error fetching Google News RSS for query '{query}': {e}")
    return items_list

# Test query
query = "nifty OR sensex OR stock market OR share market OR stocks to watch (site:economictimes.indiatimes.com OR site:moneycontrol.com OR site:livemint.com)"
news = fetch_google_news_rss(query)
print(f"Fetched {len(news)} items.")
for idx, item in enumerate(news[:10]):
    print(f"{idx+1}. [{item['source']}] {item['title']} ({item['pubDate']})")
