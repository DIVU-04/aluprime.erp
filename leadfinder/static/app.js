const state = {
  leads: [],
  selectedServices: new Set(),
  config: null,
  filters: { search: "", status: "all" },
  activeLead: null,
  demoRequested: false,
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const elements = {
  apiState: $("#apiState"),
  drawer: $("#searchDrawer"),
  backdrop: $("#drawerBackdrop"),
  form: $("#searchForm"),
  serviceChips: $("#serviceChips"),
  customServices: $("#customServices"),
  locations: $("#locations"),
  combinationCount: $("#combinationCount"),
  runSearch: $("#runSearch"),
  demoButton: $("#demoButton"),
  leadRows: $("#leadRows"),
  emptyState: $("#emptyState"),
  resultCount: $("#resultCount"),
  search: $("#leadSearch"),
  status: $("#statusFilter"),
  dialog: $("#leadDialog"),
  detailContent: $("#detailContent"),
  toast: $("#toast"),
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeUrl(value) {
  if (!value) return "#";
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : "#";
  } catch {
    return "#";
  }
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const payload = await response.json();
      if (typeof payload.detail === "string") message = payload.detail;
      if (Array.isArray(payload.detail)) {
        message = payload.detail.map((item) => item.msg).join(", ");
      }
    } catch {
      // Keep the fallback message when the response is not JSON.
    }
    throw new Error(message);
  }
  return response.json();
}

function showToast(message, type = "success") {
  elements.toast.textContent = message;
  elements.toast.classList.toggle("error", type === "error");
  elements.toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => elements.toast.classList.remove("show"), 3600);
}

function openDrawer() {
  elements.drawer.classList.add("open");
  elements.backdrop.classList.add("open");
  elements.drawer.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  window.setTimeout(() => elements.locations.focus(), 220);
}

function closeDrawer() {
  elements.drawer.classList.remove("open");
  elements.backdrop.classList.remove("open");
  elements.drawer.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function splitValues(value, separator = /[,\n]/) {
  return [...new Set(value.split(separator).map((item) => item.trim()).filter(Boolean))];
}

function selectedQueries() {
  return [
    ...state.selectedServices,
    ...splitValues(elements.customServices.value),
  ].filter((value, index, array) => array.indexOf(value) === index);
}

function updateCombinationCount() {
  const queryCount = selectedQueries().length;
  const locationCount = splitValues(elements.locations.value, /\n/).length;
  const count = queryCount * locationCount;
  elements.combinationCount.textContent =
    `${count} service/location combination${count === 1 ? "" : "s"}`;
  elements.combinationCount.style.color = count > 40 ? "#d94b5b" : "";
}

function renderServiceChips(groups) {
  const fragment = document.createDocumentFragment();
  groups.flatMap((group) => group.items).forEach((service) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip";
    button.textContent = service;
    button.addEventListener("click", () => {
      if (state.selectedServices.has(service)) {
        state.selectedServices.delete(service);
        button.classList.remove("selected");
      } else {
        state.selectedServices.add(service);
        button.classList.add("selected");
      }
      updateCombinationCount();
    });
    fragment.append(button);
  });
  elements.serviceChips.replaceChildren(fragment);
}

function initials(name) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function statusOptions(current) {
  const labels = {
    new: "New",
    contacted: "Contacted",
    qualified: "Qualified",
    won: "Won",
    lost: "Lost",
    do_not_contact: "Do not contact",
  };
  return Object.entries(labels)
    .map(([value, label]) => `<option value="${value}" ${value === current ? "selected" : ""}>${label}</option>`)
    .join("");
}

function renderLeads() {
  elements.emptyState.classList.toggle("hidden", state.leads.length > 0);
  elements.resultCount.textContent =
    `${state.leads.length} lead${state.leads.length === 1 ? "" : "s"} shown`;

  elements.leadRows.innerHTML = state.leads
    .map(
      (lead) => `
        <tr data-place-id="${escapeHtml(lead.place_id)}">
          <td>
            <div class="business-cell">
              <span class="business-avatar">${escapeHtml(initials(lead.name))}</span>
              <div>
                <strong>${escapeHtml(lead.name)}</strong>
                <span>${escapeHtml(lead.category || "Local business")}</span>
              </div>
            </div>
          </td>
          <td>
            <div class="contact-cell">
              <strong>${escapeHtml(lead.phone || lead.international_phone || "No phone listed")}</strong>
              <span>${escapeHtml(lead.website ? new URL(safeUrl(lead.website)).hostname : "No website listed")}</span>
            </div>
          </td>
          <td>
            <div class="market-cell">
              <strong>${escapeHtml(lead.source_location || "—")}</strong>
              <span title="${escapeHtml(lead.address)}">${escapeHtml(lead.address || "No address")}</span>
            </div>
          </td>
          <td>
            <span class="rating"><i>★</i> ${escapeHtml(lead.rating || "—")}</span>
            <span class="review-count"> (${escapeHtml(lead.review_count)})</span>
          </td>
          <td>
            <div class="score">
              ${lead.score}
              <span class="score-track"><i style="width:${lead.score}%"></i></span>
            </div>
          </td>
          <td>
            <select class="status-select" data-status aria-label="Status for ${escapeHtml(lead.name)}">
              ${statusOptions(lead.status)}
            </select>
          </td>
          <td>
            <button class="row-action" type="button" aria-label="View ${escapeHtml(lead.name)}">
              <svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          </td>
        </tr>
      `,
    )
    .join("");
}

function updateMetrics(stats) {
  $("#totalLeads").textContent = stats.total;
  $("#newLeads").textContent = stats.new_count;
  $("#qualifiedLeads").textContent = stats.qualified_count;
  $("#phoneLeads").textContent = stats.with_phone;
}

async function loadLeads() {
  const params = new URLSearchParams({
    status: state.filters.status,
    limit: "500",
  });
  if (state.filters.search) params.set("search", state.filters.search);
  try {
    const payload = await api(`/api/leads?${params}`);
    state.leads = payload.items;
    updateMetrics(payload.stats);
    renderLeads();
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function updateLead(placeId, patch, quiet = false) {
  try {
    const lead = await api(`/api/leads/${encodeURIComponent(placeId)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    const index = state.leads.findIndex((item) => item.place_id === placeId);
    if (index >= 0) state.leads[index] = lead;
    if (!quiet) showToast("Lead updated");
    return lead;
  } catch (error) {
    showToast(error.message, "error");
    throw error;
  }
}

function detailItem(label, value, full = false, link = null) {
  const content = link
    ? `<a href="${escapeHtml(link)}" target="_blank" rel="noopener">${escapeHtml(value || "—")}</a>`
    : `<strong>${escapeHtml(value || "—")}</strong>`;
  return `<div class="detail-item ${full ? "full" : ""}"><span>${label}</span>${content}</div>`;
}

function openLeadDialog(lead) {
  state.activeLead = lead;
  $("#detailName").textContent = lead.name;
  const hours = lead.opening_hours?.weekdayDescriptions?.join(" · ") || "Not listed";
  const opportunities = lead.opportunities.length
    ? lead.opportunities.map((item) => `<i>${escapeHtml(item)}</i>`).join("")
    : "<i>No automatic gaps detected</i>";
  elements.detailContent.innerHTML = `
    <div class="detail-grid">
      ${detailItem("Category", lead.category)}
      ${detailItem("Lead score", `${lead.score}/100`)}
      ${detailItem("Phone", lead.phone || lead.international_phone)}
      ${detailItem("Website", lead.website ? new URL(safeUrl(lead.website)).hostname : "Not listed", false, safeUrl(lead.website))}
      ${detailItem("Rating", lead.rating ? `${lead.rating} from ${lead.review_count} reviews` : "Not rated")}
      ${detailItem("Business status", lead.business_status?.replaceAll("_", " "))}
      ${detailItem("Address", lead.address, true)}
      ${detailItem("Opening hours", hours, true)}
      <div class="detail-item full">
        <span>IT service opportunities</span>
        <div class="opportunity-list">${opportunities}</div>
      </div>
      <div class="detail-item full">
        <span>Sales notes</span>
        <textarea class="notes-field" id="detailNotes" rows="3" placeholder="Add discovery notes, decision maker, next step…">${escapeHtml(lead.notes)}</textarea>
      </div>
      ${detailItem("Source search", `${lead.source_query} in ${lead.source_location}`, true)}
      ${detailItem("Google Place ID", lead.place_id, true)}
    </div>
  `;
  $("#mapsLink").href = safeUrl(lead.maps_url);
  const phone = lead.international_phone || lead.phone;
  const contactLink = $("#contactLink");
  if (phone) {
    contactLink.href = `tel:${phone.replace(/[^\d+]/g, "")}`;
    contactLink.textContent = "Call business";
  } else if (lead.website) {
    contactLink.href = safeUrl(lead.website);
    contactLink.target = "_blank";
    contactLink.rel = "noopener";
    contactLink.textContent = "Visit website";
  } else {
    contactLink.href = safeUrl(lead.maps_url);
    contactLink.target = "_blank";
    contactLink.rel = "noopener";
    contactLink.textContent = "View on Maps";
  }
  elements.dialog.showModal();
}

async function closeLeadDialog() {
  if (state.activeLead) {
    const notes = $("#detailNotes")?.value;
    if (notes !== undefined && notes !== state.activeLead.notes) {
      state.activeLead = await updateLead(state.activeLead.place_id, { notes }, true);
    }
  }
  elements.dialog.close();
  state.activeLead = null;
}

function searchPayload(demo) {
  return {
    queries: selectedQueries(),
    locations: splitValues(elements.locations.value, /\n/),
    max_results_per_search: Number($("#maxResults").value),
    min_rating: Number($("#minRating").value),
    min_reviews: Number($("#minReviews").value),
    require_phone: $("#requirePhone").checked,
    require_website: $("#requireWebsite").checked,
    exclude_keywords: splitValues($("#excludeKeywords").value),
    demo,
  };
}

async function runSearch(demo = false) {
  const payload = searchPayload(demo);
  if (!payload.queries.length) {
    showToast("Select at least one service type.", "error");
    return;
  }
  if (!payload.locations.length) {
    showToast("Add at least one location.", "error");
    elements.locations.focus();
    return;
  }
  if (payload.queries.length * payload.locations.length > 40) {
    showToast("Reduce the search to 40 service/location combinations.", "error");
    return;
  }

  const buttonLabel = $("span", elements.runSearch);
  elements.runSearch.disabled = true;
  elements.demoButton.disabled = true;
  buttonLabel.textContent = demo ? "Loading demo…" : "Searching Google…";
  try {
    const result = await api("/api/search", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    closeDrawer();
    await loadLeads();
    showToast(
      `${result.discovered} lead${result.discovered === 1 ? "" : "s"} found and saved${demo ? " as demo data" : ""}.`,
    );
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    elements.runSearch.disabled = false;
    elements.demoButton.disabled = false;
    buttonLabel.textContent = "Generate leads";
  }
}

async function initialise() {
  try {
    state.config = await api("/api/config");
    renderServiceChips(state.config.service_groups);
    elements.apiState.classList.toggle("ready", state.config.api_key_configured);
    elements.apiState.lastChild.textContent = state.config.api_key_configured
      ? " API connected"
      : " Demo mode";
  } catch (error) {
    showToast(error.message, "error");
  }
  await loadLeads();
}

$$("[data-open-search]").forEach((button) => button.addEventListener("click", openDrawer));
$("#closeDrawer").addEventListener("click", closeDrawer);
elements.backdrop.addEventListener("click", closeDrawer);
elements.customServices.addEventListener("input", updateCombinationCount);
elements.locations.addEventListener("input", updateCombinationCount);
elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  runSearch(false);
});
elements.demoButton.addEventListener("click", () => runSearch(true));

elements.leadRows.addEventListener("click", (event) => {
  const row = event.target.closest("tr");
  if (!row || event.target.closest("[data-status]")) return;
  const lead = state.leads.find((item) => item.place_id === row.dataset.placeId);
  if (lead) openLeadDialog(lead);
});

elements.leadRows.addEventListener("change", async (event) => {
  if (!event.target.matches("[data-status]")) return;
  event.stopPropagation();
  await updateLead(event.target.closest("tr").dataset.placeId, { status: event.target.value });
  await loadLeads();
});

let searchTimer;
elements.search.addEventListener("input", () => {
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => {
    state.filters.search = elements.search.value.trim();
    loadLeads();
  }, 250);
});

elements.status.addEventListener("change", () => {
  state.filters.status = elements.status.value;
  loadLeads();
});

$("#exportButton").addEventListener("click", () => {
  const params = new URLSearchParams({ status: state.filters.status });
  if (state.filters.search) params.set("search", state.filters.search);
  window.location.href = `/api/export.csv?${params}`;
});

$$("[data-close-dialog]").forEach((button) => button.addEventListener("click", closeLeadDialog));
elements.dialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeLeadDialog();
});

$(".mobile-menu").addEventListener("click", () => $(".sidebar").classList.toggle("open"));

initialise();
