/* ════════════════════════════════════════════════════
   API — Nominatim geocoding + backend CRUD
   ════════════════════════════════════════════════════ */
const API = (() => {
  let _store = [...DEMO];
  let _nextId = 100;

  async function searchAddress(q) {
    if (!q || q.length < 3) return [];
    const p = new URLSearchParams({q, format:'jsonv2', addressdetails:1, limit:6, countrycodes:CFG.country});
    try {
      const r = await fetch(`${CFG.nominatim}/search?${p}`, {
        headers: {'Accept-Language':'pt-BR,pt;q=0.9'}
      });
      if (!r.ok) return [];
      return (await r.json()).map(d => {
        const a = d.address || {};
        const road  = a.road || a.pedestrian || a.path || '';
        const sub   = a.suburb || a.neighbourhood || a.quarter || '';
        const city  = a.city  || a.town || a.village || '';
        const state = a.state || '';
        return {
          id: d.place_id,
          displayName: d.display_name,
          primary:   [road, sub].filter(Boolean).join(', ') || d.display_name.split(',')[0],
          secondary: [city, state].filter(Boolean).join(', '),
          lat: parseFloat(d.lat),
          lng: parseFloat(d.lon),
        };
      });
    } catch { return []; }
  }

  async function reverseGeocode(lat, lng) {
    const p = new URLSearchParams({lat, lon:lng, format:'jsonv2', zoom:17});
    try {
      const r = await fetch(`${CFG.nominatim}/reverse?${p}`, {
        headers: {'Accept-Language':'pt-BR,pt;q=0.9'}
      });
      if (!r.ok) return null;
      return (await r.json()).display_name || null;
    } catch { return null; }
  }

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
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }

  return { searchAddress, reverseGeocode, getOccurrences, createOccurrence };
})();
