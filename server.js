const path = require("path");
const crypto = require("crypto");
const http = require("http");
const express = require("express");
const { WebSocketServer } = require("ws");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

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
    etaMinutes: ride.etaMinutes,
    payment: ride.payment,
    status: ride.status,
    driver: ride.driver,
    driverLocation: ride.driverLocation,
    createdAt: ride.createdAt,
    completedAt: ride.completedAt || null,
  };
}

function interpolate(from, to, t) {
  return {
    lat: from.lat + (to.lat - from.lat) * t,
    lng: from.lng + (to.lng - from.lng) * t,
  };
}

function scheduleRideLifecycle(ride) {
  const setStatus = (status, extra = {}) => {
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
    ride.driver = {
      name: DRIVER_NAMES[Math.floor(Math.random() * DRIVER_NAMES.length)],
      rating: Number((4.4 + Math.random() * 0.5).toFixed(2)),
      vehicleNumber: `KA-${String(Math.floor(10 + Math.random() * 89))}-${String(
        Math.floor(1000 + Math.random() * 8999)
      )}`,
    };
    setStatus("assigned");
  }, 1500);

  const arrivingSteps = 6;
  for (let i = 1; i <= arrivingSteps; i += 1) {
    setTimeout(() => {
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
      const t = i / tripSteps;
      ride.driverLocation = interpolate(ride.pickup, ride.drop, t);
      pushToUser(ride.userId, { type: "ride:update", ride: publicRide(ride) });
    }, tripStart + i * 700);
  }

  setTimeout(() => {
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

app.get("/api/me", authMiddleware, (req, res) => {
  res.json({ user: { id: req.user.id, username: req.user.username } });
});

app.get("/api/vehicles", (_req, res) => {
  res.json({
    vehicles: Object.entries(VEHICLES).map(([id, v]) => ({ id, ...v })),
  });
});

app.post("/api/estimate", (req, res) => {
  const { pickup, drop, vehicleId } = req.body || {};
  const p = locationFor(pickup);
  const d = locationFor(drop);
  if (!p || !d) return res.status(400).json({ error: "pickup and drop required" });
  const distanceKm = Math.max(0.8, haversineKm(p, d));
  const results = Object.entries(VEHICLES).map(([id, v]) => {
    const est = estimateFare(id, distanceKm);
    return { id, name: v.name, ...est };
  });
  const selected = vehicleId && VEHICLES[vehicleId]
    ? { vehicleId, ...estimateFare(vehicleId, distanceKm) }
    : null;
  res.json({ pickup: p, drop: d, distanceKm, options: results, selected });
});

app.post("/api/rides", authMiddleware, (req, res) => {
  const { pickup, drop, vehicleId, payment } = req.body || {};
  if (!pickup || !drop) return res.status(400).json({ error: "pickup and drop required" });
  if (!VEHICLES[vehicleId]) return res.status(400).json({ error: "invalid vehicleId" });

  const p = locationFor(pickup);
  const d = locationFor(drop);
  if (p.label.toLowerCase() === d.label.toLowerCase()) {
    return res.status(400).json({ error: "pickup and drop must differ" });
  }

  const distanceKm = Math.max(0.8, haversineKm(p, d));
  const { fare, eta } = estimateFare(vehicleId, distanceKm);

  const ride = {
    id: newId("ride"),
    userId: req.userId,
    pickup: p,
    drop: d,
    vehicleId,
    distanceKm,
    fare,
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
