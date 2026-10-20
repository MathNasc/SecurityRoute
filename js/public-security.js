/* ════════════════════════════════════════════════════
   PUBLIC SECURITY API CLIENT — js/public-security.js
   Consome os endpoints da API Public Security:
     1. GET  /occurrences (JSON & GeoJSON por bbox ou raio)
     2. GET  /occurrences/heatmap (Points + Hotspot Clusters)
     3. POST /route/safety (Análise de Corredor de Rota)
   ════════════════════════════════════════════════════ */

var PublicSecurityClient = (() => {
  const DEFAULT_URL = 'https://ais-pre-i62a2zwoizbmsr6t53awod-238922234262.us-east5.run.app/api/public/v1';
  const DEFAULT_KEY = 'test_api_key_123';

  let _map = null;
  let _hotspotsLayer = null;
  let _geojsonLayer = null;
  let _hotspotsActive = true;
  let _lastHotspots = [];
  let _lastHeatmapPoints = [];
  let _viewportTimer = null;
  let _loadedIds = new Set();
  let _status = { connected: false, count: 0, hotspots: 0, lastSync: null };

  function getBaseUrl() {
    return (
      window.ENV?.VITE_PUBLIC_SECURITY_API_URL ||
      (typeof CFG !== 'undefined' && CFG.publicSecurityUrl) ||
      DEFAULT_URL
    ).replace(/\/+$/, '');
  }

  function getApiKey() {
    return (
      window.ENV?.VITE_PUBLIC_SECURITY_API_KEY ||
      (typeof CFG !== 'undefined' && CFG.publicSecurityKey) ||
      DEFAULT_KEY
    );
  }

  function _getHeaders() {
    const key = getApiKey();
    return {
      'Content-Type': 'application/json',
      'X-API-Key': key,
      'Authorization': `Bearer ${key}`,
    };
  }

  function _buildQuery(params = {}) {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        sp.set(k, String(v));
      }
    });
    return sp.toString();
  }

  /* ── Requisição resiliente: tenta API direta (CORS *) e faz fallback para proxy backend ── */
  async function _request(path, options = {}) {
    const directUrl = `${getBaseUrl()}${path}`;
    const proxyUrl  = `/api/public-security${path}`;

    try {
      const res = await fetch(directUrl, {
        ...options,
        headers: { ..._getHeaders(), ...(options.headers || {}) },
      });
      if (res.ok) {
        _setConnected(true);
        return await res.json();
      }
    } catch (directErr) {
      // Fallback silencioso para rota proxy do servidor Node
    }

    const proxyRes = await fetch(proxyUrl, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
    if (!proxyRes.ok) {
      throw new Error(`Public Security API HTTP ${proxyRes.status}`);
    }
    _setConnected(true);
    return await proxyRes.json();
  }

  function _setConnected(connected) {
    _status.connected = connected;
    _status.lastSync = new Date();
    _updateStatusUI();
  }

  function _updateStatusUI() {
    const badge = document.getElementById('psApiStatusBadge');
    const meta  = document.getElementById('psApiMetaText');
    if (badge) {
      badge.textContent = _status.connected ? 'Conectado' : 'Aguardando';
      badge.style.background = _status.connected ? 'rgba(16,185,129,.15)' : 'rgba(245,158,11,.15)';
      badge.style.color = _status.connected ? '#10b981' : '#f59e0b';
      badge.style.borderColor = _status.connected ? 'rgba(16,185,129,.35)' : 'rgba(245,158,11,.35)';
    }
    if (meta) {
      meta.textContent = _status.connected
        ? `${_status.count} ocorrências oficiais • ${_status.hotspots} zonas críticas (hotspots)`
        : `Endpoint: ${getBaseUrl().replace(/^https?:\/\//, '').slice(0, 38)}…`;
    }
  }

  /* ── Mapeamento de categoria Public Security -> Security Route ── */
  function mapCategory(category) {
    if (!category) return 'robbery';
    const c = String(category).toLowerCase().trim();
    if (typeof TYPES !== 'undefined' && TYPES[c]) return c;
    const aliases = {
      roubo: 'robbery',
      furto: 'theft',
      roubo_veiculo: 'vehicle_robbery',
      furto_veiculo: 'vehicle_theft',
      lesao_corporal: 'bodily_harm',
      homicidio: 'homicide',
      crime_sexual: 'sexual_crime',
      entorpecentes: 'drug_related',
      trafico: 'drug_related',
    };
    return aliases[c] || 'robbery';
  }

  /* ── Normaliza item do endpoint GET /occurrences (JSON ou Feature GeoJSON) ── */
  function normalizeOccurrence(item) {
    if (!item) return null;

    // Caso seja uma Feature GeoJSON (geometry.coordinates = [lon, lat])
    if (item.type === 'Feature' && item.geometry?.coordinates) {
      const [lon, lat] = item.geometry.coordinates;
      const p = item.properties || {};
      return normalizeOccurrence({
        ...p,
        id: item.id || p.id,
        latitude: lat,
        longitude: lon,
      });
    }

    const lat = Number(item.latitude ?? item.lat);
    const lng = Number(item.longitude ?? item.lon ?? item.lng);
    if (isNaN(lat) || isNaN(lng)) return null;

    const typeKey = mapCategory(item.category || item.type);
    const occurredIso = item.occurredAt || item.createdAt || new Date().toISOString();

    const addrParts = [item.address, item.bairro, item.municipality, item.stateCode].filter(Boolean);
    const formattedAddress = addrParts.join(', ');

    const descParts = [];
    if (item.subcategory) descParts.push(item.subcategory);
    else if (item.categoryLabel) descParts.push(item.categoryLabel);
    if (item.description && item.description !== item.subcategory) descParts.push(item.description);

    return {
      id: item.id || `ps-${lat.toFixed(5)}-${lng.toFixed(5)}-${Date.now()}`,
      type: typeKey,
      category: item.category || typeKey,
      categoryLabel: item.categoryLabel || (typeof TYPES !== 'undefined' && TYPES[typeKey]?.label) || 'Ocorrência',
      severityWeight: typeof item.severityWeight === 'number' ? item.severityWeight : 0.75,
      subcategory: item.subcategory || null,
      sourceCategory: item.sourceCategory || null,
      lat,
      lng,
      latitude: lat,
      longitude: lng,
      createdAt: occurredIso,
      occurredAt: item.occurredAt || occurredIso,
      time: item.time || null,
      address: formattedAddress || item.address || null,
      rawAddress: item.address || null,
      bairro: item.bairro || null,
      municipality: item.municipality || null,
      stateCode: item.stateCode || null,
      boNumber: item.boNumber || null,
      delegacia: item.delegacia || null,
      sourceId: item.sourceId || 'SSP',
      distanceMeters: item.distanceMeters,
      distanceFromRouteMeters: item.distanceFromRouteMeters,
      nearestSegmentIndex: item.nearestSegmentIndex,
      description: descParts.join(' • '),
      isOfficial: true,
    };
  }

  /* ════════════════════════════════════════════════════
     ENDPOINT 1: GET /occurrences (JSON & GeoJSON)
     ════════════════════════════════════════════════════ */
  async function fetchOccurrences(params = {}) {
    const qs = _buildQuery({ limit: 400, ...params, format: 'json' });
    const res = await _request(`/occurrences${qs ? `?${qs}` : ''}`);
    const rawList = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
    const normalized = rawList.map(normalizeOccurrence).filter(Boolean);
    return {
      meta: res?.meta || { count: normalized.length },
      data: normalized,
    };
  }

  async function fetchOccurrencesGeoJSON(params = {}) {
    const qs = _buildQuery({ limit: 400, ...params, format: 'geojson' });
    return await _request(`/occurrences${qs ? `?${qs}` : ''}`);
  }

  function getGeoJSONUrl(params = {}) {
    const qs = _buildQuery({ ...params, format: 'geojson', apiKey: getApiKey() });
    return `${getBaseUrl()}/occurrences?${qs}`;
  }

  /* ════════════════════════════════════════════════════
     ENDPOINT 2: GET /occurrences/heatmap
     ════════════════════════════════════════════════════ */
  async function fetchHeatmapAndHotspots(params = {}) {
    const qs = _buildQuery({ gridSizeMeters: 300, limit: 1500, ...params });
    const res = await _request(`/occurrences/heatmap${qs ? `?${qs}` : ''}`);
    const points = Array.isArray(res?.points) ? res.points : [];
    const hotspots = Array.isArray(res?.hotspots) ? res.hotspots : [];
    _lastHeatmapPoints = points;
    _lastHotspots = hotspots;
    _status.hotspots = hotspots.length;
    _updateStatusUI();
    return {
      meta: res?.meta || { totalPoints: points.length, hotspotsCount: hotspots.length },
      points,
      hotspots,
    };
  }

  /* ════════════════════════════════════════════════════
     ENDPOINT 3: POST /route/safety
     ════════════════════════════════════════════════════ */
  async function analyzeRouteSafety(waypoints, options = {}) {
    if (!Array.isArray(waypoints) || waypoints.length < 2) {
      throw new Error('Waypoints insuficientes para análise de rota');
    }

    // Amostra até 60 pontos ao longo da rota para payload otimizado e preciso
    let sampled = waypoints;
    if (waypoints.length > 60) {
      const step = (waypoints.length - 1) / 59;
      sampled = [];
      for (let i = 0; i < 60; i++) {
        sampled.push(waypoints[Math.round(i * step)]);
      }
    }

    const formattedWaypoints = sampled.map(pt => {
      if (Array.isArray(pt)) return { lat: Number(pt[0]), lon: Number(pt[1]) };
      return {
        lat: Number(pt.lat ?? pt.latitude),
        lon: Number(pt.lon ?? pt.lng ?? pt.longitude),
      };
    });

    const body = {
      bufferMeters: options.bufferMeters ?? 300,
      category: options.category || 'robbery,vehicle_robbery,theft,vehicle_theft,bodily_harm,homicide,sexual_crime,drug_related',
      waypoints: formattedWaypoints,
    };

    const res = await _request('/route/safety', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (Array.isArray(res?.occurrences)) {
      res.occurrences = res.occurrences.map(normalizeOccurrence).filter(Boolean);
    }
    return res;
  }

  /* ════════════════════════════════════════════════════
     RENDERIZAÇÃO DE HOTSPOTS (ZONAS CRÍTICAS) NO MAPA
     ════════════════════════════════════════════════════ */
  function _riskLevelColor(level) {
    switch (level) {
      case 'critical': return '#ef4444';
      case 'high':     return '#f97316';
      case 'moderate': return '#eab308';
      case 'low':
      default:         return '#22c55e';
    }
  }

  function _riskLevelLabel(level) {
    switch (level) {
      case 'critical': return 'Crítico';
      case 'high':     return 'Alto Risco';
      case 'moderate': return 'Moderado';
      case 'low':
      default:         return 'Baixo';
    }
  }

  function renderHotspots(hotspots = _lastHotspots) {
    if (!_map) return;
    if (_hotspotsLayer) {
      _map.removeLayer(_hotspotsLayer);
      _hotspotsLayer = null;
    }
    if (!_hotspotsActive || !Array.isArray(hotspots) || !hotspots.length) return;

    _hotspotsLayer = L.layerGroup();

    hotspots.forEach(hs => {
      const lat = Number(hs.centerLatitude);
      const lng = Number(hs.centerLongitude);
      if (isNaN(lat) || isNaN(lng)) return;

      const color = _riskLevelColor(hs.riskLevel);
      const label = _riskLevelLabel(hs.riskLevel);
      const radius = Math.max(Number(hs.radiusMeters) || 200, 80);

      const catBreakdown = hs.categories
        ? Object.entries(hs.categories)
            .sort((a, b) => b[1] - a[1])
            .map(([k, cnt]) => {
              const tLabel = (typeof TYPES !== 'undefined' && TYPES[mapCategory(k)]?.label) || k;
              return `<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0;border-bottom:1px solid rgba(255,255,255,.06)">
                <span style="color:var(--tx2)">${tLabel}</span>
                <strong style="color:var(--tx1);font-family:var(--f-mono)">${cnt}</strong>
              </div>`;
            }).join('')
        : '';

      const circle = L.circle([lat, lng], {
        radius,
        color,
        weight: 1.8,
        opacity: 0.75,
        fillColor: color,
        fillOpacity: 0.14,
        dashArray: hs.riskLevel === 'critical' ? null : '5 6',
      });

      circle.bindPopup(`
        <div class="popup-card" style="min-width:210px">
          <div class="popup-head" style="border-left:3px solid ${color}">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
              <span class="popup-badge" style="background:${color}20;color:${color};border:1px solid ${color}40">
                ZONA DE RISCO • ${label.toUpperCase()}
              </span>
              <span style="font-family:var(--f-mono);font-size:12px;font-weight:700;color:${color}">
                ${hs.riskScore}/100
              </span>
            </div>
            <div class="popup-title" style="margin-top:4px">
              Predominância: ${hs.dominantCategoryLabel || hs.dominantCategory || 'Crimes'}
            </div>
            <div style="font-size:11px;color:var(--tx3);font-family:var(--f-mono);margin-top:2px">
              ${hs.occurrencesCount} ocorrências num raio de ${Math.round(radius)}m
            </div>
          </div>
          ${catBreakdown ? `<div class="popup-body" style="padding-top:8px">${catBreakdown}</div>` : ''}
        </div>
      `, { maxWidth: 280, className: 'sr-popup' });

      circle.on('click', (e) => {
        if (typeof MapMod !== 'undefined' && MapMod.isSelecting && MapMod.isSelecting()) {
          circle.closePopup();
          MapMod.triggerSelection(e.latlng);
          return;
        }
        if (typeof RoutePlanner !== 'undefined' && RoutePlanner.isPicking && RoutePlanner.isPicking()) {
          circle.closePopup();
          RoutePlanner.onMapClick(e.latlng.lat, e.latlng.lng);
        }
      });

      _hotspotsLayer.addLayer(circle);
    });

    _hotspotsLayer.addTo(_map);
  }

  function toggleHotspots() {
    _hotspotsActive = !_hotspotsActive;
    renderHotspots(_lastHotspots);
    return _hotspotsActive;
  }

  function isHotspotsActive() {
    return _hotspotsActive;
  }

  function getLastHeatmapPoints() {
    return _lastHeatmapPoints;
  }

  /* ════════════════════════════════════════════════════
     SINCRONIZAÇÃO AUTOMÁTICA POR JANELA DO MAPA (BBOX)
     ════════════════════════════════════════════════════ */
  async function syncViewport(mapInstance) {
    const m = mapInstance || _map;
    if (!m) return [];

    const b = m.getBounds();
    const bboxParams = {
      minLat: Number(b.getSouth().toFixed(6)),
      minLon: Number(b.getWest().toFixed(6)),
      maxLat: Number(b.getNorth().toFixed(6)),
      maxLon: Number(b.getEast().toFixed(6)),
      limit: 400,
    };

    const [occRes, heatRes] = await Promise.allSettled([
      fetchOccurrences(bboxParams),
      fetchHeatmapAndHotspots(bboxParams),
    ]);

    let newOccurrences = [];
    if (occRes.status === 'fulfilled' && Array.isArray(occRes.value?.data)) {
      const allInView = occRes.value.data;
      newOccurrences = allInView.filter(o => !_loadedIds.has(o.id));
      newOccurrences.forEach(o => _loadedIds.add(o.id));
      _status.count = _loadedIds.size;
      _updateStatusUI();

      if (newOccurrences.length > 0 && typeof Markers !== 'undefined') {
        Markers.addMany(newOccurrences);
        if (typeof Stats !== 'undefined') Stats.update();
      }
    }

    if (heatRes.status === 'fulfilled' && heatRes.value) {
      renderHotspots(heatRes.value.hotspots || []);
      if (typeof Heatmap !== 'undefined' && Heatmap.setApiPoints) {
        Heatmap.setApiPoints(heatRes.value.points || []);
      }
    }

    return newOccurrences;
  }

  function init(mapInstance) {
    _map = mapInstance;
    _updateStatusUI();

    if (_map) {
      _map.on('moveend', () => {
        clearTimeout(_viewportTimer);
        _viewportTimer = setTimeout(() => {
          syncViewport(_map).catch(() => {});
        }, 550);
      });
    }
  }

  function registerKnownIds(occs = []) {
    occs.forEach(o => {
      if (o && o.id) _loadedIds.add(o.id);
    });
    _status.count = _loadedIds.size;
    _updateStatusUI();
  }

  return {
    init,
    getBaseUrl,
    getApiKey,
    fetchOccurrences,
    fetchOccurrencesGeoJSON,
    getGeoJSONUrl,
    fetchHeatmapAndHotspots,
    analyzeRouteSafety,
    normalizeOccurrence,
    mapCategory,
    renderHotspots,
    toggleHotspots,
    isHotspotsActive,
    getLastHeatmapPoints,
    syncViewport,
    registerKnownIds,
  };
})();
