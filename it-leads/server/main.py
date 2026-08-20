from __future__ import annotations

from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, PlainTextResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from server.categories import IT_LEAD_CATEGORIES
from server.locations import COUNTRIES, PRESET_LOCATIONS, REGIONS
from server.config import settings
from server.exporter import (
    DOWNLOAD_FORMATS,
    LEAD_COLUMNS,
    build_filename,
    export_leads,
    leads_to_csv,
    leads_to_json,
)
from server.places_service import PlacesError, autocomplete_locations, get_place_details, search_places

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
    country_code: str = Field(default="", max_length=2)
    place_id: str = Field(default="", max_length=120)
    radius_km: float = Field(default=10, ge=0.5, le=50)
    max_results: int = Field(default=20, ge=1, le=60)


class SearchResponse(BaseModel):
    query_used: str
    location_used: str
    total: int
    leads: list[dict[str, Any]]
    columns: list[dict[str, str]]


class DownloadRequest(BaseModel):
    format: str = Field(default="csv", pattern="^(csv|xlsx|json|txt)$")
    leads: list[dict[str, Any]] = Field(default_factory=list)
    filename: str = Field(default="", max_length=80)
    location: str = Field(default="", max_length=200)
    category: str = Field(default="", max_length=100)
    query_used: str = Field(default="", max_length=200)
    columns: list[str] = Field(default_factory=list)


class BatchLocationItem(BaseModel):
    location: str = Field(..., min_length=2, max_length=200)
    country_code: str = Field(default="", max_length=2)
    place_id: str = Field(default="", max_length=120)


class BatchSearchRequest(BaseModel):
    locations: list[BatchLocationItem] = Field(..., min_length=1, max_length=10)
    category_ids: list[str] = Field(..., min_length=1, max_length=5)
    custom_query: str = Field(default="", max_length=200)
    radius_km: float = Field(default=10, ge=0.5, le=50)
    max_results_per_search: int = Field(default=20, ge=1, le=60)


class BatchSearchResponse(BaseModel):
    query_used: str
    location_used: str
    total: int
    leads: list[dict[str, Any]]
    columns: list[dict[str, str]]
    locations_searched: int
    categories_searched: int
    searches_run: int
    duplicates_removed: int
    breakdown: list[dict[str, Any]]


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
        "regions": REGIONS,
        "preset_locations": PRESET_LOCATIONS,
        "countries": COUNTRIES,
        "worldwide_enabled": True,
        "lead_fields": [{"key": key, "label": label} for key, label in LEAD_COLUMNS],
        "download_formats": DOWNLOAD_FORMATS,
        "max_results_limit": 60,
        "max_results_per_search": 60,
        "max_locations_per_batch": 10,
        "max_categories_per_batch": 5,
        "max_batch_searches": 25,
        "max_total_leads": 500,
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


def _category_label(category_id: str) -> str:
    category = next((item for item in IT_LEAD_CATEGORIES if item["id"] == category_id), None)
    return category["label"] if category else category_id


def _tag_lead(lead: dict[str, Any], *, location: str, category_id: str, query: str) -> dict[str, Any]:
    tagged = dict(lead)
    tagged["source_location"] = location
    tagged["source_category"] = _category_label(category_id)
    tagged["source_query"] = query
    return tagged


def _merge_leads(
    collected: list[dict[str, Any]],
    seen_ids: set[str],
    new_leads: list[dict[str, Any]],
    *,
    location: str,
    category_id: str,
    query: str,
) -> int:
    duplicates = 0
    for lead in new_leads:
        tagged = _tag_lead(lead, location=location, category_id=category_id, query=query)
        place_id = tagged.get("place_id") or ""
        if place_id and place_id in seen_ids:
            duplicates += 1
            continue
        if place_id:
            seen_ids.add(place_id)
        collected.append(tagged)
    return duplicates


def _selected_columns(column_keys: list[str]) -> list[tuple[str, str]] | None:
    if not column_keys:
        return None
    allowed = {key: label for key, label in LEAD_COLUMNS}
    selected = [(key, allowed[key]) for key in column_keys if key in allowed]
    return selected or None


def _download_response(payload: DownloadRequest) -> Response:
    if not payload.leads:
        raise HTTPException(status_code=400, detail="No leads to download. Generate leads first.")

    columns = _selected_columns(payload.columns)
    metadata = {
        "location_used": payload.location,
        "query_used": payload.query_used,
        "category": payload.category,
        "total": len(payload.leads),
    }

    try:
        content, media_type = export_leads(
            payload.leads,
            payload.format,
            columns=columns,
            metadata=metadata,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    filename = build_filename(
        location=payload.location,
        category=payload.category,
        format_id=payload.format,
        custom_name=payload.filename,
    )

    if isinstance(content, str):
        body = content.encode("utf-8")
    else:
        body = content

    return Response(
        content=body,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.post("/api/search", response_model=SearchResponse)
async def search_leads(payload: SearchRequest) -> SearchResponse:
    query = _resolve_query(payload.category_id, payload.custom_query)
    location = payload.location.strip()
    if not location:
        raise HTTPException(status_code=400, detail="Location is required.")

    country = payload.country_code.strip().upper()
    if country and len(country) != 2:
        raise HTTPException(status_code=400, detail="Country code must be 2 letters or Worldwide.")

    try:
        leads = await search_places(
            query=query,
            location=location,
            country_code=country,
            radius_meters=int(payload.radius_km * 1000),
            max_results=payload.max_results,
            place_id=payload.place_id.strip(),
        )
    except PlacesError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc

    leads = [_tag_lead(lead, location=location, category_id=payload.category_id, query=query) for lead in leads]

    return SearchResponse(
        query_used=query,
        location_used=location,
        total=len(leads),
        leads=leads,
        columns=[{"key": key, "label": label} for key, label in LEAD_COLUMNS if key != "description"],
    )


@app.post("/api/search/batch", response_model=BatchSearchResponse)
async def search_leads_batch(payload: BatchSearchRequest) -> BatchSearchResponse:
    locations = [item for item in payload.locations if item.location.strip()]
    if not locations:
        raise HTTPException(status_code=400, detail="Add at least one location.")

    category_ids = list(dict.fromkeys(payload.category_ids))
    total_searches = len(locations) * len(category_ids)
    max_searches = 25

    if total_searches > max_searches:
        raise HTTPException(
            status_code=400,
            detail=f"Too many searches ({total_searches}). Max {max_searches} location × category combinations.",
        )

    collected: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    breakdown: list[dict[str, Any]] = []
    duplicates_removed = 0
    searches_run = 0

    for location_item in locations:
        location = location_item.location.strip()
        country = location_item.country_code.strip().upper()
        if country and len(country) != 2:
            raise HTTPException(status_code=400, detail=f"Invalid country code for {location}.")

        for category_id in category_ids:
            query = _resolve_query(category_id, payload.custom_query)
            searches_run += 1

            try:
                batch_leads = await search_places(
                    query=query,
                    location=location,
                    country_code=country,
                    radius_meters=int(payload.radius_km * 1000),
                    max_results=payload.max_results_per_search,
                    place_id=location_item.place_id.strip(),
                )
            except PlacesError as exc:
                breakdown.append(
                    {
                        "location": location,
                        "category_id": category_id,
                        "category_label": _category_label(category_id),
                        "query": query,
                        "count": 0,
                        "error": str(exc),
                    }
                )
                continue

            dupes = _merge_leads(
                collected,
                seen_ids,
                batch_leads,
                location=location,
                category_id=category_id,
                query=query,
            )
            duplicates_removed += dupes
            breakdown.append(
                {
                    "location": location,
                    "category_id": category_id,
                    "category_label": _category_label(category_id),
                    "query": query,
                    "count": len(batch_leads),
                    "added": len(batch_leads) - dupes,
                }
            )

            if len(collected) >= 500:
                break

        if len(collected) >= 500:
            break

    location_labels = ", ".join(item.location.strip() for item in locations[:3])
    if len(locations) > 3:
        location_labels += f" +{len(locations) - 3} more"

    category_labels = ", ".join(_category_label(cid) for cid in category_ids[:3])
    if len(category_ids) > 3:
        category_labels += f" +{len(category_ids) - 3} more"

    return BatchSearchResponse(
        query_used=category_labels,
        location_used=location_labels,
        total=len(collected),
        leads=collected[:500],
        columns=[{"key": key, "label": label} for key, label in LEAD_COLUMNS if key not in ("description", "source_query")],
        locations_searched=len(locations),
        categories_searched=len(category_ids),
        searches_run=searches_run,
        duplicates_removed=duplicates_removed,
        breakdown=breakdown,
    )


@app.get("/api/locations/autocomplete")
async def location_autocomplete(
    query: str = Query(..., min_length=2, max_length=120),
    country_code: str = Query(default="", max_length=2),
) -> dict[str, Any]:
    country = country_code.strip().upper()
    if country and len(country) != 2:
        raise HTTPException(status_code=400, detail="Country code must be 2 letters or empty for worldwide.")

    try:
        suggestions = await autocomplete_locations(query, country)
    except PlacesError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc

    return {"query": query, "country_code": country, "suggestions": suggestions}


@app.get("/api/place/{place_id:path}")
async def place_details(place_id: str) -> dict[str, Any]:
    try:
        return await get_place_details(place_id)
    except PlacesError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc


@app.post("/api/download")
async def download_leads(payload: DownloadRequest) -> Response:
    """Download current leads in CSV, Excel, JSON, or TXT format."""
    return _download_response(payload)


@app.post("/api/export/csv")
async def export_csv(payload: SearchRequest) -> Response:
    query = _resolve_query(payload.category_id, payload.custom_query)
    country = payload.country_code.strip().upper()
    try:
        leads = await search_places(
            query=query,
            location=payload.location.strip(),
            country_code=country,
            radius_meters=int(payload.radius_km * 1000),
            max_results=payload.max_results,
            place_id=payload.place_id.strip(),
        )
    except PlacesError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc

    filename = f"it-leads-{payload.location.replace(',', '').replace(' ', '-')[:40]}.csv"
    return Response(
        content=leads_to_csv(leads),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.post("/api/export/json")
async def export_json(payload: SearchRequest) -> Response:
    query = _resolve_query(payload.category_id, payload.custom_query)
    country = payload.country_code.strip().upper()
    try:
        leads = await search_places(
            query=query,
            location=payload.location.strip(),
            country_code=country,
            radius_meters=int(payload.radius_km * 1000),
            max_results=payload.max_results,
            place_id=payload.place_id.strip(),
        )
    except PlacesError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc

    filename = build_filename(location=payload.location.strip(), format_id="json")
    content = leads_to_json(
        leads,
        metadata={"location_used": payload.location.strip(), "query_used": query},
    )
    return Response(
        content=content.encode("utf-8"),
        media_type="application/json; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get("/")
async def index() -> FileResponse:
    return FileResponse(PUBLIC / "index.html")


@app.get("/manifest.webmanifest")
async def manifest() -> FileResponse:
    return FileResponse(PUBLIC / "manifest.webmanifest", media_type="application/manifest+json")


@app.get("/sw.js")
async def service_worker() -> FileResponse:
    return FileResponse(
        PUBLIC / "sw.js",
        media_type="application/javascript",
        headers={"Service-Worker-Allowed": "/"},
    )


if PUBLIC.exists():
    app.mount("/static", StaticFiles(directory=PUBLIC), name="static")
