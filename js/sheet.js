/* ════════════════════════════════════════════════════
   SHEET — criação de ocorrência
   Fluxo: Grupos → Tipos → Pin → Formulário
   ════════════════════════════════════════════════════ */
const Sheet = (() => {
  let _type = null, _lat = null, _lng = null, _addr = null;
  const $ = id => document.getElementById(id);

  /* ── Step navigation ── */
  function _show(step) {
    ['Groups','Types','Pin','Form'].forEach(s =>
      $(`step${s}`)?.classList.toggle('active', s.toLowerCase() === step)
    );
    const titles = {
      groups: 'Nova Ocorrência',
      types:  'Escolher Tipo',
      pin:    'Marcar no Mapa',
      form:   'Detalhes',
    };
    $('sheetTitle').textContent = titles[step] || 'Nova Ocorrência';
    $('sheetFooter').style.display = step === 'form' ? 'block' : 'none';
  }

  /* ── Sheet visibility ── */
  function _openSheet() {
    $('sheetBackdrop').classList.add('open');
    $('sheet').classList.add('open');
  }

  /*
   * FIX PRINCIPAL: fecha backdrop E sheet.
   * Antes, close(true) só fechava o sheet mas deixava o backdrop aberto,
   * que ficava sobreposto ao mapa e bloqueava todos os cliques do Leaflet.
   */
  function _closeAll() {
    $('sheetBackdrop').classList.remove('open');
    $('sheet').classList.remove('open');
  }

  /* ── Enter pin-selection mode ── */
  function _enterPinMode() {
    _closeAll(); // REMOVE backdrop completamente antes de ativar o mapa
    setTimeout(() => {
      MapMod.startSelect(({ lat, lng, address }) => {
        _lat = lat; _lng = lng; _addr = address;
        _openForm(); // só aqui abre o sheet novamente
      });
    }, 180); // pequeno delay para animação de fechar
  }

  /* ── Build + open the form step ── */
  function _openForm() {
    const t = TYPES[_type] || TYPES.assalto;
    const g = GROUPS[t.group] || GROUPS.security;

    $('formBadge').innerHTML = `
      <span class="form-type-badge"
        style="background:${t.color}18;color:${t.color};border:1px solid ${t.color}30">
        <span style="display:inline-flex;width:12px;height:12px;margin-right:6px">${t.icon}</span>
        ${t.label}
      </span>
      <span class="form-group-badge">${g.short}</span>`;

    $('formCoords').textContent = _addr
      ? _addr.split(',').slice(0, 3).join(', ')
      : `${_lat.toFixed(5)}, ${_lng.toFixed(5)}`;

    $('formDesc').value = '';
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    $('formDate').value = now.toISOString().slice(0, 16);

    _show('form');
    _openSheet(); // só agora reabre o backdrop
  }

  /* ── Build group selector ── */
  function _buildGroups() {
    const el = $('groupCardsList');
    if (!el || el.dataset.built) return;
    el.innerHTML = Object.values(GROUPS).map(g => {
      const count = (Markers.counts()[g.id] || 0);
      return `
        <button class="group-card" data-group="${g.id}">
          <div class="group-card-icon" style="background:${g.dimColor};color:${g.color}">
            ${g.icon}
          </div>
          <div class="group-card-body">
            <div class="group-card-label">${g.short}</div>
            <div class="group-card-sub">${count} ocorrência${count !== 1 ? 's' : ''}</div>
          </div>
          <svg class="group-card-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>`;
    }).join('');
    el.dataset.built = '1';
    el.querySelectorAll('.group-card').forEach(btn => {
      btn.addEventListener('click', () => _showTypes(btn.dataset.group));
    });
  }

  /* ── Build type grid for a group ── */
  function _showTypes(groupId) {
    const el = $('stepTypes');
    const g  = GROUPS[groupId];
    if (!el || !g) return;

    const types = Object.entries(TYPES).filter(([, t]) => t.group === groupId);
    el.innerHTML = `
      <button class="back-btn" id="backToGroups">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        ${g.short}
      </button>
      <div class="types-grid">
        ${types.map(([key, t]) => `
          <button class="type-tile" data-type="${key}" style="--t-color:${t.color}">
            <div class="type-tile-icon">${t.icon}</div>
            <div class="type-tile-label">${t.label}</div>
          </button>`).join('')}
      </div>`;

    $('backToGroups').addEventListener('click', () => _show('groups'));

    el.querySelectorAll('.type-tile').forEach(btn => {
      btn.addEventListener('click', () => {
        _type = btn.dataset.type;
        const t = TYPES[_type];
        // Atualiza label no step de pin
        const lbl = $('pinTypeLabel');
        if (lbl) { lbl.textContent = t.label; lbl.style.color = t.color; }
        _show('pin');
      });
    });

    _show('types');
  }

  /* ── Confirm (form submit) ── */
  async function _confirm() {
    const btn = $('sheetConfirm');
    if (!btn) return;
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-spinner"></span> Registrando…';
    try {
      const occ = await API.createOccurrence({
        type:        _type,
        lat:         _lat,
        lng:         _lng,
        address:     _addr   || undefined,
        description: $('formDesc')?.value.trim() || undefined,
        datetime:    $('formDate')?.value
          ? new Date($('formDate').value).toISOString()
          : undefined,
      });
      Markers.add(occ, true);
      Stats.update();
      close();
      Toast.success('Ocorrência registrada!', 'Obrigado por contribuir com a comunidade.');
    } catch {
      Toast.error('Erro ao registrar', 'Verifique sua conexão e tente novamente.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Registrar Ocorrência';
    }
  }

  /* ── Public: open ── */
  function open(type = null) {
    _buildGroups();

    if (type) {
      // Atalho rápido do FAB: pula seleção, vai direto ao pin
      _type = type;
      const t = TYPES[type];
      const lbl = $('pinTypeLabel');
      if (lbl) { lbl.textContent = t.label; lbl.style.color = t.color; }
      _show('pin');
    } else {
      // Seleção completa: grupos
      _show('groups');
    }

    _openSheet();
  }

  /* ── Public: close ── */
  function close() {
    _closeAll();
    MapMod.stopSelect();
  }

  /* ── Wire static events ── */
  document.addEventListener('DOMContentLoaded', () => {
    $('sheetBackdrop')?.addEventListener('click', () => close());
    $('sheetClose')?.addEventListener('click',    () => close());
    $('sheetCancel')?.addEventListener('click',   () => close());
    $('sheetConfirm')?.addEventListener('click',  () => _confirm());

    /*
     * "Marcar no Mapa" — fecha tudo e entra no modo de seleção.
     * Este é o ponto central da correção: _closeAll() garante que
     * o backdrop não bloqueia os cliques no Leaflet.
     */
    $('pinReadyBtn')?.addEventListener('click', () => {
      if (!_type) {
        Toast.warn('Selecione um tipo de ocorrência primeiro.');
        return;
      }
      _enterPinMode();
    });
  });

  return { open, close };
})();
