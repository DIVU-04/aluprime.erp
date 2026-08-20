(function () {
  "use strict";

  // Current year in footer
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Mobile nav toggle
  var toggle = document.getElementById("navToggle");
  var links = document.getElementById("navLinks");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      toggle.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", String(open));
    });
    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        links.classList.remove("open");
        toggle.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  // Scroll reveal animation (skipped when the user prefers reduced motion)
  var prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var revealTargets = prefersReducedMotion
    ? []
    : document.querySelectorAll(
        ".card, .step, .section__head, .why__content, .hero__card, .why__media"
      );
  revealTargets.forEach(function (el) {
    el.classList.add("reveal");
  });
  if (revealTargets.length && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    revealTargets.forEach(function (el) {
      io.observe(el);
    });
  } else {
    revealTargets.forEach(function (el) {
      el.classList.add("in");
    });
  }

  // FAQ accordion — keep only one item open at a time
  var faq = document.querySelector("[data-faq]");
  if (faq) {
    var items = faq.querySelectorAll("details");
    items.forEach(function (item) {
      item.addEventListener("toggle", function () {
        if (item.open) {
          items.forEach(function (other) {
            if (other !== item) other.open = false;
          });
        }
      });
    });
  }

  // Back-to-top button
  var toTop = document.getElementById("toTop");
  if (toTop) {
    var onScroll = function () {
      toTop.classList.toggle("show", window.pageYOffset > 600);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // Scroll-spy — highlight the nav link for the section in view
  var navAnchors = links
    ? Array.prototype.slice.call(links.querySelectorAll('a[href^="#"]'))
    : [];
  var spyTargets = navAnchors
    .map(function (a) {
      var id = a.getAttribute("href").slice(1);
      var section = id ? document.getElementById(id) : null;
      return section ? { link: a, section: section } : null;
    })
    .filter(Boolean);

  if (spyTargets.length && "IntersectionObserver" in window) {
    var setActive = function (link) {
      spyTargets.forEach(function (t) {
        t.link.classList.toggle("active", t.link === link);
      });
    };
    var spy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var match = spyTargets.filter(function (t) {
              return t.section === entry.target;
            })[0];
            if (match) setActive(match.link);
          }
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    spyTargets.forEach(function (t) {
      spy.observe(t.section);
    });
  }

  // Lead brief generator preview + copy flow
  var leadForm = document.querySelector("[data-lead-form]");
  var currentBrief = "";

  var preview = {
    title: document.querySelector("[data-preview-title]"),
    subtitle: document.querySelector("[data-preview-subtitle]"),
    niches: document.querySelector("[data-preview-niches]"),
    locations: document.querySelector("[data-preview-locations]"),
    volume: document.querySelector("[data-preview-volume]"),
    delivery: document.querySelector("[data-preview-delivery]"),
    fields: document.querySelector("[data-preview-fields]"),
    notes: document.querySelector("[data-preview-notes]"),
    brief: document.querySelector("[data-preview-brief]"),
    copyNote: document.querySelector("[data-copy-note]"),
  };

  function unique(values) {
    return values.filter(function (value, index, array) {
      return array.indexOf(value) === index;
    });
  }

  function parseLocations(value) {
    return unique(
      value
        .split(/[\n,]+/)
        .map(function (item) {
          return item.trim();
        })
        .filter(Boolean)
    );
  }

  function checkedValues(form, name) {
    return Array.prototype.slice
      .call(form.querySelectorAll('input[name="' + name + '"]:checked'))
      .map(function (input) {
        return input.value.trim();
      })
      .filter(Boolean);
  }

  function renderTags(container, values, fallback) {
    if (!container) return;
    container.innerHTML = "";
    (values.length ? values : [fallback]).forEach(function (value) {
      var tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = value;
      container.appendChild(tag);
    });
  }

  function buildState(form) {
    var data = new FormData(form);
    return {
      name: (data.get("name") || "").toString().trim(),
      company: (data.get("company") || "").toString().trim(),
      service: (data.get("service") || "").toString().trim(),
      niches: checkedValues(form, "niche"),
      locations: parseLocations((data.get("locations") || "").toString()),
      volume: (data.get("volume") || "").toString().trim(),
      fields: checkedValues(form, "field"),
      delivery: (data.get("delivery") || "").toString().trim(),
      notes: (data.get("message") || "").toString().trim(),
    };
  }

  function buildTitle(state) {
    var locationText = state.locations.slice(0, 2).join(" and ") || "selected locations";
    return (state.service || "IT service") + " leads in " + locationText;
  }

  function buildSubtitle(state) {
    var nicheCount = state.niches.length || 0;
    var locationCount = state.locations.length || 0;
    var fieldCount = state.fields.length || 0;
    return (
      "Lead brief for " +
      (state.company || "your IT services company") +
      " covering " +
      nicheCount +
      " lead type" +
      (nicheCount === 1 ? "" : "s") +
      ", " +
      locationCount +
      " location" +
      (locationCount === 1 ? "" : "s") +
      " and " +
      fieldCount +
      " selected detail field" +
      (fieldCount === 1 ? "" : "s") +
      "."
    );
  }

  function buildBrief(state) {
    var lines = [
      "Lead Generation Brief",
      "---------------------",
      state.name ? "Requested by: " + state.name : "",
      state.company ? "Company: " + state.company : "",
      state.service ? "IT service: " + state.service : "",
      state.niches.length ? "Target lead types: " + state.niches.join(", ") : "",
      state.locations.length ? "Target locations: " + state.locations.join(", ") : "",
      state.volume ? "Expected lead count: " + state.volume : "",
      state.fields.length ? "Required lead details: " + state.fields.join(", ") : "",
      state.delivery ? "Delivery format: " + state.delivery : "",
      state.notes ? "Special filters: " + state.notes : "Special filters: None specified",
      "",
      "Suggested use:",
      "Use this brief to generate a Google Maps lead list for localized outreach by an IT services sales team.",
    ].filter(Boolean);

    return lines.join("\n");
  }

  function renderPreview(state) {
    currentBrief = buildBrief(state);

    if (preview.title) preview.title.textContent = buildTitle(state);
    if (preview.subtitle) preview.subtitle.textContent = buildSubtitle(state);
    if (preview.volume) preview.volume.textContent = state.volume || "Not selected";
    if (preview.delivery) preview.delivery.textContent = state.delivery || "Not selected";
    if (preview.notes)
      preview.notes.textContent =
        state.notes || "No extra filters added yet. You can request rating, website or duplicate filters.";
    if (preview.brief) preview.brief.textContent = currentBrief;

    renderTags(preview.niches, state.niches, "Choose at least one lead type");
    renderTags(preview.locations, state.locations, "Add at least one location");
    renderTags(preview.fields, state.fields, "Choose at least one lead detail field");
  }

  function validateState(state) {
    if (!state.service) return "Select your IT service first.";
    if (!state.niches.length) return "Select at least one lead type.";
    if (!state.locations.length) return "Add at least one city or area.";
    if (!state.volume) return "Select the number of leads you want.";
    if (!state.fields.length) return "Choose at least one lead detail field.";
    if (!state.delivery) return "Select a delivery format.";
    return "";
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }

    return new Promise(function (resolve, reject) {
      try {
        var textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  if (leadForm) {
    renderPreview(buildState(leadForm));

    ["input", "change"].forEach(function (eventName) {
      leadForm.addEventListener(eventName, function () {
        renderPreview(buildState(leadForm));
      });
    });

    leadForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var note = leadForm.querySelector("[data-form-note]");
      var state = buildState(leadForm);
      var error = validateState(state);

      if (error) {
        if (note) {
          note.textContent = error;
          note.className = "form__note err";
        }
        return;
      }

      renderPreview(state);
      if (note) {
        note.textContent = "Lead brief generated below. Review it and copy it for your sales workflow.";
        note.className = "form__note ok";
      }

      var previewSection = document.getElementById("preview");
      if (previewSection) {
        previewSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  var copyButton = document.querySelector("[data-copy-brief]");
  if (copyButton) {
    var defaultCopyLabel = copyButton.textContent;
    copyButton.addEventListener("click", function () {
      if (!currentBrief) return;
      copyText(currentBrief)
        .then(function () {
          copyButton.textContent = "Copied!";
          if (preview.copyNote) {
            preview.copyNote.textContent = "Lead brief copied to clipboard.";
            preview.copyNote.className = "form__note ok";
          }
          window.setTimeout(function () {
            copyButton.textContent = defaultCopyLabel;
          }, 2000);
        })
        .catch(function () {
          copyButton.textContent = "Copy failed";
          if (preview.copyNote) {
            preview.copyNote.textContent = "Could not copy automatically. Please select and copy the brief manually.";
            preview.copyNote.className = "form__note err";
          }
          window.setTimeout(function () {
            copyButton.textContent = defaultCopyLabel;
          }, 2000);
        });
    });
  }
})();
