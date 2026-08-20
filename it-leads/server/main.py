from __future__ import annotations

from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, PlainTextResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from server.categories import COUNTRIES, INDIAN_CITIES, IT_LEAD_CATEGORIES
from server.config import settings
from server.exporter import LEAD_COLUMNS, leads_to_csv, leads_to_json
from server.places_service import PlacesError, get_place_details, search_places

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"

app = FastAPI(
    title="IT Maps Lead Generator",
    description="Generate business leads from Google Maps for IT services companies",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SearchRequest(BaseModel):
    category_id: str = Field(default="offices")
    custom_query: str = Field(default="", max_length=200)
    location: str = Field(..., min_length=2, max_length=200)
    country_code: str = Field(default="IN", min_length=2, max_length=2)
    radius_km: float = Field(default=10, ge=0.5, le=50)
    max_results: int = Field(default=20, ge=1, le=60)


class SearchResponse(BaseModel):
    query_used: str
    location_used: str
    total: int
    leads: list[dict[str, Any]]
    columns: list[dict[str, str]]


@app.get("/api/health")
async def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "api_configured": bool(settings.google_maps_api_key.strip()),
    }


@app.get("/api/config")
async def get_config() -> dict[str, Any]:
    return {
        "api_configured": bool(settings.google_maps_api_key.strip()),
        "default_country": settings.default_country,
        "categories": IT_LEAD_CATEGORIES,
        "preset_locations": INDIAN_CITIES,
        "countries": COUNTRIES,
        "lead_fields": [{"key": key, "label": label} for key, label in LEAD_COLUMNS],
        "max_results_limit": 60,
        "radius_limit_km": 50,
    }


def _resolve_query(category_id: str, custom_query: str) -> str:
    if category_id == "custom":
        query = custom_query.strip()
        if not query:
            raise HTTPException(status_code=400, detail="Enter a custom business type or keyword.")
        return query

    category = next((item for item in IT_LEAD_CATEGORIES if item["id"] == category_id), None)
    if not category:
        raise HTTPException(status_code=400, detail="Unknown category selected.")

    if custom_query.strip() and category_id != "all_businesses":
        return f"{category['query']} {custom_query.strip()}"

    return category["query"] or custom_query.strip() or "businesses"


@app.post("/api/search", response_model=SearchResponse)
async def search_leads(payload: SearchRequest) -> SearchResponse:
    query = _resolve_query(payload.category_id, payload.custom_query)
    location = payload.location.strip()
    if not location:
        raise HTTPException(status_code=400, detail="Location is required.")

    try:
        leads = await search_places(
            query=query,
            location=location,
            country_code=payload.country_code.upper(),
            radius_meters=int(payload.radius_km * 1000),
            max_results=payload.max_results,
        )
    except PlacesError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc

    return SearchResponse(
        query_used=query,
        location_used=location,
        total=len(leads),
        leads=leads,
        columns=[{"key": key, "label": label} for key, label in LEAD_COLUMNS if key != "description"],
    )


@app.get("/api/place/{place_id:path}")
async def place_details(place_id: str) -> dict[str, Any]:
    try:
        return await get_place_details(place_id)
    except PlacesError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc


@app.post("/api/export/csv")
async def export_csv(payload: SearchRequest) -> Response:
    query = _resolve_query(payload.category_id, payload.custom_query)
    try:
        leads = await search_places(
            query=query,
            location=payload.location.strip(),
            country_code=payload.country_code.upper(),
            radius_meters=int(payload.radius_km * 1000),
            max_results=payload.max_results,
        )
    except PlacesError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc

    filename = f"it-leads-{payload.location.replace(',', '').replace(' ', '-')[:40]}.csv"
    return Response(
        content=leads_to_csv(leads),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.post("/api/export/json")
async def export_json(payload: SearchRequest) -> PlainTextResponse:
    query = _resolve_query(payload.category_id, payload.custom_query)
    try:
        leads = await search_places(
            query=query,
            location=payload.location.strip(),
            country_code=payload.country_code.upper(),
            radius_meters=int(payload.radius_km * 1000),
            max_results=payload.max_results,
        )
    except PlacesError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc

    return PlainTextResponse(
        content=leads_to_json(leads),
        media_type="application/json",
    )


@app.get("/")
async def index() -> FileResponse:
    return FileResponse(PUBLIC / "index.html")


if PUBLIC.exists():
    app.mount("/static", StaticFiles(directory=PUBLIC), name="static")
