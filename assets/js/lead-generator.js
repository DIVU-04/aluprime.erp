(function () {
  "use strict";

  var FIELD_DEFS = [
    { key: "businessName", label: "Business Name" },
    { key: "primaryType", label: "Primary Type" },
    { key: "address", label: "Address" },
    { key: "phone", label: "Phone Number" },
    { key: "website", label: "Website" },
    { key: "rating", label: "Rating" },
    { key: "reviews", label: "Review Count" },
    { key: "businessStatus", label: "Business Status" },
    { key: "openNow", label: "Open Now" },
    { key: "mapsUrl", label: "Google Maps URL" },
    { key: "latitude", label: "Latitude" },
    { key: "longitude", label: "Longitude" },
    { key: "types", label: "Place Types" },
    { key: "leadTypeQuery", label: "Matched Lead Type" },
    { key: "locationQuery", label: "Matched Location" },
    { key: "searchQuery", label: "Search Query Used" },
  ];

  var PLACES_FIELD_MASK = [
    "places.id",
    "places.displayName",
    "places.primaryType",
    "places.primaryTypeDisplayName",
    "places.formattedAddress",
    "places.shortFormattedAddress",
    "places.nationalPhoneNumber",
    "places.internationalPhoneNumber",
    "places.websiteUri",
    "places.googleMapsUri",
    "places.rating",
    "places.userRatingCount",
    "places.businessStatus",
    "places.regularOpeningHours",
    "places.location",
    "places.types",
    "nextPageToken",
  ].join(",");

  var API_PAGE_SIZE = 20;
  var PAGE_TOKEN_WAIT_MS = 1800;
  var PAGE_TOKEN_RETRY_MS = 2400;
  var MAX_API_CALLS_PER_RUN = 100;

  var state = {
    leads: [],
    columns: FIELD_DEFS.map(function (item) {
      return item.key;
    }),
  };

  var form = document.getElementById("leadForm");
  var generateBtn = document.getElementById("generateBtn");
  var downloadBtn = document.getElementById("downloadCsvBtn");
  var statusText = document.getElementById("statusText");
  var leadCount = document.getElementById("leadCount");
  var resultsTable = document.getElementById("resultsTable");

  function setStatus(message, warn) {
    statusText.textContent = message || "";
    statusText.classList.toggle("warn", Boolean(warn));
  }

  function sleep(ms) {
    return new Promise(function (resolve) {
      window.setTimeout(resolve, ms);
    });
  }

  function parseList(value) {
    if (!value) return [];
    var tokens = value
      .split(/\n|,/)
      .map(function (item) {
        return item.trim();
      })
      .filter(Boolean);
    return Array.from(new Set(tokens));
  }

  function selectedColumns() {
    var wrappers = document.querySelectorAll('#detailFields input[type="checkbox"]');
    var keys = Array.prototype.slice
      .call(wrappers)
      .filter(function (el) {
        return el.checked;
      })
      .map(function (el) {
        return el.value;
      });
    return keys.length ? keys : ["businessName", "address", "mapsUrl"];
  }

  function fieldLabel(key) {
    var found = FIELD_DEFS.find(function (item) {
      return item.key === key;
    });
    return found ? found.label : key;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function placeLink(url) {
    if (!url) return "";
    return '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener">Open</a>';
  }

  function renderResults() {
    var cols = state.columns;
    var header = "<tr>" + cols.map(function (key) {
      return "<th>" + escapeHtml(fieldLabel(key)) + "</th>";
    }).join("") + "</tr>";
    resultsTable.querySelector("thead").innerHTML = header;

    if (!state.leads.length) {
      resultsTable.querySelector("tbody").innerHTML =
        '<tr><td class="empty" colspan="' +
        cols.length +
        '">No leads generated yet.</td></tr>';
      leadCount.textContent = "0 leads";
      downloadBtn.disabled = true;
      return;
    }

    var rows = state.leads
      .map(function (lead) {
        var tds = cols
          .map(function (key) {
            var value = lead[key];
            if (key === "mapsUrl" || key === "website") {
              return "<td>" + placeLink(value) + "</td>";
            }
            return "<td>" + escapeHtml(value) + "</td>";
          })
          .join("");
        return "<tr>" + tds + "</tr>";
      })
      .join("");

    resultsTable.querySelector("tbody").innerHTML = rows;
    leadCount.textContent = state.leads.length + " leads";
    downloadBtn.disabled = false;
  }

  async function geocodeLocation(apiKey, locationText) {
    var url =
      "https://maps.googleapis.com/maps/api/geocode/json?address=" +
      encodeURIComponent(locationText) +
      "&key=" +
      encodeURIComponent(apiKey);
    var response = await fetch(url);
    if (!response.ok) {
      throw new Error("Geocoding API failed with status " + response.status);
    }
    var data = await response.json();
    if (data.status !== "OK" || !data.results || !data.results.length) {
      return null;
    }
    var geo = data.results[0].geometry.location;
    return { lat: geo.lat, lng: geo.lng };
  }

  async function searchPlacesPage(options) {
    var requestBody = {
      textQuery: options.searchQuery,
      maxResultCount: Math.min(API_PAGE_SIZE, options.maxRemaining),
    };

    if (options.pageToken) {
      requestBody.pageToken = options.pageToken;
    }

    if (options.locationBias) {
      requestBody.locationBias = {
        circle: {
          center: {
            latitude: options.locationBias.lat,
            longitude: options.locationBias.lng,
          },
          radius: options.locationBias.radiusMeters,
        },
      };
    }

    var response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": options.apiKey,
        "X-Goog-FieldMask": PLACES_FIELD_MASK,
      },
      body: JSON.stringify(requestBody),
    });

    var payload = await response.json().catch(function () {
      return {};
    });

    if (!response.ok) {
      var message =
        (payload && payload.error && payload.error.message) ||
        "Places API failed with status " + response.status;
      throw new Error(message);
    }

    return payload;
  }

  function normalizePlace(place, leadType, locationText, searchQuery) {
    var phone = place.nationalPhoneNumber || place.internationalPhoneNumber || "";
    var openNow = "";
    if (
      place.regularOpeningHours &&
      typeof place.regularOpeningHours.openNow === "boolean"
    ) {
      openNow = place.regularOpeningHours.openNow ? "Yes" : "No";
    }

    return {
      id: place.id || "",
      businessName: (place.displayName && place.displayName.text) || "",
      primaryType:
        (place.primaryTypeDisplayName && place.primaryTypeDisplayName.text) ||
        place.primaryType ||
        "",
      address: place.formattedAddress || place.shortFormattedAddress || "",
      phone: phone,
      website: place.websiteUri || "",
      rating: place.rating == null ? "" : String(place.rating),
      reviews: place.userRatingCount == null ? "" : String(place.userRatingCount),
      businessStatus: place.businessStatus || "",
      openNow: openNow,
      mapsUrl:
        place.googleMapsUri ||
        (place.id
          ? "https://www.google.com/maps/place/?q=place_id:" +
            encodeURIComponent(place.id)
          : ""),
      latitude:
        place.location && typeof place.location.latitude === "number"
          ? String(place.location.latitude)
          : "",
      longitude:
        place.location && typeof place.location.longitude === "number"
          ? String(place.location.longitude)
          : "",
      types: Array.isArray(place.types) ? place.types.join(", ") : "",
      leadTypeQuery: leadType,
      locationQuery: locationText,
      searchQuery: searchQuery,
    };
  }

  function csvEscape(value) {
    var text = String(value == null ? "" : value);
    if (/[",\n]/.test(text)) {
      return '"' + text.replace(/"/g, '""') + '"';
    }
    return text;
  }

  function toCsv(rows, cols) {
    var header = cols.map(function (col) {
      return csvEscape(fieldLabel(col));
    });
    var lines = [header.join(",")];
    rows.forEach(function (row) {
      var line = cols
        .map(function (col) {
          return csvEscape(row[col]);
        })
        .join(",");
      lines.push(line);
    });
    return lines.join("\n");
  }

  async function collectLeads(config) {
    var deduped = new Map();
    var combinations = [];
    config.leadTypes.forEach(function (leadType) {
      config.locations.forEach(function (locationText) {
        combinations.push({ leadType: leadType, locationText: locationText });
      });
    });

    var totalCombos = combinations.length;
    var apiCallCount = 0;

    for (var i = 0; i < combinations.length; i += 1) {
      if (deduped.size >= config.maxResults) break;
      if (apiCallCount >= MAX_API_CALLS_PER_RUN) {
        setStatus(
          "Stopped early to avoid too many API requests in one run. Increase max gradually.",
          true
        );
        break;
      }

      var combo = combinations[i];
      var searchQuery = combo.leadType + " in " + combo.locationText;
      setStatus(
        "Searching " +
          (i + 1) +
          "/" +
          totalCombos +
          ": " +
          searchQuery +
          " (found " +
          deduped.size +
          " unique leads so far)"
      );

      var locationBias = null;
      if (config.radiusKm > 0) {
        try {
          var geo = await geocodeLocation(config.apiKey, combo.locationText);
          if (geo) {
            locationBias = {
              lat: geo.lat,
              lng: geo.lng,
              radiusMeters: Math.round(config.radiusKm * 1000),
            };
          }
        } catch (error) {
          setStatus(
            "Could not geocode '" +
              combo.locationText +
              "'. Continuing with text search only.",
            true
          );
        }
      }

      var nextPageToken = "";
      var keepPaging = true;

      while (keepPaging && deduped.size < config.maxResults) {
        if (apiCallCount >= MAX_API_CALLS_PER_RUN) break;

        var maxRemaining = config.maxResults - deduped.size;
        var payload;

        try {
          payload = await searchPlacesPage({
            apiKey: config.apiKey,
            searchQuery: searchQuery,
            pageToken: nextPageToken,
            locationBias: locationBias,
            maxRemaining: maxRemaining,
          });
          apiCallCount += 1;
        } catch (error) {
          var invalidPageToken =
            nextPageToken &&
            /page token|INVALID_ARGUMENT|pageToken/i.test(String(error.message));
          if (invalidPageToken) {
            await sleep(PAGE_TOKEN_RETRY_MS);
            payload = await searchPlacesPage({
              apiKey: config.apiKey,
              searchQuery: searchQuery,
              pageToken: nextPageToken,
              locationBias: locationBias,
              maxRemaining: maxRemaining,
            });
            apiCallCount += 1;
          } else {
            throw error;
          }
        }

        var places = Array.isArray(payload.places) ? payload.places : [];
        places.forEach(function (place) {
          var key = place.id || (place.displayName && place.displayName.text);
          if (!key || deduped.has(key) || deduped.size >= config.maxResults) return;
          deduped.set(
            key,
            normalizePlace(place, combo.leadType, combo.locationText, searchQuery)
          );
        });

        nextPageToken = payload.nextPageToken || "";
        keepPaging = Boolean(nextPageToken);
        if (keepPaging) {
          await sleep(PAGE_TOKEN_WAIT_MS);
        }
      }
    }

    return Array.from(deduped.values());
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    var formData = new FormData(form);
    var apiKey = String(formData.get("apiKey") || "").trim();
    var leadTypes = parseList(String(formData.get("leadTypes") || ""));
    var locations = parseList(String(formData.get("locations") || ""));
    var radiusKm = Number(formData.get("radiusKm") || 0);
    var maxResults = Number(formData.get("maxResults") || 100);

    if (!apiKey) {
      setStatus("Please enter your Google API key.", true);
      return;
    }
    if (!leadTypes.length) {
      setStatus("Please provide at least one lead type.", true);
      return;
    }
    if (!locations.length) {
      setStatus("Please provide at least one location.", true);
      return;
    }

    state.columns = selectedColumns();
    renderResults();

    generateBtn.disabled = true;
    downloadBtn.disabled = true;
    setStatus("Generating leads...");

    try {
      var leads = await collectLeads({
        apiKey: apiKey,
        leadTypes: leadTypes,
        locations: locations,
        radiusKm: Number.isFinite(radiusKm) ? Math.max(0, radiusKm) : 0,
        maxResults: Number.isFinite(maxResults)
          ? Math.min(500, Math.max(10, Math.round(maxResults)))
          : 100,
      });

      state.leads = leads;
      state.columns = selectedColumns();
      renderResults();
      setStatus(
        "Done. Generated " +
          leads.length +
          " unique leads from " +
          leadTypes.length +
          " lead types and " +
          locations.length +
          " locations."
      );
    } catch (error) {
      setStatus("Lead generation failed: " + error.message, true);
    } finally {
      generateBtn.disabled = false;
      if (state.leads.length) {
        downloadBtn.disabled = false;
      }
    }
  });

  downloadBtn.addEventListener("click", function () {
    if (!state.leads.length) return;
    state.columns = selectedColumns();
    var csvText = toCsv(state.leads, state.columns);
    var blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
    var now = new Date();
    var stamp = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
      "-",
      String(now.getHours()).padStart(2, "0"),
      String(now.getMinutes()).padStart(2, "0"),
    ].join("");
    var filename = "it-leads-" + stamp + ".csv";
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  });

  renderResults();
})();
