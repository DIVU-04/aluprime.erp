# MapLead IT

Static lead-generation MVP for IT service companies that want to qualify local
businesses from Google Maps / Google Places data.

## What it does

- Select lead type: all local businesses, clinics, restaurants, hotels, retail,
  education, real estate, manufacturing, professional services, salons, gyms, and
  more.
- Select any target location and search radius.
- Choose the IT service you want to sell: website development, local SEO, custom
  software, cloud support, cybersecurity, or automation.
- Generate demo leads instantly with business details, score, suggested IT need,
  Maps link, phone, website, rating, and reviews.
- Export generated leads to CSV.
- Copy a ready-to-customize outreach pitch for the highest priority leads.
- Optionally connect a secure backend endpoint that calls the official Google
  Places API for live public business data.

## Run locally

This is a pure HTML/CSS/JavaScript app with no build step.

```bash
python3 -m http.server 8000
```

Open <http://localhost:8000>.

## Connecting live Google Maps data

Do not put a Google API key in browser JavaScript. Create a server endpoint that
keeps the key private and returns only the lead fields needed by the front-end.

Suggested endpoint:

```text
POST /api/places-leads
```

Request body sent by the app:

```json
{
  "businessType": "clinics",
  "location": "Ahmedabad, Gujarat",
  "radiusKm": 5,
  "limit": 10,
  "serviceFocus": "website",
  "fields": [
    "displayName",
    "formattedAddress",
    "nationalPhoneNumber",
    "websiteUri",
    "rating",
    "userRatingCount",
    "googleMapsUri",
    "businessStatus"
  ]
}
```

Expected response:

```json
{
  "leads": [
    {
      "name": "Business name",
      "category": "Clinic",
      "address": "Full address",
      "phone": "+91 98765 43210",
      "website": "https://example.com",
      "rating": 4.4,
      "reviews": 128,
      "mapsUrl": "https://maps.google.com/...",
      "openingHours": "Open now"
    }
  ]
}
```

## Responsible usage

Use the official Google Places API, respect Google API terms, comply with local
privacy and marketing laws, and contact businesses respectfully. The included
demo data is synthetic and is not scraped from Google Maps.