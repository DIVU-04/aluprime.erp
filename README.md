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
- Booking / contact section with business details
- Booking forms that open **WhatsApp** with the customer's details pre-filled
- Floating WhatsApp & Call buttons
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
└── assets
    ├── css
    │   └── styles.css
    └── js
        └── script.js
```

## Run locally

It's a static site — just open `index.html` in a browser, or serve it:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Customising

- **Contact number:** update `WHATSAPP` in `assets/js/script.js` and the `tel:` /
  `wa.me` links in `index.html`.
- **Prices & services:** edit the relevant sections in `index.html`.
- **Colors:** tweak the CSS custom properties (`--gold`, `--bg`, …) at the top of
  `assets/css/styles.css`.
