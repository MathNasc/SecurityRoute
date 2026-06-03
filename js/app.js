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

    /* closeFab declared here so map click handler below can reference it */
    const fabMain = document.getElementById('fabMain');
    const fabMenu = document.getElementById('fabMenu');
    function closeFab() {
      fabMenu.classList.remove('open');
      fabMain.classList.remove('open');
    }

    /* 3. Override map click */
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
    initSearch('sbSearch',  'sbAC');
    initSearch('mSearch',   'mAC');

  } catch (e) {
    console.error('[SR] Init error:', e);
    Toast.error('Erro ao inicializar', 'Recarregue a página.');
  } finally {
    clearTimeout(fallback);
    setTimeout(() => {
      hideLoading();
      // Signal that the app is fully ready (used by PWA shortcuts)
      window.dispatchEvent(new Event('sr:ready'));
    }, 500);
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
  document.getElementById('searchClear')?.addEventListener('click', () => {
    document.getElementById('sbSearch').value = '';
    document.getElementById('searchClear').classList.remove('visible');
    document.getElementById('sbAC').classList.remove('open');
  });
  document.getElementById('sbSearch')?.addEventListener('input', e => {
    document.getElementById('searchClear')?.classList.toggle('visible', e.target.value.length > 0);
  });

  /* ── FAB speed-dial ── */
  fabMain.addEventListener('click', () => {
    const open = fabMenu.classList.toggle('open');
    fabMain.classList.toggle('open', open);
  });
  document.querySelectorAll('.fab-row[data-type]').forEach(btn => {
    btn.addEventListener('click', () => { closeFab(); Sheet.open(btn.dataset.type); });
  });
  document.getElementById('fabAll')?.addEventListener('click', () => { closeFab(); Sheet.open(); });

  /* ── Sheet events — wired internally by sheet.js via DOMContentLoaded ── */
  // Sheet.open() is called by FAB buttons above.
  // Close/confirm/pin events are registered inside sheet.js itself.

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
