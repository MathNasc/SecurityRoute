/* ════════════════════════════════════════════════════
   API MODULE
   ════════════════════════════════════════════════════ */
const API = (() => {
  let _store = [...DEMO];
  let _nextId = 17;

  async function searchAddress(q) {
    if (!q || q.length < 3) return [];
    const p = new URLSearchParams({q,format:'jsonv2',addressdetails:1,limit:5,countrycodes:CFG.country});
    try {
      const r = await fetch(`${CFG.nominatim}/search?${p}`,{headers:{'Accept-Language':'pt-BR,pt;q=0.9'}});
      if (!r.ok) return [];
      const data = await r.json();
      return data.map(d => {
        const a = d.address||{};
        const road = a.road||a.pedestrian||a.path||'';
        const sub  = a.suburb||a.neighbourhood||a.quarter||'';
        const city = a.city||a.town||a.village||'';
        const state = a.state||'';
        const primary = [road,sub].filter(Boolean).join(', ')||d.display_name.split(',')[0];
        const secondary = [city,state].filter(Boolean).join(', ');
        return {id:d.place_id,displayName:d.display_name,primary,secondary,
                lat:parseFloat(d.lat),lng:parseFloat(d.lon)};
      });
    } catch(e){ return []; }
  }

  async function reverseGeocode(lat,lng) {
    const p = new URLSearchParams({lat,lon:lng,format:'jsonv2',zoom:17});
    try {
      const r = await fetch(`${CFG.nominatim}/reverse?${p}`,{headers:{'Accept-Language':'pt-BR,pt;q=0.9'}});
      if (!r.ok) return null;
      const d = await r.json();
      return d.display_name||null;
    } catch(e){ return null; }
  }

  async function getOccurrences() {
    if (!CFG.apiUrl) return [..._store];
    const r = await fetch(`${CFG.apiUrl}/occurrences`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }

  async function createOccurrence(occ) {
    const payload = {...occ, createdAt: new Date().toISOString()};
    if (!CFG.apiUrl) {
      const saved = {...payload, id:_nextId++};
      _store.push(saved);
      return saved;
    }
    const r = await fetch(`${CFG.apiUrl}/occurrences`,{
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }

  return {searchAddress,reverseGeocode,getOccurrences,createOccurrence};
})();
