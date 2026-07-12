from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from app.scraper import scrape_site
from app.analyzer import analyze_site

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalyzeRequest(BaseModel):
    url: Optional[str] = None
    text: Optional[str] = None

@app.get("/")
def read_root():
    return {"message": "TrustHire API is running!"}

@app.post("/analyze")
def analyze(request: AnalyzeRequest):
    if request.url:
        scraped = scrape_site(request.url)
        scraped["url_provided"] = True
    elif request.text:
        scraped = {"title": "Pasted listing", "text": request.text, "domain_created": None, "registrar": None, "url_provided": False}
    else:
        return {"error": "Provide either a url or text"}
    return analyze_site(scraped)
