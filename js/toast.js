/* ════════════════════════════════════════════════════
   TOAST MODULE
   ════════════════════════════════════════════════════ */
var Toast = (() => {
  const wrap = document.getElementById('toastWrap');

  function show(title, msg='', type='info', ms=3500) {
    if (!wrap) return;
    const t = document.createElement('div');
    t.className = `toast toast--${type}`;
    t.style.pointerEvents = 'none';
    t.innerHTML = `<div class="toast-stripe"></div>
      <div class="toast-text">
        <div class="toast-title">${title}</div>
        ${msg ? `<div class="toast-msg">${msg}</div>` : ''}
      </div>`;
    wrap.appendChild(t);
    setTimeout(() => {
      t.classList.add('out');
      t.addEventListener('animationend', () => t.remove(), { once: true });
      setTimeout(() => { if (t.parentNode) t.remove(); }, 300);
    }, ms);
  }

  return { show,
    success:(t,m,ms)=>show(t,m,'success',ms),
    error:  (t,m,ms)=>show(t,m,'error',ms),
    info:   (t,m,ms)=>show(t,m,'info',ms),
    warn:   (t,m,ms)=>show(t,m,'warn',ms),
  };
})();
