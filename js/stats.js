/* ════════════════════════════════════════════════════
   STATS
   ════════════════════════════════════════════════════ */
const Stats = {
  update() {
    const c = Markers.counts();
    const total = c.total;
    _anim('stat-assalto',  c.assalto);
    _anim('stat-enchente', c.enchente);
    _anim('stat-rua',      c.rua_estreita);
    ['fc-all','fc-assalto','fc-enchente','fc-rua'].forEach((id,i)=>{
      const el=document.getElementById(id);
      if(el) el.textContent=[total,c.assalto,c.enchente,c.rua_estreita][i];
    });
  }
};
function _anim(id, target) {
  const el=document.getElementById(id); if(!el)return;
  const start=parseInt(el.textContent)||0;
  const dur=400, t0=performance.now();
  const step=ts=>{ const p=Math.min((ts-t0)/dur,1); el.textContent=Math.round(start+(target-start)*p); if(p<1)requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
