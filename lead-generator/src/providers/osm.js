// Free OpenStreetMap provider (no API key required).
//
// Strategy: geocode the chosen location with Nominatim to get a bounding box,
// then query the Overpass API for businesses of the requested type inside that
// box. Overpass returns the OSM tags (phone, website, opening_hours, address
// parts, ...) which we normalise into the same lead shape as the Google
// provider. Data completeness depends on what the OSM community has mapped, so
// it is best used as a free fallback when no Google key is available.

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
// Public Overpass mirrors — tried in order so a busy/misbehaving instance
// doesn't take the whole tool down.
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];
const USER_AGENT = "gmaps-lead-generator/1.0 (self-hosted lead tool)";

async function overpassRequest(query) {
  let lastErr;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": USER_AGENT,
          },
          body: `data=${encodeURIComponent(query)}`,
        });
        if (res.ok) return res.json();
        // 429/504 = busy: back off and retry / try next mirror.
        if (res.status === 429 || res.status >= 500) {
          lastErr = new Error(`Overpass API error (${res.status}).`);
          await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
          continue;
        }
        throw new Error(`Overpass API error (${res.status}).`);
      } catch (e) {
        lastErr = e;
        await new Promise((r) => setTimeout(r, 800));
      }
    }
  }
  const err = new Error(
    `OpenStreetMap (Overpass) is busy right now: ${lastErr?.message || "unknown error"}. Please retry, or use the Google Maps source.`
  );
  err.status = 503;
  throw err;
}

// Maps a free-text lead type to OSM tag filters. If nothing matches we fall
// back to a case-insensitive name search so arbitrary keywords still work.
const TYPE_TAGS = {
  restaurant: ['["amenity"="restaurant"]'],
  cafe: ['["amenity"="cafe"]'],
  hotel: ['["tourism"="hotel"]'],
  hospital: ['["amenity"="hospital"]'],
  clinic: ['["amenity"="clinic"]', '["healthcare"="clinic"]'],
  dentist: ['["amenity"="dentist"]', '["healthcare"="dentist"]'],
  doctor: ['["amenity"="doctors"]'],
  pharmacy: ['["amenity"="pharmacy"]'],
  school: ['["amenity"="school"]'],
  college: ['["amenity"="college"]'],
  university: ['["amenity"="university"]'],
  gym: ['["leisure"="fitness_centre"]', '["amenity"="gym"]'],
  salon: ['["shop"="hairdresser"]', '["shop"="beauty"]'],
  bank: ['["amenity"="bank"]'],
  lawyer: ['["office"="lawyer"]'],
  "real estate": ['["office"="estate_agent"]'],
  "car repair": ['["shop"="car_repair"]'],
  "car dealer": ['["shop"="car"]'],
  supermarket: ['["shop"="supermarket"]'],
  store: ['["shop"]'],
  shop: ['["shop"]'],
  office: ['["office"]'],
  company: ['["office"]'],
  it: ['["office"="it"]', '["office"="company"]'],
  software: ['["office"="it"]', '["office"="company"]'],
};

function tagFiltersForType(type) {
  const key = (type || "").trim().toLowerCase();
  if (TYPE_TAGS[key]) return TYPE_TAGS[key];
  for (const [name, filters] of Object.entries(TYPE_TAGS)) {
    if (key.includes(name)) return filters;
  }
  // Fallback: match the keyword against business names.
  const safe = key.replace(/[\\"]/g, "");
  return [`["name"~"${safe}",i]`];
}

async function geocode(location) {
  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(location)}&format=json&limit=1`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) {
    const err = new Error(`Nominatim geocoding failed (${res.status}).`);
    err.status = 502;
    throw err;
  }
  const data = await res.json();
  if (!data.length) {
    const err = new Error(`Could not find the location "${location}".`);
    err.status = 404;
    throw err;
  }
  // boundingbox = [south, north, west, east]
  const [south, north, west, east] = data[0].boundingbox.map(Number);
  return { south, north, west, east };
}

function buildOverpassQuery({ south, west, north, east }, filters, limit) {
  const bbox = `${south},${west},${north},${east}`;
  const parts = filters
    .map((f) => `  node${f}(${bbox});\n  way${f}(${bbox});`)
    .join("\n");
  return `[out:json][timeout:60];\n(\n${parts}\n);\nout center tags ${limit};`;
}

function mapElement(el) {
  const t = el.tags || {};
  const address = [
    t["addr:housenumber"],
    t["addr:street"],
    t["addr:suburb"],
    t["addr:city"],
    t["addr:state"],
    t["addr:postcode"],
  ]
    .filter(Boolean)
    .join(", ");
  const lat = el.lat ?? el.center?.lat ?? "";
  const lon = el.lon ?? el.center?.lon ?? "";
  const website = t.website || t["contact:website"] || t.url || "";
  return {
    source: "osm",
    id: `${el.type}/${el.id}`,
    name: t.name || t["name:en"] || "",
    category:
      t.office || t.shop || t.amenity || t.healthcare || t.tourism || t.leisure || "",
    address,
    phone: t.phone || t["contact:phone"] || t["contact:mobile"] || "",
    website,
    rating: "",
    reviews: "",
    status: "",
    hours: t.opening_hours || "",
    latitude: lat,
    longitude: lon,
    mapsUrl: lat && lon ? `https://www.google.com/maps/search/?api=1&query=${lat},${lon}` : "",
    hasWebsite: Boolean(website),
  };
}

/**
 * Search OpenStreetMap for leads.
 * @param {object} opts
 * @param {string} opts.type      lead type / keyword
 * @param {string} opts.location  location text
 * @param {number} opts.limit
 * @returns {Promise<object[]>}
 */
export async function searchOSM({ type, location, limit = 20 }) {
  const box = await geocode(location);
  const filters = tagFiltersForType(type);
  const query = buildOverpassQuery(box, filters, Math.min(limit, 200));

  const data = await overpassRequest(query);
  const seen = new Set();
  const leads = [];
  for (const el of data.elements || []) {
    if (!el.tags || !el.tags.name) continue; // unnamed points are not useful leads
    if (seen.has(el.tags.name)) continue;
    seen.add(el.tags.name);
    leads.push(mapElement(el));
    if (leads.length >= limit) break;
  }
  return leads;
}
