/* ════════════════════════════════════════════════════
   SEARCH — js/search.js
   ════════════════════════════════════════════════════ */

function initSearch(inputId, listId) {
  const inp = document.getElementById(inputId);
  const lst = document.getElementById(listId);
  if (!inp || !lst) return;

  let timer;

  function render(results, query) {
    if (!results.length) { lst.classList.remove('open'); return; }

    lst.innerHTML = results.map(r => `
      <div class="autocomplete-item" data-lat="${r.lat}" data-lng="${r.lng}"
           data-primary="${_esc(r.primary)}"
           data-has-num="${/,\s*\d/.test(r.primary) ? '1' : '0'}">
        <div class="ac-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
        <div class="ac-text">
          <div class="ac-primary">${_hl(r.primary, query)}</div>
          ${r.secondary ? `<div class="ac-secondary">${_esc(r.secondary)}</div>` : ''}
        </div>
        ${r.primary && !/,\s*\d/.test(r.primary)
          ? '<div style="margin-left:auto;font-family:var(--fm);font-size:9px;color:var(--tx3);flex-shrink:0;padding-left:6px">+ nº</div>'
          : ''}
      </div>`).join('');

    lst.classList.add('open');

    lst.querySelectorAll('.autocomplete-item').forEach(item => {
      item.addEventListener('click', () => {
        MapMod.flyTo(+item.dataset.lat, +item.dataset.lng, 17);
        inp.value = item.dataset.primary;
        lst.classList.remove('open');

        const clr = document.getElementById('searchClear');
        if (clr) clr.classList.add('visible');

        // No house number — prompt user to refine
        if (item.dataset.hasNum !== '1') {
          _showSearchHint(inp, 'Adicione o número: ex. , 123');
          inp.focus();
          const len = inp.value.length;
          inp.setSelectionRange(len, len);
        }
      });
    });
  }

  inp.addEventListener('input', () => {
    clearTimeout(timer);
    const v = inp.value.trim();
    _hideSearchHint(inp);

    const clr = document.getElementById('searchClear');
    if (clr) clr.classList.toggle('visible', v.length > 0);

    if (v.length < (/\d/.test(v) ? 4 : 3)) { lst.classList.remove('open'); return; }
    timer = setTimeout(async () => render(await API.searchAddress(v), v), 450);
  });

  inp.addEventListener('keydown', e => {
    if (e.key === 'Escape') lst.classList.remove('open');
  });

  document.addEventListener('click', e => {
    if (!e.target.closest(`#${inputId}`) && !e.target.closest(`#${listId}`)) {
      lst.classList.remove('open');
      _hideSearchHint(inp);
    }
  });
}

function _showSearchHint(inp, text) {
  _hideSearchHint(inp);
  const hint = document.createElement('div');
  hint.className = 'search-num-hint';
  hint.textContent = text;
  inp.closest('.sw')?.insertAdjacentElement('afterend', hint);
}

function _hideSearchHint(inp) {
  inp.closest('.sb-search')?.querySelector('.search-num-hint')?.remove();
}

// Highlight query words in result text — single-pass to avoid corrupting mark tags
function _hl(text, query) {
  if (!text) return '';
  const words = (query || '').trim().split(/\s+/).filter(w => w.length > 1);
  const escaped = _esc(text);
  if (!words.length) return escaped;
  const pattern = words
    .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
  return escaped.replace(
    new RegExp(`(${pattern})`, 'gi'),
    '<mark class="sh">$1</mark>'
  );
}

function _esc(s) {
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}
