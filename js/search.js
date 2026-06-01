/* ════════════════════════════════════════════════════
   SEARCH — js/search.js
   ════════════════════════════════════════════════════ */

function initSearch(inputId, listId) {
  const inp = document.getElementById(inputId);
  const lst = document.getElementById(listId);
  if (!inp || !lst) return;

  let timer;

  function render(results) {
    if (!results.length) { lst.classList.remove('open'); return; }

    lst.innerHTML = results.map(r => `
      <div class="autocomplete-item" data-lat="${r.lat}" data-lng="${r.lng}">
        <div class="ac-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
        <div class="ac-text">
          <div class="ac-primary">${_hl(r.primary, inp.value)}</div>
          ${r.secondary ? `<div class="ac-secondary">${_esc(r.secondary)}</div>` : ''}
        </div>
      </div>`).join('');

    lst.classList.add('open');

    lst.querySelectorAll('.autocomplete-item').forEach(item => {
      item.addEventListener('click', () => {
        MapMod.flyTo(+item.dataset.lat, +item.dataset.lng, 17);
        inp.value = item.querySelector('.ac-primary').textContent;
        lst.classList.remove('open');
        const clr = document.getElementById('searchClear');
        if (clr) clr.classList.add('visible');
      });
    });
  }

  inp.addEventListener('input', () => {
    clearTimeout(timer);
    const v = inp.value.trim();
    const clr = document.getElementById('searchClear');
    if (clr) clr.classList.toggle('visible', v.length > 0);
    // Minimum: 3 chars normally, 4 when digits present (slower CEP/num typing)
    if (v.length < (/\d/.test(v) ? 4 : 3)) { lst.classList.remove('open'); return; }
    timer = setTimeout(async () => render(await API.searchAddress(v)), 450);
  });

  inp.addEventListener('keydown', e => {
    if (e.key === 'Escape') lst.classList.remove('open');
  });

  document.addEventListener('click', e => {
    if (!e.target.closest(`#${inputId}`) && !e.target.closest(`#${listId}`))
      lst.classList.remove('open');
  });
}

// Highlight query words in result text
function _hl(text, query) {
  if (!text) return '';
  let out = _esc(text);
  (query || '').trim().split(/\s+/).filter(w => w.length > 1).forEach(w => {
    const rx = new RegExp(`(${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    out = out.replace(rx, '<mark class="sh">$1</mark>');
  });
  return out;
}

function _esc(s) {
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}
