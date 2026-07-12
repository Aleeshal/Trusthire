import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse
import whois

def scrape_site(url: str) -> dict:
    data = {}
    try:
        response = requests.get(
            url,
            timeout=10,
            headers={"User-Agent": "Mozilla/5.0 (compatible; TrustHireBot/1.0)"},
        )
        soup = BeautifulSoup(response.text, "html.parser")
        data["title"] = soup.title.string.strip() if soup.title and soup.title.string else "No title"
        text = soup.get_text(separator=" ", strip=True)
        data["text"] = text[:3000]
        if len(text.strip()) < 100:
            data["js_rendered_warning"] = True
    except Exception as e:
        data["scrape_error"] = str(e)
        data["text"] = ""

    try:
        domain = urlparse(url).netloc
        if domain.startswith("www."):
            domain = domain[4:]
        domain_info = whois.whois(domain)
        data["domain_created"] = str(domain_info.creation_date)
        data["registrar"] = str(domain_info.registrar)
    except Exception as e:
        data["whois_error"] = str(e)

    return data
