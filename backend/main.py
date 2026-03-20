import requests
import math
import json
import hashlib
import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List

app = FastAPI(title="AI Research Databank API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

USERS_FILE = "users.json"

# ============================================================
# AUTH
# ============================================================
def load_users():
    if Path(USERS_FILE).exists():
        with open(USERS_FILE) as f:
            return json.load(f)
    return {}

def save_users(users):
    with open(USERS_FILE, "w") as f:
        json.dump(users, f, indent=2)

def hash_pw(password):
    return hashlib.sha256(password.encode()).hexdigest()

class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    password: str
    persona: str

class SearchRequest(BaseModel):
    query: str
    persona: str

class RelatedRequest(BaseModel):
    author_id: Optional[str] = None
    s2_id: Optional[str] = None

@app.post("/auth/login")
def login(req: LoginRequest):
    users = load_users()
    u = users.get(req.username)
    if u and u["password"] == hash_pw(req.password):
        return {"username": req.username, "persona": u["persona"]}
    raise HTTPException(status_code=401, detail="Invalid username or password")

@app.post("/auth/register")
def register(req: RegisterRequest):
    users = load_users()
    if req.username in users:
        raise HTTPException(status_code=409, detail="Username already taken")
    users[req.username] = {"password": hash_pw(req.password), "persona": req.persona}
    save_users(users)
    return {"success": True}

# ============================================================
# SEMANTIC SCHOLAR
# ============================================================
def get_semantic_scholar(arxiv_id):
    try:
        fields = "citationCount,influentialCitationCount,authors.hIndex,authors.name,authors.authorId,publicationDate,tldr,paperId"
        url = f"https://api.semanticscholar.org/graph/v1/paper/ArXiv:{arxiv_id}?fields={fields}"
        r = requests.get(url, timeout=8)
        if r.status_code == 200:
            return r.json()
    except Exception:
        pass
    return None

def get_author_top_papers(author_id: str, limit: int = 4):
    try:
        fields = "title,year,citationCount,externalIds"
        url = f"https://api.semanticscholar.org/graph/v1/author/{author_id}/papers?fields={fields}&limit=20"
        r = requests.get(url, timeout=8)
        if r.status_code == 200:
            papers = r.json().get("data", [])
            papers.sort(key=lambda x: x.get("citationCount", 0), reverse=True)
            return papers[:limit]
    except Exception:
        pass
    return []

def get_similar_papers(s2_paper_id: str, limit: int = 4):
    try:
        fields = "title,year,citationCount,externalIds"
        url = f"https://api.semanticscholar.org/recommendations/v1/papers/forpaper/{s2_paper_id}?fields={fields}&limit={limit}"
        r = requests.get(url, timeout=8)
        if r.status_code == 200:
            return r.json().get("recommendedPapers", [])
    except Exception:
        pass
    return []

# ============================================================
# PAPERS WITH CODE
# ============================================================
def get_pwc_data(arxiv_id):
    try:
        url = f"https://paperswithcode.com/api/v1/papers/?arxiv_id={arxiv_id}"
        r = requests.get(url, timeout=6)
        if r.status_code == 200:
            results = r.json().get("results", [])
            if results:
                repos = results[0].get("repositories", [])
                return {
                    "has_code": True,
                    "count": len(repos),
                    "stars": sum(repo.get("stars", 0) for repo in repos),
                }
    except Exception:
        pass
    return {"has_code": False, "count": 0, "stars": 0}

# ============================================================
# SCORING ENGINE
# ============================================================
def keyword_relevance_score(title, abstract, query):
    if not query:
        return 0.0
    keywords = set(query.lower().split())
    if not keywords:
        return 0.0
    title_words = set(title.lower().split())
    abstract_words = set(abstract.lower().split())
    title_hits = len(keywords & title_words)
    abstract_hits = len(keywords & abstract_words)
    frac = (title_hits * 3 + abstract_hits) / (len(keywords) * 4)
    return round(min(frac, 1.0) * 4.0, 2)

def calculate_relevance_score(paper, persona, query=""):
    citations = paper.get("Citations", 0)
    influential = paper.get("Influential", 0)
    h_indices = paper.get("h_indices") or [0]
    max_h = max(h_indices)
    days_old = paper.get("days_old", 365)
    has_code = paper["pwc"]["has_code"]
    stars = paper["pwc"]["stars"]

    kw_score = keyword_relevance_score(paper.get("Title", ""), paper.get("Abstract", ""), query)

    citation_raw = min(math.log1p(citations) * 1.4, 5.0)
    influential_raw = min(math.log1p(influential) * 2.2, 4.0)
    author_raw = min(max_h * 0.09, 3.0)
    code_raw = min(math.log1p(stars) * 0.28, 1.5) if has_code else 0.0

    if persona == "Researcher":
        persona_quality = (
            citation_raw * 0.7 +
            influential_raw * 1.5 +
            author_raw * 1.3 +
            code_raw * 0.3
        )
    elif persona == "ML Engineer":
        persona_quality = (
            citation_raw * 0.8 +
            influential_raw * 0.8 +
            author_raw * 0.5 +
            code_raw * 2.0 +
            (1.5 if has_code and stars > 200 else 0.0)
        )
    elif persona == "Student":
        persona_quality = (
            citation_raw * 1.2 +
            influential_raw * 0.8 +
            author_raw * 0.6 +
            code_raw * 1.5
        )
    else:
        persona_quality = (
            citation_raw * 0.6 +
            influential_raw * 0.5 +
            author_raw * 0.4 +
            code_raw * 1.8 +
            min(stars / 250, 2.0)
        )

    recency_boost = 3.0 * math.exp(-0.003 * days_old)
    velocity_bonus = 0.0
    if days_old < 90 and citations > 5:
        velocity_bonus = 3.0
    elif days_old < 30 and citations > 0:
        velocity_bonus = 1.5

    trending_bonus = recency_boost + velocity_bonus
    final_score = kw_score + persona_quality + trending_bonus

    top_reason = "citations"
    if author_raw >= citation_raw and max_h > 35:
        top_reason = "author"
    elif velocity_bonus >= 2:
        top_reason = "trending"
    elif has_code and stars > 150:
        top_reason = "implementation"

    return round(final_score, 2), top_reason

def build_why_explanation(paper, persona, top_reason):
    citations = paper.get("Citations", 0)
    influential = paper.get("Influential", 0)
    max_h = max(paper.get("h_indices") or [0])
    days_old = paper.get("days_old", 365)
    has_code = paper["pwc"]["has_code"]
    stars = paper["pwc"]["stars"]

    parts = []

    if top_reason == "author" and max_h > 0:
        parts.append(
            f"Author Reputation — Lead author has an h-index of {max_h}, "
            "indicating a highly cited research career."
        )
    if citations > 50:
        parts.append(
            f"High Citation Count — Cited {citations} times ({influential} influential), "
            "meaning the community has built significantly on this work."
        )
    elif citations > 10:
        parts.append(
            f"Growing Influence — {citations} citations with {influential} influential shows real community uptake."
        )
    if days_old < 60 and citations > 2:
        parts.append(
            f"Rapid Traction — Only {days_old} days old but already accumulating citations."
        )
    elif days_old < 365:
        parts.append(f"Recent Work — Published {days_old} days ago, keeping it timely.")
    if has_code and stars > 100:
        parts.append(
            f"Community-Validated Implementation — Open-source code with {stars} GitHub stars."
        )
    elif has_code:
        parts.append("Has Open-Source Code — Reproducible and directly applicable.")

    if persona == "Researcher" and influential > 5:
        parts.append(
            f"Researcher Fit — {influential} influential citations suggest this paper is foundational."
        )
    elif persona == "ML Engineer" and has_code:
        parts.append("Engineer Fit — Working implementation means you can use or adapt it directly.")
    elif persona == "Student" and citations > 20:
        parts.append(
            "Student Fit — High citation count means many tutorials exist to help you understand it."
        )

    return " · ".join(parts) if parts else "Emerging paper with early quality signals."

# ============================================================
# ARXIV FETCH
# ============================================================
_ATOM_NS = "http://www.w3.org/2005/Atom"

def _atom(tag):
    return f"{{{_ATOM_NS}}}{tag}"

def fetch_arxiv_papers(query: str, persona: str, max_results: int = 10):
    formatted = query.replace(" ", "+")
    api_url = (
        f"http://export.arxiv.org/api/query"
        f"?search_query=all:{formatted}"
        f"&start=0&max_results=25"
        f"&sortBy=relevance&sortOrder=descending"
    )

    try:
        resp = requests.get(api_url, timeout=20)
        resp.raise_for_status()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"arXiv API error: {e}")

    try:
        root = ET.fromstring(resp.content)
    except ET.ParseError as e:
        raise HTTPException(status_code=502, detail=f"arXiv parse error: {e}")

    entries = root.findall(_atom("entry"))
    if not entries:
        return []

    results = []
    for entry in entries[:max_results]:
        try:
            title = (entry.findtext(_atom("title")) or "").strip().replace("\n", " ")
            abstract = (entry.findtext(_atom("summary")) or "").strip().replace("\n", " ")

            raw_id = (entry.findtext(_atom("id")) or "").strip()
            arxiv_id = raw_id.split("/abs/")[-1].split("v")[0]
            link = f"https://arxiv.org/abs/{arxiv_id}"

            authors = ", ".join(
                n.text.strip()
                for a in entry.findall(_atom("author"))
                for n in [a.find(_atom("name"))]
                if n is not None and n.text
            )

            published = (entry.findtext(_atom("published")) or "")[:10]
            try:
                days_old = max(0, (datetime.now() - datetime.strptime(published, "%Y-%m-%d")).days)
            except Exception:
                days_old = 365

            ss = get_semantic_scholar(arxiv_id)
            h_indices, author_ids = [], []
            if ss and "authors" in ss:
                h_indices = [a.get("hIndex", 0) for a in ss["authors"] if a.get("hIndex")]
                author_ids = [a.get("authorId") for a in ss["authors"] if a.get("authorId")]

            pwc = get_pwc_data(arxiv_id)

            paper_data = {
                "Title": title,
                "Authors": authors,
                "Abstract": abstract,
                "Link": link,
                "arxiv_id": arxiv_id,
                "Citations": ss.get("citationCount", 0) if ss else 0,
                "Influential": ss.get("influentialCitationCount", 0) if ss else 0,
                "h_indices": h_indices,
                "author_ids": author_ids,
                "days_old": days_old,
                "pwc": pwc,
                "s2_id": ss.get("paperId") if ss else None,
                "tldr": (ss.get("tldr") or {}).get("text") if ss else None,
            }

            score, top_reason = calculate_relevance_score(paper_data, persona, query)
            paper_data["score"] = score
            paper_data["top_reason"] = top_reason
            paper_data["why"] = build_why_explanation(paper_data, persona, top_reason)

            results.append(paper_data)
        except Exception:
            continue

    return sorted(results, key=lambda x: x["score"], reverse=True)

# ============================================================
# ENDPOINTS
# ============================================================
@app.post("/papers/search")
def search_papers(req: SearchRequest):
    return fetch_arxiv_papers(req.query, req.persona, max_results=10)

@app.post("/papers/related")
def related_papers(req: RelatedRequest):
    result = {}
    if req.author_id:
        result["author_papers"] = get_author_top_papers(req.author_id, limit=4)
    if req.s2_id:
        result["similar_papers"] = get_similar_papers(req.s2_id, limit=4)
    return result
