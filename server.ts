import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import isSea from 'is-sea';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
app.use(cors());
app.use(express.json());
app.set('trust proxy', 1);

const createLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static('dist'));
}

app.get('/api/occurrences', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('occurrences')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    const mappedData = data.map(d => ({
      ...d,
      createdAt: d.created_at
    }));
    
    res.json(mappedData);
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
      
    if (error) throw error;
    
    const mappedData = data.map(d => ({
      ...d,
      createdAt: d.created_at
    }));
    
    res.status(201).json(mappedData[0]);
  } catch (error) {
    console.error('Error creating occurrence:', error);
    res.status(500).json({ error: 'Failed to create occurrence' });
  }
});

app.post('/api/seed', async (req, res) => {
  try {
    const { data: existing, error: checkError } = await supabase
      .from('occurrences')
      .select('id')
      .limit(1);
      
    if (checkError) throw checkError;
    
    if (existing.length === 0) {
      const now = Date.now();
      const DEMO = [
        {type:'assalto',           lat:-23.5289, lng:-46.3635, description:'Roubo de celular',          created_at: new Date(now - 1000 * 60 * 30)},
        {type:'assalto',           lat:-23.5398, lng:-46.3475, description:'Assalto à mão armada',       created_at: new Date(now - 1000 * 60 * 60 * 2)},
        {type:'assalto',           lat:-23.5502, lng:-46.6341, description:'Roubo de veículo',           created_at: new Date(now - 1000 * 60 * 60 * 5)},
        {type:'furto',             lat:-23.6949, lng:-46.7587, description:'Furto em estabelecimento',   created_at: new Date(now - 1000 * 60 * 60 * 24)},
        {type:'tentativa_assalto', lat:-23.6685, lng:-46.769,  description:'Tentativa frustrada',        created_at: new Date(now - 1000 * 60 * 60 * 48)},
        {type:'area_perigosa',     lat:-23.6347, lng:-46.7549, description:'Área com alto risco noturno',created_at: new Date(now - 1000 * 60 * 60 * 72)},
        {type:'presenca_suspeita', lat:-23.5512, lng:-46.6180, description:'Grupo suspeito na calçada',  created_at: new Date(now - 1000 * 60 * 15)},
        {type:'vandalismo',        lat:-23.5448, lng:-46.6388, description:'Ponto de ônibus depredado',  created_at: new Date(now - 1000 * 60 * 45)},
        {type:'rua_escura',        lat:-23.5620, lng:-46.6540, description:'Sem iluminação pública',     created_at: new Date(now - 1000 * 60 * 60 * 3)},
        {type:'falta_iluminacao',  lat:-23.5780, lng:-46.6710, description:'Lâmpadas queimadas',         created_at: new Date(now - 1000 * 60 * 60 * 12)},
        {type:'alagamento',        lat:-23.5664, lng:-46.5073, description:'Via com 30cm de água',       created_at: new Date(now - 1000 * 60 * 5)},
        {type:'enchente',          lat:-23.5844, lng:-46.5492, description:'Via completamente alagada',  created_at: new Date(now - 1000 * 60 * 60)},
        {type:'alagamento',        lat:-23.579,  lng:-46.5798, description:'Trânsito interrompido',      created_at: new Date(now - 1000 * 60 * 60 * 4)},
        {type:'buraco_via',        lat:-23.5603, lng:-46.5996, description:'Buraco grande na pista',     created_at: new Date(now - 1000 * 60 * 60 * 24 * 5)}
      ];
      
      const { error: insertError } = await supabase.from('occurrences').insert(DEMO);
      if (insertError) throw insertError;
      
      return res.json({ message: 'Seeded successfully' });
    }
    
    return res.json({ message: 'Already seeded' });
  } catch (error) {
    console.error('Error seeding data:', error);
    res.status(500).json({ error: 'Failed to seed data' });
  }
});

const PORT = process.env.NODE_ENV === 'production' ? (process.env.PORT || 3000) : 3001;
app.listen(Number(PORT), () => {
  console.log(`Server is running on port ${PORT}`);
});
