# LinkedIn Account Blocker

A small browser extension (Chrome / Edge / Brave, Manifest V3) that lets **you**
hide — informally "ban" — LinkedIn accounts from **your own** feed.

When you block an account, the extension hides its posts from your LinkedIn feed
and keeps a personal blocklist. A **Block** button is also injected onto each
post so you can add its author with one click.

> ⚠️ **What this is not.** This extension does **not** report accounts to
> LinkedIn, does **not** automate any action against other users, and does
> **not** affect anyone's account server-side. It is purely a personal
> content filter that runs locally in your browser. It never sends your
> blocklist anywhere (it uses the browser's own extension storage). Using it
> to harass or mass-report people is not what it does and is against
> LinkedIn's Terms of Service.

## Features

- Hide all posts from accounts you've blocked, right in the feed.
- One-click **Block** button injected on every post.
- Popup UI to add accounts by name and/or profile URL/slug, and to unblock.
- "Show anyway" link on each hidden post if you want to peek.
- Blocklist syncs across your signed-in browsers via `chrome.storage.sync`.

## Install (developer / unpacked)

1. Download or clone this folder (`linkedin-account-blocker/`).
2. Open `chrome://extensions` (or `edge://extensions`).
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the `linkedin-account-blocker/` folder.
5. Open [LinkedIn](https://www.linkedin.com) — the extension is now active.

## Usage

**From the feed:** hover any post and click the red **Block** button next to the
author. Their current and future posts get hidden.

**From the popup:** click the extension icon in the toolbar, then:

- Enter a **Name** (as shown on LinkedIn) and/or a **Profile URL / slug**
  (e.g. `https://www.linkedin.com/in/jane-doe/` or just `jane-doe`).
- Click **Block account**.
- Use **Unblock** next to any entry to remove it, or **Clear all** to reset.

Matching by profile slug (`/in/...`) is the most precise; matching by name is a
useful fallback but can match different people with the same display name.

## Project structure

```
linkedin-account-blocker/
├── manifest.json          # MV3 manifest
├── content/
│   ├── content.js         # hides blocked posts, injects Block buttons
│   └── content.css        # styles for injected UI
├── popup/
│   ├── popup.html         # blocklist management UI
│   ├── popup.css
│   └── popup.js
├── icons/                 # generated PNG icons (16/48/128)
└── tools/
    └── generate_icons.py  # regenerate icons (stdlib only)
```

Regenerate icons with:

```bash
python3 tools/generate_icons.py
```

## Notes & limitations

- LinkedIn's page markup changes frequently. The content script uses several
  fallback selectors, but a major LinkedIn redesign may require selector
  updates in `content/content.js`.
- Only `https://www.linkedin.com/*` is affected; no other sites are touched.
- Permissions requested: `storage` (to save your blocklist) and host access to
  `www.linkedin.com` (to hide posts). Nothing else.
