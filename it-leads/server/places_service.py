from __future__ import annotations

import asyncio
from typing import Any

import httpx

from server.config import settings

PLACES_BASE = "https://places.googleapis.com/v1"

DETAIL_FIELD_MASK = ",".join(
    [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.shortFormattedAddress",
        "places.nationalPhoneNumber",
        "places.internationalPhoneNumber",
        "places.websiteUri",
        "places.googleMapsUri",
        "places.rating",
        "places.userRatingCount",
        "places.businessStatus",
        "places.primaryType",
        "places.primaryTypeDisplayName",
        "places.types",
        "places.location",
        "places.regularOpeningHours",
        "places.currentOpeningHours",
        "places.utcOffsetMinutes",
        "places.addressComponents",
        "places.editorialSummary",
    ]
)

SEARCH_FIELD_MASK = ",".join(
    [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.nationalPhoneNumber",
        "places.internationalPhoneNumber",
        "places.websiteUri",
        "places.googleMapsUri",
        "places.rating",
        "places.userRatingCount",
        "places.businessStatus",
        "places.primaryType",
        "places.primaryTypeDisplayName",
        "places.types",
        "places.location",
        "places.regularOpeningHours",
    ]
)


class PlacesError(Exception):
    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.status_code = status_code


def _headers(field_mask: str) -> dict[str, str]:
    key = settings.google_maps_api_key.strip()
    if not key:
        raise PlacesError(
            "Google Maps API key is not configured. Add GOOGLE_MAPS_API_KEY to it-leads/.env",
            status_code=503,
        )
    return {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": field_mask,
    }


def _text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, dict):
        return str(value.get("text") or value.get("longText") or "")
    return str(value)


def _opening_hours(place: dict[str, Any]) -> str:
    hours = place.get("regularOpeningHours") or place.get("currentOpeningHours") or {}
    weekday = hours.get("weekdayDescriptions") or []
    return " | ".join(weekday)


def _address_parts(components: list[dict[str, Any]] | None) -> dict[str, str]:
    parts: dict[str, str] = {
        "city": "",
        "state": "",
        "postal_code": "",
        "country": "",
    }
    if not components:
        return parts

    for component in components:
        types = component.get("types") or []
        long_name = component.get("longText") or component.get("long_name") or ""
        if "locality" in types:
            parts["city"] = long_name
        elif "administrative_area_level_1" in types:
            parts["state"] = long_name
        elif "postal_code" in types:
            parts["postal_code"] = long_name
        elif "country" in types:
            parts["country"] = long_name
    return parts


def normalize_place(place: dict[str, Any], *, include_summary: bool = False) -> dict[str, Any]:
    location = place.get("location") or {}
    components = place.get("addressComponents")
    address_parts = _address_parts(components)

    lead = {
        "place_id": place.get("id", ""),
        "business_name": _text(place.get("displayName")),
        "category": _text(place.get("primaryTypeDisplayName")) or place.get("primaryType") or "",
        "types": ", ".join(place.get("types") or []),
        "address": place.get("formattedAddress") or place.get("shortFormattedAddress") or "",
        "city": address_parts["city"],
        "state": address_parts["state"],
        "postal_code": address_parts["postal_code"],
        "country": address_parts["country"],
        "phone": place.get("nationalPhoneNumber") or place.get("internationalPhoneNumber") or "",
        "international_phone": place.get("internationalPhoneNumber") or "",
        "website": place.get("websiteUri") or "",
        "google_maps_url": place.get("googleMapsUri") or "",
        "rating": place.get("rating"),
        "review_count": place.get("userRatingCount"),
        "business_status": place.get("businessStatus") or "",
        "latitude": location.get("latitude"),
        "longitude": location.get("longitude"),
        "opening_hours": _opening_hours(place),
        "utc_offset_minutes": place.get("utcOffsetMinutes"),
    }

    if include_summary:
        summary = place.get("editorialSummary")
        lead["description"] = _text(summary)

    return lead


async def geocode_location(client: httpx.AsyncClient, location: str, country_code: str) -> dict[str, Any]:
    key = settings.google_maps_api_key.strip()
    if not key:
        raise PlacesError(
            "Google Maps API key is not configured. Add GOOGLE_MAPS_API_KEY to it-leads/.env",
            status_code=503,
        )

    params = {
        "address": location,
        "key": key,
    }
    if country_code:
        params["components"] = f"country:{country_code.upper()}"

    response = await client.get("https://maps.googleapis.com/maps/api/geocode/json", params=params)
    payload = response.json()
    status = payload.get("status")

    if status == "REQUEST_DENIED":
        message = payload.get("error_message") or "API key invalid or Geocoding API not enabled."
        raise PlacesError(message, status_code=403)

    if status != "OK" or not payload.get("results"):
        raise PlacesError(f"Could not find location: {location}")

    result = payload["results"][0]
    location_data = result["geometry"]["location"]
    return {
        "formatted_address": result.get("formatted_address", location),
        "latitude": location_data["lat"],
        "longitude": location_data["lng"],
    }


async def search_places(
    *,
    query: str,
    location: str,
    country_code: str,
    radius_meters: int,
    max_results: int,
) -> list[dict[str, Any]]:
    async with httpx.AsyncClient(timeout=60.0) as client:
        geo = await geocode_location(client, location, country_code)

        body: dict[str, Any] = {
            "textQuery": query,
            "maxResultCount": min(max(max_results, 1), 20),
            "locationBias": {
                "circle": {
                    "center": {
                        "latitude": geo["latitude"],
                        "longitude": geo["longitude"],
                    },
                    "radius": float(min(max(radius_meters, 500), 50000)),
                }
            },
        }

        if country_code:
            body["regionCode"] = country_code.upper()

        response = await client.post(
            f"{PLACES_BASE}/places:searchText",
            headers=_headers(SEARCH_FIELD_MASK),
            json=body,
        )

        if response.status_code >= 400:
            detail = response.text
            try:
                detail = response.json().get("error", {}).get("message", detail)
            except Exception:
                pass
            raise PlacesError(f"Google Places search failed: {detail}", status_code=response.status_code)

        places = response.json().get("places") or []
        leads = [normalize_place(place) for place in places]

        # Paginate with nextPageToken if user asked for more than 20
        remaining = max_results - len(leads)
        page_token = response.json().get("nextPageToken")
        while remaining > 0 and page_token:
            await asyncio.sleep(1.5)
            page_body = {
                "textQuery": query,
                "pageToken": page_token,
                "maxResultCount": min(remaining, 20),
                "locationBias": body["locationBias"],
            }
            if country_code:
                page_body["regionCode"] = country_code.upper()

            page_response = await client.post(
                f"{PLACES_BASE}/places:searchText",
                headers=_headers(SEARCH_FIELD_MASK),
                json=page_body,
            )
            if page_response.status_code >= 400:
                break

            page_places = page_response.json().get("places") or []
            leads.extend(normalize_place(place) for place in page_places)
            remaining = max_results - len(leads)
            page_token = page_response.json().get("nextPageToken")

        return leads[:max_results]


async def get_place_details(place_id: str) -> dict[str, Any]:
    resource_id = place_id if place_id.startswith("places/") else f"places/{place_id}"

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(
            f"{PLACES_BASE}/{resource_id}",
            headers=_headers(
                "id,displayName,formattedAddress,shortFormattedAddress,nationalPhoneNumber,"
                "internationalPhoneNumber,websiteUri,googleMapsUri,rating,userRatingCount,"
                "businessStatus,primaryType,primaryTypeDisplayName,types,location,"
                "regularOpeningHours,currentOpeningHours,utcOffsetMinutes,addressComponents,editorialSummary"
            ),
        )

        if response.status_code >= 400:
            detail = response.text
            try:
                detail = response.json().get("error", {}).get("message", detail)
            except Exception:
                pass
            raise PlacesError(f"Place details failed: {detail}", status_code=response.status_code)

        return normalize_place(response.json(), include_summary=True)
