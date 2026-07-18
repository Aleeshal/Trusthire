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

FALLBACK_MODELS = [
    "meta-llama/llama-3.3-70b-instruct:free",
    "qwen/qwen-2.5-7b-instruct:free",
]

def _call_llm(scraped_data):
    prompt = f"""You are a careful, conservative job scam analyst. Your default assumption is that a listing is legitimate. Only flag something as a red flag if the text CONCRETELY and SPECIFICALLY supports it — never invent a generic-sounding flag just to fill the response.

Do NOT flag: normal salary ranges (even wide ones), standard remote-work language, standard application instructions, or professional tone. Only flag genuine scam indicators: requests for payment or bank details, urgency pressure tactics, vague/unverifiable company identity, contact only via WhatsApp/Telegram, unrealistic pay for described role (e.g. $500/hr for entry-level), or requests for sensitive personal info (SSN, ID scans) before any interview.

If the listing reads as a normal, professionally written job posting, return an empty red_flags array and a high trust_score. Do not lower the score just because information is merely brief - only lower it for concrete evidence of deception.

Website data:
Title: {scraped_data.get('title')}
Domain Created: {scraped_data.get('domain_created')}
Registrar: {scraped_data.get('registrar')}
Content: {scraped_data.get('text', '')[:2500]}

Respond with ONLY valid JSON, no markdown, no explanation outside the JSON, in exactly this format:
{{"trust_score": 7, "red_flags": ["flag1 with brief quoted evidence"]}}"""

    last_error = None
    for model in FALLBACK_MODELS:
        try:
            response = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {os.getenv('OPENROUTER_API_KEY')}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0,
                    "max_tokens": 600,
                    "reasoning": {"enabled": False},
                },
                timeout=20,
            )
        except requests.RequestException as e:
            last_error = f"Network error calling OpenRouter ({model}): {e}"
            continue

        # 429 (rate-limited) or 5xx means this specific model/provider is
        # unavailable right now - move on to the next candidate instead of
        # giving up on AI analysis entirely.
        if response.status_code == 429 or response.status_code >= 500:
            last_error = f"OpenRouter returned status {response.status_code} for {model}: {response.text[:200]}"
            continue

        if response.status_code != 200:
            last_error = f"OpenRouter returned status {response.status_code} for {model}: {response.text[:300]}"
            continue

        result = response.json()
        if "choices" not in result:
            last_error = f"Unexpected OpenRouter response for {model}: {result}"
            continue

        content = result["choices"][0]["message"].get("content", "")
        try:
            return _extract_json(content)
        except (json.JSONDecodeError, AttributeError) as e:
            last_error = f"Could not parse LLM output as JSON ({model}): {e}"
            continue

    return {"error": last_error or "All fallback models failed"}

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

    llm_score = llm_result.get("trust_score", 5) * 10
    rule_passed = sum(1 for s in rule_signals if s["ok"])
    rule_total = max(len(rule_signals), 1)
    rule_score = (rule_passed / rule_total) * 100
    final_score = round((llm_score * 0.35) + (rule_score * 0.65))

    combined_signals = rule_signals + [
        {"ok": False, "text": flag} for flag in llm_result.get("red_flags", [])
    ]

    return {
        "trust_score": final_score,
        "verdict": _verdict_from_score(final_score),
        "signals": combined_signals,
        "source": "AI + rule-based analysis",
    }
