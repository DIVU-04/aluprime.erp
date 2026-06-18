# KB Garage — Website

A modern, responsive single-page website for **KB Garage**, Ahmedabad — a car
service & repair garage. Inspired by GoMechanic-style car care sites, built with
plain HTML, CSS and JavaScript (no build step required).

> **Quality Comes First**

## Features

- Sticky navbar with mobile hamburger menu
- Hero section with a **Book Your Service** form
- Booking form that opens **WhatsApp** with a pre-filled message
- Services grid (service & repair, denting & painting, AC, washing, pick-up & drop, insurance)
- "Why Us", "How It Works" and call-to-action sections
- Contact section with owner details, address and an embedded Google Map
- Floating WhatsApp button
- Fully responsive + scroll-reveal animations
- Brand colours taken from the KB Garage logo (gold & black)

## Business details

| | |
|---|---|
| **Garage** | KB Garage |
| **Owner** | Krunal Patel |
| **Phone** | +91 70 96 77 78 96 |
| **Address** | Near Seventh Parisar, Opp. Vishnudhara Garden, B/h. Jaguar Showroom, R.C.C. Road, S.G. Highway, Gota, Ahmedabad — 382481 |
| **Hours** | Open 24×7 |

## Run locally

It's a static site — just open `index.html` in a browser, or serve it:

```bash
cd kb-garage-website
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Files

```
kb-garage-website/
├── index.html   # page markup & content
├── styles.css   # theme, layout, responsive styles
├── script.js    # nav toggle, booking form, animations
└── README.md
```

## Customising

- Update the phone number in `index.html` (search `7096777896`) and in `script.js` (`PHONE`).
- Replace the `brand__mark` "KB" box with the real logo image if available.
- Adjust the Google Map `iframe` `src` with the exact garage pin for accurate directions.
