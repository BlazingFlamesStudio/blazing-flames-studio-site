/* Blazing Flames Studio — AMV Finder. Uses synced videos.json; never invents character metadata. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const ID = /^[A-Za-z0-9_-]{11}$/;
  // Accommodate "AMV/GMV", "RailAMV/GMV", and "[[AMVGMV]]", not creator names like IsshinAMV.
  const AMV_TITLE = /(?:\bAMV\b|AMV\/GMV|AMVGMV)/i;
  const SIZE = 24;
  const WORLDS = ['all','genshin','hsr','wuwa','other'];
  const SORTS = ['newest','oldest','az','za','random'];
  const worldNames = {genshin:'Genshin Impact',hsr:'Honkai: Star Rail',wuwa:'Wuthering Waves',other:'Other Worlds'};
  const escape = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = v => String(v ?? '').normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  const query = $('finder-query'),world = $('finder-world'),year=$('finder-year'),sort=$('finder-sort');
  const results=$('finder-results'),status=$('finder-status'),source=$('finder-source');
  const more=$('finder-more'),clear=$('finder-clear'),empty=$('finder-empty');
  const modal=$('finder-modal'),frame=$('finder-frame'),modalTitle=$('finder-modal-title'),modalLink=$('finder-modal-youtube');
  let catalog=[],shown=SIZE,randomOrder=new Map(),ready=false;
  const initial=new URLSearchParams(location.search);

  function ingest(data) {
    const seen=new Set();
    return (Array.isArray(data)?data:[])
      .filter(v => v && ID.test(v.id) && AMV_TITLE.test(v.title||'') && !seen.has(v.id) && seen.add(v.id))
      .map(v=>({
        id:v.id,title:String(v.title||''),game:String(v.game||'Other Worlds'),
        category:WORLDS.includes(v.category)?v.category:'other',
        year:String(v.year||''),publishedAt:String(v.publishedAt||'')
      }));
  }
  function readURL() {
    query.value=(initial.get('q')||'').slice(0,140);
    world.value=WORLDS.includes(initial.get('world'))?initial.get('world'):'all';
    sort.value=SORTS.includes(initial.get('sort'))?initial.get('sort'):'newest';
  }
  function saveURL() {
    const url=new URL(location.href);
    ['q','world','year','sort'].forEach(key=>url.searchParams.delete(key));
    if(query.value.trim())url.searchParams.set('q',query.value.trim());
    if(world.value!=='all')url.searchParams.set('world',world.value);
    if(year.value!=='all')url.searchParams.set('year',year.value);
    if(sort.value!=='newest')url.searchParams.set('sort',sort.value);
    try {history.replaceState(null,'',url.pathname+url.search+url.hash);} catch(e) {}
  }
  function yearOptions() {
    const values=[...new Set(catalog.map(v=>v.year).filter(v=>/^\d{4}$/.test(v)))].sort((a,b)=>b.localeCompare(a));
    year.replaceChildren(new Option('All years','all'),...values.map(v=>new Option(v,v)));
    year.value=values.includes(initial.get('year'))?initial.get('year'):'all';
  }
  function matches() {
    const tokens=norm(query.value).split(/\s+/).filter(Boolean);
    const list=catalog.filter(v=>(world.value==='all'||v.category===world.value) &&
      (year.value==='all'||v.year===year.value) &&
      tokens.every(term=>norm([v.title,v.game,worldNames[v.category]||'',v.year].join(' ')).includes(term)));
    const newest=(a,b)=>(b.publishedAt||'').localeCompare(a.publishedAt||'') || a.title.localeCompare(b.title);
    switch(sort.value) {
      case 'oldest':list.sort((a,b)=>-newest(a,b));break;
      case 'az':list.sort((a,b)=>a.title.localeCompare(b.title));break;
      case 'za':list.sort((a,b)=>b.title.localeCompare(a.title));break;
      case 'random':list.sort((a,b)=>(randomOrder.get(a.id)||0)-(randomOrder.get(b.id)||0));break;
      default:list.sort(newest);
    }
    return list;
  }
  function card(v) {
    const when=v.publishedAt && !isNaN(new Date(v.publishedAt).getTime()) ?
      new Date(v.publishedAt).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}):v.year;
    const title=escape(v.title);
    return '<article class="finder-card">'+
      '<button type="button" class="finder-thumb" data-watch="'+v.id+'" aria-label="Play '+title+'">'+
      '<img src="https://i.ytimg.com/vi/'+v.id+'/hqdefault.jpg" alt="" loading="lazy" decoding="async">'+
      '<span aria-hidden="true" class="finder-play">▶</span></button>'+
      '<div class="finder-card-info"><div class="finder-card-meta"><span>'+escape(v.game)+'</span><time>'+escape(when)+'</time></div>'+
      '<h3>'+title+'</h3><div class="finder-card-actions"><button type="button" data-watch="'+v.id+'">Play AMV ▶</button>'+
      '<a href="https://www.youtube.com/watch?v='+v.id+'" target="_blank" rel="noopener noreferrer" aria-label="Watch '+title+' on YouTube">YouTube ↗</a>'+
      '</div></div></article>';
  }
  function render() {
    if(!ready)return;
    const list=matches(),amount=Math.min(shown,list.length);
    results.innerHTML=list.slice(0,amount).map(card).join('');
    status.textContent=list.length ?
      'Showing '+amount.toLocaleString()+' of '+list.length.toLocaleString()+' matching AMVs · '+catalog.length.toLocaleString()+' indexed' :
      'No matching AMVs · '+catalog.length.toLocaleString()+' indexed';
    more.hidden=amount>=list.length;
    empty.hidden=!!list.length;
    clear.hidden=!(query.value.trim()||world.value!=='all'||year.value!=='all'||sort.value!=='newest');
  }
  function change() {shown=SIZE;saveURL();render();}
  function openVideo(id) {
    const v=catalog.find(v=>v.id===id);
    if(!v||!ID.test(id))return;
    if(typeof modal.showModal!=='function') {
      window.open('https://www.youtube.com/watch?v='+id,'_blank','noopener,noreferrer');
      return;
    }
    modalTitle.textContent=v.title;
    modalLink.href='https://www.youtube.com/watch?v='+id;
    const iframe=document.createElement('iframe');
    iframe.src='https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1&rel=0';
    iframe.title=v.title+' — YouTube video';
    iframe.allow='accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.referrerPolicy='strict-origin-when-cross-origin';
    iframe.allowFullscreen=true;
    frame.replaceChildren(iframe);
    modal.showModal();
  }
  function closeVideo() {if(modal.open)modal.close();frame.replaceChildren();}
  function bind() {
    let timer;
    $('finder-form').addEventListener('submit',event=>{event.preventDefault();clearTimeout(timer);change();});
    query.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(change,180);});
    [world,year,sort].forEach(control=>control.addEventListener('change',change));
    more.addEventListener('click',()=>{shown+=SIZE;render();});
    clear.addEventListener('click',()=>{query.value='';world.value='all';year.value='all';sort.value='newest';change();query.focus();});
    results.addEventListener('click',event=>{const el=event.target.closest('[data-watch]');if(el)openVideo(el.dataset.watch);});
    $('finder-modal-close').addEventListener('click',closeVideo);
    modal.addEventListener('click',event=>{if(event.target===modal)closeVideo();});
    modal.addEventListener('close',()=>frame.replaceChildren());
    const toggle=document.querySelector('.mobile-toggle'),menu=$('mobile-nav');
    if(toggle&&menu){
      const close=()=>{menu.hidden=true;toggle.setAttribute('aria-expanded','false');};
      toggle.addEventListener('click',()=>{menu.hidden=!menu.hidden;toggle.setAttribute('aria-expanded',String(!menu.hidden));});
      menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',close));
      window.addEventListener('resize',()=>{if(innerWidth>1240)close();});
    }
    document.querySelectorAll('.current-year').forEach(el=>{el.textContent=String(new Date().getFullYear());});
  }
  async function init() {
    readURL();bind();
    status.textContent='Loading the AMV library…';
    try {
      const response=await fetch('./videos.json',{cache:'no-store'});
      if(!response.ok)throw new Error('Catalog unavailable');
      const data=await response.json();
      catalog=ingest(data.videos);
      if(!catalog.length)throw new Error('No synced AMV titles');
      source.textContent=(data.source==='youtube-playlists-and-channel-amvs'?'Channel uploads + playlists':'Synced playlist catalog')+' · '+catalog.length.toLocaleString()+' AMVs'+
        (data.updatedAt?' · updated '+new Date(data.updatedAt).toLocaleDateString():'');
    }catch(err) {
      catalog=ingest(typeof AMV_VIDEOS!=='undefined'?AMV_VIDEOS:[]);
      source.textContent=catalog.length?'Offline starter list · reconnect for full catalog':'AMV library unavailable — reconnect and refresh.';
      console.warn('AMV Finder:',err);
    }
    randomOrder=new Map(catalog.map(v=>[v.id,Math.random()]));
    yearOptions();ready=true;render();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
