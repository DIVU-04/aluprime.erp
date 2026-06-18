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

  // Booking / quote forms -> open WhatsApp with prefilled details
  var WHATSAPP = "917096777896";
  var forms = document.querySelectorAll("[data-quote]");
  forms.forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var data = new FormData(form);
      var name = (data.get("name") || "").toString().trim();
      var phone = (data.get("phone") || "").toString().trim();
      var car = (data.get("car") || "").toString().trim();
      var service = (data.get("service") || "").toString().trim();
      var message = (data.get("message") || "").toString().trim();

      var lines = [
        "Hello KB Garage, I'd like to book a service.",
        name ? "Name: " + name : "",
        phone ? "Phone: " + phone : "",
        car ? "Car: " + car : "",
        service ? "Service: " + service : "",
        message ? "Details: " + message : "",
      ].filter(Boolean);

      var url =
        "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(lines.join("\n"));

      var note = form.querySelector("[data-form-note]");
      if (note) {
        note.textContent = "Opening WhatsApp to confirm your request…";
        note.className = "form__note ok";
      }

      window.open(url, "_blank", "noopener");
      form.reset();
    });
  });
})();
