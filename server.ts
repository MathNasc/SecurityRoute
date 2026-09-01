import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
app.use(cors());
app.use(express.json());

// API Routes
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
    
    // Map created_at to createdAt for frontend compatibility
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

app.post('/api/occurrences', async (req, res) => {
  try {
    const { type, lat, lng, description } = req.body;
    
    if (!type || lat === undefined || lng === undefined || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data, error } = await supabase
      .from('occurrences')
      .insert([
        {
          type,
          lat: Number(lat),
          lng: Number(lng),
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
      const DEMO = [
        {type:'assalto',           lat:-23.5289, lng:-46.3635, description:'Roubo de celular',          created_at: new Date('2024-03-10T10:00:00Z')},
        {type:'assalto',           lat:-23.5398, lng:-46.3475, description:'Assalto à mão armada',       created_at: new Date('2024-03-11T22:30:00Z')},
        {type:'assalto',           lat:-23.5502, lng:-46.6341, description:'Roubo de veículo',           created_at: new Date('2024-03-12T19:15:00Z')},
        {type:'furto',             lat:-23.6949, lng:-46.7587, description:'Furto em estabelecimento',   created_at: new Date('2024-03-13T15:00:00Z')},
        {type:'tentativa_assalto', lat:-23.6685, lng:-46.769,  description:'Tentativa frustrada',        created_at: new Date('2024-03-14T23:00:00Z')},
        {type:'area_perigosa',     lat:-23.6347, lng:-46.7549, description:'Área com alto risco noturno',created_at: new Date('2024-03-15T11:00:00Z')},
        {type:'presenca_suspeita', lat:-23.5512, lng:-46.6180, description:'Grupo suspeito na calçada',  created_at: new Date('2024-03-16T20:00:00Z')},
        {type:'vandalismo',        lat:-23.5448, lng:-46.6388, description:'Ponto de ônibus depredado',  created_at: new Date('2024-03-17T08:00:00Z')},
        {type:'rua_escura',        lat:-23.5620, lng:-46.6540, description:'Sem iluminação pública',     created_at: new Date('2024-03-18T21:00:00Z')},
        {type:'falta_iluminacao',  lat:-23.5780, lng:-46.6710, description:'Lâmpadas queimadas',         created_at: new Date('2024-03-19T19:00:00Z')},
        {type:'alagamento',        lat:-23.5664, lng:-46.5073, description:'Via com 30cm de água',       created_at: new Date('2024-03-10T07:00:00Z')},
        {type:'enchente',          lat:-23.5844, lng:-46.5492, description:'Via completamente alagada',  created_at: new Date('2024-03-10T07:30:00Z')},
        {type:'alagamento',        lat:-23.579,  lng:-46.5798, description:'Trânsito interrompido',      created_at: new Date('2024-03-10T08:00:00Z')},
        {type:'buraco_via',        lat:-23.5603, lng:-46.5996, description:'Buraco grande na pista',     created_at: new Date('2024-03-11T09:00:00Z')}
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

