# RideNow (Uber/Rapido-style App)

RideNow is a full multi-surface ride-booking platform inspired by Uber and Rapido. One backend powers **five connected apps**:

| Surface        | URL                     | What it does                                              |
|----------------|-------------------------|-----------------------------------------------------------|
| Rider app      | `/`                     | Book bikes/autos/cabs, live map, UPI QR pay, ratings      |
| Driver app     | `/driver.html`          | Captain login, accept ride offers, advance & complete     |
| Admin console  | `/admin.html`           | Overview counters + rides/users/drivers tables            |
| Public tracker | `/track.html?ride=&share=` | Read-only shareable ride tracking with live map        |
| PWA            | Any of the above        | Installable via `manifest.webmanifest` + `sw.js`          |

## Features

- **User auth** (signup / login with token-based session, in-memory store)
- **Ride booking flow** with pickup, drop, and payment method
- **Quick location chips**: Airport, Railway Station, City Mall, Tech Park
- **Vehicle categories**: Bike, Auto, Mini, Sedan (each with its own pricing + ETA)
- **Live fare estimation** using distance-based pricing with surge for long trips
- **Live map** (Leaflet + OpenStreetMap tiles) showing:
  - Pickup marker
  - Drop marker
  - Route line
  - Moving driver marker (updated in real time)
- **Ride lifecycle** with real-time status pushes over WebSocket:
  - searching → assigned → arriving → arrived → in_progress → completed
- **Recent rides history** loaded from the backend
- **UPI QR payments**:
  - Save your UPI ID and generate a scannable QR for anyone to pay you
  - Each ride shows a **Scan-to-Pay QR** with the driver's UPI + fare pre-filled
- **Promo codes**: `WELCOME10`, `RIDE50`, `BIKE20` (server-validated, applied to fare)
- **Ride cancellation** while status is `searching`/`assigned`/`arriving`/`arrived`
- **5-star ride rating** (with optional comment) after completion
- **API docs**: JSON index at `/api`, OpenAPI JSON at `/api/openapi.json`, HTML page at `/api/docs`
- **Nearby drivers mock**: `/api/drivers/nearby?lat=&lng=`
- **Health**: `/api/health` with uptime and counters
- **Driver mode**: register/login as a captain, go online, accept offers matching your vehicle, update your location, and advance the ride status (matching ride sim only kicks in if no driver accepts within ~3.5s)
- **Admin console**: password-protected via `X-Admin-Token` header (default `rideadmin`, override with `ADMIN_TOKEN` env var)
- **Shareable ride links**: every ride gets a `shareToken`; visit `/track.html?ride=<id>&share=<token>` to watch a ride live without signing in
- **Installable (PWA)**: manifest + service worker cache static assets and let each surface be installed as a mobile app

## Tech Stack

- **Frontend**: HTML, CSS, vanilla JavaScript, Leaflet
- **Backend**: Node.js, Express, `ws` (WebSocket)
- **Storage**: In-memory (users, tokens, rides) — resets when the server restarts

## Run Locally

Requires Node.js 18+.

```bash
npm install
npm start
```

Then open: [http://localhost:3000](http://localhost:3000)

Change the port with `PORT=4000 npm start`. Change admin token with `ADMIN_TOKEN=secret123 npm start`.

Open each surface:

- Rider: `http://localhost:3000/`
- Driver: `http://localhost:3000/driver.html`
- Admin: `http://localhost:3000/admin.html` (token: `rideadmin` by default)
- Docs:  `http://localhost:3000/api/docs`

## API Overview

| Method | Endpoint             | Description                         |
|-------:|----------------------|-------------------------------------|
| GET    | `/api/health`               | Server status + counters                       |
| GET    | `/api`                      | JSON list of all routes                        |
| GET    | `/api/openapi.json`         | Minimal OpenAPI spec                           |
| GET    | `/api/docs`                 | HTML API docs                                  |
| POST   | `/api/auth/signup`          | Create an account, returns token               |
| POST   | `/api/auth/login`           | Login, returns token                           |
| GET    | `/api/me`                   | Current user (Bearer)                          |
| PUT    | `/api/me/upi`               | Save/clear your UPI ID (Bearer)                |
| GET    | `/api/me/qr`                | PNG data URL of your UPI QR (Bearer)           |
| GET    | `/api/vehicles`             | List of ride categories                        |
| POST   | `/api/estimate`             | Fare + ETA for all vehicles (optional promo)   |
| POST   | `/api/rides`                | Book a ride (Bearer)                           |
| GET    | `/api/rides`                | Ride history (Bearer)                          |
| GET    | `/api/rides/:id`            | Ride detail (Bearer)                           |
| POST   | `/api/rides/:id/cancel`     | Cancel a ride (Bearer)                         |
| POST   | `/api/rides/:id/rate`       | Rate a completed ride 1–5 (Bearer)             |
| GET    | `/api/rides/:id/qr`         | Scan-to-pay QR for the driver (Bearer)         |
| GET    | `/api/promos`               | List active promo codes                        |
| POST   | `/api/promos/validate`      | Validate a promo against a fare                |
| GET    | `/api/drivers/nearby`       | Mock nearby drivers around lat/lng             |
| POST   | `/api/drivers/register`     | Register a driver account                      |
| POST   | `/api/drivers/login`        | Driver login                                   |
| GET    | `/api/drivers/me`           | Current driver profile (driver Bearer)         |
| POST   | `/api/drivers/online`       | Toggle driver online/offline                   |
| POST   | `/api/drivers/location`     | Update driver location (lat/lng)               |
| GET    | `/api/drivers/rides/available` | Rides matching driver vehicle               |
| GET    | `/api/drivers/rides/current` | Driver's active ride                          |
| POST   | `/api/drivers/rides/:id/accept` | Driver accepts a ride                      |
| POST   | `/api/drivers/rides/:id/advance` | Advance ride status (arriving→…→completed)|
| POST   | `/api/admin/login`          | Verify admin token                             |
| GET    | `/api/admin/overview`       | Counters + revenue (X-Admin-Token)             |
| GET    | `/api/admin/rides`          | All rides (X-Admin-Token)                      |
| GET    | `/api/admin/users`          | All users (X-Admin-Token)                      |
| GET    | `/api/admin/drivers`        | All drivers (X-Admin-Token)                    |
| GET    | `/api/public/rides/:id`     | Public share-tracked ride (needs `share` qs)   |
| WS     | `/ws?token=...`             | Rider real-time ride updates                   |
| WS     | `/ws?driverToken=...`       | Driver real-time ride offers                   |

## Notes

- Ride matching, driver GPS, and routing are **simulated** — no external map or driver-supply APIs are wired up.
- Data is not persisted to disk; use this as an MVP scaffold to plug in a real database and driver APIs.
