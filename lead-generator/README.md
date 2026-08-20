# Google Maps Lead Generator

A self-hosted web app that generates **business leads from Google Maps** for any
lead type and any location, then lets you export the full details to CSV. Built
for service companies (e.g. an **IT-services** company) that want to find and
contact prospects.

For every lead you get:

| Field | Description |
| --- | --- |
| `name` | Business name |
| `category` | Business type / primary category |
| `address` | Full formatted address |
| `phone` | Phone number |
| `website` | Website URL (empty if none) |
| `rating` | Google star rating |
| `reviews` | Number of reviews |
| `status` | Operational status (e.g. `OPERATIONAL`) |
| `hours` | Opening hours |
| `latitude` / `longitude` | Coordinates |
| `mapsUrl` | Direct Google Maps link |
| `hasWebsite` | `true` / `false` — filter for prospects with **no website** |
| `source` | `google` or `osm` |

> **Tip for IT-services prospecting:** tick **"Only show leads without a
> website"** to instantly find businesses that likely need a website, web app,
> or digital services.

## Features

- Search **any lead type** (restaurants, clinics, law firms, hotels, IT
  companies, …) — free-text plus one-click preset chips.
- Search **any location** (city, area, or region worldwide).
- Choose how many results to pull (up to 120).
- Two data sources:
  - **Google Maps** (Google Places API) — richest data (phone, rating,
    reviews, hours). Requires a free API key.
  - **OpenStreetMap** — completely free, no key needed (good fallback, data
    completeness varies by area).
- Results shown in a sortable table with clickable phone/website/map links.
- **Export to CSV** or **copy the table** for Excel / Google Sheets / your CRM.

## Quick start

```bash
cd lead-generator
npm install
cp .env.example .env      # then add your Google API key (optional)
npm start
# open http://localhost:3000
```

Without any configuration the app runs immediately using the **free
OpenStreetMap** source. Add a Google key for the best results.

## Getting a Google Places API key (recommended)

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project (or pick an existing one).
3. Enable **Places API (New)**.
4. Create an **API key** under *APIs & Services → Credentials*.
5. Put it in `.env`:

   ```env
   GOOGLE_MAPS_API_KEY=your_key_here
   DEFAULT_PROVIDER=google
   ```

6. Restart the server.

Google gives a monthly free usage credit; keep an eye on your Cloud billing and
[restrict your key](https://developers.google.com/maps/api-security-best-practices)
to the Places API.

## How it works

```
public/            → frontend (form, results table, CSV export)
server.js          → Express server + REST API
src/leads.js       → orchestration + CSV builder
src/providers/
  google.js        → Google Places API (New) Text Search
  osm.js           → Nominatim geocode + Overpass POI search (free)
```

### API endpoints

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| `GET` | `/api/config` | – | which providers are enabled |
| `POST` | `/api/leads` | `{ type, location, limit, provider, onlyNoWebsite }` | JSON leads |
| `POST` | `/api/leads.csv` | same as above | CSV download |

Example:

```bash
curl -X POST http://localhost:3000/api/leads \
  -H 'Content-Type: application/json' \
  -d '{"type":"dentists","location":"Ahmedabad","limit":20,"provider":"osm"}'
```

## Notes & responsible use

- Respect the terms of service of each data source. This app uses the official
  **Google Places API** (not scraping) and the community **OpenStreetMap**
  Overpass/Nominatim APIs.
- Google Text Search returns up to ~60 results per query; to gather more, run
  several searches with narrower locations or lead types.
- OpenStreetMap coverage of phone numbers / websites depends on what volunteers
  have mapped in a given area, so it is best used as a free starting point.
- Follow anti-spam / data-protection laws (e.g. DND registries, GDPR) when
  contacting the leads you generate.
