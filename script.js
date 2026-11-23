
(() => {
  'use strict';
  const fallback = typeof AMV_VIDEOS !== 'undefined' ? AMV_VIDEOS : [];
  const container = document.getElementById('carousel-sections');
  const idPattern = /^[a-zA-Z0-9_-]{11}$/;
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  let videos = fallback.filter(v => idPattern.test(v.id));
  let activeFilter = 'all';

  function normalize(items) {
    const seen = new Set();
    return (Array.isArray(items) ? items : []).filter(v => {
      if (!v || !idPattern.test(v.id) || seen.has(v.id)) return false;
      seen.add(v.id); return true;
    }).map(v => ({
      ...v, title: String(v.title || 'Untitled AMV'), year: String(v.year || ''),
      game: String(v.game || 'Other Worlds'), tag: String(v.tag || 'AMV / GMV'),
      category: ['genshin','hsr','other'].includes(v.category) ? v.category : 'other',
      publishedAt: String(v.publishedAt || '')
    }));
  }
  function card(v, index, total) {
    const id = escapeHTML(v.id);
    return '<article class="amv-card"><button class="card-watch" type="button" data-video="'+id+'" aria-label="Play '+escapeHTML(v.title)+'"><span class="card-image"><img src="https://i.ytimg.com/vi/'+id+'/hqdefault.jpg" alt="'+escapeHTML(v.title)+' thumbnail" loading="lazy"><span class="card-index">'+String(index+1).padStart(2,'0')+' / '+String(total).padStart(2,'0')+'</span><span class="card-play">▶</span></span><span class="card-meta"><span class="game">'+escapeHTML(v.game)+'</span><span class="year">'+escapeHTML(v.year)+'</span></span><span class="card-title">'+escapeHTML(v.title)+'</span><span class="card-tag">'+escapeHTML(v.tag)+'</span></button></article>';
  }
  function applyFilter() {
    if (!container) return;
    container.querySelectorAll('.carousel-block').forEach(section => {
      section.hidden = activeFilter !== 'all' && section.dataset.category !== activeFilter;
    });
    document.querySelectorAll('[data-filter]').forEach(btn => {
      const active = btn.dataset.filter === activeFilter;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
  }
  function render(items) {
    if (!container) return;
    videos = normalize(items);
    const newest = [...videos].sort((a,b) => b.publishedAt.localeCompare(a.publishedAt));
    const sections = [
      ['latest','all','JUST DROPPED','Latest AMVs','Fresh from YouTube, automatically updated.',newest.filter(v=>v.publishedAt).slice(0,24)],
      ['featured','all','IN THE SPOTLIGHT','Featured AMVs','A handpicked introduction to the studio.',videos.filter(v=>v.featured)],
      ['genshin','genshin','TEYVAT','Genshin Impact','Legendary adventures from Teyvat.',newest.filter(v=>v.category==='genshin')],
      ['hsr','hsr','ASTRAL EXPRESS','Honkai: Star Rail','Edits across the stars.',newest.filter(v=>v.category==='hsr')],
      ['other','other','THE MULTIVERSE','Other Worlds','Wuthering Waves, Zenless Zone Zero, and beyond.',newest.filter(v=>v.category==='other')]
    ];
    container.replaceChildren();
    sections.filter(s=>s[5].length).forEach(([key,category,overline,title,sub,entries],i)=>{
      const section = document.createElement('section');
      section.className = 'carousel-block';
      section.dataset.category = category;
      section.setAttribute('aria-label',title+' carousel');
      section.innerHTML = '<div class="carousel-heading"><div><h3><span>'+String(i+1).padStart(2,'0')+' / '+escapeHTML(overline)+'</span>'+escapeHTML(title)+'</h3><div class="carousel-subtitle">'+escapeHTML(sub)+'</div></div><div class="carousel-arrows"><button class="arrow-button arrow-prev" type="button" aria-label="Scroll left">←</button><button class="arrow-button arrow-next" type="button" aria-label="Scroll right">→</button></div></div><div class="carousel-track" tabindex="0" role="group" aria-label="'+escapeHTML(title)+' videos">'+entries.map(card).join('')+'</div>';
      container.append(section);
      const track = section.querySelector('.carousel-track'), prev = section.querySelector('.arrow-prev'), next=section.querySelector('.arrow-next');
      const arrows=()=>{let end=track.scrollWidth-track.clientWidth;prev.disabled=track.scrollLeft<=2;next.disabled=end<=2||track.scrollLeft>=end-2;};
      const move=dir=>{const width=track.querySelector('.amv-card')?.getBoundingClientRect().width || 270; track.scrollBy({left:dir*(width+19),behavior:'smooth'});};
      prev.addEventListener('click',()=>move(-1)); next.addEventListener('click',()=>move(1));
      track.addEventListener('scroll',arrows,{passive:true});
      if('ResizeObserver' in window) new ResizeObserver(arrows).observe(track);
      requestAnimationFrame(arrows);
    });
    applyFilter();
  }
  if(container){
    render(fallback);
    document.querySelectorAll('[data-filter]').forEach(btn=>btn.addEventListener('click',()=>{activeFilter=btn.dataset.filter;applyFilter();}));
    fetch('videos.json',{cache:'no-store'})
      .then(r=>{if(!r.ok)throw Error('Catalog missing');return r.json();})
      .then(data=>{if(!Array.isArray(data.videos)||!data.videos.length)return;render(data.videos);const status=document.getElementById('catalog-status');if(status&&data.updatedAt)status.textContent='YouTube AMV library · last synced '+new Date(data.updatedAt).toLocaleDateString();})
      .catch(()=>{});
  }
  const dialog=document.getElementById('video-modal'),frame=document.getElementById('video-frame'),title=document.getElementById('modal-title'),link=document.getElementById('modal-youtube');
  if(dialog&&frame&&title&&link){
    document.addEventListener('click',event=>{
      const btn=event.target.closest('[data-video]');if(!btn||!idPattern.test(btn.dataset.video))return;
      const id=btn.dataset.video,video=videos.find(v=>v.id===id)||fallback.find(v=>v.id===id);
      title.textContent=video?.title||'AMV';link.href='https://www.youtube.com/watch?v='+encodeURIComponent(id);
      frame.innerHTML='<iframe src="https://www.youtube-nocookie.com/embed/'+encodeURIComponent(id)+'?autoplay=1&rel=0" title="'+escapeHTML(title.textContent)+' video" allow="accelerometer;autoplay;encrypted-media;gyroscope;picture-in-picture;web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>';
      dialog.showModal();
    });
    const close=()=>{if(dialog.open)dialog.close();};
    dialog.querySelector('.modal-close').addEventListener('click',close);
    dialog.addEventListener('click',e=>{if(e.target===dialog)close();});
    dialog.addEventListener('close',()=>frame.replaceChildren());
  }
  const toggle=document.querySelector('.mobile-toggle'),menu=document.getElementById('mobile-nav');
  if(toggle&&menu){
    const close=()=>{menu.hidden=true;toggle.setAttribute('aria-expanded','false');};
    toggle.addEventListener('click',()=>{menu.hidden=!menu.hidden;toggle.setAttribute('aria-expanded',String(!menu.hidden));});
    menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',close));
    addEventListener('resize',()=>{if(innerWidth>760)close();});
  }
  document.querySelectorAll('.current-year').forEach(el=>el.textContent=String(new Date().getFullYear()));
})();