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
    if (typeof PublicSecurityClient !== 'undefined') {
      PublicSecurityClient.init(map);
    }

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

    /* 4. Load incidents + initial Public Security heatmap/hotspots */
    let allOccs = [];
    try {
      allOccs = await API.getOccurrences();
      Markers.addMany(allOccs);
      Stats.update();
      Analytics.render(allOccs);
      if (typeof PublicSecurityClient !== 'undefined') {
        PublicSecurityClient.syncViewport(map).catch(() => {});
      }
      if (allOccs.length) Toast.success(`${allOccs.length} ocorrências carregadas`, '', 2500);
    } catch {
      Toast.error('Erro ao carregar ocorrências', 'Modo demo ativado.', 4000);
    }

    /* 5. Realtime polling */
    Realtime.start(allOccs);

    /* 6. Refresh button */
    document.getElementById('realtimeRefreshBtn')?.addEventListener('click', async () => {
      const btn = document.getElementById('realtimeRefreshBtn');
      btn?.classList.add('spinning');
      await Realtime.refresh();
      if (typeof PublicSecurityClient !== 'undefined') {
        await PublicSecurityClient.syncViewport(map).catch(() => {});
      }
      Analytics.render(Markers.getAll());
      setTimeout(() => btn?.classList.remove('spinning'), 600);
    });

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
  
  /* ── Gerenciamento de Estilo do Mapa e Public Security API (Aba Ajustes) ── */
  document.getElementById('themeCartoBtn')?.addEventListener('click', () => {
    if (navigator.vibrate) navigator.vibrate(20);
    MapMod.setTileLayer('carto');
    Toast.info('Estilo de mapa: Modo Escuro (Carto)', '', 2000);
  });

  document.getElementById('themeOsmBtn')?.addEventListener('click', () => {
    if (navigator.vibrate) navigator.vibrate(20);
    MapMod.setTileLayer('osm');
    Toast.info('Estilo de mapa: Modo Claro (OpenStreetMap)', '', 2000);
  });

  document.getElementById('toggleHotspotsBtn')?.addEventListener('click', () => {
    if (typeof PublicSecurityClient === 'undefined') return;
    const active = PublicSecurityClient.toggleHotspots();
    const btn = document.getElementById('toggleHotspotsBtn');
    if (btn) {
      btn.textContent = active ? 'Hotspots: Visíveis' : 'Hotspots: Ocultos';
      btn.style.borderColor = active ? 'var(--accent)' : 'var(--bd)';
    }
    Toast.info(active ? 'Zonas críticas (Hotspots) ativadas' : 'Zonas críticas (Hotspots) ocultadas', '', 1800);
  });

  document.getElementById('psSyncNowBtn')?.addEventListener('click', async () => {
    if (typeof PublicSecurityClient === 'undefined') return;
    Toast.info('Sincronizando com Public Security API…', '', 1500);
    try {
      const added = await PublicSecurityClient.syncViewport(MapMod.getMap());
      Toast.success('Sincronização concluída', `${added.length} nova(s) ocorrência(s) na área visível.`, 2500);
    } catch (e) {
      Toast.error('Falha ao sincronizar com Public Security API', e.message || '');
    }
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

  /* ── Conectividade Mobile / PWA & Fila Offline ── */
  window.addEventListener('offline', () => {
    Toast.warn('Sem conexão', 'Modo offline ativado. Ocorrências criadas serão salvas no celular.');
  });
  window.addEventListener('online', async () => {
    Toast.success('Conexão restabelecida', 'Sincronizando dados com o servidor...');
    try {
      const synced = await API.syncOfflineOccurrences();
      if (synced > 0) {
        Toast.success('Ocorrências enviadas!', `${synced} ocorrência(s) pendente(s) salva(s) no servidor.`);
      }
      const fresh = await API.getOccurrences();
      Markers.clear();
      Markers.addMany(fresh);
      Stats.update();
    } catch (e) {
      console.warn('Erro ao ressincronizar:', e);
    }
  });

  /* ── PWA Install Prompt ── */
  let _deferredPrompt = null;
  const pwaBtn = document.getElementById('pwaInstallBtn');
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    _deferredPrompt = e;
    if (pwaBtn) pwaBtn.style.display = 'flex';
  });

  pwaBtn?.addEventListener('click', async () => {
    if (_deferredPrompt) {
      _deferredPrompt.prompt();
      const { outcome } = await _deferredPrompt.userChoice;
      if (outcome === 'accepted' && pwaBtn) {
        pwaBtn.style.display = 'none';
      }
      _deferredPrompt = null;
    }
  });
})();