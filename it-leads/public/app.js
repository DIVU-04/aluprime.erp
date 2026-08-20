const state = {
  config: null,
  leads: [],
  lastSearch: null,
  selectedLead: null,
};

const $ = (id) => document.getElementById(id);

const form = $("searchForm");
const countryCode = $("countryCode");
const locationInput = $("location");
const presetLocations = $("presetLocations");
const categoryId = $("categoryId");
const categoryHint = $("categoryHint");
const customQueryField = $("customQueryField");
const customQuery = $("customQuery");
const radiusKm = $("radiusKm");
const radiusLabel = $("radiusLabel");
const maxResults = $("maxResults");
const maxResultsLabel = $("maxResultsLabel");
const searchBtn = $("searchBtn");
const apiStatus = $("apiStatus");
const alertBox = $("alert");
const emptyState = $("emptyState");
const statsBar = $("statsBar");
const tableWrap = $("tableWrap");
const leadsBody = $("leadsBody");
const resultsTitle = $("resultsTitle");
const resultsMeta = $("resultsMeta");
const exportCsvBtn = $("exportCsvBtn");
const exportJsonBtn = $("exportJsonBtn");
const copyBtn = $("copyBtn");
const leadModal = $("leadModal");
const modalTitle = $("modalTitle");
const modalSubtitle = $("modalSubtitle");
const modalBody = $("modalBody");
const modalMapsBtn = $("modalMapsBtn");
const modalCopyBtn = $("modalCopyBtn");

function showAlert(message, type = "error") {
  alertBox.hidden = false;
  alertBox.className = `alert alert--${type}`;
  alertBox.textContent = message;
}

function hideAlert() {
  alertBox.hidden = true;
}

function setLoading(isLoading) {
  searchBtn.disabled = isLoading;
  searchBtn.querySelector(".btn__text").hidden = isLoading;
  searchBtn.querySelector(".btn__loader").hidden = !isLoading;
}

function getFormPayload() {
  return {
    category_id: categoryId.value,
    custom_query: customQuery.value.trim(),
    location: locationInput.value.trim(),
    country_code: countryCode.value,
    radius_km: Number(radiusKm.value),
    max_results: Number(maxResults.value),
  };
}

function updateCategoryUI() {
  const selected = state.config?.categories?.find((item) => item.id === categoryId.value);
  categoryHint.textContent = selected?.description || "";
  customQueryField.hidden = categoryId.value !== "custom";
}

function populateConfig(config) {
  state.config = config;

  countryCode.innerHTML = config.countries
    .map((country) => `<option value="${country.code}">${country.name}</option>`)
    .join("");
  countryCode.value = config.default_country || "IN";

  presetLocations.innerHTML = config.preset_locations
    .map((city) => `<option value="${city}"></option>`)
    .join("");
  locationInput.value = config.preset_locations[0] || "";

  categoryId.innerHTML = config.categories
    .map((cat) => `<option value="${cat.id}">${cat.label}</option>`)
    .join("");
  categoryId.value = "offices";
  updateCategoryUI();

  if (config.api_configured) {
    apiStatus.className = "status status--ok";
    apiStatus.textContent = "Google Maps API connected";
  } else {
    apiStatus.className = "status status--warn";
    apiStatus.textContent = "API key missing — copy .env.example to .env and add your key";
  }
}

function formatRating(lead) {
  if (lead.rating == null) return "—";
  const count = lead.review_count != null ? ` (${lead.review_count})` : "";
  return `${lead.rating}★${count}`;
}

function formatStatus(status) {
  if (!status) return '<span class="badge">Unknown</span>';
  const normalized = status.replace("BUSINESS_STATUS_", "").toLowerCase();
  const cls = normalized.includes("operational") ? "badge--open" : "badge--closed";
  return `<span class="badge ${cls}">${normalized.replaceAll("_", " ")}</span>`;
}

function truncate(text, max = 70) {
  if (!text) return "—";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function renderLeads(data) {
  state.leads = data.leads || [];
  state.lastSearch = data;

  const hasLeads = state.leads.length > 0;
  emptyState.hidden = hasLeads;
  statsBar.hidden = !hasLeads;
  tableWrap.hidden = !hasLeads;

  exportCsvBtn.disabled = !hasLeads;
  exportJsonBtn.disabled = !hasLeads;
  copyBtn.disabled = !hasLeads;

  if (!hasLeads) {
    resultsTitle.textContent = "No leads found";
    resultsMeta.textContent = `No results for "${data.query_used}" in ${data.location_used}. Try a wider radius or different category.`;
    leadsBody.innerHTML = "";
    return;
  }

  resultsTitle.textContent = `${data.total} Leads Generated`;
  resultsMeta.textContent = `"${data.query_used}" near ${data.location_used}`;

  $("statTotal").textContent = String(data.total);
  $("statPhone").textContent = String(state.leads.filter((lead) => lead.phone).length);
  $("statWebsite").textContent = String(state.leads.filter((lead) => lead.website).length);
  $("statQuery").textContent = data.query_used;

  leadsBody.innerHTML = state.leads
    .map((lead, index) => {
      const website = lead.website
        ? `<a href="${lead.website}" target="_blank" rel="noopener">${truncate(lead.website.replace(/^https?:\/\//, ""), 28)}</a>`
        : "—";

      return `
        <tr>
          <td>${index + 1}</td>
          <td>
            <div class="lead-name">${lead.business_name || "—"}</div>
            <div class="lead-sub">${lead.city || ""}${lead.state ? `, ${lead.state}` : ""}</div>
          </td>
          <td>${lead.category || "—"}</td>
          <td>${lead.phone ? `<a href="tel:${lead.phone}">${lead.phone}</a>` : "—"}</td>
          <td>${website}</td>
          <td>${truncate(lead.address, 55)}</td>
          <td>${formatRating(lead)}</td>
          <td>${formatStatus(lead.business_status)}</td>
          <td>
            <button type="button" class="link-btn" data-index="${index}">View</button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function leadToText(lead) {
  return [
    `Business: ${lead.business_name || ""}`,
    `Category: ${lead.category || ""}`,
    `Phone: ${lead.phone || ""}`,
    `Website: ${lead.website || ""}`,
    `Address: ${lead.address || ""}`,
    `City: ${lead.city || ""}`,
    `State: ${lead.state || ""}`,
    `Postal Code: ${lead.postal_code || ""}`,
    `Country: ${lead.country || ""}`,
    `Rating: ${lead.rating ?? ""} (${lead.review_count ?? 0} reviews)`,
    `Status: ${lead.business_status || ""}`,
    `Hours: ${lead.opening_hours || ""}`,
    `Google Maps: ${lead.google_maps_url || ""}`,
    `Place ID: ${lead.place_id || ""}`,
  ].join("\n");
}

function openLeadModal(lead) {
  state.selectedLead = lead;
  modalTitle.textContent = lead.business_name || "Lead Details";
  modalSubtitle.textContent = lead.category || lead.types || "";

  const fields = [
    ["Phone", lead.phone ? `<a href="tel:${lead.phone}">${lead.phone}</a>` : "—"],
    ["International Phone", lead.international_phone || "—"],
    ["Website", lead.website ? `<a href="${lead.website}" target="_blank" rel="noopener">${lead.website}</a>` : "—"],
    ["Email", lead.email || "Not available from Google Maps"],
    ["Address", lead.address || "—"],
    ["City", lead.city || "—"],
    ["State", lead.state || "—"],
    ["Postal Code", lead.postal_code || "—"],
    ["Country", lead.country || "—"],
    ["Rating", formatRating(lead)],
    ["Status", lead.business_status?.replace("BUSINESS_STATUS_", "").replaceAll("_", " ") || "—"],
    ["Opening Hours", lead.opening_hours || "—"],
    ["Latitude", lead.latitude ?? "—"],
    ["Longitude", lead.longitude ?? "—"],
    ["Place ID", lead.place_id || "—"],
    ["All Types", lead.types || "—"],
    ["Description", lead.description || "—"],
  ];

  modalBody.innerHTML = fields
    .map(([label, value], index) => {
      const full = label === "Opening Hours" || label === "Address" || label === "Description" || label === "All Types";
      return `
        <div class="detail${full ? " detail--full" : ""}">
          <span>${label}</span>
          <strong>${value}</strong>
        </div>
      `;
    })
    .join("");

  modalMapsBtn.onclick = () => {
    if (lead.google_maps_url) window.open(lead.google_maps_url, "_blank", "noopener");
  };

  modalCopyBtn.onclick = async () => {
    await navigator.clipboard.writeText(leadToText(lead));
    showAlert("Lead details copied to clipboard.", "success");
  };

  leadModal.showModal();
}

async function fetchConfig() {
  const response = await fetch("/api/config");
  if (!response.ok) throw new Error("Failed to load app configuration.");
  return response.json();
}

async function searchLeads() {
  hideAlert();
  setLoading(true);

  try {
    const response = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(getFormPayload()),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Search failed.");
    }

    renderLeads(data);
    showAlert(`Generated ${data.total} leads successfully.`, "success");
  } catch (error) {
    showAlert(error.message || "Something went wrong while generating leads.");
    renderLeads({ leads: [], total: 0, query_used: "", location_used: "" });
  } finally {
    setLoading(false);
  }
}

async function exportLeads(format) {
  if (!state.leads.length) return;

  const endpoint = format === "csv" ? "/api/export/csv" : "/api/export/json";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(getFormPayload()),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    showAlert(data.detail || `Export to ${format.toUpperCase()} failed.`);
    return;
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const locationSlug = locationInput.value.trim().replace(/[^\w]+/g, "-").slice(0, 30);
  link.href = url;
  link.download = `it-leads-${locationSlug}.${format}`;
  link.click();
  URL.revokeObjectURL(url);
  showAlert(`Exported ${state.leads.length} leads as ${format.toUpperCase()}.`, "success");
}

async function copyAllLeads() {
  if (!state.leads.length) return;
  const text = state.leads.map(leadToText).join("\n\n---\n\n");
  await navigator.clipboard.writeText(text);
  showAlert(`Copied ${state.leads.length} leads to clipboard.`, "success");
}

radiusKm.addEventListener("input", () => {
  radiusLabel.textContent = `${radiusKm.value} km`;
});

maxResults.addEventListener("input", () => {
  maxResultsLabel.textContent = maxResults.value;
});

categoryId.addEventListener("change", updateCategoryUI);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  searchLeads();
});

leadsBody.addEventListener("click", (event) => {
  const button = event.target.closest("[data-index]");
  if (!button) return;
  const lead = state.leads[Number(button.dataset.index)];
  if (lead) openLeadModal(lead);
});

exportCsvBtn.addEventListener("click", () => exportLeads("csv"));
exportJsonBtn.addEventListener("click", () => exportLeads("json"));
copyBtn.addEventListener("click", copyAllLeads);

fetchConfig()
  .then(populateConfig)
  .catch((error) => {
    apiStatus.className = "status status--error";
    apiStatus.textContent = "Could not load app";
    showAlert(error.message);
  });
