# RideNow (Uber/Rapido-style App)

RideNow is a mobile-first ride-booking web app inspired by Uber and Rapido. It ships with a static frontend and a Node.js backend with real-time driver tracking over WebSocket.

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

Change the port with `PORT=4000 npm start`.

## API Overview

| Method | Endpoint             | Description                         |
|-------:|----------------------|-------------------------------------|
| POST   | `/api/auth/signup`   | Create an account, returns token    |
| POST   | `/api/auth/login`    | Login, returns token                |
| GET    | `/api/me`            | Current user (Bearer token)         |
| GET    | `/api/vehicles`      | List of ride categories             |
| POST   | `/api/estimate`      | Fare + ETA for all vehicles         |
| POST   | `/api/rides`         | Book a ride (Bearer token)          |
| GET    | `/api/rides`         | Ride history (Bearer token)         |
| GET    | `/api/rides/:id`     | Ride detail (Bearer token)          |
| WS     | `/ws?token=...`      | Real-time ride status updates       |

## Notes

- Ride matching, driver GPS, and routing are **simulated** — no external map or driver-supply APIs are wired up.
- Data is not persisted to disk; use this as an MVP scaffold to plug in a real database and driver APIs.
