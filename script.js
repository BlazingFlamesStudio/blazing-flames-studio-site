
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
  const playlistIdPattern = /^[a-zA-Z0-9_-]{10,50}$/;

  // Actual playlist identities drive the visual worlds, without a separate thumbnail gallery.
  function playlistIdentity(playlist) {
    const name = String(playlist?.title || '').toLowerCase();
    if (/amv\s*wars|abyss\s*wars/.test(name)) return {theme:'wars',symbol:'⚔',overline:'THE ARENA',phrase:'THE BATTLE IS THE EDIT'};
    if (/partnership|collab/.test(name)) return {theme:'partners',symbol:'◇',overline:'CREATIVE ALLIANCES',phrase:'BETTER WORLDS TOGETHER'};
    if (/genshin|teyvat/.test(name)) return {theme:'genshin',symbol:'✧',overline:'ELEMENTAL LEGENDS',phrase:'STORIES BORN IN TEYVAT'};
    if (/honkai|star\s*rail|hsr/.test(name)) return {theme:'hsr',symbol:'✦',overline:'BEYOND THE STARS',phrase:'A JOURNEY WITHOUT END'};
    if (/fire\s*emblem/.test(name)) return {theme:'emblem',symbol:'♜',overline:'LEGENDS OF VALOR',phrase:'FATE IS WRITTEN IN FIRE'};
    if (/vox\s*machina/.test(name)) return {theme:'vox',symbol:'✺',overline:'OTHER REALMS',phrase:'ANOTHER STORY UNFOLDS'};
    return {theme:'multiverse',symbol:'✶',overline:'THE MULTIVERSE',phrase:'EVERY WORLD HAS A SONG'};
  }
  let spotlight = [];
  let spotlightIndex = 0;
  function setSpotlight(index) {
    if (!spotlight.length) return;
    spotlightIndex = (index + spotlight.length) % spotlight.length;
    const selected = spotlight[spotlightIndex];
    const title = document.getElementById('spotlight-title');
    const series = document.getElementById('spotlight-series');
    const button = document.getElementById('spotlight-play');
    const number = document.getElementById('spotlight-number');
    const total = document.getElementById('spotlight-total');
    if (title) title.textContent = selected.title;
    if (series) series.textContent = selected.game + ' · AMV / GMV';
    if (button) { button.dataset.video = selected.id; button.setAttribute('aria-label', 'Watch '+selected.title); }
    if (number) number.textContent = String(spotlightIndex+1).padStart(2,'0');
    if (total) total.textContent = String(spotlight.length).padStart(2,'0');
  }
  function updateSpotlight(items) {
    const featured = items.filter(v=>v.featured);
    const known = new Set(featured.map(v=>v.id));
    const recent = [...items].sort((a,b)=>(b.publishedAt||'').localeCompare(a.publishedAt||''))
      .filter(v=> /\b(?:AMV|GMV|CMV|MMV|MV)\b/i.test(v.title) &&
        !/\b(?:reaction|trailer|gameplay|tutorial|livestream|guide)\b/i.test(v.title) && !known.has(v.id));
    spotlight = [...featured,...recent].filter(v=>idPattern.test(v.id)).slice(0,5);
    if (!spotlight.length) spotlight = items.filter(v=>idPattern.test(v.id)).slice(0,5);
    setSpotlight(0);
  }
  function updatePortalCounts(playlists) {
    const byPlaylist = new Map((Array.isArray(playlists)?playlists:[]).map(p=>[p.id,p]));
    document.querySelectorAll('[data-portal-playlist]').forEach(card=>{
      const playlist=byPlaylist.get(card.dataset.portalPlaylist);
      const count=card.querySelector('[data-portal-count]');
      if (playlist && count) count.textContent=playlist.videoIds.length.toLocaleString()+' EDITS · ENTER ↗';
    });
  }

  function render(items, playlistData = []) {
    if (!container) return;
    videos = normalize(items);
    updateSpotlight(videos);
    updatePortalCounts(playlistData);
    const byId = new Map(videos.map(v => [v.id, v]));
    const newest = [...videos].sort((a,b) => (b.publishedAt||'').localeCompare(a.publishedAt||''));
    const sections = [];
    const hasPlaylists = Array.isArray(playlistData) && playlistData.length > 0;

    if (hasPlaylists) {
      // Use the complete saved playlist membership, not a slice of 24 or 50.
      const featured = videos.filter(v => v.featured);
      if (featured.length) {
        sections.push({key:'featured',category:'all',overline:'IN THE SPOTLIGHT',title:'Featured AMVs',sub:'A handpicked introduction to the studio.',entries:featured});
      }
      for (const p of playlistData) {
        if (!p || !playlistIdPattern.test(p.id) || !Array.isArray(p.videoIds)) continue;
        const entries = p.videoIds.map(id => byId.get(id)).filter(Boolean);
        if (!entries.length) continue;
        sections.push({
          key:p.id,
          category:['genshin','hsr','other'].includes(p.category)?p.category:'other',
          overline:'YOUTUBE PLAYLIST',
          title:String(p.title || 'AMV Playlist'),
          sub:entries.length.toLocaleString()+' videos in playlist order',
          entries,
          playlistId:p.id
        });
      }
      // Add a full latest-uploads shelf only when playlists have been synchronized.
      if (newest.length) {
        sections.unshift({key:'latest',category:'all',overline:'FRESH FROM YOUTUBE',title:'Latest AMVs',sub:'Newest across all synced playlists.',entries:newest});
      }
    } else {
      // Before the first successful playlist sync, keep the existing AMV categories working.
      sections.push(
        {key:'latest',category:'all',overline:'JUST DROPPED',title:'Latest AMVs',sub:'Fresh from YouTube.',entries:newest.filter(v=>v.publishedAt)},
        {key:'featured',category:'all',overline:'IN THE SPOTLIGHT',title:'Featured AMVs',sub:'A handpicked introduction to the studio.',entries:videos.filter(v=>v.featured)},
        {key:'genshin',category:'genshin',overline:'TEYVAT',title:'Genshin Impact',sub:'Legendary adventures from Teyvat.',entries:newest.filter(v=>v.category==='genshin')},
        {key:'hsr',category:'hsr',overline:'ASTRAL EXPRESS',title:'Honkai: Star Rail',sub:'Edits across the stars.',entries:newest.filter(v=>v.category==='hsr')},
        {key:'other',category:'other',overline:'THE MULTIVERSE',title:'Other Worlds',sub:'Wuthering Waves, Zenless Zone Zero, and beyond.',entries:newest.filter(v=>v.category==='other')}
      );
    }
    container.replaceChildren();
    sections.filter(s => s.entries.length).forEach((sectionData,i) => {
      const {category,overline,title,sub,entries,playlistId} = sectionData;
      const identity = playlistId ? playlistIdentity(sectionData) : {theme:sectionData.key==='featured'?'featured':'recent',symbol:'✦',overline:overline,phrase:sectionData.key==='featured'?'HANDPICKED STORIES':'NEW FROM THE STUDIO'};
      const section = document.createElement('section');
      section.className = 'carousel-block stage-'+identity.theme;
      section.dataset.category = category;
      section.dataset.world = identity.theme;
      section.id = playlistId ? 'playlist-'+playlistId : 'collection-'+sectionData.key;
      section.setAttribute('aria-label',title+' carousel');
      const link = playlistId
        ? '<a class="carousel-playlist-link" href="https://www.youtube.com/playlist?list='+encodeURIComponent(playlistId)+'" target="_blank" rel="noopener noreferrer">Open full playlist on YouTube ↗</a>'
        : '';
      section.innerHTML = '<span class="stage-ambient-mark" aria-hidden="true">'+escapeHTML(identity.symbol)+'</span>'+
        '<div class="carousel-heading"><div class="carousel-heading-copy"><div class="stage-topline"><span class="stage-topline-symbol" aria-hidden="true">'+escapeHTML(identity.symbol)+'</span><span>'+String(i+1).padStart(2,'0')+' / '+escapeHTML(identity.overline)+'</span><span class="stage-topline-rule"></span><span class="stage-phrase">'+escapeHTML(identity.phrase)+'</span></div><h3>'+escapeHTML(title)+'</h3><div class="carousel-subtitle">'+escapeHTML(sub)+'</div>'+link+'</div><div class="carousel-arrows"><button class="arrow-button arrow-prev" type="button" aria-label="Scroll '+escapeHTML(title)+' left">←</button><button class="arrow-button arrow-next" type="button" aria-label="Scroll '+escapeHTML(title)+' right">→</button></div></div><div class="carousel-track" tabindex="0" role="group" aria-label="'+escapeHTML(title)+' videos"></div>';
      container.append(section);
      const track = section.querySelector('.carousel-track');
      const prev = section.querySelector('.arrow-prev'), next = section.querySelector('.arrow-next');
      let rendered = 0;
      const BATCH = 32;
      const append = () => {
        if (rendered >= entries.length) return;
        const batch = entries.slice(rendered,rendered+BATCH);
        track.insertAdjacentHTML('beforeend',batch.map((v,j)=>card(v,rendered+j,entries.length)).join(''));
        rendered += batch.length;
      };
      const arrows = () => {
        const end = Math.max(0,track.scrollWidth-track.clientWidth);
        prev.disabled = track.scrollLeft <= 2;
        next.disabled = rendered >= entries.length && (end <= 2 || track.scrollLeft >= end-2);
      };
      const maybeAppend = () => {
        if (rendered < entries.length && track.scrollWidth-track.clientWidth-track.scrollLeft < track.clientWidth * 1.5) append();
        arrows();
      };
      const move = dir => {
        if(dir>0) maybeAppend();
        const width=track.querySelector('.amv-card')?.getBoundingClientRect().width || 270;
        track.scrollBy({left:dir*(width+19)*2,behavior:'smooth'});
        requestAnimationFrame(maybeAppend);
      };
      append();
      prev.addEventListener('click',()=>move(-1));
      next.addEventListener('click',()=>move(1));
      track.addEventListener('scroll',maybeAppend,{passive:true});
      if('ResizeObserver' in window) new ResizeObserver(maybeAppend).observe(track);
      requestAnimationFrame(maybeAppend);
    });
    applyFilter();
  }
  if(container){
    render(fallback);
    document.querySelectorAll('[data-filter]').forEach(btn=>btn.addEventListener('click',()=>{activeFilter=btn.dataset.filter;applyFilter();}));
    document.querySelectorAll('[data-portal-playlist]').forEach(portal=>{
      portal.addEventListener('click',event=>{
        if(activeFilter!=='all') {activeFilter='all';applyFilter();}
        const target = document.getElementById('playlist-'+portal.dataset.portalPlaylist);
        if(!target) {
          event.preventDefault();
          document.getElementById('amvs')?.scrollIntoView({behavior:'smooth'});
        }
      });
    });
    document.getElementById('spotlight-prev')?.addEventListener('click',()=>setSpotlight(spotlightIndex-1));
    document.getElementById('spotlight-next')?.addEventListener('click',()=>setSpotlight(spotlightIndex+1));

    fetch('videos.json',{cache:'no-store'})
      .then(r=>{if(!r.ok)throw Error('Catalog missing');return r.json();})
      .then(data=>{
        if(!Array.isArray(data.videos)||!data.videos.length)return;
        render(data.videos,data.playlists||[]);
        const status=document.getElementById('catalog-status');
        if(status&&data.updatedAt){
          const count=Array.isArray(data.playlists)?data.playlists.length:0;
          status.textContent=(count?count+' complete YouTube playlists':'YouTube AMV library')+' · last synced '+new Date(data.updatedAt).toLocaleDateString();
        }
      })
      .catch(()=>{ /* Keep the offline starter cards while the first sync is pending. */ });
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
    addEventListener('resize',()=>{if(innerWidth>1240)close();});
  }
  document.querySelectorAll('.current-year').forEach(el=>el.textContent=String(new Date().getFullYear()));
})();