(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const grid = $("models-grid");
  if (!grid) return;
  const count = $("models-count"), search = $("model-search"), sort = $("model-sort");
  const dialog = $("model-detail");
  const all = Array.isArray(window.MODEL_ARCHIVE?.models) ? window.MODEL_ARCHIVE.models : [];
  let models = all, filter = "all";
  let query = "";

  const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const permitted = /^(?:models\/model-atlas-\d{2}\.webp|model-preview-atlas\.svg)$/;
  const isPreview = m => m?.preview && permitted.test(m.preview.sheet);
  const coverStyle = (m, large=false) => {
    if (!isPreview(m)) return "";
    const i = Number(m.preview.tile) || 0;
    if (m.preview.sheet === 'model-preview-atlas.svg') {
      const tile = Number(m.preview.tileGlobal ?? i);
      const x = tile % 9, y = Math.floor(tile / 9);
      return 'background-image:url("model-preview-atlas.svg");background-size:900% 800%;background-position:' + (x*100/8) + '% ' + (y*100/7) + '%';
    }
    const x = i % 4, y = Math.floor(i/4);
    return 'background-image:url("' + escape(m.preview.sheet) + '");background-size:400% 400%;background-position:' + (x*100/3) + '% ' + (y*100/3) + '%';
  };
  const svg = '<svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="M32 7 45 27 32 57 19 27Z" stroke="currentColor" stroke-width="1.5"/><path d="m11 32 21-6 21 6-21 7Z" stroke="currentColor" stroke-width="1.5"/></svg>';
  function view(m) {
    const photo = isPreview(m) ? 'model-image-loaded' : 'model-image-pending';
    return '<article class="model-card"><button class="model-card-button" type="button" data-model="' + escape(m.id) + '" aria-label="View ' + escape(m.name) + ' model"><div class="model-cover ' + photo + '" style="' + coverStyle(m) + '"><span class="model-fallback-icon">' + svg + '</span><span class="model-ribbon">' + escape(m.type) + '</span></div><div class="model-info"><div class="model-no">BLAZE SILVER / MODEL</div><h3>' + escape(m.name) + '</h3><p>' + escape(m.description || 'A VTuber form in the Blaze Silver archive.') + '</p><div class="model-taglist"><span>Blaze Silver</span><span>' + escape(m.type) + '</span></div><span class="model-view-label">Explore model ↗</span></div></button></article>';
  }
  function render() {
    const matching = models.filter(m => (filter === 'all' || m.type === filter) && [m.name,m.type,m.description].some(v=>String(v||'').toLowerCase().includes(query)));
    matching.sort((a,b) => sort.value === "za" ? b.name.localeCompare(a.name) : sort.value === "type" ? a.type.localeCompare(b.type) || a.name.localeCompare(b.name) : a.name.localeCompare(b.name));
    grid.innerHTML = matching.length ? matching.map(view).join("") : '<div class="model-empty"><span class="empty-sigil">✦</span><h3>NO MATCHING FORMS.</h3><p>Try another search or choose a different category.</p></div>';
    count.textContent = 'Showing '+matching.length+' of '+models.length+' distinct model looks and variants';
  }
  search?.addEventListener("input", () => {query=search.value.toLowerCase().trim();render();});
  sort?.addEventListener("change", render);
  document.querySelectorAll('[data-model-filter]').forEach(btn => btn.addEventListener('click',() => {
    filter = btn.dataset.modelFilter;
    document.querySelectorAll('[data-model-filter]').forEach(b=>{const active=b===btn;b.classList.toggle("active",active);b.setAttribute("aria-pressed",String(active));});
    render();
  }));
  const open = id => {
    const m = models.find(x=>x.id===id);
    if(!m || !dialog) return;
    $("model-detail-name").textContent=m.name;
    $("model-detail-label").textContent=(m.family||"BLAZE SILVER")+' / '+m.type.toUpperCase();
    $("model-detail-description").textContent=m.description || "A form in the Blaze Silver model archive.";
    $("model-detail-facts").innerHTML='<dt>Collection</dt><dd>'+escape(m.family||"Blaze Silver")+'</dd><dt>Type</dt><dd>'+escape(m.type)+'</dd><dt>Model files</dt><dd>Private · not downloadable</dd>';
    $("model-detail-tags").innerHTML=(m.tags||[m.family||"Blaze Silver",m.type]).map(t=>'<span>'+escape(t)+'</span>').join('');
    const picture=$("model-detail-image");
    picture.style.cssText=coverStyle(m,true);
    picture.classList.toggle("model-image-loaded",isPreview(m));
    picture.classList.toggle("model-image-pending",!isPreview(m));
    picture.setAttribute("aria-label",m.name+" VRM portrait preview");
    $("model-detail-gallery").replaceChildren();
    dialog.showModal();
  };
  grid.addEventListener('click',e=>{const btn=e.target.closest('[data-model]');if(btn)open(btn.dataset.model);});
  $("model-detail-close")?.addEventListener('click',()=>dialog.close());
  dialog?.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
  render();
  fetch('models.json',{cache:'no-store'})
   .then(r=>{if(!r.ok)throw Error('Model archive unavailable');return r.json();})
   .then(data=>{if(!Array.isArray(data.models)||!data.models.length)return;models=data.models;render();})
   .catch(()=>{});
})();