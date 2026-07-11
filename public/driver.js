const state = {
  token: localStorage.getItem("ridenow_driver_token") || null,
  driver: null,
  currentRide: null,
  offers: [],
  map: null,
  markers: {},
  socket: null,
};

const $ = (s) => document.querySelector(s);
const els = {
  authCard: $("#auth-card"),
  authForm: $("#auth-form"),
  authSubmit: $("#auth-submit"),
  authMessage: $("#auth-message"),
  tabs: document.querySelectorAll(".tab"),
  registerFields: $("#register-fields"),
  username: $("#d-username"),
  password: $("#d-password"),
  name: $("#d-name"),
  vehicle: $("#d-vehicle"),
  vehicleNumber: $("#d-vehicle-number"),
  upi: $("#d-upi"),
  onlineCard: $("#online-card"),
  offersCard: $("#offers-card"),
  currentCard: $("#current-card"),
  mapCard: $("#map-card"),
  meName: $("#me-name"),
  meDetails: $("#me-details"),
  driverStatus: $("#driver-status"),
  onlineToggle: $("#online-toggle"),
  logoutBtn: $("#logout-btn"),
  offersList: $("#offers-list"),
  currentPanel: $("#current-panel"),
  mapEl: $("#map"),
  locRandom: $("#loc-random"),
  locPickup: $("#loc-toward-pickup"),
  locDrop: $("#loc-toward-drop"),
};

let authMode = "login";

async function api(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const res = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function setAuthMode(mode) {
  authMode = mode;
  els.tabs.forEach((t) => t.classList.toggle("active", t.dataset.tab === mode));
  els.authSubmit.textContent = mode === "register" ? "Register" : "Login";
  els.registerFields.classList.toggle("hidden", mode !== "register");
}

async function handleAuth(event) {
  event.preventDefault();
  const body = { username: els.username.value.trim(), password: els.password.value };
  if (authMode === "register") {
    Object.assign(body, {
      name: els.name.value.trim() || els.username.value.trim(),
      vehicleId: els.vehicle.value,
      vehicleNumber: els.vehicleNumber.value.trim() || undefined,
      upiId: els.upi.value.trim() || undefined,
    });
  }
  const path = authMode === "register" ? "/api/drivers/register" : "/api/drivers/login";
  try {
    const data = await api(path, { method: "POST", body });
    state.token = data.token;
    state.driver = data.driver;
    localStorage.setItem("ridenow_driver_token", state.token);
    await afterLogin();
  } catch (err) {
    els.authMessage.style.color = "var(--warning)";
    els.authMessage.textContent = err.message;
  }
}

function showAuthedUi() {
  els.authCard.classList.add("hidden");
  els.onlineCard.classList.remove("hidden");
  els.offersCard.classList.remove("hidden");
  els.currentCard.classList.remove("hidden");
  els.mapCard.classList.remove("hidden");
  els.logoutBtn.classList.remove("hidden");
  ensureMap();
}

async function loadMe() {
  if (!state.token) return false;
  try {
    const { driver } = await api("/api/drivers/me");
    state.driver = driver;
    return true;
  } catch {
    localStorage.removeItem("ridenow_driver_token");
    state.token = null;
    return false;
  }
}

function renderProfile() {
  if (!state.driver) return;
  els.meName.textContent = `${state.driver.name} • ${state.driver.vehicleId}`;
  els.meDetails.textContent = `${state.driver.vehicleNumber} • rating ⭐ ${state.driver.rating}${state.driver.upiId ? ` • ${state.driver.upiId}` : ""}`;
  els.onlineToggle.textContent = state.driver.online ? "Go offline" : "Go online";
  els.driverStatus.textContent = state.driver.online ? "Online" : "Offline";
}

async function toggleOnline() {
  try {
    const { driver } = await api("/api/drivers/online", { method: "POST", body: { online: !state.driver.online } });
    state.driver = driver;
    renderProfile();
    if (driver.online) {
      ensureSocket();
      pushInitialLocation();
      loadOffers();
    }
  } catch (err) {
    alert(err.message);
  }
}

function ensureSocket() {
  if (state.socket && state.socket.readyState <= 1) return;
  const proto = location.protocol === "https:" ? "wss" : "ws";
  const socket = new WebSocket(`${proto}://${location.host}/ws?driverToken=${encodeURIComponent(state.token)}`);
  socket.addEventListener("message", (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === "ride:offer") {
        loadOffers();
      } else if (msg.type === "ride:taken") {
        state.offers = state.offers.filter((r) => r.id !== msg.rideId);
        renderOffers();
      }
    } catch {}
  });
  socket.addEventListener("close", () => (state.socket = null));
  state.socket = socket;
}

async function loadOffers() {
  try {
    const { rides } = await api("/api/drivers/rides/available");
    state.offers = rides;
    renderOffers();
  } catch {}
}

function renderOffers() {
  els.offersList.innerHTML = "";
  if (!state.offers.length) {
    els.offersList.innerHTML = '<li class="empty">No offers yet.</li>';
    return;
  }
  state.offers.forEach((ride) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>₹${ride.fare} • ${ride.distanceKm} km</strong>
      <span>${ride.pickup.label} → ${ride.drop.label}</span>
      <span class="meta">${ride.payment}${ride.promoCode ? ` • promo ${ride.promoCode}` : ""}</span>
      <button class="primary" type="button" data-accept="${ride.id}">Accept</button>
    `;
    li.querySelector("button").addEventListener("click", () => acceptRide(ride.id));
    els.offersList.appendChild(li);
  });
}

async function acceptRide(id) {
  try {
    const { ride } = await api(`/api/drivers/rides/${id}/accept`, { method: "POST", body: {} });
    state.currentRide = ride;
    renderCurrent();
    loadOffers();
    updateMap();
  } catch (err) {
    alert(err.message);
  }
}

async function loadCurrent() {
  try {
    const { ride } = await api("/api/drivers/rides/current");
    state.currentRide = ride;
    renderCurrent();
    updateMap();
  } catch {}
}

const NEXT_LABEL = {
  assigned: "Mark arriving",
  arriving: "Reached pickup",
  arrived: "Start trip",
  in_progress: "Complete trip",
};

function renderCurrent() {
  const ride = state.currentRide;
  if (!ride) {
    els.currentPanel.classList.add("empty");
    els.currentPanel.innerHTML = "<p>Accept a ride to see it here.</p>";
    return;
  }
  els.currentPanel.classList.remove("empty");
  const next = NEXT_LABEL[ride.status];
  els.currentPanel.innerHTML = `
    <div class="status-top">
      <div>
        <strong>${ride.vehicleName}</strong>
        <div class="meta">${ride.pickup.label} → ${ride.drop.label}</div>
      </div>
      <div class="meta">₹${ride.fare} • ${ride.distanceKm} km • ${ride.payment}</div>
    </div>
    <p class="status-text">Status: ${ride.status}</p>
    <div class="status-actions">
      ${next ? `<button class="primary" type="button" id="advance-btn">${next}</button>` : ""}
    </div>
  `;
  const btn = document.getElementById("advance-btn");
  if (btn) btn.addEventListener("click", advanceRide);
}

async function advanceRide() {
  try {
    const { ride } = await api(`/api/drivers/rides/${state.currentRide.id}/advance`, {
      method: "POST",
      body: {},
    });
    if (ride.status === "completed") {
      state.currentRide = null;
      alert("Trip completed!");
      renderCurrent();
      loadOffers();
    } else {
      state.currentRide = ride;
      renderCurrent();
      updateMap();
    }
  } catch (err) {
    alert(err.message);
  }
}

function ensureMap() {
  if (state.map || !window.L) return;
  state.map = L.map(els.mapEl).setView([12.9716, 77.5946], 12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap",
    maxZoom: 19,
  }).addTo(state.map);
  setTimeout(() => state.map && state.map.invalidateSize(), 100);
}

function pinIcon(color) {
  return L.divIcon({
    className: "",
    html: `<div style="background:${color};width:16px;height:16px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 2px ${color};"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function updateMap() {
  ensureMap();
  if (!state.map) return;
  ["pickup", "drop", "driver", "route"].forEach((k) => {
    if (state.markers[k]) state.map.removeLayer(state.markers[k]);
    state.markers[k] = null;
  });
  const ride = state.currentRide;
  if (ride) {
    state.markers.pickup = L.marker([ride.pickup.lat, ride.pickup.lng], { icon: pinIcon("#64dfdf") })
      .addTo(state.map)
      .bindPopup(`Pickup: ${ride.pickup.label}`);
    state.markers.drop = L.marker([ride.drop.lat, ride.drop.lng], { icon: pinIcon("#ffd93d") })
      .addTo(state.map)
      .bindPopup(`Drop: ${ride.drop.label}`);
    state.markers.route = L.polyline(
      [[ride.pickup.lat, ride.pickup.lng], [ride.drop.lat, ride.drop.lng]],
      { color: "#5b7af7", dashArray: "6,8", opacity: 0.7, weight: 4 }
    ).addTo(state.map);
  }
  if (state.driver && state.driver.location) {
    state.markers.driver = L.marker([state.driver.location.lat, state.driver.location.lng], {
      icon: pinIcon("#ff914d"),
    })
      .addTo(state.map)
      .bindPopup("You");
  }
  const bounds = [];
  if (ride) bounds.push([ride.pickup.lat, ride.pickup.lng], [ride.drop.lat, ride.drop.lng]);
  if (state.driver && state.driver.location) bounds.push([state.driver.location.lat, state.driver.location.lng]);
  if (bounds.length > 1) state.map.fitBounds(bounds, { padding: [40, 40] });
}

async function updateLocation(location) {
  state.driver.location = location;
  try {
    const { driver } = await api("/api/drivers/location", { method: "POST", body: location });
    state.driver = driver;
    updateMap();
  } catch {}
}

function pushInitialLocation() {
  const base = { lat: 12.9716, lng: 77.5946 };
  const loc = state.driver.location || {
    lat: base.lat + (Math.random() - 0.5) * 0.02,
    lng: base.lng + (Math.random() - 0.5) * 0.02,
  };
  updateLocation(loc);
}

function randomNearby() {
  const cur = state.driver.location || { lat: 12.9716, lng: 77.5946 };
  updateLocation({
    lat: cur.lat + (Math.random() - 0.5) * 0.01,
    lng: cur.lng + (Math.random() - 0.5) * 0.01,
  });
}

function moveToward(target) {
  const cur = state.driver.location || { lat: target.lat, lng: target.lng };
  const next = {
    lat: cur.lat + (target.lat - cur.lat) * 0.3,
    lng: cur.lng + (target.lng - cur.lng) * 0.3,
  };
  updateLocation(next);
}

function handleLogout() {
  localStorage.removeItem("ridenow_driver_token");
  state.token = null;
  state.driver = null;
  state.currentRide = null;
  state.offers = [];
  if (state.socket) state.socket.close();
  location.reload();
}

async function afterLogin() {
  showAuthedUi();
  renderProfile();
  if (state.driver.online) ensureSocket();
  await loadCurrent();
  await loadOffers();
}

function attachEvents() {
  els.tabs.forEach((t) => t.addEventListener("click", () => setAuthMode(t.dataset.tab)));
  els.authForm.addEventListener("submit", handleAuth);
  els.onlineToggle.addEventListener("click", toggleOnline);
  els.logoutBtn.addEventListener("click", handleLogout);
  els.locRandom.addEventListener("click", randomNearby);
  els.locPickup.addEventListener("click", () => state.currentRide && moveToward(state.currentRide.pickup));
  els.locDrop.addEventListener("click", () => state.currentRide && moveToward(state.currentRide.drop));
}

async function init() {
  attachEvents();
  setAuthMode("login");
  if (await loadMe()) {
    await afterLogin();
  }
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
}

init();
