/* ════════════════════════════════════════════════════
   TOAST — sistema de notificações
   ════════════════════════════════════════════════════ */
const Toast = (() => {
  const wrap = () => document.getElementById('toastWrap');

  function show(title, msg = '', type = 'info', ms = 3500) {
    const t = document.createElement('div');
    t.className = `toast toast--${type}`;
    t.innerHTML = `<div class="toast-stripe"></div>
      <div class="toast-text">
        <div class="toast-title">${title}</div>
        ${msg ? `<div class="toast-msg">${msg}</div>` : ''}
      </div>`;
    wrap()?.appendChild(t);
    setTimeout(() => { t.classList.add('out'); t.addEventListener('animationend', () => t.remove(), { once: true }); }, ms);
  }

  return {
    show,
    success: (t, m, ms) => show(t, m, 'success', ms),
    error:   (t, m, ms) => show(t, m, 'error',   ms),
    info:    (t, m, ms) => show(t, m, 'info',     ms),
    warn:    (t, m, ms) => show(t, m, 'warn',     ms),
  };
})();

/* ════════════════════════════════════════════════════
   STATS — contadores animados
   ════════════════════════════════════════════════════ */
const Stats = {
  update() {
    const c = Markers.counts();
    _anim('stat-security',  c.security  || 0);
    _anim('stat-infra',     c.infra     || 0);
    _anim('stat-mobility',  c.mobility  || 0);
    _anim('stat-total',     c.total     || 0);

    // Filter counts
    document.querySelectorAll('[data-count]').forEach(el => {
      const key = el.dataset.count;
      el.textContent = c[key] ?? '';
    });
    SafetyScore.recalc(Markers.getAll());
  },
};

function _anim(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = parseInt(el.textContent) || 0;
  const dur = 500, t0 = performance.now();
  const step = ts => {
    const p = Math.min((ts - t0) / dur, 1);
    el.textContent = Math.round(start + (target - start) * p);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ════════════════════════════════════════════════════
   SEARCH — Nominatim autocomplete
   ════════════════════════════════════════════════════ */
function initSearch(inputId, listId) {
  const inp = document.getElementById(inputId);
  const lst = document.getElementById(listId);
  if (!inp || !lst) return;
  let timer;

  function _esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  function render(results) {
    if (!results.length) { lst.classList.remove('open'); return; }
    lst.innerHTML = results.map(r => `
      <div class="ac-item" data-lat="${r.lat}" data-lng="${r.lng}">
        <div class="ac-icon">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
        <div>
          <div class="ac-primary">${_esc(r.primary)}</div>
          <div class="ac-secondary">${_esc(r.secondary)}</div>
        </div>
      </div>`).join('');
    lst.classList.add('open');
    lst.querySelectorAll('.ac-item').forEach(item => {
      item.addEventListener('click', () => {
        MapMod.flyTo(+item.dataset.lat, +item.dataset.lng, 16);
        inp.value = item.querySelector('.ac-primary').textContent;
        lst.classList.remove('open');
      });
    });
  }

  inp.addEventListener('input', () => {
    clearTimeout(timer);
    const v = inp.value.trim();
    document.getElementById(`${inputId}Clear`)?.classList.toggle('visible', v.length > 0);
    if (v.length < 3) { lst.classList.remove('open'); return; }
    timer = setTimeout(async () => render(await API.searchAddress(v)), 380);
  });

  inp.addEventListener('keydown', e => {
    if (e.key === 'Escape') lst.classList.remove('open');
  });

  document.addEventListener('click', e => {
    if (!e.target.closest(`#${inputId}`) && !e.target.closest(`#${listId}`))
      lst.classList.remove('open');
  });
}
