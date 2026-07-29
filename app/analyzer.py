import requests
import os
import json
import re
from dotenv import load_dotenv
from app.signals import generate_signals

load_dotenv()

def _extract_json(text):
    text = text.strip()
    fence_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if fence_match:
        text = fence_match.group(1)
    else:
        brace_match = re.search(r"\{.*\}", text, re.DOTALL)
        if brace_match:
            text = brace_match.group(0)
    return json.loads(text)

def _verdict_from_score(score):
    if score >= 75:
        return "Likely genuine"
    elif score >= 45:
        return "Use caution"
    else:
        return "High risk"

GEMINI_MODELS = [
    "gemini-3.5-flash-lite",  # newest GA lite model as of July 2026 - primary
    "gemini-2.5-flash-lite",  # still stable/documented - backup
]

def _call_llm(scraped_data):
    prompt = f"""You are a careful, conservative job scam analyst. Your default assumption is that a listing is legitimate. Only flag something as a red flag if the text CONCRETELY and SPECIFICALLY supports it — never invent a generic-sounding flag just to fill the response.

Do NOT flag: normal salary ranges (even wide ones), standard remote-work language, standard application instructions, or professional tone. Only flag genuine scam indicators: requests for payment or bank details, urgency pressure tactics, vague/unverifiable company identity, contact only via WhatsApp/Telegram, unrealistic pay for described role (e.g. $500/hr for entry-level), or requests for sensitive personal info (SSN, ID scans) before any interview.

If the listing reads as a normal, professionally written job posting, return an empty red_flags array and a high trust_score. Do not lower the score just because information is merely brief - only lower it for concrete evidence of deception.

trust_score must be an integer from 0 to 100 (0 = certain scam, 100 = fully trustworthy). Do not use any other scale.

Website data:
Title: {scraped_data.get('title')}
Domain Created: {scraped_data.get('domain_created')}
Registrar: {scraped_data.get('registrar')}
Content: {scraped_data.get('text', '')[:2500]}

Respond with ONLY valid JSON, no markdown, no explanation outside the JSON, in exactly this format:
{{"trust_score": 7, "summary": "2-3 sentence plain-language explanation of why you scored it this way, written for the job seeker reading it", "red_flags": ["flag1 with brief quoted evidence"]}}"""

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return {"error": "GEMINI_API_KEY is not set in the environment"}

    errors = []
    rate_limited_count = 0
    attempted = 0
    for model in GEMINI_MODELS:
        attempted += 1
        try:
            response = requests.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                headers={"Content-Type": "application/json"},
                params={"key": api_key},
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {
                        "temperature": 0,
                        "maxOutputTokens": 600,
                        "responseMimeType": "application/json",
                        "responseSchema": {
                            "type": "OBJECT",
                            "properties": {
                                "trust_score": {"type": "INTEGER", "description": "Integer from 0 to 100. 0 means certain scam, 100 means fully trustworthy."},
                                "summary": {"type": "STRING"},
                                "red_flags": {"type": "ARRAY", "items": {"type": "STRING"}},
                            },
                            "required": ["trust_score", "summary", "red_flags"],
                        },
                    },
                },
                timeout=20,
            )
        except requests.RequestException as e:
            errors.append(f"Network error ({model}): {e}")
            continue

        if response.status_code == 429:
            rate_limited_count += 1
            errors.append(f"429 rate-limited ({model})")
            continue

        if response.status_code >= 500:
            errors.append(f"status {response.status_code} ({model}): {response.text[:150]}")
            continue

        if response.status_code != 200:
            errors.append(f"status {response.status_code} ({model}): {response.text[:150]}")
            continue

        result = response.json()
        candidates = result.get("candidates", [])
        if not candidates:
            # Can happen if the safety filter blocked the response entirely.
            block_reason = result.get("promptFeedback", {}).get("blockReason", "unknown")
            errors.append(f"no candidates ({model}), reason: {block_reason}")
            continue

        parts = candidates[0].get("content", {}).get("parts", [])
        content = parts[0].get("text", "") if parts else ""
        try:
            return _extract_json(content)
        except (json.JSONDecodeError, AttributeError) as e:
            errors.append(f"bad JSON ({model}): {e}")
            continue

    if rate_limited_count == attempted and attempted > 0:
        return {"error": "Gemini free-tier daily quota exhausted for all models. This resets daily."}

    return {"error": "; ".join(errors) if errors else "All Gemini models failed"}

def analyze_site(scraped_data):
    # If there's essentially nothing to read - no content and no domain info -
    # this isn't a low-trust listing, it's an unreadable page. Say that plainly
    # instead of scoring it like a real scam.
    has_content = len(scraped_data.get("text", "").strip()) >= 50
    if not has_content:
        return {
            "trust_score": None,
            "verdict": "Could not verify",
            "signals": [
                {"ok": False, "text": "No readable content found at this URL — it may be a search page, require login, or block automated access rather than being a specific job listing."}
            ],
            "source": "insufficient data",
        }

    rule_signals = generate_signals(scraped_data)
    llm_result = _call_llm(scraped_data)

    if "error" in llm_result:
        passed = sum(1 for s in rule_signals if s["ok"])
        total = max(len(rule_signals), 1)
        fallback_score = round((passed / total) * 100)
        return {
            "trust_score": fallback_score,
            "signals": rule_signals,
            "verdict": _verdict_from_score(fallback_score),
            "llm_error": llm_result["error"],
            "source": "rule-based fallback (AI analysis unavailable)",
        }

    print(f"[DEBUG] Parsed Gemini result: {llm_result}")

    llm_score = max(0, min(100, llm_result.get("trust_score", 50)))
    rule_passed = sum(1 for s in rule_signals if s["ok"])
    rule_total = max(len(rule_signals), 1)
    rule_score = (rule_passed / rule_total) * 100
    final_score = max(0, min(100, round((llm_score * 0.35) + (rule_score * 0.65))))

    combined_signals = rule_signals + [
        {"ok": False, "text": flag} for flag in llm_result.get("red_flags", [])
    ]

    return {
        "trust_score": final_score,
        "verdict": _verdict_from_score(final_score),
        "signals": combined_signals,
        "ai_summary": llm_result.get("summary"),
        "source": "AI + rule-based analysis",
    }
