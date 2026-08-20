const $ = (id) => document.getElementById(id);

const form = $("leadForm");
const statusEl = $("status");
const resultsWrap = $("resultsWrap");
const tbody = document.querySelector("#resultsTable tbody");
const generateBtn = $("generateBtn");
const csvBtn = $("csvBtn");
const copyBtn = $("copyBtn");
const providerBadge = $("providerBadge");

// Lead types that commonly need IT / web-development / software services.
const PRESET_TYPES = [
  "Restaurants", "Cafes", "Hotels", "Clinics", "Dentists", "Doctors",
  "Hospitals", "Law firms", "Real estate agents", "Gyms", "Salons",
  "Car dealers", "Schools", "Colleges", "Retail stores", "Manufacturers",
  "Interior designers", "Travel agencies", "Accountants", "IT companies",
];

let lastLeads = [];

function renderChips() {
  const wrap = $("typeChips");
  PRESET_TYPES.forEach((t) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = t;
    chip.addEventListener("click", () => { $("type").value = t; });
    wrap.appendChild(chip);
  });
}

async function loadConfig() {
  try {
    const res = await fetch("/api/config");
    const cfg = await res.json();
    $("provider").value = cfg.defaultProvider;
    if (!cfg.googleEnabled) {
      providerBadge.textContent = "Google key not set · using OpenStreetMap";
      const opt = $("provider").querySelector('option[value="google"]');
      opt.textContent = "Google Maps (needs API key)";
    } else {
      providerBadge.textContent = "Google Maps ready";
    }
  } catch {
    providerBadge.textContent = "";
  }
}

function setStatus(msg, kind) {
  if (!msg) { statusEl.hidden = true; return; }
  statusEl.hidden = false;
  statusEl.className = `status ${kind || ""}`;
  statusEl.innerHTML = kind === "loading" ? `<span class="spinner"></span>${msg}` : msg;
}

function payload() {
  return {
    type: $("type").value.trim(),
    location: $("location").value.trim(),
    limit: Number($("limit").value) || 40,
    provider: $("provider").value,
    onlyNoWebsite: $("onlyNoWebsite").checked,
  };
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function renderTable(leads) {
  tbody.innerHTML = "";
  leads.forEach((l, i) => {
    const tr = document.createElement("tr");
    const site = l.website
      ? `<a href="${esc(l.website)}" target="_blank" rel="noopener">${esc(l.website.replace(/^https?:\/\//, ""))}</a>`
      : `<span class="no-web">no website</span>`;
    const phone = l.phone ? `<a href="tel:${esc(l.phone)}">${esc(l.phone)}</a>` : "—";
    const map = l.mapsUrl ? `<a href="${esc(l.mapsUrl)}" target="_blank" rel="noopener">open</a>` : "—";
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${esc(l.name) || "—"}</td>
      <td>${esc(l.category) || "—"}</td>
      <td>${phone}</td>
      <td>${site}</td>
      <td>${esc(l.address) || "—"}</td>
      <td>${l.rating !== "" ? esc(l.rating) : "—"}</td>
      <td>${l.reviews !== "" ? esc(l.reviews) : "—"}</td>
      <td>${esc(l.hours) || "—"}</td>
      <td>${map}</td>`;
    tbody.appendChild(tr);
  });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const body = payload();
  generateBtn.disabled = true;
  csvBtn.disabled = true;
  copyBtn.disabled = true;
  resultsWrap.hidden = true;
  setStatus(`Searching Google Maps for “${esc(body.type)}” in “${esc(body.location)}”…`, "loading");

  try {
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Something went wrong.");

    lastLeads = data.leads;
    if (!lastLeads.length) {
      setStatus("No leads found. Try a broader lead type or a different location.", "error");
      return;
    }
    setStatus(`Found ${data.count} leads via ${data.provider === "google" ? "Google Maps" : "OpenStreetMap"}.`);
    $("resultsTitle").textContent = `Results (${data.count})`;
    renderTable(lastLeads);
    resultsWrap.hidden = false;
    csvBtn.disabled = false;
    copyBtn.disabled = false;
  } catch (err) {
    setStatus(err.message, "error");
  } finally {
    generateBtn.disabled = false;
  }
});

csvBtn.addEventListener("click", async () => {
  const res = await fetch("/api/leads.csv", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload()),
  });
  if (!res.ok) { setStatus("CSV export failed.", "error"); return; }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "leads.csv";
  a.click();
  URL.revokeObjectURL(url);
});

copyBtn.addEventListener("click", async () => {
  const header = ["Name", "Category", "Phone", "Website", "Address", "Rating", "Reviews", "Hours"];
  const lines = [header.join("\t")];
  lastLeads.forEach((l) =>
    lines.push([l.name, l.category, l.phone, l.website, l.address, l.rating, l.reviews, l.hours].join("\t"))
  );
  try {
    await navigator.clipboard.writeText(lines.join("\n"));
    const old = copyBtn.textContent;
    copyBtn.textContent = "Copied!";
    setTimeout(() => (copyBtn.textContent = old), 1500);
  } catch {
    setStatus("Could not copy to clipboard.", "error");
  }
});

renderChips();
loadConfig();
