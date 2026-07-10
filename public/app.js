const state = {
  token: localStorage.getItem("ridenow_token") || null,
  user: null,
  vehicles: [],
  selectedVehicleId: "bike",
  estimate: null,
  activeRide: null,
  socket: null,
  map: null,
  markers: {
    pickup: null,
    drop: null,
    driver: null,
    route: null,
  },
};

const $ = (selector) => document.querySelector(selector);

const els = {
  authCard: $("#auth-card"),
  authForm: $("#auth-form"),
  authUsername: $("#auth-username"),
  authPassword: $("#auth-password"),
  authSubmit: $("#auth-submit"),
  authMessage: $("#auth-message"),
  tabs: document.querySelectorAll(".tab"),
  userBox: $("#user-box"),
  usernameLabel: $("#username-label"),
  logoutBtn: $("#logout-btn"),
  bookingCard: $("#booking-card"),
  upiCard: $("#upi-card"),
  upiForm: $("#upi-form"),
  upiInput: $("#upi-input"),
  upiSaveBtn: $("#upi-save"),
  upiClearBtn: $("#upi-clear"),
  upiMessage: $("#upi-message"),
  myQrPanel: $("#my-qr-panel"),
  myQrImg: $("#my-qr-img"),
  myQrUpi: $("#my-qr-upi"),
  mapCard: $("#map-card"),
  trackerCard: $("#tracker-card"),
  historyCard: $("#history-card"),
  rideForm: $("#ride-form"),
  pickup: $("#pickup"),
  drop: $("#drop"),
  payment: $("#payment"),
  vehicleOptions: $("#vehicle-options"),
  distanceOutput: $("#distance-output"),
  etaOutput: $("#eta-output"),
  fareOutput: $("#fare-output"),
  bookBtn: $("#book-btn"),
  formMessage: $("#form-message"),
  statusPanel: $("#status-panel"),
  historyList: $("#history-list"),
  chips: document.querySelectorAll(".chip"),
  mapEl: $("#map"),
};

let authMode = "login";
let estimateTimer = null;

async function api(path, { method = "GET", body, auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth && state.token) headers.Authorization = `Bearer ${state.token}`;
  const res = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function setAuthMode(mode) {
  authMode = mode;
  els.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === mode));
  els.authSubmit.textContent = mode === "signup" ? "Create account" : "Login";
  els.authMessage.textContent = "";
}

function showAuthedUi() {
  els.authCard.classList.add("hidden");
  els.userBox.classList.remove("hidden");
  els.bookingCard.classList.remove("hidden");
  els.upiCard.classList.remove("hidden");
  els.mapCard.classList.remove("hidden");
  els.trackerCard.classList.remove("hidden");
  els.historyCard.classList.remove("hidden");
  els.usernameLabel.textContent = state.user ? `@${state.user.username}` : "";
  ensureMap();
  renderUpiUi();
}

function showLoggedOutUi() {
  els.authCard.classList.remove("hidden");
  els.userBox.classList.add("hidden");
  els.bookingCard.classList.add("hidden");
  els.upiCard.classList.add("hidden");
  els.mapCard.classList.add("hidden");
  els.trackerCard.classList.add("hidden");
  els.historyCard.classList.add("hidden");
}

async function loadCurrentUser() {
  if (!state.token) return false;
  try {
    const { user } = await api("/api/me", { auth: true });
    state.user = user;
    return true;
  } catch {
    localStorage.removeItem("ridenow_token");
    state.token = null;
    state.user = null;
    return false;
  }
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  const username = els.authUsername.value.trim();
  const password = els.authPassword.value;
  if (!username || password.length < 4) {
    els.authMessage.style.color = "var(--warning)";
    els.authMessage.textContent = "Enter a username and a 4+ char password.";
    return;
  }
  const endpoint = authMode === "signup" ? "/api/auth/signup" : "/api/auth/login";
  els.authSubmit.disabled = true;
  try {
    const data = await api(endpoint, { method: "POST", body: { username, password } });
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem("ridenow_token", state.token);
    els.authMessage.textContent = "";
    await afterLogin();
  } catch (err) {
    els.authMessage.style.color = "var(--warning)";
    els.authMessage.textContent = err.message;
  } finally {
    els.authSubmit.disabled = false;
  }
}

async function renderUpiUi() {
  const upi = state.user?.upiId || "";
  els.upiInput.value = upi;
  els.upiClearBtn.disabled = !upi;
  if (upi) {
    try {
      const data = await api("/api/me/qr", { auth: true });
      els.myQrImg.src = data.dataUrl;
      els.myQrUpi.textContent = data.upiId;
      els.myQrPanel.classList.remove("hidden");
    } catch {
      els.myQrPanel.classList.add("hidden");
    }
  } else {
    els.myQrPanel.classList.add("hidden");
    els.myQrImg.removeAttribute("src");
  }
}

async function handleUpiSave(event) {
  event.preventDefault();
  const value = els.upiInput.value.trim();
  if (!value) {
    els.upiMessage.style.color = "var(--warning)";
    els.upiMessage.textContent = "Enter a UPI ID like name@bank.";
    return;
  }
  els.upiSaveBtn.disabled = true;
  els.upiMessage.style.color = "var(--accent-2)";
  els.upiMessage.textContent = "Saving...";
  try {
    const { user } = await api("/api/me/upi", {
      method: "PUT",
      auth: true,
      body: { upiId: value },
    });
    state.user = user;
    els.upiMessage.style.color = "var(--success)";
    els.upiMessage.textContent = "UPI saved. QR ready to scan.";
    await renderUpiUi();
  } catch (err) {
    els.upiMessage.style.color = "var(--warning)";
    els.upiMessage.textContent = err.message;
  } finally {
    els.upiSaveBtn.disabled = false;
  }
}

async function handleUpiClear() {
  els.upiSaveBtn.disabled = true;
  try {
    const { user } = await api("/api/me/upi", {
      method: "PUT",
      auth: true,
      body: { upiId: null },
    });
    state.user = user;
    els.upiInput.value = "";
    els.upiMessage.style.color = "var(--muted)";
    els.upiMessage.textContent = "UPI ID removed.";
    await renderUpiUi();
  } catch (err) {
    els.upiMessage.style.color = "var(--warning)";
    els.upiMessage.textContent = err.message;
  } finally {
    els.upiSaveBtn.disabled = false;
  }
}

function handleLogout() {
  localStorage.removeItem("ridenow_token");
  state.token = null;
  state.user = null;
  state.activeRide = null;
  if (state.socket) {
    state.socket.close();
    state.socket = null;
  }
  showLoggedOutUi();
}

async function loadVehicles() {
  const { vehicles } = await api("/api/vehicles");
  state.vehicles = vehicles;
  renderVehicles();
}

function renderVehicles() {
  els.vehicleOptions.innerHTML = "";
  state.vehicles.forEach((vehicle) => {
    const est = state.estimate?.options?.find((o) => o.id === vehicle.id);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `vehicle-card ${state.selectedVehicleId === vehicle.id ? "selected" : ""}`;
    button.dataset.id = vehicle.id;
    const icon =
      vehicle.id === "bike"
        ? "🏍️"
        : vehicle.id === "auto"
          ? "🛺"
          : vehicle.id === "mini"
            ? "🚗"
            : "🚘";
    button.innerHTML = `
      <strong>${icon} ${vehicle.name}</strong>
      <small>${est ? `ETA ${est.eta} min` : "Enter route for ETA"}</small>
      <small>${est ? `from ₹${est.fare}` : `from ₹${vehicle.baseFare}`}</small>
    `;
    button.addEventListener("click", () => {
      state.selectedVehicleId = vehicle.id;
      renderVehicles();
      renderFareSummary();
    });
    els.vehicleOptions.appendChild(button);
  });
}

function renderFareSummary() {
  const options = state.estimate?.options || [];
  const chosen = options.find((o) => o.id === state.selectedVehicleId);
  if (!state.estimate || !chosen) {
    els.distanceOutput.textContent = "0 km";
    els.etaOutput.textContent = "0 min";
    els.fareOutput.textContent = "₹0";
    return;
  }
  els.distanceOutput.textContent = `${state.estimate.distanceKm} km`;
  els.etaOutput.textContent = `${chosen.eta} min`;
  els.fareOutput.textContent = `₹${chosen.fare}`;
}

async function refreshEstimate() {
  const pickup = els.pickup.value.trim();
  const drop = els.drop.value.trim();
  if (!pickup || !drop) {
    state.estimate = null;
    renderVehicles();
    renderFareSummary();
    return;
  }
  try {
    state.estimate = await api("/api/estimate", {
      method: "POST",
      body: { pickup, drop, vehicleId: state.selectedVehicleId },
    });
    renderVehicles();
    renderFareSummary();
    updateMapForEstimate();
  } catch {}
}

function debounceEstimate() {
  if (estimateTimer) clearTimeout(estimateTimer);
  estimateTimer = setTimeout(refreshEstimate, 300);
}

async function handleBookRide(event) {
  event.preventDefault();
  const pickup = els.pickup.value.trim();
  const drop = els.drop.value.trim();
  if (!pickup || !drop) {
    els.formMessage.style.color = "var(--warning)";
    els.formMessage.textContent = "Provide both pickup and drop locations.";
    return;
  }

  els.bookBtn.disabled = true;
  els.formMessage.style.color = "var(--accent-2)";
  els.formMessage.textContent = "Requesting ride...";

  try {
    const { ride } = await api("/api/rides", {
      method: "POST",
      auth: true,
      body: {
        pickup,
        drop,
        vehicleId: state.selectedVehicleId,
        payment: els.payment.value,
      },
    });
    state.activeRide = ride;
    els.formMessage.textContent = `Ride booked! ${ride.vehicleName} will arrive soon.`;
    renderActiveRide(ride);
    updateMapForRide(ride);
    ensureSocket();
  } catch (err) {
    els.formMessage.style.color = "var(--warning)";
    els.formMessage.textContent = err.message;
  } finally {
    els.bookBtn.disabled = false;
  }
}

const STATUS_LABEL = {
  searching: "Finding a nearby captain...",
  assigned: "Driver assigned and heading to pickup",
  arriving: "Driver is on the way",
  arrived: "Driver has reached your pickup",
  in_progress: "Trip in progress",
  completed: "Trip completed",
  cancelled: "Trip cancelled",
};

const STATUS_PROGRESS = {
  searching: 15,
  assigned: 35,
  arriving: 50,
  arrived: 65,
  in_progress: 85,
  completed: 100,
  cancelled: 100,
};

function renderActiveRide(ride) {
  els.statusPanel.classList.remove("empty");
  const initial = ride.driver ? ride.driver.name.charAt(0) : "?";
  els.statusPanel.innerHTML = `
    <div class="status-top">
      <div>
        <strong>${ride.vehicleName}</strong>
        <div class="meta">${ride.pickup.label} → ${ride.drop.label}</div>
      </div>
      <div class="meta">Fare ₹${ride.fare} • ${ride.distanceKm} km</div>
    </div>
    <p id="status-text" class="status-text">${STATUS_LABEL[ride.status] || ride.status}</p>
    <div class="progress"><div id="progress-bar" class="progress-bar"></div></div>
    <div class="driver-box ${ride.driver ? "" : "hidden"}">
      <div class="driver-avatar">${initial}</div>
      <div>
        <strong>${ride.driver?.name || ""}</strong>
        <div class="meta">
          ${ride.driver ? `${ride.driver.vehicleNumber} • ⭐ ${ride.driver.rating}` : ""}
        </div>
      </div>
    </div>
    <div id="pay-qr" class="qr-panel pay-qr hidden"></div>
  `;
  const bar = document.getElementById("progress-bar");
  if (bar) bar.style.width = `${STATUS_PROGRESS[ride.status] || 0}%`;

  if (ride.driver) {
    loadRidePaymentQr(ride);
  }
}

async function loadRidePaymentQr(ride) {
  try {
    const data = await api(`/api/rides/${ride.id}/qr`, { auth: true });
    const panel = document.getElementById("pay-qr");
    if (!panel) return;
    panel.innerHTML = `
      <img alt="Pay driver QR" src="${data.dataUrl}" />
      <div>
        <strong>Scan to pay ₹${data.amount}</strong>
        <div class="meta">${data.payee.name} • ${data.payee.upiId}</div>
        <div class="meta">Open any UPI app and scan.</div>
      </div>
    `;
    panel.classList.remove("hidden");
  } catch {}
}

async function loadHistory() {
  try {
    const { rides } = await api("/api/rides", { auth: true });
    els.historyList.innerHTML = "";
    if (!rides.length) {
      els.historyList.innerHTML = '<li class="empty">No rides yet. Book your first trip.</li>';
      return;
    }
    rides.forEach((ride) => {
      const item = document.createElement("li");
      const when = new Date(ride.createdAt).toLocaleString();
      item.innerHTML = `
        <strong>${ride.vehicleName} • ₹${ride.fare}</strong>
        <span>${ride.pickup.label} → ${ride.drop.label}</span>
        <span class="meta">${ride.distanceKm} km • ${ride.payment} • ${when} • ${ride.status}</span>
      `;
      els.historyList.appendChild(item);
    });
  } catch {}
}

function ensureSocket() {
  if (state.socket && state.socket.readyState <= 1) return;
  const proto = location.protocol === "https:" ? "wss" : "ws";
  const socket = new WebSocket(`${proto}://${location.host}/ws?token=${encodeURIComponent(state.token)}`);
  socket.addEventListener("message", (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === "ride:update") {
        state.activeRide = msg.ride;
        renderActiveRide(msg.ride);
        updateMapForRide(msg.ride);
        if (msg.ride.status === "completed") {
          loadHistory();
        }
      }
    } catch {}
  });
  socket.addEventListener("close", () => {
    state.socket = null;
  });
  state.socket = socket;
}

function ensureMap() {
  if (state.map || !window.L) return;
  state.map = L.map(els.mapEl, { zoomControl: true }).setView([12.9716, 77.5946], 12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap",
  }).addTo(state.map);
  setTimeout(() => state.map && state.map.invalidateSize(), 100);
}

function clearMapMarkers() {
  ["pickup", "drop", "driver", "route"].forEach((key) => {
    if (state.markers[key]) {
      state.map.removeLayer(state.markers[key]);
      state.markers[key] = null;
    }
  });
}

function pinIcon(color) {
  return L.divIcon({
    className: "",
    html: `<div style="background:${color};width:18px;height:18px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 2px ${color};"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function updateMapForEstimate() {
  ensureMap();
  if (!state.map || !state.estimate) return;
  clearMapMarkers();
  const p = state.estimate.pickup;
  const d = state.estimate.drop;
  state.markers.pickup = L.marker([p.lat, p.lng], { icon: pinIcon("#64dfdf") })
    .addTo(state.map)
    .bindPopup(`Pickup: ${p.label}`);
  state.markers.drop = L.marker([d.lat, d.lng], { icon: pinIcon("#ffd93d") })
    .addTo(state.map)
    .bindPopup(`Drop: ${d.label}`);
  state.markers.route = L.polyline(
    [
      [p.lat, p.lng],
      [d.lat, d.lng],
    ],
    { color: "#5b7af7", weight: 4, opacity: 0.7, dashArray: "6,8" }
  ).addTo(state.map);
  state.map.fitBounds(state.markers.route.getBounds(), { padding: [40, 40] });
}

function updateMapForRide(ride) {
  ensureMap();
  if (!state.map) return;
  if (!state.markers.pickup) {
    state.markers.pickup = L.marker([ride.pickup.lat, ride.pickup.lng], {
      icon: pinIcon("#64dfdf"),
    })
      .addTo(state.map)
      .bindPopup(`Pickup: ${ride.pickup.label}`);
  }
  if (!state.markers.drop) {
    state.markers.drop = L.marker([ride.drop.lat, ride.drop.lng], {
      icon: pinIcon("#ffd93d"),
    })
      .addTo(state.map)
      .bindPopup(`Drop: ${ride.drop.label}`);
  }
  if (!state.markers.route) {
    state.markers.route = L.polyline(
      [
        [ride.pickup.lat, ride.pickup.lng],
        [ride.drop.lat, ride.drop.lng],
      ],
      { color: "#5b7af7", weight: 4, opacity: 0.7, dashArray: "6,8" }
    ).addTo(state.map);
  }

  if (ride.driverLocation) {
    const pos = [ride.driverLocation.lat, ride.driverLocation.lng];
    if (!state.markers.driver) {
      state.markers.driver = L.marker(pos, { icon: pinIcon("#ff914d") })
        .addTo(state.map)
        .bindPopup("Driver");
    } else {
      state.markers.driver.setLatLng(pos);
    }
  }

  if (state.markers.route) {
    state.map.fitBounds(state.markers.route.getBounds(), { padding: [40, 40] });
  }
}

async function afterLogin() {
  showAuthedUi();
  await loadVehicles();
  await loadHistory();
  ensureSocket();
}

function attachEvents() {
  els.tabs.forEach((tab) => tab.addEventListener("click", () => setAuthMode(tab.dataset.tab)));
  els.authForm.addEventListener("submit", handleAuthSubmit);
  els.logoutBtn.addEventListener("click", handleLogout);
  els.upiForm.addEventListener("submit", handleUpiSave);
  els.upiClearBtn.addEventListener("click", handleUpiClear);
  els.rideForm.addEventListener("submit", handleBookRide);
  els.chips.forEach((chip) =>
    chip.addEventListener("click", () => {
      const value = chip.dataset.fill || "";
      if (!els.pickup.value.trim()) {
        els.pickup.value = value;
      } else if (!els.drop.value.trim()) {
        els.drop.value = value;
      } else {
        els.drop.value = value;
      }
      debounceEstimate();
    })
  );
  [els.pickup, els.drop].forEach((input) => input.addEventListener("input", debounceEstimate));
}

async function init() {
  attachEvents();
  setAuthMode("login");
  const ok = await loadCurrentUser();
  if (ok) {
    await afterLogin();
  } else {
    showLoggedOutUi();
  }
}

init();
