import express from 'express';
import cors from 'cors';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import isSea from 'is-sea';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch (err) {
    console.warn('[AI Studio] Supabase client initialization failed, using in-memory store:', err);
  }
}

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

interface Occurrence {
  id: number;
  type: string;
  lat: number;
  lng: number;
  description: string;
  createdAt: string;
  created_at?: string;
}

const now = Date.now();
const initialSeedData: Occurrence[] = [
  { id: 1, type: 'assalto', lat: -23.5289, lng: -46.3635, description: 'Roubo de celular', createdAt: new Date(now - 1000 * 60 * 30).toISOString() },
  { id: 2, type: 'assalto', lat: -23.5398, lng: -46.3475, description: 'Assalto à mão armada', createdAt: new Date(now - 1000 * 60 * 60 * 2).toISOString() },
  { id: 3, type: 'assalto', lat: -23.5502, lng: -46.6341, description: 'Roubo de veículo', createdAt: new Date(now - 1000 * 60 * 60 * 5).toISOString() },
  { id: 4, type: 'furto', lat: -23.6949, lng: -46.7587, description: 'Furto em estabelecimento', createdAt: new Date(now - 1000 * 60 * 60 * 24).toISOString() },
  { id: 5, type: 'tentativa_assalto', lat: -23.6685, lng: -46.769, description: 'Tentativa frustrada', createdAt: new Date(now - 1000 * 60 * 60 * 48).toISOString() },
  { id: 6, type: 'area_perigosa', lat: -23.6347, lng: -46.7549, description: 'Área com alto risco noturno', createdAt: new Date(now - 1000 * 60 * 60 * 72).toISOString() },
  { id: 7, type: 'presenca_suspeita', lat: -23.5512, lng: -46.6180, description: 'Grupo suspeito na calçada', createdAt: new Date(now - 1000 * 60 * 15).toISOString() },
  { id: 8, type: 'vandalismo', lat: -23.5448, lng: -46.6388, description: 'Ponto de ônibus depredado', createdAt: new Date(now - 1000 * 60 * 45).toISOString() },
  { id: 9, type: 'rua_escura', lat: -23.5620, lng: -46.6540, description: 'Sem iluminação pública', createdAt: new Date(now - 1000 * 60 * 60 * 3).toISOString() },
  { id: 10, type: 'falta_iluminacao', lat: -23.5780, lng: -46.6710, description: 'Lâmpadas queimadas', createdAt: new Date(now - 1000 * 60 * 60 * 12).toISOString() },
  { id: 11, type: 'alagamento', lat: -23.5664, lng: -46.5073, description: 'Via com 30cm de água', createdAt: new Date(now - 1000 * 60 * 5).toISOString() },
  { id: 12, type: 'enchente', lat: -23.5844, lng: -46.5492, description: 'Via completamente alagada', createdAt: new Date(now - 1000 * 60 * 60).toISOString() },
  { id: 13, type: 'alagamento', lat: -23.579, lng: -46.5798, description: 'Trânsito interrompido', createdAt: new Date(now - 1000 * 60 * 60 * 4).toISOString() },
  { id: 14, type: 'buraco_via', lat: -23.5603, lng: -46.5996, description: 'Buraco grande na pista', createdAt: new Date(now - 1000 * 60 * 60 * 24 * 5).toISOString() },
];
let occurrencesStore: Occurrence[] = [...initialSeedData];
let nextId = 15;

app.get('/api/occurrences', async (req, res) => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('occurrences')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mappedData = data.map((d: any) => ({
          ...d,
          createdAt: d.created_at || d.createdAt,
        }));
        return res.json(mappedData);
      }
    } catch (error) {
      console.warn('Error fetching occurrences from Supabase, using in-memory store:', error);
    }
  }
  res.json(occurrencesStore);
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

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('occurrences')
          .insert([
            {
              type,
              lat: latNum,
              lng: lngNum,
              description,
            }
          ])
          .select();

        if (!error && data && data.length > 0) {
          const mappedData = {
            ...data[0],
            createdAt: data[0].created_at || data[0].createdAt,
          };
          return res.status(201).json(mappedData);
        }
      } catch (err) {
        console.warn('Error creating occurrence in Supabase, using in-memory store:', err);
      }
    }

    const newOcc: Occurrence = {
      id: nextId++,
      type,
      lat: latNum,
      lng: lngNum,
      description,
      createdAt: new Date().toISOString(),
    };
    occurrencesStore.unshift(newOcc);
    res.status(201).json(newOcc);
  } catch (error) {
    console.error('Error creating occurrence:', error);
    res.status(500).json({ error: 'Failed to create occurrence' });
  }
});

app.post('/api/seed', async (req, res) => {
  try {
    if (supabase) {
      try {
        const { data: existing, error: checkError } = await supabase
          .from('occurrences')
          .select('id')
          .limit(1);

        if (!checkError && existing && existing.length === 0) {
          const demoRows = initialSeedData.map(d => ({
            type: d.type,
            lat: d.lat,
            lng: d.lng,
            description: d.description,
            created_at: d.createdAt,
          }));

          const { error: insertError } = await supabase.from('occurrences').insert(demoRows);
          if (!insertError) {
            return res.json({ message: 'Seeded successfully' });
          }
        } else if (!checkError && existing && existing.length > 0) {
          return res.json({ message: 'Already seeded' });
        }
      } catch (err) {
        console.warn('Error seeding in Supabase, using in-memory store:', err);
      }
    }

    if (occurrencesStore.length === 0) {
      occurrencesStore = [...initialSeedData];
      return res.json({ message: 'Seeded successfully' });
    }

    return res.json({ message: 'Already seeded' });
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

startServer();
