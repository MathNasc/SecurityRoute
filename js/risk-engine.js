/* ════════════════════════════════════════════════════
   RISK ENGINE  — js/risk-engine.js
   Client-side mirror of backend/services/risk-engine/RiskScorer.js
   Used when no backend is available; replace with API call in prod.
   ════════════════════════════════════════════════════ */

const RISK_CFG = {
  weights: {
    assalto: 10, tentativa_assalto: 8, furto: 7, area_perigosa: 9,
    presenca_suspeita: 5, vandalismo: 4, rua_escura: 3, falta_iluminacao: 3,
    alagamento: 6, enchente: 7, deslizamento: 8, buraco_via: 4,
    bueiro_aberto: 5, queda_arvore: 6, obra_interdicao: 3,
    rua_estreita: 3, acidente_frequente: 7, rua_perigosa_pedestres: 6,
    transito_perigoso: 5,
  },
  // How much nighttime amplifies each type (1.0 = no change)
  nightMult: {
    rua_escura: 3.0, falta_iluminacao: 2.5, area_perigosa: 1.7,
    assalto: 1.8, tentativa_assalto: 1.6, presenca_suspeita: 1.5,
    furto: 1.3, vandalismo: 1.2, acidente_frequente: 1.2, obra_interdicao: 0.4,
  },
  influenceKm:     0.3,   // incidents within 300 m affect a route point
  halfLifeDays:    30,    // recency decay half-life
  densityThreshold: 3,    // ≥ 3 incidents nearby → density bonus
  densityBonus:    1.4,   // +40% risk when clustered
  sampleIntervalKm: 0.08, // sample route every ~80 m
  normDivisor:     12,    // calibration divisor (tune to local data density)
};

/* ── Haversine distance ── */
function _haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ── Sample a polyline at roughly intervalKm spacing ── */
function _samplePolyline(coords, intervalKm) {
  if (!coords.length) return [];
  const out = [coords[0]];
  let acc = 0, prev = coords[0];
  for (let i = 1; i < coords.length; i++) {
    acc += _haversineKm(prev[0], prev[1], coords[i][0], coords[i][1]);
    if (acc >= intervalKm) { out.push(coords[i]); acc = 0; }
    prev = coords[i];
  }
  const last = coords[coords.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

/* ── Risk classification helpers ── */
function _riskLabel(s) {
  if (s <= 25) return 'Baixo';
  if (s <= 50) return 'Médio';
  if (s <= 75) return 'Alto';
  return 'Crítico';
}

function _riskColor(s) {
  if (s <= 25) return 'var(--risk-low)';
  if (s <= 50) return 'var(--risk-moderate)';
  if (s <= 75) return 'var(--risk-high)';
  return 'var(--risk-critical)';
}

function _riskColorHex(s) {
  if (s <= 25) return '#22c55e';
  if (s <= 50) return '#eab308';
  if (s <= 75) return '#f97316';
  return '#ef4444';
}

/* ── Public module ── */
const RiskEngine = {
  /**
   * Score a route against a list of incidents.
   * @param {Array<[lat, lng]>} coords  - decoded polyline
   * @param {Array<Incident>}   incidents
   * @param {Date}              [now]
   * @returns {{ riskScore, safetyLevel, safetyColor, safetyColorHex, isNight, hotspots }}
   */
  score(coords, incidents, now = new Date()) {
    const h = now.getHours();
    const isNight = h < 6 || h >= 20;
    const sampled = _samplePolyline(coords, RISK_CFG.sampleIntervalKm);
    let total = 0;
    const hotspots = [];

    for (const [lat, lng] of sampled) {
      const nearby = [];
      for (const inc of incidents) {
        const d = _haversineKm(lat, lng, inc.lat, inc.lng);
        if (d <= RISK_CFG.influenceKm) nearby.push({ inc, d });
      }
      if (!nearby.length) continue;

      let local = 0;
      for (const { inc, d } of nearby) {
        const base    = RISK_CFG.weights[inc.type] ?? 5;
        const night   = isNight ? (RISK_CFG.nightMult[inc.type] ?? 1.0) : 1.0;
        const decay   = Math.max(0, 1 - (d / RISK_CFG.influenceKm) ** 2);
        const ageDays = Math.max(0, (now - new Date(inc.createdAt)) / 86400000);
        const recency = Math.pow(0.5, ageDays / RISK_CFG.halfLifeDays);
        local += base * night * decay * recency;
      }
      if (nearby.length >= RISK_CFG.densityThreshold) local *= RISK_CFG.densityBonus;
      total += local;
      if (local > 4) hotspots.push({ lat, lng, score: local, count: nearby.length });
    }

    const raw = sampled.length > 0
      ? Math.min(100, (total / sampled.length) * RISK_CFG.normDivisor)
      : 0;
    const riskScore = Math.round(raw);

    return {
      riskScore,
      safetyLevel:    _riskLabel(riskScore),
      safetyColor:    _riskColor(riskScore),
      safetyColorHex: _riskColorHex(riskScore),
      isNight,
      hotspots: hotspots
        .sort((a, b) => b.score - a.score)
        .slice(0, 5),
    };
  },
};
