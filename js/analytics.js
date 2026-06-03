/* ════════════════════════════════════════════════════
   ANALYTICS — js/analytics.js
   Client-side analysis of loaded occurrences.
   Renders directly into #analyticsWrap.
   ════════════════════════════════════════════════════ */

const Analytics = (() => {

  /* ── Public: full render ── */
  function render(occurrences) {
    const wrap = document.getElementById('analyticsWrap');
    if (!wrap) return;
    if (!occurrences.length) {
      wrap.innerHTML = '<div class="an-empty">Nenhuma ocorrência carregada.</div>';
      return;
    }

    const byType  = _countByType(occurrences);
    const byHour  = _countByHour(occurrences);
    const byGroup = _countByGroup(occurrences);

    wrap.innerHTML = `
      ${_renderGroupBars(byGroup, occurrences.length)}
      ${_renderTopTypes(byType)}
      ${_renderHourChart(byHour)}
    `;
  }

  /* ── Group share bars ── */
  function _renderGroupBars(byGroup, total) {
    const rows = Object.values(GROUPS).map(g => {
      const count = byGroup[g.id] || 0;
      const pct   = total ? Math.round((count / total) * 100) : 0;
      return `
        <div class="an-row">
          <span class="an-row-lbl" style="color:${g.color}">${g.short}</span>
          <div class="an-bar-bg">
            <div class="an-bar-fill" style="width:${pct}%;background:${g.color}"></div>
          </div>
          <span class="an-row-val">${count}</span>
        </div>`;
    }).join('');
    return `<div class="an-block">${rows}</div>`;
  }

  /* ── Top 5 types ── */
  function _renderTopTypes(byType) {
    const sorted = Object.entries(byType)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    if (!sorted.length) return '';

    const max = sorted[0][1] || 1;
    const rows = sorted.map(([key, count]) => {
      const t   = TYPES[key] || {};
      const pct = Math.round((count / max) * 100);
      return `
        <div class="an-row">
          <span class="an-row-lbl"
            style="color:${t.color || 'var(--tx2)'};display:flex;align-items:center;gap:4px">
            <span style="width:10px;height:10px;flex-shrink:0;display:inline-flex">${t.icon || ''}</span>
            ${t.label || key}
          </span>
          <div class="an-bar-bg">
            <div class="an-bar-fill" style="width:${pct}%;background:${t.color || 'var(--accent)'}"></div>
          </div>
          <span class="an-row-val">${count}</span>
        </div>`;
    }).join('');

    return `
      <div class="an-section-lbl">Top 5 tipos</div>
      <div class="an-block">${rows}</div>`;
  }

  /* ── 24-hour activity chart ── */
  function _renderHourChart(byHour) {
    const max = Math.max(...Object.values(byHour), 1);
    const cols = Array.from({ length: 24 }, (_, h) => {
      const count = byHour[h] || 0;
      const pct   = Math.round((count / max) * 100);
      const isDay = h >= 6 && h < 20;
      const color = isDay ? 'var(--mob)' : 'var(--inf)';
      return `
        <div class="an-hour-col" title="${h}h: ${count} ocorrências">
          <div class="an-hour-bar" style="height:${Math.max(pct, 2)}%;background:${color}"></div>
          ${h % 6 === 0 ? `<div class="an-hour-lbl">${h}h</div>` : '<div class="an-hour-lbl"></div>'}
        </div>`;
    }).join('');

    return `
      <div class="an-section-lbl">Horário das ocorrências
        <span style="margin-left:auto;display:flex;gap:8px;font-size:9px">
          <span><span style="color:var(--mob)">■</span> Diurno</span>
          <span><span style="color:var(--inf)">■</span> Noturno</span>
        </span>
      </div>
      <div class="an-hour-chart">${cols}</div>`;
  }

  /* ── Counters ── */
  function _countByType(occs) {
    return occs.reduce((acc, o) => {
      acc[o.type] = (acc[o.type] || 0) + 1;
      return acc;
    }, {});
  }

  function _countByGroup(occs) {
    return occs.reduce((acc, o) => {
      const g = TYPES[o.type]?.group;
      if (g) acc[g] = (acc[g] || 0) + 1;
      return acc;
    }, {});
  }

  function _countByHour(occs) {
    return occs.reduce((acc, o) => {
      if (!o.createdAt) return acc;
      const h = new Date(o.createdAt).getHours();
      acc[h] = (acc[h] || 0) + 1;
      return acc;
    }, {});
  }

  return { render };
})();