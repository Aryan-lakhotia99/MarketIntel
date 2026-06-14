import urllib.request
import xml.etree.ElementTree as ET
import urllib.parse

symbol = "RELIANCE"
# Query specifically for symbol + Moneycontrol or Economic Times
query = f"{symbol} (site:economictimes.indiatimes.com OR site:moneycontrol.com)"
url = f"https://news.google.com/rss/search?q={urllib.parse.quote(query)}&hl=en-IN&gl=IN&ceid=IN:en"

print(f"URL: {url}")
try:
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response:
        xml_data = response.read()
    
    root = ET.fromstring(xml_data)
    items = root.findall('.//item')
    print(f"Found {len(items)} articles.")
    for item in items[:5]:
        title = item.find('title').text
        link = item.find('link').text
        pub_date = item.find('pubDate').text
        source = item.find('source').text
        print(f"- [{source}] {title}")
        print(f"  Link: {link}")
except Exception as e:
    print(f"Error: {e}")
