/* ════════════════════════════════════════════════════
   MAP — Leaflet init, GPS, pin mode
   ════════════════════════════════════════════════════ */
var MapMod = (() => {
  let _map, _selecting = false, _onSelect = null, _tempMarker = null;
  let _currentLayer = null;

  function init() {
    _map = L.map('map', {
      center: CFG.center, zoom: CFG.zoom, maxZoom: CFG.maxZoom,
      zoomControl: false, attributionControl: true, tap: false, dragging: true, touchZoom: true,
    });
    
    L.control.zoom({ position: 'topleft' }).addTo(_map);
    _map.on('click', _onClick);
    
    const savedStyle = localStorage.getItem('sr_map_style') || 'carto';
    setTileLayer(savedStyle);
    
    return _map;
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

  async function _onClick(e) {
    // Dismiss keyboard on any map tap
    if (document.activeElement) document.activeElement.blur();
    
    if (!_selecting || !_onSelect) return;
    const { lat, lng } = e.latlng;
    if (_tempMarker) _map.removeLayer(_tempMarker);
    if (navigator.vibrate) navigator.vibrate(60);
    _tempMarker = L.circleMarker([lat, lng], {
      radius: 10, color: '#fff', weight: 2.5, fillColor: '#ff6b2b', fillOpacity: .9,
    }).addTo(_map);
    const address = await API.reverseGeocode(lat, lng);
    const cb = _onSelect;
    stopSelect();
    cb({ lat, lng, address });
  }

  return { init, getMap, flyTo, locate, startSelect, stopSelect, setTileLayer };
})();
