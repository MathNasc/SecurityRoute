/* ════════════════════════════════════════════════════
   FILTERS — grupos, tipos, horário
   ════════════════════════════════════════════════════ */
const Filters = (() => {
  let _activeGroup = 'all';
  let _activeTime  = 'all'; // 'all' | 'day' | 'night'

  function init() {
    _buildGroupTabs();
    _buildTimePills();
    _syncFloatBar();
  }

  function _buildGroupTabs() {
    const el = document.getElementById('groupTabs');
    if (!el) return;
    const tabs = [
      { id:'all', label:'Todas', color:'var(--accent)' },
      ...Object.values(GROUPS).map(g => ({id:g.id, label:g.short, color:g.color})),
    ];
    el.innerHTML = tabs.map(t => `
      <button class="group-tab${t.id==='all'?' active':''}" data-group="${t.id}"
        style="${t.id==='all'?'':''}">
        <span class="group-tab-dot" style="background:${t.color}"></span>
        ${t.label}
        <span class="group-tab-count" data-count="${t.id}">0</span>
      </button>`).join('');

    el.querySelectorAll('.group-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        el.querySelectorAll('.group-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _activeGroup = btn.dataset.group;
        Markers.setFilter(_activeGroup);
        _buildTypeChips(_activeGroup);
        _syncFloatBar();
      });
    });
  }

  function _buildTypeChips(groupId) {
    const el = document.getElementById('typeChips');
    if (!el) return;
    if (groupId === 'all') { el.innerHTML = ''; return; }
    const types = Object.entries(TYPES).filter(([, t]) => t.group === groupId);
    el.innerHTML = types.map(([key, t]) => `
      <button class="type-chip" data-type="${key}" style="--chip-color:${t.color}">
        <span style="width:12px;height:12px;display:inline-flex;flex-shrink:0">${t.icon}</span>
        ${t.label}
        <span class="chip-count" data-count="${key}">0</span>
      </button>`).join('');
    el.querySelectorAll('.type-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.classList.toggle('active');
        Markers.toggleType(btn.dataset.type);
      });
    });
    Stats.update(); // refresh counts in new chips
  }

  function _buildTimePills() {
    const el = document.getElementById('timePills');
    if (!el) return;
    [['all','Todos','☀️🌙'],['day','Diurno','☀️'],['night','Noturno','🌙']].forEach(([id,label,icon])=>{
      const btn = document.createElement('button');
      btn.className = 'time-pill' + (id==='all'?' active':'');
      btn.dataset.time = id;
      btn.innerHTML = `<span>${icon}</span> ${label}`;
      btn.addEventListener('click', () => {
        el.querySelectorAll('.time-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _activeTime = id;
        // TODO: filter by time when backend provides createdAt with hours
        Toast.info(`Filtro: ${label}`,'',1500);
      });
      el.appendChild(btn);
    });
  }

  function _syncFloatBar() {
    document.querySelectorAll('.float-pill').forEach(p => {
      p.classList.toggle('active', p.dataset.group === _activeGroup);
    });
  }

  function initFloatBar() {
    const bar = document.getElementById('floatFilterBar');
    if (!bar) return;
    const items = [
      {id:'all',   label:'Todas',    color:'var(--accent)'},
      ...Object.values(GROUPS).map(g=>({id:g.id, label:g.short, color:g.color})),
    ];
    bar.innerHTML = items.map(item=>`
      <button class="float-pill${item.id==='all'?' active':''}" data-group="${item.id}">
        <span class="float-pill-dot" style="background:${item.color}"></span>${item.label}
      </button>`).join('');
    bar.querySelectorAll('.float-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.float-pill,.group-tab').forEach(b=>{
          b.classList.toggle('active', b.dataset.group===btn.dataset.group || b.dataset.group===btn.dataset.group);
        });
        _activeGroup = btn.dataset.group;
        Markers.setFilter(_activeGroup);
        _buildTypeChips(_activeGroup);
        // sync sidebar tabs
        document.querySelectorAll('.group-tab').forEach(t=>t.classList.toggle('active',t.dataset.group===_activeGroup));
        // sync float bar
        document.querySelectorAll('.float-pill').forEach(p=>p.classList.toggle('active',p.dataset.group===_activeGroup));
      });
    });
  }

  return { init, initFloatBar };
})();
