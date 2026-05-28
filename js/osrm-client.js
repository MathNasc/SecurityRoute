/* ════════════════════════════════════════════════════
   OSRM CLIENT — js/osrm-client.js
   Thin fetch wrapper around the OSRM HTTP API.
   Points to public demo by default; override CFG.osrm
   with your self-hosted instance in production.
   ════════════════════════════════════════════════════ */

const OSRMClient = {
  /**
   * Fetch up to 3 route alternatives between two coordinates.
   *
   * @param {number} oLat  origin latitude
   * @param {number} oLng  origin longitude
   * @param {number} dLat  destination latitude
   * @param {number} dLng  destination longitude
   * @param {string} profile  'foot' | 'driving' | 'cycling'
   * @returns {Promise<RouteResult[]>}
   */
  async getRoutes(oLat, oLng, dLat, dLng, profile = 'foot') {
    const base = CFG.osrm || 'https://router.project-osrm.org';
    const url =
      `${base}/route/v1/${profile}/` +
      `${oLng},${oLat};${dLng},${dLat}` +
      `?alternatives=2&geometries=geojson&overview=full&steps=false`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`OSRM retornou HTTP ${res.status}`);

    const data = await res.json();
    if (data.code !== 'Ok') {
      throw new Error(`OSRM: ${data.code}${data.message ? ' — ' + data.message : ''}`);
    }
    if (!data.routes?.length) {
      throw new Error('Nenhuma rota encontrada entre os pontos selecionados.');
    }

    return data.routes.map((rt, i) => ({
      index: i,
      distanceKm:  +(rt.distance / 1000).toFixed(2),
      durationMin: Math.round(rt.duration / 60),
      // OSRM returns [lng, lat] — flip to [lat, lng] for Leaflet
      coords: rt.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      geojson: rt.geometry,
    }));
  },
};

/* ── Config patch ──────────────────────────────────────
   Ensure your js/config.js CFG object includes:

     osrm: 'https://router.project-osrm.org',  // demo; self-host in prod

   The OSRMClient reads CFG.osrm at call time.
   ─────────────────────────────────────────────────────*/
