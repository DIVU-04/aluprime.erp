# MapLead Engine — Google Maps Lead Generation Toolkit

A modern, responsive static website for **MapLead Engine**, built for **IT
service companies** that want local-business leads from Google Maps.

The project now includes:

1. **`index.html`** — a branded landing page plus interactive lead brief builder
2. **`lead-generator.html`** — a browser-based Google API tool that can fetch and
   export leads directly to CSV

> **Plan the outreach brief, then generate the lead file**

## Features

- Sticky navbar with mobile hamburger menu
- Branded homepage focused on Google Maps lead generation for IT services
- Interactive **lead brief builder** for:
  - IT service selection
  - business niche / lead type selection
  - multi-location targeting
  - lead field selection
  - delivery format planning
- Live preview that updates as the form changes
- Copy-to-clipboard lead brief output
- Dedicated **Google Maps IT lead generator** page with CSV export
- Lead categories, workflow, package and FAQ sections
- Official Google API workflow on the generator page
- SEO-ready metadata, Open Graph tags and `SoftwareApplication` JSON-LD
- Fully responsive (desktop, tablet, mobile)
- No build step — pure HTML, CSS and vanilla JS

## Project structure

```text
.
├── index.html
├── lead-generator.html
├── robots.txt
├── sitemap.xml
├── .htaccess               # Apache / LiteSpeed config
├── netlify.toml            # Netlify config
├── vercel.json             # Vercel config
├── Dockerfile              # self-hosting via nginx
├── scripts/build-zip.sh    # build dist/maplead-engine-site.zip for upload
├── .github/workflows/
│   └── deploy.yml          # GitHub Pages CI/CD
└── assets
    ├── css/styles.css
    ├── css/lead-generator.css
    ├── js/script.js
    ├── js/lead-generator.js
    └── img/                # logo + favicon (SVG)
```

## Pages

### 1) Homepage and lead brief builder

Open `index.html` to:

- explain the offer for IT service companies
- choose target niches and cities
- select which lead fields are required
- preview the expected output
- copy a structured lead-generation brief for your sales or delivery team

### 2) Google Maps lead generator

Open `lead-generator.html` to generate business leads by lead type and location.

#### What it does

- Accepts multiple lead types (one per line), e.g. `Software company`,
  `Managed IT services`
- Accepts multiple locations (one per line), e.g. `Ahmedabad, India`
- Uses Google APIs to fetch detailed business data:
  - business name and primary type
  - address
  - phone number and website
  - rating and review count
  - business status / open-now state
  - Google Maps URL and coordinates
- Exports selected fields to CSV

#### API setup required

In Google Cloud Console for your project:

1. Enable **Places API**.
2. Enable **Geocoding API**.
3. Create an API key and restrict it (HTTP referrer restrictions + API
   restrictions).
4. Paste the key into the tool and click **Generate Leads**.

> Notes:
> - This implementation uses official Google APIs, not scraping.
> - Google pricing, usage limits and outreach compliance are your responsibility.

## Run locally

It's a static site — just open `index.html` or `lead-generator.html` in a
browser, or serve the repo:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Deployment

The site is fully static, so it can be hosted anywhere.

### 1. GitHub Pages

A workflow is included at `.github/workflows/deploy.yml`. To enable it:

1. Merge this branch into `main`.
2. In the repo, go to **Settings → Pages → Build and deployment** and set
   **Source = GitHub Actions**.
3. Every push to `main` then publishes automatically. The live URL will be
   `https://<your-user>.github.io/<repo>/`.

### 2. Netlify

- Drag-and-drop the project folder onto <https://app.netlify.com/drop>, **or**
- Connect the repo — `netlify.toml` already sets publish dir to `.` with no build
  command.

### 3. Vercel

- Run `npx vercel` in the project root, **or** import the repo at
  <https://vercel.com/new>. `vercel.json` configures it as a static site.

### 4. Docker / any VPS (nginx)

```bash
docker build -t maplead-engine .
docker run --rm -p 8080:80 maplead-engine
# open http://localhost:8080
```

### 5. Hostinger / shared hosting

Hostinger runs LiteSpeed (Apache-compatible), so the included `.htaccess`
handles caching, compression and security headers.

Build the upload bundle:

```bash
bash scripts/build-zip.sh
```

This creates `dist/maplead-engine-site.zip`.

## Customizing

- **Homepage messaging:** edit `index.html`
- **Lead brief behavior:** edit `assets/js/script.js`
- **Live lead generator UI:** edit `lead-generator.html`
- **Google API behavior and CSV export:** edit `assets/js/lead-generator.js`
- **Styling:** edit `assets/css/styles.css` and `assets/css/lead-generator.css`
- **Branding:** update the SVG assets under `assets/img/`
- **Domain-specific SEO:** update `robots.txt`, `sitemap.xml` and any final
  canonical / Open Graph URLs after deployment
