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
      ...Object.values(GROUPS).map(g => ({ id:g.id, label:g.short, color:g.color })),
    ];
    el.innerHTML = tabs.map(t => `
      <button class="group-tab${t.id==='all'?' active':''}" data-group="${t.id}">
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
        Stats.update();
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
        <span style="width:10px;height:10px;display:inline-flex;flex-shrink:0;color:${t.color}">${t.icon}</span>
        ${t.label}
        <span class="chip-count" data-count="${key}">0</span>
      </button>`).join('');
    el.querySelectorAll('.type-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.classList.toggle('active');
        Markers.toggleType(btn.dataset.type);
        Stats.update();
      });
    });
    Stats.update();
  }

  function _buildTimePills() {
    const el = document.getElementById('timePills');
    if (!el) return;

    const options = [
      { id:'all',   label:'Todos',   icon:'☀️🌙', title:'Mostrar todas as ocorrências' },
      { id:'day',   label:'Diurno',  icon:'☀️',   title:'Apenas ocorrências entre 6h e 19h' },
      { id:'night', label:'Noturno', icon:'🌙',   title:'Apenas ocorrências entre 20h e 5h' },
    ];

    el.innerHTML = options.map((o, i) => `
      <button class="time-pill${i === 0 ? ' active' : ''}"
              data-time="${o.id}"
              title="${o.title}">
        <span>${o.icon}</span> ${o.label}
      </button>`).join('');

    el.querySelectorAll('.time-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        el.querySelectorAll('.time-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _activeTime = btn.dataset.time;

        // ── Wire the actual filter ──
        Markers.setTimeFilter(_activeTime);
        Stats.update();

        // Friendly feedback
        const labels = { all:'Todos os períodos', day:'Período diurno (6h–19h)', night:'Período noturno (20h–5h)' };
        Toast.info(labels[_activeTime] || _activeTime, '', 1800);
      });
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
      { id:'all', label:'Todas', color:'var(--accent)' },
      ...Object.values(GROUPS).map(g => ({ id:g.id, label:g.short, color:g.color })),
    ];
    bar.innerHTML = items.map(item => `
      <button class="float-pill${item.id==='all'?' active':''}" data-group="${item.id}">
        <span class="float-pill-dot" style="background:${item.color}"></span>${item.label}
      </button>`).join('');

    bar.querySelectorAll('.float-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        // Sync both float bar and sidebar tabs
        document.querySelectorAll('.float-pill, .group-tab').forEach(b => {
          b.classList.toggle('active',
            b.dataset.group === btn.dataset.group ||
            b.dataset.group === btn.dataset.group
          );
        });
        _activeGroup = btn.dataset.group;
        Markers.setFilter(_activeGroup);
        _buildTypeChips(_activeGroup);
        _syncFloatBar();
        Stats.update();
      });
    });
  }

  return { init, initFloatBar };
})();
