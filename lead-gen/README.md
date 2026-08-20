# LeadGen — Google Maps → B2B Leads (for IT Services)

A small self-hosted web app that pulls **business leads from Google Maps**
using the official **Google Places API (New)** — for **any business category**
and **any location** — and returns everything you need to reach out:

- Business name, category, and address (with street / city / state / pincode
  broken out)
- **Phone** (international + national formats)
- **Website** + a best-effort scrape of the site to find **emails** and
  social handles (Facebook, Instagram, LinkedIn, X/Twitter, YouTube)
- Google rating, review count, business status, opening hours
- Latitude / longitude + a direct Google Maps link
- One-click **CSV / JSON export**, and the ability to save runs on disk

Built for an **IT services company** — presets are tuned to the kinds of
businesses that typically buy IT services (CAs, clinics, schools, hotels,
retail shops, real estate agencies, etc.).

---

## ⚠️ Read this first — legality

- **Scraping google.com/maps directly is against Google's Terms of Service**
  and will get you rate-limited and IP-banned. This tool does **not** do that.
- It uses the **official Places API (New)**, which returns the same data
  legally and reliably. You need a Google Cloud API key.
- Google Maps does **not** store emails — this app tries to fetch them from
  each business's own public website (that's fine and normal). Success rate
  is typically 40–60%.

## Setup

### 1. Get a Google Cloud API key

1. Open <https://console.cloud.google.com/> and create a project.
2. Enable these APIs on the project:
   - **Places API (New)**
   - **Geocoding API** (used only when you enter an address for the "radius
     sweep" mode)
3. Go to **APIs & Services → Credentials → Create credentials → API key**.
4. Restrict the key: **API restrictions → Restrict key** → tick *Places API
   (New)* and *Geocoding API*. For production also add an *IP address*
   restriction so nobody else can use your key.
5. Add billing to the project. Places API (New) has a **generous free tier**
   (roughly the first ~$200 of usage each month is free) — for a lead-gen
   workflow you'll usually stay well within it.

### 2. Install and run

You need **Node.js 18 or newer**.

```bash
cd lead-gen
cp .env.example .env
# then open .env and paste your key into GOOGLE_MAPS_API_KEY

npm install
npm start
```

Open <http://localhost:3000> in your browser.

## How to use

The UI has two search modes:

### A) Keyword + location (recommended)
Type what you want and where — for example:

- `chartered accountants` in `Ahmedabad`
- `hotels` in `Surat, Gujarat`
- `real estate agencies` in `Mumbai`

The IT-buyer preset chips fill the "what" field with common categories that
typically buy IT services (CAs, clinics, schools, hotels, retail, etc.).

You can filter by minimum rating and by "open now", and pull up to 60 results
per query (that's Google's cap for a single text search — for a full city,
split by area).

### B) Radius sweep
Enter an address or lat/lng and a radius (up to 50 km). Optionally tick one
or more business-type chips (`accounting`, `lawyer`, `restaurant`, …) to
filter. Great when you already have a target neighbourhood.

### Getting emails
Both modes offer a "Scrape websites for emails & socials" checkbox. When on,
after Google returns the leads, the server fetches each business's own
website (home / contact / about pages) and pulls emails + social links from
them. This adds a few seconds per search but massively boosts usable leads.

### Exporting
Every result table has three buttons:

- **Download CSV** — open directly in Excel or Google Sheets.
- **Download JSON** — for programmatic use.
- **Save run** — persist the run on the server under `lead-gen/data/`.

## API (if you want to call it from other tools)

- `POST /api/search` — `{ query, region?, minRating?, openNow?, maxPages?, enrichWebsites? }`
- `POST /api/nearby` — `{ lat?, lng?, address?, radius?, includedTypes?, enrichWebsites? }`
- `POST /api/export` — `{ leads, filename? }` → returns a CSV file
- `POST /api/save`   — `{ name, leads }` → writes JSON into `data/`
- `GET  /api/runs`   — list saved runs
- `GET  /api/health` — server + key status
- `GET  /api/presets` — categories, radii, nearby types

## Costs — rough guide

Places API (New) charges roughly per request and per field. With the full
field mask this tool uses:

- **Text Search / Nearby**: ~$0.03–0.04 per 20-result page.
- Google gives ~$200 of Maps Platform credit free every month.
- So ~5,000+ result pages per month are typically free. Enable a **Billing
  alert** in Google Cloud to stay safe.

The website-scrape step is free — it just fetches public HTML.

## Deploying

It's a plain Node app, so any host works:

- **Render / Railway / Fly.io**: point them at this folder, set the
  `GOOGLE_MAPS_API_KEY` env var, `npm start` as the start command.
- **Docker**: `docker run -e GOOGLE_MAPS_API_KEY=xxxx -p 3000:3000 node:20-alpine`
  after copying the folder in.
- **Your own VPS**: `pm2 start server.js --name leadgen`.

Whatever host you pick, add the server's IP to the API key's IP restriction
list.

## Roadmap (nice-to-haves)

- Bulk mode: paste a list of cities → runs the same query across all of them
  and merges + dedupes.
- CRM push: one-click send to HubSpot / Zoho / Google Sheets.
- Enrichment: try to guess the decision-maker's name from LinkedIn for each
  lead.
- Scheduled runs (cron) that email you new leads each week.

If you want any of the above wired up, open an issue.
