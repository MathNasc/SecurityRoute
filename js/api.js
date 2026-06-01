/* ════════════════════════════════════════════════════
   API — Multi-source geocoding + backend CRUD
   Sources (in priority order):
     1. Photon  (photon.komoot.io) — melhor cobertura de
        números de imóveis no OSM
     2. BrasilAPI/ViaCEP — dados postais oficiais brasileiros
        (usado para CEP e busca por logradouro + cidade)
     3. Nominatim — busca livre e por lugares/pontos de interesse
   ════════════════════════════════════════════════════ */
const API = (() => {
  let _store  = typeof DEMO !== 'undefined' ? [...DEMO] : [];
  let _nextId = 100;

  /* ── Shared helpers ─────────────────────────────── */
  const _nominatim = () =>
    (typeof CFG !== 'undefined' && CFG.nominatim) ||
    'https://nominatim.openstreetmap.org';

  const _headers = { 'Accept-Language': 'pt-BR,pt;q=0.9' };

  function _fmt(r) {
    // Normalize any result object to { id, primary, secondary, lat, lng }
    return r;
  }

  /* ── Format a Nominatim result ──────────────────── */
  function _fmtNominatim(d) {
    const a   = d.address || {};
    const num = a.house_number || '';
    const road = a.road || a.pedestrian || a.path
               || a.footway || a.living_street || '';
    const sub  = a.suburb || a.neighbourhood || a.quarter || '';
    const city = a.city || a.town || a.municipality || a.village || '';
    const state = a.state_district || a.state || '';

    const primary = road
      ? (num ? `${road}, ${num}` : road)
      : d.display_name.split(',')[0].trim();

    const secondary = [sub, city, state]
      .filter(Boolean)
      .filter((v, i, a) => v !== a[i - 1])
      .join(', ');

    return { id: `nm-${d.place_id}`, primary, secondary,
             lat: parseFloat(d.lat), lng: parseFloat(d.lon), _hasNum: !!num };
  }

  /* ── Format a Photon result ─────────────────────── */
  function _fmtPhoton(f) {
    const p   = f.properties;
    const [lng, lat] = f.geometry.coordinates;
    const num  = p.housenumber || '';
    const road = p.street || p.name || '';
    const dist = p.district || p.suburb || '';
    const city = p.city || p.town || p.village || '';
    const state = p.state || '';

    if (!road && !p.name) return null;

    const primary = road
      ? (num ? `${road}, ${num}` : road)
      : p.name;

    const secondary = [dist, city, state]
      .filter(Boolean)
      .filter((v, i, a) => v !== a[i - 1])
      .join(', ');

    return { id: `ph-${p.osm_id}-${p.osm_type}`, primary, secondary,
             lat, lng, _hasNum: !!num };
  }

  /* ── Merge + deduplicate results ────────────────── */
  function _merge(...lists) {
    const seen = new Set();
    const out  = [];

    // Flatten and deduplicate by id
    for (const item of lists.flat()) {
      if (!item || seen.has(item.id)) continue;
      seen.add(item.id);
      out.push(item);
    }

    // Sort: results with house numbers first
    out.sort((a, b) => (b._hasNum ? 1 : 0) - (a._hasNum ? 1 : 0));

    return out.slice(0, 8).map(({ _hasNum, ...r }) => r);
  }

  /* ══ SEARCH SOURCES ══════════════════════════════ */

  /* 1. Photon — melhor cobertura de números */
  async function _photon(q) {
    // bbox = Brasil (lon_min, lat_min, lon_max, lat_max)
    const p = new URLSearchParams({ q, lang: 'pt', limit: 6,
      bbox: '-73.99,-33.75,-34.79,5.27' });
    try {
      const r = await fetch(`https://photon.komoot.io/api/?${p}`,
                            { headers: _headers });
      if (!r.ok) return [];
      const d = await r.json();
      return (d.features || []).map(_fmtPhoton).filter(Boolean);
    } catch { return []; }
  }

  /* 2. Nominatim — busca livre */
  async function _nominatimFree(q) {
    const country = (typeof CFG !== 'undefined' && CFG.country) || 'br';
    const p = new URLSearchParams({ q, format: 'jsonv2', addressdetails: 1,
                                     limit: 6, countrycodes: country });
    try {
      const r = await fetch(`${_nominatim()}/search?${p}`,
                            { headers: _headers });
      if (!r.ok) return [];
      return (await r.json()).map(_fmtNominatim);
    } catch { return []; }
  }

  /* 3. Nominatim — busca estruturada (street=NUM NOME) */
  async function _nominatimStructured(street, num, city) {
    const country = (typeof CFG !== 'undefined' && CFG.country) || 'br';
    const params = {
      format: 'jsonv2', addressdetails: 1, limit: 5,
      countrycodes: country,
      street: `${num} ${street}`,
    };
    if (city) params.city = city;
    try {
      const r = await fetch(
        `${_nominatim()}/search?${new URLSearchParams(params)}`,
        { headers: _headers }
      );
      if (!r.ok) return [];
      return (await r.json()).map(_fmtNominatim);
    } catch { return []; }
  }

  /* 4. ViaCEP — logradouro + UF + cidade → lista de CEPs */
  async function _viacepStreet(street, city, uf) {
    // Remove number from street name before sending to ViaCEP
    const cleanStreet = street.replace(/,?\s*\d+.*$/, '').trim();
    const url = `https://viacep.com.br/ws/${encodeURIComponent(uf)}/` +
                `${encodeURIComponent(city)}/${encodeURIComponent(cleanStreet)}/json/`;
    try {
      const r = await fetch(url, { headers: _headers });
      if (!r.ok) return [];
      const data = await r.json();
      if (!Array.isArray(data) || data.erro) return [];
      // Geocode the first few CEPs via Nominatim
      const geocoded = await Promise.allSettled(
        data.slice(0, 3).map(d =>
          _nominatimFree(`${d.logradouro}, ${d.localidade}, ${d.uf}, Brasil`)
        )
      );
      return geocoded
        .flatMap(r => r.status === 'fulfilled' ? r.value : [])
        .map(r => ({ ...r, _hasNum: false }));
    } catch { return []; }
  }

  /* 5. BrasilAPI CEP v2 — tem coordenadas! */
  async function _brasilApiCep(cep) {
    try {
      const r = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`);
      if (!r.ok) return [];
      const d = await r.json();
      if (d.errors) return [];
      const coords = d.location?.coordinates;
      if (!coords?.latitude) return [];
      return [{
        id: `cep-${cep}`,
        primary:   d.street  || `CEP ${d.cep}`,
        secondary: [d.neighborhood, d.city, d.state].filter(Boolean).join(', '),
        lat: parseFloat(coords.latitude),
        lng: parseFloat(coords.longitude),
        _hasNum: false,
      }];
    } catch { return []; }
  }

  /* ══ MAIN SEARCH ═════════════════════════════════ */
  async function searchAddress(q) {
    if (!q || q.length < 3) return [];
    q = q.trim();

    /* ── CEP pattern: 01234-567 or 01234567 ── */
    const cepClean = q.replace(/\D/g, '');
    if (/^\d{8}$/.test(cepClean)) {
      // Try BrasilAPI (coordinates) then ViaCEP fallback
      const [brasilRes] = await Promise.allSettled([_brasilApiCep(cepClean)]);
      const direct = brasilRes.status === 'fulfilled' ? brasilRes.value : [];
      if (direct.length) return _merge(direct);
      // Fallback: Nominatim with CEP as query
      return _merge(await _nominatimFree(q));
    }

    /* ── Normalize: "Rua X123" → "Rua X, 123" ── */
    const norm = q
      .replace(/([a-záàãâéêíóôõúüç])(\d)/gi, '$1, $2')
      .replace(/,\s*,/g, ',')
      .trim();

    /* ── Parse street + number + city ── */
    // Pattern: "Street name, NUMBER[, City, UF]"
    const parsed = _parseAddress(norm);

    /* ── Run sources in parallel ── */
    const tasks = [
      _photon(norm),           // Photon (best for house nums)
      _nominatimFree(norm),    // Nominatim free-form
    ];

    if (parsed) {
      tasks.push(
        _nominatimStructured(parsed.street, parsed.num, parsed.city)
      );
      // ViaCEP only when we have city + UF info
      if (parsed.city && parsed.uf) {
        tasks.push(_viacepStreet(parsed.street, parsed.city, parsed.uf));
      }
    }

    const settled = await Promise.allSettled(tasks);
    const all     = settled.flatMap(r =>
      r.status === 'fulfilled' ? r.value : []
    );

    return _merge(all);
  }

  /* ── Parse "Rua X, 123, São Paulo, SP" ─────────── */
  function _parseAddress(q) {
    // Match: street, number[, city[, UF]]
    const m = q.match(
      /^(.+?),\s*(\d+[A-Za-z]?)\s*(?:,\s*([^,]+?))?(?:,\s*([A-Z]{2}))?\s*$/
    );
    if (!m) return null;
    return {
      street: m[1].trim(),
      num:    m[2].trim(),
      city:   m[3] ? m[3].trim() : null,
      uf:     m[4] ? m[4].trim() : null,
    };
  }

  /* ── Reverse geocode ────────────────────────────── */
  async function reverseGeocode(lat, lng) {
    const p = new URLSearchParams({ lat, lon: lng, format: 'jsonv2', zoom: 18 });
    try {
      const r = await fetch(`${_nominatim()}/reverse?${p}`,
                            { headers: _headers });
      if (!r.ok) return null;
      const d = await r.json();
      const a = d.address || {};
      const num  = a.house_number || '';
      const road = a.road || a.pedestrian || a.path || '';
      const city = a.city || a.town || a.village || '';
      if (road) {
        const st = num ? `${road}, ${num}` : road;
        return city ? `${st} — ${city}` : st;
      }
      return d.display_name || null;
    } catch { return null; }
  }

  /* ── Occurrences CRUD ───────────────────────────── */
  async function getOccurrences() {
    if (!window.SR_API_URL) return [..._store];
    const r = await fetch(`${window.SR_API_URL}/occurrences`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }

  async function createOccurrence(occ) {
    const payload = { ...occ, createdAt: new Date().toISOString() };
    if (!window.SR_API_URL) {
      const saved = { ...payload, id: _nextId++ };
      _store.push(saved);
      return saved;
    }
    const r = await fetch(`${window.SR_API_URL}/occurrences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }

  // Alias for modules that call API.search
  const search = searchAddress;

  return { searchAddress, search, reverseGeocode, getOccurrences, createOccurrence };
})();
