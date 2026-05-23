/* ════════════════════════════════════════════════════
   MARKERS MODULE
   ════════════════════════════════════════════════════ */
const Markers = (() => {
  let _map, _cluster;
  let _all = [];      // {id, type, lm, occ}
  let _filter = 'all';

  function _icon(type) {
    const cfg = TYPES[type]||TYPES.assalto;
    const svgs = {
      assalto:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
      enchente:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M2 20s2-2 5-2 5 2 8 2 5-2 5-2M2 15s2-2 5-2 5 2 8 2 5-2 5-2"/><path d="M12 2v8M8 6l4-4 4 4"/></svg>`,
      rua_estreita:`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><rect x="2" y="3" width="20" height="18" rx="2"/><line x1="8" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="16" y2="21"/></svg>`,
    };
    return L.divIcon({
      className:'',
      iconSize:[36,42],iconAnchor:[18,42],popupAnchor:[0,-44],
      html:`<div style="
        position:relative;display:flex;flex-direction:column;align-items:center;
      ">
        <div style="
          width:36px;height:36px;border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          background:${cfg.color};
          border:2px solid rgba(255,255,255,.85);
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 4px 16px ${cfg.color}55,0 2px 6px rgba(0,0,0,.5);
        ">
          <div style="transform:rotate(45deg);color:#fff;display:flex">${svgs[type]||svgs.assalto}</div>
        </div>
        <div style="
          width:5px;height:5px;border-radius:50%;
          background:${cfg.color}88;margin-top:1px;
          filter:blur(1px);
        "></div>
      </div>`,
    });
  }

  function _popup(occ) {
    const cfg = TYPES[occ.type]||TYPES.assalto;
    const date = occ.createdAt ? _timeAgo(new Date(occ.createdAt)) : '';
    return `<div class="popup-card">
      <div class="popup-head">
        <div class="popup-badge popup-badge--${occ.type}">
          <span class="popup-badge-dot"></span>${cfg.label.toUpperCase()}
        </div>
        <div class="popup-title">${cfg.icon} ${cfg.label}</div>
      </div>
      <div class="popup-body">
        <div class="popup-meta">
          ${occ.description ? `<div class="popup-row">
            <svg class="popup-row-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span>${_esc(occ.description)}</span>
          </div>` : ''}
          ${occ.address ? `<div class="popup-row">
            <svg class="popup-row-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span style="font-size:12px">${_esc(occ.address.split(',').slice(0,3).join(', '))}</span>
          </div>` : ''}
        </div>
        ${date ? `<div class="popup-time">
          <svg style="width:10px;height:10px;display:inline;vertical-align:middle;margin-right:4px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          ${date}
        </div>` : ''}
      </div>
    </div>`;
  }

  function _timeAgo(d) {
    const diff = (Date.now() - d) / 1000;
    if (diff < 60)   return 'Agora mesmo';
    if (diff < 3600) return `Há ${Math.floor(diff/60)} min`;
    if (diff < 86400)return `Há ${Math.floor(diff/3600)}h`;
    return `Há ${Math.floor(diff/86400)} dias`;
  }

  function _esc(s){ const d=document.createElement('div');d.textContent=s;return d.innerHTML; }

  function _clusterIcon(cluster) {
    const n = cluster.getChildCount();
    const sz = n<10?36:n<50?42:48;
    return L.divIcon({
      html:`<div style="
        width:${sz}px;height:${sz}px;border-radius:50%;
        background:rgba(255,107,43,.8);border:2px solid rgba(255,107,43,.25);
        display:flex;align-items:center;justify-content:center;
        font-family:'Bebas Neue',sans-serif;font-size:${sz<40?15:18}px;
        color:#fff;box-shadow:0 4px 16px rgba(255,107,43,.4);
        letter-spacing:.05em;
      ">${n}</div>`,
      className:'',iconSize:[sz,sz],iconAnchor:[sz/2,sz/2],
    });
  }

  function init(map) {
    _map = map;
    _cluster = L.markerClusterGroup({
      maxClusterRadius:70,showCoverageOnHover:false,
      spiderfyOnMaxZoom:true,zoomToBoundsOnClick:true,
      iconCreateFunction:_clusterIcon,
    });
    _map.addLayer(_cluster);
  }

  function add(occ, animate=false) {
    const lm = L.marker([occ.lat,occ.lng], {icon:_icon(occ.type)})
      .bindPopup(_popup(occ),{maxWidth:320,className:'sr-popup'});
    if (animate) {
      const el = lm.getElement?.();
      if (el) el.classList.add('marker-new');
    }
    const entry = {id:occ.id,type:occ.type,lm,occ};
    _all.push(entry);
    if (_filter==='all'||_filter===occ.type) _cluster.addLayer(lm);
    return entry;
  }

  function addMany(occs) { occs.forEach(o=>add(o)); }

  function setFilter(f) {
    _filter = f;
    _cluster.clearLayers();
    _all.forEach(e=>{ if(f==='all'||e.type===f) _cluster.addLayer(e.lm); });
  }

  function clear() { _cluster.clearLayers(); _all=[]; }

  function counts() {
    return _all.reduce((a,m)=>{
      a[m.type]=(a[m.type]||0)+1; a.total++;
      return a;
    },{assalto:0,enchente:0,rua_estreita:0,total:0});
  }

  return {init,add,addMany,setFilter,clear,counts};
})();
