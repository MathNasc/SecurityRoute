/* ════════════════════════════════════════════════════
   API — Multi-source geocoding + backend CRUD
   Sources (priority order):
     1. ViaCEP + BrasilAPI  — CEP range matching (melhor
        cobertura de numeração no Brasil)
     2. Photon              — OSM alternativo
     3. Nominatim livre     — fallback geral
     4. Nominatim estruturado — street + housenumber param
   ════════════════════════════════════════════════════ */
const API = (() => {
  let _store  = typeof DEMO !== 'undefined' ? [...DEMO] : [];
  let _nextId = 100;

  const _nominatim = () =>
    (typeof CFG !== 'undefined' && CFG.nominatim) ||
    'https://nominatim.openstreetmap.org';
  const _country = () =>
    (typeof CFG !== 'undefined' && CFG.country) || 'br';
  const _headers = { 'Accept-Language': 'pt-BR,pt;q=0.9' };

  /* ══ MERGE ════════════════════════════════════════ */
  function _merge(...lists) {
    const seen = new Set();
    const out  = [];
    for (const item of lists.flat()) {
      if (!item || seen.has(item.id)) continue;
      seen.add(item.id);
      out.push(item);
    }
    out.sort((a, b) => (b._hasNum ? 1 : 0) - (a._hasNum ? 1 : 0));
    return out.slice(0, 8).map(({ _hasNum, ...r }) => r);
  }

  /* ══ FORMAT HELPERS ═══════════════════════════════ */
  function _fmtNominatim(d) {
    const a    = d.address || {};
    const num  = a.house_number || '';
    const road = a.road || a.pedestrian || a.path || a.footway || '';
    const sub  = a.suburb || a.neighbourhood || a.quarter || '';
    const city = a.city || a.town || a.municipality || a.village || '';
    const state = a.state_district || a.state || '';
    const primary = road
      ? (num ? `${road}, ${num}` : road)
      : d.display_name.split(',')[0].trim();
    const secondary = [sub, city, state]
      .filter(Boolean).filter((v,i,a)=>v!==a[i-1]).join(', ');
    return { id:`nm-${d.place_id}`, primary, secondary,
             lat:parseFloat(d.lat), lng:parseFloat(d.lon), _hasNum:!!num };
  }

  function _fmtPhoton(f) {
    const p  = f.properties;
    const [lng, lat] = f.geometry.coordinates;
    const num  = p.housenumber || '';
    const road = p.street || p.name || '';
    const dist = p.district || p.suburb || '';
    const city = p.city || p.town || p.village || '';
    const state = p.state || '';
    if (!road && !p.name) return null;
    const primary = road ? (num ? `${road}, ${num}` : road) : p.name;
    const secondary = [dist, city, state]
      .filter(Boolean).filter((v,i,a)=>v!==a[i-1]).join(', ');
    return { id:`ph-${p.osm_id}-${p.osm_type}`, primary, secondary,
             lat, lng, _hasNum:!!num };
  }

  /* ══ SOURCE: VIACEP RAW ═══════════════════════════
   * Returns raw ViaCEP response (array of CEP objects)
   * Each object has { cep, logradouro, complemento,
   *                   bairro, localidade, uf }
   * complemento = "de 1 a 610 - lado par"
   * ════════════════════════════════════════════════ */
  async function _viacepRaw(street, city, uf) {
    const cleanStreet = street
      .replace(/,?\s*\d+.*$/, '') // remove trailing number
      .trim();
    const url = `https://viacep.com.br/ws/` +
      `${encodeURIComponent(uf)}/` +
      `${encodeURIComponent(city)}/` +
      `${encodeURIComponent(cleanStreet)}/json/`;
    try {
      const r = await fetch(url, { headers: _headers });
      if (!r.ok) return [];
      const data = await r.json();
      if (!Array.isArray(data) || data.erro) return [];
      return data;
    } catch { return []; }
  }

  /* ══ SOURCE: CEP HOUSE NUMBER MATCH ══════════════
   * Uses ViaCEP complemento ranges to find the right
   * CEP for a specific house number, then gets exact
   * coordinates from BrasilAPI v2.
   * ════════════════════════════════════════════════ */
  async function _cepHouseSearch(street, num, city, uf) {
    const detectedUf = uf || _detectUF(city);
    if (!detectedUf || !city) return [];

    try {
      const ceps = await _viacepRaw(street, city, detectedUf);
      if (!ceps.length) return [];

      const targetNum = parseInt(num);

      // Find CEP whose complemento range covers the house number
      let best = ceps.find(c => _cepCoversNumber(c.complemento, targetNum));
      // Fallback: closest range
      if (!best) {
        best = ceps.reduce((closest, c) => {
          const mid = _cepRangeMid(c.complemento);
          const prevMid = _cepRangeMid(closest?.complemento);
          if (mid === null) return closest;
          if (prevMid === null) return c;
          return Math.abs(mid - targetNum) < Math.abs(prevMid - targetNum) ? c : closest;
        }, ceps[0]);
      }
      if (!best) return [];

      // Get coordinates from BrasilAPI v2
      const cepClean = best.cep.replace(/\D/g, '');
      const coords = await _brasilApiCep(cepClean);
      if (!coords.length) return [];

      return [{
        id:        `cep-num-${cepClean}-${num}`,
        primary:   `${best.logradouro || street}, ${num}`,
        secondary: [best.bairro, best.localidade || city, detectedUf]
                     .filter(Boolean).join(', '),
        lat: coords[0].lat,
        lng: coords[0].lng,
        _hasNum: true,
      }];
    } catch { return []; }
  }

  /* Does ViaCEP complemento range cover this number? */
  function _cepCoversNumber(complemento, num) {
    if (!complemento || !num) return false;
    const m = complemento.match(/de\s*(\d+)\s*a\s*(\d+)/i);
    if (!m) return false;
    const start = parseInt(m[1]);
    const end   = parseInt(m[2]);
    if (num < start || num > end) return false;
    const isPar   =  /par/i.test(complemento) && !/ímpar|impar/i.test(complemento);
    const isImpar = /ímpar|impar/i.test(complemento);
    if (isPar   && num % 2 !== 0) return false;
    if (isImpar && num % 2 === 0) return false;
    return true;
  }

  /* Midpoint of a CEP range for "closest" fallback */
  function _cepRangeMid(complemento) {
    if (!complemento) return null;
    const m = complemento.match(/de\s*(\d+)\s*a\s*(\d+)/i);
    if (!m) return null;
    return (parseInt(m[1]) + parseInt(m[2])) / 2;
  }

  /* ══ SOURCE: BRASILAPI CEP v2 ═════════════════════ */
  async function _brasilApiCep(cep) {
    try {
      const r = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`);
      if (!r.ok) return [];
      const d = await r.json();
      if (d.errors) return [];
      const coords = d.location?.coordinates;
      if (!coords?.latitude) return [];
      return [{
        id:        `cep-${cep}`,
        primary:   d.street || `CEP ${d.cep}`,
        secondary: [d.neighborhood, d.city, d.state].filter(Boolean).join(', '),
        lat:       parseFloat(coords.latitude),
        lng:       parseFloat(coords.longitude),
        _hasNum:   false,
      }];
    } catch { return []; }
  }

  /* ══ SOURCE: PHOTON ═══════════════════════════════ */
  async function _photon(q) {
    const p = new URLSearchParams({ q, lang:'pt', limit:6,
      bbox:'-73.99,-33.75,-34.79,5.27' });
    try {
      const r = await fetch(`https://photon.komoot.io/api/?${p}`,
                            { headers: _headers });
      if (!r.ok) return [];
      const d = await r.json();
      return (d.features || []).map(_fmtPhoton).filter(Boolean);
    } catch { return []; }
  }

  /* ══ SOURCE: NOMINATIM FREE ═══════════════════════ */
  async function _nominatimFree(q) {
    const p = new URLSearchParams({ q, format:'jsonv2', addressdetails:1,
                                     limit:6, countrycodes:_country() });
    try {
      const r = await fetch(`${_nominatim()}/search?${p}`,
                            { headers: _headers });
      if (!r.ok) return [];
      return (await r.json()).map(_fmtNominatim);
    } catch { return []; }
  }

  /* ══ SOURCE: NOMINATIM STRUCTURED ════════════════ */
  async function _nominatimStructured(street, num, city) {
    const params = { format:'jsonv2', addressdetails:1, limit:5,
                     countrycodes:_country(),
                     street:`${num} ${street}` };
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

  /* ══ UF DETECTION ════════════════════════════════ */
  const _ufMap = {
    'são paulo':'SP','sao paulo':'SP','sp':'SP',
    'guarulhos':'SP','campinas':'SP','osasco':'SP','santos':'SP',
    'são bernardo do campo':'SP','santo andré':'SP','sorocaba':'SP',
    'ribeirão preto':'SP','mauá':'SP','carapicuíba':'SP',
    'rio de janeiro':'RJ','rj':'RJ','niterói':'RJ',
    'belo horizonte':'MG','mg':'MG','uberlândia':'MG','contagem':'MG',
    'salvador':'BA','ba':'BA','feira de santana':'BA',
    'fortaleza':'CE','ce':'CE',
    'curitiba':'PR','pr':'PR','londrina':'PR',
    'porto alegre':'RS','rs':'RS','caxias do sul':'RS',
    'recife':'PE','pe':'PE','olinda':'PE',
    'manaus':'AM','am':'AM',
    'belém':'PA','pa':'PA',
    'goiânia':'GO','go':'GO',
    'brasília':'DF','df':'DF',
  };

  function _detectUF(city) {
    if (!city) return null;
    return _ufMap[city.toLowerCase().trim()] || null;
  }

  /* ══ ADDRESS PARSER ══════════════════════════════ */
  function _parseAddress(q) {
    // "Street name, NUMBER[, City[, UF]]"
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

  /* ══ MAIN SEARCH ═════════════════════════════════ */
  async function searchAddress(q) {
    if (!q || q.length < 3) return [];
    q = q.trim();

    /* ── CEP direto: 01234-567 ou 01234567 ── */
    const cepClean = q.replace(/\D/g, '');
    if (/^\d{8}$/.test(cepClean)) {
      const [br] = await Promise.allSettled([_brasilApiCep(cepClean)]);
      const direct = br.status === 'fulfilled' ? br.value : [];
      if (direct.length) return _merge(direct);
      return _merge(await _nominatimFree(q));
    }

    /* ── Normalizar "Rua X123" → "Rua X, 123" ── */
    const norm = q
      .replace(/([a-záàãâéêíóôõúüç])(\d)/gi, '$1, $2')
      .replace(/,\s*,/g, ',')
      .trim();

    const parsed = _parseAddress(norm);

    /* ── Tarefas paralelas ── */
    const tasks = [
      _photon(norm),
      _nominatimFree(norm),
    ];

    if (parsed) {
      /* Busca estruturada no Nominatim */
      tasks.push(_nominatimStructured(parsed.street, parsed.num, parsed.city));

      /* ★ CEP range matching — a melhor fonte para numeração no BR */
      const uf   = parsed.uf || _detectUF(parsed.city);
      const city = parsed.city;
      if (city || uf) {
        tasks.push(_cepHouseSearch(parsed.street, parsed.num, city || '', uf || ''));
      }

      /* ViaCEP + Nominatim quando temos cidade + UF */
      if (city && uf) {
        tasks.push(_viacepAndNominatim(parsed.street, city, uf));
      }
    }

    const settled = await Promise.allSettled(tasks);
    return _merge(settled.flatMap(r =>
      r.status === 'fulfilled' ? r.value : []
    ));
  }

  /* ViaCEP street list → geocoded via BrasilAPI */
  async function _viacepAndNominatim(street, city, uf) {
    const ceps = await _viacepRaw(street, city, uf);
    if (!ceps.length) return [];
    const results = await Promise.allSettled(
      ceps.slice(0, 3).map(c => _brasilApiCep(c.cep.replace(/\D/g, '')))
    );
    return results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
  }

  /* ══ REVERSE GEOCODE ══════════════════════════════ */
  async function reverseGeocode(lat, lng) {
    const p = new URLSearchParams({ lat, lon:lng, format:'jsonv2', zoom:18 });
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

  /* ══ OCCURRENCES CRUD ═════════════════════════════ */
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

  const search = searchAddress;
  return { searchAddress, search, reverseGeocode, getOccurrences, createOccurrence };
})();
