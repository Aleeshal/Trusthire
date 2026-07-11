# TrustHire

An AI-powered tool to help job seekers identify potentially fraudulent or misleading job listings before applying.

## Overview

TrustHire analyzes job postings using web scraping and an LLM-based reasoning layer to flag red flags commonly associated with fake or scam job listings, such as vague descriptions, suspicious domain age, or unrealistic promises.

## Tech Stack

- Backend: Python, FastAPI
- Scraping: BeautifulSoup4
- Domain Verification: python-whois
- AI Layer: LLM-based analysis via OpenRouter (Mistral-7B)

## Status

Work in progress. Core modules (scraping, domain lookup, LLM integration scaffolding) are in place. Currently working on stabilizing the API response handling between the analyzer and the LLM backend.

## Setup

git clone https://github.com/Aleeshal/Trusthire.git
cd Trusthire
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

## Roadmap

- Finalize LLM response parsing
- Add scoring system for authenticity confidence
- Build simple frontend/API demo
- Add test coverage

## Author

Aleesha Ghazanfar - BS Computer Science, COMSATS University Islamabad
