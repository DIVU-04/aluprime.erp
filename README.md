# KB Garage — Website

A modern, responsive marketing website for **KB Garage**, a car service & repair
garage in Gota, Ahmedabad. The design is inspired by car-service platforms like
GoMechanic, adapted to KB Garage's black & gold brand and services.

> **Quality Comes First**

## Features

- Sticky navbar with mobile hamburger menu
- Hero section with a "free estimate" lead form
- Services grid (service & repair, denting & painting, AC, washing, pick-up & drop, insurance)
- Why-us, How-it-works and Pricing sections
- Customer reviews
- FAQ section with an accordion (one item open at a time)
- Booking / contact section with business details
- Booking forms that open **WhatsApp** with the customer's details pre-filled
- Floating WhatsApp & Call buttons + a back-to-top button
- Dedicated **Google Maps IT lead generator** page with CSV export (`lead-generator.html`)
- SEO ready: meta description/keywords, Open Graph & Twitter cards, inline SVG favicon and `AutoRepair` JSON-LD structured data
- Fully responsive (desktop, tablet, mobile)
- No build step — pure HTML, CSS and vanilla JS

## Business details

- **Owner:** Krunal Patel
- **Phone / WhatsApp:** +91 70 96 77 78 96
- **Address:** Near Seventh Parisar, Opp. Vishnudhara Garden, B/h. Jaguar Showroom,
  R.C.C. Road, S.G. Highway, Gota, Ahmedabad – 382481
- **Hours:** 24×7, insurance assistance available

## Project structure

```
.
├── index.html
├── lead-generator.html
├── robots.txt
├── sitemap.xml
├── .htaccess               # Hostinger / Apache / LiteSpeed config
├── netlify.toml            # Netlify config
├── vercel.json             # Vercel config
├── Dockerfile              # self-hosting via nginx
├── scripts/build-zip.sh    # build dist/kb-garage-site.zip for upload
├── .github/workflows/
│   └── deploy.yml          # GitHub Pages CI/CD
└── assets
    ├── css/styles.css
    ├── css/lead-generator.css
    ├── js/script.js
    ├── js/lead-generator.js
    └── img/                # logo + favicon (SVG)
```

## Google Maps lead generator (IT services)

Open `lead-generator.html` to generate business leads by lead type and location.

### What it does

- Accepts multiple lead types (one per line), e.g. `Software company`, `Managed IT services`
- Accepts multiple locations (one per line), e.g. `Ahmedabad, India`
- Uses Google APIs to fetch detailed business data:
  - business name, type, address
  - phone number, website
  - rating, review count, open/closed status
  - Google Maps URL and coordinates
- Exports selected fields to CSV

### API setup required

In Google Cloud Console for your project:

1. Enable **Places API**.
2. Enable **Geocoding API**.
3. Create an API key and restrict it (HTTP referrer restrictions + API restrictions).
4. Paste the key into the tool and click **Generate Leads**.

> Notes:
> - This implementation uses official Google APIs (not scraping).
> - Google usage/billing and legal compliance for outreach are your responsibility.

## Run locally

It's a static site — just open `index.html` in a browser, or serve it:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Deployment

The site is fully static, so it can be hosted anywhere. Pick one:

### 1. GitHub Pages (recommended, free)

A workflow is included at `.github/workflows/deploy.yml`. To enable it:

1. Merge this branch into `main`.
2. In the repo, go to **Settings → Pages → Build and deployment** and set
   **Source = GitHub Actions**.
3. Every push to `main` then publishes automatically. The live URL will be
   `https://<your-user>.github.io/<repo>/` (you can also run it manually from the
   **Actions** tab via "Run workflow").

### 2. Netlify

- Drag-and-drop the project folder onto <https://app.netlify.com/drop>, **or**
- Connect the repo — `netlify.toml` already sets publish dir to `.` with no build
  command.

### 3. Vercel

- Run `npx vercel` in the project root, **or** import the repo at
  <https://vercel.com/new>. `vercel.json` configures it as a static site.

### 4. Docker / any VPS (nginx)

```bash
docker build -t kb-garage .
docker run --rm -p 8080:80 kb-garage
# open http://localhost:8080
```

### 5. Hostinger (shared hosting)

Hostinger runs LiteSpeed (Apache-compatible), so the included `.htaccess` handles
HTTPS, caching, compression and security headers. Choose one method:

**A) hPanel File Manager (easiest)**

1. Build the upload bundle: `bash scripts/build-zip.sh` → creates
   `dist/kb-garage-site.zip`.
2. In hPanel go to **Files → File Manager** and open **`public_html`**.
   Delete the default `default.php`/`index.html` if present.
3. Click **Upload** and upload `kb-garage-site.zip`.
4. Right-click the uploaded ZIP → **Extract** (into `public_html`).
   You should end up with `index.html`, `assets/`, `robots.txt`, `sitemap.xml`
   and `.htaccess` directly inside `public_html`.
5. Visit your domain. (Enable **File Manager → Settings → Show hidden files** to
   see `.htaccess`.)

**B) FTP (FileZilla)**

1. In hPanel: **Files → FTP Accounts** to get host, username and password.
2. Connect with FileZilla and open `public_html`.
3. Upload `index.html`, `robots.txt`, `sitemap.xml`, `.htaccess` and the whole
   `assets/` folder.

**C) Git deployment (Hostinger Business plans)**

1. hPanel → **Advanced → GIT**.
2. Repository: `https://github.com/DIVU-04/kbgarage.git`, Branch: `main`,
   Install path: `public_html` (leave blank for repo root).
3. Click **Create**, then **Deploy**. (For a private repo, add Hostinger's SSH
   key to the GitHub repo's Deploy Keys first.)

After deploying, enable free SSL in hPanel (**Security → SSL**), then uncomment the
"Force HTTPS" block in `.htaccess`.

### 6. Plain static host

Upload `index.html`, `robots.txt`, `sitemap.xml` and the `assets/` folder to any
web host (cPanel, S3 + CloudFront, Firebase Hosting, etc.). No build step needed.

> The site is configured for the domain **https://kbgarage.in/** (canonical /
> Open-Graph URLs in `index.html`, plus `robots.txt` and `sitemap.xml`). If the
> domain ever changes, update those URLs accordingly.

## Customising

- **Contact number:** update `WHATSAPP` in `assets/js/script.js` and the `tel:` /
  `wa.me` links in `index.html`.
- **Prices & services:** edit the relevant sections in `index.html`.
- **Colors:** tweak the CSS custom properties (`--gold`, `--bg`, …) at the top of
  `assets/css/styles.css`.
