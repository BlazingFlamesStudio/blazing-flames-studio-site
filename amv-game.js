/* Blazing Flames Studio — The Moonlit AMV Oracle.
   Results are grounded in names present in actual YouTube video titles.
   Uses the existing autosynced videos.json; does not invent character
   appearances for song-only titles or alter the main library script.
*/
(() => {
  'use strict';

  const groups = {
    genshin: {
      name: 'Genshin Impact',
      people: [
        ['Aether'],['Lumine'],['Diluc'],['Venti'],['Zhongli'],['Raiden Shogun','Raiden Ei'],
        ['Kazuha','Kaedehara Kazuha'],['Xiao'],['Hu Tao'],['Qiqi'],['Klee'],['Albedo'],
        ['Fischl'],['Keqing'],['Ningguang'],['Ganyu'],['Shenhe'],['Yelan'],['Yae Miko'],
        ['Kokomi'],['Ayaka','Kamisato Ayaka'],['Ayato'],['Itto'],['Yoimiya'],['Gorou'],
        ['Sara','Kujou Sara'],['Shinobu','Kuki Shinobu'],['Heizou'],['Collei'],
        ['Tighnari'],['Cyno'],['Nilou'],['Nahida'],['Alhaitham'],['Kaveh'],['Dehya'],
        ['Layla'],['Faruzan'],['Wanderer','Scaramouche'],['Childe','Tartaglia'],
        ['Mona'],['Eula'],['Rosaria'],['Diona'],['Xinyan'],['Sayu'],['Yanfei'],
        ['Yaoyao','Yao Yao'],['Kirara'],['Lynette'],['Lyney'],['Freminet'],
        ['Wriothesley'],['Neuvillette'],['Furina'],['Navia'],['Clorinde'],
        ['Charlotte'],['Chevreuse'],['Arlecchino'],['Mualani'],['Mavuika'],['Columbina']
      ]
    },
    hsr: {
      name: 'Honkai: Star Rail',
      people: [
        ['Stelle'],['Caelus'],['Trailblazer'],['March 7th'],['Imbibitor Lunae'],
        ['Firefly','SAM'],['Kafka'],['Silver Wolf'],['Blade'],['Jing Yuan'],
        ['Yanqing'],['Luocha'],['Himeko'],['Robin'],['Sunday'],['Sparkle'],
        ['Aventurine'],['Topaz'],['Dr. Ratio','Doctor Ratio'],['Ruan Mei'],
        ['Black Swan'],['Acheron'],['Gepard'],['Serval'],['Argenti'],
        ['Huohuo','Huo Huo'],['Fu Xuan'],['Jingliu'],['Feixiao'],['The Herta'],
        ['Aglaea'],['Castorice'],['Phainon'],['Mydei'],['Yao Guang']
      ]
    },
    wuwa: {
      name: 'Wuthering Waves',
      people: [
        ['Rover'],['Yangyang'],['Chixia'],['Baizhi'],['Sanhua'],['Verina'],
        ['Encore'],['Jianxin'],['Jiyan'],['Yinlin'],['Jinhsi'],['Changli'],
        ['Calcharo'],['Mortefi'],['Aalto'],['Lingyang'],['Danjin'],['Taoqi'],
        ['Yuanwu'],['Youhu'],['Xiangli Yao'],['Zhezhi'],
        ['Shorekeeper','The Shorekeeper'],['Camellya'],['Lumi'],['Carlotta'],
        ['Roccia'],['Brant'],['Phoebe'],['Zani'],['Cantarella'],['Cartethyia'],
        ['Lupa'],['Ciaccona'],['Augusta'],['Iuno'],['Galbrena'],['Chisa'],
        ['Qiuyuan'],['Phrolova'],['Lynae'],['Luuk Herssen'],['Aemeath'],
        ['Mornye'],['Buling'],['Hiyuki'],['Lucilla'],['Sigrika'],['Lucy'],
        ['Rebecca'],['Denia'],['Suoming'],['Suisui'],['Qingxiao']
      ]
    },
    emblem: {
      name: 'Fire Emblem',
      people: [
        ['Alm'],['Celica'],['Ike'],['Lucina'],['Chrom'],['Byleth'],['Edelgard'],
        ['Dimitri'],['Claude'],['Azura'],['Alear'],['Ivy'],['Shez'],['Berkut'],
        ['Gullveig']
      ]
    }
  };

  const el = id => document.getElementById(id);
  const fallback = typeof AMV_VIDEOS !== 'undefined' ? AMV_VIDEOS : [];
  const idOK = /^[A-Za-z0-9_-]{11}$/;
  const worldName = key => groups[key]?.name || 'The multiverse';
  const normalize = s => String(s || '').normalize('NFKD')
    .replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'")
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const containsPhrase = (title, name) => (' ' + normalize(title) + ' ')
    .includes(' ' + normalize(name) + ' ');
  const skipVideo = title => /\b(reaction|walkthrough|gameplay|unboxing|reaction video|first trailer|livestream|guide|account review)\b/i.test(title);
  const curated = Object.entries(groups).flatMap(([world, group]) =>
    group.people.map(([name, ...aliases]) => ({
      id: world + ':' + normalize(name).replace(/ /g,'-'),
      name, aliases: [name,...aliases], world, videos:[]
    }))
  );

  const state = {
    videos: [], available: [], world: 'all', query: '',
    selected: null, current: null, currentCharacter: null, worldVideos: [], wuwaPlaylistIds: new Set(), worldFallback: false, draws: 0, loading: true
  };

  function goodVideo(video) {
    if(!video || !idOK.test(video.id) || !video.title || skipVideo(video.title)) return false;
    return true;
  }

  function matchTitle(video, aliases) {
    const title = normalize(video.title);
    const names = aliases.filter(alias => containsPhrase(video.title, alias));
    if (!names.length) return 0;
    let score = 1;
    for (const name of names) {
      const n = normalize(name);
      // E.g. "Clorinde's Demo But With ZHONGLI'S THEME" isn't a Zhongli AMV.
      const themeCredit = title.includes(n + ' s theme') || title.includes(n + ' theme');
      if (themeCredit && title.includes('but with')) continue;
      if (themeCredit && !/\b(amv|gmv|edit|tribute)\b/.test(title)) continue;
      score = Math.max(score, 3);
      if (title.startsWith(n + ' ') || title === n) score += 4;
      if (title.includes(' - ' + n + ' ') || title.includes(' a ' + n + ' ')) score += 3;
      if (/\b(amv|gmv|edit|tribute|cmv)\b/.test(title)) score += 3;
      if (/\bvs\b|\bduel\b|\bchoose your legend\b|\babyss wars\b/.test(title)) score += 1;
    }
    if(score===1)return 0;
    return score;
  }

  // A world-level pick must explicitly mention Wuthering Waves (or WuWa).
  // Do not infer that any given Resonator appears in an untagged song edit.
  function isWuwaVideo(video) {
    return state.wuwaPlaylistIds.has(video.id)
      || /\b(?:wuthering[\s-]*waves|wuwa)\b/i.test(String(video?.title || '')+' '+String(video?.game || ''));
  }
  function isWuwaPlaylist(playlist) {
    return playlist?.category==='wuwa' || /\b(?:wuthering[\s-]*waves|wuwa)\b/i.test(String(playlist?.title || ''));
  }

  function rankMatches(character, videos) {
    return videos.filter(goodVideo).map(video=>({video,score:matchTitle(video,character.aliases)}))
      .filter(x=>x.score>0)
      .sort((a,b)=>b.score-a.score || (b.video.publishedAt||'').localeCompare(a.video.publishedAt||''));
  }

  function updateAvailable() {
    // Song-titled AMVs count when the owner places them in the WuWa playlist.
    state.worldVideos = state.videos.filter(isWuwaVideo);
    state.available = curated.map(c => ({
      ...c,
      videos:rankMatches(c,c.world==='wuwa' ? state.worldVideos : state.videos)
    })).filter(c=>c.videos.length || (c.world==='wuwa' && state.worldVideos.length));
    state.available.sort((a,b)=>a.name.localeCompare(b.name));
    const named=state.available.filter(c=>c.videos.length).length;
    el('oracle-index-status').textContent = state.available.length
      ? named + ' characters with named edits · '+state.worldVideos.length+' Wuthering Waves edits (playlist-backed when available) · '+state.videos.length+' videos indexed'
      : 'No character-named AMVs were found yet. Try again when the library syncs.';
    updateList();
  }

  function setWorld(key) {
    if(key!=='all' && !groups[key])key='all';
    state.world=key;
    document.querySelectorAll('[data-world]').forEach(b=>{
      b.setAttribute('aria-pressed',String(b.dataset.world===key));
    });
    if (state.selected && key!=='all' && state.selected.world!==key) {
      state.selected=null;
    }
    updateList();
    updateSelection();
  }

  function updateList() {
    const list=el('oracle-character-list');
    if(!list)return;
    const q=normalize(state.query);
    const available=state.available.filter(c=>
      (state.world==='all'||c.world===state.world)
      && (!q || c.aliases.some(a=>normalize(a).includes(q)) || normalize(worldName(c.world)).includes(q))
    );
    list.replaceChildren();
    if (!available.length) {
      const p=document.createElement('p');
      p.className='oracle-empty';
      p.textContent=state.loading?'Reading your AMV library…'
        : state.available.length ? 'No named-character matches here yet. Try another world or clear the search.' : 'The library has no character-named edits available yet.';
      list.append(p);
      return;
    }
    const frag=document.createDocumentFragment();
    available.forEach(c=>{
      const button=document.createElement('button');
      button.type='button';
      button.className='oracle-character';
      button.setAttribute('aria-pressed',String(state.selected?.id===c.id));
      button.setAttribute('aria-label','Choose '+c.name+', '+(c.videos.length
        ? c.videos.length+' title-matched AMV'+(c.videos.length===1?'':'s')
        : 'Wuthering Waves world-level recommendation only'));
      const star=document.createElement('span');
      star.className='oracle-character-mark';
      star.setAttribute('aria-hidden','true');
      star.textContent=c.world==='genshin'?'✧':c.world==='hsr'?'✦':c.world==='wuwa'?'〰':'♜';
      const copy=document.createElement('span');
      copy.className='oracle-character-copy';
      const strong=document.createElement('strong');
      strong.textContent=c.name;
      const small=document.createElement('small');
      small.textContent=worldName(c.world);
      copy.append(strong,small);
      const count=document.createElement('span');
      count.className='oracle-character-count';
      count.textContent=c.videos.length?String(c.videos.length):'~';
      count.title=c.videos.length?c.videos.length+' character title matches':'World-level edit only; no video names this character yet';
      button.append(star,copy,count);
      button.addEventListener('click',()=>setCharacter(c));
      frag.append(button);
    });
    list.append(frag);
  }

  function setCharacter(character) {
    if (!character || (!character.videos.length && !(character.world==='wuwa' && state.worldVideos.length)))return;
    state.selected=character;
    if (state.world!=='all' && state.world!==character.world)setWorld('all');
    updateList();
    updateSelection();
  }

  function updateSelection() {
    const selection=el('oracle-selection');
    const button=el('oracle-reveal');
    if(state.selected){
      const c=state.selected;
      selection.textContent=c.videos.length
        ? '✦ '+c.name+' · '+c.videos.length+' character match'+(c.videos.length===1?'':'es')+' found'
        : '〰 '+c.name+' · world-level WuWa edit available (no character-specific match yet)';
      button.disabled=false;
      button.firstChild.textContent=c.videos.length?'REVEAL MY AMV ':'REVEAL A WORLD-LEVEL PICK ';
    }else{
      selection.textContent='Choose a character to reveal their AMV.';
      button.disabled=true;
      button.firstChild.textContent='REVEAL MY AMV ';
    }
  }

  function randomIndex(length) {
    if(length<=1)return 0;
    if(window.crypto?.getRandomValues){
      const b=new Uint32Array(1);
      window.crypto.getRandomValues(b);
      return b[0]%length;
    }
    return Math.floor(Math.random()*length);
  }

  function reveal(preferId='') {
    const c=state.selected;
    if(!c)return;
    const fallback=c.world==='wuwa' && !c.videos.length;
    const candidates=(fallback ? state.worldVideos.map(video=>({video,score:1})) : c.videos)
      .filter(x=>x.video.id!==state.current?.id || c.id!==state.currentCharacter?.id);
    const all=fallback ? state.worldVideos.map(video=>({video,score:1})) : c.videos;
    const list=candidates.length?candidates:all;
    if(!list.length)return;
    // Give character-centric edits an advantage while keeping the draw varied.
    const strongest=Math.max(...list.map(x=>x.score));
    const weighted=list.filter(x=>x.score>=strongest-3);
    let item=weighted[randomIndex(weighted.length)];
    if(preferId){
      const found=all.find(x=>x.video.id===preferId);
      if(found)item=found;
    }
    state.current=item.video;
    state.currentCharacter=c;
    state.worldFallback=fallback;
    state.draws++;
    showResult();
  }

  function showResult() {
    const c=state.currentCharacter,v=state.current;
    if(!c||!v)return;
    el('oracle-unrevealed').hidden=true;
    el('oracle-result').hidden=false;
    el('oracle-reading-number').textContent='NO. '+String(state.draws).padStart(3,'0');
    el('oracle-result-character').textContent=c.name;
    el('oracle-result-summary').textContent=state.worldFallback
      ? 'Your selected Resonator: '+c.name+' · this pick represents their world, not a confirmed character feature.'
      : 'A Blazing Flames Studio edit with '+c.name+' named in its title.';
    el('oracle-result-label').textContent=state.worldFallback
      ? 'A WUTHERING WAVES WORLD PICK · NOT A CHARACTER MATCH'
      : 'YOUR '+worldName(c.world).toUpperCase()+' MATCH';
    el('oracle-result-universe').textContent=worldName(c.world)+' · '+(v.year||'AMV');
    el('oracle-result-title').textContent=v.title;
    el('oracle-result-image').src='https://i.ytimg.com/vi/'+v.id+'/hqdefault.jpg';
    el('oracle-result-image').alt='Thumbnail for '+v.title;
    el('oracle-result-note').textContent=state.worldFallback
      ? '〰 No indexed AMV title names '+c.name+' yet. This is a Wuthering Waves world-level pick from the library, not a confirmed '+c.name+' AMV.'
      : '✧ Matched from your character’s name in the AMV title. '
        +(c.videos.length>1?c.videos.length+' named edits available.':'One named edit found.');
    const target=new URL(window.location.href);
    target.searchParams.set('world',c.world);
    target.searchParams.set('character',c.name);
    target.searchParams.set('video',v.id);
    try{history.replaceState(null,'',target.pathname+target.search+target.hash);}catch(e){/* optional URL sharing */}
    const result=el('oracle-result');
    if(result)result.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'nearest'});
  }

  function openVideo() {
    const v=state.current;
    if(!v||!idOK.test(v.id))return;
    const dialog=el('oracle-video-modal'),frame=el('oracle-video-frame');
    el('oracle-modal-title').textContent=v.title;
    el('oracle-modal-youtube').href='https://www.youtube.com/watch?v='+v.id;
    const iframe=document.createElement('iframe');
    iframe.src='https://www.youtube-nocookie.com/embed/'+v.id+'?autoplay=1&rel=0';
    iframe.title=v.title;
    iframe.allow='accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.referrerPolicy='strict-origin-when-cross-origin';
    iframe.allowFullscreen=true;
    frame.replaceChildren(iframe);
    if(dialog?.showModal)dialog.showModal();
    else window.open('https://www.youtube.com/watch?v='+v.id,'_blank','noopener');
  }

  async function copyMatch() {
    const button=el('oracle-share');
    if(!state.current)return;
    try{
      await navigator.clipboard.writeText(window.location.href);
      button.textContent='✓ LINK COPIED';
      setTimeout(()=>button.textContent='↗ COPY YOUR MATCH LINK',2000);
    }catch(e){
      button.textContent='COPY FROM ADDRESS BAR';
      setTimeout(()=>button.textContent='↗ COPY YOUR MATCH LINK',2000);
    }
  }

  function bind() {
    document.querySelectorAll('[data-world]').forEach(b=>b.addEventListener('click',()=>{
      setWorld(b.dataset.world);
    }));
    el('oracle-search').addEventListener('input',e=>{state.query=e.target.value;updateList();});
    el('oracle-reveal').addEventListener('click',()=>reveal());
    el('oracle-reroll').addEventListener('click',()=>reveal());
    el('oracle-random').addEventListener('click',()=>{
      const pool=state.available.filter(c=>state.world==='all'||c.world===state.world);
      if(!pool.length)return;
      const char=pool[randomIndex(pool.length)];
      setCharacter(char);
      reveal();
    });
    el('oracle-watch').addEventListener('click',openVideo);
    el('oracle-share').addEventListener('click',copyMatch);
    el('oracle-restart').addEventListener('click',()=>{
      state.selected=null;
      state.query='';
      el('oracle-search').value='';
      updateList();updateSelection();
      el('oracle-result').hidden=true;
      el('oracle-unrevealed').hidden=false;
      el('oracle-search').focus();
    });
    const modal=el('oracle-video-modal');
    const close=()=>{if(modal?.open)modal.close();};
    modal?.querySelector('.modal-close')?.addEventListener('click',close);
    modal?.addEventListener('close',()=>el('oracle-video-frame').replaceChildren());
    modal?.addEventListener('click',event=>{if(event.target===modal)close();});
    const toggle=document.querySelector('.mobile-toggle'),mobile=el('mobile-nav');
    if(toggle&&mobile){
      const closeNav=()=>{mobile.hidden=true;toggle.setAttribute('aria-expanded','false');};
      toggle.addEventListener('click',()=>{
        mobile.hidden=!mobile.hidden;
        toggle.setAttribute('aria-expanded',String(!mobile.hidden));
      });
      mobile.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeNav));
      addEventListener('resize',()=>{if(innerWidth>1240)closeNav();});
    }
    document.querySelectorAll('.current-year').forEach(n=>n.textContent=new Date().getFullYear());
  }

  async function load() {
    try {
      const response=await fetch('videos.json',{cache:'no-store'});
      if(!response.ok)throw Error('AMV library not available');
      const data=await response.json();
      if(!Array.isArray(data.videos))throw Error('Bad library format');
      const lists=(Array.isArray(data.playlists)?data.playlists:[]).filter(isWuwaPlaylist);
      state.wuwaPlaylistIds = new Set(lists.flatMap(p=>Array.isArray(p.videoIds)?p.videoIds:[]));
      const used=new Set();
      state.videos=data.videos.filter(v=>
        (goodVideo(v) || (state.wuwaPlaylistIds.has(v?.id) && idOK.test(v.id) && !!v.title))
        && !used.has(v.id) && used.add(v.id));
    }catch(e){
      state.videos=Array.isArray(fallback)?fallback.filter(goodVideo):[];
    }finally{
      state.loading=false;
      updateAvailable();
      const params=new URLSearchParams(window.location.search);
      const w=params.get('world');
      if(w==='genshin'||w==='hsr'||w==='wuwa'||w==='emblem')setWorld(w);
      const wanted=normalize(params.get('character'));
      if(wanted){
        const c=state.available.find(item=>normalize(item.name)===wanted
          && (state.world==='all'||item.world===state.world));
        if(c){
          setCharacter(c);
          const id=params.get('video');
          if(id && idOK.test(id) && (
            c.videos.some(x=>x.video.id===id) ||
            (c.world==='wuwa' && state.worldVideos.some(v=>v.id===id))
          ))reveal(id);
        }
      }
    }
  }

  bind();
  updateList();
  load();
})();
