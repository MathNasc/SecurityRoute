# Security Route

> Plataforma colaborativa de segurança urbana — mapa inteligente de riscos e rotas seguras.

---

## Visão Geral

O **Security Route** transforma dados colaborativos de ocorrências urbanas em inteligência de navegação. Usuários reportam incidentes no mapa (assaltos, alagamentos, ruas escuras, obras) e o sistema calcula automaticamente **qual rota tem menor risco** entre dois pontos, considerando a densidade, gravidade e horário das ocorrências.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Mapa | Leaflet 1.9 + OpenStreetMap |
| Tiles | CartoDB Dark Matter |
| Rotas | OSRM (público ou self-hosted) |
| Geocoding | Photon · BrasilAPI · ViaCEP · Nominatim |
| Clustering | Leaflet.markercluster |
| Heatmap | Leaflet.heat |
| Frontend | Vanilla JS modular — zero framework, zero build |
| Backend | Node.js + Express (opcional) |

---

## Funcionalidades

### 🗺️ Mapa Interativo
- Marcadores customizados por categoria e tipo de ocorrência
- Clustering automático com contagem
- Heatmap de densidade de risco
- Safety Score em tempo real baseado na área visível
- Filtros por categoria (Segurança / Infraestrutura / Mobilidade) e período (diurno/noturno)
- Busca de endereço com autocomplete multi-fonte

### 🛡️ Rota Segura
- Integração com OSRM para busca de rotas alternativas
- Score de risco calculado ponto a ponto ao longo de cada rota
- Comparação visual entre rotas (mais segura × mais rápida)
- Marcação de zonas de risco no trajeto selecionado
- Perfis: a pé · carro · bicicleta
- Reverse geocode ao clicar no mapa

### 📍 Reporte de Ocorrências
- Bottom sheet em 4 etapas: Categoria → Tipo → Pin no mapa → Formulário
- 19 tipos em 3 grupos com ícones e cores distintas
- Integração com backend REST ou modo demo local

### 🔍 Busca de Endereço (multi-fonte)
- **Photon** — geocoder OSM com melhor cobertura de numeração
- **BrasilAPI CEP v2** — dados dos Correios com coordenadas exatas
- **ViaCEP** — busca por logradouro + cidade + UF
- **Nominatim estruturado** — `street=123 Rua X` para precisão em números
- Deduplicação automática, resultados com número de residência sobem no ranking
- Suporte a CEP direto: `01310-100`
- Highlight dos termos digitados nos resultados

---

## Estrutura do Projeto

```
security-route/
│
├── index.html                  # App completo — CSS inline + HTML
│
├── js/
│   ├── config.js               # CFG, GROUPS, TYPES, DEMO data
│   ├── api.js                  # Geocoding multi-fonte + CRUD ocorrências
│   ├── toast.js                # Sistema de notificações
│   ├── markers.js              # Ícones, clusters, popups, filtros
│   ├── map.js                  # Leaflet init, GPS, pin mode
│   ├── heatmap.js              # Leaflet.heat + Safety Score
│   ├── search.js               # Autocomplete da barra de busca
│   ├── filters.js              # Filtros de grupo, tipo e período
│   ├── stats.js                # Contadores animados
│   ├── sheet.js                # Bottom sheet de reporte
│   ├── risk-engine.js          # Score de risco client-side
│   ├── osrm-client.js          # Wrapper OSRM com timeout e retry
│   ├── route-planner.js        # UI e lógica da aba Rota Segura
│   └── app.js                  # Init e wire de todos os módulos
│
└── backend/                    # Opcional — Node.js/Express
    ├── routes/
    │   └── routing.js          # POST /api/routes/safe
    └── services/
        ├── risk-engine/
        │   └── RiskScorer.js   # Motor de risco server-side
        ├── geospatial/
        │   └── SpatialIndex.js # Grid espacial O(1) para proximity queries
        └── routing/
            └── OSRMClient.js   # Cliente OSRM Node.js com timeout
```

---

## Rodar Localmente

```bash
# Clone e acesse o projeto
git clone https://github.com/seu-usuario/security-route.git
cd security-route

# Qualquer servidor estático funciona
python3 -m http.server 8080
# ou
npx serve .
# ou
npx http-server -p 8080
```

Acesse: **http://localhost:8080**

Não há build step, dependências npm ou configuração necessária para o modo demo.

---

## Configuração

### `js/config.js` — variáveis principais

```js
const CFG = {
  center:    [-23.5505, -46.6333],  // centro inicial do mapa
  zoom:      13,
  maxZoom:   19,
  tile:      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  tileAttr:  '© CARTO | © OSM',
  nominatim: 'https://nominatim.openstreetmap.org',
  country:   'br',
  osrm:      'https://router.project-osrm.org',  // ← substitua pelo self-hosted em prod
};
```

### Conectar Backend

```html
<!-- Antes dos scripts em index.html -->
<script>window.SR_API_URL = 'https://sua-api.com';</script>
```

Endpoints esperados:
- `GET  /occurrences` — lista todas as ocorrências
- `POST /occurrences` — cria nova ocorrência

Sem `SR_API_URL`, o app roda em modo demo com 30 ocorrências de exemplo em São Paulo.

---

## OSRM em Produção

O servidor público `router.project-osrm.org` suporta apenas o perfil **driving** e tem limites de uso. Para produção, use uma instância própria:

```bash
# Download do extrato do Sudeste brasileiro (~1.2 GB)
wget https://download.geofabrik.de/south-america/brazil/sudeste-latest.osm.pbf

# Processar e subir com Docker
docker run -t -v $(pwd):/data osrm/osrm-backend osrm-extract -p /opt/car.lua /data/sudeste-latest.osm.pbf
docker run -t -v $(pwd):/data osrm/osrm-backend osrm-partition /data/sudeste-latest.osrm
docker run -t -v $(pwd):/data osrm/osrm-backend osrm-customize /data/sudeste-latest.osrm
docker run -d -p 5000:5000 -v $(pwd):/data osrm/osrm-backend osrm-routed --algorithm mld /data/sudeste-latest.osrm

# Atualizar config.js
# osrm: 'http://localhost:5000'
```

Para perfis **a pé** e **bicicleta**, substitua `car.lua` por `foot.lua` ou `bicycle.lua` e suba instâncias separadas.

---

## Categorias de Ocorrência (19 tipos)

### 🔴 Segurança Pública (8)
| Tipo | Peso de Risco |
|---|---|
| Assalto | 10 |
| Área Perigosa | 9 |
| Tentativa de Assalto | 8 |
| Furto | 7 |
| Presença Suspeita | 5 |
| Vandalismo | 4 |
| Rua Escura | 3 |
| Falta de Iluminação | 3 |

### 🔵 Infraestrutura & Clima (7)
| Tipo | Peso de Risco |
|---|---|
| Deslizamento | 8 |
| Enchente | 7 |
| Queda de Árvore | 6 |
| Alagamento | 6 |
| Bueiro Aberto | 5 |
| Buraco na Via | 4 |
| Obra / Interdição | 3 |

### 🟡 Mobilidade & Trânsito (4)
| Tipo | Peso de Risco |
|---|---|
| Acidente Frequente | 7 |
| Perigoso p/ Pedestres | 6 |
| Trânsito Perigoso | 5 |
| Rua Estreita | 3 |

---

## Algoritmo de Risco

O score de risco de uma rota é calculado client-side em `js/risk-engine.js` (e server-side em `backend/services/risk-engine/RiskScorer.js`).

### Fórmula por ponto amostrado da rota

```
risco_local = Σ (peso_tipo × mult_noturno × decaimento_distância × decaimento_recência)

Se ≥ 3 ocorrências próximas → risco_local × 1.4  (bônus de densidade)
```

### Parâmetros

| Parâmetro | Valor | Descrição |
|---|---|---|
| Raio de influência | 300 m | Ocorrências além desse raio não afetam o ponto |
| Intervalo de amostragem | 80 m | Rota é avaliada a cada ~80 m |
| Meia-vida de recência | 30 dias | Ocorrência de 30 dias atrás vale 50% do peso |
| Bônus de densidade | ×1.4 | Ativado quando ≥3 ocorrências no raio |
| Mult. noturno `rua_escura` | ×3.0 | Risco triplica à noite |
| Mult. noturno `assalto` | ×1.8 | |

### Classificação Final

| Score | Nível | Cor |
|---|---|---|
| 0 – 25 | Baixo | 🟢 Verde |
| 26 – 50 | Médio | 🟡 Amarelo |
| 51 – 75 | Alto | 🟠 Laranja |
| 76 – 100 | Crítico | 🔴 Vermelho |

---

## Safety Score do Mapa

Calculado em tempo real a cada movimento do mapa com base na densidade de ocorrências na área visível:

```
density  = peso_total / área_km²
risco    = min(density × 1.8, 100)
score    = 100 - risco

≥ 70 → Seguro   40–69 → Atenção   < 40 → Alto Risco
```

---

## Geocoding — Fontes e Prioridade

Ao buscar um endereço como `"Av. Paulista, 1578, São Paulo"`:

```
1. Photon (photon.komoot.io)
   → OSM com Elasticsearch, melhor cobertura de número de imóvel

2. Nominatim estruturado
   → street="1578 Av. Paulista" + city="São Paulo"
   → Mais preciso que busca livre para números

3. ViaCEP (apenas quando cidade+UF detectados)
   → https://viacep.com.br/ws/SP/São Paulo/Av Paulista/json/
   → Retorna CEPs → geocodificados via Nominatim

4. Nominatim livre
   → Fallback geral, bom para pontos de interesse

Para CEPs (ex: "01310-100"):
   → BrasilAPI CEP v2 (tem coordenadas dos Correios)
   → ViaCEP como fallback
```

Resultados com número de imóvel (`house_number`) sobem automaticamente no ranking.

---

## Backend (Opcional)

O backend Node.js expõe os endpoints de rota segura com scoring server-side.

### Instalar e rodar

```bash
cd backend
npm install express
node app.js
```

### Endpoints

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/routes/safe` | Calcula rotas com score de risco |
| `GET` | `/api/routes/heatmap` | Dados de densidade para heatmap |

### Payload `POST /api/routes/safe`

```json
{
  "origin":      { "lat": -23.5505, "lng": -46.6333 },
  "destination": { "lat": -23.5615, "lng": -46.6560 }
}
```

### Resposta

```json
{
  "routes": [
    {
      "index": 0,
      "distanceKm": 3.2,
      "durationMin": 12,
      "riskScore": 24,
      "safetyLevel": "Baixo",
      "safetyColor": "#22c55e",
      "isSafest": true,
      "isFastest": false,
      "isNight": false,
      "hotspots": [
        { "lat": -23.551, "lng": -46.635, "score": 8.3, "count": 4 }
      ]
    }
  ]
}
```

---

## Licença

MIT © Security Route
