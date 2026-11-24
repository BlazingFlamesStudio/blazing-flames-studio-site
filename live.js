/* Blazing Flames Studio — multistream Live Hub.
   Platforms are source-of-truth for online/offline status. No fabricated badges.
   Embed players are loaded only after a visitor explicitly requests them. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  if(!$('live-stage'))return;
  const DOMAIN=location.hostname||'blazingflamesstudio.github.io';
  const YOUTUBE_CHANNEL='UCL89ReBwzlZQ47s4MlGhDVA';
  const TWITCH_NAME='blazingflamesstudio';
  const urls={
    twitch:'https://www.twitch.tv/blazingflamesstudio',
    youtube:'https://www.youtube.com/@BlazingFlamesStudio/live',
    tiktok:'https://www.tiktok.com/@blazingflamesstudio'
  };
  const config={
    twitch:{
      name:'Twitch',description:'Watch the channel on Twitch. The player shows whether a broadcast is available.',
      button:'Load Twitch player',outbound:'Open Twitch stream ↗'},
    youtube:{
      name:'YouTube',description:'Watch the channel’s current YouTube Live broadcast, when available. Some broadcasts may not allow embedding.',
      button:'Load YouTube Live player',outbound:'Open YouTube Live ↗'},
    tiktok:{
      name:'TikTok',description:'TikTok LIVE opens in its app or website. An embedded player is not provided here.',
      button:'Open TikTok LIVE ↗',outbound:'Open TikTok LIVE ↗'}
  };
  const allowed=Object.keys(config);
  const query=new URLSearchParams(location.search);
  const requested=query.get('platform');
  let active=allowed.includes(requested)?requested:'twitch';
  const tabs=[...document.querySelectorAll('[data-live-platform]')];
  const root=$('live-stream-panel'), chat=$('live-chat-body');
  const loader=$('live-player-load'),placeholder=$('live-player-placeholder');
  const title=$('live-player-name'),description=$('live-player-description'),outbound=$('live-player-outbound');
  const chatTitle=$('live-chat-name'),chatDesc=$('live-chat-description');
  const CHAT_MARK='<span class="live-chat-mark" aria-hidden="true">☾</span>';
  let playerLoaded=false,chatLoaded=false;

  function saveURL() {
    try{
      const url=new URL(location.href);
      if(active==='twitch')url.searchParams.delete('platform');
      else url.searchParams.set('platform',active);
      history.replaceState(null,'',url.pathname+url.search+url.hash);
    }catch{}
  }
  function stopPlayers() {
    root.querySelectorAll('iframe').forEach(frame=>frame.remove());
    chat.querySelectorAll('iframe').forEach(frame=>frame.remove());
    playerLoaded=false;chatLoaded=false;
  }
  function buildPlaceholder() {
    root.replaceChildren();
    const shell=document.createElement('div');shell.className='live-screen-placeholder';shell.id='live-player-placeholder';
    const logo=document.createElement('img');
    logo.src='assets/channel-moonlit.webp?v=2048';logo.alt='';logo.width=74;logo.height=74;
    const heading=document.createElement('h3');heading.textContent=active==='tiktok'?'Join on TikTok LIVE':'The stage is yours.';
    const copy=document.createElement('p');copy.textContent=config[active].description;
    const button=document.createElement('button');button.type='button';button.className='live-load';button.id='live-player-load';
    button.textContent=config[active].button;button.addEventListener('click',loadPlayer);
    shell.append(logo,heading,copy,button);
    root.append(shell);
  }
  function chatPlaceholder() {
    chat.replaceChildren();
    const shell=document.createElement('div');shell.className='live-chat-placeholder';
    const moon=document.createElement('span');moon.className='live-chat-mark';moon.setAttribute('aria-hidden','true');moon.textContent='☾';
    const heading=document.createElement('strong');heading.textContent=active==='twitch'?'The community is gathering.':'Take the conversation with you.';
    const copy=document.createElement('p');
    copy.textContent=active==='twitch'
      ? 'Load Twitch chat to join the conversation. A Twitch sign-in may be required to send messages.'
      : active==='youtube' ? 'YouTube live chat opens with the broadcast on YouTube. The current chat cannot be embedded without a verified active video ID.'
      : 'TikTok LIVE chat is available in the TikTok app or on the channel’s live page.';
    const action=active==='twitch'?document.createElement('button'):document.createElement('a');
    action.textContent=active==='twitch'?'Load Twitch chat':'Join chat on '+config[active].name+' ↗';
    if(active==='twitch') {action.type='button';action.addEventListener('click',loadChat);}
    else {action.href=urls[active];action.target='_blank';action.rel='noopener noreferrer';}
    shell.append(moon,heading,copy,action);chat.append(shell);
    chatTitle.textContent=active==='twitch'?'TWITCH CHAT':active.toUpperCase()+' COMMUNITY';
    chatDesc.textContent=active==='twitch'
      ? 'Twitch chat is loaded only when you choose to open it.'
      : 'Chat opens on the selected platform to keep your messages connected to its stream.';
  }
  function selectPlatform(name,{updateURL=true}={}) {
    if(!allowed.includes(name))return;
    active=name;
    stopPlayers();
    tabs.forEach(t=>{
      const selected=t.dataset.livePlatform===name;
      t.setAttribute('aria-selected',String(selected));
      t.tabIndex=selected?0:-1;
    });
    buildPlaceholder();chatPlaceholder();
    title.textContent='Blazing Flames Studio · '+config[name].name;
    description.textContent=config[name].description;
    outbound.href=urls[name];
    outbound.textContent=config[name].outbound;
    $('live-platform-status').textContent=name==='tiktok'
      ? 'TikTok LIVE opens on TikTok'
      : 'Check '+config[name].name+' for current stream availability';
    if(updateURL)saveURL();
  }
  function makeFrame(source,title) {
    const iframe=document.createElement('iframe');
    iframe.title=title;
    iframe.src=source;
    iframe.loading='eager';
    iframe.referrerPolicy='strict-origin-when-cross-origin';
    iframe.allow='autoplay; fullscreen; encrypted-media; picture-in-picture; web-share';
    iframe.allowFullscreen=true;
    return iframe;
  }
  function loadPlayer() {
    if(playerLoaded)return;
    if(active==='tiktok'){window.open(urls.tiktok,'_blank','noopener,noreferrer');return;}
    // Twitch requires an iframe at least 400x300. On narrower devices,
    // open its full player rather than rendering an unusable small embed.
    if(active==='twitch' && root.clientWidth && root.clientWidth < 400){
      window.open(urls.twitch,'_blank','noopener,noreferrer');
      return;
    }
    let src;
    if(active==='twitch'){
      const query=new URLSearchParams({channel:TWITCH_NAME,parent:DOMAIN,autoplay:'false',muted:'true'});
      src='https://player.twitch.tv/?'+query;
    }else{
      const query=new URLSearchParams({channel:YOUTUBE_CHANNEL,autoplay:'0',rel:'0'});
      src='https://www.youtube.com/embed/live_stream?'+query;
    }
    root.replaceChildren(makeFrame(src,config[active].name+' · Blazing Flames Studio live player'));
    playerLoaded=true;
  }
  function loadChat() {
    if(chatLoaded||active!=='twitch')return;
    const url='https://www.twitch.tv/embed/'+TWITCH_NAME+'/chat?'+new URLSearchParams({parent:DOMAIN,darkpopout:'true'});
    chat.replaceChildren(makeFrame(url,'Blazing Flames Studio Twitch chat'));
    chatLoaded=true;
  }
  function handleArrows(event){
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();
    const n=allowed.indexOf(active);
    const next=event.key==='Home'?0:event.key==='End'?allowed.length-1:
      (n+(event.key==='ArrowRight'?1:-1)+allowed.length)%allowed.length;
    selectPlatform(allowed[next]);tabs[next].focus();
  }
  async function share(){
    const url=new URL(location.href);
    url.searchParams.set('platform',active);
    url.hash='live-stage';
    const target=$('live-share');
    try{
      if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');
      await navigator.clipboard.writeText(url.toString());
      target.textContent='✓ Link copied';
    }catch{
      const fallback=$('live-share-url');
      fallback.textContent=url.toString();
      target.textContent='Select the link beside this button';
    }
  }
  function addAMV(v) {
    const a=document.createElement('a');
    a.href='https://www.youtube.com/watch?v='+v.id;
    a.target='_blank';a.rel='noopener noreferrer';
    const img=document.createElement('img');
    img.src='https://i.ytimg.com/vi/'+v.id+'/mqdefault.jpg';
    img.loading='lazy';img.decoding='async';img.alt='';img.width=320;img.height=180;
    const heading=document.createElement('strong');heading.textContent=v.title;
    a.append(img,heading);
    const article=document.createElement('article');article.className='live-latest-item';
    article.append(a);return article;
  }
  async function latestAMVs(){
    const grid=$('live-latest-grid');
    if(!grid)return;
    try {
      const response=await fetch('./videos.json',{cache:'no-store'});
      if(!response.ok)throw Error('Library unavailable');
      const data=await response.json();
      const visible=(Array.isArray(data.videos)?data.videos:[])
        .filter(v=>v && /^[A-Za-z0-9_-]{11}$/.test(v.id) && v.channelOwned!==false &&
          /(?:\bAMV\b|AMV\/GMV|AMVGMV)/i.test(v.title||'') &&
          !/\b(?:reaction|reacted|tutorial|gameplay|livestream)\b/i.test(v.title||''))
        .sort((a,b)=>(b.publishedAt||'').localeCompare(a.publishedAt||'')).slice(0,4);
      if(!visible.length)throw Error('No latest AMVs indexed');
      grid.replaceChildren(...visible.map(addAMV));
    }catch(e){
      const p=document.createElement('p');
      p.textContent='The latest AMVs could not be loaded. Explore the AMV Finder instead.';
      grid.replaceChildren(p);
    }
  }
  tabs.forEach(tab=>{tab.addEventListener('click',()=>selectPlatform(tab.dataset.livePlatform));tab.addEventListener('keydown',handleArrows);});
  $('live-share').addEventListener('click',share);
  const popout=$('live-chat-popout');
  if(popout){
    popout.addEventListener('click',event=>{
      // Use a resizable auxiliary window when allowed; preserve the link's
      // normal new-tab behavior if the browser blocks the popup.
      const popup=window.open(popout.href,'bfs-unified-live-chat','popup=yes,width=500,height=800,resizable=yes,scrollbars=yes');
      if(popup){event.preventDefault();popup.focus();}
    });
  }
  document.querySelectorAll('.current-year').forEach(el=>{el.textContent=String(new Date().getFullYear());});
  const toggle=document.querySelector('.mobile-toggle'),mobile=$('mobile-nav');
  if(toggle&&mobile){
    const close=()=>{mobile.hidden=true;toggle.setAttribute('aria-expanded','false');};
    toggle.addEventListener('click',()=>{mobile.hidden=!mobile.hidden;toggle.setAttribute('aria-expanded',String(!mobile.hidden));});
    mobile.querySelectorAll('a').forEach(a=>a.addEventListener('click',close));
    window.addEventListener('resize',()=>{if(innerWidth>1240)close();});
  }
  selectPlatform(active,{updateURL:false});
  latestAMVs();
})();
