# Google Maps Lead Generation App

Lead-generation software for service businesses (including IT services) that lets you:

- Select **multiple lead types**
- Select **multiple locations**
- Generate business leads from **Google Maps (Places API)**
- Export complete lead details as **CSV** or **JSON**

## What this app captures

For each lead, the app retrieves:

- Business name
- Lead type(s) matched
- Location(s) searched
- Category / place types
- Full address
- Phone number (if available)
- Website (if available)
- Rating + review count
- Business status
- Google Maps URL
- Place ID
- Latitude / longitude
- Timestamp

## Requirements

You need a Google Cloud API key with:

1. **Maps JavaScript API** enabled
2. **Places API** enabled
3. Billing enabled on the Google Cloud project

> This app uses official Google APIs. Respect Google Maps Platform Terms of Service and
> your API quota limits.

## Run locally

This is a static app.

```bash
python3 -m http.server 8000
```

Then open:

<http://localhost:8000>

## How to use

1. Open the app
2. Enter your Google API key
3. Enter your core keyword (e.g. `it services`)
4. Enter locations (one per line)
5. Select lead types (or add custom lead types)
6. Choose radius and max results
7. Click **Generate Leads**
8. Export data as CSV or JSON

## Notes

- Google usually returns up to 60 results per text search query.
- More lead types × more locations = more API calls.
- If you get quota/rate-limit errors, lower combinations or run in smaller batches.
