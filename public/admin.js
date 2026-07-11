const state = { token: sessionStorage.getItem("ridenow_admin_token") || null, refreshTimer: null };

const $ = (s) => document.querySelector(s);
const els = {
  authCard: $("#auth-card"),
  authForm: $("#auth-form"),
  authMessage: $("#auth-message"),
  tokenInput: $("#admin-token"),
  logoutBtn: $("#logout-btn"),
  overviewCard: $("#overview-card"),
  overviewGrid: $("#overview-grid"),
  ridesCard: $("#rides-card"),
  usersCard: $("#users-card"),
  driversCard: $("#drivers-card"),
  ridesTable: $("#rides-table"),
  usersTable: $("#users-table"),
  driversTable: $("#drivers-table"),
};

async function adminApi(path) {
  const res = await fetch(path, { headers: { "X-Admin-Token": state.token } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

async function verifyToken(token) {
  const res = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "invalid token");
}

function showAuthed() {
  els.authCard.classList.add("hidden");
  els.overviewCard.classList.remove("hidden");
  els.ridesCard.classList.remove("hidden");
  els.usersCard.classList.remove("hidden");
  els.driversCard.classList.remove("hidden");
  els.logoutBtn.classList.remove("hidden");
}

function statCard(label, value) {
  return `<div class="stat"><span class="meta">${label}</span><strong>${value}</strong></div>`;
}

async function renderOverview() {
  const data = await adminApi("/api/admin/overview");
  const status = data.ridesByStatus || {};
  els.overviewGrid.innerHTML = [
    statCard("Users", data.users),
    statCard("Drivers", data.drivers),
    statCard("Drivers online", data.driversOnline),
    statCard("Total rides", data.rides),
    statCard("Completed", status.completed || 0),
    statCard("Cancelled", status.cancelled || 0),
    statCard("In progress", (status.in_progress || 0) + (status.arrived || 0) + (status.arriving || 0) + (status.assigned || 0)),
    statCard("Revenue", `₹${data.revenue}`),
    statCard("Uptime", `${data.uptimeSeconds}s`),
  ].join("");
}

function renderTable(tableEl, columns, rows) {
  const head = `<thead><tr>${columns.map((c) => `<th>${c.label}</th>`).join("")}</tr></thead>`;
  const body = rows.length
    ? rows.map((r) => `<tr>${columns.map((c) => `<td>${c.render(r)}</td>`).join("")}</tr>`).join("")
    : `<tr><td colspan="${columns.length}" class="meta">No data.</td></tr>`;
  tableEl.innerHTML = `${head}<tbody>${body}</tbody>`;
}

async function renderRides() {
  const { rides } = await adminApi("/api/admin/rides");
  renderTable(els.ridesTable, [
    { label: "ID", render: (r) => r.id.slice(0, 12) },
    { label: "Rider", render: (r) => r.userId.slice(0, 10) },
    { label: "Route", render: (r) => `${r.pickup.label} → ${r.drop.label}` },
    { label: "Vehicle", render: (r) => r.vehicleName },
    { label: "Fare", render: (r) => `₹${r.fare}${r.promoCode ? ` (${r.promoCode})` : ""}` },
    { label: "Status", render: (r) => r.status },
    { label: "Rating", render: (r) => r.rating || "-" },
    { label: "Created", render: (r) => new Date(r.createdAt).toLocaleString() },
  ], rides);
}

async function renderUsers() {
  const { users } = await adminApi("/api/admin/users");
  renderTable(els.usersTable, [
    { label: "ID", render: (u) => u.id.slice(0, 12) },
    { label: "Username", render: (u) => u.username },
    { label: "UPI", render: (u) => u.upiId || "-" },
    { label: "Created", render: (u) => new Date(u.createdAt).toLocaleString() },
  ], users);
}

async function renderDrivers() {
  const { drivers } = await adminApi("/api/admin/drivers");
  renderTable(els.driversTable, [
    { label: "ID", render: (d) => d.id.slice(0, 12) },
    { label: "Username", render: (d) => d.username },
    { label: "Name", render: (d) => d.name },
    { label: "Vehicle", render: (d) => `${d.vehicleId} • ${d.vehicleNumber}` },
    { label: "Online", render: (d) => (d.online ? "🟢" : "⚪") },
    { label: "Rating", render: (d) => d.rating },
    { label: "UPI", render: (d) => d.upiId || "-" },
  ], drivers);
}

async function refreshAll() {
  try {
    await Promise.all([renderOverview(), renderRides(), renderUsers(), renderDrivers()]);
  } catch (err) {
    if (String(err.message).includes("unauthorized")) handleLogout();
  }
}

async function handleAuth(event) {
  event.preventDefault();
  const token = els.tokenInput.value.trim();
  try {
    await verifyToken(token);
    state.token = token;
    sessionStorage.setItem("ridenow_admin_token", token);
    els.authMessage.textContent = "";
    showAuthed();
    await refreshAll();
    startAutoRefresh();
  } catch (err) {
    els.authMessage.style.color = "var(--warning)";
    els.authMessage.textContent = err.message;
  }
}

function handleLogout() {
  sessionStorage.removeItem("ridenow_admin_token");
  state.token = null;
  stopAutoRefresh();
  location.reload();
}

function startAutoRefresh() {
  stopAutoRefresh();
  state.refreshTimer = setInterval(refreshAll, 4000);
}

function stopAutoRefresh() {
  if (state.refreshTimer) {
    clearInterval(state.refreshTimer);
    state.refreshTimer = null;
  }
}

async function init() {
  els.authForm.addEventListener("submit", handleAuth);
  els.logoutBtn.addEventListener("click", handleLogout);
  if (state.token) {
    try {
      await verifyToken(state.token);
      showAuthed();
      await refreshAll();
      startAutoRefresh();
    } catch {
      sessionStorage.removeItem("ridenow_admin_token");
      state.token = null;
    }
  }
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
}

init();
