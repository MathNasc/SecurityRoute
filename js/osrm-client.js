/* ════════════════════════════════════════════════════
   OSRM CLIENT — js/osrm-client.js
   ════════════════════════════════════════════════════ */

const OSRMClient = {
  /**
   * Fetch route alternatives between two coordinates.
   * Public OSRM demo only guarantees the 'driving' profile.
   * For 'foot' and 'cycling', run your own OSRM instance.
   *
   * @param {number} oLat  origin latitude
   * @param {number} oLng  origin longitude
   * @param {number} dLat  destination latitude
   * @param {number} dLng  destination longitude
   * @param {string} profile  'driving' | 'foot' | 'cycling'
   * @param {number} timeoutMs  abort after this many ms (default 12000)
   */
  async getRoutes(oLat, oLng, dLat, dLng, profile = 'driving', timeoutMs = 12000) {
    const base = (typeof CFG !== 'undefined' && CFG.osrm)
      ? CFG.osrm
      : 'https://router.project-osrm.org';

    const url =
      `${base}/route/v1/${profile}/` +
      `${oLng},${oLat};${dLng},${dLat}` +
      `?alternatives=true&geometries=geojson&overview=full&steps=false`;

    // Abort the request if it takes longer than timeoutMs
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let res;
    try {
      res = await fetch(url, { signal: controller.signal });
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error(
          `O servidor de rotas não respondeu em ${timeoutMs / 1000}s. ` +
          'Verifique sua conexão ou tente novamente.'
        );
      }
      throw new Error(`Falha ao conectar ao servidor de rotas: ${err.message}`);
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      throw new Error(`Servidor de rotas retornou HTTP ${res.status}.`);
    }

    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error('Resposta inválida do servidor de rotas.');
    }

    if (data.code !== 'Ok') {
      // NoRoute is the most common user-facing error
      if (data.code === 'NoRoute') {
        throw new Error(
          'Não foi possível calcular uma rota entre esses pontos. ' +
          'Verifique se os pontos estão em vias acessíveis.'
        );
      }
      throw new Error(`Erro OSRM: ${data.code}${data.message ? ' — ' + data.message : ''}`);
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
