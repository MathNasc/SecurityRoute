import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import isSea from 'is-sea';
import path from 'path';
import { fileURLToPath } from 'url';
import { databaseService } from './src/db/databaseService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.set('trust proxy', 1);

const createLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
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

    if (!type || lat === undefined || lng === undefined || !description) {
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
      description,
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
