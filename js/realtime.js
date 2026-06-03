/* ════════════════════════════════════════════════════
   REALTIME — js/realtime.js
   Polls for new occurrences every INTERVAL_MS.
   Only adds markers not yet in Markers — no flicker.
   ════════════════════════════════════════════════════ */

const Realtime = (() => {
  const INTERVAL_MS  = 3 * 60 * 1000;  // 3 minutes
  const NOTIFY_LIMIT = 5;              // max toasts at once

  let _timer      = null;
  let _lastFetch  = Date.now();
  let _knownIds   = new Set();
  let _active     = false;

  /* ── Start polling ── */
  function start(initialOccurrences = []) {
    // Seed known IDs from initial load
    initialOccurrences.forEach(o => _knownIds.add(o.id));
    _active = true;
    _schedule();
    _updateIndicator(true);
    console.log('[Realtime] Polling started — interval:', INTERVAL_MS / 1000, 's');
  }

  function stop() {
    clearTimeout(_timer);
    _active = false;
    _updateIndicator(false);
  }

  function _schedule() {
    if (!_active) return;
    _timer = setTimeout(async () => {
      await _poll();
      _schedule();
    }, INTERVAL_MS);
  }

  /* ── Fetch and diff ── */
  async function _poll() {
    try {
      const occs = await API.getOccurrences();
      const fresh = occs.filter(o => !_knownIds.has(o.id));

      if (fresh.length === 0) {
        console.log('[Realtime] No new occurrences');
        return;
      }

      // Add new markers
      fresh.forEach(o => {
        _knownIds.add(o.id);
        Markers.add(o, false);
      });

      Stats.update();
      Analytics.render(Markers.getAll());

      // Notify user (batch if many)
      if (fresh.length <= NOTIFY_LIMIT) {
        fresh.forEach(o => {
          const t = TYPES[o.type] || {};
          Toast.warn(
            `Nova ocorrência: ${t.label || o.type}`,
            o.description ? o.description.slice(0, 60) : '',
            4000
          );
        });
      } else {
        Toast.warn(
          `${fresh.length} novas ocorrências`,
          'Mapa atualizado com novos dados.',
          4000
        );
      }

      _lastFetch = Date.now();
      _updateIndicator(true, fresh.length);
    } catch (err) {
      console.warn('[Realtime] Poll failed:', err.message);
    }
  }

  /* ── Update the live indicator dot in the UI ── */
  function _updateIndicator(online, newCount = 0) {
    const dot   = document.getElementById('realtimeDot');
    const label = document.getElementById('realtimeLabel');
    if (!dot || !label) return;

    dot.style.background = online ? 'var(--green)' : 'var(--tx3)';
    dot.style.boxShadow  = online ? '0 0 5px rgba(16,185,129,.8)' : 'none';

    if (newCount > 0) {
      label.textContent = `+${newCount} agora`;
      setTimeout(() => { label.textContent = 'Ao vivo'; }, 4000);
    } else {
      label.textContent = online ? 'Ao vivo' : 'Offline';
    }
  }

  /* ── Manual refresh ── */
  async function refresh() {
    clearTimeout(_timer);
    await _poll();
    if (_active) _schedule();
  }

  return { start, stop, refresh };
})();