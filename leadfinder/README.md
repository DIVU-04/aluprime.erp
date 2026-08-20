# LeadFinder

An internal prospecting workspace for IT service companies. Search selected
business types and locations through the official Google Places API, qualify
the results, add sales notes, track status, and export a CSV.

LeadFinder is a separate application inside the KB Garage repository. It does
not alter the existing public garage website.

## Included

- 29 preset prospect types plus any custom business type
- Up to 20 free-form locations per search
- Rating, review, phone, website, and exclusion filters
- Google Places details: business name, category, address, phone, website,
  rating, reviews, hours, status, price level, coordinates, Maps URL, and
  Place ID
- Duplicate prevention by Google Place ID
- Contactability score and simple IT opportunity indicators
- Lead status, notes, filtering, and CSV export
- Demo data that works without API credentials
- Server-side API key handling

Google Places does not provide email addresses, owner names, or personal
LinkedIn profiles. Those fields require a lawful enrichment provider or manual
research. Do not scrape Google Maps to obtain them.

## Setup

Python 3.11+ is recommended.

```bash
cd leadfinder
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements.txt
export GOOGLE_MAPS_API_KEY="your-server-side-key"
uvicorn app:app --host 127.0.0.1 --port 8000
```

Open <http://127.0.0.1:8000>. Without a key, use **Load demo data**.

The key needs **Places API (New)** access. Restrict it in Google Cloud to the
Places API and to the server's IP where possible. Never put this key in
`static/app.js`.

Optional environment variables:

| Variable | Purpose | Default |
| --- | --- | --- |
| `GOOGLE_MAPS_API_KEY` | Server-side Places API key | none |
| `LEADFINDER_DB_PATH` | SQLite database location | `leadfinder/data/leads.db` |

## Test

From the repository root:

```bash
python3 -m unittest discover -s leadfinder/tests -v
```

Tests use demo data and never call Google.

## Production checklist

This MVP is intended for a trusted internal team. Before exposing it publicly:

1. Add authentication and HTTPS.
2. Back up the SQLite database or move to managed PostgreSQL.
3. Add per-user roles and an audit log.
4. Review Google Maps Platform pricing, attribution, caching, and export terms.
5. Implement a refresh/deletion policy for cached Places content.
6. Follow local telemarketing, privacy, consent, and opt-out laws.

The app displays “Places data by Google” attribution. Google Maps Platform
terms can limit storage and use of Places content; requirements vary by field
and can change. This project does not bypass those restrictions.
