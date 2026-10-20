const API_BASE_URL =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_PUBLIC_SECURITY_API_URL) ||
  (typeof process !== 'undefined' && process.env?.VITE_PUBLIC_SECURITY_API_URL) ||
  'https://ais-pre-i62a2zwoizbmsr6t53awod-238922234262.us-east5.run.app/api/public/v1';

const API_KEY =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_PUBLIC_SECURITY_API_KEY) ||
  (typeof process !== 'undefined' && process.env?.VITE_PUBLIC_SECURITY_API_KEY) ||
  'test_api_key_123';

export type PublicSecurityCategory =
  | 'robbery'
  | 'theft'
  | 'vehicle_robbery'
  | 'vehicle_theft'
  | 'bodily_harm'
  | 'homicide'
  | 'sexual_crime'
  | 'drug_related';

export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';

export interface SecurityOccurrence {
  id: string;
  latitude: number;
  longitude: number;
  category: string;
  categoryLabel: string;
  severityWeight: number;
  subcategory: string | null;
  sourceCategory: string | null;
  occurredAt: string | null;
  time: string | null;
  address: string | null;
  bairro: string | null;
  municipality: string;
  stateCode: string;
  boNumber: string | null;
  delegacia: string | null;
  sourceId: string;
  distanceMeters?: number;
  distanceFromRouteMeters?: number;
  nearestSegmentIndex?: number;
}

export interface OccurrencesResponse {
  meta: {
    count: number;
    limit: number;
    spatialMode: 'bbox' | 'radius' | string;
    bbox?: [number, number, number, number];
    categoriesSummary: Record<string, number>;
  };
  data: SecurityOccurrence[];
}

export interface OccurrencesGeoJSONResponse {
  type: 'FeatureCollection';
  metadata: {
    generatedAt: string;
    count: number;
    spatialMode: string;
    categoriesSummary: Record<string, number>;
  };
  features: Array<{
    type: 'Feature';
    id: string;
    geometry: {
      type: 'Point';
      coordinates: [number, number]; // [longitude, latitude]
    };
    properties: Partial<SecurityOccurrence> & {
      id: string;
      category: string;
      categoryLabel: string;
      severityWeight: number;
    };
  }>;
}

export interface HotspotCluster {
  centerLatitude: number;
  centerLongitude: number;
  radiusMeters: number;
  occurrencesCount: number;
  riskScore: number;
  riskLevel: RiskLevel;
  dominantCategory: string;
  dominantCategoryLabel: string;
  categories: Record<string, number>;
}

export interface HeatmapResponse {
  meta: {
    totalPoints: number;
    hotspotsCount: number;
    gridSizeMeters: number;
    pointFormat: string;
  };
  points: [number, number, number][]; // [latitude, longitude, intensity]
  hotspots: HotspotCluster[];
}

export interface RouteCriticalSegment {
  segmentIndex: number;
  from: { lat: number; lon: number };
  to: { lat: number; lon: number };
  lengthMeters: number;
  occurrencesCount: number;
  riskScore: number;
  riskLevel: RiskLevel;
  dominantCategory: string;
  dominantCategoryLabel: string;
  categories: Record<string, number>;
}

export interface RouteSafetyResponse {
  routeSummary: {
    safetyScore: number;
    riskLevel: RiskLevel;
    totalOccurrencesInCorridor: number;
    bufferMeters: number;
    routeLengthMeters: number;
    waypointsCount: number;
    categoryBreakdown: Record<string, number>;
  };
  criticalSegments: RouteCriticalSegment[];
  occurrences: SecurityOccurrence[];
  geojson?: {
    type: 'FeatureCollection';
    metadata: {
      bufferMeters: number;
      safetyScore: number;
      riskLevel: RiskLevel;
    };
    features: any[];
  };
}

export interface OccurrencesQueryParams {
  minLat?: number;
  minLon?: number;
  maxLat?: number;
  maxLon?: number;
  bbox?: string;
  lat?: number;
  lon?: number;
  radius?: number;
  format?: 'json' | 'geojson';
  category?: string;
  limit?: number;
}

export interface HeatmapQueryParams {
  minLat?: number;
  minLon?: number;
  maxLat?: number;
  maxLon?: number;
  bbox?: string;
  lat?: number;
  lon?: number;
  radius?: number;
  gridSizeMeters?: number;
  category?: string;
  limit?: number;
}

export interface RouteSafetyRequest {
  bufferMeters?: number;
  category?: string;
  waypoints: Array<{ lat: number; lon: number } | { latitude: number; longitude: number } | [number, number]>;
}

function getHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
    Authorization: `Bearer ${API_KEY}`,
  };
}

function buildQuery(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      searchParams.set(key, String(val));
    }
  });
  return searchParams.toString();
}

export async function fetchOccurrences(
  params: OccurrencesQueryParams = {}
): Promise<OccurrencesResponse> {
  const qs = buildQuery({ ...params, format: 'json' });
  const url = `${API_BASE_URL}/occurrences${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, { headers: getHeaders() });
  if (!res.ok) {
    throw new Error(`Public Security API /occurrences failed: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchOccurrencesGeoJSON(
  params: Omit<OccurrencesQueryParams, 'format'> = {}
): Promise<OccurrencesGeoJSONResponse> {
  const qs = buildQuery({ ...params, format: 'geojson' });
  const url = `${API_BASE_URL}/occurrences${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, { headers: getHeaders() });
  if (!res.ok) {
    throw new Error(`Public Security API /occurrences (GeoJSON) failed: HTTP ${res.status}`);
  }
  return res.json();
}

export function getOccurrencesGeoJSONUrl(
  params: Omit<OccurrencesQueryParams, 'format'> = {}
): string {
  const qs = buildQuery({ ...params, format: 'geojson', apiKey: API_KEY });
  return `${API_BASE_URL}/occurrences?${qs}`;
}

export async function fetchHeatmapAndHotspots(
  params: HeatmapQueryParams = {}
): Promise<HeatmapResponse> {
  const qs = buildQuery(params);
  const url = `${API_BASE_URL}/occurrences/heatmap${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, { headers: getHeaders() });
  if (!res.ok) {
    throw new Error(`Public Security API /occurrences/heatmap failed: HTTP ${res.status}`);
  }
  return res.json();
}

export async function analyzeRouteSafety(
  payload: RouteSafetyRequest
): Promise<RouteSafetyResponse> {
  const url = `${API_BASE_URL}/route/safety`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      bufferMeters: payload.bufferMeters ?? 300,
      category: payload.category,
      waypoints: payload.waypoints,
    }),
  });
  if (!res.ok) {
    throw new Error(`Public Security API /route/safety failed: HTTP ${res.status}`);
  }
  return res.json();
}

export const publicSecurityClient = {
  fetchOccurrences,
  fetchOccurrencesGeoJSON,
  getOccurrencesGeoJSONUrl,
  fetchHeatmapAndHotspots,
  analyzeRouteSafety,
};
