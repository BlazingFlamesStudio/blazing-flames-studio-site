/* Public pop-out chat viewer. All-Chat is an optional read-only multichat provider.
   Never treat an unconfigured overlay as connected, and never print fake messages. */
(() => {
  'use strict';
  const feed=document.getElementById('chat-feed');
  const status=document.getElementById('chat-status');
  const placeholder=document.getElementById('chat-placeholder');
  const msg=document.getElementById('chat-message');
  const twitchButton=document.getElementById('chat-load-twitch');
  if(!feed||!status||!placeholder||!msg||!twitchButton) return;

  function verifiedPublicOverlay(value){
    if(typeof value!=='string'||!value.trim()) return null;
    try {
      const url=new URL(value.trim());
      if(url.protocol!=='https:'||url.username||url.password||url.hostname!=='allch.at')return null;
      if(!/^\/overlay\/[a-zA-Z0-9_-]+\/?$/.test(url.pathname))return null;
      return url.toString();
    } catch { return null; }
  }
  function addFrame(src,title){
    const frame=document.createElement('iframe');
    frame.title=title;
    frame.src=src;
    frame.referrerPolicy='strict-origin-when-cross-origin';
    frame.allow='autoplay; clipboard-write';
    frame.setAttribute('loading','eager');
    feed.replaceChildren(frame);
  }
  function loadTwitch(){
    const parent=window.location.hostname||'blazingflamesstudio.github.io';
    const query=new URLSearchParams({parent,darkpopout:'true'});
    addFrame('https://www.twitch.tv/embed/blazingflamesstudio/chat?'+query,'Blazing Flames Studio Twitch live chat');
    status.textContent='TWITCH CHAT · Single-platform fallback';
  }
  const overlay=verifiedPublicOverlay(window.BFS_UNIFIED_CHAT_OVERLAY_URL);
  if(overlay){
    status.textContent='UNIFIED FEED · Twitch / YouTube / TikTok (where connected)';
    addFrame(overlay,'Unified live chat for Blazing Flames Studio');
  }else{
    status.textContent='UNIFIED FEED NOT CONFIGURED · Twitch fallback available';
    msg.textContent='The combined Twitch, YouTube, and TikTok feed has not been connected. You can still open Twitch chat below, or use the platform links to join the conversation.';
    twitchButton.hidden=false;
    twitchButton.addEventListener('click',loadTwitch);
  }
})();
