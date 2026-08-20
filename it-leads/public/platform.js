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
        mobile: true,
        install: "Tap Share → Add to Home Screen to install this app on iPhone or iPad.",
      };
    }
    if (/Android/.test(ua)) {
      return {
        id: "android",
        name: "Android",
        mobile: true,
        install: "Tap the browser menu → Install app / Add to Home screen.",
      };
    }
    if (/Win/.test(platform) || /Windows/.test(ua)) {
      return {
        id: "windows",
        name: "Windows",
        mobile: false,
        install: "Run run.bat or run.ps1, then open http://localhost:8080 in Edge or Chrome.",
      };
    }
    if (/Mac/.test(platform) && !touch) {
      return {
        id: "macos",
        name: "macOS",
        mobile: false,
        install: "Run ./run.sh in Terminal, then open http://localhost:8080 in Safari or Chrome.",
      };
    }
    if (/Linux/.test(platform) || /Ubuntu/.test(ua)) {
      return {
        id: "ubuntu",
        name: "Ubuntu / Linux",
        mobile: false,
        install: "Run ./run.sh or bash scripts/install-ubuntu.sh, then open http://localhost:8080.",
      };
    }
    return {
      id: "web",
      name: "Web",
      mobile: touch,
      install: "Works in any modern browser on desktop, tablet, or phone.",
    };
  }

  function isMobileDevice() {
    const info = detectPlatform();
    return info.mobile || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    });
  }

  function showMobileLocalhostWarning() {
    const host = window.location.hostname;
    const warning = document.getElementById("mobileLocalhostWarning");
    if (!warning) return;

    if (isMobileDevice() && (host === "localhost" || host === "127.0.0.1")) {
      warning.hidden = false;
    }
  }

  async function loadNetworkPanel() {
    const urlEl = document.getElementById("networkUrl");
    const qrWrap = document.getElementById("networkQrWrap");
    const qrImg = document.getElementById("networkQr");
    const tipsEl = document.getElementById("networkTips");
    const copyBtn = document.getElementById("copyNetworkUrlBtn");
    const refreshBtn = document.getElementById("refreshNetworkBtn");

    if (!urlEl) return;

    try {
      const response = await fetch("/api/network");
      const data = await response.json();

      if (data.primary_network_url) {
        urlEl.textContent = data.primary_network_url;
        if (qrWrap && qrImg && data.qr_url) {
          qrImg.src = data.qr_url;
          qrWrap.hidden = false;
        }
      } else {
        urlEl.textContent = "Could not detect network IP. Check Wi-Fi connection.";
        if (qrWrap) qrWrap.hidden = true;
      }

      if (tipsEl && data.tips) {
        tipsEl.innerHTML = data.tips.map((tip) => `<li>${tip}</li>`).join("");
      }

      if (copyBtn) {
        copyBtn.onclick = async () => {
          const link = data.primary_network_url || "";
          if (!link) return;
          try {
            await navigator.clipboard.writeText(link);
            copyBtn.textContent = "Copied!";
            setTimeout(() => {
              copyBtn.textContent = "Copy link";
            }, 2000);
          } catch {
            prompt("Copy this URL:", link);
          }
        };
      }

      if (refreshBtn) {
        refreshBtn.onclick = () => loadNetworkPanel();
      }
    } catch {
      urlEl.textContent = "Could not load network info. Is the server running?";
    }
  }

  function showPlatformBanner(info) {
    if (localStorage.getItem(PLATFORM_KEY)) return;
    if (isMobileDevice()) return;

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

  const platform = detectPlatform();
  document.documentElement.dataset.platform = platform.id;
  registerServiceWorker();
  showPlatformBanner(platform);
  showMobileLocalhostWarning();
  loadNetworkPanel();
})();
