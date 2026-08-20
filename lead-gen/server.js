/* eslint-disable no-console */
'use strict';

require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const cheerio = require('cheerio');

const API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';
const PORT = Number(process.env.PORT || 3000);
const SCRAPE_WEBSITES_DEFAULT = String(process.env.SCRAPE_WEBSITES || 'true') === 'true';

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

/* ------------------------------------------------------------------ *
 * Google Places (New) helpers
 *   Docs: https://developers.google.com/maps/documentation/places/web-service/text-search
 *         https://developers.google.com/maps/documentation/places/web-service/nearby-search
 * ------------------------------------------------------------------ */

// One place returned by the New API has these fields. Requesting them all in
// one shot avoids extra "Place Details" calls (and extra billing).
const PLACE_FIELDS = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.shortFormattedAddress',
  'places.addressComponents',
  'places.location',
  'places.googleMapsUri',
  'places.websiteUri',
  'places.internationalPhoneNumber',
  'places.nationalPhoneNumber',
  'places.rating',
  'places.userRatingCount',
  'places.priceLevel',
  'places.businessStatus',
  'places.primaryType',
  'places.primaryTypeDisplayName',
  'places.types',
  'places.regularOpeningHours',
  'places.currentOpeningHours',
  'places.editorialSummary',
  'places.plusCode',
  'places.utcOffsetMinutes',
  'nextPageToken',
].join(',');

async function placesTextSearch({ query, region, minRating, openNow, pageSize = 20, pageToken }) {
  const body = { textQuery: query, pageSize };
  if (region) body.regionCode = region;
  if (openNow) body.openNow = true;
  if (minRating) body.minRating = Number(minRating);
  if (pageToken) body.pageToken = pageToken;

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': PLACE_FIELDS,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data?.error?.message || `Places textSearch failed (${res.status})`);
    err.status = res.status;
    err.details = data;
    throw err;
  }
  return data;
}

async function placesNearbySearch({ lat, lng, radius, includedTypes, pageSize = 20 }) {
  const body = {
    maxResultCount: pageSize,
    locationRestriction: {
      circle: {
        center: { latitude: Number(lat), longitude: Number(lng) },
        radius: Number(radius),
      },
    },
  };
  if (Array.isArray(includedTypes) && includedTypes.length) body.includedTypes = includedTypes;

  const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': PLACE_FIELDS,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data?.error?.message || `Places nearbySearch failed (${res.status})`);
    err.status = res.status;
    err.details = data;
    throw err;
  }
  return data;
}

async function geocode(address) {
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', address);
  url.searchParams.set('key', API_KEY);
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== 'OK' || !data.results?.length) {
    const err = new Error(`Geocode failed: ${data.status} ${data.error_message || ''}`.trim());
    err.status = 400;
    throw err;
  }
  const { lat, lng } = data.results[0].geometry.location;
  return { lat, lng, formatted: data.results[0].formatted_address };
}

/* ------------------------------------------------------------------ *
 * Website scraping helper — best-effort email & socials pull.
 * Only hits pages the business itself put online.
 * ------------------------------------------------------------------ */

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const CONTACT_PATHS = ['', '/contact', '/contact-us', '/about', '/about-us'];
const BLOCKED_EMAIL_DOMAINS = /@(sentry|wixpress|example|test|.*\.png|.*\.jpg|.*\.jpeg|.*\.gif|.*\.webp)/i;

function pickSocials(html) {
  const socials = {};
  const patterns = {
    facebook: /https?:\/\/(?:www\.)?facebook\.com\/[A-Za-z0-9._%+\-\/?=]+/i,
    instagram: /https?:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9._%+\-\/?=]+/i,
    linkedin: /https?:\/\/(?:www\.)?linkedin\.com\/[A-Za-z0-9._%+\-\/?=]+/i,
    twitter: /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[A-Za-z0-9._%+\-\/?=]+/i,
    youtube: /https?:\/\/(?:www\.)?youtube\.com\/[A-Za-z0-9._%+\-\/?=]+/i,
  };
  for (const [name, re] of Object.entries(patterns)) {
    const m = html.match(re);
    if (m) socials[name] = m[0].split('"')[0].split("'")[0];
  }
  return socials;
}

async function fetchWithTimeout(url, ms = 8000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: ctl.signal,
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; LeadGenBot/1.0; +https://kbgarage.in)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!res.ok) return null;
    const ctype = res.headers.get('content-type') || '';
    if (!ctype.includes('text/html')) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function scrapeWebsite(website) {
  if (!website) return null;
  const base = website.replace(/\/+$/, '');
  const emails = new Set();
  let socials = {};
  for (const p of CONTACT_PATHS) {
    const url = base + p;
    const html = await fetchWithTimeout(url);
    if (!html) continue;
    const $ = cheerio.load(html);
    // mailto: links first (highest quality)
    $('a[href^="mailto:"]').each((_, el) => {
      const href = ($(el).attr('href') || '').replace(/^mailto:/i, '').split('?')[0].trim();
      if (href && !BLOCKED_EMAIL_DOMAINS.test(href)) emails.add(href.toLowerCase());
    });
    // Fallback: regex scan of visible text + html
    const raw = $('body').text() + ' ' + html;
    (raw.match(EMAIL_RE) || []).forEach((e) => {
      if (!BLOCKED_EMAIL_DOMAINS.test(e)) emails.add(e.toLowerCase());
    });
    socials = { ...pickSocials(html), ...socials };
    if (emails.size >= 3) break;
  }
  return { emails: [...emails], socials };
}

/* ------------------------------------------------------------------ *
 * Normaliser — flat, CSV-ready lead object
 * ------------------------------------------------------------------ */

function toLead(p) {
  const addr = {};
  for (const c of p.addressComponents || []) {
    for (const t of c.types || []) addr[t] = c.longText || c.shortText;
  }
  return {
    placeId: p.id,
    name: p.displayName?.text || '',
    category: p.primaryTypeDisplayName?.text || p.primaryType || '',
    allCategories: (p.types || []).join('|'),
    phone: p.internationalPhoneNumber || p.nationalPhoneNumber || '',
    website: p.websiteUri || '',
    address: p.formattedAddress || '',
    shortAddress: p.shortFormattedAddress || '',
    street: addr.route || '',
    locality: addr.locality || addr.sublocality || addr.sublocality_level_1 || '',
    city: addr.administrative_area_level_2 || addr.locality || '',
    state: addr.administrative_area_level_1 || '',
    postalCode: addr.postal_code || '',
    country: addr.country || '',
    lat: p.location?.latitude ?? '',
    lng: p.location?.longitude ?? '',
    rating: p.rating ?? '',
    reviews: p.userRatingCount ?? '',
    priceLevel: p.priceLevel || '',
    businessStatus: p.businessStatus || '',
    hours: (p.regularOpeningHours?.weekdayDescriptions || []).join(' | '),
    openNow: p.currentOpeningHours?.openNow ?? '',
    summary: p.editorialSummary?.text || '',
    plusCode: p.plusCode?.compoundCode || '',
    googleMapsUrl: p.googleMapsUri || '',
    emails: '',
    facebook: '',
    instagram: '',
    linkedin: '',
    twitter: '',
    youtube: '',
  };
}

function csvEscape(v) {
  if (v === null || v === undefined) return '';
  const s = String(v).replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
  if (/[",]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function leadsToCsv(leads) {
  if (!leads.length) return '';
  const cols = Object.keys(leads[0]);
  const rows = [cols.join(',')];
  for (const l of leads) rows.push(cols.map((c) => csvEscape(l[c])).join(','));
  return rows.join('\n');
}

/* ------------------------------------------------------------------ *
 * Routes
 * ------------------------------------------------------------------ */

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    hasKey: Boolean(API_KEY),
    scrapeDefault: SCRAPE_WEBSITES_DEFAULT,
  });
});

// Presets tuned for an IT services company — categories of businesses that
// most commonly buy IT services (hardware, networking, web, AMC, CCTV, etc.).
app.get('/api/presets', (req, res) => {
  res.json({
    itBuyers: [
      'small businesses',
      'chartered accountants',
      'law firms',
      'clinics and hospitals',
      'schools and colleges',
      'coaching classes',
      'real estate agencies',
      'car dealerships',
      'hotels and restaurants',
      'retail shops and showrooms',
      'manufacturing units',
      'logistics and transport companies',
      'travel agencies',
      'gyms and fitness centres',
      'salons and spas',
      'jewellery shops',
      'pharmacies',
      'co-working spaces',
      'startups and IT parks',
      'insurance agencies',
    ],
    radiusMeters: [1000, 2000, 5000, 10000, 25000, 50000],
    // Google Places "types" that map cleanly to Nearby Search filters.
    // Full list: https://developers.google.com/maps/documentation/places/web-service/place-types
    nearbyTypes: [
      'accounting', 'lawyer', 'doctor', 'dentist', 'hospital',
      'school', 'university', 'real_estate_agency', 'car_dealer',
      'hotel', 'restaurant', 'store', 'shopping_mall',
      'travel_agency', 'gym', 'beauty_salon', 'pharmacy',
      'insurance_agency', 'bank', 'atm',
    ],
  });
});

// Text search — best when the user types "IT companies in Ahmedabad".
// Handles pagination automatically up to `maxPages`.
app.post('/api/search', async (req, res) => {
  try {
    if (!API_KEY) return res.status(400).json({ error: 'GOOGLE_MAPS_API_KEY is not set. Copy .env.example to .env and add your key.' });
    const {
      query,
      region,
      minRating,
      openNow,
      maxPages = 3, // Places New caps text search at ~60 results (3 pages of 20)
      enrichWebsites = SCRAPE_WEBSITES_DEFAULT,
    } = req.body || {};

    if (!query || !String(query).trim()) return res.status(400).json({ error: 'query is required' });

    const collected = [];
    let pageToken;
    for (let i = 0; i < Math.max(1, Math.min(5, Number(maxPages) || 3)); i++) {
      const data = await placesTextSearch({ query, region, minRating, openNow, pageSize: 20, pageToken });
      const places = data.places || [];
      for (const p of places) collected.push(p);
      if (!data.nextPageToken) break;
      pageToken = data.nextPageToken;
      // Small pause is required for the next page token to activate.
      await new Promise((r) => setTimeout(r, 1500));
    }

    // Dedupe by place id
    const map = new Map();
    for (const p of collected) if (p.id && !map.has(p.id)) map.set(p.id, p);
    const leads = [...map.values()].map(toLead);

    if (enrichWebsites) await enrichAll(leads);

    res.json({ count: leads.length, leads });
  } catch (e) {
    console.error(e);
    res.status(e.status || 500).json({ error: e.message, details: e.details });
  }
});

// Nearby search — best for a radius sweep of an area (e.g. "all restaurants
// within 5km of this pin"). Optional geocoding from a plain address.
app.post('/api/nearby', async (req, res) => {
  try {
    if (!API_KEY) return res.status(400).json({ error: 'GOOGLE_MAPS_API_KEY is not set. Copy .env.example to .env and add your key.' });
    let { lat, lng, address, radius = 5000, includedTypes = [], enrichWebsites = SCRAPE_WEBSITES_DEFAULT } = req.body || {};

    if ((!lat || !lng) && address) {
      const g = await geocode(address);
      lat = g.lat; lng = g.lng;
    }
    if (!lat || !lng) return res.status(400).json({ error: 'Provide either lat/lng or address' });

    const data = await placesNearbySearch({ lat, lng, radius, includedTypes, pageSize: 20 });
    const leads = (data.places || []).map(toLead);

    if (enrichWebsites) await enrichAll(leads);
    res.json({ count: leads.length, center: { lat, lng }, radius, leads });
  } catch (e) {
    console.error(e);
    res.status(e.status || 500).json({ error: e.message, details: e.details });
  }
});

async function enrichAll(leads) {
  const CONCURRENCY = 5;
  let i = 0;
  async function worker() {
    while (i < leads.length) {
      const idx = i++;
      const l = leads[idx];
      if (!l.website) continue;
      try {
        const info = await scrapeWebsite(l.website);
        if (info) {
          l.emails = (info.emails || []).join('; ');
          Object.assign(l, info.socials || {});
        }
      } catch (err) {
        // ignore per-site failures
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
}

// Save + export
app.post('/api/save', async (req, res) => {
  const { name = `run-${Date.now()}`, leads = [] } = req.body || {};
  const safe = String(name).replace(/[^a-z0-9_-]+/gi, '_');
  const file = path.join(DATA_DIR, `${safe}.json`);
  await fsp.writeFile(file, JSON.stringify({ savedAt: new Date().toISOString(), count: leads.length, leads }, null, 2));
  res.json({ ok: true, file: path.relative(__dirname, file), count: leads.length });
});

app.get('/api/runs', async (req, res) => {
  const files = (await fsp.readdir(DATA_DIR)).filter((f) => f.endsWith('.json'));
  const out = [];
  for (const f of files) {
    const s = await fsp.stat(path.join(DATA_DIR, f));
    out.push({ file: f, size: s.size, savedAt: s.mtime.toISOString() });
  }
  res.json(out.sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1)));
});

app.post('/api/export', (req, res) => {
  const { leads = [], filename = `leads-${Date.now()}.csv` } = req.body || {};
  const csv = leadsToCsv(leads);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

app.listen(PORT, () => {
  console.log(`\n  Lead-Gen server listening on http://localhost:${PORT}`);
  if (!API_KEY) console.log('  ⚠  GOOGLE_MAPS_API_KEY missing — set it in lead-gen/.env before searching.');
});
