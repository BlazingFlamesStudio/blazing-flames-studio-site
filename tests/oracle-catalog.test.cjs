const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../oracle-catalog.js');
const groups={
 genshin:{people:[['Columbina'],['Furina'],['Dehya']]},
 hsr:{people:[['Phainon'],['Kafka'],['Blade'],['Robin']]},
 wuwa:{people:[['Shorekeeper'],['Phrolova']]},
 emblem:{people:[['Byleth']]},
 endfield:{people:[['Laevatain']]},
 zzz:{people:[['Miyabi']]},
 other:{people:[]}
};
const make=(id,title,category='other',game='Other Worlds',extra={})=>({
 id,title,category,game,channelOwned:true,publishedAt:'2026-11-23T04:00:00Z',...extra
});
test('only clear AMV markers, not a creator name or reactions',()=>{
 assert.equal(core.titledAMV({title:'Star RailAMV/GMV'}),true);
 assert.equal(core.titledAMV({title:'A PHROL0VA [[AMVGMV]]'}),true);
 assert.equal(core.titledAMV({title:'IsshinAMV Reacts To Edits'}),false);
 assert.equal(core.eligibleVideo(make('AAAAAAAAAAA','AMV REACTION')),false);
 assert.equal(core.eligibleVideo(make('BBBBBBBBBBB','AMV GAMEPLAY')),false);
 assert.equal(core.eligibleVideo(make('CCCCCCCCCCC','LadyNyx12 Reacted To MY AMV!!')),false);
 assert.equal(core.eligibleVideo(make('DDDDDDDDDDD','How To Make An AMV EP. 2 - A Step-By-Step Analysis')),false);
});
test('owners and deduplication are enforced',()=>{
 const list=core.buildIndex([
   make('AAAAAAAAAAA','ANOTHER LOVE | AMV','genshin'),
   make('AAAAAAAAAAA','ANOTHER LOVE | AMV','genshin'),
   make('BBBBBBBBBBB','PULSE | AMV','hsr','Honkai: Star Rail',{channelOwned:false})
 ],groups,new Set());
 assert.deepEqual(list.map(x=>x.id),['AAAAAAAAAAA']);
});
test('new Endfield and Zenless AMVs receive world picks',()=>{
 const items=core.buildIndex([
   make('AAAAAAAAAAA','SOLDIER POET KING | An Arknights: Endfield AMV/GMV','other','Arknights: Endfield'),
   make('BBBBBBBBBBB','MY ORDINARY LIFE | Zenless Zone Zero AMV/GMV','other','Zenless Zone Zero')
 ],groups,new Set());
 assert.equal(core.forWorld(items,'endfield').length,1);
 assert.equal(core.forWorld(items,'zzz').length,1);
 assert.equal(core.forWorld(items,'all').length,2);
});
test('character-titled Other Worlds uploads can be categorized without inventing their appearance',()=>{
 const items=core.buildIndex([
  make('AAAAAAAAAAA','A COLUMBINA AMV'),
  make('BBBBBBBBBBB','A PHAINON AMV'),
  make('CCCCCCCCCCC','UNKNOWN | AMV')
 ],groups,new Set());
 assert.deepEqual(items.map(x=>x.oracleWorlds),[['genshin'],['hsr'],['other']]);
});
test('curated song-only WuWa music edit remains while commentary is excluded',()=>{
 const song=make('AAAAAAAAAAA','The Shorekeeper | Est-ce Que Tu m aimes | Wuthering Waves');
 const review=make('BBBBBBBBBBB','The BEST Character In Wuthering Waves');
 const list=core.buildIndex([song,review],groups,new Set([song.id,review.id]));
 assert.deepEqual(list.map(x=>x.id),[song.id]);
 assert.deepEqual(list[0].oracleWorlds,['wuwa']);
});
test('multi-world crossovers are indexed in both worlds only if title names characters',()=>{
 const list=core.buildIndex([make('AAAAAAAAAAA','Columbina x Kafka | AMV')],groups,new Set());
 assert.deepEqual(list[0].oracleWorlds,['genshin','hsr']);
 assert.equal(core.countByWorld(list).all,1);
 assert.equal(core.countByWorld(list).genshin,1);
 assert.equal(core.countByWorld(list).hsr,1);
});

test('explicit game title corrects a conflicting catalog category',()=>{
 const list=core.buildIndex([
  make('AAAAAAAAAAA','Fire Emblem Three Houses: Play With Fire AMV/CMV (Byleth)','genshin','Genshin Impact')
 ],groups,new Set());
 assert.deepEqual(list[0].oracleWorlds,['emblem']);
});
test('explicit franchise crossovers can appear in both universes',()=>{
 const list=core.buildIndex([
  make('AAAAAAAAAAA','Genshin Impact x Honkai Star Rail | AMV/GMV','genshin','Genshin Impact')
 ],groups,new Set());
 assert.deepEqual(list[0].oracleWorlds,['genshin','hsr']);
});
