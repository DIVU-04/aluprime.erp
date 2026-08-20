# IT Maps Lead Generator

Generate **business leads from Google Maps** for your IT services company. Select any location, choose from 20+ business categories, and export full contact details.

**Compatible with:** Windows · macOS · Ubuntu / Linux · iOS (iPhone/iPad) · Android

Works as a web app in any browser, installable as a PWA on mobile, and runnable locally on desktop.

## Platform support

| Platform | How to run | Browser |
|----------|------------|---------|
| **Windows** | Double-click `run.bat` or run `run.ps1` in PowerShell | Chrome, Edge, Firefox |
| **macOS** | Run `./run.sh` in Terminal | Safari, Chrome |
| **Ubuntu / Linux** | Run `./run.sh` or `bash scripts/install-ubuntu.sh` | Chrome, Firefox |
| **iOS (iPhone/iPad)** | Open `http://YOUR-PC-IP:8080` on same Wi-Fi → Share → **Add to Home Screen** | Safari |
| **Android** | Open `http://YOUR-PC-IP:8080` on same Wi-Fi → Menu → **Install app** | Chrome |
| **Docker (all OS)** | `docker compose up` | Any browser |

### Mobile install (iOS & Android)

1. Start the app on your PC/Mac (`run.bat`, `run.sh`, or Docker)
2. On your phone (same Wi-Fi), open the **Network URL** shown in the terminal (e.g. `http://192.168.1.5:8080`)
3. **iOS:** Safari → Share → Add to Home Screen
4. **Android:** Chrome → menu → Install app / Add to Home screen

The UI is responsive with touch-friendly buttons, safe-area support for iPhone notch, and no zoom on input focus.

## Location coverage

Search **any location worldwide**:

- **190+ countries** in the country filter (or choose **Worldwide** for no limit)
- **Type any city, state, or address** — Paris, Tokyo, New York, Dubai, Sydney, etc.
- **Location autocomplete** powered by Google Maps (suggestions as you type)
- **Quick-pick cities** grouped by region: Asia, Europe, Americas, Middle East & Africa, Oceania

Examples you can search:
- `London, UK`
- `New York, NY, USA`
- `Dubai, UAE`
- `Singapore`
- `Berlin, Germany`
- `São Paulo, Brazil`
- Any small town or neighborhood worldwide

## Multiple leads (batch generation)

Generate **many leads in one click** from multiple locations and categories:

| Setting | Limit |
|---------|-------|
| Locations per batch | Up to **10** |
| Categories per batch | Up to **5** |
| Max searches (location × category) | **25** |
| Leads per search | Up to **60** |
| Total leads per batch | Up to **500** |

### How to generate multiple leads

1. **Add multiple locations** — type a city and click **+ Add location** (repeat for Mumbai, London, Dubai, etc.)
2. **Optional: multiple categories** — check "Search multiple categories at once" and pick Offices, Hospitals, Schools, etc.
3. Set **max leads per search** (5–60)
4. Click **Generate All Leads**
5. All results merge into one table — duplicates removed automatically
6. **Download** everything as one CSV/Excel file

**Example:** 3 cities × 4 categories × 20 leads = up to **240 leads** in one run.

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

### 3. Run on your platform

**Windows (CMD):**
```bat
run.bat
```

**Windows (PowerShell):**
```powershell
.\run.ps1
```

**macOS / Ubuntu / Linux:**
```bash
chmod +x run.sh
./run.sh
```

**Ubuntu first-time setup:**
```bash
bash scripts/install-ubuntu.sh
./run.sh
```

**Docker (Windows, macOS, Ubuntu, any OS):**
```bash
cp .env.example .env
# add API key to .env
docker compose up --build
```

Open **http://localhost:8080** in your browser.

On phone/tablet (same Wi-Fi), use the **Network URL** printed when the server starts.

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
