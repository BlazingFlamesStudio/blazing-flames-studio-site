/* Moonlit Mood Match — responsive, accessible six-question AMV discovery.
 * Uses catalog and title-cue heuristics. Quiz answers are never transmitted.
 */
(() => {
  'use strict';
  const engine=window.BFSMoodEngine;
  const catalogRules=window.BFSOracleCatalog;
  const $=id=>document.getElementById(id);
  if(!engine||!catalogRules||!$('mood-game'))return;

  const YEARS=0; // Reserved for future metadata weighting; no extra network calls.
  const RECENT_KEY='bfs-mood-recent-v1';
  const QUESTIONS_KEY='bfs-mood-question-set-v1';
  const WORLD_NAMES={all:'Any universe',genshin:'Genshin Impact',hsr:'Honkai: Star Rail',
    wuwa:'Wuthering Waves',emblem:'Fire Emblem',endfield:'Arknights: Endfield',
    zzz:'Zenless Zone Zero',other:'Other Worlds'};
  const state={
    catalog:[],loaded:false,loading:null,questions:[],answers:[],step:0,
    world:'all',mood:null,secondary:null,selection:null,result:null,shared:false
  };

  function readStorage(type,key,defaultValue) {
    try {
      const raw=type.getItem(key);
      const value=JSON.parse(raw||'null');
      return value===null?defaultValue:value;
    } catch {return defaultValue;}
  }
  function writeStorage(type,key,value) {
    try{type.setItem(key,JSON.stringify(value));}catch{/* Private browsers can disable storage. */}
  }
  function recentHistory() {
    const list=readStorage(localStorage,RECENT_KEY,[]);
    return Array.isArray(list)?list.filter(x=>x&&typeof x.id==='string').slice(-20):[];
  }
  function remember(result) {
    const old=recentHistory().filter(x=>x.id!==result.video.id);
    old.push({id:result.video.id,song:result.song});
    writeStorage(localStorage,RECENT_KEY,old.slice(-20));
  }
  function setText(id,text) {const node=$(id);if(node)node.textContent=String(text);}
  function makeEl(tag,className,text) {
    const element=document.createElement(tag);
    if(className)element.className=className;
    if(text!==undefined)element.textContent=String(text);
    return element;
  }
  function showView(view) {
    for(const mode of ['welcome','quiz','result']){
      const node=$('mood-'+mode);
      node.hidden=mode!==view;
    }
  }
  function applyAura(mood) {
    const profile=engine.MOODS[mood]||engine.MOODS.dream;
    const block=$('mood-game');
    block.style.setProperty('--mood-accent',profile.accent);
    block.style.setProperty('--mood-glow',profile.glow);
  }
  function resetShareParams(){
    try {
      const url=new URL(location.href);
      for(const key of ['mood','moodVideo','moodWorld','moodSecond'])
        url.searchParams.delete(key);
      history.replaceState(null,'',url.pathname+url.search+'#mood-game');
    } catch {}
  }
  function shareURL(){
    const url=new URL(location.href);
    for(const key of ['character','video','world','mode'])
      url.searchParams.delete(key);
    url.searchParams.set('mood',state.mood);
    url.searchParams.set('moodVideo',state.result.video.id);
    if(state.secondary)url.searchParams.set('moodSecond',state.secondary);
    else url.searchParams.delete('moodSecond');
    if(state.world!=='all')url.searchParams.set('moodWorld',state.world);
    else url.searchParams.delete('moodWorld');
    url.hash='mood-game';
    return url;
  }

  async function loadCatalog() {
    if(state.loaded)return state.catalog;
    if(state.loading)return state.loading;
    state.loading=(async()=>{
      let videos=[],playlists=[];
      try {
        const response=await fetch('./videos.json',{cache:'no-store'});
        if(!response.ok)throw new Error('AMV catalog unavailable');
        const json=await response.json();
        if(!Array.isArray(json.videos))throw new Error('Invalid AMV catalog');
        videos=json.videos;
        playlists=Array.isArray(json.playlists)?json.playlists:[];
      }catch(error) {
        videos=Array.isArray(window.AMV_VIDEOS)?window.AMV_VIDEOS:[];
        setText('mood-library-status',videos.length
          ? 'Offline starter catalog. Reconnect for the complete library.'
          : 'Could not load the library. Reconnect and try again.');
        console.warn('Moonlit Mood Match: using available offline data.',error);
      }
      const wuwa=new Set(playlists.filter(p=>p.category==='wuwa' ||
        /\b(?:wuthering[\s-]*waves|wuwa)\b/i.test(String(p.title||'')))
        .flatMap(p=>Array.isArray(p.videoIds)?p.videoIds:[]));
      state.catalog=catalogRules.buildIndex(videos,window.BFSOracleCharacterGroups||{},wuwa);
      state.loaded=true;
      state.loading=null;
      if(state.catalog.length) {
        setText('mood-library-status',
          state.catalog.length.toLocaleString()+' AMVs in the synced discovery collection.');
      }
      return state.catalog;
    })();
    return state.loading;
  }
  function choiceForStep() {return state.answers[state.step]||null;}
  function updatePreview(){
    const completed=state.answers.filter(Boolean);
    const ranking=engine.rankMoods(completed);
    applyAura(completed.length?ranking[0].id:'dream');
    const value=(state.step+(choiceForStep()?1:0))/state.questions.length*100;
    $('mood-progress-fill').style.width=value+'%';
    $('mood-progressbar').setAttribute('aria-valuenow',String(Math.round(value)));
  }
  function renderQuestion({focus=false}={}) {
    if(!state.questions.length)return;
    showView('quiz');
    const question=state.questions[state.step];
    setText('mood-question-position','QUESTION '+String(state.step+1).padStart(2,'0')+' / '+state.questions.length);
    setText('mood-question-title',question.prompt);
    setText('mood-quiz-world',WORLD_NAMES[state.world]||WORLD_NAMES.all);
    const options=$('mood-answer-list');
    options.replaceChildren();
    question.options.forEach((answer,index)=>{
      const button=makeEl('button','mood-answer');
      button.type='button';
      button.setAttribute('aria-pressed',String(state.answers[state.step]===answer));
      button.setAttribute('aria-label','Answer '+(index+1)+': '+answer.label);
      const count=makeEl('span','mood-answer-number',String(index+1).padStart(2,'0'));
      const label=makeEl('span','mood-answer-label',answer.label);
      const star=makeEl('span','mood-answer-star','✦');
      star.setAttribute('aria-hidden','true');
      button.append(count,label,star);
      button.addEventListener('click',()=>{
        state.answers[state.step]=answer;
        for(const sibling of options.querySelectorAll('button')){
          sibling.setAttribute('aria-pressed',String(sibling===button));
        }
        $('mood-next').disabled=false;
        updatePreview();
      });
      options.append(button);
    });
    $('mood-back').disabled=state.step===0;
    const next=$('mood-next');
    next.disabled=!choiceForStep();
    next.textContent=state.step===state.questions.length-1?'REVEAL MY AMV ✦':'CONTINUE →';
    updatePreview();
    if(focus)$('mood-question-title').focus({preventScroll:true});
  }
  async function startQuiz(){
    const start=$('mood-begin'),retake=$('mood-retake');
    start.disabled=true;
    retake.disabled=true;
    setText('mood-library-status','Connecting to the AMV universe…');
    try {
      const catalog=await loadCatalog();
      if(!catalog.length) {
        setText('mood-library-status','There are no available AMVs in this connection. Try again online.');
        showView('welcome');
        return;
      }
      const prior=readStorage(sessionStorage,QUESTIONS_KEY,[]);
      state.questions=engine.prepareQuiz(Array.isArray(prior)?prior:[]);
      writeStorage(sessionStorage,QUESTIONS_KEY,state.questions.map(q=>q.id));
      state.answers=new Array(state.questions.length).fill(null);
      state.step=0;
      state.world=$('mood-world').value||'all';
      state.mood=null;state.secondary=null;state.selection=null;state.result=null;state.shared=false;
      resetShareParams();
      renderQuestion({focus:true});
    }finally{
      start.disabled=false;
      retake.disabled=false;
    }
  }
  function finishQuiz(){
    const ranking=engine.rankMoods(state.answers);
    state.mood=ranking[0].id;
    state.secondary=ranking.find(x=>x.id!==state.mood&&x.score>0)?.id||null;
    state.shared=false;
    drawResult();
  }
  function drawResult(){
    const selection=engine.recommend(state.catalog,{
      mood:state.mood,secondary:state.secondary,world:state.world,
      history:recentHistory()
    });
    if(!selection){
      showView('welcome');
      setText('mood-library-status','No AMVs match this universe yet. Try Any Universe.');
      return;
    }
    state.selection=selection;
    state.result=selection;
    remember(selection);
    renderResult();
  }
  function renderResult(){
    const result=state.result;
    if(!result)return;
    const video=result.video;
    const mood=engine.MOODS[state.mood];
    const secondary=engine.MOODS[state.secondary];
    applyAura(state.mood);
    showView('result');
    setText('mood-result-title',mood.name);
    setText('mood-result-tagline',mood.tagline);
    setText('mood-result-desc',state.shared
      ? 'A shared pick from Blazing Flames Studio’s mood-powered AMV discovery game.'
      : mood.meaning);
    setText('mood-result-submood',secondary?'With a touch of '+secondary.name.toLowerCase()+'.':'One mood, a whole universe of edits.');
    setText('mood-picked-title',video.title);
    const worldName=result.world==='all'
      ? ((video.oracleWorlds||[]).map(w=>WORLD_NAMES[w]).filter(Boolean).join(' + ')||'The multiverse')
      : WORLD_NAMES[result.world]||'The multiverse';
    setText('mood-picked-world',worldName+' · '+(video.year||'AMV'));
    const clue=result.evidence?.filter(x=>x.mood===state.mood).map(x=>x.phrase)||[];
    const humanClue=clue.filter(x=>x!=='editorial tag').slice(0,2);
    setText('mood-match-explain',humanClue.length
      ? 'Title clues: '+humanClue.join(' + ')+'. The mood is a playful suggestion, not soundtrack analysis.'
      : result.mode==='title-cue'
        ? 'Chosen using a curated mood tag. Actual music taste is personal.'
        : 'A surprise discovery from this universe. No reliable mood cue was found in the title.');
    $('mood-picked-image').src='https://i.ytimg.com/vi/'+video.id+'/hqdefault.jpg';
    $('mood-picked-image').alt='Thumbnail for '+video.title;
    $('mood-youtube-link').href='https://www.youtube.com/watch?v='+video.id;
    setText('mood-result-counter',state.catalog.length.toLocaleString()+' eligible AMVs · '+(state.shared?'shared result':'your moment, your soundtrack'));
    try {
      const link=shareURL();
      history.replaceState(null,'',link.pathname+link.search+link.hash);
    }catch{}
    // The result is always reachable by scrolling, including on mobile.
    $('mood-result').scrollIntoView({
      behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',
      block:'nearest'
    });
  }
  function openVideo(){
    if(!state.result?.video)return;
    const id=state.result.video.id;
    if(!/^[A-Za-z0-9_-]{11}$/.test(id))return;
    const modal=$('mood-video-modal');
    if(!modal||typeof modal.showModal!=='function'){
      window.open('https://www.youtube.com/watch?v='+id,'_blank','noopener,noreferrer');
      return;
    }
    setText('mood-modal-title',state.result.video.title);
    $('mood-modal-youtube').href='https://www.youtube.com/watch?v='+id;
    const player=document.createElement('iframe');
    player.title=state.result.video.title+' — YouTube player';
    player.src='https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1&rel=0';
    player.allow='accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share';
    player.referrerPolicy='strict-origin-when-cross-origin';
    player.allowFullscreen=true;
    $('mood-modal-frame').replaceChildren(player);
    modal.showModal();
  }
  function closeVideo(){
    const modal=$('mood-video-modal');
    if(modal.open)modal.close();
    $('mood-modal-frame').replaceChildren();
  }
  async function copyResult(){
    if(!state.result)return;
    const url=shareURL().href;
    try {
      if(!navigator.clipboard?.writeText)throw Error('Clipboard not available');
      await navigator.clipboard.writeText(url);
      setText('mood-share','✓ LINK COPIED');
    }catch{
      setText('mood-share','COPY THE URL ABOVE');
    }
    setTimeout(()=>setText('mood-share','↗ SHARE THIS MOOD MATCH'),2400);
  }
  async function restoreShare(){
    const query=new URLSearchParams(location.search);
    const mood=query.get('mood'),id=query.get('moodVideo');
    if(!engine.MOODS[mood] || !/^[A-Za-z0-9_-]{11}$/.test(id||''))return;
    const pool=await loadCatalog();
    const video=pool.find(x=>x.id===id);
    if(!video)return;
    const requestedWorld=query.get('moodWorld')||'all';
    const world=Object.prototype.hasOwnProperty.call(WORLD_NAMES,requestedWorld)?requestedWorld:'all';
    const chosen=world!=='all' && !(video.oracleWorlds||[]).includes(world)?'all':world;
    state.world=chosen;
    state.mood=mood;
    state.secondary=engine.MOODS[query.get('moodSecond')]?query.get('moodSecond'):null;
    state.shared=true;
    state.result={
      video,world:chosen,mood,secondary:state.secondary,mode:'discovery',
      evidence:engine.titleSignals(video.title).evidence,
      song:engine.songKey(video.title)
    };
    renderResult();
  }
  function bind() {
    $('mood-begin').addEventListener('click',startQuiz);
    $('mood-retake').addEventListener('click',startQuiz);
    $('mood-back').addEventListener('click',()=>{
      if(state.step>0){state.step--;renderQuestion({focus:true});}
    });
    $('mood-next').addEventListener('click',()=>{
      if(!state.answers[state.step])return;
      if(state.step===state.questions.length-1)finishQuiz();
      else{state.step++;renderQuestion({focus:true});}
    });
    $('mood-try-another').addEventListener('click',()=>{
      state.shared=false;
      drawResult();
    });
    $('mood-change-world').addEventListener('click',()=>{
      resetShareParams();
      showView('welcome');
      $('mood-world').focus();
    });
    $('mood-watch').addEventListener('click',openVideo);
    $('mood-share').addEventListener('click',copyResult);
    const dialog=$('mood-video-modal');
    $('mood-modal-close').addEventListener('click',closeVideo);
    dialog.addEventListener('click',event=>{if(event.target===dialog)closeVideo();});
    dialog.addEventListener('close',()=>{ $('mood-modal-frame').replaceChildren(); });
  }
  bind();
  applyAura('dream');
  const query=new URLSearchParams(location.search);
  if(query.has('mood') && query.has('moodVideo')) {
    restoreShare().catch(error=>console.warn('Shared mood result unavailable:',error));
  }
})();
