// Mobile nav toggle
const navToggle = document.getElementById("navToggle");
const nav = document.getElementById("nav");

navToggle.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(open));
});

// Close mobile menu when a link is tapped
nav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    nav.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
  });
});

// Current year in footer
document.getElementById("year").textContent = new Date().getFullYear();

// Booking form -> opens WhatsApp with prefilled message
const form = document.getElementById("bookingForm");
const success = document.getElementById("bookingSuccess");
const PHONE = "917096777896";

form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!form.reportValidity()) return;

  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const car = document.getElementById("car").value.trim();
  const service = document.getElementById("service").value;

  const message =
    `Hi KB Garage, I'd like to book a service.%0A` +
    `Name: ${encodeURIComponent(name)}%0A` +
    `Phone: ${encodeURIComponent(phone)}%0A` +
    (car ? `Car: ${encodeURIComponent(car)}%0A` : "") +
    `Service: ${encodeURIComponent(service)}`;

  window.open(`https://wa.me/${PHONE}?text=${message}`, "_blank");

  success.hidden = false;
  success.textContent = "Thanks " + name + "! We'll call you back shortly.";
  form.reset();
});

// Reveal-on-scroll animation
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);

document.querySelectorAll(".card, .step, .why__list li").forEach((el) => {
  el.classList.add("reveal");
  observer.observe(el);
});
