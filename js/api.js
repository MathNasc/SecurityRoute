/* ════════════════════════════════════════════════════
   API — Nominatim geocoding + backend CRUD
   ════════════════════════════════════════════════════ */
const API = (() => {
  let _store = typeof DEMO !== 'undefined' ? [...DEMO] : [];
  let _nextId = 100;

  /* ── Address search ─────────────────────────────────
   *
   * Strategy:
   *   1. Always run the free-form Nominatim query (q=)
   *   2. If the query contains digits (likely a house
   *      number), ALSO run a structured query using the
   *      Nominatim street= parameter — this finds exact
   *      house numbers far more reliably.
   *   3. Merge results, deduplicate by place_id.
   *   4. Always show house_number in the primary label.
   * ─────────────────────────────────────────────────── */
  async function searchAddress(q) {
    if (!q || q.length < 3) return [];

    const headers  = { 'Accept-Language': 'pt-BR,pt;q=0.9' };
    const base     = {
      format: 'jsonv2', addressdetails: 1,
      countrycodes: (typeof CFG !== 'undefined' ? CFG.country : 'br'),
    };
    const nominatim = (typeof CFG !== 'undefined' ? CFG.nominatim : null)
      || 'https://nominatim.openstreetmap.org';

    // Normalize common separators: "Rua X123" → "Rua X, 123"
    const normalised = q
      .replace(/([a-záàãâéêíóôõúç])(\d)/gi, '$1, $2')  // letter→digit
      .replace(/,\s*,/g, ',')
      .trim();

    // Build fetch list
    const fetches = [
      // 1. Free-form query — always
      _nominatimFetch(nominatim, { ...base, q: normalised, limit: 6 }, headers),
    ];

    // 2. Structured query when a digit is present
    if (/\d/.test(q)) {
      const structured = _parseStructured(normalised);
      if (structured) {
        fetches.push(
          _nominatimFetch(nominatim, { ...base, ...structured, limit: 5 }, headers)
        );
      }
    }

    try {
      const settled = await Promise.allSettled(fetches);
      const raw = settled.flatMap(r => r.status === 'fulfilled' ? r.value : []);

      // Deduplicate by place_id, keep max 8
      const seen    = new Set();
      const unique  = raw.filter(d => {
        if (seen.has(d.place_id)) return false;
        seen.add(d.place_id);
        return true;
      }).slice(0, 8);

      return unique.map(_formatResult);
    } catch {
      return [];
    }
  }

  /* ── Structured query parser ──────────────────────
   * Converts "Rua das Flores, 123, São Paulo" into
   * { street: "123 Rua das Flores", city: "São Paulo" }
   * which Nominatim resolves much more precisely.
   * ─────────────────────────────────────────────────*/
  function _parseStructured(q) {
    // Match: "Street name, NUMBER[, rest]"
    const m = q.match(/^(.+?),\s*(\d+[A-Za-z]?)\s*(?:,\s*(.+))?$/);
    if (!m) return null;

    const streetName = m[1].trim();
    const houseNum   = m[2].trim();
    const rest       = m[3] ? m[3].trim() : '';

    // Nominatim structured: street = "housenumber streetname"
    const result = { street: `${houseNum} ${streetName}` };

    // Try to detect city from the rest
    if (rest) result.city = rest.split(',')[0].trim();

    return result;
  }

  /* ── Single Nominatim fetch ─────────────────────── */
  async function _nominatimFetch(base, params, headers) {
    const url = `${base}/search?${new URLSearchParams(params)}`;
    const r   = await fetch(url, { headers });
    if (!r.ok) return [];
    return r.json();
  }

  /* ── Format a Nominatim result object ───────────── */
  function _formatResult(d) {
    const a        = d.address || {};
    const houseNum = a.house_number || '';
    const road     = a.road || a.pedestrian || a.path || a.footway
                   || a.cycleway || a.living_street || '';
    const sub      = a.suburb || a.neighbourhood || a.quarter || a.village_green || '';
    const city     = a.city || a.town || a.municipality || a.village || '';
    const state    = a.state_district || a.state || '';

    // Primary: "Rua X, 123"  or just "Rua X"  or first segment of display_name
    let primary;
    if (road) {
      primary = houseNum ? `${road}, ${houseNum}` : road;
    } else {
      primary = d.display_name.split(',')[0].trim();
    }

    // Secondary: neighbourhood + city + state (skip duplicates)
    const secondaryParts = [sub, city, state].filter(Boolean);
    // Deduplicate adjacent identical parts
    const secondary = secondaryParts
      .filter((v, i, arr) => v !== arr[i - 1])
      .join(', ');

    return {
      id:          d.place_id,
      displayName: d.display_name,
      primary,
      secondary,
      lat: parseFloat(d.lat),
      lng:  parseFloat(d.lon),
    };
  }

  /* ── Reverse geocode ────────────────────────────── */
  async function reverseGeocode(lat, lng) {
    const nominatim = (typeof CFG !== 'undefined' ? CFG.nominatim : null)
      || 'https://nominatim.openstreetmap.org';
    const p = new URLSearchParams({ lat, lon: lng, format: 'jsonv2', zoom: 18 });
    try {
      const r = await fetch(`${nominatim}/reverse?${p}`, {
        headers: { 'Accept-Language': 'pt-BR,pt;q=0.9' },
      });
      if (!r.ok) return null;
      const d = await r.json();

      // Return a tidy "Road, Number — City" string rather than the full display_name
      const a        = d.address || {};
      const houseNum = a.house_number || '';
      const road     = a.road || a.pedestrian || a.path || '';
      const city     = a.city || a.town || a.village || '';

      if (road) {
        const street = houseNum ? `${road}, ${houseNum}` : road;
        return city ? `${street} — ${city}` : street;
      }
      return d.display_name || null;
    } catch {
      return null;
    }
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
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }

  /* ── Alias for modules that call API.search ──────── */
  const search = searchAddress;

  return { searchAddress, search, reverseGeocode, getOccurrences, createOccurrence };
})();
