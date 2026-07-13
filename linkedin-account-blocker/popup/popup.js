/* LinkedIn Account Blocker - popup logic */

const STORAGE_KEY = "blockedAccounts";

const els = {
  name: document.getElementById("name-input"),
  url: document.getElementById("url-input"),
  add: document.getElementById("add-btn"),
  hint: document.getElementById("form-hint"),
  list: document.getElementById("blocklist"),
  count: document.getElementById("count"),
  empty: document.getElementById("empty-state"),
  clear: document.getElementById("clear-btn"),
};

function slugFromUrl(url) {
  if (!url) return "";
  const raw = url.trim();
  if (!raw) return "";
  try {
    const u = new URL(
      raw.startsWith("http") ? raw : `https://www.linkedin.com${raw.startsWith("/") ? "" : "/"}${raw}`
    );
    const m = u.pathname.match(/\/in\/([^/]+)/);
    if (m) return decodeURIComponent(m[1]).toLowerCase();
  } catch (e) {
    /* fall through */
  }
  // Treat a bare token like "jane-doe" as a slug.
  const bare = raw.replace(/^\/?(in\/)?/, "").replace(/\/.*$/, "");
  return /^[a-z0-9\-%._]+$/i.test(bare) ? bare.toLowerCase() : "";
}

function normalizeName(name) {
  return (name || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function getBlocklist() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ [STORAGE_KEY]: [] }, (data) =>
      resolve(data[STORAGE_KEY] || [])
    );
  });
}

function setBlocklist(list) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [STORAGE_KEY]: list }, resolve);
  });
}

function showHint(msg, type) {
  els.hint.textContent = msg;
  els.hint.className = `hint ${type || ""}`;
  if (msg) {
    setTimeout(() => {
      els.hint.textContent = "";
      els.hint.className = "hint";
    }, 2500);
  }
}

function render(list) {
  els.count.textContent = list.length;
  els.list.innerHTML = "";
  els.empty.style.display = list.length ? "none" : "block";

  list
    .slice()
    .sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0))
    .forEach((entry) => {
      const li = document.createElement("li");

      const info = document.createElement("div");
      info.className = "entry-info";
      const name = document.createElement("div");
      name.className = "entry-name";
      name.textContent = entry.name || entry.slug || "(unknown)";
      info.appendChild(name);
      if (entry.slug) {
        const slug = document.createElement("div");
        slug.className = "entry-slug";
        slug.textContent = `/in/${entry.slug}`;
        info.appendChild(slug);
      }

      const remove = document.createElement("button");
      remove.className = "remove-btn";
      remove.textContent = "Unblock";
      remove.addEventListener("click", async () => {
        const current = await getBlocklist();
        const next = current.filter(
          (a) => !(a.slug === entry.slug && a.name === entry.name)
        );
        await setBlocklist(next);
        render(next);
      });

      li.appendChild(info);
      li.appendChild(remove);
      els.list.appendChild(li);
    });
}

async function addAccount() {
  const name = els.name.value.trim();
  const slug = slugFromUrl(els.url.value);

  if (!name && !slug) {
    showHint("Enter a name or a profile URL/slug.", "error");
    return;
  }

  const list = await getBlocklist();
  const exists = list.some(
    (a) =>
      (slug && a.slug === slug) ||
      (!slug && normalizeName(a.name) === normalizeName(name))
  );
  if (exists) {
    showHint("That account is already blocked.", "error");
    return;
  }

  list.push({ name, slug, addedAt: Date.now() });
  await setBlocklist(list);
  render(list);
  els.name.value = "";
  els.url.value = "";
  showHint("Account blocked.", "ok");
}

els.add.addEventListener("click", addAccount);
[els.name, els.url].forEach((input) =>
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addAccount();
  })
);

els.clear.addEventListener("click", async () => {
  await setBlocklist([]);
  render([]);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if ((area === "sync" || area === "local") && changes[STORAGE_KEY]) {
    render(changes[STORAGE_KEY].newValue || []);
  }
});

getBlocklist().then(render);
