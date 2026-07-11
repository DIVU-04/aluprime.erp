const params = new URLSearchParams(location.search);
const rideId = params.get("ride");
const share = params.get("share");

const state = { ride: null, map: null, markers: {} };
const panel = document.getElementById("track-panel");
const mapEl = document.getElementById("map");

const STATUS_LABEL = {
  searching: "Finding a captain...",
  assigned: "Captain assigned",
  arriving: "Captain is on the way",
  arrived: "Captain has arrived at pickup",
  in_progress: "Trip in progress",
  completed: "Trip completed",
  cancelled: "Ride cancelled",
};

function ensureMap() {
  if (state.map || !window.L) return;
  state.map = L.map(mapEl).setView([12.9716, 77.5946], 12);
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

function renderPanel(ride) {
  panel.classList.remove("empty");
  panel.innerHTML = `
    <div class="status-top">
      <div>
        <strong>${ride.vehicleName}</strong>
        <div class="meta">${ride.pickup.label} → ${ride.drop.label}</div>
      </div>
      <div class="meta">₹${ride.fare} • ${ride.distanceKm} km</div>
    </div>
    <p class="status-text">${STATUS_LABEL[ride.status] || ride.status}</p>
    ${ride.driver ? `<div class="driver-box"><div class="driver-avatar">${ride.driver.name.charAt(0)}</div><div><strong>${ride.driver.name}</strong><div class="meta">${ride.driver.vehicleNumber} • ⭐ ${ride.driver.rating}</div></div></div>` : ""}
  `;
}

function updateMap(ride) {
  ensureMap();
  if (!state.map) return;
  ["pickup", "drop", "driver", "route"].forEach((k) => {
    if (state.markers[k]) state.map.removeLayer(state.markers[k]);
    state.markers[k] = null;
  });
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
  if (ride.driverLocation) {
    state.markers.driver = L.marker([ride.driverLocation.lat, ride.driverLocation.lng], {
      icon: pinIcon("#ff914d"),
    })
      .addTo(state.map)
      .bindPopup("Driver");
  }
  state.map.fitBounds(state.markers.route.getBounds(), { padding: [40, 40] });
}

async function fetchRide() {
  if (!rideId || !share) {
    panel.innerHTML = "<p>Missing ride ID or share token.</p>";
    return;
  }
  try {
    const res = await fetch(`/api/public/rides/${rideId}?share=${encodeURIComponent(share)}`);
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    const { ride } = await res.json();
    state.ride = ride;
    renderPanel(ride);
    updateMap(ride);
  } catch (err) {
    panel.innerHTML = `<p>Trip not available. ${err.message}</p>`;
  }
}

fetchRide();
setInterval(fetchRide, 2500);

if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
