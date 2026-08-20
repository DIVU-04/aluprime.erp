/* Lead-Gen frontend */
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const state = {
    leads: [],
    lastMeta: null,
    selectedTypes: new Set(),
  };

  /* Tabs */
  $$('.tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.tab').forEach((b) => b.classList.toggle('active', b === btn));
      $$('.tabpane').forEach((p) => p.classList.toggle('active', p.id === 'form-' + btn.dataset.tab));
    });
  });

  /* Health + presets */
  fetch('/api/health').then((r) => r.json()).then((h) => {
    const el = $('#status');
    if (h.hasKey) {
      el.textContent = 'API key: configured';
      el.classList.add('ok');
    } else {
      el.textContent = 'API key missing — add to lead-gen/.env';
      el.classList.add('bad');
    }
  }).catch(() => { $('#status').textContent = 'server not reachable'; });

  fetch('/api/presets').then((r) => r.json()).then((p) => {
    // Radii
    const radiusEl = $('#n-radius');
    p.radiusMeters.forEach((r) => {
      const opt = document.createElement('option');
      opt.value = r;
      opt.textContent = r >= 1000 ? `${r / 1000} km` : `${r} m`;
      if (r === 5000) opt.selected = true;
      radiusEl.appendChild(opt);
    });
    // IT-buyer chips → fill "what" on the text form
    const bset = $('#presets-buyers');
    p.itBuyers.forEach((label) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.textContent = label;
      b.addEventListener('click', () => { $('#q-what').value = label; b.classList.add('on'); setTimeout(() => b.classList.remove('on'), 250); });
      bset.appendChild(b);
    });
    // Nearby types
    const tset = $('#presets-types');
    p.nearbyTypes.forEach((t) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.textContent = t;
      b.addEventListener('click', () => {
        if (state.selectedTypes.has(t)) { state.selectedTypes.delete(t); b.classList.remove('on'); }
        else { state.selectedTypes.add(t); b.classList.add('on'); }
      });
      tset.appendChild(b);
    });
  });

  /* Toast */
  function toast(msg, ms = 2600) {
    const t = $('#toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), ms);
  }

  /* Rendering */
  function render(leads, meta) {
    state.leads = leads; state.lastMeta = meta;
    const card = $('#results-card'); card.hidden = false;
    $('#results-title').textContent = `${leads.length} leads`;
    $('#results-sub').textContent = meta?.subtitle || '';
    const filter = $('#filter').value.trim().toLowerCase();
    const tbody = $('#table tbody'); tbody.innerHTML = '';
    let i = 0;
    for (const l of leads) {
      if (filter) {
        const hay = [l.name, l.category, l.city, l.state, l.address, l.emails].join(' ').toLowerCase();
        if (!hay.includes(filter)) continue;
      }
      i++;
      const tr = document.createElement('tr');
      const socials = [
        l.facebook && `<a href="${l.facebook}" target="_blank" rel="noopener">FB</a>`,
        l.instagram && `<a href="${l.instagram}" target="_blank" rel="noopener">IG</a>`,
        l.linkedin && `<a href="${l.linkedin}" target="_blank" rel="noopener">IN</a>`,
        l.twitter && `<a href="${l.twitter}" target="_blank" rel="noopener">X</a>`,
        l.youtube && `<a href="${l.youtube}" target="_blank" rel="noopener">YT</a>`,
      ].filter(Boolean).join(' · ');

      tr.innerHTML = `
        <td>${i}</td>
        <td><b>${escapeHtml(l.name)}</b><br><span class="hint">${escapeHtml(l.summary || '')}</span></td>
        <td>${escapeHtml(l.category)}</td>
        <td>${l.phone ? `<a href="tel:${escapeAttr(l.phone)}">${escapeHtml(l.phone)}</a>` : '—'}</td>
        <td>${l.emails ? l.emails.split(';').map((e) => `<a href="mailto:${escapeAttr(e.trim())}">${escapeHtml(e.trim())}</a>`).join('<br>') : '—'}</td>
        <td>${l.website ? `<a href="${escapeAttr(l.website)}" target="_blank" rel="noopener">${shortUrl(l.website)}</a>` : '—'}</td>
        <td>${escapeHtml(l.address)}</td>
        <td>${l.rating || '—'}</td>
        <td>${l.reviews || 0}</td>
        <td>${socials || '—'}</td>
        <td>${l.googleMapsUrl ? `<a href="${escapeAttr(l.googleMapsUrl)}" target="_blank" rel="noopener">open</a>` : '—'}</td>
      `;
      tbody.appendChild(tr);
    }
    if (!tbody.children.length) tbody.innerHTML = `<tr><td colspan="11" class="hint" style="padding:22px;text-align:center">no rows match filter</td></tr>`;
  }

  $('#filter').addEventListener('input', () => render(state.leads, state.lastMeta));

  /* Submit handlers */
  $('#form-text').addEventListener('submit', async (e) => {
    e.preventDefault();
    const what = $('#q-what').value.trim();
    const where = $('#q-where').value.trim();
    const region = $('#q-region').value.trim().toUpperCase();
    const minRating = $('#q-minrating').value;
    const openNow = $('#q-open').checked;
    const enrichWebsites = $('#q-enrich').checked;
    const maxPages = Number($('#q-pages').value);
    if (!what || !where) return;

    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Generating…';
    try {
      const r = await fetch('/api/search', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `${what} in ${where}`, region, minRating, openNow, maxPages, enrichWebsites }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'search failed');
      render(data.leads, { subtitle: `Query: “${what} in ${where}” · pages ≤ ${maxPages}` });
      toast(`Found ${data.count} leads`);
    } catch (err) {
      toast(err.message);
    } finally { btn.disabled = false; btn.textContent = 'Generate leads'; }
  });

  $('#form-nearby').addEventListener('submit', async (e) => {
    e.preventDefault();
    const address = $('#n-address').value.trim();
    const lat = $('#n-lat').value.trim();
    const lng = $('#n-lng').value.trim();
    const radius = Number($('#n-radius').value);
    const enrichWebsites = $('#n-enrich').checked;
    if (!address && !(lat && lng)) return toast('Enter an address or lat/lng');

    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Sweeping…';
    try {
      const r = await fetch('/api/nearby', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, lat, lng, radius, includedTypes: [...state.selectedTypes], enrichWebsites }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'search failed');
      render(data.leads, { subtitle: `Radius sweep · ${radius >= 1000 ? radius / 1000 + ' km' : radius + ' m'} · types: ${[...state.selectedTypes].join(', ') || 'all'}` });
      toast(`Found ${data.count} leads`);
    } catch (err) { toast(err.message); }
    finally { btn.disabled = false; btn.textContent = 'Sweep this radius'; }
  });

  /* Export / save */
  $('#btn-csv').addEventListener('click', async () => {
    if (!state.leads.length) return toast('Run a search first');
    const r = await fetch('/api/export', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leads: state.leads, filename: `leads-${Date.now()}.csv` }),
    });
    const blob = await r.blob();
    downloadBlob(blob, `leads-${Date.now()}.csv`);
  });
  $('#btn-json').addEventListener('click', () => {
    if (!state.leads.length) return toast('Run a search first');
    const blob = new Blob([JSON.stringify(state.leads, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `leads-${Date.now()}.json`);
  });
  $('#btn-save').addEventListener('click', async () => {
    if (!state.leads.length) return toast('Run a search first');
    const name = prompt('Save run as:', `run-${new Date().toISOString().slice(0, 16).replace(/[^0-9]/g, '')}`);
    if (!name) return;
    const r = await fetch('/api/save', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, leads: state.leads }),
    });
    const data = await r.json();
    if (r.ok) toast(`Saved ${data.count} leads → ${data.file}`); else toast(data.error || 'save failed');
  });

  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 300);
  }

  function escapeHtml(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function escapeAttr(s) { return escapeHtml(s).replace(/\s+/g, ' '); }
  function shortUrl(u) { try { const url = new URL(u); return url.hostname.replace(/^www\./, '') + (url.pathname !== '/' ? url.pathname : ''); } catch { return u; } }
})();
