/* ════════════════════════════════════════════════════
   SEARCH
   ════════════════════════════════════════════════════ */
function initSearch(inputId, listId, float=false) {
  const inp = document.getElementById(inputId);
  const lst = document.getElementById(listId);
  if (!inp||!lst) return;
  let timer;

  function render(results) {
    if (!results.length){ lst.classList.remove('open'); return; }
    lst.innerHTML = results.map(r=>`
      <div class="autocomplete-item" data-lat="${r.lat}" data-lng="${r.lng}">
        <div class="ac-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
        <div class="ac-text">
          <div class="ac-primary">${_esc(r.primary)}</div>
          <div class="ac-secondary">${_esc(r.secondary)}</div>
        </div>
      </div>`).join('');
    lst.classList.add('open');
    lst.querySelectorAll('.autocomplete-item').forEach(item=>{
      item.addEventListener('click',()=>{
        MapMod.flyTo(+item.dataset.lat,+item.dataset.lng,16);
        inp.value=item.querySelector('.ac-primary').textContent;
        lst.classList.remove('open');
        const clearBtn=document.getElementById('searchClear');
        if (clearBtn) clearBtn.classList.add('visible');
      });
    });
  }

  inp.addEventListener('input',()=>{
    clearTimeout(timer);
    const v=inp.value.trim();
    const clearBtn=document.getElementById('searchClear');
    if (clearBtn) clearBtn.classList.toggle('visible',v.length>0);
    if (v.length<3){ lst.classList.remove('open'); return; }
    timer=setTimeout(async()=>{
      const r=await API.searchAddress(v); render(r);
    },380);
  });

  inp.addEventListener('keydown',e=>{
    if (e.key==='Escape') lst.classList.remove('open');
  });

  document.addEventListener('click',e=>{
    if (!e.target.closest(`#${inputId}`)&&!e.target.closest(`#${listId}`))
      lst.classList.remove('open');
  });
}

function _esc(s){ const d=document.createElement('div');d.textContent=s;return d.innerHTML; }
