import { searchGoogle } from "./providers/google.js";
import { searchOSM } from "./providers/osm.js";

export const LEAD_FIELDS = [
  "name",
  "category",
  "address",
  "phone",
  "website",
  "rating",
  "reviews",
  "status",
  "hours",
  "latitude",
  "longitude",
  "mapsUrl",
  "hasWebsite",
  "source",
];

/**
 * Generate leads using the requested provider.
 * @param {object} opts
 * @param {string} opts.type      lead type, e.g. "restaurants", "law firms"
 * @param {string} opts.location  location, e.g. "Ahmedabad", "New York, USA"
 * @param {number} opts.limit
 * @param {string} opts.provider  "google" | "osm"
 * @param {string} [opts.apiKey]
 * @param {boolean} [opts.onlyNoWebsite]  keep only leads that have no website
 */
export async function generateLeads({
  type,
  location,
  limit = 20,
  provider = "google",
  apiKey,
  onlyNoWebsite = false,
}) {
  if (!type || !type.trim()) {
    const err = new Error("Please enter a lead type (e.g. restaurants, clinics, law firms).");
    err.status = 400;
    throw err;
  }
  if (!location || !location.trim()) {
    const err = new Error("Please enter a location (e.g. Ahmedabad, or 'all of Gujarat').");
    err.status = 400;
    throw err;
  }

  const cappedLimit = Math.max(1, Math.min(Number(limit) || 20, 120));

  let leads;
  if (provider === "osm") {
    leads = await searchOSM({ type, location, limit: cappedLimit });
  } else {
    const query = `${type} in ${location}`;
    leads = await searchGoogle({ query, limit: cappedLimit, apiKey });
  }

  if (onlyNoWebsite) leads = leads.filter((l) => !l.hasWebsite);
  return leads;
}

function csvCell(value) {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function leadsToCsv(leads) {
  const header = LEAD_FIELDS.join(",");
  const rows = leads.map((l) => LEAD_FIELDS.map((f) => csvCell(l[f])).join(","));
  return [header, ...rows].join("\n");
}
