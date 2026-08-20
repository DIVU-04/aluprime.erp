(function () {
  "use strict";

  var LEAD_TYPES = [
    "Restaurants",
    "Hotels",
    "Hospitals",
    "Clinics",
    "Dentists",
    "Schools",
    "Colleges",
    "Coaching Centers",
    "Law Firms",
    "Chartered Accountants",
    "Real Estate Agencies",
    "Construction Companies",
    "Gyms",
    "Salons",
    "Spas",
    "Retail Stores",
    "Fashion Boutiques",
    "Automobile Dealers",
    "Repair Shops",
    "Travel Agencies",
    "Event Planners",
    "Logistics Companies",
    "Manufacturers",
    "Exporters",
    "Startups",
    "Corporate Offices",
    "Ecommerce Sellers",
    "Marketing Agencies",
    "Photography Studios",
    "Training Institutes",
  ];

  var state = {
    leads: [],
    running: false,
    stopRequested: false,
  };

  var els = {
    form: document.getElementById("leadForm"),
    apiKey: document.getElementById("apiKey"),
    serviceKeyword: document.getElementById("serviceKeyword"),
    radiusKm: document.getElementById("radiusKm"),
    maxPerQuery: document.getElementById("maxPerQuery"),
    locations: document.getElementById("locations"),
    leadTypeList: document.getElementById("leadTypeList"),
    customLeadTypes: document.getElementById("customLeadTypes"),
    openNowOnly: document.getElementById("openNowOnly"),
    statusText: document.getElementById("statusText"),
    metrics: document.getElementById("metrics"),
    generateBtn: document.getElementById("generateBtn"),
    leadRows: document.getElementById("leadRows"),
    exportCsv: document.getElementById("exportCsv"),
    exportJson: document.getElementById("exportJson"),
    copyJson: document.getElementById("copyJson"),
    selectAllTypes: document.getElementById("selectAllTypes"),
    clearAllTypes: document.getElementById("clearAllTypes"),
  };

  renderLeadTypeOptions();
  attachEvents();

  function attachEvents() {
    els.form.addEventListener("submit", onSubmit);

    els.selectAllTypes.addEventListener("click", function () {
      setAllLeadTypes(true);
    });

    els.clearAllTypes.addEventListener("click", function () {
      setAllLeadTypes(false);
    });

    els.exportCsv.addEventListener("click", function () {
      if (!state.leads.length) return;
      downloadFile("leads.csv", toCsv(state.leads), "text/csv;charset=utf-8;");
    });

    els.exportJson.addEventListener("click", function () {
      if (!state.leads.length) return;
      downloadFile(
        "leads.json",
        JSON.stringify(state.leads, null, 2),
        "application/json;charset=utf-8;"
      );
    });

    els.copyJson.addEventListener("click", function () {
      if (!state.leads.length || !navigator.clipboard) return;
      navigator.clipboard.writeText(JSON.stringify(state.leads, null, 2)).then(
        function () {
          setStatus("Lead JSON copied to clipboard.", "ok");
        },
        function () {
          setStatus("Could not copy automatically. Use Export JSON.", "warn");
        }
      );
    });
  }

  function renderLeadTypeOptions() {
    var markup = LEAD_TYPES.map(function (type, index) {
      var id = "leadType_" + index;
      return (
        '<label class="chip" for="' +
        id +
        '">' +
        '<input id="' +
        id +
        '" type="checkbox" data-lead-type value="' +
        escapeHtml(type) +
        '" checked />' +
        "<span>" +
        escapeHtml(type) +
        "</span>" +
        "</label>"
      );
    }).join("");
    els.leadTypeList.innerHTML = markup;
  }

  function setAllLeadTypes(value) {
    var checkboxes = els.leadTypeList.querySelectorAll("[data-lead-type]");
    checkboxes.forEach(function (cb) {
      cb.checked = value;
    });
  }

  function collectLeadTypes() {
    var selected = Array.prototype.map
      .call(els.leadTypeList.querySelectorAll("[data-lead-type]:checked"), function (el) {
        return el.value.trim();
      })
      .filter(Boolean);

    var custom = (els.customLeadTypes.value || "")
      .split(",")
      .map(function (item) {
        return item.trim();
      })
      .filter(Boolean);

    return unique(selected.concat(custom));
  }

  function collectLocations() {
    return unique(
      (els.locations.value || "")
        .split("\n")
        .map(function (line) {
          return line.trim();
        })
        .filter(Boolean)
    );
  }

  async function onSubmit(event) {
    event.preventDefault();

    if (state.running) {
      state.stopRequested = true;
      setStatus("Stopping after current request...", "warn");
      return;
    }

    var apiKey = (els.apiKey.value || "").trim();
    var serviceKeyword = (els.serviceKeyword.value || "").trim();
    var leadTypes = collectLeadTypes();
    var locations = collectLocations();
    var radiusMeters = Number(els.radiusKm.value) * 1000;
    var maxPerQuery = Number(els.maxPerQuery.value);
    var openNowOnly = Boolean(els.openNowOnly.checked);

    if (!apiKey) {
      setStatus("Google API key is required.", "error");
      return;
    }
    if (!serviceKeyword) {
      setStatus("Core service keyword is required.", "error");
      return;
    }
    if (!leadTypes.length) {
      setStatus("Select at least one lead type.", "error");
      return;
    }
    if (!locations.length) {
      setStatus("Enter at least one location.", "error");
      return;
    }

    var totalQueries = leadTypes.length * locations.length;
    if (totalQueries > 80) {
      setStatus(
        "Too many combinations selected (" +
          totalQueries +
          "). Reduce lead types or locations for stable results.",
        "warn"
      );
      return;
    }

    clearLeads();
    setRunning(true);
    setStatus("Loading Google Maps libraries...", "warn");

    try {
      await loadGoogleMaps(apiKey);
      var service = createPlacesService();
      var geocoder = new google.maps.Geocoder();
      var placeIndex = new Map();
      var completedQueries = 0;

      for (var li = 0; li < locations.length; li++) {
        if (state.stopRequested) break;
        var locationText = locations[li];
        setStatus(
          "Geocoding location " + (li + 1) + "/" + locations.length + ": " + locationText,
          "warn"
        );

        var geo = await geocodeLocation(geocoder, locationText);
        var latLng = geo.geometry.location;

        for (var ti = 0; ti < leadTypes.length; ti++) {
          if (state.stopRequested) break;
          var leadType = leadTypes[ti];
          completedQueries += 1;
          setStatus(
            "Searching " +
              leadType +
              " in " +
              locationText +
              " (" +
              completedQueries +
              "/" +
              totalQueries +
              ")",
            "warn"
          );

          var queryText = leadType + " " + serviceKeyword + " in " + locationText;

          var searchResults = await textSearchAll(
            service,
            {
              query: queryText,
              location: latLng,
              radius: radiusMeters,
              openNow: openNowOnly,
            },
            maxPerQuery
          );

          searchResults.forEach(function (place) {
            var key = place.place_id;
            if (!key) return;
            if (!placeIndex.has(key)) {
              placeIndex.set(key, {
                placeId: key,
                base: place,
                leadTypes: new Set(),
                locations: new Set(),
              });
            }
            var entry = placeIndex.get(key);
            entry.leadTypes.add(leadType);
            entry.locations.add(locationText);
          });
        }
      }

      var collected = Array.from(placeIndex.values());
      if (!collected.length) {
        setStatus("No leads found with current filters. Try broader radius or types.", "warn");
        updateMetrics(0, totalQueries, 0);
        return;
      }

      setStatus("Fetching detailed business data for " + collected.length + " leads...", "warn");
      var leads = [];

      for (var i = 0; i < collected.length; i++) {
        if (state.stopRequested) break;
        var item = collected[i];
        setStatus(
          "Fetching details (" + (i + 1) + "/" + collected.length + "): " + item.base.name,
          "warn"
        );

        var details = await getPlaceDetails(service, item.placeId);
        var lead = normalizeLead(item, details);
        leads.push(lead);
      }

      leads.sort(function (a, b) {
        return (b.rating || 0) - (a.rating || 0);
      });

      state.leads = leads;
      renderLeads(leads);
      updateMetrics(leads.length, totalQueries, collected.length);
      setStatus(
        leads.length + " detailed leads generated successfully. Export CSV or JSON.",
        "ok"
      );
      setExportState(leads.length > 0);
    } catch (error) {
      console.error(error);
      setStatus(error.message || "Unexpected error while generating leads.", "error");
      setExportState(false);
    } finally {
      setRunning(false);
    }
  }

  function normalizeLead(indexEntry, details) {
    var result = details || {};
    var types = result.types || (indexEntry.base && indexEntry.base.types) || [];
    var position =
      (result.geometry &&
        result.geometry.location && {
          lat: result.geometry.location.lat(),
          lng: result.geometry.location.lng(),
        }) ||
      null;

    return {
      businessName: result.name || indexEntry.base.name || "",
      leadTypes: Array.from(indexEntry.leadTypes),
      searchedLocations: Array.from(indexEntry.locations),
      category: types.join(", "),
      address: result.formatted_address || indexEntry.base.formatted_address || "",
      phone:
        result.international_phone_number ||
        result.formatted_phone_number ||
        indexEntry.base.formatted_phone_number ||
        "",
      website: result.website || "",
      rating: result.rating || indexEntry.base.rating || null,
      reviewCount: result.user_ratings_total || indexEntry.base.user_ratings_total || null,
      status: result.business_status || indexEntry.base.business_status || "",
      mapsUrl:
        result.url ||
        (indexEntry.placeId
          ? "https://www.google.com/maps/place/?q=place_id:" + encodeURIComponent(indexEntry.placeId)
          : ""),
      placeId: indexEntry.placeId,
      latitude: position ? position.lat : "",
      longitude: position ? position.lng : "",
      generatedAt: new Date().toISOString(),
    };
  }

  function clearLeads() {
    state.leads = [];
    setExportState(false);
    updateMetrics(0, 0, 0);
    renderLeads([]);
  }

  function setRunning(running) {
    state.running = running;
    if (!running) state.stopRequested = false;
    els.generateBtn.textContent = running ? "Stop" : "Generate Leads";
    els.generateBtn.classList.toggle("btn--danger", running);
  }

  function setStatus(message, kind) {
    els.statusText.textContent = message;
    els.statusText.className = "status" + (kind ? " " + kind : "");
  }

  function updateMetrics(finalLeads, totalQueries, rawUniqueCount) {
    var chips = [];
    chips.push(metric("Detailed Leads", finalLeads || 0));
    chips.push(metric("Unique Places Found", rawUniqueCount || 0));
    chips.push(metric("Query Combinations", totalQueries || 0));
    els.metrics.innerHTML = chips.join("");
  }

  function metric(label, value) {
    return '<span class="metric"><strong>' + value + "</strong> " + label + "</span>";
  }

  function setExportState(enabled) {
    els.exportCsv.disabled = !enabled;
    els.exportJson.disabled = !enabled;
    els.copyJson.disabled = !enabled;
  }

  function renderLeads(leads) {
    if (!leads.length) {
      els.leadRows.innerHTML = '<tr><td colspan="12" class="empty">No leads yet.</td></tr>';
      return;
    }

    els.leadRows.innerHTML = leads
      .map(function (lead, index) {
        return (
          "<tr>" +
          "<td>" +
          (index + 1) +
          "</td>" +
          "<td>" +
          escapeHtml(lead.businessName || "") +
          "</td>" +
          "<td>" +
          escapeHtml((lead.leadTypes || []).join(", ")) +
          "</td>" +
          "<td>" +
          escapeHtml((lead.searchedLocations || []).join(", ")) +
          "</td>" +
          "<td>" +
          escapeHtml(lead.category || "") +
          "</td>" +
          "<td>" +
          escapeHtml(lead.address || "") +
          "</td>" +
          "<td>" +
          escapeHtml(lead.phone || "") +
          "</td>" +
          "<td>" +
          (lead.website
            ? '<a class="link" href="' +
              escapeAttr(lead.website) +
              '" target="_blank" rel="noopener">Visit</a>'
            : "") +
          "</td>" +
          "<td>" +
          escapeHtml(lead.rating != null ? String(lead.rating) : "") +
          "</td>" +
          "<td>" +
          escapeHtml(lead.reviewCount != null ? String(lead.reviewCount) : "") +
          "</td>" +
          "<td>" +
          escapeHtml(lead.status || "") +
          "</td>" +
          "<td>" +
          (lead.mapsUrl
            ? '<a class="link" href="' +
              escapeAttr(lead.mapsUrl) +
              '" target="_blank" rel="noopener">Open</a>'
            : "") +
          "</td>" +
          "</tr>"
        );
      })
      .join("");
  }

  function createPlacesService() {
    var mapContainer = document.getElementById("mapCanvas");
    var map = new google.maps.Map(mapContainer, {
      center: { lat: 20.5937, lng: 78.9629 },
      zoom: 5,
    });
    return new google.maps.places.PlacesService(map);
  }

  function geocodeLocation(geocoder, address) {
    return new Promise(function (resolve, reject) {
      geocoder.geocode({ address: address }, function (results, status) {
        if (status === "OK" && results && results.length) {
          resolve(results[0]);
          return;
        }
        reject(
          new Error(
            "Could not geocode location '" +
              address +
              "'. Google status: " +
              status +
              ". Try more specific location text."
          )
        );
      });
    });
  }

  function textSearchAll(service, request, maxResults) {
    return new Promise(function (resolve, reject) {
      var all = [];
      var retries = 0;
      var maxRetries = 4;

      function handler(results, status, pagination) {
        if (status === "OK" || status === google.maps.places.PlacesServiceStatus.OK) {
          (results || []).forEach(function (result) {
            if (all.length < maxResults) all.push(result);
          });

          if (pagination && pagination.hasNextPage && all.length < maxResults) {
            setTimeout(function () {
              pagination.nextPage();
            }, 1300);
            return;
          }

          resolve(all.slice(0, maxResults));
          return;
        }

        if (
          (status === "OVER_QUERY_LIMIT" ||
            status === google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT) &&
          retries < maxRetries
        ) {
          retries += 1;
          setTimeout(function () {
            service.textSearch(request, handler);
          }, retries * 1400);
          return;
        }

        if (
          status === "ZERO_RESULTS" ||
          status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS
        ) {
          resolve([]);
          return;
        }

        reject(new Error("Lead search failed. Google status: " + status));
      }

      service.textSearch(request, handler);
    });
  }

  function getPlaceDetails(service, placeId) {
    return new Promise(function (resolve, reject) {
      var retries = 0;
      var maxRetries = 4;

      var request = {
        placeId: placeId,
        fields: [
          "name",
          "place_id",
          "formatted_address",
          "formatted_phone_number",
          "international_phone_number",
          "website",
          "rating",
          "user_ratings_total",
          "business_status",
          "types",
          "url",
          "geometry",
        ],
      };

      function run() {
        service.getDetails(request, function (result, status) {
          if (status === "OK" || status === google.maps.places.PlacesServiceStatus.OK) {
            resolve(result || {});
            return;
          }

          if (
            (status === "OVER_QUERY_LIMIT" ||
              status === google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT) &&
            retries < maxRetries
          ) {
            retries += 1;
            setTimeout(run, retries * 1300);
            return;
          }

          if (
            status === "NOT_FOUND" ||
            status === google.maps.places.PlacesServiceStatus.NOT_FOUND
          ) {
            resolve({});
            return;
          }

          reject(
            new Error(
              "Could not fetch details for place " + placeId + ". Google status: " + status
            )
          );
        });
      }

      run();
    });
  }

  function loadGoogleMaps(apiKey) {
    if (
      window.google &&
      window.google.maps &&
      window.google.maps.places &&
      window.google.maps.Geocoder
    ) {
      return Promise.resolve();
    }

    return new Promise(function (resolve, reject) {
      var existing = document.getElementById("google-maps-script");
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener(
          "error",
          function () {
            reject(new Error("Failed to load existing Google Maps script."));
          },
          { once: true }
        );
        return;
      }

      var script = document.createElement("script");
      script.id = "google-maps-script";
      script.src =
        "https://maps.googleapis.com/maps/api/js?key=" +
        encodeURIComponent(apiKey) +
        "&libraries=places";
      script.async = true;
      script.defer = true;
      script.onload = function () {
        resolve();
      };
      script.onerror = function () {
        reject(
          new Error(
            "Google Maps script failed to load. Check API key, billing, and Places API access."
          )
        );
      };
      document.head.appendChild(script);
    });
  }

  function toCsv(rows) {
    var headers = [
      "Business Name",
      "Lead Types",
      "Searched Locations",
      "Category",
      "Address",
      "Phone",
      "Website",
      "Rating",
      "Review Count",
      "Business Status",
      "Google Maps URL",
      "Place ID",
      "Latitude",
      "Longitude",
      "Generated At",
    ];

    var lines = [headers.map(csvValue).join(",")];

    rows.forEach(function (row) {
      lines.push(
        [
          row.businessName || "",
          (row.leadTypes || []).join(" | "),
          (row.searchedLocations || []).join(" | "),
          row.category || "",
          row.address || "",
          row.phone || "",
          row.website || "",
          row.rating != null ? row.rating : "",
          row.reviewCount != null ? row.reviewCount : "",
          row.status || "",
          row.mapsUrl || "",
          row.placeId || "",
          row.latitude != null ? row.latitude : "",
          row.longitude != null ? row.longitude : "",
          row.generatedAt || "",
        ]
          .map(csvValue)
          .join(",")
      );
    });

    return lines.join("\n");
  }

  function csvValue(value) {
    var text = String(value == null ? "" : value).replace(/"/g, '""');
    return '"' + text + '"';
  }

  function downloadFile(filename, content, mimeType) {
    var blob = new Blob([content], { type: mimeType });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function unique(items) {
    return Array.from(new Set(items));
  }

  function escapeHtml(input) {
    return String(input == null ? "" : input)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttr(input) {
    return escapeHtml(input);
  }
})();
