# Security Route — Web App

Plataforma colaborativa de mapeamento de ocorrências urbanas.
Utiliza **Leaflet + OpenStreetMap** (100% gratuito, sem API key).

## Estrutura

```
security-route/
├── index.html          # Ponto de entrada
├── css/
│   └── style.css       # Design system completo (Tactical Dark)
├── js/
│   ├── config.js       # Constantes globais, dados demo, tipos
│   ├── api.js          # Nominatim (geocoding) + backend CRUD
│   ├── toast.js        # Sistema de notificações
│   ├── markers.js      # Marcadores, cluster, popups, filtros
│   ├── map.js          # Leaflet: tiles, GPS, pin mode
│   ├── sheet.js        # Bottom sheet 3 etapas (criar ocorrência)
│   ├── stats.js        # Contadores animados
│   ├── search.js       # Autocomplete Nominatim
│   ├── sidebar.js      # Drawer + filtros sidebar
│   └── app.js          # Inicialização e wiring geral
└── README.md
```

## Rodar localmente

```bash
# Python (mais simples)
python3 -m http.server 8080

# Node
npx serve .

# VS Code
# instale a extensão "Live Server" e clique em "Go Live"
```

Abra: http://localhost:8080

## Conectar ao backend

Antes de carregar os scripts, defina:

```html
<script>window.SR_API_URL = 'https://sua-api.com';</script>
```

### Endpoints esperados

| Método | Rota               | Descrição              |
|--------|--------------------|------------------------|
| GET    | /occurrences       | Listar todas           |
| POST   | /occurrences       | Criar nova             |

Payload POST:
```json
{
  "type": "assalto",
  "lat": -23.5505,
  "lng": -46.6333,
  "description": "Texto opcional",
  "address": "Endereço (geocoding reverso)",
  "datetime": "2024-03-10T08:00:00.000Z",
  "createdAt": "2024-03-10T08:00:00.000Z"
}
```

Sem backend configurado → modo demo com 16 ocorrências pré-carregadas.

## Tecnologias

- [Leaflet 1.9](https://leafletjs.com) — mapa interativo
- [Leaflet.markercluster](https://github.com/Leaflet/Leaflet.markercluster) — agrupamento
- [OpenStreetMap](https://openstreetmap.org) — dados do mapa
- [CartoDB Dark Matter](https://carto.com/basemaps/) — tiles escuros
- [Nominatim](https://nominatim.openstreetmap.org) — geocoding/busca
- Vanilla JS (sem framework) — zero dependências de build

## Tipos de ocorrência

| Tipo          | Cor     | Descrição                  |
|---------------|---------|----------------------------|
| `assalto`     | Vermelho | Roubo, furto, violência   |
| `enchente`    | Azul     | Alagamento, via bloqueada |
| `rua_estreita`| Âmbar    | Via com passagem difícil  |

## Adicionando novos tipos

Em `js/config.js`, adicione ao objeto `TYPES`:

```js
novo_tipo: {
  label: 'Nome',
  color: '#hex',
  colorVar: 'var(--css-var)',
  dimVar:   'var(--css-var-dim)',
  icon: '🔥'
}
```

E no CSS adicione as classes `.popup-badge--novo_tipo` e `.selected-type-badge--novo_tipo`.
