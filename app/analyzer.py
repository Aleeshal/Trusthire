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

def _call_llm(scraped_data):
    prompt = f"""You are a job scam detector. Analyze this website data and respond with ONLY valid JSON, no markdown, no explanation outside the JSON.

Website data:
Title: {scraped_data.get('title')}
Domain Created: {scraped_data.get('domain_created')}
Registrar: {scraped_data.get('registrar')}
Content: {scraped_data.get('text', '')[:2500]}

Respond in exactly this JSON format:
{{"trust_score": 7, "red_flags": ["flag1", "flag2"], "verdict": "Legit"}}"""

    try:
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {os.getenv('OPENROUTER_API_KEY')}",
                "Content-Type": "application/json",
            },
            json={
                "model": "openrouter/free",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.2,
            },
            timeout=20,
        )
    except requests.RequestException as e:
        return {"error": f"Network error calling OpenRouter: {e}"}

    if response.status_code != 200:
        return {"error": f"OpenRouter returned status {response.status_code}: {response.text[:300]}"}

    result = response.json()
    if "choices" not in result:
        return {"error": f"Unexpected OpenRouter response: {result}"}

    content = result["choices"][0]["message"]["content"]
    try:
        return _extract_json(content)
    except (json.JSONDecodeError, AttributeError) as e:
        return {"error": f"Could not parse LLM output as JSON: {e}", "raw": content}

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
            "verdict": "Use caution" if fallback_score < 70 else "Likely genuine",
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
        "verdict": llm_result.get("verdict", "Unknown"),
        "signals": combined_signals,
        "source": "AI + rule-based analysis",
    }
