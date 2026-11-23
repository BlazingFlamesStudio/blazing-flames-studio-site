/* The people behind the spark — partnership AMV highlights.
   Source: existing site-managed videos.json + Partnership AMVs playlist.
   No video is attributed to any individual creator without evidence.
*/
(() => {
  'use strict';
  const playlistId='PLCHZapUG_vAF04dcec0aOvkGjfgVssS2v';
  const $=id=>document.getElementById(id);
  const ytId=/^[A-Za-z0-9_-]{11}$/;
  const fallback=[
    {id:'dGn1zPCVM7E',title:'UNSTOPPABLE - LUNAE X HONKAI STAR RAIL [[AMV/GMV]]',game:'Honkai: Star Rail',year:'2023'},
    {id:'B2NG6gw6b8w',title:'DIE FOR YOU: CLORINDE X GENSHIN IMPACT [[AMV/GMV]]',game:'Genshin Impact',year:'2023'},
    {id:'K3g4nklPdK4',title:'BELIEVER - DEHYA X GENSHIN IMPACT [[AMV/GMV]]',game:'Genshin Impact',year:'2023'},
    {id:'J8jcziJouvo',title:'SMELLS LIKE TEEN SPIRIT - SERVAL X HONKAI STAR RAIL [[AMV/GMV]]',game:'Honkai: Star Rail',year:'2023'},
    {id:'1k3MEmoEeqQ',title:'SMOOTH CRIMINAL - DILUC X GENSHIN IMPACT [[AMV/GMV]]',game:'Genshin Impact',year:'2023'},
    {id:'UH02WLOEN2w',title:'AJR - Live From Teyvat Concert Series [[AMV/GMV]]',game:'Genshin Impact',year:'2023'}
  ];
  let videos=[];
  const modal=$('collab-video-modal');
  function card(v,index) {
    const button=document.createElement('button');
    button.type='button';button.className='collab-video-card';
    button.setAttribute('aria-label','Watch '+v.title);
    const imageBox=document.createElement('span');
    imageBox.className='collab-video-thumb';
    const img=document.createElement('img');
    img.src='https://i.ytimg.com/vi/'+v.id+'/hqdefault.jpg';
    img.alt='YouTube thumbnail: '+v.title;
    img.loading='lazy';img.decoding='async';img.width=480;img.height=270;
    const play=document.createElement('span');
    play.className='collab-video-play';play.setAttribute('aria-hidden','true');play.textContent='▶';
    const number=document.createElement('span');
    number.className='collab-video-index';number.textContent=String(index+1).padStart(2,'0');
    imageBox.append(img,play,number);
    const copy=document.createElement('span');copy.className='collab-video-copy';
    const meta=document.createElement('span');meta.className='collab-video-meta';
    meta.textContent=(v.game||'AMV / GMV')+' · '+(v.year||'');
    const name=document.createElement('strong');name.textContent=v.title;
    copy.append(meta,name);
    button.append(imageBox,copy);
    button.addEventListener('click',()=>open(v));
    return button;
  }
  function draw(items,count){
    videos=items.filter(v=>v&&ytId.test(v.id)&&typeof v.title==='string').slice(0,Math.max(1,count));
    const grid=$('collab-video-grid');
    if(!grid)return;
    grid.replaceChildren(...videos.map(card));
    if(!videos.length){
      const p=document.createElement('p');p.className='collab-video-loading';
      p.textContent='The partnership AMV selection is currently unavailable. Explore the full playlist on YouTube.';
      grid.append(p);
    }
  }
  async function load() {
    draw(fallback,6);
    try {
      const res=await fetch('videos.json',{cache:'no-store'});
      if(!res.ok)throw new Error('Catalogue unavailable');
      const data=await res.json();
      const playlist=(Array.isArray(data.playlists)?data.playlists:[]).find(x=>x.id===playlistId);
      const all=Array.isArray(data.videos)?data.videos:[];
      if(!playlist||!Array.isArray(playlist.videoIds))throw new Error('Partnership playlist unavailable');
      const byId=new Map(all.filter(v=>v&&ytId.test(v.id)).map(v=>[v.id,v]));
      const matches=playlist.videoIds.map(id=>byId.get(id)).filter(v=>v&&ytId.test(v.id));
      if(matches.length)draw(matches,6);
      $('collab-playlist-status').textContent=matches.length+' edits in the broader Partnership AMVs playlist · automatically synchronized';
    } catch(error) {
      $('collab-playlist-status').textContent='Showing a saved selection from the Partnership AMVs playlist · see YouTube for the full collection';
    }
  }
  function open(v) {
    if(!v || !ytId.test(v.id))return;
    const frame=$('collab-video-frame');
    const title=$('collab-modal-title');
    const link=$('collab-modal-youtube');
    title.textContent=v.title;
    link.href='https://www.youtube.com/watch?v='+v.id;
    const iframe=document.createElement('iframe');
    iframe.src='https://www.youtube-nocookie.com/embed/'+v.id+'?autoplay=1&rel=0';
    iframe.title=v.title;
    iframe.allow='accelerometer;autoplay;encrypted-media;gyroscope;picture-in-picture;web-share';
    iframe.referrerPolicy='strict-origin-when-cross-origin';
    iframe.allowFullscreen=true;
    frame.replaceChildren(iframe);
    if(typeof modal?.showModal==='function')modal.showModal();
    else window.open('https://www.youtube.com/watch?v='+v.id,'_blank','noopener');
  }
  function bind() {
    const close=()=>{if(modal?.open)modal.close();};
    modal?.querySelector('.modal-close')?.addEventListener('click',close);
    modal?.addEventListener('close',()=>$('collab-video-frame').replaceChildren());
    modal?.addEventListener('click',event=>{if(event.target===modal)close();});
    const button=document.querySelector('.mobile-toggle');
    const menu=$('mobile-nav');
    if(button&&menu){
      const closeNav=()=>{menu.hidden=true;button.setAttribute('aria-expanded','false');};
      button.addEventListener('click',()=>{
        menu.hidden=!menu.hidden;button.setAttribute('aria-expanded',String(!menu.hidden));
      });
      menu.querySelectorAll('a').forEach(link=>link.addEventListener('click',closeNav));
      window.addEventListener('resize',()=>{if(window.innerWidth>1240)closeNav();});
    }
    document.querySelectorAll('.current-year').forEach(n=>n.textContent=String(new Date().getFullYear()));
  }
  bind();load();
})();