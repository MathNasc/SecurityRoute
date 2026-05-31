/* ════════════════════════════════════════════════════
   ROUTE PLANNER — js/route-planner.js
   Fixes:
     1. Uses MapMod.getMap() instead of private _map
     2. Waypoint inputs accept typed addresses via
        Nominatim autocomplete (same pattern as sidebar)
   ════════════════════════════════════════════════════ */

const RoutePlanner = (() => {
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
  const _pinIcon = (emoji) => L.divIcon({
    html: `<div style="font-size:22px;line-height:1;filter:drop-shadow(0 2px 6px rgba(0,0,0,.7))">${emoji}</div>`,
    className: '', iconSize: [26, 26], iconAnchor: [13, 22],
  });

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
  function _lineStyle(route, selected) {
    const color = _resolveColor(route.safetyColor);
    return {
      color,
      weight:    selected ? 7 : 4,
      opacity:   selected ? 0.9 : 0.4,
      dashArray: selected ? null : '8 6',
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

    if (!mode) { hint?.classList.remove('vis'); return; }
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

    inp.addEventListener('input', () => {
      clearTimeout(timer);
      const v = inp.value.trim();
      if (v.length < 3) { ac.classList.remove('open'); return; }

      timer = setTimeout(async () => {
        // Support both api.js variants (search vs searchAddress)
        const results = await (API.search || API.searchAddress).call(API, v);
        if (!results.length) { ac.classList.remove('open'); return; }

        ac.innerHTML = results.map(r => `
          <div class="rp-ac-item" data-lat="${r.lat}" data-lng="${r.lng}"
               data-primary="${_esc(r.primary)}" data-secondary="${_esc(r.secondary)}">
            <div class="rp-ac-ico">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <div style="min-width:0">
              <div class="rp-ac-p">${_esc(r.primary)}</div>
              <div class="rp-ac-s">${_esc(r.secondary)}</div>
            </div>
          </div>`).join('');

        ac.classList.add('open');

        ac.querySelectorAll('.rp-ac-item').forEach(item => {
          item.addEventListener('click', () => {
            const lat   = parseFloat(item.dataset.lat);
            const lng   = parseFloat(item.dataset.lng);
            const label = item.dataset.primary +
              (item.dataset.secondary ? ', ' + item.dataset.secondary : '');
            inp.value = item.dataset.primary;
            ac.classList.remove('open');
            onSelect(lat, lng, label);
            MapMod.flyTo(lat, lng, 15);
          });
        });
      }, 380);
    });

    inp.addEventListener('keydown', e => {
      if (e.key === 'Escape') ac.classList.remove('open');
    });

    document.addEventListener('click', e => {
      if (!e.target.closest(`#${inputId}`) && !e.target.closest(`#${acId}`)) {
        ac.classList.remove('open');
      }
    });
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
    _originMarker = L.marker([lat, lng], { icon: _pinIcon('🟢'), zIndexOffset: 1000 })
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
    _destMarker = L.marker([lat, lng], { icon: _pinIcon('🔴'), zIndexOffset: 1000 })
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
      const line = L.polyline(rt.coords, _lineStyle(rt, false)).addTo(map());
      line.on('click', () => _selectRoute(i));
      _routeLayers.push(line);
    });

    // Selected route on top
    const sel     = routes[selectedIdx];
    const selLine = L.polyline(sel.coords, _lineStyle(sel, true)).addTo(map());
    selLine.on('click', () => _selectRoute(selectedIdx));
    _routeLayers.push(selLine);

    // Hotspot circles on selected route
    sel.hotspots.forEach(hs => {
      const circle = L.circleMarker([hs.lat, hs.lng], {
        radius: 9, color: '#fff', weight: 2,
        fillColor: '#ef4444', fillOpacity: 0.7,
      }).addTo(map()).bindPopup(`
        <div style="padding:8px 10px;font-size:12px;min-width:140px">
          <strong style="color:#ef4444">⚠️ Área de risco</strong><br/>
          ${hs.count} ocorrência${hs.count > 1 ? 's' : ''} próximas
        </div>`);
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

  // ── Main calculation ───────────────────────────────
  async function _calculate() {
    const btn     = document.getElementById('rpCalcBtn');
    const results = document.getElementById('rpResults');

    btn.disabled = true;
    results.innerHTML = `<div class="rp-loading">
      <div class="rp-spinner"></div>Buscando rotas e calculando risco…
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
      const scored = routes.map(rt => ({ ...rt, ...RiskEngine.score(rt.coords, incidents, now) }));

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
        `${scored.length} rota${scored.length > 1 ? 's' : ''} calculada${scored.length > 1 ? 's' : ''}`,
        `Mais segura: ${scored[0].safetyLevel} (${scored[0].riskScore}/100)`
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
            <span class="rp-risk-lbl">Risco</span>
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
            <div class="rp-meta-l">Zonas risco</div>
            <div class="rp-meta-v" style="color:${rt.hotspots.length ? '#ef4444' : 'var(--green)'}">
              ${rt.hotspots.length}<small> zona${rt.hotspots.length !== 1 ? 's' : ''}</small>
            </div>
          </div>
        </div>

        ${rt.hotspots.length ? `
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
                ${hs.count} ocorrência${hs.count > 1 ? 's' : ''} — risco local ${hs.score.toFixed(1)}pt
              </div>`).join('')}
          </div>` : ''}
      `;

      card.addEventListener('click', () => _selectRoute(i));
      list.appendChild(card);
    });
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

  return { init, onMapClick };
})();
