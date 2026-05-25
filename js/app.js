/* ════════════════════════════════════════════════════
   APP — inicialização principal
   ════════════════════════════════════════════════════ */
(async () => {
  /* 1. Map */
  const map = MapMod.init();
  Markers.init(map);
  Heatmap.init(map);
  SafetyScore.init(map);

  /* 2. Load data */
  try {
    const occs = await API.getOccurrences();
    Markers.addMany(occs);
    Stats.update();
    if (occs.length) Toast.success(`${occs.length} ocorrências carregadas`, '', 2500);
  } catch {
    Toast.error('Erro ao carregar ocorrências', 'Modo demo ativado.', 4000);
  } finally {
    setTimeout(() => document.getElementById('loading')?.classList.add('hidden'), 700);
  }

  /* 3. Filters */
  Filters.init();
  Filters.initFloatBar();

  /* 4. Searches */
  initSearch('searchInput',     'searchAC');
  initSearch('searchFloatInput','searchFloatAC');

  document.getElementById('searchClear')?.addEventListener('click', () => {
    document.getElementById('searchInput').value = '';
    document.getElementById('searchClear').classList.remove('visible');
    document.getElementById('searchAC').classList.remove('open');
  });

  /* 5. Sidebar toggle (mobile) */
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  document.getElementById('menuToggle')?.addEventListener('click',  () => { sidebar.classList.add('open'); overlay.classList.add('open'); });
  document.getElementById('sidebarClose')?.addEventListener('click', () => { sidebar.classList.remove('open'); overlay.classList.remove('open'); });
  overlay.addEventListener('click', () => { sidebar.classList.remove('open'); overlay.classList.remove('open'); });

  /* 6. FAB speed-dial */
  const fabMain = document.getElementById('fabMain');
  const fabMenu = document.getElementById('fabMenu');
  fabMain.addEventListener('click', () => {
    const open = fabMenu.classList.toggle('open');
    fabMain.classList.toggle('open', open);
  });
  document.querySelectorAll('.fab-type[data-type]').forEach(btn => {
    btn.addEventListener('click', () => {
      fabMenu.classList.remove('open'); fabMain.classList.remove('open');
      Sheet.open(btn.dataset.type);
    });
  });
  // Open generic sheet (group selection)
  document.getElementById('fabNewBtn')?.addEventListener('click', () => {
    fabMenu.classList.remove('open'); fabMain.classList.remove('open');
    Sheet.open();
  });
  map.on('click', () => { fabMenu.classList.remove('open'); fabMain.classList.remove('open'); });

  /* 7. GPS */
  document.getElementById('gpsBtn')?.addEventListener('click', () => MapMod.locate());

  /* 8. Heatmap toggle */
  document.getElementById('heatmapBtn')?.addEventListener('click', () => {
    const btn  = document.getElementById('heatmapBtn');
    const active = Heatmap.toggle(Markers.getAll());
    btn.classList.toggle('active', active);
    btn.title = active ? 'Desativar Heatmap' : 'Ativar Heatmap';
    Toast.info(active ? 'Heatmap ativado' : 'Heatmap desativado', '', 1500);
  });

  /* 9. Clear markers */
  document.getElementById('clearBtn')?.addEventListener('click', () => {
    Markers.clear(); Stats.update();
    Toast.info('Marcadores removidos', '', 2000);
  });

  /* 10. Emergency buttons */
  document.querySelectorAll('[data-emergency]').forEach(btn => {
    btn.addEventListener('click', () => window.location.href = 'tel:190');
  });

  /* 11. ESC */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      MapMod.stopSelect(); fabMenu.classList.remove('open'); fabMain.classList.remove('open');
    }
  });
})();
