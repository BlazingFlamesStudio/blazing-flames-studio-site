const test=require('node:test');
const assert=require('node:assert/strict');
const mood=require('../mood-game-core.js');
const oracle=require('../oracle-catalog.js');
const catalog=require('../videos.json');

const IDs=Object.keys(mood.MOODS);
const synthetic=(id,title,world='hsr')=>({
  id,title,game:world==='genshin'?'Genshin Impact':'Honkai: Star Rail',
  category:world,year:'2026',channelOwned:true,oracleWorlds:[world]
});
function seeded(seed){
  let x=seed>>>0;
  return ()=>{
    x+=0x6D2B79F5;let t=x;
    t=Math.imul(t^(t>>>15),t|1);
    t^=t+Math.imul(t^(t>>>7),t|61);
    return ((t^(t>>>14))>>>0)/4294967296;
  };
}
test('24 non-diagnostic questions arranged in six varied sets',()=>{
  assert.equal(mood.QUESTION_BANK.length,24);
  assert.equal(new Set(mood.QUESTION_BANK.map(q=>q.id)).size,24);
  for(const category of mood.CATEGORY_ORDER)
    assert.equal(mood.QUESTION_BANK.filter(q=>q.category===category).length,4);
  for(const q of mood.QUESTION_BANK){
    assert.equal(q.options.length,4);
    for(const o of q.options){
      assert.ok(o.label.length>5);
      assert.equal(o.moods.length,2);
      for(const id of o.moods)assert.ok(IDs.includes(id));
    }
  }
});
test('retakes rotate question prompts while covering each theme',()=>{
  const first=mood.prepareQuiz([],seeded(12));
  const second=mood.prepareQuiz(first.map(x=>x.id),seeded(13));
  assert.equal(first.length,6);
  assert.equal(second.length,6);
  assert.equal(new Set(first.map(x=>x.category)).size,6);
  assert.equal(new Set(second.map(x=>x.category)).size,6);
  assert.equal(second.filter(x=>first.some(old=>old.id===x.id)).length,0);
});
test('answer positions vary with the random seed',()=>{
 const a=mood.prepareQuiz([],seeded(100));
 const b=mood.prepareQuiz([],seeded(200));
 assert.notDeepEqual(a.map(q=>[q.id,...q.options.map(x=>x.label)]),
   b.map(q=>[q.id,...q.options.map(x=>x.label)]));
});
test('mood ranking responds to the participant current choices',()=>{
 const options=[
   {moods:['heart','ache']},{moods:['heart','bloom']},
   {moods:['heart','dream']},{moods:['ache','heart']}
 ];
 const ranked=mood.rankMoods(options);
 assert.equal(ranked[0].id,'heart');
 assert.ok(ranked[0].score>ranked[1].score);
 assert.equal(mood.rankMoods([]).length,6);
});
test('recognized song-title clues point toward plausible discovery moods',()=>{
 assert.ok(mood.titleSignals('JUST LIKE FIRE | AMV').scores.ignite>0);
 assert.ok(mood.titleSignals('A THOUSAND YEARS | AMV').scores.heart>0);
 assert.ok(mood.titleSignals('MEMORY REBOOT | AMV').scores.dream>0);
 assert.ok(mood.titleSignals('MONTAGEM DIRECAO | AMV').scores.wild>0);
 assert.equal(mood.titleSignals('A RANDOM TITLE | AMV').scores.heart,0);
});
test('recommendations obey world filters and exclude recent match IDs',()=>{
 const videos=[
  synthetic('AAAAAAAAAAA','JUST LIKE FIRE | Genshin Impact AMV','genshin'),
  synthetic('BBBBBBBBBBB','BURNING | Honkai: Star Rail AMV'),
  synthetic('CCCCCCCCCCC','DARE | Honkai: Star Rail AMV')
 ];
 const selected=mood.recommend(videos,{
   mood:'ignite',world:'hsr',history:[{id:'BBBBBBBBBBB',song:'burning'}]
 },seeded(3));
 assert.equal(selected.video.id,'CCCCCCCCCCC');
 assert.equal(selected.world,'hsr');
});
test('replaying a match avoids a recent video when alternatives exist',()=>{
 const videos=[
  synthetic('AAAAAAAAAAA','PAYPHONE | Honkai: Star Rail AMV'),
  synthetic('BBBBBBBBBBB','TALKING BODY | Honkai: Star Rail AMV'),
  synthetic('CCCCCCCCCCC','A THOUSAND YEARS | Honkai: Star Rail AMV')
 ];
 const first=mood.recommend(videos,{mood:'heart'},seeded(10));
 const second=mood.recommend(videos,{mood:'heart',history:[{
   id:first.video.id,song:first.song}]},seeded(10));
 assert.notEqual(first.video.id,second.video.id);
});
test('empty universe has no false recommendation',()=>{
 const list=[synthetic('AAAAAAAAAAA','PAYPHONE | Honkai: Star Rail AMV')];
 assert.equal(mood.recommend(list,{mood:'heart',world:'endfield'}),null);
});
test('full synchronized video catalog provides mood choices',()=>{
 const wuwa=new Set(catalog.playlists.filter(p=>p.category==='wuwa')
   .flatMap(p=>p.videoIds));
 const videos=oracle.buildIndex(catalog.videos,{},wuwa);
 assert.ok(videos.length>=500,'channel catalog should contain many eligible AMVs');
 for(const id of IDs){
   const result=mood.recommend(videos,{mood:id,world:'all'},seeded(123));
   assert.ok(result);
   assert.ok(/^[A-Za-z0-9_-]{11}$/.test(result.video.id));
   assert.ok(result.video.channelOwned!==false);
 }
});
