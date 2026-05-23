/* ════════════════════════════════════════════════════
   SHEET (bottom sheet / modal)
   ════════════════════════════════════════════════════ */
const Sheet = (() => {
  let _type=null, _lat=null, _lng=null, _addr=null;
  let _step=1, _resolve=null;

  const backdrop = document.getElementById('sheetBackdrop');
  const sheet    = document.getElementById('sheet');
  const title    = document.getElementById('sheetTitle');
  const footer   = document.getElementById('sheetFooter');
  const steps    = { type:document.getElementById('stepType'), pin:document.getElementById('stepPin'), form:document.getElementById('stepForm') };

  function _showStep(s){
    Object.values(steps).forEach(el=>el.classList.remove('active'));
    if(steps[s]) steps[s].classList.add('active');
    footer.style.display = s==='form' ? 'block' : 'none';
  }

  function open(type=null) {
    _type=type; _lat=null; _lng=null; _addr=null; _step=1;
    document.getElementById('formDesc').value='';
    const now=new Date(); now.setMinutes(now.getMinutes()-now.getTimezoneOffset());
    document.getElementById('formDate').value=now.toISOString().slice(0,16);
    backdrop.classList.add('open');
    sheet.classList.add('open');
    if (type) { _showStep('pin'); title.textContent='Marque o Local'; _setPinText(); }
    else      { _showStep('type'); title.textContent='Nova Ocorrência'; }
  }

  function close() {
    backdrop.classList.remove('open');
    sheet.classList.remove('open');
    MapMod.stopSelect();
    _resolve=null;
  }

  function goToForm(lat,lng,addr) {
    _lat=lat; _lng=lng; _addr=addr;
    _showStep('form');
    title.textContent='Detalhes';
    // type badge
    const cfg=TYPES[_type]||TYPES.assalto;
    document.getElementById('formTypeBadge').innerHTML=
      `<div class="selected-type-badge selected-type-badge--${_type}">${cfg.icon} ${cfg.label}</div>`;
    // coords
    document.getElementById('coordsText').textContent = addr
      ? addr.split(',').slice(0,2).join(', ')
      : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    sheet.classList.add('open');
    backdrop.classList.add('open');
  }

  function _setPinText() {
    const cfg=TYPES[_type]||TYPES.assalto;
    document.getElementById('pinText').textContent=
      `Toque em "Tocar no Mapa" para fechar este painel e indicar onde ocorreu o ${cfg.label.toLowerCase()}.`;
  }

  function setType(t) {
    _type=t;
    _showStep('pin');
    title.textContent='Marque o Local';
    _setPinText();
  }

  async function confirm() {
    const desc = document.getElementById('formDesc').value.trim();
    const date = document.getElementById('formDate').value;
    const btn  = document.getElementById('sheetConfirm');
    btn.disabled=true; btn.innerHTML=''; btn.classList.add('btn-loading');
    try {
      const occ = await API.createOccurrence({
        type:_type, lat:_lat, lng:_lng,
        address:_addr||undefined,
        description:desc||undefined,
        datetime:date?new Date(date).toISOString():undefined,
      });
      Markers.add(occ,true);
      Stats.update();
      close();
      Toast.success('Ocorrência registrada!','Obrigado por contribuir com a comunidade.','success');
    } catch(e) {
      Toast.error('Erro ao registrar','Verifique sua conexão e tente novamente.','error');
    } finally {
      btn.disabled=false; btn.textContent='Registrar'; btn.classList.remove('btn-loading');
    }
  }

  // Events
  backdrop.addEventListener('click',()=>close());
  document.getElementById('sheetClose').addEventListener('click',()=>close());
  document.getElementById('sheetCancel').addEventListener('click',()=>close());
  document.getElementById('sheetConfirm').addEventListener('click',()=>confirm());
  document.getElementById('pinReadyBtn').addEventListener('click',()=>{
    sheet.classList.remove('open');
    backdrop.classList.remove('open');
    MapMod.startSelect(({lat,lng,address})=>goToForm(lat,lng,address));
  });
  steps.type.querySelectorAll('.type-card').forEach(c=>{
    c.addEventListener('click',()=>setType(c.dataset.type));
  });

  return {open,close,goToForm};
})();
