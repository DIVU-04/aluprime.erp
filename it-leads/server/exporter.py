from __future__ import annotations

import csv
import io
import json
from typing import Any

LEAD_COLUMNS = [
    ("business_name", "Business Name"),
    ("category", "Category"),
    ("types", "All Types"),
    ("phone", "Phone"),
    ("international_phone", "International Phone"),
    ("website", "Website"),
    ("email", "Email"),
    ("address", "Full Address"),
    ("city", "City"),
    ("state", "State"),
    ("postal_code", "Postal Code"),
    ("country", "Country"),
    ("rating", "Rating"),
    ("review_count", "Review Count"),
    ("business_status", "Status"),
    ("opening_hours", "Opening Hours"),
    ("latitude", "Latitude"),
    ("longitude", "Longitude"),
    ("google_maps_url", "Google Maps URL"),
    ("place_id", "Place ID"),
    ("description", "Description"),
]


def leads_to_csv(leads: list[dict[str, Any]]) -> str:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow([label for _, label in LEAD_COLUMNS])
    for lead in leads:
        writer.writerow([lead.get(key, "") for key, _ in LEAD_COLUMNS])
    return buffer.getvalue()


def leads_to_json(leads: list[dict[str, Any]]) -> str:
    return json.dumps(leads, indent=2, ensure_ascii=False)
