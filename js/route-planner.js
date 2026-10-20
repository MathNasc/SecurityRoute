/* ════════════════════════════════════════════════════
   ROUTE PLANNER — js/route-planner.js
   Fixes:
     1. Uses MapMod.getMap() instead of private _map
     2. Waypoint inputs accept typed addresses via
        Nominatim autocomplete (same pattern as sidebar)
   ════════════════════════════════════════════════════ */

var RoutePlanner = (() => {
  // ── State ──────────────────────────────────────────
  let _oLat = null, _oLng = null, _oLabel = '';
  let _dLat = null, _dLng = null, _dLabel = '';
  let _profile  = 'driving';
  let _pickMode = null;       // 'origin' | 'dest' | null
  let _routeLayers  = [];
  let _originMarker = null;
  let _destMarker   = null;
  let _lastRoutes   = [];
  let _selectedIdx  = 0;

  // Always get the map from MapMod — never cache it at module load time
  const map = () => MapMod.getMap();

  // ── Pin icons ───────────────────────────────────────
  const _pinIcon = (type) => {
    const isOrigin = type === 'origin';
    const fill = isOrigin ? '#10b981' : '#f43f5e';
    
    let svg = isOrigin 
      ? `<svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#131722" stroke="${fill}" stroke-width="3"/><circle cx="12" cy="12" r="4" fill="${fill}"/></svg>`
      : `<svg width="24" height="34" viewBox="0 0 24 34"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="${fill}" stroke="#131722" stroke-width="2"/><circle cx="12" cy="9" r="3.5" fill="#131722"/></svg>`;
      
    return L.divIcon({
      html: `<div style="filter:drop-shadow(0 4px 6px rgba(0,0,0,0.5)); display:flex;">${svg}</div>`,
      className: '',
      iconSize: isOrigin ? [24, 24] : [24, 34],
      iconAnchor: isOrigin ? [12, 12] : [12, 34],
    });
  };

  // ── CSS variable resolver ───────────────────────────
  function _resolveColor(c) {
    if (!c) return '#888';
    if (c.startsWith('var(')) {
      return getComputedStyle(document.documentElement)
        .getPropertyValue(c.slice(4, -1)).trim() || '#888';
    }
    return c;
  }

  // ── Polyline style ──────────────────────────────────
  function _lineStyle(route, selected, isGlow = false) {
    const color = _resolveColor(route.safetyColor);
    if (isGlow) {
      return {
        color,
        weight:    selected ? 12 : 8,
        opacity:   selected ? 0.25 : 0.15,
        dashArray: selected ? null : '8 10',
        lineCap:   'round',
        lineJoin:  'round',
      };
    }
    return {
      color,
      weight:    selected ? 5 : 3,
      opacity:   selected ? 1.0 : 0.7,
      dashArray: selected ? null : '6 8',
      lineCap:   'round',
      lineJoin:  'round',
    };
  }

  // ── Map picking hint ────────────────────────────────
  function _setPickMode(mode) {
    _pickMode = mode;
    const hint = document.getElementById('rpHint');
    const dot  = document.getElementById('rpHintDot');
    const txt  = document.getElementById('rpHintTxt');

    document.getElementById('rpPickOrigin')?.classList.toggle('active', mode === 'origin');
    document.getElementById('rpPickDest')?.classList.toggle('active',   mode === 'dest');

    if (!mode) {
      hint?.classList.remove('vis');
      document.body.classList.remove('picking-route');
      return;
    }
    document.body.classList.add('picking-route');
    if (dot) dot.style.background = mode === 'origin' ? 'var(--green)' : 'var(--sec)';
    if (txt) txt.textContent = mode === 'origin'
      ? 'Clique no mapa para definir a ORIGEM'
      : 'Clique no mapa para definir o DESTINO';
    hint?.classList.add('vis');
  }

  // ── Address autocomplete ────────────────────────────
  function _initAddressSearch(inputId, acId, onSelect) {
    const inp = document.getElementById(inputId);
    const ac  = document.getElementById(acId);
    if (!inp || !ac) return;

    let timer;

    function _closeAC() { ac.classList.remove('open'); ac.innerHTML = ''; }

    inp.addEventListener('input', () => {
      clearTimeout(timer);
      const v = inp.value.trim();
      if (v.length < (/\d/.test(v) ? 4 : 3)) { _closeAC(); return; }

      timer = setTimeout(async () => {
        const results = await (API.searchAddress || API.search).call(API, v);
        if (!results.length) { _closeAC(); return; }

        ac.innerHTML = results.map(r => `
          <div class="rp-ac-item"
               data-lat="${r.lat}"
               data-lng="${r.lng}"
               data-primary="${_esc(r.primary)}">
            <div class="rp-ac-ico">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <div style="min-width:0">
              <div class="rp-ac-p">${_rpHighlight(r.primary, v)}</div>
              ${r.secondary ? `<div class="rp-ac-s">${_esc(r.secondary)}</div>` : ''}
            </div>
          </div>`).join('');

        ac.classList.add('open');

        ac.querySelectorAll('.rp-ac-item').forEach(item => {
          item.addEventListener('click', () => {
            const lat   = parseFloat(item.dataset.lat);
            const lng   = parseFloat(item.dataset.lng);
            const label = item.dataset.primary;
            inp.value   = label;
            _closeAC();
            onSelect(lat, lng, label);
            MapMod.flyTo(lat, lng, 16);
          });
        });
      }, 380);
    });

    inp.addEventListener('keydown', e => {
      if (e.key === 'Escape') _closeAC();
    });

    document.addEventListener('click', e => {
      if (!e.target.closest(`#${inputId}`) && !e.target.closest(`#${acId}`)) {
        _closeAC();
      }
    });
  }

  function _rpHighlight(text, query) {
    if (!query || !text) return _esc(text);
    const words = query.trim().split(/\s+/).filter(w => w.length > 1);
    if (!words.length) return _esc(text);
    // Build ONE combined pattern applied ONCE — prevents matching inside <mark> tags
    const pattern = words
      .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|');
    return _esc(text).replace(
      new RegExp(`(${pattern})`, 'gi'),
      '<mark style="background:rgba(255,107,43,.25);color:inherit;border-radius:2px;padding:0 1px">$1</mark>'
    );
  }

  function _esc(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  // ── Set origin ──────────────────────────────────────
  function _setOrigin(lat, lng, label) {
    _oLat = lat; _oLng = lng; _oLabel = label;
    const inp = document.getElementById('rpOriginInp');
    if (inp) inp.value = label;
    if (_originMarker) _originMarker.remove();
    _originMarker = L.marker([lat, lng], { icon: _pinIcon('origin'), zIndexOffset: 1000 })
      .addTo(map())
      .bindPopup('<strong style="font-size:13px">Origem</strong>');
    _checkReady();
  }

  // ── Set destination ─────────────────────────────────
  function _setDest(lat, lng, label) {
    _dLat = lat; _dLng = lng; _dLabel = label;
    const inp = document.getElementById('rpDestInp');
    if (inp) inp.value = label;
    if (_destMarker) _destMarker.remove();
    _destMarker = L.marker([lat, lng], { icon: _pinIcon('dest'), zIndexOffset: 1000 })
      .addTo(map())
      .bindPopup('<strong style="font-size:13px">Destino</strong>');
    _checkReady();
  }

  // ── Enable/disable calc button ─────────────────────
  function _checkReady() {
    const btn = document.getElementById('rpCalcBtn');
    if (btn) btn.disabled = !(_oLat && _dLat);
  }

  // ── Clear route layers ─────────────────────────────
  function _clearRoutes() {
    _routeLayers.forEach(l => map().removeLayer(l));
    _routeLayers = [];
  }

  // ── Draw routes on map ─────────────────────────────
  function _drawRoutes(routes, selectedIdx) {
    _clearRoutes();

    // Unselected routes first (lower z-order)
    routes.forEach((rt, i) => {
      if (i === selectedIdx) return;
      const glow = L.polyline(rt.coords, { ..._lineStyle(rt, false, true), interactive: false }).addTo(map());
      const line = L.polyline(rt.coords, { ..._lineStyle(rt, false, false), interactive: true }).addTo(map());
      line.on('click', (e) => {
        if (typeof MapMod !== 'undefined' && MapMod.isSelecting && MapMod.isSelecting()) {
          MapMod.triggerSelection(e.latlng);
          return;
        }
        if (_pickMode) {
          onMapClick(e.latlng.lat, e.latlng.lng);
          return;
        }
        _selectRoute(i);
      });
      _routeLayers.push(glow, line);
    });

    // Selected route on top
    const sel     = routes[selectedIdx];
    const selGlow = L.polyline(sel.coords, { ..._lineStyle(sel, true, true), interactive: false }).addTo(map());
    const selLine = L.polyline(sel.coords, { ..._lineStyle(sel, true, false), interactive: true }).addTo(map());
    selLine.on('click', (e) => {
      if (typeof MapMod !== 'undefined' && MapMod.isSelecting && MapMod.isSelecting()) {
        MapMod.triggerSelection(e.latlng);
        return;
      }
      if (_pickMode) {
        onMapClick(e.latlng.lat, e.latlng.lng);
        return;
      }
      _selectRoute(selectedIdx);
    });
    _routeLayers.push(selGlow, selLine);

    // Critical segments from Public Security API (POST /route/safety) on selected route
    if (Array.isArray(sel.criticalSegments) && sel.criticalSegments.length) {
      sel.criticalSegments.forEach(seg => {
        if (!seg.from || !seg.to) return;
        const segColor = seg.riskLevel === 'critical' ? '#ef4444' : seg.riskLevel === 'high' ? '#f97316' : '#eab308';
        const segLine = L.polyline(
          [[seg.from.lat, seg.from.lon], [seg.to.lat, seg.to.lon]],
          {
            color: segColor,
            weight: 7,
            opacity: 0.92,
            dashArray: '10 6',
            lineCap: 'round',
          }
        ).addTo(map()).bindPopup(`
          <div style="padding:8px 10px;font-size:12px;min-width:170px">
            <strong style="color:${segColor}">⚠️ Trecho Crítico (${seg.riskScore}/100)</strong><br/>
            <span>Predominância: <strong>${_esc(seg.dominantCategoryLabel || seg.dominantCategory || 'Roubo')}</strong></span><br/>
            <span>${seg.occurrencesCount} ocorrências em ${Math.round(seg.lengthMeters || 0)}m</span>
          </div>`);
        _routeLayers.push(segLine);
      });
    }

    // Hotspot circles on selected route
    sel.hotspots.forEach(hs => {
      const circle = L.circleMarker([hs.lat, hs.lng], {
        radius: 8, color: '#131722', weight: 2,
        fillColor: '#f43f5e', fillOpacity: 0.9,
      }).addTo(map()).bindPopup(`
        <div style="padding:8px 10px;font-size:12px;min-width:150px">
          <strong style="color:#ef4444">⚠️ ${hs.label ? _esc(hs.label) : 'Área de risco'}</strong><br/>
          ${hs.count} ocorrência${hs.count > 1 ? 's' : ''} próximas${hs.distanceMeters !== undefined ? ` (${Math.round(hs.distanceMeters)}m da rota)` : ''}
        </div>`);
      circle.on('click', (e) => {
        if (typeof MapMod !== 'undefined' && MapMod.isSelecting && MapMod.isSelecting()) {
          circle.closePopup();
          MapMod.triggerSelection(e.latlng);
          return;
        }
        if (_pickMode) {
          circle.closePopup();
          onMapClick(e.latlng.lat, e.latlng.lng);
          return;
        }
      });
      _routeLayers.push(circle);
    });
  }

  // ── Select route card ──────────────────────────────
  function _selectRoute(idx) {
    _selectedIdx = idx;
    _drawRoutes(_lastRoutes, idx);
    document.querySelectorAll('.rp-card')
      .forEach((el, i) => el.classList.toggle('on', i === idx));
  }

  function _mapApiRiskLevel(riskLevel, riskScore) {
    if (riskLevel === 'critical' || riskScore > 75) {
      return { safetyLevel: 'Crítico', safetyColor: 'var(--risk-critical)', safetyColorHex: '#ef4444' };
    }
    if (riskLevel === 'high' || riskScore > 50) {
      return { safetyLevel: 'Alto', safetyColor: 'var(--risk-high)', safetyColorHex: '#f97316' };
    }
    if (riskLevel === 'moderate' || riskScore > 25) {
      return { safetyLevel: 'Médio', safetyColor: 'var(--risk-moderate)', safetyColorHex: '#eab308' };
    }
    return { safetyLevel: 'Baixo', safetyColor: 'var(--risk-low)', safetyColorHex: '#22c55e' };
  }

  // ── Main calculation ───────────────────────────────
  async function _calculate() {
    const btn     = document.getElementById('rpCalcBtn');
    const results = document.getElementById('rpResults');

    btn.disabled = true;
    results.innerHTML = `<div class="rp-loading">
      <div class="rp-spinner"></div>Consultando Public Security API e analisando corredor de rota…
    </div>`;
    _clearRoutes();

    // Profile warning for non-driving on public OSRM
    const isPublicOSRM = !(typeof CFG !== 'undefined' && CFG.osrm &&
      CFG.osrm !== 'https://router.project-osrm.org');
    if (isPublicOSRM && _profile !== 'driving') {
      Toast.warn(
        'Perfil limitado',
        'O servidor público OSRM só garante "Carro". Use uma instância própria para outros perfis.',
        5000
      );
    }

    try {
      const routes = await OSRMClient.getRoutes(_oLat, _oLng, _dLat, _dLng, _profile);

      const incidents = (typeof Markers !== 'undefined' ? Markers : MK).getAll();
      const now = new Date();

      // Avalia cada rota no motor local + endpoint POST /route/safety da Public Security API
      const scored = await Promise.all(routes.map(async (rt) => {
        const localEval = RiskEngine.score(rt.coords, incidents, now);

        if (typeof PublicSecurityClient !== 'undefined') {
          try {
            const apiSafety = await PublicSecurityClient.analyzeRouteSafety(rt.coords, { bufferMeters: 300 });
            if (apiSafety && apiSafety.routeSummary) {
              const summary = apiSafety.routeSummary;
              const apiRiskScore = Math.max(0, Math.min(100, Math.round(100 - Number(summary.safetyScore ?? 100))));
              const finalRiskScore = summary.totalOccurrencesInCorridor > 0
                ? apiRiskScore
                : Math.max(apiRiskScore, localEval.riskScore);

              const levelMeta = _mapApiRiskLevel(
                summary.totalOccurrencesInCorridor > 0 ? summary.riskLevel : null,
                finalRiskScore
              );

              // Converte trechos críticos e ocorrências do corredor em hotspots visuais
              const apiHotspots = [];
              if (Array.isArray(apiSafety.criticalSegments)) {
                apiSafety.criticalSegments.forEach(seg => {
                  if (seg.from && seg.to) {
                    apiHotspots.push({
                      lat: (seg.from.lat + seg.to.lat) / 2,
                      lng: (seg.from.lon + seg.to.lon) / 2,
                      score: seg.riskScore || 50,
                      count: seg.occurrencesCount || 1,
                      label: seg.dominantCategoryLabel || 'Trecho crítico',
                    });
                  }
                });
              }

              // Adiciona ocorrências do corredor no mapa caso ainda não estejam visíveis
              if (Array.isArray(apiSafety.occurrences) && apiSafety.occurrences.length > 0) {
                const existingIds = new Set(Markers.getAll().map(o => String(o.id)));
                const freshCorridorOccs = apiSafety.occurrences.filter(o => o && !existingIds.has(String(o.id)));
                if (freshCorridorOccs.length > 0) {
                  Markers.addMany(freshCorridorOccs);
                  if (typeof Stats !== 'undefined') Stats.update();
                }
              }

              return {
                ...rt,
                ...localEval,
                riskScore: finalRiskScore,
                safetyScore: summary.safetyScore ?? (100 - finalRiskScore),
                safetyLevel: levelMeta.safetyLevel,
                safetyColor: levelMeta.safetyColor,
                safetyColorHex: levelMeta.safetyColorHex,
                totalOccurrencesInCorridor: summary.totalOccurrencesInCorridor ?? 0,
                bufferMeters: summary.bufferMeters ?? 300,
                categoryBreakdown: summary.categoryBreakdown || {},
                criticalSegments: apiSafety.criticalSegments || [],
                corridorOccurrences: apiSafety.occurrences || [],
                hotspots: apiHotspots.length ? apiHotspots : localEval.hotspots,
                fromPublicSecurityApi: true,
              };
            }
          } catch (apiErr) {
            console.warn('[RoutePlanner] Fallback para motor local:', apiErr.message);
          }
        }

        return {
          ...rt,
          ...localEval,
          safetyScore: 100 - localEval.riskScore,
          totalOccurrencesInCorridor: localEval.hotspots.reduce((acc, h) => acc + h.count, 0),
          bufferMeters: 300,
          categoryBreakdown: {},
          criticalSegments: [],
          corridorOccurrences: [],
          fromPublicSecurityApi: false,
        };
      }));

      const fastestIdx = scored.reduce((b, r, i) => r.durationMin < scored[b].durationMin ? i : b, 0);
      const safestIdx  = scored.reduce((b, r, i) => r.riskScore  < scored[b].riskScore  ? i : b, 0);
      scored.forEach((r, i) => { r.isFastest = i === fastestIdx; r.isSafest = i === safestIdx; });

      scored.sort((a, b) => a.riskScore - b.riskScore);
      _lastRoutes  = scored;
      _selectedIdx = 0;

      _drawRoutes(scored, 0);
      _renderCards(scored);

      const allCoords = scored.flatMap(r => r.coords);
      if (allCoords.length) {
        map().fitBounds(L.latLngBounds(allCoords).pad(0.14), { animate: true, duration: 0.6 });
      }

      Toast.success(
        `${scored.length} rota${scored.length > 1 ? 's' : ''} analisada${scored.length > 1 ? 's' : ''}`,
        `Mais segura: Risco ${scored[0].safetyLevel} (Segurança ${scored[0].safetyScore ?? (100 - scored[0].riskScore)}/100)`
      );

    } catch (err) {
      console.error('[RoutePlanner] Erro:', err);
      results.innerHTML = `<div class="rp-empty" style="color:var(--sec)">
        <span class="rp-empty-icon">⚠️</span>${err.message}
      </div>`;
      Toast.error('Erro ao calcular rota', err.message);
    } finally {
      btn.disabled = false;
    }
  }

  // ── Render result cards ────────────────────────────
  function _renderCards(routes) {
    const el = document.getElementById('rpResults');
    el.innerHTML = `<span class="rp-results-label">Rotas calculadas</span>
      <div class="rp-route-list" id="rpRouteList"></div>`;
    const list = document.getElementById('rpRouteList');

    routes.forEach((rt, i) => {
      const card     = document.createElement('div');
      const hexColor = _resolveColor(rt.safetyColor);
      card.className = `rp-card${i === 0 ? ' on' : ''}`;
      card.style.borderTopColor = hexColor;

      const icon = rt.isSafest
        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;

      const breakdownEntries = Object.entries(rt.categoryBreakdown || {}).filter(([, c]) => c > 0);
      const breakdownHtml = breakdownEntries.length
        ? `<div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px">
            ${breakdownEntries.map(([cat, count]) => {
              const tKey = typeof PublicSecurityClient !== 'undefined' ? PublicSecurityClient.mapCategory(cat) : cat;
              const tObj = (typeof TYPES !== 'undefined' && TYPES[tKey]) || { label: cat, color: '#f43f5e' };
              return `<span style="font-size:10px;font-family:var(--f-mono);padding:2px 7px;border-radius:6px;background:${tObj.color}18;color:${tObj.color};border:1px solid ${tObj.color}35">
                ${_esc(tObj.label)}: <strong>${count}</strong>
              </span>`;
            }).join('')}
          </div>`
        : '';

      const zonesCount = rt.criticalSegments?.length || rt.hotspots?.length || 0;

      card.innerHTML = `
        <div class="rp-card-head">
          <div class="rp-card-title">
            <div class="rp-card-icon" style="background:${hexColor}18;color:${hexColor}">${icon}</div>
            ${rt.isSafest ? 'Rota mais segura' : rt.isFastest ? 'Rota mais rápida' : `Alternativa ${i + 1}`}
          </div>
          <div class="rp-tag-row">
            ${rt.isSafest  ? '<span class="rp-tag rp-tag-safest">Segura</span>'  : ''}
            ${rt.isFastest ? '<span class="rp-tag rp-tag-fastest">Rápida</span>' : ''}
            ${rt.isNight   ? '<span class="rp-tag rp-tag-night">🌙 Noite</span>' : ''}
          </div>
        </div>

        <div class="rp-risk-wrap">
          <div class="rp-risk-head">
            <span class="rp-risk-lbl">Risco no Corredor (${rt.bufferMeters || 300}m)</span>
            <span class="rp-risk-val" style="color:${hexColor}">${rt.safetyLevel} — ${rt.riskScore}/100</span>
          </div>
          <div class="rp-bar-bg">
            <div class="rp-bar-fill" style="width:${rt.riskScore}%;background:${hexColor}"></div>
          </div>
        </div>

        <div class="rp-meta-grid">
          <div class="rp-meta-box">
            <div class="rp-meta-l">Distância</div>
            <div class="rp-meta-v">${rt.distanceKm}<small> km</small></div>
          </div>
          <div class="rp-meta-box">
            <div class="rp-meta-l">Tempo</div>
            <div class="rp-meta-v">${rt.durationMin}<small> min</small></div>
          </div>
          <div class="rp-meta-box">
            <div class="rp-meta-l">No corredor</div>
            <div class="rp-meta-v" style="color:${(rt.totalOccurrencesInCorridor || zonesCount) ? '#ef4444' : 'var(--green)'}">
              ${rt.totalOccurrencesInCorridor || zonesCount}<small> ocorr.</small>
            </div>
          </div>
        </div>

        ${breakdownHtml}

        ${rt.criticalSegments && rt.criticalSegments.length ? `
          <div class="rp-hotspots">
            <div class="rp-hs-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              </svg>
              Trechos críticos na rota (${rt.criticalSegments.length})
            </div>
            ${rt.criticalSegments.slice(0, 4).map(seg => `
              <div class="rp-hs-item">
                <div class="rp-hs-dot"></div>
                <span><strong>${_esc(seg.dominantCategoryLabel || seg.dominantCategory || 'Risco')}</strong>: ${seg.occurrencesCount} ocorr. (${Math.round(seg.lengthMeters || 0)}m) — Risco ${seg.riskScore}/100</span>
              </div>`).join('')}
          </div>` : rt.hotspots.length ? `
          <div class="rp-hotspots">
            <div class="rp-hs-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              </svg>
              Zonas de risco na rota
            </div>
            ${rt.hotspots.map(hs => `
              <div class="rp-hs-item">
                <div class="rp-hs-dot"></div>
                ${hs.count} ocorrência${hs.count > 1 ? 's' : ''} — risco local ${Number(hs.score || 0).toFixed(1)}pt
              </div>`).join('')}
          </div>` : ''}

        <div class="rp-export-row">
          <a class="rp-export-btn" href="${_googleMapsUrl(rt)}" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            Google Maps
          </a>
          <a class="rp-export-btn" href="${_wazeUrl(rt)}" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
            Waze
          </a>
          <a class="rp-export-btn" href="${_appleMapsUrl(rt)}" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/><path d="M12 6v6l4 2"/></svg>
            Apple Maps
          </a>
        </div>
      `;

      card.addEventListener('click', () => _selectRoute(i));
      list.appendChild(card);
    });
  }

  // ── Export URL builders ────────────────────────────
  function _googleMapsUrl(route) {
    const o = `${_oLat},${_oLng}`;
    const d = `${_dLat},${_dLng}`;
    const mode = { foot: 'walking', driving: 'driving', cycling: 'bicycling' }[_profile] || 'driving';
    return `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${d}&travelmode=${mode}`;
  }

  function _wazeUrl(route) {
    return `https://waze.com/ul?ll=${_dLat},${_dLng}&navigate=yes&from=ll.${_oLat},${_oLng}`;
  }

  function _appleMapsUrl(route) {
    const mode = _profile === 'foot' ? 'w' : _profile === 'cycling' ? 'b' : 'd';
    return `maps://maps.apple.com/?saddr=${_oLat},${_oLng}&daddr=${_dLat},${_dLng}&dirflg=${mode}`;
  }

  // ── Public: handle map click ───────────────────────
  function onMapClick(lat, lng) {
    if (!_pickMode) return false;
    const mode = _pickMode;
    _setPickMode(null);

    const fallbackLabel = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    if (mode === 'origin') _setOrigin(lat, lng, fallbackLabel);
    else                   _setDest(lat, lng, fallbackLabel);

    // Upgrade label with reverse geocode
    API.reverseGeocode(lat, lng).then(addr => {
      if (!addr) return;
      const label = addr.split(',').slice(0, 2).join(', ');
      if (mode === 'origin') {
        _oLabel = label;
        const inp = document.getElementById('rpOriginInp');
        if (inp) inp.value = label;
      } else {
        _dLabel = label;
        const inp = document.getElementById('rpDestInp');
        if (inp) inp.value = label;
      }
    }).catch(() => {});

    return true;
  }

  // ── Public: init ────────────────────────────────────
  function init() {
    // Address autocomplete for origin
    _initAddressSearch('rpOriginInp', 'rpOriginAC', (lat, lng, label) => {
      _setOrigin(lat, lng, label);
    });

    // Address autocomplete for destination
    _initAddressSearch('rpDestInp', 'rpDestAC', (lat, lng, label) => {
      _setDest(lat, lng, label);
    });

    // Pick-on-map buttons
    document.getElementById('rpPickOrigin')?.addEventListener('click', () => {
      _setPickMode(_pickMode === 'origin' ? null : 'origin');
    });
    document.getElementById('rpPickDest')?.addEventListener('click', () => {
      _setPickMode(_pickMode === 'dest' ? null : 'dest');
    });

    // Swap
    document.getElementById('rpSwap')?.addEventListener('click', () => {
      const [oL, oN, oLb, dL, dN, dLb] = [_oLat, _oLng, _oLabel, _dLat, _dLng, _dLabel];
      if (!oL && !dL) return;

      const clearOrigin = () => {
        _oLat = null; _oLng = null; _oLabel = '';
        const i = document.getElementById('rpOriginInp'); if (i) i.value = '';
        if (_originMarker) { _originMarker.remove(); _originMarker = null; }
      };
      const clearDest = () => {
        _dLat = null; _dLng = null; _dLabel = '';
        const i = document.getElementById('rpDestInp'); if (i) i.value = '';
        if (_destMarker) { _destMarker.remove(); _destMarker = null; }
      };

      clearOrigin(); clearDest();
      if (dL) _setOrigin(dL, dN, dLb);
      if (oL) _setDest(oL, oN, oLb);
      _checkReady();
    });

    // Profile pills
    document.querySelectorAll('.rp-profile').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.rp-profile').forEach(b => b.classList.remove('on'));
        btn.classList.add('on');
        _profile = btn.dataset.profile;
      });
    });

    // Calc button
    document.getElementById('rpCalcBtn')?.addEventListener('click', _calculate);

    // Sidebar tab switching
    document.querySelectorAll('.sb-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.sb-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.sb-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.panel)?.classList.add('active');
      });
    });
  }

  function isPicking() {
    return !!_pickMode;
  }

  return { init, onMapClick, isPicking };
})();
