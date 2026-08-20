// Google Places API (New) provider.
// Uses Text Search to turn a "<lead type> in <location>" query into a list of
// businesses, returning the full detail set the API exposes for each place.

const TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";

// Fields we ask Google to return. Kept explicit so the response stays small and
// billing stays predictable (field mask is required by the Places API New).
const FIELD_MASK = [
  "nextPageToken",
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.rating",
  "places.userRatingCount",
  "places.googleMapsUri",
  "places.businessStatus",
  "places.primaryTypeDisplayName",
  "places.types",
  "places.location",
  "places.regularOpeningHours.weekdayDescriptions",
].join(",");

function mapPlace(p) {
  return {
    source: "google",
    id: p.id || "",
    name: p.displayName?.text || "",
    category: p.primaryTypeDisplayName?.text || (p.types && p.types[0]) || "",
    address: p.formattedAddress || "",
    phone: p.internationalPhoneNumber || p.nationalPhoneNumber || "",
    website: p.websiteUri || "",
    rating: typeof p.rating === "number" ? p.rating : "",
    reviews: typeof p.userRatingCount === "number" ? p.userRatingCount : "",
    status: p.businessStatus || "",
    hours: p.regularOpeningHours?.weekdayDescriptions?.join(" | ") || "",
    latitude: p.location?.latitude ?? "",
    longitude: p.location?.longitude ?? "",
    mapsUrl: p.googleMapsUri || "",
    hasWebsite: Boolean(p.websiteUri),
  };
}

/**
 * Search Google Places for leads.
 * @param {object} opts
 * @param {string} opts.query   full text query, e.g. "dentists in Ahmedabad"
 * @param {number} opts.limit   max results to return (paginates 20 at a time)
 * @param {string} opts.apiKey  Google Maps API key
 * @param {string} [opts.language]
 * @param {string} [opts.region]
 * @returns {Promise<object[]>}
 */
export async function searchGoogle({ query, limit = 20, apiKey, language, region }) {
  if (!apiKey) {
    const err = new Error(
      "Google Places API key is not configured. Set GOOGLE_MAPS_API_KEY in .env or switch the provider to OpenStreetMap."
    );
    err.status = 400;
    throw err;
  }

  const results = [];
  let pageToken;

  // Google returns 20 per page and allows a handful of pages.
  while (results.length < limit) {
    const body = { textQuery: query, pageSize: 20 };
    if (language) body.languageCode = language;
    if (region) body.regionCode = region;
    if (pageToken) body.pageToken = pageToken;

    const res = await fetch(TEXT_SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      const err = new Error(`Google Places API error (${res.status}): ${text}`);
      err.status = res.status === 403 ? 403 : 502;
      throw err;
    }

    const data = await res.json();
    for (const place of data.places || []) results.push(mapPlace(place));

    pageToken = data.nextPageToken;
    if (!pageToken) break;
    // A short delay is recommended before a page token becomes valid.
    await new Promise((r) => setTimeout(r, 1500));
  }

  return results.slice(0, limit);
}
