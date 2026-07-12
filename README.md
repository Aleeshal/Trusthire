# TrustHire

An AI-powered tool that analyzes job listings for authenticity, helping job seekers identify scams before they apply.

**Live demo:** _pending deployment_
**Repo:** https://github.com/Aleeshal/Trusthire

---

## Overview

Job scam listings follow recognizable patterns — urgency, upfront payments, vague descriptions, brand-new domains. TrustHire combines **deterministic rule-based checks** with an **LLM reasoning layer** to score any job listing's authenticity, rather than relying on a single AI call that can be wrong, slow, or unavailable.

This project was built to explore a real engineering problem: how do you build an AI feature that's actually *reliable*, not just a demo that works when the API happens to respond correctly?

---

## Why a hybrid architecture (not just "ask the AI")

Early versions of this project called an LLM directly and trusted whatever it returned. In practice, that broke constantly:

- Free-tier models get rate-limited or deprecated without notice
- LLMs don't reliably return clean JSON, even when explicitly told to
- A single AI opinion isn't explainable or auditable — "trust me" isn't a real signal
- Some things (domain age, known scam phrases) don't need AI at all — they're just facts

So TrustHire uses a **three-layer pipeline**:

```
                 Job Listing (URL or text)
                          |
                          v
              +------------------------+
              |   Scraper / Extractor   |  -> pulls page text + WHOIS domain data
              +------------------------+
                          |
          +---------------+----------------+
          v                                 v
+----------------------+        +-----------------------+
|  Rule-Based Signals    |        |   LLM Reasoning Layer  |
|  (deterministic)       |        |   (OpenRouter API)     |
|  - domain age           |        |  - semantic red flags  |
|  - scam keyword match   |        |  - context judgment    |
|  - content completeness |        |  - free-text reasoning |
+----------------------+        +-----------------------+
          |                                 |
          +---------------+----------------+
                          v
              +------------------------+
              |   Weighted Score Merge  |  -> 50% rules + 50% LLM
              +------------------------+
                          |
                          v
              +------------------------+
              |  Verdict (from score)   |  -> Likely genuine / Use caution / High risk
              +------------------------+
```

**Key design decision:** if the LLM call fails for any reason (rate limit, bad JSON, network error), the system **falls back to rule-based scoring alone** instead of crashing or returning nothing. The verdict label is always derived mathematically from the final score, never taken as a separate, potentially contradictory field from the LLM.

---

## Features

- **Dual input modes** — analyze by URL (scrapes + WHOIS lookup) or paste raw listing text
- **Deterministic red-flag detection** — known scam phrases, urgency language, upfront payment requests
- **Domain age verification** — via WHOIS, skipped fairly when unavailable (text-paste mode isn't penalized for lacking a domain)
- **Graceful AI degradation** — never crashes when the LLM is unavailable, falls back transparently
- **Input validation** — rejects malformed URLs and non-listing text before wasting an API call
- **Consistent scoring** — verdict labels are always mathematically derived from the score, eliminating contradictory results

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python, FastAPI |
| Scraping | BeautifulSoup4, Requests |
| Domain Intelligence | python-whois |
| AI Reasoning | OpenRouter API (free-tier LLM routing) |
| Frontend | React (Vite), Tailwind CSS v4 |
| Icons | Lucide React |

---

## Project Structure

```
trusthire/
├── app/
│   ├── main.py          # FastAPI entry point, request routing
│   ├── scraper.py        # URL scraping + WHOIS domain lookup
│   ├── signals.py        # Deterministic rule-based checks
│   ├── analyzer.py       # LLM call, JSON parsing, score merging
│   └── __init__.py
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # Main UI: input, gauge, results
│   │   ├── index.css      # Tailwind entry
│   │   └── main.jsx
│   └── vite.config.js
├── .env.example
├── requirements.txt
└── README.md
```

---

## Setup

**Backend:**
```bash
git clone https://github.com/Aleeshal/Trusthire.git
cd Trusthire
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## Known Limitations (honest scope)

- **JavaScript-rendered job boards** (e.g. React-based listing sites) can't be fully scraped by BeautifulSoup alone, since it doesn't execute JS. The tool detects this case and tells the user to paste the listing text directly instead of silently failing.
- **WHOIS privacy-protected domains** will show incomplete registration data even for legitimate companies. This is a known tradeoff of WHOIS-based checks generally, not a bug specific to this tool.
- **Free-tier LLM availability** varies. The app is built to degrade gracefully to rule-based scoring rather than fail when this happens.
- **Accuracy is not yet formally benchmarked** against a labeled dataset. This is on the roadmap below.

---

## Roadmap

- [ ] Build a labeled test set (real scam + real legitimate listings) to measure actual accuracy
- [ ] Add saved analysis history (requires persistent storage)
- [ ] Browser extension for inline scoring on job boards
- [ ] Headless browser scraping fallback for JS-rendered sites
- [ ] Deploy to free hosting (Vercel + Render)

---

## What this project demonstrates

- Designing for AI failure modes, not just the happy path
- Combining deterministic and probabilistic systems in one pipeline
- API integration, error handling, and structured output parsing
- Full-stack ownership: FastAPI backend, React frontend, CORS, environment config
- Honest technical documentation, including known limitations

---

## Author

**Aleesha Ghazanfar**
BS Computer Science, COMSATS University Islamabad — Class of 2027
