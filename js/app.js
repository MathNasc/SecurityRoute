/* ════════════════════════════════════════════════════
   APP — js/app.js
   Main init. Wires all modules together.
   ════════════════════════════════════════════════════ */
(async () => {
  const hideLoading = () => document.getElementById('loading')?.classList.add('hidden');
  const fallback = setTimeout(hideLoading, 5000);

  try {
    /* 1. Map + markers */
    const map = MapMod.init();
    Markers.init(map);
    Heatmap.init(map);
    SafetyScore.init(map);

    /* 2. Route planner — init BEFORE wiring map clicks */
    RoutePlanner.init();

    /* 3. Override map click: route planner gets first pick,
          then occurrence pin mode, then close FAB */
    map.on('click', (e) => {
      const { lat, lng } = e.latlng;

      // Route planner consumes click when in pick mode
      if (RoutePlanner.onMapClick(lat, lng)) return;

      // Occurrence pin mode (handled inside MapMod via _selecting flag)
      // Nothing to do — MapMod already hooks 'click' internally.

      // Otherwise close FAB
      if (!document.body.classList.contains('pin-mode')) {
        closeFab();
      }
    });

    /* 4. Load incidents */
    try {
      const occs = await API.getOccurrences();
      Markers.addMany(occs);
      Stats.update();
      if (occs.length) Toast.success(`${occs.length} ocorrências carregadas`, '', 2500);
    } catch {
      Toast.error('Erro ao carregar ocorrências', 'Modo demo ativado.', 4000);
    }

    /* 5. Filters + search */
    Filters.init();
    Filters.initFloatBar();
    initSearch('searchInput', 'searchAC');
    initSearch('searchFloatInput', 'searchFloatAC');

    document.getElementById('searchClear')?.addEventListener('click', () => {
      document.getElementById('searchInput').value = '';
      document.getElementById('searchClear').classList.remove('visible');
      document.getElementById('searchAC').classList.remove('open');
    });

  } catch (e) {
    console.error('[SR] Init error:', e);
    Toast.error('Erro ao inicializar', 'Recarregue a página.');
  } finally {
    clearTimeout(fallback);
    setTimeout(hideLoading, 500);
  }

  /* ── Sidebar toggle (mobile) ── */
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sbOverlay');
  document.getElementById('menuToggle')?.addEventListener('click', () => {
    sidebar.classList.add('open'); overlay.classList.add('open');
  });
  document.getElementById('sbClose')?.addEventListener('click', () => {
    sidebar.classList.remove('open'); overlay.classList.remove('open');
  });
  overlay.addEventListener('click', () => {
    sidebar.classList.remove('open'); overlay.classList.remove('open');
  });

  /* ── Search clear ── */
  document.getElementById('sbSearchClr')?.addEventListener('click', () => {
    document.getElementById('sbSearch').value = '';
    document.getElementById('sbSearchClr').classList.remove('vis');
    document.getElementById('sbAC').classList.remove('open');
  });
  document.getElementById('sbSearch')?.addEventListener('input', e => {
    document.getElementById('sbSearchClr')?.classList.toggle('vis', e.target.value.length > 0);
  });

  /* ── FAB speed-dial ── */
  const fabMain = document.getElementById('fabMain');
  const fabMenu = document.getElementById('fabMenu');

  function closeFab() {
    fabMenu.classList.remove('open');
    fabMain.classList.remove('open');
  }

  fabMain.addEventListener('click', () => {
    const open = fabMenu.classList.toggle('open');
    fabMain.classList.toggle('open', open);
  });
  document.querySelectorAll('.fab-row[data-type]').forEach(btn => {
    btn.addEventListener('click', () => { closeFab(); Sheet.open(btn.dataset.type); });
  });
  document.getElementById('fabAll')?.addEventListener('click', () => { closeFab(); Sheet.open(); });

  /* ── Sheet events ── */
  document.getElementById('shBd')?.addEventListener('click', () => Sheet.close());
  document.getElementById('shX')?.addEventListener('click', () => Sheet.close());
  document.getElementById('shCancel')?.addEventListener('click', () => Sheet.close());
  document.getElementById('shConfirm')?.addEventListener('click', () => Sheet.confirm());
  document.getElementById('pinBtn')?.addEventListener('click', () => Sheet._enterPin());

  /* ── Map controls ── */
  document.getElementById('gpsBtn')?.addEventListener('click', () => MapMod.locate());
  document.getElementById('heatBtn')?.addEventListener('click', () => {
    const btn = document.getElementById('heatBtn');
    const active = Heatmap.toggle(Markers.getAll());
    btn.classList.toggle('active', active);
    Toast.info(active ? 'Heatmap ativado' : 'Heatmap desativado', '', 1500);
  });
  document.getElementById('clrBtn')?.addEventListener('click', () => {
    Markers.clear(); Stats.update();
    Toast.info('Marcadores removidos', '', 2000);
  });

  /* ── Emergency ── */
  document.querySelectorAll('[data-emergency], #emSb, #emMap').forEach(btn => {
    btn.addEventListener('click', () => window.location.href = 'tel:190');
  });

  /* ── ESC ── */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      Sheet.close();
      closeFab();
    }
  });
})();
