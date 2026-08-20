const HISTORY_KEY = "it-leads-download-history";
const DEFAULT_FORMAT = "csv";
const DEFAULT_COLUMNS = [
  "business_name",
  "category",
  "phone",
  "website",
  "email",
  "address",
  "city",
  "state",
  "postal_code",
  "country",
  "rating",
  "review_count",
  "business_status",
  "opening_hours",
  "google_maps_url",
];

const state = {
  config: null,
  leads: [],
  lastSearch: null,
  selectedLead: null,
  downloadFormat: DEFAULT_FORMAT,
  selectedColumns: [...DEFAULT_COLUMNS],
  downloadHistory: [],
  activeRegion: "worldwide",
  allCountries: [],
  autocompleteTimer: null,
};

const $ = (id) => document.getElementById(id);

const form = $("searchForm");
const countryCode = $("countryCode");
const countrySearch = $("countrySearch");
const locationInput = $("location");
const placeIdInput = $("placeId");
const locationSuggestions = $("locationSuggestions");
const regionTabs = $("regionTabs");
const presetLocationGrid = $("presetLocationGrid");
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
const downloadBtn = $("downloadBtn");
const copyBtn = $("copyBtn");
const leadModal = $("leadModal");
const modalTitle = $("modalTitle");
const modalSubtitle = $("modalSubtitle");
const modalBody = $("modalBody");
const modalMapsBtn = $("modalMapsBtn");
const modalCopyBtn = $("modalCopyBtn");
const modalDownloadBtn = $("modalDownloadBtn");
const downloadModal = $("downloadModal");
const downloadSubtitle = $("downloadSubtitle");
const formatGrid = $("formatGrid");
const downloadFilename = $("downloadFilename");
const downloadPreview = $("downloadPreview");
const columnGrid = $("columnGrid");
const downloadLeadCount = $("downloadLeadCount");
const downloadPhoneCount = $("downloadPhoneCount");
const downloadWebsiteCount = $("downloadWebsiteCount");
const confirmDownloadBtn = $("confirmDownloadBtn");
const downloadCancelBtn = $("downloadCancelBtn");
const selectAllColumnsBtn = $("selectAllColumnsBtn");
const clearColumnsBtn = $("clearColumnsBtn");
const downloadHistorySection = $("downloadHistory");
const downloadHistoryList = $("downloadHistoryList");
const clearHistoryBtn = $("clearHistoryBtn");

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

function setDownloadLoading(isLoading) {
  confirmDownloadBtn.disabled = isLoading;
  confirmDownloadBtn.querySelector(".btn__text").hidden = isLoading;
  confirmDownloadBtn.querySelector(".btn__loader").hidden = !isLoading;
}

function getFormPayload() {
  return {
    category_id: categoryId.value,
    custom_query: customQuery.value.trim(),
    location: locationInput.value.trim(),
    country_code: countryCode.value,
    place_id: placeIdInput.value.trim(),
    radius_km: Number(radiusKm.value),
    max_results: Number(maxResults.value),
  };
}

function clearPlaceSelection() {
  placeIdInput.value = "";
}

function renderCountryOptions(filter = "") {
  const query = filter.trim().toLowerCase();
  const countries = state.allCountries.filter((country) =>
    !query || country.name.toLowerCase().includes(query) || country.code.toLowerCase().includes(query)
  );

  const selected = countryCode.value;
  countryCode.innerHTML = countries
    .map(
      (country) =>
        `<option value="${country.code}"${country.code === selected ? " selected" : ""}>${country.name}</option>`
    )
    .join("");

  if (!countries.some((country) => country.code === selected) && countries.length) {
    countryCode.value = countries[0].code;
  }
}

function renderRegionTabs() {
  const regions = state.config?.regions || [];
  regionTabs.innerHTML = regions
    .map(
      (region) => `
        <button
          type="button"
          class="region-tab${state.activeRegion === region.id ? " region-tab--active" : ""}"
          data-region="${region.id}"
        >
          ${region.label}
        </button>
      `
    )
    .join("");
  renderPresetLocations();
}

function renderPresetLocations() {
  const presets = state.config?.preset_locations?.[state.activeRegion] || [];
  presetLocationGrid.innerHTML = presets
    .map((city) => `<button type="button" class="preset-chip" data-location="${city}">${city}</button>`)
    .join("");
}

function hideLocationSuggestions() {
  locationSuggestions.hidden = true;
  locationSuggestions.innerHTML = "";
}

function showLocationSuggestions(items) {
  if (!items.length) {
    hideLocationSuggestions();
    return;
  }

  locationSuggestions.innerHTML = items
    .map(
      (item, index) => `
        <li>
          <button type="button" data-suggestion-index="${index}">
            <span class="suggestion-main">${item.main_text || item.label}</span>
            ${item.secondary_text ? `<span class="suggestion-sub">${item.secondary_text}</span>` : ""}
          </button>
        </li>
      `
    )
    .join("");
  locationSuggestions.hidden = false;
  state.locationSuggestions = items;
}

async function fetchLocationSuggestions(query) {
  if (query.trim().length < 2) {
    hideLocationSuggestions();
    return;
  }

  const params = new URLSearchParams({
    query: query.trim(),
    country_code: countryCode.value || "",
  });

  try {
    const response = await fetch(`/api/locations/autocomplete?${params.toString()}`);
    const data = await response.json();
    if (!response.ok) {
      hideLocationSuggestions();
      return;
    }
    showLocationSuggestions(data.suggestions || []);
  } catch {
    hideLocationSuggestions();
  }
}

function scheduleLocationAutocomplete() {
  clearPlaceSelection();
  clearTimeout(state.autocompleteTimer);
  state.autocompleteTimer = setTimeout(() => {
    fetchLocationSuggestions(locationInput.value);
  }, 280);
}

function selectLocationSuggestion(item) {
  locationInput.value = item.label;
  placeIdInput.value = item.place_id || "";
  hideLocationSuggestions();
}

function selectPresetLocation(city) {
  locationInput.value = city;
  clearPlaceSelection();
  hideLocationSuggestions();
}

function getCategoryLabel() {
  return state.config?.categories?.find((item) => item.id === categoryId.value)?.label || "";
}

function slugify(value, maxLen = 40) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, maxLen) || "leads"
  );
}

function buildAutoFilename(formatId) {
  const extension = state.config?.download_formats?.find((item) => item.id === formatId)?.extension || formatId;
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const location = slugify(locationInput.value.trim());
  const category = slugify(getCategoryLabel());
  return `it-leads-${location}-${category}-${date}.${extension}`;
}

function updateDownloadPreview() {
  const custom = downloadFilename.value.trim();
  downloadPreview.textContent = custom
    ? `Will save as: ${custom}${custom.includes(".") ? "" : `.${state.downloadFormat === "xlsx" ? "xlsx" : state.downloadFormat}`}`
    : `Will save as: ${buildAutoFilename(state.downloadFormat)}`;
}

function loadDownloadHistory() {
  try {
    state.downloadHistory = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    state.downloadHistory = [];
  }
  renderDownloadHistory();
}

function saveDownloadHistory() {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(state.downloadHistory.slice(0, 10)));
  renderDownloadHistory();
}

function addDownloadHistory(entry) {
  state.downloadHistory.unshift(entry);
  saveDownloadHistory();
}

function renderDownloadHistory() {
  const hasHistory = state.downloadHistory.length > 0;
  downloadHistorySection.hidden = !hasHistory;

  if (!hasHistory) {
    downloadHistoryList.innerHTML = "";
    return;
  }

  downloadHistoryList.innerHTML = state.downloadHistory
    .map(
      (item) => `
        <li class="download-history__item">
          <div>
            <strong>${item.filename}</strong>
            <div class="download-history__meta">
              ${item.count} leads · ${item.format.toUpperCase()} · ${item.location || "Unknown location"}
            </div>
          </div>
          <span class="download-history__meta">${new Date(item.timestamp).toLocaleString()}</span>
        </li>
      `
    )
    .join("");
}

function updateCategoryUI() {
  const selected = state.config?.categories?.find((item) => item.id === categoryId.value);
  categoryHint.textContent = selected?.description || "";
  customQueryField.hidden = categoryId.value !== "custom";
}

function renderFormatGrid() {
  const formats = state.config?.download_formats || [];
  formatGrid.innerHTML = formats
    .map(
      (format) => `
        <button
          type="button"
          class="format-card${state.downloadFormat === format.id ? " format-card--active" : ""}"
          data-format="${format.id}"
        >
          <strong>${format.label}</strong>
          <span>${format.description}</span>
        </button>
      `
    )
    .join("");
}

function renderColumnGrid() {
  const fields = state.config?.lead_fields || [];
  columnGrid.innerHTML = fields
    .map(
      (field) => `
        <label class="column-option">
          <input
            type="checkbox"
            value="${field.key}"
            ${state.selectedColumns.includes(field.key) ? "checked" : ""}
          />
          ${field.label}
        </label>
      `
    )
    .join("");
}

function updateDownloadModalStats() {
  downloadLeadCount.textContent = String(state.leads.length);
  downloadPhoneCount.textContent = String(state.leads.filter((lead) => lead.phone).length);
  downloadWebsiteCount.textContent = String(state.leads.filter((lead) => lead.website).length);
  downloadSubtitle.textContent = `${state.leads.length} leads ready to download`;
  updateDownloadPreview();
}

function openDownloadModal() {
  if (!state.leads.length) return;
  renderFormatGrid();
  renderColumnGrid();
  updateDownloadModalStats();
  downloadFilename.value = "";
  downloadModal.showModal();
}

function populateConfig(config) {
  state.config = config;
  state.allCountries = config.countries || [];
  state.activeRegion = config.regions?.[0]?.id || "worldwide";

  renderCountryOptions();
  countryCode.value = "";
  countrySearch.value = "";

  const defaultPresets = config.preset_locations?.[state.activeRegion] || [];
  locationInput.value = defaultPresets[0] || "";
  clearPlaceSelection();
  renderRegionTabs();

  categoryId.innerHTML = config.categories
    .map((cat) => `<option value="${cat.id}">${cat.label}</option>`)
    .join("");
  categoryId.value = "offices";
  updateCategoryUI();

  if (config.api_configured) {
    apiStatus.className = "status status--ok";
    apiStatus.textContent = "Google Maps API connected — search any country worldwide";
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

  downloadBtn.disabled = !hasLeads;
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

function triggerBrowserDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function getFilenameFromResponse(response, fallback) {
  const disposition = response.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="([^"]+)"/);
  return match?.[1] || fallback;
}

function getSelectedColumnsFromUI() {
  return [...columnGrid.querySelectorAll('input[type="checkbox"]:checked')].map((input) => input.value);
}

async function downloadLeads({ leads, format, filename = "", columns = state.selectedColumns }) {
  if (!leads.length) {
    showAlert("No leads available to download.");
    return;
  }

  if (!columns.length) {
    showAlert("Select at least one column to include in the download.");
    return;
  }

  setDownloadLoading(true);

  try {
    const payload = {
      format,
      leads,
      filename,
      location: locationInput.value.trim(),
      category: getCategoryLabel(),
      query_used: state.lastSearch?.query_used || "",
      columns,
    };

    const response = await fetch("/api/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.detail || "Download failed.");
    }

    const blob = await response.blob();
    const resolvedFilename = getFilenameFromResponse(response, buildAutoFilename(format));
    triggerBrowserDownload(blob, resolvedFilename);

    addDownloadHistory({
      filename: resolvedFilename,
      format,
      count: leads.length,
      location: locationInput.value.trim(),
      timestamp: new Date().toISOString(),
    });

    showAlert(`Downloaded ${leads.length} leads as ${format.toUpperCase()}.`, "success");
    downloadModal.close();
  } catch (error) {
    showAlert(error.message || "Something went wrong while downloading leads.");
  } finally {
    setDownloadLoading(false);
  }
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
    .map(([label, value]) => {
      const full =
        label === "Opening Hours" ||
        label === "Address" ||
        label === "Description" ||
        label === "All Types";
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

  modalDownloadBtn.onclick = () => {
    downloadLeads({
      leads: [lead],
      format: "txt",
      filename: slugify(lead.business_name || "lead"),
      columns: DEFAULT_COLUMNS,
    });
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

countrySearch.addEventListener("input", () => {
  renderCountryOptions(countrySearch.value);
});

countryCode.addEventListener("change", () => {
  clearPlaceSelection();
  scheduleLocationAutocomplete();
});

locationInput.addEventListener("input", scheduleLocationAutocomplete);

locationInput.addEventListener("focus", () => {
  if (locationInput.value.trim().length >= 2) {
    scheduleLocationAutocomplete();
  }
});

locationSuggestions.addEventListener("click", (event) => {
  const button = event.target.closest("[data-suggestion-index]");
  if (!button) return;
  const item = state.locationSuggestions?.[Number(button.dataset.suggestionIndex)];
  if (item) selectLocationSuggestion(item);
});

regionTabs.addEventListener("click", (event) => {
  const tab = event.target.closest("[data-region]");
  if (!tab) return;
  state.activeRegion = tab.dataset.region;
  renderRegionTabs();
});

presetLocationGrid.addEventListener("click", (event) => {
  const chip = event.target.closest("[data-location]");
  if (!chip) return;
  selectPresetLocation(chip.dataset.location);
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".location-field")) {
    hideLocationSuggestions();
  }
});

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

downloadBtn.addEventListener("click", openDownloadModal);
copyBtn.addEventListener("click", copyAllLeads);

formatGrid.addEventListener("click", (event) => {
  const card = event.target.closest("[data-format]");
  if (!card) return;
  state.downloadFormat = card.dataset.format;
  renderFormatGrid();
  updateDownloadPreview();
});

downloadFilename.addEventListener("input", updateDownloadPreview);

columnGrid.addEventListener("change", () => {
  state.selectedColumns = getSelectedColumnsFromUI();
});

selectAllColumnsBtn.addEventListener("click", () => {
  columnGrid.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.checked = true;
  });
  state.selectedColumns = getSelectedColumnsFromUI();
});

clearColumnsBtn.addEventListener("click", () => {
  columnGrid.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.checked = false;
  });
  state.selectedColumns = [];
});

confirmDownloadBtn.addEventListener("click", () => {
  const columns = getSelectedColumnsFromUI();
  downloadLeads({
    leads: state.leads,
    format: state.downloadFormat,
    filename: downloadFilename.value.trim(),
    columns,
  });
});

downloadCancelBtn.addEventListener("click", () => downloadModal.close());

clearHistoryBtn.addEventListener("click", () => {
  state.downloadHistory = [];
  localStorage.removeItem(HISTORY_KEY);
  renderDownloadHistory();
});

loadDownloadHistory();

fetchConfig()
  .then(populateConfig)
  .catch((error) => {
    apiStatus.className = "status status--error";
    apiStatus.textContent = "Could not load app";
    showAlert(error.message);
  });
