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
    "openrouter/free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "qwen/qwen-2.5-7b-instruct:free",
]

def _call_llm(scraped_data):
    prompt = f"""You are a job scam detector. Analyze this website data and respond with ONLY valid JSON, no markdown, no explanation outside the JSON.

Website data:
Title: {scraped_data.get('title')}
Domain Created: {scraped_data.get('domain_created')}
Registrar: {scraped_data.get('registrar')}
Content: {scraped_data.get('text', '')[:2500]}

Respond in exactly this JSON format:
{{"trust_score": 7, "red_flags": ["flag1", "flag2"]}}"""

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
                    "temperature": 0.2,
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
    final_score = round((llm_score * 0.5) + (rule_score * 0.5))

    combined_signals = rule_signals + [
        {"ok": False, "text": flag} for flag in llm_result.get("red_flags", [])
    ]

    return {
        "trust_score": final_score,
        "verdict": _verdict_from_score(final_score),
        "signals": combined_signals,
        "source": "AI + rule-based analysis",
    }
