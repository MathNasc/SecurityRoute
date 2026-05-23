/* ════════════════════════════════════════════════════
   SIDEBAR
   ════════════════════════════════════════════════════ */
function initSidebar() {
  const sidebar  = document.getElementById('sidebar');
  const overlay  = document.getElementById('sidebarOverlay');
  const openBtn  = document.getElementById('menuToggle');
  const closeBtn = document.getElementById('sidebarClose');

  function open()  { sidebar.classList.add('open'); overlay.classList.add('open'); }
  function close() { sidebar.classList.remove('open'); overlay.classList.remove('open'); }

  openBtn?.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);
  overlay.addEventListener('click', close);

  // Filters in sidebar
  document.getElementById('filterList')?.querySelectorAll('.filter-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const f=btn.dataset.filter;
      Markers.setFilter(f);
      // sync floating bar
      document.querySelectorAll('.filter-pill').forEach(p=>{
        p.classList.toggle('active', p.dataset.filter===f);
      });
    });
  });
}
