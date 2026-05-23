/* ════════════════════════════════════════════════════
   MAP MODULE
   ════════════════════════════════════════════════════ */
const MapMod = (() => {
  let _map, _selecting=false, _onSelect=null, _tempMarker=null;

  function init() {
    _map = L.map('map',{center:CFG.center,zoom:CFG.zoom,maxZoom:CFG.maxZoom,
      zoomControl:false,attributionControl:true});
    L.tileLayer(CFG.tile,{attribution:CFG.tileAttr,subdomains:'abcd',maxZoom:CFG.maxZoom}).addTo(_map);
    L.control.zoom({position:'bottomright'}).addTo(_map);
    _map.on('click',_onClick);
    return _map;
  }

  function getMap(){ return _map; }

  function flyTo(lat,lng,zoom=15){
    _map.flyTo([lat,lng],zoom,{animate:true,duration:.8});
  }

  function locate() {
    const btn = document.getElementById('gpsBtn');
    btn.classList.add('loading');
    if (!navigator.geolocation){ Toast.error('Geolocalização não suportada'); btn.classList.remove('loading'); return; }
    navigator.geolocation.getCurrentPosition(
      pos=>{
        btn.classList.remove('loading');
        const {latitude:lat,longitude:lng,accuracy} = pos.coords;
        _map.flyTo([lat,lng],16,{animate:true,duration:1});
        L.circle([lat,lng],{radius:accuracy,color:'#f97316',fillOpacity:.06,weight:1}).addTo(_map);
        L.circleMarker([lat,lng],{radius:8,color:'#fff',weight:3,fillColor:'#f97316',fillOpacity:1}).addTo(_map);
        Toast.success('Localização obtida');
      },
      err=>{
        btn.classList.remove('loading');
        Toast.error('Não foi possível obter localização');
      },
      {enableHighAccuracy:true,timeout:10000}
    );
  }

  function startSelect(cb){
    _selecting=true; _onSelect=cb;
    document.body.classList.add('pin-mode');
    document.getElementById('mapHint').classList.add('visible');
  }

  function stopSelect(){
    _selecting=false; _onSelect=null;
    document.body.classList.remove('pin-mode');
    document.getElementById('mapHint').classList.remove('visible');
    if (_tempMarker){ _map.removeLayer(_tempMarker); _tempMarker=null; }
  }

  async function _onClick(e){
    if (!_selecting||!_onSelect) return;
    const {lat,lng} = e.latlng;
    if (_tempMarker) _map.removeLayer(_tempMarker);
    _tempMarker = L.circleMarker([lat,lng],{
      radius:10,color:'#fff',weight:2.5,fillColor:'#f97316',fillOpacity:.9
    }).addTo(_map);
    const address = await API.reverseGeocode(lat,lng);
    const cb = _onSelect;
    stopSelect();
    cb({lat,lng,address});
  }

  return {init,getMap,flyTo,locate,startSelect,stopSelect};
})();
