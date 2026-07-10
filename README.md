# RideNow (Uber/Rapido-style MVP)

RideNow is a lightweight, mobile-first ride-booking web app inspired by services like Uber and Rapido.

## Features

- Pickup and drop location entry
- Quick location chips (Airport, Railway Station, City Mall, Tech Park)
- Vehicle selection with category-specific pricing:
  - Bike
  - Auto
  - Mini
  - Sedan
- Dynamic fare, ETA, and distance estimation
- Payment method selection (UPI/Card/Cash/Wallet)
- Ride lifecycle simulation:
  - Finding driver
  - Driver assigned
  - Driver at pickup
  - Trip started
  - Trip completed
- Recent rides history persisted in browser `localStorage`

## Tech Stack

- HTML
- CSS
- Vanilla JavaScript

## Run Locally

Because this is a static app, you can run it in any of these ways:

1. **Open directly**  
   Open `index.html` in a browser.

2. **Serve with Python** (recommended):

   ```bash
   python3 -m http.server 8080
   ```

   Then open: `http://localhost:8080`

## Notes

- This is an MVP prototype focused on booking flow and ride tracking UX.
- Map rendering and real-time GPS/driver APIs are mocked/simulated.