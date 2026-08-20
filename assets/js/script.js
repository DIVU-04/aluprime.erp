(function () {
  "use strict";

  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  var navToggle = document.getElementById("navToggle");
  var navLinks = document.getElementById("navLinks");
  if (navToggle && navLinks) {
    navToggle.addEventListener("click", function () {
      var isOpen = navLinks.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });

    navLinks.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        navLinks.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  var form = document.getElementById("leadForm");
  var loadDemoButton = document.getElementById("loadDemo");
  var leadList = document.getElementById("leadList");
  var leadTable = document.getElementById("leadTable");
  var metrics = document.getElementById("metrics");
  var resultNote = document.getElementById("resultNote");
  var exportCsvButton = document.getElementById("exportCsv");
  var copyPitchButton = document.getElementById("copyPitch");

  var currentLeads = [];
  var currentOptions = {};

  var businessTypes = {
    all: {
      label: "Local business",
      categories: ["Clinic", "Restaurant", "Retail showroom", "School", "Hotel", "Manufacturer", "Real estate office"],
      prefixes: ["Prime", "Shree", "City", "Metro", "Royal", "Urban", "Bright"],
      suffixes: ["Services", "Center", "Hub", "Group", "Solutions", "Point", "Enterprise"],
    },
    clinics: {
      label: "Clinic",
      categories: ["Dental clinic", "Eye hospital", "Physiotherapy clinic", "Diagnostic center", "Skin clinic"],
      prefixes: ["Care", "Life", "Smile", "Aarogya", "HealthPlus", "Nova"],
      suffixes: ["Clinic", "Hospital", "Care Center", "Diagnostics", "Wellness"],
    },
    restaurants: {
      label: "Restaurant",
      categories: ["Restaurant", "Cafe", "Fast food restaurant", "Bakery", "Cloud kitchen"],
      prefixes: ["Spice", "Urban", "Tasty", "Foodie", "Cafe", "Grill"],
      suffixes: ["Kitchen", "Cafe", "Foods", "Bistro", "Restaurant"],
    },
    hotels: {
      label: "Hotel",
      categories: ["Hotel", "Guest house", "Banquet hall", "Resort", "Service apartment"],
      prefixes: ["Grand", "Royal", "Comfort", "Silver", "Blue", "Elite"],
      suffixes: ["Hotel", "Stay", "Inn", "Residency", "Suites"],
    },
    retail: {
      label: "Retail",
      categories: ["Electronics showroom", "Furniture store", "Fashion store", "Jewellery store", "Supermarket"],
      prefixes: ["Smart", "Choice", "Shree", "City", "Value", "Galaxy"],
      suffixes: ["Store", "Showroom", "Mart", "Collection", "Retail"],
    },
    education: {
      label: "Education",
      categories: ["School", "Coaching center", "Computer institute", "Preschool", "Training academy"],
      prefixes: ["Bright", "Future", "Excel", "Gurukul", "Skill", "Smart"],
      suffixes: ["Academy", "School", "Institute", "Classes", "Learning"],
    },
    "real-estate": {
      label: "Real estate",
      categories: ["Real estate agency", "Builder office", "Property consultant", "Architect", "Interior designer"],
      prefixes: ["Skyline", "Prime", "Urban", "Nirman", "Estate", "Property"],
      suffixes: ["Developers", "Realty", "Properties", "Consultants", "Spaces"],
    },
    manufacturing: {
      label: "Manufacturing",
      categories: ["Manufacturer", "Factory", "Packaging company", "Textile unit", "Engineering workshop"],
      prefixes: ["Apex", "Shakti", "Precision", "Om", "Reliable", "Industrial"],
      suffixes: ["Industries", "Manufacturing", "Works", "Engineering", "Products"],
    },
    professional: {
      label: "Professional service",
      categories: ["Chartered accountant", "Law firm", "Consultant", "Insurance agency", "Travel agency"],
      prefixes: ["Insight", "Trust", "Accurate", "Prime", "Legal", "Global"],
      suffixes: ["Associates", "Consultants", "Advisory", "Services", "Partners"],
    },
    salons: {
      label: "Lifestyle",
      categories: ["Salon", "Spa", "Gym", "Yoga studio", "Beauty clinic"],
      prefixes: ["Glow", "Fit", "Style", "Urban", "Wellness", "Elite"],
      suffixes: ["Studio", "Salon", "Spa", "Fitness", "Wellness"],
    },
  };

  var serviceLabels = {
    website: "Website development",
    seo: "Local SEO and Google Business Profile",
    software: "Custom software / ERP / CRM",
    cloud: "Cloud, email, and backup setup",
    security: "Cybersecurity and CCTV support",
    automation: "Automation and AI chatbot",
  };

  var areasByCity = {
    Ahmedabad: ["Navrangpura", "Satellite", "Gota", "Bopal", "Prahlad Nagar", "Maninagar", "Vastrapur"],
    Surat: ["Adajan", "Vesu", "Varachha", "Ring Road", "Piplod", "Katargam"],
    Vadodara: ["Alkapuri", "Gotri", "Manjalpur", "Fatehgunj", "Akota"],
    Mumbai: ["Andheri", "Borivali", "Dadar", "Powai", "Thane", "Bandra"],
    Pune: ["Hinjewadi", "Baner", "Kothrud", "Wakad", "Viman Nagar"],
    Delhi: ["Connaught Place", "Rohini", "Dwarka", "Karol Bagh", "Noida", "Gurugram"],
    Bengaluru: ["Indiranagar", "Whitefield", "Koramangala", "HSR Layout", "Jayanagar"],
    Hyderabad: ["Madhapur", "Gachibowli", "Banjara Hills", "Kukatpally", "Secunderabad"],
    Chennai: ["T Nagar", "Anna Nagar", "Velachery", "Adyar", "Porur"],
    Jaipur: ["C Scheme", "Malviya Nagar", "Vaishali Nagar", "Mansarovar", "Tonk Road"],
  };

  function getFormOptions() {
    if (!form) return {};
    var data = new FormData(form);
    return {
      businessType: String(data.get("businessType") || "all"),
      location: String(data.get("location") || "Ahmedabad, Gujarat").trim(),
      radius: Number(data.get("radius") || 5),
      leadCount: Number(data.get("leadCount") || 10),
      serviceFocus: String(data.get("serviceFocus") || "website"),
      apiEndpoint: String(data.get("apiEndpoint") || "").trim(),
    };
  }

  function getCity(location) {
    return (location.split(",")[0] || location || "Ahmedabad").trim();
  }

  function pick(items, index) {
    return items[index % items.length];
  }

  function getNeed(serviceFocus, lead) {
    var selected = serviceLabels[serviceFocus] || serviceLabels.website;
    if (!lead.website && serviceFocus !== "website") {
      return "Website development + " + selected;
    }
    if (serviceFocus === "seo" && lead.reviews < 80) {
      return "Local SEO and review growth";
    }
    if (serviceFocus === "software" && /Manufacturer|Factory|School|Hotel|Clinic|Restaurant/.test(lead.category)) {
      return "CRM, billing, inventory, or booking software";
    }
    if (serviceFocus === "security") {
      return "Endpoint security, CCTV, and backup support";
    }
    if (serviceFocus === "automation") {
      return "WhatsApp chatbot and lead automation";
    }
    return selected;
  }

  function scoreLead(lead, serviceFocus) {
    var score = 48;

    if (!lead.website) score += 22;
    if (lead.phone) score += 8;
    if (lead.rating >= 4.2) score += 8;
    if (lead.reviews >= 100) score += 7;
    if (lead.reviews < 40) score += 4;
    if (serviceFocus === "software" && /Manufacturer|Factory|School|Hotel|Clinic/.test(lead.category)) score += 9;
    if (serviceFocus === "seo" && lead.reviews < 90) score += 8;
    if (serviceFocus === "website" && !lead.website) score += 9;

    return Math.max(35, Math.min(score, 99));
  }

  function generatePhone(index) {
    var block = String(78000 + index * 137).slice(0, 5);
    var line = String(12000 + index * 241).slice(0, 5);
    return "+91 " + block + " " + line;
  }

  function buildDemoLeads(options) {
    var profile = businessTypes[options.businessType] || businessTypes.all;
    var city = getCity(options.location);
    var areas = areasByCity[city] || [city + " Central", city + " East", city + " West", city + " Business Area"];
    var leads = [];

    for (var i = 0; i < options.leadCount; i += 1) {
      var category = pick(profile.categories, i);
      var area = pick(areas, i);
      var name = pick(profile.prefixes, i + 1) + " " + pick(profile.suffixes, i + 3);
      var hasWebsite = (i + options.radius) % 3 !== 0;
      var rating = Number((3.7 + ((i * 17) % 14) / 10).toFixed(1));
      var reviews = 18 + ((i * 47 + options.radius * 11) % 260);
      var lead = {
        name: name,
        category: category,
        address: area + ", " + options.location,
        phone: i % 7 === 0 ? "" : generatePhone(i + options.radius),
        website: hasWebsite ? "https://" + name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 24) + ".example.com" : "",
        rating: Math.min(rating, 5),
        reviews: reviews,
        mapsUrl: "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(name + " " + area + " " + city),
        openingHours: i % 4 === 0 ? "Hours not listed" : "Open now",
        source: "Demo data",
      };

      lead.need = getNeed(options.serviceFocus, lead);
      lead.score = scoreLead(lead, options.serviceFocus);
      lead.pitch = buildPitch(lead, options);
      leads.push(lead);
    }

    return leads.sort(function (a, b) {
      return b.score - a.score;
    });
  }

  function normalizeLead(raw, options) {
    var lead = {
      name: raw.name || raw.displayName || raw.businessName || "Unnamed business",
      category: raw.category || raw.primaryType || raw.types || businessTypes[options.businessType].label,
      address: raw.address || raw.formattedAddress || raw.vicinity || options.location,
      phone: raw.phone || raw.nationalPhoneNumber || raw.internationalPhoneNumber || "",
      website: raw.website || raw.websiteUri || "",
      rating: Number(raw.rating || 0),
      reviews: Number(raw.reviews || raw.userRatingCount || 0),
      mapsUrl: raw.mapsUrl || raw.googleMapsUri || "",
      openingHours: raw.openingHours || raw.businessStatus || "",
      source: "Google Places API",
    };

    if (Array.isArray(lead.category)) {
      lead.category = lead.category[0] || businessTypes[options.businessType].label;
    }

    if (!lead.mapsUrl) {
      lead.mapsUrl = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(lead.name + " " + lead.address);
    }

    lead.need = getNeed(options.serviceFocus, lead);
    lead.score = scoreLead(lead, options.serviceFocus);
    lead.pitch = buildPitch(lead, options);
    return lead;
  }

  function buildPitch(lead, options) {
    var city = getCity(options.location);
    var service = lead.need || serviceLabels[options.serviceFocus] || "IT services";
    return (
      "Hello " + lead.name + ",\n\n" +
      "I found your business while researching " + (lead.category || "local businesses") + " in " + city + ". " +
      "We help businesses improve operations with " + service + ". " +
      "Based on your public business profile, I think there may be a good opportunity to improve your digital presence and customer enquiries.\n\n" +
      "Would you like a free 10-minute IT growth audit this week?\n\n" +
      "Regards,\nYour IT Services Team"
    );
  }

  function scoreClass(score) {
    if (score >= 78) return "score";
    if (score >= 62) return "score score--warm";
    return "score score--cold";
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderLeads(leads, options, mode) {
    currentLeads = leads;
    currentOptions = options;

    var highScore = leads.filter(function (lead) { return lead.score >= 78; }).length;
    var missingWebsites = leads.filter(function (lead) { return !lead.website; }).length;
    var withPhone = leads.filter(function (lead) { return Boolean(lead.phone); }).length;

    if (metrics) {
      metrics.innerHTML =
        '<div class="metric"><strong>' + leads.length + '</strong><span>Total leads</span></div>' +
        '<div class="metric"><strong>' + highScore + '</strong><span>High score</span></div>' +
        '<div class="metric"><strong>' + missingWebsites + '</strong><span>Missing websites</span></div>' +
        '<div class="metric"><strong>' + withPhone + '</strong><span>With phone</span></div>';
    }

    if (resultNote) {
      resultNote.textContent = mode === "api"
        ? "Live results loaded from your secure Places API endpoint."
        : "Demo results generated for " + options.location + ". Connect a secure Places API endpoint for real Google Maps business data.";
    }

    if (leadList) {
      leadList.innerHTML = leads.map(function (lead) {
        return (
          '<article class="lead-card card">' +
            '<div class="lead-card__top">' +
              '<div>' +
                '<h3>' + escapeHtml(lead.name) + '</h3>' +
                '<p>' + escapeHtml(lead.category) + ' - ' + escapeHtml(lead.address) + '</p>' +
              '</div>' +
              '<span class="' + scoreClass(lead.score) + '">' + lead.score + '</span>' +
            '</div>' +
            '<div class="lead-tags">' +
              '<span>' + escapeHtml(lead.need) + '</span>' +
              '<span>' + escapeHtml(lead.rating ? lead.rating + " rating" : "No rating") + '</span>' +
              '<span>' + escapeHtml(lead.reviews + " reviews") + '</span>' +
              '<span>' + escapeHtml(lead.source) + '</span>' +
            '</div>' +
            '<p><strong>Phone:</strong> ' + escapeHtml(lead.phone || "Not listed") + '</p>' +
            '<p><strong>Website:</strong> ' + (lead.website ? '<a href="' + escapeHtml(lead.website) + '" target="_blank" rel="noopener">' + escapeHtml(lead.website) + '</a>' : 'Not listed') + '</p>' +
            '<div class="lead-card__actions">' +
              '<a href="' + escapeHtml(lead.mapsUrl) + '" target="_blank" rel="noopener">Open Maps</a>' +
              (lead.phone ? '<a href="tel:' + escapeHtml(lead.phone.replace(/[^0-9+]/g, "")) + '">Call</a>' : '') +
            '</div>' +
          '</article>'
        );
      }).join("");
    }

    if (leadTable) {
      leadTable.innerHTML = leads.map(function (lead) {
        return (
          "<tr>" +
            "<td><strong>" + escapeHtml(lead.name) + "</strong><br><span>" + escapeHtml(lead.address) + "</span></td>" +
            "<td>" + escapeHtml(lead.category) + "</td>" +
            "<td>" + escapeHtml(lead.phone || "Not listed") + "</td>" +
            "<td>" + (lead.website ? '<a href="' + escapeHtml(lead.website) + '" target="_blank" rel="noopener">Website</a>' : "Missing") + "</td>" +
            "<td>" + lead.score + "</td>" +
            '<td><a href="' + escapeHtml(lead.mapsUrl) + '" target="_blank" rel="noopener">Maps</a></td>' +
          "</tr>"
        );
      }).join("");
    }

    if (exportCsvButton) exportCsvButton.disabled = leads.length === 0;
    if (copyPitchButton) copyPitchButton.disabled = leads.length === 0;
  }

  function setLoading(isLoading) {
    var submit = form ? form.querySelector('button[type="submit"]') : null;
    if (submit) {
      submit.disabled = isLoading;
      submit.textContent = isLoading ? "Generating..." : "Generate leads";
    }
  }

  function fetchApiLeads(options) {
    return fetch(options.apiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessType: options.businessType,
        location: options.location,
        radiusKm: options.radius,
        limit: options.leadCount,
        serviceFocus: options.serviceFocus,
        fields: [
          "displayName",
          "formattedAddress",
          "nationalPhoneNumber",
          "websiteUri",
          "rating",
          "userRatingCount",
          "googleMapsUri",
          "businessStatus",
        ],
      }),
    })
      .then(function (response) {
        if (!response.ok) throw new Error("Endpoint returned " + response.status);
        return response.json();
      })
      .then(function (payload) {
        var rows = Array.isArray(payload) ? payload : payload.leads || payload.results || [];
        return rows.slice(0, options.leadCount).map(function (row) {
          return normalizeLead(row, options);
        });
      });
  }

  function handleGenerate(options, forceDemo) {
    setLoading(true);

    if (options.apiEndpoint && !forceDemo) {
      fetchApiLeads(options)
        .then(function (leads) {
          renderLeads(leads, options, "api");
        })
        .catch(function (error) {
          var fallback = buildDemoLeads(options);
          renderLeads(fallback, options, "demo");
          if (resultNote) {
            resultNote.textContent = "Could not load the API endpoint (" + error.message + "). Showing demo data instead.";
          }
        })
        .finally(function () {
          setLoading(false);
          document.getElementById("results").scrollIntoView({ behavior: "smooth", block: "start" });
        });
      return;
    }

    window.setTimeout(function () {
      renderLeads(buildDemoLeads(options), options, "demo");
      setLoading(false);
      document.getElementById("results").scrollIntoView({ behavior: "smooth", block: "start" });
    }, 220);
  }

  function toCsvValue(value) {
    return '"' + String(value || "").replace(/"/g, '""') + '"';
  }

  function exportCsv() {
    if (!currentLeads.length) return;
    var headers = ["Name", "Category", "Address", "Phone", "Website", "Rating", "Reviews", "Maps URL", "Opening Hours", "Lead Score", "Suggested IT Service"];
    var rows = currentLeads.map(function (lead) {
      return [
        lead.name,
        lead.category,
        lead.address,
        lead.phone,
        lead.website,
        lead.rating,
        lead.reviews,
        lead.mapsUrl,
        lead.openingHours,
        lead.score,
        lead.need,
      ].map(toCsvValue).join(",");
    });

    var csv = headers.map(toCsvValue).join(",") + "\n" + rows.join("\n");
    var blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    var locationPart = (currentOptions.location || "leads").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    link.href = url;
    link.download = "itmap-leads-" + locationPart + ".csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function copyPitch() {
    if (!currentLeads.length) return;
    var pitch = currentLeads.slice(0, 3).map(function (lead, index) {
      return "Lead " + (index + 1) + ": " + lead.name + "\n" + lead.pitch;
    }).join("\n\n---\n\n");

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(pitch).then(function () {
        copyPitchButton.textContent = "Pitch copied";
        window.setTimeout(function () {
          copyPitchButton.textContent = "Copy outreach pitch";
        }, 1800);
      });
    } else {
      window.prompt("Copy this pitch:", pitch);
    }
  }

  if (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      handleGenerate(getFormOptions(), false);
    });
  }

  if (loadDemoButton) {
    loadDemoButton.addEventListener("click", function () {
      handleGenerate(getFormOptions(), true);
    });
  }

  if (exportCsvButton) {
    exportCsvButton.addEventListener("click", exportCsv);
  }

  if (copyPitchButton) {
    copyPitchButton.addEventListener("click", copyPitch);
  }
})();
