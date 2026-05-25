/* ════════════════════════════════════════════════════
   CONFIG — Security Route v3
   Tipos, grupos, pesos e dados demo
   ════════════════════════════════════════════════════ */

window.SR_API_URL = window.SR_API_URL || null;

/* ── Tiles & map defaults ── */
const CFG = {
  center:  [-23.5505, -46.6333],
  zoom:    13,
  maxZoom: 19,
  tile:    'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  tileAttr:'© <a href="https://carto.com/">CARTO</a> | © <a href="https://openstreetmap.org/copyright">OSM</a>',
  nominatim:'https://nominatim.openstreetmap.org',
  country: 'br',
};

/* ── Grupos de ocorrência ── */
const GROUPS = {
  security: {
    id:    'security',
    label: 'Segurança Pública',
    short: 'Segurança',
    color: '#f43f5e',
    dimColor: 'rgba(244,63,94,.12)',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  },
  infra: {
    id:    'infra',
    label: 'Infraestrutura & Clima',
    short: 'Infraestrutura',
    color: '#3b82f6',
    dimColor: 'rgba(59,130,246,.12)',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M2 20s2-2 5-2 5 2 8 2 5-2 5-2"/><path d="M12 2v8M8 6l4-4 4 4"/></svg>`,
  },
  mobility: {
    id:    'mobility',
    label: 'Mobilidade & Trânsito',
    short: 'Mobilidade',
    color: '#f59e0b',
    dimColor: 'rgba(245,158,11,.12)',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
  },
};

/* ── Tipos de ocorrência ── */
const TYPES = {
  /* ── Segurança Pública ── */
  assalto: {
    label:'Assalto', group:'security', weight:10, color:'#f43f5e',
    icon:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  },
  tentativa_assalto: {
    label:'Tentativa de Assalto', group:'security', weight:8, color:'#fb7185',
    icon:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  },
  furto: {
    label:'Furto', group:'security', weight:7, color:'#e11d48',
    icon:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
  },
  area_perigosa: {
    label:'Área Perigosa', group:'security', weight:9, color:'#be123c',
    icon:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  },
  presenca_suspeita: {
    label:'Presença Suspeita', group:'security', weight:5, color:'#f43f5e',
    icon:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  },
  vandalismo: {
    label:'Vandalismo', group:'security', weight:4, color:'#fb7185',
    icon:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`,
  },
  rua_escura: {
    label:'Rua Escura', group:'security', weight:3, color:'#9f1239',
    icon:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  },
  falta_iluminacao: {
    label:'Falta de Iluminação', group:'security', weight:3, color:'#881337',
    icon:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 2h6l2 4H7L9 2z"/><path d="M11 6v6"/><path d="M4.22 4.22A10 10 0 0 0 12 22a10 10 0 0 0 7.78-17.78"/></svg>`,
  },

  /* ── Infraestrutura & Clima ── */
  alagamento: {
    label:'Alagamento', group:'infra', weight:6, color:'#3b82f6',
    icon:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M2 20s2-2 5-2 5 2 8 2 5-2 5-2M2 15s2-2 5-2 5 2 8 2 5-2 5-2"/><path d="M12 2v8M8 6l4-4 4 4"/></svg>`,
  },
  enchente: {
    label:'Enchente', group:'infra', weight:7, color:'#1d4ed8',
    icon:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 14v6M8 14v6M12 16v6"/></svg>`,
  },
  deslizamento: {
    label:'Deslizamento', group:'infra', weight:8, color:'#7c3aed',
    icon:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 17l4-8 4 4 4-6 4 10"/><path d="M3 21h18"/></svg>`,
  },
  buraco_via: {
    label:'Buraco na Via', group:'infra', weight:4, color:'#0ea5e9',
    icon:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>`,
  },
  bueiro_aberto: {
    label:'Bueiro Aberto', group:'infra', weight:5, color:'#06b6d4',
    icon:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>`,
  },
  queda_arvore: {
    label:'Queda de Árvore', group:'infra', weight:6, color:'#22c55e',
    icon:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M17 8C8 10 5.9 16.17 3.82 20.41"/><path d="M10.49 9.38A8 8 0 0 0 17 8c0 0 0 4.54-4 7.19"/><path d="M7 18.9c-.33.2-.66.37-1 .5L3 21l1-3.17c.13-.41.34-.8.62-1.13"/></svg>`,
  },
  obra_interdicao: {
    label:'Obra / Interdição', group:'infra', weight:3, color:'#f97316',
    icon:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
  },

  /* ── Mobilidade & Trânsito ── */
  rua_estreita: {
    label:'Rua Estreita', group:'mobility', weight:3, color:'#f59e0b',
    icon:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="3" width="20" height="18" rx="2"/><line x1="8" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="16" y2="21"/></svg>`,
  },
  acidente_frequente: {
    label:'Acidente Frequente', group:'mobility', weight:7, color:'#ef4444',
    icon:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  },
  rua_perigosa_pedestres: {
    label:'Perigoso para Pedestres', group:'mobility', weight:6, color:'#d97706',
    icon:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="5" r="1"/><path d="M9 20l3-8 3 8M9 14h6"/><path d="M12 12v-2l3-2"/></svg>`,
  },
  transito_perigoso: {
    label:'Trânsito Perigoso', group:'mobility', weight:5, color:'#fbbf24',
    icon:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
  },
};

/* Safety score thresholds */
const SAFETY = {
  safe:    { min:70, label:'Seguro',     color:'#10b981', bg:'rgba(16,185,129,.12)', dot:'#10b981' },
  caution: { min:40, label:'Atenção',    color:'#f59e0b', bg:'rgba(245,158,11,.12)', dot:'#f59e0b' },
  danger:  { min:0,  label:'Alto Risco', color:'#f43f5e', bg:'rgba(244,63,94,.12)',  dot:'#f43f5e' },
};

/* ── Demo data (expanded across São Paulo) ── */
const DEMO = [
  {id:1, type:'assalto',           lat:-23.5289, lng:-46.3635, description:'Roubo de celular',          createdAt:'2024-03-10T10:00:00Z'},
  {id:2, type:'assalto',           lat:-23.5398, lng:-46.3475, description:'Assalto à mão armada',       createdAt:'2024-03-11T22:30:00Z'},
  {id:3, type:'assalto',           lat:-23.5502, lng:-46.6341, description:'Roubo de veículo',           createdAt:'2024-03-12T19:15:00Z'},
  {id:4, type:'furto',             lat:-23.6949, lng:-46.7587, description:'Furto em estabelecimento',   createdAt:'2024-03-13T15:00:00Z'},
  {id:5, type:'tentativa_assalto', lat:-23.6685, lng:-46.769,  description:'Tentativa frustrada',        createdAt:'2024-03-14T23:00:00Z'},
  {id:6, type:'area_perigosa',     lat:-23.6347, lng:-46.7549, description:'Área com alto risco noturno',createdAt:'2024-03-15T11:00:00Z'},
  {id:7, type:'presenca_suspeita', lat:-23.5512, lng:-46.6180, description:'Grupo suspeito na calçada',  createdAt:'2024-03-16T20:00:00Z'},
  {id:8, type:'vandalismo',        lat:-23.5448, lng:-46.6388, description:'Ponto de ônibus depredado',  createdAt:'2024-03-17T08:00:00Z'},
  {id:9, type:'rua_escura',        lat:-23.5620, lng:-46.6540, description:'Sem iluminação pública',     createdAt:'2024-03-18T21:00:00Z'},
  {id:10,type:'falta_iluminacao',  lat:-23.5780, lng:-46.6710, description:'Lâmpadas queimadas',         createdAt:'2024-03-19T19:00:00Z'},

  {id:11,type:'alagamento',        lat:-23.5664, lng:-46.5073, description:'Via com 30cm de água',       createdAt:'2024-03-10T07:00:00Z'},
  {id:12,type:'enchente',          lat:-23.5844, lng:-46.5492, description:'Via completamente alagada',  createdAt:'2024-03-10T07:30:00Z'},
  {id:13,type:'alagamento',        lat:-23.579,  lng:-46.5798, description:'Trânsito interrompido',      createdAt:'2024-03-10T08:00:00Z'},
  {id:14,type:'buraco_via',        lat:-23.5603, lng:-46.5996, description:'Buraco grande na pista',     createdAt:'2024-03-11T09:00:00Z'},
  {id:15,type:'bueiro_aberto',     lat:-23.5532, lng:-46.5818, description:'Bueiro sem tampa',           createdAt:'2024-03-12T10:00:00Z'},
  {id:16,type:'deslizamento',      lat:-23.5531, lng:-46.5282, description:'Risco de deslizamento',      createdAt:'2024-03-13T11:00:00Z'},
  {id:17,type:'queda_arvore',      lat:-23.5890, lng:-46.6100, description:'Árvore caiu na via',         createdAt:'2024-03-14T12:00:00Z'},
  {id:18,type:'obra_interdicao',   lat:-23.5700, lng:-46.6400, description:'Obra interditando faixa',    createdAt:'2024-03-15T13:00:00Z'},

  {id:19,type:'rua_estreita',      lat:-23.5498, lng:-46.5546, description:'Passagem difícil p/ caminhões',createdAt:'2024-02-20T09:00:00Z'},
  {id:20,type:'acidente_frequente',lat:-23.6816, lng:-46.638,  description:'Cruzamento perigoso',        createdAt:'2024-02-21T09:00:00Z'},
  {id:21,type:'rua_perigosa_pedestres',lat:-23.6202,lng:-46.4932,description:'Sem calçada adequada',     createdAt:'2024-02-22T09:00:00Z'},
  {id:22,type:'transito_perigoso', lat:-23.4703, lng:-46.6899, description:'Ultrapassagens perigosas',   createdAt:'2024-02-23T09:00:00Z'},
  {id:23,type:'acidente_frequente',lat:-23.5410, lng:-46.6320, description:'3 acidentes em 1 mês',       createdAt:'2024-02-24T09:00:00Z'},
  {id:24,type:'rua_estreita',      lat:-23.5580, lng:-46.6650, description:'Largura menor que 3m',       createdAt:'2024-02-25T09:00:00Z'},

  {id:25,type:'assalto',           lat:-23.5320, lng:-46.6440, description:'Ocorrência reportada',       createdAt:'2024-03-20T22:00:00Z'},
  {id:26,type:'furto',             lat:-23.5450, lng:-46.6580, description:'Furto de bolsa',             createdAt:'2024-03-21T14:00:00Z'},
  {id:27,type:'area_perigosa',     lat:-23.5580, lng:-46.6420, description:'Histórico de violência',     createdAt:'2024-03-22T10:00:00Z'},
  {id:28,type:'alagamento',        lat:-23.5720, lng:-46.6200, description:'Chuva forte alagou a via',   createdAt:'2024-03-23T08:00:00Z'},
  {id:29,type:'buraco_via',        lat:-23.5200, lng:-46.6800, description:'Buraco no asfalto',          createdAt:'2024-03-24T09:00:00Z'},
  {id:30,type:'rua_escura',        lat:-23.5860, lng:-46.6900, description:'Região sem iluminação',      createdAt:'2024-03-25T20:00:00Z'},
];
