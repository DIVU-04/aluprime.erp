"""LeadFinder API.

Uses Google Places API (New) for discovery. The Google API key remains on the
server and is never sent to the browser.
"""

from __future__ import annotations

import csv
import io
import json
import os
import sqlite3
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, field_validator


BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
DB_PATH = Path(os.getenv("LEADFINDER_DB_PATH", BASE_DIR / "data" / "leads.db"))
PLACES_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "").strip()
PLACES_URL = "https://places.googleapis.com/v1/places:searchText"

FIELD_MASK = ",".join(
    [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.location",
        "places.primaryType",
        "places.primaryTypeDisplayName",
        "places.types",
        "places.nationalPhoneNumber",
        "places.internationalPhoneNumber",
        "places.websiteUri",
        "places.rating",
        "places.userRatingCount",
        "places.googleMapsUri",
        "places.businessStatus",
        "places.regularOpeningHours",
        "places.priceLevel",
        "nextPageToken",
    ]
)

SERVICE_GROUPS = [
    {
        "group": "Professional services",
        "items": [
            "accounting firms",
            "architects",
            "consulting firms",
            "insurance agencies",
            "law firms",
            "real estate agencies",
        ],
    },
    {
        "group": "Healthcare",
        "items": [
            "dental clinics",
            "diagnostic centers",
            "medical clinics",
            "pharmacies",
            "physiotherapy clinics",
            "veterinary clinics",
        ],
    },
    {
        "group": "Retail & hospitality",
        "items": [
            "cafes",
            "hotels",
            "jewelry stores",
            "restaurants",
            "retail stores",
            "supermarkets",
        ],
    },
    {
        "group": "Industrial & operations",
        "items": [
            "construction companies",
            "logistics companies",
            "manufacturers",
            "printing companies",
            "warehouses",
            "wholesale distributors",
        ],
    },
    {
        "group": "Education & organizations",
        "items": [
            "coaching institutes",
            "colleges",
            "nonprofit organizations",
            "schools",
            "training centers",
        ],
    },
]

DEMO_PLACES = [
    {
        "id": "demo-chandra-dental",
        "displayName": {"text": "Chandra Dental & Implant Clinic"},
        "formattedAddress": "Navrangpura, Ahmedabad, Gujarat 380009",
        "location": {"latitude": 23.036, "longitude": 72.561},
        "primaryType": "dentist",
        "primaryTypeDisplayName": {"text": "Dental clinic"},
        "types": ["dentist", "health"],
        "nationalPhoneNumber": "079 4000 1200",
        "internationalPhoneNumber": "+91 79 4000 1200",
        "websiteUri": "https://example.com/chandra-dental",
        "rating": 4.6,
        "userRatingCount": 184,
        "googleMapsUri": "https://maps.google.com/?cid=demo1",
        "businessStatus": "OPERATIONAL",
        "regularOpeningHours": {
            "openNow": True,
            "weekdayDescriptions": ["Monday–Saturday: 9:00 AM–8:00 PM"],
        },
        "priceLevel": "PRICE_LEVEL_MODERATE",
    },
    {
        "id": "demo-patel-accounting",
        "displayName": {"text": "Patel Accounting Associates"},
        "formattedAddress": "SG Highway, Ahmedabad, Gujarat 380054",
        "location": {"latitude": 23.057, "longitude": 72.507},
        "primaryType": "accounting",
        "primaryTypeDisplayName": {"text": "Accounting firm"},
        "types": ["accounting", "finance"],
        "nationalPhoneNumber": "098250 12345",
        "internationalPhoneNumber": "+91 98250 12345",
        "rating": 4.2,
        "userRatingCount": 31,
        "googleMapsUri": "https://maps.google.com/?cid=demo2",
        "businessStatus": "OPERATIONAL",
        "regularOpeningHours": {
            "openNow": False,
            "weekdayDescriptions": ["Monday–Friday: 10:00 AM–6:30 PM"],
        },
    },
    {
        "id": "demo-rapid-logistics",
        "displayName": {"text": "Rapid Route Logistics"},
        "formattedAddress": "Sanand, Ahmedabad, Gujarat 382110",
        "location": {"latitude": 22.992, "longitude": 72.381},
        "primaryType": "logistics_service",
        "primaryTypeDisplayName": {"text": "Logistics service"},
        "types": ["logistics_service", "point_of_interest"],
        "websiteUri": "https://example.com/rapid-route",
        "rating": 3.9,
        "userRatingCount": 67,
        "googleMapsUri": "https://maps.google.com/?cid=demo3",
        "businessStatus": "OPERATIONAL",
    },
]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def connect() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA journal_mode=WAL")
    connection.execute("PRAGMA foreign_keys=ON")
    return connection


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with connect() as db:
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS search_runs (
                id TEXT PRIMARY KEY,
                created_at TEXT NOT NULL,
                queries_json TEXT NOT NULL,
                locations_json TEXT NOT NULL,
                api_calls INTEGER NOT NULL DEFAULT 0,
                discovered INTEGER NOT NULL DEFAULT 0,
                saved INTEGER NOT NULL DEFAULT 0,
                demo INTEGER NOT NULL DEFAULT 0,
                error TEXT
            );

            CREATE TABLE IF NOT EXISTS leads (
                place_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT,
                types_json TEXT NOT NULL DEFAULT '[]',
                address TEXT,
                phone TEXT,
                international_phone TEXT,
                website TEXT,
                rating REAL,
                review_count INTEGER NOT NULL DEFAULT 0,
                maps_url TEXT,
                latitude REAL,
                longitude REAL,
                business_status TEXT,
                price_level TEXT,
                opening_hours_json TEXT NOT NULL DEFAULT '{}',
                source_query TEXT,
                source_location TEXT,
                score INTEGER NOT NULL DEFAULT 0,
                opportunities_json TEXT NOT NULL DEFAULT '[]',
                status TEXT NOT NULL DEFAULT 'new',
                notes TEXT NOT NULL DEFAULT '',
                first_seen_at TEXT NOT NULL,
                last_seen_at TEXT NOT NULL,
                is_demo INTEGER NOT NULL DEFAULT 0
            );

            CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
            CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score DESC);
            CREATE INDEX IF NOT EXISTS idx_leads_last_seen ON leads(last_seen_at DESC);
            """
        )


class SearchRequest(BaseModel):
    queries: list[str] = Field(min_length=1, max_length=12)
    locations: list[str] = Field(min_length=1, max_length=20)
    max_results_per_search: int = Field(default=20, ge=1, le=60)
    min_rating: float = Field(default=0, ge=0, le=5)
    min_reviews: int = Field(default=0, ge=0, le=1000000)
    require_phone: bool = False
    require_website: bool = False
    exclude_keywords: list[str] = Field(default_factory=list, max_length=20)
    demo: bool = False

    @field_validator("queries", "locations")
    @classmethod
    def clean_required_list(cls, values: list[str]) -> list[str]:
        cleaned = list(dict.fromkeys(value.strip() for value in values if value.strip()))
        if not cleaned:
            raise ValueError("At least one non-empty value is required")
        return cleaned

    @field_validator("exclude_keywords")
    @classmethod
    def clean_optional_list(cls, values: list[str]) -> list[str]:
        return list(dict.fromkeys(value.strip() for value in values if value.strip()))


class LeadUpdate(BaseModel):
    status: Literal["new", "contacted", "qualified", "won", "lost", "do_not_contact"] | None = None
    notes: str | None = Field(default=None, max_length=4000)


def text_value(value: Any) -> str | None:
    if isinstance(value, dict):
        return value.get("text")
    return value if isinstance(value, str) else None


def score_place(place: dict[str, Any]) -> tuple[int, list[str]]:
    score = 10
    opportunities: list[str] = []
    if place.get("nationalPhoneNumber") or place.get("internationalPhoneNumber"):
        score += 30
    else:
        opportunities.append("Phone enrichment needed")
    if place.get("websiteUri"):
        score += 20
    else:
        score += 10
        opportunities.append("No website listed")
    reviews = int(place.get("userRatingCount") or 0)
    if reviews >= 100:
        score += 15
    elif reviews >= 20:
        score += 10
    elif reviews < 5:
        opportunities.append("Low review visibility")
    rating = float(place.get("rating") or 0)
    if rating >= 4:
        score += 10
    if place.get("businessStatus") == "OPERATIONAL":
        score += 10
    if reviews >= 20 and not place.get("websiteUri"):
        opportunities.append("Established business without a website")
    return min(score, 100), opportunities


def normalize_place(
    place: dict[str, Any], query: str, location: str, is_demo: bool
) -> dict[str, Any]:
    score, opportunities = score_place(place)
    coordinates = place.get("location") or {}
    return {
        "place_id": place.get("id"),
        "name": text_value(place.get("displayName")) or "Unknown business",
        "category": text_value(place.get("primaryTypeDisplayName"))
        or place.get("primaryType"),
        "types_json": json.dumps(place.get("types") or []),
        "address": place.get("formattedAddress"),
        "phone": place.get("nationalPhoneNumber"),
        "international_phone": place.get("internationalPhoneNumber"),
        "website": place.get("websiteUri"),
        "rating": place.get("rating"),
        "review_count": place.get("userRatingCount") or 0,
        "maps_url": place.get("googleMapsUri"),
        "latitude": coordinates.get("latitude"),
        "longitude": coordinates.get("longitude"),
        "business_status": place.get("businessStatus"),
        "price_level": place.get("priceLevel"),
        "opening_hours_json": json.dumps(place.get("regularOpeningHours") or {}),
        "source_query": query,
        "source_location": location,
        "score": score,
        "opportunities_json": json.dumps(opportunities),
        "last_seen_at": now_iso(),
        "is_demo": int(is_demo),
    }


def passes_filters(place: dict[str, Any], request: SearchRequest) -> bool:
    if float(place.get("rating") or 0) < request.min_rating:
        return False
    if int(place.get("userRatingCount") or 0) < request.min_reviews:
        return False
    if request.require_phone and not (
        place.get("nationalPhoneNumber") or place.get("internationalPhoneNumber")
    ):
        return False
    if request.require_website and not place.get("websiteUri"):
        return False
    haystack = " ".join(
        [
            text_value(place.get("displayName")) or "",
            place.get("formattedAddress") or "",
            " ".join(place.get("types") or []),
        ]
    ).lower()
    return not any(keyword.lower() in haystack for keyword in request.exclude_keywords)


async def search_places(
    client: httpx.AsyncClient, query: str, location: str, maximum: int
) -> tuple[list[dict[str, Any]], int]:
    found: list[dict[str, Any]] = []
    page_token: str | None = None
    calls = 0
    while len(found) < maximum and calls < 3:
        payload: dict[str, Any] = {
            "textQuery": f"{query} in {location}",
            "pageSize": min(20, maximum - len(found)),
        }
        if page_token:
            payload["pageToken"] = page_token
        response = await client.post(
            PLACES_URL,
            headers={
                "X-Goog-Api-Key": PLACES_API_KEY,
                "X-Goog-FieldMask": FIELD_MASK,
                "Content-Type": "application/json",
            },
            json=payload,
        )
        calls += 1
        if response.status_code >= 400:
            try:
                detail = response.json().get("error", {}).get("message")
            except ValueError:
                detail = response.text
            raise HTTPException(
                status_code=502,
                detail=f"Google Places request failed: {detail or response.status_code}",
            )
        body = response.json()
        found.extend(body.get("places") or [])
        page_token = body.get("nextPageToken")
        if not page_token:
            break
    return found[:maximum], calls


def upsert_leads(leads: list[dict[str, Any]]) -> int:
    if not leads:
        return 0
    columns = [
        "place_id",
        "name",
        "category",
        "types_json",
        "address",
        "phone",
        "international_phone",
        "website",
        "rating",
        "review_count",
        "maps_url",
        "latitude",
        "longitude",
        "business_status",
        "price_level",
        "opening_hours_json",
        "source_query",
        "source_location",
        "score",
        "opportunities_json",
        "last_seen_at",
        "is_demo",
    ]
    placeholders = ", ".join("?" for _ in columns)
    updates = ", ".join(
        f"{column}=excluded.{column}"
        for column in columns
        if column not in {"place_id"}
    )
    with connect() as db:
        before = db.total_changes
        for lead in leads:
            db.execute(
                f"""
                INSERT INTO leads ({", ".join(columns)}, first_seen_at)
                VALUES ({placeholders}, ?)
                ON CONFLICT(place_id) DO UPDATE SET {updates}
                """,
                [lead[column] for column in columns] + [lead["last_seen_at"]],
            )
        return db.total_changes - before


def serialize_lead(row: sqlite3.Row) -> dict[str, Any]:
    lead = dict(row)
    lead["types"] = json.loads(lead.pop("types_json"))
    lead["opportunities"] = json.loads(lead.pop("opportunities_json"))
    lead["opening_hours"] = json.loads(lead.pop("opening_hours_json"))
    lead["is_demo"] = bool(lead["is_demo"])
    return lead


def build_where(
    search: str | None = None,
    status: str | None = None,
    location: str | None = None,
) -> tuple[str, list[Any]]:
    conditions: list[str] = []
    params: list[Any] = []
    if search:
        conditions.append(
            "(name LIKE ? OR category LIKE ? OR address LIKE ? OR source_query LIKE ?)"
        )
        term = f"%{search}%"
        params.extend([term, term, term, term])
    if status and status != "all":
        conditions.append("status = ?")
        params.append(status)
    if location:
        conditions.append("(source_location LIKE ? OR address LIKE ?)")
        term = f"%{location}%"
        params.extend([term, term])
    return (" WHERE " + " AND ".join(conditions) if conditions else ""), params


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title="LeadFinder", version="1.0.0", lifespan=lifespan)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/", response_class=HTMLResponse)
async def index() -> HTMLResponse:
    return HTMLResponse((STATIC_DIR / "index.html").read_text(encoding="utf-8"))


@app.get("/api/config")
async def config() -> dict[str, Any]:
    return {
        "api_key_configured": bool(PLACES_API_KEY),
        "service_groups": SERVICE_GROUPS,
        "limits": {"queries": 12, "locations": 20, "combinations": 40},
        "data_source": "Google Places API (New)",
    }


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/search")
async def run_search(request: SearchRequest) -> dict[str, Any]:
    combinations = [(query, location) for query in request.queries for location in request.locations]
    if len(combinations) > 40:
        raise HTTPException(
            status_code=422,
            detail="A search is limited to 40 service/location combinations to control API cost.",
        )
    if not request.demo and not PLACES_API_KEY:
        raise HTTPException(
            status_code=400,
            detail="GOOGLE_MAPS_API_KEY is not configured. Add it on the server or use demo mode.",
        )

    run_id = str(uuid.uuid4())
    all_leads: dict[str, dict[str, Any]] = {}
    api_calls = 0
    error: str | None = None
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            for query, location in combinations:
                if request.demo:
                    raw_places = DEMO_PLACES
                    calls = 0
                else:
                    raw_places, calls = await search_places(
                        client, query, location, request.max_results_per_search
                    )
                api_calls += calls
                for place in raw_places:
                    if place.get("id") and passes_filters(place, request):
                        all_leads[place["id"]] = normalize_place(
                            place, query, location, request.demo
                        )
    except HTTPException as exc:
        error = str(exc.detail)
        raise
    finally:
        leads = list(all_leads.values())
        saved = upsert_leads(leads)
        with connect() as db:
            db.execute(
                """
                INSERT INTO search_runs
                (id, created_at, queries_json, locations_json, api_calls, discovered, saved, demo, error)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    run_id,
                    now_iso(),
                    json.dumps(request.queries),
                    json.dumps(request.locations),
                    api_calls,
                    len(all_leads),
                    saved,
                    int(request.demo),
                    error,
                ),
            )

    return {
        "run_id": run_id,
        "discovered": len(all_leads),
        "saved": saved,
        "api_calls": api_calls,
        "demo": request.demo,
    }


@app.get("/api/leads")
async def list_leads(
    search: str | None = None,
    status: str | None = None,
    location: str | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> dict[str, Any]:
    where, params = build_where(search, status, location)
    with connect() as db:
        total = db.execute(f"SELECT COUNT(*) FROM leads{where}", params).fetchone()[0]
        rows = db.execute(
            f"""
            SELECT * FROM leads{where}
            ORDER BY score DESC, review_count DESC, last_seen_at DESC
            LIMIT ? OFFSET ?
            """,
            params + [limit, offset],
        ).fetchall()
        stats = db.execute(
            """
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) AS new_count,
                SUM(CASE WHEN status = 'qualified' THEN 1 ELSE 0 END) AS qualified_count,
                SUM(CASE WHEN phone IS NOT NULL THEN 1 ELSE 0 END) AS with_phone
            FROM leads
            """
        ).fetchone()
    return {
        "items": [serialize_lead(row) for row in rows],
        "total": total,
        "stats": {key: stats[key] or 0 for key in stats.keys()},
    }


@app.patch("/api/leads/{place_id}")
async def update_lead(place_id: str, update: LeadUpdate) -> dict[str, Any]:
    values = update.model_dump(exclude_none=True)
    if not values:
        raise HTTPException(status_code=422, detail="Provide a status or notes update.")
    assignments = ", ".join(f"{key} = ?" for key in values)
    with connect() as db:
        cursor = db.execute(
            f"UPDATE leads SET {assignments} WHERE place_id = ?",
            list(values.values()) + [place_id],
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Lead not found.")
        row = db.execute("SELECT * FROM leads WHERE place_id = ?", [place_id]).fetchone()
    return serialize_lead(row)


@app.delete("/api/leads")
async def delete_leads(demo_only: bool = False) -> dict[str, int]:
    with connect() as db:
        if demo_only:
            cursor = db.execute("DELETE FROM leads WHERE is_demo = 1")
        else:
            cursor = db.execute("DELETE FROM leads")
    return {"deleted": cursor.rowcount}


@app.get("/api/export.csv")
async def export_csv(
    search: str | None = None,
    status: str | None = None,
    location: str | None = None,
) -> StreamingResponse:
    where, params = build_where(search, status, location)
    with connect() as db:
        rows = db.execute(
            f"SELECT * FROM leads{where} ORDER BY score DESC, name ASC", params
        ).fetchall()
    output = io.StringIO()
    fields = [
        "name",
        "category",
        "address",
        "phone",
        "international_phone",
        "website",
        "rating",
        "review_count",
        "score",
        "opportunities",
        "status",
        "notes",
        "maps_url",
        "latitude",
        "longitude",
        "business_status",
        "opening_hours",
        "source_query",
        "source_location",
        "place_id",
        "last_seen_at",
    ]
    writer = csv.DictWriter(output, fieldnames=fields)
    writer.writeheader()
    for row in rows:
        lead = serialize_lead(row)
        lead["opportunities"] = "; ".join(lead["opportunities"])
        lead["opening_hours"] = "; ".join(
            lead["opening_hours"].get("weekdayDescriptions", [])
        )
        writer.writerow({field: lead.get(field) for field in fields})
    headers = {
        "Content-Disposition": f'attachment; filename="leads-{datetime.now():%Y-%m-%d}.csv"'
    }
    return StreamingResponse(
        iter([output.getvalue()]), media_type="text/csv; charset=utf-8", headers=headers
    )
