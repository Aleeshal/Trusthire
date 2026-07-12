import re
from datetime import datetime, timezone

SCAM_KEYWORDS = [
    "wire transfer", "processing fee", "registration fee", "training fee",
    "send your bank details", "telegram", "whatsapp only", "no interview needed",
    "urgent hiring", "limited slots", "pay to start", "advance payment",
    "western union", "gift card", "crypto payment"
]

def check_domain_age(domain_created_str, has_url):
    if not has_url:
        return None
    if not domain_created_str or domain_created_str in ("None", "null"):
        return {"ok": False, "text": "Could not determine domain registration date"}
    try:
        date_str = domain_created_str.strip("[]").split(",")[0].strip().strip("'\"")
        if "T" in date_str:
            created = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        else:
            created = datetime.strptime(date_str[:19], "%Y-%m-%d %H:%M:%S")
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        age_days = (datetime.now(timezone.utc) - created).days
        if age_days < 30:
            return {"ok": False, "text": f"Domain registered only {age_days} days ago"}
        elif age_days < 180:
            return {"ok": False, "text": f"Domain registered {age_days} days ago (relatively new)"}
        else:
            years = age_days // 365
            return {"ok": True, "text": f"Domain registered over {years if years else '<1'} year(s) ago"}
    except Exception:
        return {"ok": False, "text": "Could not parse domain registration date"}

def check_scam_keywords(text):
    if not text:
        return []
    found = []
    lower = text.lower()
    for kw in SCAM_KEYWORDS:
        if kw in lower:
            found.append({"ok": False, "text": f"Listing mentions '{kw}', a common scam pattern"})
    return found

def check_content_length(text):
    if not text or len(text.strip()) < 200:
        return {"ok": False, "text": "Job description is unusually short or vague"}
    return {"ok": True, "text": "Job description has reasonable detail"}

def generate_signals(scraped_data):
    signals = []
    has_url = bool(scraped_data.get("url_provided"))
    domain_signal = check_domain_age(scraped_data.get("domain_created"), has_url)
    if domain_signal:
        signals.append(domain_signal)
    signals.append(check_content_length(scraped_data.get("text", "")))
    signals.extend(check_scam_keywords(scraped_data.get("text", "")))
    if has_url and scraped_data.get("whois_error"):
        signals.append({"ok": False, "text": "Domain information could not be verified"})
    return signals
