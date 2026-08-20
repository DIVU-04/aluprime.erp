(function initPlatform() {
  const PLATFORM_KEY = "it-leads-platform-dismissed";

  function detectPlatform() {
    const ua = navigator.userAgent || "";
    const platform = navigator.platform || "";
    const touch = navigator.maxTouchPoints > 1;

    if (/iPad|iPhone|iPod/.test(ua) || (platform === "MacIntel" && touch)) {
      return {
        id: "ios",
        name: "iOS",
        install:
          "Tap Share → Add to Home Screen to install this app on iPhone or iPad.",
      };
    }
    if (/Android/.test(ua)) {
      return {
        id: "android",
        name: "Android",
        install: "Tap the browser menu → Install app / Add to Home screen.",
      };
    }
    if (/Win/.test(platform) || /Windows/.test(ua)) {
      return {
        id: "windows",
        name: "Windows",
        install: "Run run.bat or run.ps1, then open http://localhost:8080 in Edge or Chrome.",
      };
    }
    if (/Mac/.test(platform) && !touch) {
      return {
        id: "macos",
        name: "macOS",
        install: "Run ./run.sh in Terminal, then open http://localhost:8080 in Safari or Chrome.",
      };
    }
    if (/Linux/.test(platform) || /Ubuntu/.test(ua)) {
      return {
        id: "ubuntu",
        name: "Ubuntu / Linux",
        install: "Run ./run.sh or bash scripts/install-ubuntu.sh, then open http://localhost:8080.",
      };
    }
    return {
      id: "web",
      name: "Web",
      install: "Works in any modern browser on desktop, tablet, or phone.",
    };
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    });
  }

  function showPlatformBanner(info) {
    if (localStorage.getItem(PLATFORM_KEY)) return;

    const banner = document.getElementById("platformBanner");
    const title = document.getElementById("platformTitle");
    const hint = document.getElementById("platformHint");
    const dismiss = document.getElementById("dismissPlatformBanner");

    if (!banner || !title || !hint || !dismiss) return;

    title.textContent = `Compatible with ${info.name}`;
    hint.textContent = info.install;
    banner.hidden = false;

    dismiss.addEventListener("click", () => {
      banner.hidden = true;
      localStorage.setItem(PLATFORM_KEY, "1");
    });
  }

  document.documentElement.dataset.platform = detectPlatform().id;
  registerServiceWorker();
  showPlatformBanner(detectPlatform());
})();
