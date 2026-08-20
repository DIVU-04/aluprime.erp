# IT Maps Lead Generator

Generate **business leads from Google Maps** for your IT services company. Select any location, choose from 20+ business categories, and export full contact details.

## Download system

After generating leads, click **Download Leads** to open the download panel:

| Format | Best for |
|--------|----------|
| **CSV** | Excel, Google Sheets, CRM import |
| **Excel (.xlsx)** | Formatted spreadsheet with styled headers |
| **JSON** | Apps, automation, custom CRM pipelines |
| **Text (.txt)** | Quick readable list for sharing |

### Download features

- **Instant download** — uses your current search results (no extra Google API calls)
- **Custom file name** — or auto-generated with location, category, and date
- **Choose columns** — pick exactly which fields to include
- **Single lead download** — download one lead as text from the detail view
- **Download history** — last 10 downloads saved in your browser

### API

```http
POST /api/download
Content-Type: application/json

{
  "format": "xlsx",
  "leads": [ ... ],
  "filename": "my-leads",
  "location": "Ahmedabad, Gujarat",
  "category": "Offices & Corporate",
  "columns": ["business_name", "phone", "website", "address"]
}
```

Supported formats: `csv`, `xlsx`, `json`, `txt`

## What you get for each lead

| Field | Description |
|-------|-------------|
| Business Name | Company / shop name |
| Category | Primary business type |
| Phone | Local phone number |
| Website | Business website URL |
| Full Address | Street address from Google Maps |
| City, State, Postal Code, Country | Parsed address parts |
| Rating & Reviews | Google star rating and review count |
| Opening Hours | Weekly schedule |
| Google Maps URL | Direct link to the listing |
| Latitude / Longitude | GPS coordinates |
| Place ID | Unique Google Places identifier |
| Business Status | Operational / closed |

> **Note:** Google Maps does not provide email addresses directly. The export includes an Email column for your own follow-up data.

## Lead categories (for IT services)

Built-in categories target businesses that commonly need IT support:

- Offices & Corporate
- Startups & Coworking
- Hospitals & Clinics
- Schools & Colleges
- Retail, Restaurants, Hotels
- Law Firms, CA / Accounting
- Banks, Manufacturing, Warehouses
- And more — plus **Custom Search** for any keyword

## Quick start

### 1. Get a Google Maps API key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project (or use an existing one)
3. Enable these APIs:
   - **Places API (New)**
   - **Geocoding API**
4. Create an API key under **APIs & Services → Credentials**
5. (Recommended) Restrict the key to Places API + Geocoding API

### 2. Configure

```bash
cd it-leads
cp .env.example .env
# Edit .env and paste your API key:
# GOOGLE_MAPS_API_KEY=AIza...
```

### 3. Run

```bash
chmod +x run.sh
./run.sh
```

Open **http://localhost:8080** in your browser.

Or manually:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn server.main:app --reload --host 0.0.0.0 --port 8080
```

## How to use

1. **Select country** — India, US, UK, UAE, and more
2. **Enter city/area** — e.g. `Ahmedabad, Gujarat` or any address worldwide
3. **Pick a business category** — offices, hospitals, retail, etc.
4. **Set radius** — 1–50 km search area
5. Click **Generate Leads**
6. **Export CSV / JSON** or copy leads to clipboard

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/config` | Categories, countries, preset cities |
| POST | `/api/search` | Generate leads |
| POST | `/api/export/csv` | Download CSV |
| POST | `/api/export/json` | Download JSON |
| GET | `/api/place/{place_id}` | Full details for one place |

## Pricing note

Google Places API is a paid service (Google gives ~$200/month free credit). Each search uses Text Search + Geocoding calls. Monitor usage in Google Cloud Console.

## Project structure

```
it-leads/
├── server/
│   ├── main.py           # FastAPI app
│   ├── places_service.py # Google Places integration
│   ├── categories.py     # IT lead categories & locations
│   └── exporter.py       # CSV / JSON export
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── requirements.txt
├── .env.example
└── run.sh
```
