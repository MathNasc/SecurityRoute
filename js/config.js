/* ════════════════════════════════════════════════════
   CONFIG
   ════════════════════════════════════════════════════ */
const CFG = {
  center:     [-23.5505, -46.6333],
  zoom:       13,
  maxZoom:    19,
  apiUrl:     window.SR_API_URL || null,
  tile:       'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  tileAttr:   '© <a href="https://carto.com/">CARTO</a> | © <a href="https://openstreetmap.org/copyright">OSM</a>',
  nominatim:  'https://nominatim.openstreetmap.org',
  country:    'br',
};

const TYPES = {
  assalto:     { label:'Assalto',      color:'#f43f5e', colorVar:'var(--red)',   dimVar:'var(--red-dim)',   icon:'⚠' },
  enchente:    { label:'Enchente',     color:'#3b82f6', colorVar:'var(--blue)',  dimVar:'var(--blue-dim)',  icon:'🌊' },
  rua_estreita:{ label:'Rua Estreita', color:'#f59e0b', colorVar:'var(--amber)', dimVar:'var(--amber-dim)', icon:'🚧' },
};

/* Demo data (matches original Android app coordinates) */
const DEMO = [
  {id:1,type:'assalto',lat:-23.5289,lng:-46.3635,description:'Ocorrência reportada',createdAt:'2024-03-10T10:00:00Z'},
  {id:2,type:'assalto',lat:-23.5398,lng:-46.3475,description:'Tentativa de assalto',createdAt:'2024-03-11T14:30:00Z'},
  {id:3,type:'assalto',lat:-23.5502,lng:-46.6341,description:'Roubo de celular',createdAt:'2024-03-12T19:15:00Z'},
  {id:4,type:'assalto',lat:-23.6949,lng:-46.7587,description:'Ocorrência reportada',createdAt:'2024-03-13T08:00:00Z'},
  {id:5,type:'assalto',lat:-23.6685,lng:-46.769, description:'Assalto à mão armada',createdAt:'2024-03-14T22:00:00Z'},
  {id:6,type:'assalto',lat:-23.6347,lng:-46.7549,description:'Ocorrência reportada',createdAt:'2024-03-15T11:00:00Z'},
  {id:7,type:'rua_estreita',lat:-23.5498,lng:-46.5546,description:'Via com largura reduzida',createdAt:'2024-02-20T09:00:00Z'},
  {id:8,type:'rua_estreita',lat:-23.6816,lng:-46.638, description:'Difícil passagem para veículos',createdAt:'2024-02-21T09:00:00Z'},
  {id:9,type:'rua_estreita',lat:-23.6202,lng:-46.4932,description:'Via com largura reduzida',createdAt:'2024-02-22T09:00:00Z'},
  {id:10,type:'rua_estreita',lat:-23.4703,lng:-46.6899,description:'Via com largura reduzida',createdAt:'2024-02-23T09:00:00Z'},
  {id:11,type:'enchente',lat:-23.5664,lng:-46.5073,description:'Alagamento na via',createdAt:'2024-03-10T07:00:00Z'},
  {id:12,type:'enchente',lat:-23.5844,lng:-46.5492,description:'Via completamente alagada',createdAt:'2024-03-10T07:30:00Z'},
  {id:13,type:'enchente',lat:-23.579, lng:-46.5798,description:'Alagamento na via',createdAt:'2024-03-10T08:00:00Z'},
  {id:14,type:'enchente',lat:-23.5603,lng:-46.5996,description:'Alagamento na via',createdAt:'2024-03-10T08:30:00Z'},
  {id:15,type:'enchente',lat:-23.5532,lng:-46.5818,description:'Trânsito interrompido',createdAt:'2024-03-10T09:00:00Z'},
  {id:16,type:'enchente',lat:-23.5531,lng:-46.5282,description:'Alagamento na via',createdAt:'2024-03-10T09:30:00Z'},
];
