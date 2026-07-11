import requests
import os
import json
from dotenv import load_dotenv

load_dotenv()

def analyze_site(scraped_data: dict) -> dict:
    prompt = f"""
    You are a job scam detector. Analyze this website data and give:
    1. A trust score out of 10
    2. Red flags you noticed
    3. A short verdict: Legit, Suspicious, or Scam

    Website data:
    Title: {scraped_data.get('title')}
    Domain Created: {scraped_data.get('domain_created')}
    Registrar: {scraped_data.get('registrar')}
    Content: {scraped_data.get('text')}

    Respond in this exact JSON format:
    {{
        "trust_score": 7,
        "red_flags": ["flag1", "flag2"],
        "verdict": "Legit"
    }}
    """

    response = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {os.getenv('OPENROUTER_API_KEY')}",
            "Content-Type": "application/json"
        },
        json={
            "model": "mistralai/mistral-7b-instruct:free",
            "messages": [{"role": "user", "content": prompt}]
        }
    )

    result = response.json()
    print("OpenRouter response:", result)
    text = result["choices"][0]["message"]["content"]
    return json.loads(text)