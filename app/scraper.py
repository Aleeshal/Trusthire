import json
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse
import whois

BOILERPLATE_TAGS = ["nav", "footer", "header", "script", "style", "form", "noscript", "svg", "aside"]


def _clean_html_text(raw_html: str) -> str:
    """Strip HTML tags from a field (JSON-LD description often contains inline HTML)."""
    if not raw_html:
        return ""
    return BeautifulSoup(raw_html, "html.parser").get_text(separator=" ", strip=True)


def _find_job_posting(node):
    """Recursively search a parsed JSON-LD object/array for a JobPosting entity."""
    if isinstance(node, dict):
        types = node.get("@type")
        if types == "JobPosting" or (isinstance(types, list) and "JobPosting" in types):
            return node
        # schema.org graphs nest entities under @graph
        if "@graph" in node:
            found = _find_job_posting(node["@graph"])
            if found:
                return found
        for value in node.values():
            found = _find_job_posting(value)
            if found:
                return found
    elif isinstance(node, list):
        for item in node:
            found = _find_job_posting(item)
            if found:
                return found
    return None


def _extract_json_ld_job(soup) -> dict | None:
    for tag in soup.find_all("script", type="application/ld+json"):
        if not tag.string:
            continue
        try:
            parsed = json.loads(tag.string)
        except (json.JSONDecodeError, TypeError):
            continue
        job = _find_job_posting(parsed)
        if job:
            org = job.get("hiringOrganization")
            org_name = org.get("name") if isinstance(org, dict) else org
            return {
                "title": job.get("title"),
                "text": _clean_html_text(job.get("description", "")),
                "date_posted": job.get("datePosted"),
                "valid_through": job.get("validThrough"),
                "hiring_organization": org_name,
                "employment_type": job.get("employmentType"),
            }
    return None


def _extract_boilerplate_stripped_text(soup) -> str:
    """Fallback extraction: remove nav/footer/forms/etc before grabbing text, so
    leftover menu/city-list junk from JS-rendered shells doesn't get scored as
    real job content."""
    stripped = BeautifulSoup(str(soup), "html.parser")
    for tag in stripped.find_all(BOILERPLATE_TAGS):
        tag.decompose()
    return stripped.get_text(separator=" ", strip=True)


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

        job_ld = _extract_json_ld_job(soup)
        if job_ld and len(job_ld["text"].strip()) >= 100:
            data["title"] = job_ld["title"] or data["title"]
            data["text"] = job_ld["text"][:5000]
            data["date_posted"] = job_ld["date_posted"]
            data["valid_through"] = job_ld["valid_through"]
            data["hiring_organization"] = job_ld["hiring_organization"]
            data["structured_data_found"] = True
        else:
            text = _extract_boilerplate_stripped_text(soup)
            data["text"] = text[:3000]
            data["structured_data_found"] = False
            # Under 150 chars of real content after stripping boilerplate almost
            # always means the page is a JS-rendered shell (SPA nav/forms/footer
            # with the actual listing loaded client-side).
            if len(text.strip()) < 150:
                data["js_rendered_warning"] = True
    except Exception as e:
        data["scrape_error"] = str(e)
        data["text"] = ""

    try:
        domain = urlparse(url).netloc
        if domain.startswith("www."):
            domain = domain[4:]
        data["domain"] = domain
        domain_info = whois.whois(domain)
        data["domain_created"] = str(domain_info.creation_date)
        data["registrar"] = str(domain_info.registrar)
    except Exception as e:
        data["whois_error"] = str(e)

    return data
