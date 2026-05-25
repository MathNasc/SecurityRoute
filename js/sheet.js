/* ════════════════════════════════════════════════════
   SHEET — criação de ocorrência (3 etapas)
   Grupo → Tipo → Localização → Formulário
   ════════════════════════════════════════════════════ */
const Sheet = (() => {
  let _type = null, _lat = null, _lng = null, _addr = null;

  const $ = id => document.getElementById(id);

  /* ── Build group selector ── */
  function _buildGroups() {
    const el = $('groupCardsList');
    if (!el || el.dataset.built) return;
    el.innerHTML = Object.values(GROUPS).map(g => `
      <button class="group-card" data-group="${g.id}">
        <div class="group-card-icon" style="background:${g.dimColor};color:${g.color}">
          ${g.icon}
        </div>
        <div class="group-card-body">
          <div class="group-card-label">${g.short}</div>
          <div class="group-card-sub" data-count="${g.id}">— ocorrências</div>
        </div>
        <svg class="group-card-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
      </button>`).join('');
    el.dataset.built = '1';
    el.querySelectorAll('.group-card').forEach(btn => {
      btn.addEventListener('click', () => _showTypes(btn.dataset.group));
    });
  }

  /* ── Build types for a group ── */
  function _buildTypes(groupId) {
    const el = $('stepTypes');
    const g  = GROUPS[groupId];
    if (!el || !g) return;
    const types = Object.entries(TYPES).filter(([, t]) => t.group === groupId);
    el.innerHTML = `
      <button class="back-btn" id="backToGroups">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        ${g.short}
      </button>
      <div class="types-grid">
        ${types.map(([key, t]) => `
          <button class="type-tile" data-type="${key}" style="--t-color:${t.color}">
            <div class="type-tile-icon">${t.icon}</div>
            <div class="type-tile-label">${t.label}</div>
          </button>`).join('')}
      </div>`;
    $('backToGroups').addEventListener('click', () => _showStep('groups'));
    el.querySelectorAll('.type-tile').forEach(btn => {
      btn.addEventListener('click', () => _selectType(btn.dataset.type));
    });
  }

  /* ── Steps ── */
  function _showStep(name) {
    ['groups','types','pin','form'].forEach(s => {
      $(`step${s.charAt(0).toUpperCase()+s.slice(1)}`)?.classList.toggle('active', s === name);
    });
    const titles = {
      groups: 'Nova Ocorrência',
      types:  'Selecionar Tipo',
      pin:    'Marcar Local',
      form:   'Detalhes',
    };
    $('sheetTitle').textContent = titles[name] || 'Nova Ocorrência';
    $('sheetFooter').style.display = name === 'form' ? 'block' : 'none';
  }

  function _showTypes(groupId) {
    _buildTypes(groupId);
    _showStep('types');
  }

  function _selectType(type) {
    _type = type;
    const t = TYPES[type];
    $('pinTypeLabel').textContent = t.label;
    $('pinTypeLabel').style.color = t.color;
    _showStep('pin');
    // minimise sheet to show map
    setTimeout(() => { close(true); MapMod.startSelect(_onPin); }, 200);
  }

  function _onPin({ lat, lng, address }) {
    _lat = lat; _lng = lng; _addr = address;
    _showForm();
    _open();
  }

  function _showForm() {
    const t = TYPES[_type] || TYPES.assalto;
    const g = GROUPS[t.group] || GROUPS.security;
    $('formBadge').innerHTML = `
      <span class="form-type-badge" style="background:${t.color}18;color:${t.color};border:1px solid ${t.color}30">
        <span style="display:inline-flex;width:12px;height:12px;margin-right:6px">${t.icon}</span>
        ${t.label}
      </span>
      <span class="form-group-badge">${g.short}</span>`;
    $('formCoords').textContent = _addr
      ? _addr.split(',').slice(0,2).join(', ')
      : `${_lat.toFixed(5)}, ${_lng.toFixed(5)}`;
    $('formDesc').value = '';
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    $('formDate').value = now.toISOString().slice(0, 16);
    _showStep('form');
  }

  /* ── Open / close ── */
  function open(type = null) {
    _buildGroups();
    // Update group counts in UI
    const c = Markers.counts();
    document.querySelectorAll('[data-count]').forEach(el => {
      const k = el.dataset.count;
      if (GROUPS[k]) el.textContent = `${c[k] || 0} ocorrências`;
    });

    if (type) {
      _type = type;
      _buildTypes(TYPES[type]?.group);
      _showTypes(TYPES[type]?.group);
      setTimeout(() => { close(true); MapMod.startSelect(_onPin); }, 300);
    } else {
      _showStep('groups');
    }
    _open();
  }

  function _open() {
    $('sheetBackdrop').classList.add('open');
    $('sheet').classList.add('open');
  }

  function close(partial = false) {
    if (!partial) {
      $('sheetBackdrop').classList.remove('open');
      MapMod.stopSelect();
    }
    $('sheet').classList.remove('open');
  }

  /* ── Confirm ── */
  async function confirm() {
    const btn = $('sheetConfirm');
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-spinner"></span> Registrando…';
    try {
      const occ = await API.createOccurrence({
        type:        _type,
        lat:         _lat,
        lng:         _lng,
        address:     _addr || undefined,
        description: $('formDesc').value.trim() || undefined,
        datetime:    $('formDate').value ? new Date($('formDate').value).toISOString() : undefined,
      });
      Markers.add(occ, true);
      Stats.update();
      close();
      Toast.success('Ocorrência registrada!', 'Obrigado por contribuir.', 3500);
    } catch (e) {
      Toast.error('Erro ao registrar', 'Verifique sua conexão.', 4000);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Registrar Ocorrência';
    }
  }

  /* ── Wire events ── */
  document.addEventListener('DOMContentLoaded', () => {
    $('sheetBackdrop')?.addEventListener('click', () => close());
    $('sheetClose')?.addEventListener('click',    () => close());
    $('sheetCancel')?.addEventListener('click',   () => close());
    $('sheetConfirm')?.addEventListener('click',  () => confirm());
    $('pinReadyBtn')?.addEventListener('click',   () => {
      close(true);
      MapMod.startSelect(({ lat, lng, address }) => _onPin({ lat, lng, address }));
    });
  });

  return { open, close };
})();
