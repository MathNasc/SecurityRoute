/* ════════════════════════════════════════════════════
   INIT
   ════════════════════════════════════════════════════ */
(async ()=>{
  // Map
  const map = MapMod.init();
  Markers.init(map);

  // Load occurrences
  try {
    const occs = await API.getOccurrences();
    Markers.addMany(occs);
    Stats.update();
  } catch(e) {
    Toast.error('Erro ao carregar ocorrências');
  } finally {
    setTimeout(()=>document.getElementById('loading').classList.add('hidden'), 700);
  }

  // Sidebar
  initSidebar();

  // Search — desktop sidebar
  initSearch('searchInput','autocomplete');
  document.getElementById('searchClear')?.addEventListener('click',()=>{
    const inp=document.getElementById('searchInput');
    inp.value=''; document.getElementById('searchClear').classList.remove('visible');
    document.getElementById('autocomplete').classList.remove('open');
  });

  // Search — mobile float
  initSearch('searchFloatInput','autocompleteFloat',true);

  // Filter bar (floating pills)
  document.getElementById('filterBar')?.querySelectorAll('.filter-pill').forEach(p=>{
    p.addEventListener('click',()=>{
      document.querySelectorAll('.filter-pill,.filter-btn').forEach(b=>b.classList.remove('active'));
      document.querySelectorAll(`[data-filter="${p.dataset.filter}"]`).forEach(b=>b.classList.add('active'));
      Markers.setFilter(p.dataset.filter);
    });
  });

  // GPS
  document.getElementById('gpsBtn')?.addEventListener('click', ()=>MapMod.locate());

  // Clear
  document.getElementById('clearBtn')?.addEventListener('click',()=>{
    Markers.clear();
    Stats.update();
    Toast.info('Marcadores removidos');
  });

  // FAB main (speed dial)
  const fabMain = document.getElementById('fabMain');
  const fabMenu = document.getElementById('fabMenu');
  fabMain.addEventListener('click',()=>{
    const open = fabMenu.classList.toggle('open');
    fabMain.classList.toggle('open', open);
  });

  // FAB type buttons
  document.querySelectorAll('.fab-type[data-type]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      fabMenu.classList.remove('open');
      fabMain.classList.remove('open');
      Sheet.open(btn.dataset.type);
    });
  });

  // Close fab menu on map click
  map.on('click',()=>{ fabMenu.classList.remove('open'); fabMain.classList.remove('open'); });

  // Emergency
  ['btnEmergency','btnEmergencySidebar'].forEach(id=>{
    document.getElementById(id)?.addEventListener('click',()=>window.location.href='tel:190');
  });

  // ESC
  document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ MapMod.stopSelect(); fabMenu.classList.remove('open'); fabMain.classList.remove('open'); }});

})();
