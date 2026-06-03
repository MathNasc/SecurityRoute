/* ════════════════════════════════════════════════════
   STATS — contadores animados
   Counts only currently visible markers (respects all
   active filters: group, type, and time period).
   ════════════════════════════════════════════════════ */
const Stats = {
  update() {
    const c = Markers.counts(); // already filters by visible

    _anim('stat-security',  c.security  || 0);
    _anim('stat-infra',     c.infra     || 0);
    _anim('stat-mobility',  c.mobility  || 0);
    _anim('stat-total',     c.total     || 0);

    // Update all [data-count] badges (group tabs + type chips)
    document.querySelectorAll('[data-count]').forEach(el => {
      const key = el.dataset.count;
      el.textContent = c[key] ?? 0;
    });

    // Recalculate safety score with visible occurrences only
    if (typeof SafetyScore !== 'undefined') {
      SafetyScore.recalc(Markers.getVisible ? Markers.getVisible() : Markers.getAll());
    }
  },
};

function _anim(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = parseInt(el.textContent) || 0;
  const dur   = 450;
  const t0    = performance.now();
  const step  = ts => {
    const p = Math.min((ts - t0) / dur, 1);
    el.textContent = Math.round(start + (target - start) * p);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
