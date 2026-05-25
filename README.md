# Security Route v3

Plataforma colaborativa de segurança urbana — mapa inteligente de riscos.

## Stack
- **Leaflet 1.9** + **OpenStreetMap** — mapa interativo
- **CartoDB Dark Matter** — tiles escuros
- **Nominatim** — geocoding/busca (sem API key)
- **Leaflet.markercluster** — clustering
- **Leaflet.heat** — heatmap de densidade
- Vanilla JS modular — zero framework, zero build step

## Rodar

```bash
python3 -m http.server 8080
# ou
npx serve .
```

Abra http://localhost:8080

## Estrutura

```
sr-v3/
├── index.html
├── css/style.css          # Design system completo
└── js/
    ├── config.js          # 19 tipos, 3 grupos, pesos, dados demo
    ├── api.js             # Nominatim + backend CRUD
    ├── utils.js           # Toast, Stats, Search
    ├── markers.js         # Marcadores, cluster, popups, filtros
    ├── heatmap.js         # Leaflet.heat + Safety Score
    ├── map.js             # Leaflet init, GPS, pin mode
    ├── sheet.js           # Bottom sheet 4 etapas
    ├── filters.js         # Grupos, tipos, horário
    └── app.js             # Inicialização
```

## Categorias (19 tipos)

### 🔴 Segurança Pública (8)
Assalto, Tentativa de Assalto, Furto, Área Perigosa,
Presença Suspeita, Vandalismo, Rua Escura, Falta de Iluminação

### 🔵 Infraestrutura & Clima (7)
Alagamento, Enchente, Deslizamento, Buraco na Via,
Bueiro Aberto, Queda de Árvore, Obra/Interdição

### 🟡 Mobilidade & Trânsito (4)
Rua Estreita, Acidente Frequente,
Perigoso para Pedestres, Trânsito Perigoso

## Conectar backend

```html
<!-- antes dos scripts em index.html -->
<script>window.SR_API_URL = 'https://sua-api.com';</script>
```

Endpoints: `GET /occurrences` e `POST /occurrences`

## Safety Score

Calculado em tempo real com base na:
- Densidade de ocorrências no viewport atual
- Peso de cada tipo (assalto=10, alagamento=6, rua estreita=3…)
- Área geográfica visível

Resultado: 🟢 Seguro (≥70) | 🟡 Atenção (40–69) | 🔴 Alto Risco (<40)
