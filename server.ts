import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import isSea from 'is-sea';
import path from 'path';
import { fileURLToPath } from 'url';
import { databaseService } from './src/db/databaseService.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.set('trust proxy', 1);

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

const createLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const PUBLIC_SECURITY_API_URL = (
  process.env.VITE_PUBLIC_SECURITY_API_URL ||
  process.env.PUBLIC_SECURITY_API_URL ||
  'https://ais-pre-i62a2zwoizbmsr6t53awod-238922234262.us-east5.run.app/api/public/v1'
).replace(/\/+$/, '');

const PUBLIC_SECURITY_API_KEY =
  process.env.VITE_PUBLIC_SECURITY_API_KEY ||
  process.env.PUBLIC_SECURITY_API_KEY ||
  'test_api_key_123';

function getPublicSecurityHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-API-Key': PUBLIC_SECURITY_API_KEY,
    Authorization: `Bearer ${PUBLIC_SECURITY_API_KEY}`,
  };
}

app.get('/api/env.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  const envData = {
    CARTO_API_KEY: process.env.CARTO_API_KEY || process.env.VITE_CARTO_API_KEY || '',
    MAPBOX_TOKEN: process.env.MAPBOX_TOKEN || process.env.VITE_MAPBOX_TOKEN || '',
    VITE_PUBLIC_SECURITY_API_URL: PUBLIC_SECURITY_API_URL,
    VITE_PUBLIC_SECURITY_API_KEY: PUBLIC_SECURITY_API_KEY,
  };
  res.send(`window.ENV = Object.assign(window.ENV || {}, ${JSON.stringify(envData)});`);
});

/* ── Proxy Endpoints for Public Security API (avoids Mixed Content / CORS issues with VPS or Cloud Run) ── */
app.get('/api/public-security/occurrences', async (req, res) => {
  try {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(req.query || {})) {
      if (v !== undefined && v !== null) params.set(k, String(v));
    }
    const qs = params.toString();
    const url = `${PUBLIC_SECURITY_API_URL}/occurrences${qs ? `?${qs}` : ''}`;
    const upstream = await fetch(url, { headers: getPublicSecurityHeaders() });
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `Upstream HTTP ${upstream.status}` });
    }
    const data = await upstream.json();
    res.json(data);
  } catch (error) {
    console.warn('[PublicSecurity Proxy] GET /occurrences failed:', error?.message || error);
    res.status(502).json({ error: 'Public Security API unreachable', details: error?.message });
  }
});

app.get('/api/public-security/occurrences/heatmap', async (req, res) => {
  try {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(req.query || {})) {
      if (v !== undefined && v !== null) params.set(k, String(v));
    }
    const qs = params.toString();
    const url = `${PUBLIC_SECURITY_API_URL}/occurrences/heatmap${qs ? `?${qs}` : ''}`;
    const upstream = await fetch(url, { headers: getPublicSecurityHeaders() });
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `Upstream HTTP ${upstream.status}` });
    }
    const data = await upstream.json();
    res.json(data);
  } catch (error) {
    console.warn('[PublicSecurity Proxy] GET /occurrences/heatmap failed:', error?.message || error);
    res.status(502).json({ error: 'Public Security API heatmap unreachable', details: error?.message });
  }
});

app.post('/api/public-security/route/safety', async (req, res) => {
  try {
    const url = `${PUBLIC_SECURITY_API_URL}/route/safety`;
    const upstream = await fetch(url, {
      method: 'POST',
      headers: getPublicSecurityHeaders(),
      body: JSON.stringify(req.body),
    });
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `Upstream HTTP ${upstream.status}` });
    }
    const data = await upstream.json();
    res.json(data);
  } catch (error) {
    console.warn('[PublicSecurity Proxy] POST /route/safety failed:', error?.message || error);
    res.status(502).json({ error: 'Public Security API route/safety unreachable', details: error?.message });
  }
});

app.get('/api/occurrences', async (req, res) => {
  try {
    const occurrences = await databaseService.getAllOccurrences();
    res.json(occurrences);
  } catch (error) {
    console.error('Error fetching occurrences:', error);
    res.status(500).json({ error: 'Failed to fetch occurrences' });
  }
});

app.post('/api/occurrences', createLimiter, async (req, res) => {
  try {
    const { type, lat, lng, description } = req.body;

    const descText = (description || req.body.address || '').trim();

    if (!type || lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const latNum = Number(lat);
    const lngNum = Number(lng);

    if (isNaN(latNum) || isNaN(lngNum) || latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    if (isSea(latNum, lngNum)) {
      return res.status(400).json({ error: 'Cannot report an occurrence in the ocean' });
    }

    const newOcc = await databaseService.createOccurrence({
      type,
      lat: latNum,
      lng: lngNum,
      description: descText,
    });

    res.status(201).json(newOcc);
  } catch (error) {
    console.error('Error creating occurrence:', error);
    res.status(500).json({ error: 'Failed to create occurrence' });
  }
});

app.post('/api/seed', async (req, res) => {
  try {
    const result = await databaseService.seedOccurrences();
    res.json(result);
  } catch (error) {
    console.error('Error seeding data:', error);
    res.status(500).json({ error: 'Failed to seed data' });
  }
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';
  const PORT = 3000;

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
