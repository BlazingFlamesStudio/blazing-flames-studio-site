/* Blazing Flames Studio — Moonlit Mood Match.
 * Entertainment-only preferences, not mental-health assessment.
 * Uses curated title keywords as DISCOVERY CUES, not soundtrack/audio analysis.
 * Browser and Node compatible so matching stays independently testable.
 */
(function (root, factory) {
  'use strict';
  const engine=factory();
  if (typeof module==='object' && module.exports) module.exports=engine;
  if(root)root.BFSMoodEngine=engine;
})(typeof window!=='undefined' ? window : null, function(){
  'use strict';
  const MOODS={
    ignite:{name:'The Firestarter',tagline:'You came here for the rush.',accent:'#ff956f',glow:'#9f3962',
      meaning:'Your choices call for movement, bold moments, and cinematic momentum.'},
    heart:{name:'The Heartstring',tagline:'Let the melody mean something.',accent:'#ffabc6',glow:'#7e4d99',
      meaning:'You seem drawn to connection, tenderness, and big feelings.'},
    ache:{name:'The Afterglow',tagline:'Sometimes the beautiful part is bittersweet.',accent:'#a2b7ff',glow:'#5456ab',
      meaning:'Your answers favor reflection, emotional stories, and quiet intensity.'},
    bloom:{name:'The Dawnbringer',tagline:'You are reaching for a little light.',accent:'#f7d69d',glow:'#a66d81',
      meaning:'Your choices lean toward possibility, warmth, and hopeful turning points.'},
    dream:{name:'The Moonwanderer',tagline:'Follow the sound beyond the stars.',accent:'#baa8ff',glow:'#5766a9',
      meaning:'You are drawn to atmosphere, mystery, and otherworldly imagery.'},
    wild:{name:'The Wildcard',tagline:'Make it surprising. Make it unforgettable.',accent:'#87e8ed',glow:'#756ad7',
      meaning:'Your answers favor playful rhythm, unexpected turns, and untamed energy.'}
  };
  const MOOD_IDS=Object.keys(MOODS);
  // Option weights are entertainment preferences, never sensitive traits.
  const opt=(label,a,b)=>({label,moods:[a,b]});
  const QUESTION_BANK=[
    {id:'moment-spark',category:'moment',prompt:'You press play right now. What should the first moment feel like?',options:[
      opt('The room suddenly comes alive','ignite','wild'),opt('A breath of fresh air','bloom','dream'),
      opt('Someone finally saying what matters','heart','ache'),opt('A doorway to somewhere unreal','dream','wild')]},
    {id:'moment-window',category:'moment',prompt:'You look out the window. Which scene would you turn into an AMV?',options:[
      opt('A city racing past in neon','wild','ignite'),opt('Two people under one umbrella','heart','ache'),
      opt('Sunlight breaking through clouds','bloom','ignite'),opt('A moon above a silent ocean','dream','ache')]},
    {id:'moment-opening',category:'moment',prompt:'Four AMVs are about to premiere. Which opening pulls you in?',options:[
      opt('A dramatic clash at full speed','ignite','wild'),opt('One unforgettable reunion','heart','bloom'),
      opt('A goodbye that says everything','ache','heart'),opt('A star map forming in the dark','dream','bloom')]},
    {id:'moment-gesture',category:'moment',prompt:'Someone hands you control of the opening shot. What happens?',options:[
      opt('A hero launches into motion','ignite','bloom'),opt('A friend reaches out their hand','heart','bloom'),
      opt('An empty train leaves the platform','ache','dream'),opt('The world flips upside down','wild','dream')]},

    {id:'sound-instrument',category:'sound',prompt:'An instrumental begins. Which sound makes you stay?',options:[
      opt('Thunderous percussion and a huge drop','ignite','wild'),opt('A soft piano melody','ache','heart'),
      opt('Warm acoustic strings','heart','bloom'),opt('Shimmering synthesizers and echoes','dream','wild')]},
    {id:'sound-beat',category:'sound',prompt:'You can add one detail to an AMV soundtrack. What do you pick?',options:[
      opt('A beat that hits like a final boss','ignite','wild'),opt('A voice that feels close and honest','heart','ache'),
      opt('A soaring chorus everyone can sing','bloom','heart'),opt('A strange rhythm you cannot predict','wild','dream')]},
    {id:'sound-headphones',category:'sound',prompt:'Your headphones reveal one hidden layer in a song. Which one?',options:[
      opt('A racing bassline under the melody','wild','ignite'),opt('A distant, haunting harmony','dream','ache'),
      opt('A fragile line of strings','ache','heart'),opt('A triumphant swell behind the chorus','bloom','ignite')]},
    {id:'sound-mix',category:'sound',prompt:'You get to remix one moment. What feels right?',options:[
      opt('Build the tension, then explode','ignite','ache'),opt('Strip everything back to one heartbeat','heart','ache'),
      opt('Bring in a bright new melody','bloom','dream'),opt('Turn the rhythm into a dance battle','wild','ignite')]},

    {id:'scene-portal',category:'scene',prompt:'A portal opens mid-song. Where would you step through?',options:[
      opt('A roaring arena with lights in the sky','ignite','wild'),opt('A garden glowing at sunrise','bloom','heart'),
      opt('An abandoned station in the rain','ache','dream'),opt('A floating city above the stars','dream','wild')]},
    {id:'scene-weather',category:'scene',prompt:'Your perfect AMV has one kind of weather. Which fits?',options:[
      opt('Lightning over a battlefield','ignite','dream'),opt('Soft rain against a window','ache','heart'),
      opt('Warm sunshine after a storm','bloom','heart'),opt('Colorful city lights after dark','wild','dream')]},
    {id:'scene-palette',category:'scene',prompt:'Which scene makes you want to watch the story unfold?',options:[
      opt('A burning horizon and silhouettes','ignite','ache'),opt('A candlelit room with two chairs','heart','dream'),
      opt('A field of flowers after winter','bloom','heart'),opt('An impossible staircase among constellations','dream','wild')]},
    {id:'scene-movement',category:'scene',prompt:'The camera starts moving. What should it follow?',options:[
      opt('A sword cutting through sparks','ignite','wild'),opt('Hands almost touching','heart','ache'),
      opt('A lone figure walking into fog','ache','dream'),opt('Confetti drifting through a festival','wild','bloom')]},

    {id:'story-crossroads',category:'story',prompt:'The main character reaches a crossroads. Which scene matters most?',options:[
      opt('They stand and fight for what matters','ignite','bloom'),opt('They finally confess how they feel','heart','ache'),
      opt('They make peace with an ending','ache','bloom'),opt('They follow a mysterious new trail','dream','wild')]},
    {id:'story-finale',category:'story',prompt:'You can choose the final frame of an edit. Which would stay with you?',options:[
      opt('An impossible victory','ignite','bloom'),opt('A long-awaited embrace','heart','bloom'),
      opt('An unsent letter on a table','ache','heart'),opt('A doorway opening on a new galaxy','dream','wild')]},
    {id:'story-twist',category:'story',prompt:'Halfway through, the AMV changes direction. What is the twist?',options:[
      opt('The underdog turns everything around','ignite','bloom'),opt('A forgotten promise is remembered','heart','ache'),
      opt('A beautiful truth changes the story','ache','dream'),opt('Everyone suddenly breaks into a dance','wild','bloom')]},
    {id:'story-moment',category:'story',prompt:'Which small cinematic moment deserves a whole song?',options:[
      opt('The first strike in a legendary duel','ignite','wild'),opt('Two old friends finding each other','heart','bloom'),
      opt('A character choosing to let go','ache','heart'),opt('A secret world revealing itself','dream','bloom')]},

    {id:'rhythm-cut',category:'rhythm',prompt:'Which editing rhythm would keep your eyes on the screen?',options:[
      opt('Fast cuts on every powerful beat','ignite','wild'),opt('Slow dissolves with room to feel','ache','dream'),
      opt('A gentle rise into a soaring chorus','bloom','heart'),opt('Unpredictable cuts with playful timing','wild','ignite')]},
    {id:'rhythm-speed',category:'rhythm',prompt:'Your AMV starts slowly. How should it build?',options:[
      opt('Into a dramatic showdown','ignite','wild'),opt('Into a heartfelt confession','heart','ache'),
      opt('Into a quiet but hopeful sunrise','bloom','dream'),opt('Into a surreal, spinning dream','dream','wild')]},
    {id:'rhythm-choice',category:'rhythm',prompt:'You have one editing trick to use on the chorus. Which?',options:[
      opt('Impact flashes synchronized to a drop','ignite','wild'),opt('An emotional match cut between faces','heart','ache'),
      opt('A bright, sweeping reveal of the world','bloom','dream'),opt('A dizzying kaleidoscope transition','wild','dream')]},
    {id:'rhythm-loop',category:'rhythm',prompt:'An AMV loops its most memorable moment. What repeats?',options:[
      opt('A thrilling comeback','ignite','bloom'),opt('A smile after a long separation','heart','bloom'),
      opt('A memory that will not fade','ache','dream'),opt('One ridiculously catchy move','wild','ignite')]},

    {id:'end-feeling',category:'afterglow',prompt:'When the final frame fades, what feeling should linger?',options:[
      opt('I could take on anything','ignite','bloom'),opt('That meant something to me','heart','ache'),
      opt('That was beautifully bittersweet','ache','dream'),opt('I want to watch that again immediately','wild','ignite')]},
    {id:'end-night',category:'afterglow',prompt:'The credits roll. What do you wish the AMV gave you?',options:[
      opt('A spark to get moving','ignite','bloom'),opt('A little warmth to carry forward','heart','bloom'),
      opt('A moment worth sitting with','ache','dream'),opt('A new mystery to think about','dream','wild')]},
    {id:'end-replay',category:'afterglow',prompt:'Which kind of AMV would you replay before bed?',options:[
      opt('A legendary last stand','ignite','ache'),opt('A tender story of two people','heart','bloom'),
      opt('A quiet, unforgettable memory','ache','dream'),opt('A mesmerizing cosmic journey','dream','wild')]},
    {id:'end-tomorrow',category:'afterglow',prompt:'One feeling follows you into tomorrow. Which would you welcome?',options:[
      opt('The courage to begin something big','ignite','bloom'),opt('A reminder of people who matter','heart','ache'),
      opt('A sense of wonder and possibility','dream','bloom'),opt('A playful spark of the unexpected','wild','ignite')]}
  ];
  const CATEGORY_ORDER=['moment','sound','scene','story','rhythm','afterglow'];
  const normalize=text=>String(text||'').normalize('NFKD').toLowerCase()
    .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  const shuffle=(items,rng=Math.random)=>{
    const copy=items.slice();
    for(let i=copy.length-1;i>0;i--){
      const j=Math.min(i,Math.floor(Math.max(0,Math.min(.999999999,rng()))*(i+1)));
      [copy[i],copy[j]]=[copy[j],copy[i]];
    }
    return copy;
  };
  function prepareQuiz(previousIds=[],rng=Math.random) {
    const previous=new Set(previousIds);
    const selected=[];
    for(const category of CATEGORY_ORDER){
      const choices=shuffle(QUESTION_BANK.filter(q=>q.category===category),rng);
      const question=choices.find(q=>!previous.has(q.id)) || choices[0];
      selected.push({...question,options:shuffle(question.options,rng)});
    }
    return [selected[0],...shuffle(selected.slice(1,-1),rng),selected[selected.length-1]];
  }
  function rankMoods(answers) {
    const totals=Object.fromEntries(MOOD_IDS.map(id=>[id,0]));
    for(const option of answers) {
      if(!option?.moods)continue;
      const [primary,secondary]=option.moods;
      if(primary in totals)totals[primary]+=3;
      if(secondary in totals)totals[secondary]+=1;
    }
    return MOOD_IDS.map(id=>({id,score:totals[id]})).sort((a,b)=>
      b.score-a.score || MOOD_IDS.indexOf(a.id)-MOOD_IDS.indexOf(b.id));
  }
  const KEYWORDS={
    ignite:['warrior','soldier','fight','battle','royalty','fire','burning','lightning','thunder',
      'takedown','resistance','unstoppable','legend','enemy','dangerous','monster','monsters',
      'stronger','power','hero','heroes','villain','rage','champion','rebellion','king',
      'kings','queen','queens','blood','sword','war','believer','survivor','rise','die for',
      'warriors','dare','darkside','doom','natural','centuries','immortal','immortals',
      'fight song','call to arms','the greatest show','strike','final battle'],
    heart:['love','heart','hearts','stay','thousand years','talking body','perfect',
      'soul sister','someone to you','somebody to you','only you','you and me','romantic',
      'kisses','photograph','into your arms','call me maybe','payphone','together',
      'closer','darling','soulmate','forever','beauty and the beast','lovely','falling for',
      'adorable','wedding','where are you now','my love','i wanna be yours','no era amor'],
    ache:['alone','memories','memory','goodbye','broken','before you go','lost',
      'bleeding','tears','hurt','heaven','sad','dark','after dark','ghost','miss you',
      'the one that got','gone','last time','last of','far away','all time low',
      'when i m gone','disease','the line','ordinary','no way home','silence',
      'disappear','too late','someone you loved','end of beginning','empty','regret',
      'what was i made for','the night we met','sadness','fading','cry','fall apart'],
    bloom:['golden','sun','sunrise','sunshine','hope','new day','brighter','alive',
      'free','freedom','beginning','a new','magic','better','wonderful','beautiful',
      'home','victory','daylight','wings','light','happier','believe','believer',
      'dream big','rise up','dreams come true','miracle','champions','somewhere only we know',
      'life','summer','smile','healing','starlight','warriors','royalty'],
    dream:['moon','night','mystical','dream','dreams','galaxy','space','starry','stars',
      'starly','cosmic','magic','fate','destiny','shadow','eclipse','aura','memory reboot',
      'dreaming','wonder','mystery','mysteries','darkness','enchanted','astral',
      'celestial','ghost','fantasy','stars align','interlinked','paradise','atlas',
      'ocean','atlantic','my atlantis','daydream','perception check','reverie'],
    wild:['funk','montagem','jumpstyle','malemo','no promenada','tiki tiki','taki rumba',
      'matadora','peligrosa','trakel','espresso','dance','dancing','dynamite',
      'circus','party','crazy','fun','sugar','electric','remix','chaos','raya','rhythm',
      'rhythmic','batida','rumba','stereo hearts','24k magic','get jinxed','perigosa',
      'diabolica','takedown','lose control','bad romance','your idol','upside down',
      'speed up','sped up','faster n harder','no radar','sparxie','pop','vibe']
  };
  const MANUAL_MOODS=['ignite','heart','ache','bloom','dream','wild'];
  function titleSignals(title,manualTags) {
    const source=normalize(String(title||'').split(/\s*\|\|?\s*/)[0]);
    const totals=Object.fromEntries(MOOD_IDS.map(id=>[id,0]));
    const evidence=[];
    for(const mood of MOOD_IDS){
      const words=KEYWORDS[mood];
      for(const raw of words){
        const phrase=normalize(raw);
        if(!phrase)continue;
        if((' '+source+' ').includes(' '+phrase+' ')){
          totals[mood]+=phrase.includes(' ')?3:2;
          evidence.push({mood,phrase});
        }
      }
    }
    if(Array.isArray(manualTags)){
      for(const tag of manualTags){
        if(MANUAL_MOODS.includes(tag)){
          totals[tag]+=10;
          evidence.push({mood:tag,phrase:'editorial tag'});
        }
      }
    }
    return {scores:totals,evidence};
  }
  function songKey(title){
    const first=String(title||'').split(/\s*\|\|?\s*/)[0]
      .replace(/\s*[-–—]\s*(?:a |an |the )?.*(?:amv|gmv).*/i,'');
    return normalize(first).slice(0,65);
  }
  function recommend(videos,settings={},rng=Math.random) {
    const mood=MOOD_IDS.includes(settings.mood)?settings.mood:'dream';
    const secondary=MOOD_IDS.includes(settings.secondary)?settings.secondary:null;
    const world=settings.world||'all';
    const history=Array.isArray(settings.history)?settings.history:[];
    const tagged=settings.tags&&typeof settings.tags==='object'?settings.tags:{};
    const pool=(Array.isArray(videos)?videos:[]).filter(v=>v&&v.id&&v.title&&
      (world==='all'||(v.oracleWorlds||[]).includes(world)));
    if(!pool.length)return null;
    const usedIds=new Set(history.map(x=>typeof x==='string'?x:x?.id).filter(Boolean));
    const usedSongs=new Set(history.map(x=>typeof x==='string'?'':x?.song).filter(Boolean));
    const fresh=pool.filter(v=>!usedIds.has(v.id));
    const eligible=fresh.length?fresh:pool;
    const sameSongFree=eligible.filter(v=>!usedSongs.has(songKey(v.title)));
    const candidates=sameSongFree.length>=5?sameSongFree:eligible;
    const ranking=candidates.map(v=>{
      const signals=titleSignals(v.title,tagged[v.id]);
      const evidence=signals.evidence.filter(x=>x.mood===mood);
      const primary=signals.scores[mood]||0;
      const support=signals.scores[secondary]||0;
      const bonus=Math.min(2,Math.max(0,(Number(v.year)||0)-2024))*0.25;
      return {video:v,score:primary*6+support*1.5+(primary?3:0)+bonus,
        evidence,hasClue:primary>0,primary,secondary:support};
    }).sort((a,b)=>b.score-a.score);
    const peak=ranking[0]?.score||0;
    // Vary the outcome within a relevant band; do not always select one song.
    const shortlist=ranking.filter(x=>x.score>=peak-12).slice(0,48);
    const weighted=shortlist.map(x=>Math.max(1,4+x.score-(peak-12)));
    const total=weighted.reduce((sum,x)=>sum+x,0);
    let number=Math.max(0,Math.min(.999999999,rng()))*total;
    let selected=shortlist[shortlist.length-1];
    for(let i=0;i<shortlist.length;i++){
      number-=weighted[i];
      if(number<0){selected=shortlist[i];break;}
    }
    return {...selected,world,mode:selected.hasClue?'title-cue':'discovery',
      song:songKey(selected.video.title),mood,secondary};
  }
  return {MOODS,MOOD_IDS,QUESTION_BANK,CATEGORY_ORDER,prepareQuiz,rankMoods,
    titleSignals,recommend,songKey,normalize};
});
