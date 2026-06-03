/* ════════════════════════════════════════════════════
   MARKERS — icons, cluster, popups, filtros
   ════════════════════════════════════════════════════ */
const Markers = (() => {
  let _map, _cluster;
  let _all = [];
  let _activeGroup = 'all';
  let _activeTypes = new Set(['all']);
  let _activeTime  = 'all';   // 'all' | 'day' | 'night'

  /* ── Custom pin icon ── */
  function _icon(type) {
    const t = TYPES[type] || TYPES.assalto;
    return L.divIcon({
      className: '',
      iconSize: [34, 40], iconAnchor: [17, 40], popupAnchor: [0, -42],
      html: `<div style="position:relative;display:flex;flex-direction:column;align-items:center">
        <div style="
          width:34px;height:34px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
          background:${t.color};border:2px solid rgba(255,255,255,.85);
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 4px 14px ${t.color}60,0 2px 6px rgba(0,0,0,.5);">
          <div style="transform:rotate(45deg);color:#fff;display:flex;width:16px;height:16px">
            ${t.icon}
          </div>
        </div>
        <div style="width:5px;height:5px;border-radius:50%;background:${t.color}88;margin-top:1px;filter:blur(1px)"></div>
      </div>`,
    });
  }

  /* ── Popup HTML ── */
  function _popup(occ) {
    const t  = TYPES[occ.type]  || TYPES.assalto;
    const g  = GROUPS[t.group]  || GROUPS.security;
    const dt = occ.createdAt ? _timeAgo(new Date(occ.createdAt)) : '';
    const hour = occ.createdAt ? new Date(occ.createdAt).getHours() : -1;
    const period = hour < 0 ? '' : _isDaytime(hour) ? '☀️ Diurno' : '🌙 Noturno';
    return `
    <div class="popup-card">
      <div class="popup-head" style="border-left:3px solid ${t.color}">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span class="popup-badge" style="background:${t.color}18;color:${t.color};border:1px solid ${t.color}30">
            <span style="width:5px;height:5px;border-radius:50%;background:${t.color};display:inline-block;margin-right:4px"></span>
            ${t.label.toUpperCase()}
          </span>
          ${period ? `<span style="font-size:10px;color:var(--tx3);font-family:var(--fm)">${period}</span>` : ''}
        </div>
        <div class="popup-title">${t.label}</div>
        <div style="font-size:11px;color:var(--tx3);font-family:var(--fm);margin-top:3px">
          ${g.short.toUpperCase()}
        </div>
      </div>
      <div class="popup-body">
        ${occ.description ? `
        <div class="popup-row">
          <svg class="popup-row-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <span>${_esc(occ.description)}</span>
        </div>` : ''}
        ${occ.address ? `
        <div class="popup-row">
          <svg class="popup-row-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <span style="font-size:12px">${_esc(occ.address.split(',').slice(0,3).join(', '))}</span>
        </div>` : ''}
        ${dt ? `<div class="popup-time">
          <svg style="width:10px;height:10px;display:inline;vertical-align:middle;margin-right:3px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${dt}
        </div>` : ''}
      </div>
    </div>`;
  }

  function _timeAgo(d) {
    const s = (Date.now() - d) / 1000;
    if (s < 60)    return 'Agora mesmo';
    if (s < 3600)  return `Há ${Math.floor(s/60)} min`;
    if (s < 86400) return `Há ${Math.floor(s/3600)}h`;
    return `Há ${Math.floor(s/86400)} dias`;
  }

  function _esc(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  /* ── Cluster icon ── */
  function _clusterIcon(cluster) {
    const n  = cluster.getChildCount();
    const sz = n < 10 ? 36 : n < 50 ? 42 : 48;
    return L.divIcon({
      html: `<div style="
        width:${sz}px;height:${sz}px;border-radius:50%;
        background:rgba(255,107,43,.82);border:2px solid rgba(255,107,43,.25);
        display:flex;align-items:center;justify-content:center;
        font-family:'Bebas Neue',sans-serif;font-size:${sz<40?15:18}px;
        color:#fff;box-shadow:0 4px 16px rgba(255,107,43,.4);
        letter-spacing:.05em">${n}</div>`,
      className: '', iconSize: [sz, sz], iconAnchor: [sz/2, sz/2],
    });
  }

  /* ── Time helpers ── */
  function _isDaytime(hour) {
    return hour >= 6 && hour < 20;
  }

  function _timeMatch(occ) {
    if (_activeTime === 'all') return true;
    if (!occ.createdAt) return true; // no date → always show
    const hour = new Date(occ.createdAt).getHours();
    if (_activeTime === 'day')   return _isDaytime(hour);
    if (_activeTime === 'night') return !_isDaytime(hour);
    return true;
  }

  /* ── Visibility check (group + type + time) ── */
  function _visible(entry) {
    const typeOk = _activeTypes.has('all') ||
                   _activeTypes.has(entry.type) ||
                   _activeTypes.has(entry.group);
    const timeOk = _timeMatch(entry.occ);
    return typeOk && timeOk;
  }

  /* ── Public ── */
  function init(map) {
    _map = map;
    _cluster = L.markerClusterGroup({
      maxClusterRadius: 70,
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      zoomToBoundsOnClick: true,
      iconCreateFunction: _clusterIcon,
    });
    _map.addLayer(_cluster);
  }

  function add(occ, animate = false) {
    const lm = L.marker([occ.lat, occ.lng], { icon: _icon(occ.type) })
      .bindPopup(_popup(occ), { maxWidth: 300, className: 'sr-popup' });
    const entry = { id: occ.id, type: occ.type, group: TYPES[occ.type]?.group, lm, occ };
    _all.push(entry);
    if (_visible(entry)) _cluster.addLayer(lm);
    if (animate) setTimeout(() => lm.openPopup(), 400);
    return entry;
  }

  function addMany(occs) { occs.forEach(o => add(o)); }

  function _applyFilter() {
    _cluster.clearLayers();
    _all.forEach(e => { if (_visible(e)) _cluster.addLayer(e.lm); });
  }

  /* Filter by group or specific type */
  function setFilter(groupOrType) {
    if (groupOrType === 'all') {
      _activeTypes = new Set(['all']);
    } else {
      _activeTypes = new Set([groupOrType]);
    }
    _applyFilter();
  }

  /* Filter by time period */
  function setTimeFilter(mode) {
    _activeTime = mode; // 'all' | 'day' | 'night'
    _applyFilter();
  }

  function toggleType(type) {
    _activeTypes.delete('all');
    if (_activeTypes.has(type)) {
      _activeTypes.delete(type);
      if (_activeTypes.size === 0) _activeTypes.add('all');
    } else {
      _activeTypes.add(type);
    }
    _applyFilter();
  }

  function clear() { _cluster.clearLayers(); _all = []; }

  function getAll() { return _all.map(e => e.occ); }

  function getVisible() {
    return _all.filter(e => _visible(e)).map(e => e.occ);
  }

  function counts() {
    const c = { total: 0 };
    Object.keys(GROUPS).forEach(g => c[g] = 0);
    Object.keys(TYPES).forEach(t  => c[t] = 0);
    _all.forEach(e => {
      if (!_visible(e)) return; // count only visible markers
      c.total++;
      if (c[e.type]  !== undefined) c[e.type]++;
      if (c[e.group] !== undefined) c[e.group]++;
    });
    return c;
  }

  return { init, add, addMany, setFilter, setTimeFilter, toggleType, clear, getAll, getVisible, counts };
})();
