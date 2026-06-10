/* ════════════════════════════════════════════════════
   API — Multi-source geocoding + backend CRUD
   Sources (priority order):
     1. Photon              — OSM com bias geográfico + número forçado
     2. Nominatim estruturado — street + housenumber param
     3. CEP range matching  — ViaCEP + BrasilAPI (melhor precisão BR)
     4. Nominatim livre     — fallback geral
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

  /* ── Brasil bounding box para bias geográfico ── */
  const BR_BBOX = '-73.99,-33.75,-34.79,5.27';

  /* ── Cidades candidatas quando não há cidade na query ── */
  /* Usadas em paralelo pelo _cepHouseSearch sem cidade */
  const _FALLBACK_CITIES = [
    { city: 'São Paulo',        uf: 'SP' },
    { city: 'Guarulhos',        uf: 'SP' },
    { city: 'Campinas',         uf: 'SP' },
    { city: 'Santo André',      uf: 'SP' },
    { city: 'Osasco',           uf: 'SP' },
    { city: 'São Bernardo do Campo', uf: 'SP' },
  ];

  /* ══ MERGE ════════════════════════════════════════ */
  function _merge(...lists) {
    const seen = new Set();
    const out  = [];
    for (const item of lists.flat()) {
      if (!item || seen.has(item.id)) continue;
      seen.add(item.id);
      out.push(item);
    }
    // Prioridade: tem número no primary label > _hasNum > resto
    out.sort((a, b) => {
      const aNum = _labelHasNumber(a.primary) ? 2 : (a._hasNum ? 1 : 0);
      const bNum = _labelHasNumber(b.primary) ? 2 : (b._hasNum ? 1 : 0);
      return bNum - aNum;
    });
    return out.slice(0, 8).map(({ _hasNum, ...r }) => r);
  }

  /* Verifica se o label já contém um número de rua (ex: "Rua X, 18") */
  function _labelHasNumber(primary) {
    return /,\s*\d+/.test(primary || '');
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

  /* ══ INJECT NUMBER INTO RESULT ════════════════════
   * Recebe um resultado sem número e retorna uma cópia
   * com o número injetado no primary label.
   * O ID recebe sufixo para evitar deduplicação com o original.
   * ════════════════════════════════════════════════ */
  function _injectNum(result, num) {
    if (!result || !num) return result;
    // Já tem número? não duplicar
    if (_labelHasNumber(result.primary)) return result;
    return {
      ...result,
      id: `${result.id}-n${num}`,
      primary: `${result.primary}, ${num}`,
      _hasNum: true,
    };
  }

  /* ══ SOURCE: VIACEP RAW ═══════════════════════════ */
  async function _viacepRaw(street, city, uf) {
    // Guard: ViaCEP exige cidade e UF preenchidos
    if (!city || !uf || city.trim().length < 2) return [];

    const cleanStreet = street
      .replace(/,?\s*\d+.*$/, '') // remove número se vier junto
      .trim();

    if (cleanStreet.length < 3) return [];

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
   * Usa ViaCEP complemento ranges para achar o CEP certo,
   * depois pega coordenadas exatas da BrasilAPI v2.
   *
   * NOVO: quando city é vazio, tenta cidades candidatas em paralelo.
   * ════════════════════════════════════════════════ */
  async function _cepHouseSearch(street, num, city, uf) {
    if (!num) return [];

    const detectedUf = uf || _detectUF(city) || 'SP';

    /* Quando temos cidade, busca direta */
    if (city && city.trim().length > 1) {
      return _cepHouseSearchForCity(street, num, city, detectedUf);
    }

    /* Sem cidade: tenta cidades candidatas em paralelo */
    const candidates = _FALLBACK_CITIES.filter(c =>
      !uf || c.uf === detectedUf
    );

    const settled = await Promise.allSettled(
      candidates.map(c => _cepHouseSearchForCity(street, num, c.city, c.uf))
    );

    const results = settled
      .filter(r => r.status === 'fulfilled' && r.value.length > 0)
      .flatMap(r => r.value);

    return results;
  }

  async function _cepHouseSearchForCity(street, num, city, uf) {
    if (!city || !uf) return [];
    try {
      const ceps = await _viacepRaw(street, city, uf);
      if (!ceps.length) return [];

      const targetNum = parseInt(num);
      if (isNaN(targetNum)) return [];

      let best = ceps.find(c => _cepCoversNumber(c.complemento, targetNum));
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

      const cepClean = best.cep.replace(/\D/g, '');
      const coords = await _brasilApiCep(cepClean);
      if (!coords.length) return [];

      return [{
        id:        `cep-num-${cepClean}-${num}`,
        primary:   `${best.logradouro || street}, ${num}`,
        secondary: [best.bairro, best.localidade || city, uf]
                     .filter(Boolean).join(', '),
        lat: coords[0].lat,
        lng: coords[0].lng,
        _hasNum: true,
      }];
    } catch { return []; }
  }

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

  /* ══ SOURCE: PHOTON — busca geral ════════════════ */
  async function _photon(q) {
    const p = new URLSearchParams({ q, lang:'pt', limit:6, bbox: BR_BBOX });
    try {
      const r = await fetch(`https://photon.komoot.io/api/?${p}`,
                            { headers: _headers });
      if (!r.ok) return [];
      const d = await r.json();
      return (d.features || []).map(_fmtPhoton).filter(Boolean);
    } catch { return []; }
  }

  /* ══ SOURCE: PHOTON — forçando número ════════════
   * Quando temos rua + número, tenta variações da query
   * com cidades conhecidas para aumentar chance de match.
   * ════════════════════════════════════════════════ */
  async function _photonWithNum(street, num) {
    const variants = [
      `${street}, ${num}, São Paulo`,
      `${street}, ${num}, SP`,
      `${street} ${num}`,
    ];

    const settled = await Promise.allSettled(
      variants.map(async (q) => {
        const p = new URLSearchParams({ q, lang:'pt', limit:3, bbox: BR_BBOX });
        const r = await fetch(`https://photon.komoot.io/api/?${p}`, { headers: _headers });
        if (!r.ok) return [];
        const d = await r.json();
        return (d.features || []).map(_fmtPhoton).filter(Boolean);
      })
    );

    return settled
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value);
  }

  /* ══ SOURCE: NOMINATIM LIVRE ══════════════════════ */
  async function _nominatimFree(q) {
    const p = new URLSearchParams({
      q, format:'jsonv2', addressdetails:1,
      limit:6, countrycodes:_country(),
    });
    try {
      const r = await fetch(`${_nominatim()}/search?${p}`,
                            { headers: _headers });
      if (!r.ok) return [];
      return (await r.json()).map(_fmtNominatim);
    } catch { return []; }
  }

  /* ══ SOURCE: NOMINATIM ESTRUTURADO ═══════════════
   * Usa parâmetros street + city separados — mais preciso
   * para house numbers do que a query livre.
   * city é opcional: sem ele ainda funciona para BR.
   * ════════════════════════════════════════════════ */
  async function _nominatimStructured(street, num, city) {
    const params = {
      format:'jsonv2', addressdetails:1, limit:5,
      countrycodes:_country(),
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

  /* ══ NOMINATIM ESTRUTURADO + CIDADES CANDIDATAS ══
   * Quando não há cidade na query, tenta em paralelo
   * com múltiplas cidades para aumentar cobertura.
   * ════════════════════════════════════════════════ */
  async function _nominatimStructuredMulti(street, num) {
    const cities = ['São Paulo', 'Guarulhos', 'Campinas', 'Osasco'];
    const settled = await Promise.allSettled(
      cities.map(c => _nominatimStructured(street, num, c))
    );
    return settled
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value);
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

  /* ══ ADDRESS PARSER ══════════════════════════════
   * Aceita formatos:
   *   "Rua X, 18"
   *   "Rua X, 18, São Paulo"
   *   "Rua X, 18, São Paulo, SP"
   *   "Av. Y, 1500 - Bairro, Cidade"
   * ════════════════════════════════════════════════ */
  function _parseAddress(q) {
    // Remove traço com bairro antes de parsear: "Rua X, 18 - Bairro" → "Rua X, 18"
    const normalized = q.replace(/\s*[-–]\s*[^,]+$/, '').trim();

    const m = normalized.match(
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

    /* ── Normalizar "RuaX123" → "Rua X, 123" ── */
    const norm = q
      .replace(/([a-záàãâéêíóôõúüç])(\d)/gi, '$1, $2')
      .replace(/,\s*,/g, ',')
      .trim();

    const parsed = _parseAddress(norm);

    /* ── Tarefas paralelas ── */
    const tasks = [];

    if (parsed) {
      const { street, num, city, uf } = parsed;
      const detectedUf = uf || _detectUF(city) || 'SP';

      /*
       * Grupo 1: fontes que usam o número diretamente
       * Estas têm maior chance de retornar house_number
       */
      tasks.push(_photonWithNum(street, num));
      tasks.push(_nominatimStructured(street, num, city));

      // Sem cidade: tenta Nominatim com várias cidades candidatas
      if (!city) {
        tasks.push(_nominatimStructuredMulti(street, num));
      }

      // CEP range matching
      tasks.push(_cepHouseSearch(street, num, city || '', detectedUf));

      // ViaCEP quando temos cidade + UF
      if (city && (uf || _detectUF(city))) {
        tasks.push(_viacepAndNominatim(street, city, detectedUf));
      }
    }

    /*
     * Grupo 2: fontes genéricas (rua sem número)
     * Sempre rodadas — servem de fallback para coordenadas da rua
     */
    tasks.push(_photon(norm));
    tasks.push(_nominatimFree(norm));

    const settled = await Promise.allSettled(tasks);
    const all = settled.flatMap(r =>
      r.status === 'fulfilled' ? r.value : []
    );

    let merged = _merge(all);

    /*
     * ── Injeção de número garantida ──
     * Se o usuário digitou um número e os resultados não o mostram,
     * injeta o número em TODOS os resultados que representam a mesma rua.
     * Assim o usuário sempre vê o que digitou refletido nos resultados.
     */
    if (parsed?.num && merged.length) {
      const num = parsed.num;
      merged = merged.map(r => {
        if (_labelHasNumber(r.primary)) return r; // já tem número, não duplicar
        return _injectNum(r, num);
      });

      // Re-sort: com número agora injetado, mantém consistência
      merged.sort((a, b) => {
        const aHas = _labelHasNumber(a.primary) ? 1 : 0;
        const bHas = _labelHasNumber(b.primary) ? 1 : 0;
        return bHas - aHas;
      });
    }

    return merged;
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
