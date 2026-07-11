import requests
from bs4 import BeautifulSoup
import whois

def scrape_site(url: str) -> dict:
    data = {}
    
    try:
        response = requests.get(url, timeout=10)
        soup = BeautifulSoup(response.text, "html.parser")
        data["title"] = soup.title.string if soup.title else "No title"
        data["text"] = soup.get_text()[:3000]
    except Exception as e:
        data["scrape_error"] = str(e)

    try:
        domain_info = whois.whois(url)
        data["domain_created"] = str(domain_info.creation_date)
        data["registrar"] = str(domain_info.registrar)
    except Exception as e:
        data["whois_error"] = str(e)

    return data