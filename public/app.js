const vehicles = [
  { id: "bike", icon: "🏍️", name: "Bike", etaBase: 3, baseFare: 28, perKm: 10 },
  { id: "auto", icon: "🛺", name: "Auto", etaBase: 4, baseFare: 40, perKm: 14 },
  { id: "mini", icon: "🚗", name: "Mini", etaBase: 5, baseFare: 55, perKm: 17 },
  { id: "sedan", icon: "🚘", name: "Sedan", etaBase: 7, baseFare: 80, perKm: 21 },
];

const STORAGE_KEY = "ridenow_recent_rides";
const trackerSteps = [
  { label: "Finding nearby captain...", progress: 20, delay: 2200 },
  { label: "Driver assigned and heading to pickup", progress: 45, delay: 3200 },
  { label: "Driver reached pickup point", progress: 65, delay: 3600 },
  { label: "Trip started", progress: 85, delay: 4200 },
  { label: "Trip completed", progress: 100, delay: 2200 },
];

const form = document.querySelector("#ride-form");
const pickupInput = document.querySelector("#pickup");
const dropInput = document.querySelector("#drop");
const paymentInput = document.querySelector("#payment");
const vehicleOptions = document.querySelector("#vehicle-options");
const distanceOutput = document.querySelector("#distance-output");
const etaOutput = document.querySelector("#eta-output");
const fareOutput = document.querySelector("#fare-output");
const formMessage = document.querySelector("#form-message");
const statusPanel = document.querySelector("#status-panel");
const historyList = document.querySelector("#history-list");
const chips = document.querySelectorAll(".chip");

let selectedVehicle = vehicles[0];
let activeTripTimer = null;

function pseudoDistance(pickup, drop) {
  const source = `${pickup}|${drop}`.trim().toLowerCase();
  let total = 0;
  for (let i = 0; i < source.length; i += 1) {
    total += source.charCodeAt(i) * (i + 1);
  }
  const raw = (total % 1600) / 100 + 1.2;
  return Number(raw.toFixed(1));
}

function computeEstimate(vehicle, distance) {
  const surge = distance > 10 ? 1.18 : 1;
  const fare = Math.round((vehicle.baseFare + distance * vehicle.perKm + 8) * surge);
  const eta = Math.max(4, Math.round(vehicle.etaBase + distance * 1.3));
  return { fare, eta };
}

function activeDistance() {
  if (!pickupInput.value.trim() || !dropInput.value.trim()) return 0;
  return pseudoDistance(pickupInput.value, dropInput.value);
}

function renderVehicles() {
  vehicleOptions.innerHTML = "";
  vehicles.forEach((vehicle) => {
    const distance = activeDistance();
    const estimate = computeEstimate(vehicle, distance || 3.5);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `vehicle-card ${selectedVehicle.id === vehicle.id ? "selected" : ""}`;
    button.dataset.id = vehicle.id;
    button.innerHTML = `
      <strong>${vehicle.icon} ${vehicle.name}</strong>
      <small>ETA ${estimate.eta} min</small>
      <small>from ₹${estimate.fare}</small>
    `;
    button.addEventListener("click", () => {
      selectedVehicle = vehicle;
      renderVehicles();
      updateSummary();
    });
    vehicleOptions.appendChild(button);
  });
}

function updateSummary() {
  const distance = activeDistance();
  if (!distance) {
    distanceOutput.textContent = "0 km";
    etaOutput.textContent = "0 min";
    fareOutput.textContent = "₹0";
    return;
  }

  const estimate = computeEstimate(selectedVehicle, distance);
  distanceOutput.textContent = `${distance} km`;
  etaOutput.textContent = `${estimate.eta} min`;
  fareOutput.textContent = `₹${estimate.fare}`;
}

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function setHistory(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function drawHistory() {
  const history = getHistory();
  historyList.innerHTML = "";
  if (!history.length) {
    historyList.innerHTML = '<li class="empty">No rides yet. Book your first trip.</li>';
    return;
  }

  history.forEach((ride) => {
    const item = document.createElement("li");
    item.innerHTML = `
      <strong>${ride.vehicle} • ₹${ride.fare}</strong>
      <span>${ride.pickup} → ${ride.drop}</span>
      <span class="meta">${ride.distance} km • ${ride.payment} • ${ride.date}</span>
    `;
    historyList.appendChild(item);
  });
}

function showTrackerSkeleton(ride) {
  statusPanel.classList.remove("empty");
  statusPanel.innerHTML = `
    <div class="status-top">
      <div>
        <strong>${ride.vehicle}</strong>
        <div class="meta">${ride.pickup} → ${ride.drop}</div>
      </div>
      <div class="meta">Fare ₹${ride.fare}</div>
    </div>
    <p id="status-text" class="status-text">Request accepted</p>
    <div class="progress">
      <div id="progress-bar" class="progress-bar"></div>
    </div>
  `;
}

function updateTracker(step) {
  const statusText = document.querySelector("#status-text");
  const progressBar = document.querySelector("#progress-bar");
  if (!statusText || !progressBar) return;
  statusText.textContent = step.label;
  progressBar.style.width = `${step.progress}%`;
}

function runTripLifecycle(ride) {
  if (activeTripTimer) clearTimeout(activeTripTimer);
  showTrackerSkeleton(ride);

  let index = 0;
  const tick = () => {
    const step = trackerSteps[index];
    updateTracker(step);

    if (index === trackerSteps.length - 1) {
      const history = getHistory();
      history.unshift({
        vehicle: ride.vehicle,
        pickup: ride.pickup,
        drop: ride.drop,
        distance: ride.distance,
        payment: ride.payment,
        fare: ride.fare,
        date: new Date().toLocaleString(),
      });
      setHistory(history.slice(0, 8));
      drawHistory();
      formMessage.style.color = "var(--success)";
      formMessage.textContent = "Ride completed and saved in history.";
      return;
    }

    index += 1;
    activeTripTimer = setTimeout(tick, step.delay);
  };

  tick();
}

function validateForm() {
  if (!pickupInput.value.trim() || !dropInput.value.trim()) {
    return "Please provide pickup and destination locations.";
  }
  if (pickupInput.value.trim().toLowerCase() === dropInput.value.trim().toLowerCase()) {
    return "Pickup and drop should be different locations.";
  }
  return "";
}

function handleBookRide(event) {
  event.preventDefault();
  const error = validateForm();
  if (error) {
    formMessage.style.color = "var(--warning)";
    formMessage.textContent = error;
    return;
  }

  const distance = activeDistance();
  const estimate = computeEstimate(selectedVehicle, distance);
  const ride = {
    pickup: pickupInput.value.trim(),
    drop: dropInput.value.trim(),
    vehicle: selectedVehicle.name,
    distance,
    fare: estimate.fare,
    payment: paymentInput.value,
  };

  formMessage.style.color = "var(--accent-2)";
  formMessage.textContent = `Ride booked! ${selectedVehicle.name} will arrive in ~${estimate.eta} min.`;
  runTripLifecycle(ride);
}

chips.forEach((chip) => {
  chip.addEventListener("click", () => {
    const value = chip.dataset.fill || "";
    if (!pickupInput.value.trim()) {
      pickupInput.value = value;
    } else {
      dropInput.value = value;
    }
    updateSummary();
    renderVehicles();
  });
});

[pickupInput, dropInput].forEach((input) => {
  input.addEventListener("input", () => {
    updateSummary();
    renderVehicles();
  });
});

form.addEventListener("submit", handleBookRide);

renderVehicles();
updateSummary();
drawHistory();
