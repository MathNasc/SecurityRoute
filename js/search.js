/* ════════════════════════════════════════════════════
   SEARCH — js/search.js
   Nominatim autocomplete for sidebar + float bar.
   House numbers shown highlighted in results.
   ════════════════════════════════════════════════════ */

function initSearch(inputId, listId) {
  const inp = document.getElementById(inputId);
  const lst = document.getElementById(listId);
  if (!inp || !lst) return;

  let timer;

  /* ── Render result list ── */
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
          <div class="ac-primary">${_highlight(r.primary, inp.value)}</div>
          ${r.secondary ? `<div class="ac-secondary">${_esc(r.secondary)}</div>` : ''}
        </div>
      </div>`).join('');

    lst.classList.add('open');

    lst.querySelectorAll('.autocomplete-item').forEach(item => {
      item.addEventListener('click', () => {
        MapMod.flyTo(+item.dataset.lat, +item.dataset.lng, 17);
        // Strip HTML tags for the input value
        inp.value = item.querySelector('.ac-primary').textContent;
        lst.classList.remove('open');

        const clearBtn = document.getElementById('searchClear');
        if (clearBtn) clearBtn.classList.add('visible');
      });
    });
  }

  /* ── Input handler with debounce ── */
  inp.addEventListener('input', () => {
    clearTimeout(timer);
    const v = inp.value.trim();

    const clearBtn = document.getElementById('searchClear');
    if (clearBtn) clearBtn.classList.toggle('visible', v.length > 0);

    // Trigger from 3 chars, but for queries with numbers start at 4
    // so "Rua X, 1" doesn't fire on every keystroke of the number
    const minLen = /\d/.test(v) ? 4 : 3;
    if (v.length < minLen) { lst.classList.remove('open'); return; }

    timer = setTimeout(async () => {
      const results = await API.searchAddress(v);
      render(results);
    }, 420);  // slightly longer debounce to reduce API spam on fast typing
  });

  inp.addEventListener('keydown', e => {
    if (e.key === 'Escape') lst.classList.remove('open');
  });

  document.addEventListener('click', e => {
    if (!e.target.closest(`#${inputId}`) && !e.target.closest(`#${listId}`)) {
      lst.classList.remove('open');
    }
  });
}

/* ── Highlight matching text in result ── */
function _highlight(text, query) {
  if (!query || !text) return _esc(text);
  // Highlight each word from the query that appears in the result
  const words = query.trim().split(/\s+/).filter(w => w.length > 1);
  let result  = _esc(text);
  words.forEach(word => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(
      new RegExp(`(${escaped})`, 'gi'),
      '<mark style="background:rgba(255,107,43,.25);color:inherit;border-radius:2px;padding:0 1px">$1</mark>'
    );
  });
  return result;
}

function _esc(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
