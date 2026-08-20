/*
 * LinkedIn Account Blocker - content script
 *
 * Runs on linkedin.com and hides ("bans") posts / entities belonging to
 * accounts the user has added to their personal blocklist. Everything happens
 * locally in the browser; nothing is sent anywhere and no LinkedIn account is
 * actually reported or affected server-side.
 */

const STORAGE_KEY = "blockedAccounts";

let blockedAccounts = [];
let blockedSlugs = new Set();
let blockedNames = new Set();

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function normalizeName(name) {
  return (name || "").trim().toLowerCase().replace(/\s+/g, " ");
}

// Extract the vanity slug from a LinkedIn profile URL, e.g.
// https://www.linkedin.com/in/john-doe-123/  ->  "john-doe-123"
function slugFromUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url, "https://www.linkedin.com");
    const m = u.pathname.match(/\/in\/([^/]+)/);
    return m ? decodeURIComponent(m[1]).toLowerCase() : null;
  } catch (e) {
    return null;
  }
}

function rebuildIndexes() {
  blockedSlugs = new Set(
    blockedAccounts.map((a) => a.slug).filter(Boolean)
  );
  blockedNames = new Set(
    blockedAccounts.map((a) => normalizeName(a.name)).filter(Boolean)
  );
}

function loadBlocklist() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ [STORAGE_KEY]: [] }, (data) => {
      blockedAccounts = data[STORAGE_KEY] || [];
      rebuildIndexes();
      resolve();
    });
  });
}

function saveBlocklist() {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [STORAGE_KEY]: blockedAccounts }, resolve);
  });
}

function addToBlocklist(entry) {
  if (!entry.slug && !entry.name) return;
  const exists = blockedAccounts.some(
    (a) =>
      (entry.slug && a.slug === entry.slug) ||
      (!entry.slug && normalizeName(a.name) === normalizeName(entry.name))
  );
  if (exists) return;
  blockedAccounts.push({
    name: entry.name || "",
    slug: entry.slug || "",
    addedAt: Date.now(),
  });
  rebuildIndexes();
  saveBlocklist().then(applyBlocklist);
}

/* ------------------------------------------------------------------ */
/* Matching                                                           */
/* ------------------------------------------------------------------ */

// Given a feed post / card element, figure out who the author is.
function getAuthorInfo(el) {
  const info = { slug: null, name: null };

  // Prefer an actor / author profile link.
  const link = el.querySelector(
    'a[href*="/in/"], a.update-components-actor__meta-link, a.app-aware-link[href*="/in/"]'
  );
  if (link) {
    info.slug = slugFromUrl(link.getAttribute("href"));
  }

  // Author name text (LinkedIn markup varies, so try a few known spots).
  const nameEl =
    el.querySelector(".update-components-actor__title span[aria-hidden='true']") ||
    el.querySelector(".update-components-actor__name span[aria-hidden='true']") ||
    el.querySelector(".update-components-actor__title") ||
    el.querySelector(".update-components-actor__name");
  if (nameEl) {
    info.name = normalizeName(nameEl.textContent);
  }

  return info;
}

function isBlocked(info) {
  if (info.slug && blockedSlugs.has(info.slug)) return true;
  if (info.name && blockedNames.has(info.name)) return true;
  return false;
}

/* ------------------------------------------------------------------ */
/* Hiding feed posts                                                  */
/* ------------------------------------------------------------------ */

// Candidate containers that represent a single post / card in the feed.
const POST_SELECTORS = [
  "div.feed-shared-update-v2",
  "div.fie-impression-container",
  "li.artdeco-list__item",
  "div[data-urn]",
];

function findPostContainers(root) {
  const set = new Set();
  POST_SELECTORS.forEach((sel) => {
    root.querySelectorAll(sel).forEach((n) => set.add(n));
  });
  return [...set];
}

function applyBlocklist(root = document) {
  const posts = findPostContainers(root);
  posts.forEach((post) => {
    if (post.dataset.labHandled === "hidden") return;
    const info = getAuthorInfo(post);
    if (isBlocked(info)) {
      hidePost(post, info);
    }
  });
  hideComments(root);
  hideEntities(root);
  injectBlockButtons(root);
}

/* ------------------------------------------------------------------ */
/* Hiding comments                                                    */
/* ------------------------------------------------------------------ */

const COMMENT_SELECTORS = [
  "article.comments-comment-entity",
  "div.comments-comment-item",
  "div.comments-comment-entity",
];

function getCommentAuthor(el) {
  const info = { slug: null, name: null };
  const link = el.querySelector('a[href*="/in/"]');
  if (link) info.slug = slugFromUrl(link.getAttribute("href"));
  const nameEl =
    el.querySelector(".comments-comment-meta__description-title") ||
    el.querySelector(".comments-comment-meta__actor span[aria-hidden='true']");
  if (nameEl) info.name = normalizeName(nameEl.textContent);
  return info;
}

function hideComments(root = document) {
  const set = new Set();
  COMMENT_SELECTORS.forEach((sel) =>
    root.querySelectorAll(sel).forEach((n) => set.add(n))
  );
  set.forEach((comment) => {
    if (comment.dataset.labHandled === "hidden") return;
    const info = getCommentAuthor(comment);
    if (isBlocked(info)) {
      comment.dataset.labHandled = "hidden";
      comment.classList.add("lab-hidden-post");
    }
  });
}

/* ------------------------------------------------------------------ */
/* Hiding entity cards (search results, People You May Know, etc.)    */
/* ------------------------------------------------------------------ */

const ENTITY_SELECTORS = [
  "li.reusable-search__result-container",
  "div.entity-result",
  "li.entity-result",
  "section.mn-pymk-list__card",
  "li.discover-entity-type-card",
  "div.discover-entity-type-card",
];

function getEntityAuthor(el) {
  const info = { slug: null, name: null };
  const link = el.querySelector('a[href*="/in/"]');
  if (link) info.slug = slugFromUrl(link.getAttribute("href"));
  const nameEl =
    el.querySelector(".entity-result__title-text a span[aria-hidden='true']") ||
    el.querySelector(".entity-result__title-text span[aria-hidden='true']") ||
    el.querySelector(".discover-person-card__name") ||
    el.querySelector(".member-name");
  if (nameEl) info.name = normalizeName(nameEl.textContent);
  return info;
}

function hideEntities(root = document) {
  const set = new Set();
  ENTITY_SELECTORS.forEach((sel) =>
    root.querySelectorAll(sel).forEach((n) => set.add(n))
  );
  set.forEach((entity) => {
    if (entity.dataset.labHandled === "hidden") return;
    const info = getEntityAuthor(entity);
    if (isBlocked(info)) {
      entity.dataset.labHandled = "hidden";
      entity.classList.add("lab-hidden-post");
    }
  });
}

function hidePost(post, info) {
  post.dataset.labHandled = "hidden";
  post.classList.add("lab-hidden-post");

  const label = document.createElement("div");
  label.className = "lab-hidden-note";
  const who = info.name || info.slug || "this account";
  label.innerHTML = `Post from <strong>${escapeHtml(who)}</strong> hidden by LinkedIn Account Blocker. `;
  const show = document.createElement("button");
  show.className = "lab-show-btn";
  show.textContent = "Show anyway";
  show.addEventListener("click", () => {
    post.classList.remove("lab-hidden-post");
    label.remove();
  });
  label.appendChild(show);
  post.parentNode && post.parentNode.insertBefore(label, post);
}

/* ------------------------------------------------------------------ */
/* Inject "Block" buttons on posts                                    */
/* ------------------------------------------------------------------ */

function injectBlockButtons(root = document) {
  const posts = findPostContainers(root);
  posts.forEach((post) => {
    if (post.dataset.labBtn === "1") return;
    if (post.classList.contains("lab-hidden-post")) return;
    const info = getAuthorInfo(post);
    if (!info.slug && !info.name) return;

    const actorRow =
      post.querySelector(".update-components-actor__container") ||
      post.querySelector(".update-components-actor") ||
      post;

    const btn = document.createElement("button");
    btn.className = "lab-block-btn";
    btn.type = "button";
    btn.title = "Block this account (hide their posts from your feed)";
    btn.textContent = "Block";
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      addToBlocklist(info);
    });

    post.dataset.labBtn = "1";
    actorRow.appendChild(btn);
  });
}

/* ------------------------------------------------------------------ */
/* Utilities                                                          */
/* ------------------------------------------------------------------ */

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

let debounceTimer = null;
function scheduleApply() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => applyBlocklist(), 250);
}

/* ------------------------------------------------------------------ */
/* Boot                                                               */
/* ------------------------------------------------------------------ */

async function init() {
  await loadBlocklist();
  applyBlocklist();

  const observer = new MutationObserver(() => scheduleApply());
  observer.observe(document.body, { childList: true, subtree: true });

  chrome.storage.onChanged.addListener((changes, area) => {
    if ((area === "sync" || area === "local") && changes[STORAGE_KEY]) {
      blockedAccounts = changes[STORAGE_KEY].newValue || [];
      rebuildIndexes();
      // Unhide everything then re-apply so removals take effect.
      document
        .querySelectorAll(".lab-hidden-post")
        .forEach((el) => {
          el.classList.remove("lab-hidden-post");
          delete el.dataset.labHandled;
        });
      document.querySelectorAll(".lab-hidden-note").forEach((el) => el.remove());
      applyBlocklist();
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
