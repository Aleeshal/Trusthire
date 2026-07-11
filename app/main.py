from fastapi import FastAPI
from pydantic import BaseModel
from app.scraper import scrape_site
from app.analyzer import analyze_site

app = FastAPI()

class URLRequest(BaseModel):
    url: str

@app.get("/")
def read_root():
    return {"message": "TrustHire API is running!"}

@app.post("/analyze")
def analyze(request: URLRequest):
    scraped = scrape_site(request.url)
    result = analyze_site(scraped)
    return {
        "url": request.url,
        "result": result
    }