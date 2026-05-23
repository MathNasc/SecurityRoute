/* ════════════════════════════════════════════════════
   TOAST MODULE
   ════════════════════════════════════════════════════ */
const Toast = (() => {
  const wrap = document.getElementById('toastWrap');

  function show(title, msg='', type='info', ms=3500) {
    const t = document.createElement('div');
    t.className = `toast toast--${type}`;
    t.innerHTML = `<div class="toast-stripe"></div>
      <div class="toast-text">
        <div class="toast-title">${title}</div>
        ${msg ? `<div class="toast-msg">${msg}</div>` : ''}
      </div>`;
    wrap.appendChild(t);
    setTimeout(()=>{ t.classList.add('out'); t.addEventListener('animationend',()=>t.remove(),{once:true}); }, ms);
  }

  return { show,
    success:(t,m,ms)=>show(t,m,'success',ms),
    error:  (t,m,ms)=>show(t,m,'error',ms),
    info:   (t,m,ms)=>show(t,m,'info',ms),
    warn:   (t,m,ms)=>show(t,m,'warn',ms),
  };
})();
