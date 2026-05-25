/* ════════════════════════════════════════════════════
   HEATMAP — leaflet.heat integration
   ════════════════════════════════════════════════════ */
const Heatmap = (() => {
  let _layer = null;
  let _map   = null;
  let _active = false;

  function init(map) {
    _map = map;
  }

  function update(occurrences) {
    if (!_active) return;
    _rebuild(occurrences);
  }

  function toggle(occurrences) {
    _active = !_active;
    if (_active) {
      _rebuild(occurrences);
    } else {
      if (_layer) { _map.removeLayer(_layer); _layer = null; }
    }
    return _active;
  }

  function _rebuild(occs) {
    if (_layer) { _map.removeLayer(_layer); _layer = null; }
    if (!occs.length) return;
    const pts = occs.map(o => {
      const weight = (TYPES[o.type]?.weight || 5) / 10;
      return [o.lat, o.lng, weight];
    });
    _layer = L.heatLayer(pts, {
      radius:     28,
      blur:       22,
      maxZoom:    16,
      max:        1.0,
      gradient: { 0.1:'#3b82f6', 0.3:'#f59e0b', 0.6:'#ef4444', 1.0:'#f43f5e' },
    }).addTo(_map);
  }

  return { init, update, toggle };
})();

/* ════════════════════════════════════════════════════
   SAFETY SCORE — índice de segurança em tempo real
   ════════════════════════════════════════════════════ */
const SafetyScore = (() => {
  let _map, _el, _timer;

  function init(map) {
    _map = map;
    _el  = document.getElementById('safetyScore');
    _map.on('moveend zoomend', () => {
      clearTimeout(_timer);
      _timer = setTimeout(() => recalc(Markers.getAll()), 300);
    });
  }

  function recalc(occurrences) {
    if (!_el) return;
    const bounds  = _map.getBounds();
    const visible = occurrences.filter(o => bounds.contains([o.lat, o.lng]));

    if (visible.length === 0) {
      _render({ score: 100, level: 'safe', count: 0 });
      return;
    }

    const totalWeight = visible.reduce((s, o) => s + (TYPES[o.type]?.weight || 5), 0);
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const areaSqKm = Math.abs(ne.lat - sw.lat) * Math.abs(ne.lng - sw.lng) * 12321;
    const density  = totalWeight / Math.max(areaSqKm, 0.1);
    const riskPct  = Math.min(density * 1.8, 100);
    const score    = Math.round(Math.max(0, 100 - riskPct));

    let level = 'safe';
    if (score < 40) level = 'danger';
    else if (score < 70) level = 'caution';

    _render({ score, level, count: visible.length });
  }

  function _render({ score, level, count }) {
    const s = SAFETY[level] || SAFETY.safe;
    const html = `
      <div class="safety-dot" style="background:${s.dot};box-shadow:0 0 8px ${s.dot}80"></div>
      <div class="safety-info">
        <div class="safety-label" style="color:${s.color}">${s.label}</div>
        <div class="safety-sub">${count} ocorrência${count !== 1 ? 's' : ''} na área</div>
      </div>
      <div class="safety-score" style="color:${s.color}">${score}</div>
    `;
    [_el, document.getElementById('safetyMapBadge')].forEach(el => {
      if (!el) return;
      el.innerHTML = html;
      el.style.background  = s.bg;
      el.style.borderColor = `${s.color}30`;
    });
  }

  return { init, recalc };
})();

