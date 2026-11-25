/* No-network regression tests for Blazing Flames Studio Live Hub.
 * Dynamic mocked DOM checks iframe switching, chat, and labels. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const base=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(base,name),'utf8');

class Element {
  constructor(tag='div',id=''){
    this.tagName=tag;this.id=id;this.className='';this.textContent='';
    this.children=[];this.parent=null;this.handlers=new Map();this.attributes={};
    this.dataset={};this.hidden=false;this.value='';this.tabIndex=0;this.clientWidth=670;
  }
  addEventListener(name,fn){this.handlers.set(name,fn)}
  dispatch(name,event={}){this.handlers.get(name)?.({target:this,preventDefault(){},...event})}
  click(){this.dispatch('click')}
  setAttribute(k,v){this.attributes[k]=String(v)}
  getAttribute(k){return this.attributes[k]}
  append(...parts){for(const part of parts){part.parent=this;this.children.push(part)}}
  replaceChildren(...parts){this.children.forEach(el=>el.parent=null);this.children=[];this.append(...parts)}
  querySelectorAll(selector){
    const found=[];
    const match=el=>selector==='iframe'&&el.tagName==='iframe';
    const visit=node=>{for(const child of node.children){if(match(child))found.push(child);visit(child)}};
    visit(this);return found;
  }
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this)}
  focus(){}
}
const video={id:'AAAAAAAAAAA',title:'PAYPHONE | Honkai Star Rail AMV/GMV',channelOwned:true,publishedAt:'2026-11-24T01:00:00Z'};
function setup(search=''){
  const ids=['live-stage','live-stream-panel','live-chat-body','live-player-load','live-player-placeholder',
    'live-player-name','live-player-description','live-player-outbound','live-chat-name',
    'live-chat-description','live-platform-status','live-share','live-share-url','live-latest-grid',
    'live-youtube-source','live-youtube-form','live-youtube-url','live-youtube-clear','live-youtube-feedback'];
  const elements=new Map(ids.map(id=>[id,new Element('div',id)]));
  const tabs=['twitch','youtube','tiktok'].map(x=>{const e=new Element('button');e.dataset.livePlatform=x;return e});
  const opened=[],copied=[],history=[];
  const context={
    document:{
      getElementById(id){return elements.get(id)||null},
      querySelectorAll(q){return q==='[data-live-platform]'?tabs:[]},
      querySelector(){return null},
      createElement(tag){return new Element(tag)},
    },
    location:{hostname:'blazingflamesstudio.github.io',href:'https://blazingflamesstudio.github.io/blazing-flames-studio-site/live.html'+search,search},
    history:{replaceState(_,__,url){history.push(url)}},
    window:{open(...args){opened.push(args)},addEventListener(){}},
    URL,URLSearchParams,
    navigator:{clipboard:{async writeText(link){copied.push(link)}}},
    async fetch(){return {ok:true,async json(){return {videos:[video]}}}},
  };
  vm.runInNewContext(read('live.js'),context,{filename:'live.js'});
  const el=id=>elements.get(id);
  const placeholderButton=id=>{
    const shell=el(id).children[0];
    return shell.children.find(c=>c.tagName==='button');
  };
  return {context,el,tabs,opened,copied,history,placeholderButton};
}
const settle=async()=>{for(let i=0;i<5;i++)await Promise.resolve()};

test('Live Hub source and responsive CSS are valid and reference real official domains',()=>{
 const html=read('live.html');
 const css=read('live.css');
 const links=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(new Set(links).size,links.length,'HTML ids must be unique');
 for(const required of ['live-stage','live-stream-panel','live-chat-body','live-share']){
  assert.ok(links.includes(required),required+' missing');
 }
 assert.match(html,/href="https:\/\/www\.twitch\.tv\/blazingflamesstudio"/);
 assert.match(html,/href="https:\/\/www\.youtube\.com\/@BlazingFlamesStudio\/live"/);
 assert.match(html,/href="https:\/\/www\.tiktok\.com\/@blazingflamesstudio"/);
 assert.match(css,/\.live-screen\{min-height:300px\}/);
 assert.doesNotMatch(html,/LIVE NOW|Currently streaming/);
});
test('Twitch embeds use the current exact parent domain and stop when switching',()=>{
 const app=setup();
 app.placeholderButton('live-stream-panel').click();
 const player=app.el('live-stream-panel').querySelectorAll('iframe');
 assert.equal(player.length,1);
 const src=new URL(player[0].src);
 assert.equal(src.hostname,'player.twitch.tv');
 assert.equal(src.searchParams.get('parent'),'blazingflamesstudio.github.io');
 assert.equal(src.searchParams.get('channel'),'blazingflamesstudio');
 assert.equal(src.searchParams.get('autoplay'),'false');
 app.tabs[1].click();
 assert.equal(app.el('live-stream-panel').querySelectorAll('iframe').length,0,'Twitch iframe should be disposed');
 assert.equal(app.tabs[1].getAttribute('aria-selected'),'true');
 assert.match(app.el('live-platform-status').textContent,/Check YouTube/);
 // Without a verified video ID, do not create the broken channel-based iframe.
 app.placeholderButton('live-stream-panel').click();
 const youtube=app.el('live-stream-panel').querySelectorAll('iframe');
 assert.equal(youtube.length,0);
 assert.equal(app.opened[0][0],'https://www.youtube.com/@BlazingFlamesStudio/live');
});
test('YouTube uses a specific valid broadcast ID and shares the matching player',async()=>{
 const app=setup('?platform=youtube');
 app.el('live-youtube-url').value='https://www.youtube.com/live/BBBBBBBBBBB?feature=share';
 app.el('live-youtube-form').dispatch('submit');
 const frames=app.el('live-stream-panel').querySelectorAll('iframe');
 assert.equal(frames.length,1);
 assert.equal(new URL(frames[0].src).hostname,'www.youtube-nocookie.com');
 assert.match(frames[0].src,/\/embed\/BBBBBBBBBBB/);
 assert.equal(app.el('live-player-outbound').href,'https://www.youtube.com/watch?v=BBBBBBBBBBB');
 app.el('live-share').click();
 await settle();
 assert.match(app.copied[0],/video=BBBBBBBBBBB/);
});
test('Invalid or channel-only YouTube URLs never generate an embedded player',()=>{
 const app=setup('?platform=youtube');
 app.el('live-youtube-url').value='https://www.youtube.com/@BlazingFlamesStudio/live';
 app.el('live-youtube-form').dispatch('submit');
 assert.equal(app.el('live-stream-panel').querySelectorAll('iframe').length,0);
 assert.match(app.el('live-youtube-feedback').textContent,/specific video/);
 app.el('live-youtube-url').value='https://not-youtube.example.com/watch?v=BBBBBBBBBBB';
 app.el('live-youtube-form').dispatch('submit');
 assert.equal(app.el('live-stream-panel').querySelectorAll('iframe').length,0);
});
test('Twitch chat is explicitly opt-in and is removed when leaving Twitch',()=>{
 const app=setup();
 assert.equal(app.el('live-chat-body').querySelectorAll('iframe').length,0);
 app.placeholderButton('live-chat-body').click();
 const chat=app.el('live-chat-body').querySelectorAll('iframe');
 assert.equal(chat.length,1);
 const url=new URL(chat[0].src);
 assert.equal(url.hostname,'www.twitch.tv');
 assert.equal(url.searchParams.get('parent'),'blazingflamesstudio.github.io');
 app.tabs[2].click();
 assert.equal(app.el('live-chat-body').querySelectorAll('iframe').length,0);
 assert.match(app.el('live-chat-name').textContent,/TIKTOK/);
 app.placeholderButton('live-stream-panel').click();
 assert.equal(app.opened[0][0],'https://www.tiktok.com/@blazingflamesstudio');
});
test('Narrow Twitch players open the channel to meet minimum embed dimensions',()=>{
 const app=setup();
 app.el('live-stream-panel').clientWidth=360;
 app.placeholderButton('live-stream-panel').click();
 assert.equal(app.el('live-stream-panel').querySelectorAll('iframe').length,0);
 assert.equal(app.opened[0][0],'https://www.twitch.tv/blazingflamesstudio');
});
test('Deep linked platforms restore correctly and share uses that selection',async()=>{
 const app=setup('?platform=youtube');
 assert.equal(app.tabs[1].getAttribute('aria-selected'),'true');
 app.el('live-share').click();
 await settle();
 assert.equal(app.copied.length,1);
 assert.match(app.copied[0],/platform=youtube/);
 assert.match(app.copied[0],/#live-stage/);
});
test('Latest AMVs use the confirmed public title catalog',async()=>{
 const app=setup();
 await settle();
 const recent=app.el('live-latest-grid').children;
 assert.equal(recent.length,1);
 assert.equal(recent[0].tagName,'article');
 assert.equal(recent[0].children[0].href,'https://www.youtube.com/watch?v=AAAAAAAAAAA');
 assert.equal(recent[0].children[0].children[1].textContent,video.title);
});
