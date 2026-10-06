/* ════════════════════════════════════════════════════
   MAP — Leaflet init, GPS, pin mode & smooth touch
   ════════════════════════════════════════════════════ */
var MapMod = (() => {
  let _map, _selecting = false, _onSelect = null, _tempMarker = null;
  let _currentLayer = null;
  let _lastHandledTime = 0;

  function init() {
    _map = L.map('map', {
      center: CFG.center,
      zoom: CFG.zoom,
      maxZoom: CFG.maxZoom,
      zoomControl: false,
      attributionControl: true,
      tap: false,               // Desativa emulação de tap antiga do Leaflet
      dragging: true,
      touchZoom: true,
      bounceAtZoomLimits: false,
      inertia: true,
      inertiaDeceleration: 3000, // Desaceleração suave e fluida
      inertiaMaxSpeed: 2500,     // Permite arremesso com velocidade
      easeLinearity: 0.2,
      zoomAnimation: true,
      fadeAnimation: true,
      markerZoomAnimation: true,
      wheelPxPerZoomLevel: 60,
    });
    
    L.control.zoom({ position: 'topleft' }).addTo(_map);
    
    // Eventos de clique para mouse/desktop
    _map.on('click', _onClick);

    // Suaviza a visão do mapa durante o arrasto no mobile (Google Maps style)
    _map.on('movestart', () => document.body.classList.add('map-panning'));
    _map.on('moveend', () => document.body.classList.remove('map-panning'));

    // Eventos de toque de alta precisão para mobile
    _setupTouchListeners();
    
    const savedStyle = localStorage.getItem('sr_map_style') || 'carto';
    setTileLayer(savedStyle);

    // Botão de cancelar no aviso do mapa
    document.getElementById('mapHintCancel')?.addEventListener('click', (e) => {
      e.stopPropagation();
      stopSelect();
    });
    
    return _map;
  }

  /* ── Detecção precisa de toque rápido (tap) em mobile ── */
  function _setupTouchListeners() {
    const mapEl = document.getElementById('map');
    if (!mapEl) return;

    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    mapEl.addEventListener('touchstart', (e) => {
      if (!_selecting || e.touches.length !== 1) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
    }, { passive: true });

    mapEl.addEventListener('touchend', (e) => {
      if (!_selecting || !e.changedTouches || e.changedTouches.length === 0) return;
      const touch = e.changedTouches[0];
      const distX = Math.abs(touch.clientX - touchStartX);
      const distY = Math.abs(touch.clientY - touchStartY);
      const elapsed = Date.now() - touchStartTime;

      // Se moveu menos de 15px e foi rápido (< 450ms), é um toque deliberado na rua
      if (distX < 15 && distY < 15 && elapsed < 450) {
        const rect = mapEl.getBoundingClientRect();
        const containerPoint = L.point(touch.clientX - rect.left, touch.clientY - rect.top);
        const latlng = _map.containerPointToLatLng(containerPoint);
        _triggerSelection(latlng);
      }
    }, { passive: true });
  }

  function setTileLayer(type) {
    if (_currentLayer) _map.removeLayer(_currentLayer);
    
    var cartoKey = window.ENV?.CARTO_API_KEY;
    var mapboxToken = window.ENV?.MAPBOX_TOKEN;
    let url, attr;
    
    if (type === 'carto') {
      url = cartoKey 
        ? `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?api_key=${cartoKey}`
        : `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`;
      attr = '© <a href="https://carto.com/">CARTO</a> | © <a href="https://openstreetmap.org/copyright">OSM</a>';
      document.body.classList.remove('map-osm');
    } else if (type === 'mapbox') {
      url = `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/256/{z}/{x}/{y}@2x?access_token=${mapboxToken}`;
      attr = '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OSM</a>';
      document.body.classList.remove('map-osm');
    } else {
      url = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
      attr = '© <a href="https://openstreetmap.org/copyright">OSM</a>';
      document.body.classList.add('map-osm');
    }
    
    _currentLayer = L.tileLayer(url, {
      attribution: attr, subdomains: 'abcd', maxZoom: CFG.maxZoom,
      updateWhenIdle: false, // Atualiza tiles durante drag para fluidez
      updateWhenZooming: true,
      keepBuffer: 4,
    }).addTo(_map);
    
    localStorage.setItem('sr_map_style', type);
  }

  function getMap() { return _map; }

  function flyTo(lat, lng, zoom = 15) {
    _map.flyTo([lat, lng], zoom, { animate: true, duration: 0.8 });
  }

  function locate() {
    const btn = document.getElementById('gpsBtn');
    btn?.classList.add('loading');
    if (navigator.vibrate) navigator.vibrate(50);
    if (!navigator.geolocation) {
      Toast.error('Geolocalização não suportada');
      btn?.classList.remove('loading');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude: lat, longitude: lng, accuracy } }) => {
        btn?.classList.remove('loading');
        if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
        _map.flyTo([lat, lng], 16, { animate: true, duration: 1 });
        L.circle([lat, lng], { radius: accuracy, color:'#f97316', fillOpacity:.06, weight:1 }).addTo(_map);
        L.circleMarker([lat, lng], { radius:8, color:'#fff', weight:3, fillColor:'#f97316', fillOpacity:1 }).addTo(_map);
        Toast.success('Localização obtida', `Precisão: ~${Math.round(accuracy)}m`);
      },
      () => { btn?.classList.remove('loading'); Toast.error('Não foi possível obter localização'); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function startSelect(cb) {
    _selecting = true; _onSelect = cb;
    document.body.classList.add('pin-mode');
    document.getElementById('mapHint')?.classList.add('visible');
  }

  function stopSelect() {
    _selecting = false; _onSelect = null;
    document.body.classList.remove('pin-mode');
    document.getElementById('mapHint')?.classList.remove('visible');
    if (_tempMarker) { _map.removeLayer(_tempMarker); _tempMarker = null; }
  }

  /* ── Disparo imediato da seleção com reverse geocode assíncrono ── */
  async function _triggerSelection(latlng) {
    const now = Date.now();
    if (now - _lastHandledTime < 450) return; // Evita duplo evento
    _lastHandledTime = now;

    if (!_selecting || !_onSelect) return;
    const { lat, lng } = latlng;

    if (_tempMarker) _map.removeLayer(_tempMarker);
    if (navigator.vibrate) navigator.vibrate(50);

    // Marca ponto visual imediatamente
    _tempMarker = L.circleMarker([lat, lng], {
      radius: 10, color: '#fff', weight: 2.5, fillColor: '#ff6b2b', fillOpacity: .9,
    }).addTo(_map);

    const cb = _onSelect;
    stopSelect();

    // Notifica callback instantaneamente sem esperar rede (abre o modal na hora)
    cb({ lat, lng, address: null, isPending: true });

    // Em segundo plano, resolve o nome da rua sem bloquear a interface
    try {
      const address = await Promise.race([
        API.reverseGeocode(lat, lng),
        new Promise(resolve => setTimeout(() => resolve(null), 2500))
      ]);
      if (address && typeof window.onStreetAddressResolved === 'function') {
        window.onStreetAddressResolved(address);
      }
    } catch (err) {
      console.warn('[MapMod] Reverse geocoding failed:', err);
    }
  }

  function _onClick(e) {
    if (document.activeElement) document.activeElement.blur();
    if (!_selecting || !_onSelect) return;
    _triggerSelection(e.latlng);
  }

  return { init, getMap, flyTo, locate, startSelect, stopSelect, setTileLayer };
})();
