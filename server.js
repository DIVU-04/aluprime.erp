const path = require("path");
const crypto = require("crypto");
const http = require("http");
const express = require("express");
const { WebSocketServer } = require("ws");
const QRCode = require("qrcode");

const DRIVER_UPI_POOL = [
  "ravi.driver@upi",
  "priya.captain@ok",
  "arjun.rider@ybl",
  "neha.pay@paytm",
  "karan.upi@axl",
];

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const SERVER_STARTED_AT = new Date().toISOString();

const PROMOS = {
  WELCOME10: {
    code: "WELCOME10",
    type: "percent",
    value: 10,
    cap: 40,
    description: "10% off, up to ₹40",
  },
  RIDE50: {
    code: "RIDE50",
    type: "flat",
    value: 50,
    minFare: 100,
    description: "Flat ₹50 off on fares above ₹100",
  },
  BIKE20: {
    code: "BIKE20",
    type: "percent",
    value: 20,
    cap: 30,
    vehicleId: "bike",
    description: "20% off Bike rides, up to ₹30",
  },
};

function evaluatePromo(codeRaw, { fare, vehicleId }) {
  if (!codeRaw) return { discount: 0, discountedFare: fare, applied: null };
  const code = String(codeRaw).trim().toUpperCase();
  const promo = PROMOS[code];
  if (!promo) return { error: "invalid promo code" };
  if (promo.vehicleId && promo.vehicleId !== vehicleId) {
    return { error: `promo valid only for ${promo.vehicleId}` };
  }
  if (promo.minFare && fare < promo.minFare) {
    return { error: `min fare ₹${promo.minFare} required` };
  }
  let discount = promo.type === "flat" ? promo.value : Math.round((fare * promo.value) / 100);
  if (promo.cap) discount = Math.min(discount, promo.cap);
  discount = Math.min(discount, Math.max(0, fare - 1));
  return {
    applied: { code: promo.code, description: promo.description, type: promo.type, value: promo.value },
    discount,
    discountedFare: fare - discount,
  };
}

const users = new Map();
const tokens = new Map();
const rides = new Map();
const userSockets = new Map();

const KNOWN_LOCATIONS = {
  airport: { lat: 12.9499, lng: 77.6681, name: "Airport" },
  "railway station": { lat: 12.9784, lng: 77.5678, name: "Railway Station" },
  "city mall": { lat: 12.9352, lng: 77.6245, name: "City Mall" },
  "tech park": { lat: 12.9784, lng: 77.6408, name: "Tech Park" },
};

const CITY_CENTER = { lat: 12.9716, lng: 77.5946 };

const VEHICLES = {
  bike: { name: "Bike", baseFare: 28, perKm: 10, etaBase: 3 },
  auto: { name: "Auto", baseFare: 40, perKm: 14, etaBase: 4 },
  mini: { name: "Mini", baseFare: 55, perKm: 17, etaBase: 5 },
  sedan: { name: "Sedan", baseFare: 80, perKm: 21, etaBase: 7 },
};

const DRIVER_NAMES = [
  "Ravi",
  "Priya",
  "Arjun",
  "Neha",
  "Karan",
  "Anjali",
  "Vikram",
  "Sanya",
];

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function newId(prefix) {
  return `${prefix}_${crypto.randomBytes(6).toString("hex")}`;
}

function locationFor(text) {
  if (!text) return null;
  const key = text.trim().toLowerCase();
  if (KNOWN_LOCATIONS[key]) return { ...KNOWN_LOCATIONS[key], label: text.trim() };

  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  const latOffset = ((hash % 900) - 450) / 10000;
  const lngOffset = (((hash >> 9) % 900) - 450) / 10000;
  return {
    lat: Number((CITY_CENTER.lat + latOffset).toFixed(6)),
    lng: Number((CITY_CENTER.lng + lngOffset).toFixed(6)),
    label: text.trim(),
  };
}

function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s1 = (a.lat * Math.PI) / 180;
  const s2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(s1) * Math.cos(s2) * Math.sin(dLng / 2) ** 2;
  return Number((2 * R * Math.asin(Math.sqrt(h))).toFixed(2));
}

function estimateFare(vehicleId, distanceKm) {
  const vehicle = VEHICLES[vehicleId] || VEHICLES.bike;
  const surge = distanceKm > 10 ? 1.18 : 1;
  const fare = Math.round((vehicle.baseFare + distanceKm * vehicle.perKm + 8) * surge);
  const eta = Math.max(4, Math.round(vehicle.etaBase + distanceKm * 1.3));
  return { fare, eta };
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  const userId = token ? tokens.get(token) : null;
  if (!userId || !users.has(userId)) {
    return res.status(401).json({ error: "unauthorized" });
  }
  req.userId = userId;
  req.user = users.get(userId);
  next();
}

function pushToUser(userId, message) {
  const sockets = userSockets.get(userId);
  if (!sockets) return;
  const payload = JSON.stringify(message);
  for (const socket of sockets) {
    if (socket.readyState === socket.OPEN) socket.send(payload);
  }
}

function publicRide(ride) {
  return {
    id: ride.id,
    pickup: ride.pickup,
    drop: ride.drop,
    vehicleId: ride.vehicleId,
    vehicleName: VEHICLES[ride.vehicleId].name,
    distanceKm: ride.distanceKm,
    fare: ride.fare,
    baseFare: ride.baseFare || ride.fare,
    discount: ride.discount || 0,
    promoCode: ride.promoCode || null,
    etaMinutes: ride.etaMinutes,
    payment: ride.payment,
    status: ride.status,
    driver: ride.driver,
    driverLocation: ride.driverLocation,
    rating: ride.rating || null,
    ratingComment: ride.ratingComment || null,
    createdAt: ride.createdAt,
    completedAt: ride.completedAt || null,
    cancelledAt: ride.cancelledAt || null,
    cancelReason: ride.cancelReason || null,
  };
}

function interpolate(from, to, t) {
  return {
    lat: from.lat + (to.lat - from.lat) * t,
    lng: from.lng + (to.lng - from.lng) * t,
  };
}

function scheduleRideLifecycle(ride) {
  const isDone = () => ride.status === "cancelled" || ride.status === "completed";
  const setStatus = (status, extra = {}) => {
    if (isDone()) return;
    ride.status = status;
    Object.assign(ride, extra);
    pushToUser(ride.userId, { type: "ride:update", ride: publicRide(ride) });
  };

  const driverStart = {
    lat: ride.pickup.lat + (Math.random() - 0.5) * 0.01,
    lng: ride.pickup.lng + (Math.random() - 0.5) * 0.01,
  };
  ride.driverLocation = driverStart;

  setTimeout(() => {
    if (isDone()) return;
    const name = DRIVER_NAMES[Math.floor(Math.random() * DRIVER_NAMES.length)];
    ride.driver = {
      name,
      rating: Number((4.4 + Math.random() * 0.5).toFixed(2)),
      vehicleNumber: `KA-${String(Math.floor(10 + Math.random() * 89))}-${String(
        Math.floor(1000 + Math.random() * 8999)
      )}`,
      upiId: DRIVER_UPI_POOL[Math.floor(Math.random() * DRIVER_UPI_POOL.length)],
    };
    setStatus("assigned");
  }, 1500);

  const arrivingSteps = 6;
  for (let i = 1; i <= arrivingSteps; i += 1) {
    setTimeout(() => {
      if (isDone()) return;
      const t = i / arrivingSteps;
      ride.driverLocation = interpolate(driverStart, ride.pickup, t);
      setStatus(i === arrivingSteps ? "arrived" : "arriving");
    }, 1500 + i * 700);
  }

  const tripStart = 1500 + arrivingSteps * 700 + 800;
  setTimeout(() => setStatus("in_progress"), tripStart);

  const tripSteps = 10;
  for (let i = 1; i <= tripSteps; i += 1) {
    setTimeout(() => {
      if (isDone()) return;
      const t = i / tripSteps;
      ride.driverLocation = interpolate(ride.pickup, ride.drop, t);
      pushToUser(ride.userId, { type: "ride:update", ride: publicRide(ride) });
    }, tripStart + i * 700);
  }

  setTimeout(() => {
    if (isDone()) return;
    ride.completedAt = new Date().toISOString();
    setStatus("completed");
  }, tripStart + tripSteps * 700 + 800);
}

app.post("/api/auth/signup", (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password || password.length < 4) {
    return res.status(400).json({ error: "username and password (min 4 chars) required" });
  }
  const normalized = String(username).trim().toLowerCase();
  const existing = [...users.values()].find((u) => u.username === normalized);
  if (existing) return res.status(409).json({ error: "username already taken" });

  const user = {
    id: newId("usr"),
    username: normalized,
    passwordHash: sha256(password),
    upiId: null,
    createdAt: new Date().toISOString(),
  };
  users.set(user.id, user);

  const token = newId("tok");
  tokens.set(token, user.id);
  res.json({ token, user: { id: user.id, username: user.username } });
});

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "username and password required" });
  }
  const normalized = String(username).trim().toLowerCase();
  const user = [...users.values()].find((u) => u.username === normalized);
  if (!user || user.passwordHash !== sha256(password)) {
    return res.status(401).json({ error: "invalid credentials" });
  }

  const token = newId("tok");
  tokens.set(token, user.id);
  res.json({ token, user: { id: user.id, username: user.username } });
});

function publicUser(user) {
  return { id: user.id, username: user.username, upiId: user.upiId || null };
}

app.get("/api/me", authMiddleware, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

const UPI_REGEX = /^[a-z0-9._-]{2,}@[a-z0-9.-]{2,}$/i;

app.put("/api/me/upi", authMiddleware, (req, res) => {
  const raw = req.body && req.body.upiId;
  if (raw === "" || raw === null) {
    req.user.upiId = null;
    return res.json({ user: publicUser(req.user) });
  }
  const value = String(raw || "").trim();
  if (!UPI_REGEX.test(value)) {
    return res.status(400).json({ error: "invalid upi id (expected format: name@handle)" });
  }
  req.user.upiId = value;
  res.json({ user: publicUser(req.user) });
});

function buildUpiUri({ upi, name, amount, note }) {
  const params = new URLSearchParams();
  params.set("pa", upi);
  if (name) params.set("pn", name);
  if (amount != null) params.set("am", String(amount));
  params.set("cu", "INR");
  if (note) params.set("tn", note);
  return `upi://pay?${params.toString()}`;
}

async function generateQrDataUrl(payload) {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 1,
    scale: 6,
    color: { dark: "#0b1024", light: "#ffffff" },
  });
}

app.get("/api/me/qr", authMiddleware, async (req, res) => {
  if (!req.user.upiId) return res.status(400).json({ error: "no upi id saved" });
  const uri = buildUpiUri({
    upi: req.user.upiId,
    name: req.user.username,
    note: `Pay @${req.user.username}`,
  });
  const dataUrl = await generateQrDataUrl(uri);
  res.json({ upiId: req.user.upiId, upiUri: uri, dataUrl });
});

app.get("/api/rides/:id/qr", authMiddleware, async (req, res) => {
  const ride = rides.get(req.params.id);
  if (!ride || ride.userId !== req.userId) return res.status(404).json({ error: "not found" });
  if (!ride.driver) return res.status(400).json({ error: "driver not assigned yet" });
  const uri = buildUpiUri({
    upi: ride.driver.upiId,
    name: ride.driver.name,
    amount: ride.fare,
    note: `RideNow ${ride.id}`,
  });
  const dataUrl = await generateQrDataUrl(uri);
  res.json({
    rideId: ride.id,
    payee: { name: ride.driver.name, upiId: ride.driver.upiId },
    amount: ride.fare,
    upiUri: uri,
    dataUrl,
  });
});

app.get("/api/vehicles", (_req, res) => {
  res.json({
    vehicles: Object.entries(VEHICLES).map(([id, v]) => ({ id, ...v })),
  });
});

app.post("/api/estimate", (req, res) => {
  const { pickup, drop, vehicleId, promoCode } = req.body || {};
  const p = locationFor(pickup);
  const d = locationFor(drop);
  if (!p || !d) return res.status(400).json({ error: "pickup and drop required" });
  const distanceKm = Math.max(0.8, haversineKm(p, d));
  const results = Object.entries(VEHICLES).map(([id, v]) => {
    const est = estimateFare(id, distanceKm);
    return { id, name: v.name, ...est };
  });
  let selected = null;
  let promo = null;
  if (vehicleId && VEHICLES[vehicleId]) {
    const est = estimateFare(vehicleId, distanceKm);
    selected = { vehicleId, ...est };
    if (promoCode) {
      const evalRes = evaluatePromo(promoCode, { fare: est.fare, vehicleId });
      if (evalRes.error) {
        promo = { code: String(promoCode).trim().toUpperCase(), error: evalRes.error };
      } else {
        promo = {
          code: evalRes.applied.code,
          description: evalRes.applied.description,
          discount: evalRes.discount,
          discountedFare: evalRes.discountedFare,
        };
        selected.discountedFare = evalRes.discountedFare;
        selected.discount = evalRes.discount;
      }
    }
  }
  res.json({ pickup: p, drop: d, distanceKm, options: results, selected, promo });
});

app.post("/api/rides", authMiddleware, (req, res) => {
  const { pickup, drop, vehicleId, payment, promoCode } = req.body || {};
  if (!pickup || !drop) return res.status(400).json({ error: "pickup and drop required" });
  if (!VEHICLES[vehicleId]) return res.status(400).json({ error: "invalid vehicleId" });

  const p = locationFor(pickup);
  const d = locationFor(drop);
  if (p.label.toLowerCase() === d.label.toLowerCase()) {
    return res.status(400).json({ error: "pickup and drop must differ" });
  }

  const distanceKm = Math.max(0.8, haversineKm(p, d));
  const { fare: baseFare, eta } = estimateFare(vehicleId, distanceKm);
  let fare = baseFare;
  let discount = 0;
  let appliedCode = null;
  if (promoCode) {
    const evalRes = evaluatePromo(promoCode, { fare: baseFare, vehicleId });
    if (evalRes.error) return res.status(400).json({ error: evalRes.error });
    fare = evalRes.discountedFare;
    discount = evalRes.discount;
    appliedCode = evalRes.applied.code;
  }

  const ride = {
    id: newId("ride"),
    userId: req.userId,
    pickup: p,
    drop: d,
    vehicleId,
    distanceKm,
    fare,
    baseFare,
    discount,
    promoCode: appliedCode,
    etaMinutes: eta,
    payment: payment || "UPI",
    status: "searching",
    driver: null,
    driverLocation: null,
    createdAt: new Date().toISOString(),
  };
  rides.set(ride.id, ride);

  scheduleRideLifecycle(ride);
  res.json({ ride: publicRide(ride) });
});

app.get("/api/rides", authMiddleware, (req, res) => {
  const list = [...rides.values()]
    .filter((r) => r.userId === req.userId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .map(publicRide);
  res.json({ rides: list });
});

app.get("/api/rides/:id", authMiddleware, (req, res) => {
  const ride = rides.get(req.params.id);
  if (!ride || ride.userId !== req.userId) return res.status(404).json({ error: "not found" });
  res.json({ ride: publicRide(ride) });
});

const CANCELLABLE_STATUSES = new Set(["searching", "assigned", "arriving", "arrived"]);

app.post("/api/rides/:id/cancel", authMiddleware, (req, res) => {
  const ride = rides.get(req.params.id);
  if (!ride || ride.userId !== req.userId) return res.status(404).json({ error: "not found" });
  if (!CANCELLABLE_STATUSES.has(ride.status)) {
    return res.status(400).json({ error: `cannot cancel ride in status "${ride.status}"` });
  }
  ride.status = "cancelled";
  ride.cancelledAt = new Date().toISOString();
  ride.cancelReason = (req.body && req.body.reason) || null;
  pushToUser(ride.userId, { type: "ride:update", ride: publicRide(ride) });
  res.json({ ride: publicRide(ride) });
});

app.post("/api/rides/:id/rate", authMiddleware, (req, res) => {
  const ride = rides.get(req.params.id);
  if (!ride || ride.userId !== req.userId) return res.status(404).json({ error: "not found" });
  if (ride.status !== "completed") {
    return res.status(400).json({ error: "can only rate completed rides" });
  }
  const stars = Number(req.body && req.body.stars);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return res.status(400).json({ error: "stars must be an integer 1-5" });
  }
  ride.rating = stars;
  ride.ratingComment = req.body && req.body.comment ? String(req.body.comment).slice(0, 500) : null;
  res.json({ ride: publicRide(ride) });
});

app.get("/api/promos", (_req, res) => {
  res.json({
    promos: Object.values(PROMOS).map((p) => ({
      code: p.code,
      description: p.description,
      type: p.type,
      value: p.value,
      cap: p.cap || null,
      minFare: p.minFare || null,
      vehicleId: p.vehicleId || null,
    })),
  });
});

app.post("/api/promos/validate", (req, res) => {
  const { code, fare, vehicleId } = req.body || {};
  const fareNum = Number(fare);
  if (!code || !Number.isFinite(fareNum) || fareNum <= 0) {
    return res.status(400).json({ error: "code and positive fare required" });
  }
  const result = evaluatePromo(code, { fare: fareNum, vehicleId });
  if (result.error) return res.status(400).json({ error: result.error });
  res.json(result);
});

app.get("/api/drivers/nearby", (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: "lat and lng query params required" });
  }
  const count = Math.min(Math.max(Number(req.query.count) || 6, 1), 20);
  const vehicles = ["bike", "auto", "mini", "sedan"];
  const drivers = Array.from({ length: count }, (_, i) => {
    const off = (n) => (Math.random() - 0.5) * 0.02;
    const dLoc = { lat: Number((lat + off()).toFixed(6)), lng: Number((lng + off()).toFixed(6)) };
    return {
      id: newId("drv"),
      name: DRIVER_NAMES[Math.floor(Math.random() * DRIVER_NAMES.length)],
      vehicleId: vehicles[i % vehicles.length],
      rating: Number((4.3 + Math.random() * 0.6).toFixed(2)),
      etaMinutes: 2 + Math.floor(Math.random() * 6),
      location: dLoc,
    };
  });
  res.json({ center: { lat, lng }, drivers });
});

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    startedAt: SERVER_STARTED_AT,
    uptimeSeconds: Math.round(process.uptime()),
    counts: { users: users.size, rides: rides.size, activeSockets: [...userSockets.values()].reduce((n, s) => n + s.size, 0) },
  });
});

const API_ROUTES = [
  { method: "GET", path: "/api/health", auth: false, description: "Server status + counters" },
  { method: "GET", path: "/api/openapi.json", auth: false, description: "Minimal OpenAPI-ish spec" },
  { method: "GET", path: "/api/docs", auth: false, description: "HTML API docs" },
  { method: "POST", path: "/api/auth/signup", auth: false, description: "Create an account" },
  { method: "POST", path: "/api/auth/login", auth: false, description: "Login, returns token" },
  { method: "GET", path: "/api/me", auth: true, description: "Current user profile" },
  { method: "PUT", path: "/api/me/upi", auth: true, description: "Save/clear your UPI ID" },
  { method: "GET", path: "/api/me/qr", auth: true, description: "PNG data URL of your UPI QR" },
  { method: "GET", path: "/api/vehicles", auth: false, description: "Ride categories" },
  { method: "POST", path: "/api/estimate", auth: false, description: "Fare + ETA for all vehicles" },
  { method: "POST", path: "/api/rides", auth: true, description: "Book a ride" },
  { method: "GET", path: "/api/rides", auth: true, description: "Ride history" },
  { method: "GET", path: "/api/rides/:id", auth: true, description: "Ride detail" },
  { method: "POST", path: "/api/rides/:id/cancel", auth: true, description: "Cancel a ride" },
  { method: "POST", path: "/api/rides/:id/rate", auth: true, description: "Rate a completed ride (1-5)" },
  { method: "GET", path: "/api/rides/:id/qr", auth: true, description: "Scan-to-pay QR for driver" },
  { method: "GET", path: "/api/promos", auth: false, description: "List active promos" },
  { method: "POST", path: "/api/promos/validate", auth: false, description: "Validate a promo against a fare" },
  { method: "GET", path: "/api/drivers/nearby", auth: false, description: "Mock nearby drivers around lat/lng" },
  { method: "WS", path: "/ws?token=...", auth: true, description: "Real-time ride status updates" },
];

app.get("/api", (_req, res) => {
  res.json({ name: "RideNow API", version: "0.3.0", routes: API_ROUTES });
});

app.get("/api/openapi.json", (_req, res) => {
  const spec = {
    openapi: "3.0.0",
    info: { title: "RideNow API", version: "0.3.0" },
    paths: {},
  };
  for (const route of API_ROUTES) {
    if (route.method === "WS") continue;
    const key = route.path.replace(/:(\w+)/g, "{$1}");
    spec.paths[key] = spec.paths[key] || {};
    spec.paths[key][route.method.toLowerCase()] = {
      summary: route.description,
      security: route.auth ? [{ bearerAuth: [] }] : [],
      responses: { 200: { description: "OK" } },
    };
  }
  spec.components = {
    securitySchemes: { bearerAuth: { type: "http", scheme: "bearer" } },
  };
  res.json(spec);
});

app.get("/api/docs", (_req, res) => {
  const rows = API_ROUTES.map(
    (r) => `<tr>
      <td><code>${r.method}</code></td>
      <td><code>${r.path}</code></td>
      <td>${r.auth ? "🔒" : ""}</td>
      <td>${r.description}</td>
    </tr>`
  ).join("");
  res.type("html").send(`<!doctype html>
<html><head><meta charset="utf-8"/><title>RideNow API</title>
<style>
  body{font-family:Inter,system-ui,sans-serif;background:#0b1024;color:#f3f5ff;padding:24px;}
  h1{margin:0 0 4px;}
  p{color:#b6bdd8;margin-top:0}
  table{border-collapse:collapse;width:100%;max-width:900px;}
  th,td{border-bottom:1px solid #2a3760;padding:10px 12px;text-align:left;font-size:14px;}
  th{color:#ffd93d;}
  code{background:#131827;padding:2px 6px;border-radius:4px;}
  a{color:#64dfdf;}
</style></head>
<body>
  <h1>RideNow API</h1>
  <p>Version 0.3.0 • <a href="/api/openapi.json">openapi.json</a> • <a href="/api">/api index</a></p>
  <table>
    <thead><tr><th>Method</th><th>Path</th><th>Auth</th><th>Description</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body></html>`);
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (socket, req) => {
  const url = new URL(req.url, "http://localhost");
  const token = url.searchParams.get("token");
  const userId = token ? tokens.get(token) : null;
  if (!userId) {
    socket.close(4001, "unauthorized");
    return;
  }
  if (!userSockets.has(userId)) userSockets.set(userId, new Set());
  userSockets.get(userId).add(socket);
  socket.send(JSON.stringify({ type: "hello", userId }));

  socket.on("close", () => {
    const set = userSockets.get(userId);
    if (set) {
      set.delete(socket);
      if (set.size === 0) userSockets.delete(userId);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`RideNow server listening on http://localhost:${PORT}`);
});

module.exports = { app, server };
