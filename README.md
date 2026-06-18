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
├── robots.txt
├── sitemap.xml
├── netlify.toml            # Netlify config
├── vercel.json             # Vercel config
├── Dockerfile              # self-hosting via nginx
├── .github/workflows/
│   └── deploy.yml          # GitHub Pages CI/CD
└── assets
    ├── css/styles.css
    ├── js/script.js
    └── img/                # logo + favicon (SVG)
```

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

### 5. Plain static host

Upload `index.html`, `robots.txt`, `sitemap.xml` and the `assets/` folder to any
web host (cPanel, S3 + CloudFront, Firebase Hosting, etc.). No build step needed.

> After deploying to a real domain, update the `canonical`/Open-Graph URLs in
> `index.html` and the `Sitemap:` / `<loc>` URLs in `robots.txt` and `sitemap.xml`
> from `kbgarage.example` to your actual domain.

## Customising

- **Contact number:** update `WHATSAPP` in `assets/js/script.js` and the `tel:` /
  `wa.me` links in `index.html`.
- **Prices & services:** edit the relevant sections in `index.html`.
- **Colors:** tweak the CSS custom properties (`--gold`, `--bg`, …) at the top of
  `assets/css/styles.css`.
