/* Blazing Flames Studio — shared, testable AMV Oracle catalog rules.
 * Uses YouTube title signals and the existing curated playlist metadata.
 * Does not claim to know who appears in a song-only edit.
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BFSOracleCatalog = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  const AMV_TITLE = /(?:\bAMV\b|AMV\/GMV|AMVGMV)/i;
  const VALID_ID = /^[A-Za-z0-9_-]{11}$/;
  const BLOCK = /(?:\b(?:reaction|reacted|reacting|reacts|walkthrough|gameplay|unboxing|first trailer|livestream|account review|tutorial|guide|step by step analysis)\b|\bhow to (?:make|edit|create)\b)/i;
  const WORLDS = ['genshin','hsr','wuwa','emblem','endfield','zzz','other'];
  const GENERIC_ALIASES = new Set(['rover','blade','robin','sunday','sparkle','topaz','encore','lucy','lumi','ivy','jade','ice','wolf','amber','himeko','billy','albedo','sara']);
  const normalize = text => String(text || '').normalize('NFKD')
    .replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const hasPhrase = (text, phrase) => (' '+normalize(text)+' ').includes(' '+normalize(phrase)+' ');
  const titledAMV = video => AMV_TITLE.test(String(video?.title || ''));
  const safeVideo = video => Boolean(video && VALID_ID.test(video.id) &&
    video.channelOwned !== false && video.title && !BLOCK.test(String(video.title)));
  const worldFromExplicit = v => {
    const title=String(v.title||'');
    const game=String(v.game||'').toLowerCase();
    if(v.category === 'wuwa')return 'wuwa';
    if(v.category === 'genshin')return 'genshin';
    if(v.category === 'hsr')return 'hsr';
    if(game.includes('arknights') || /\b(?:arknights|endfield)\b/i.test(title))return 'endfield';
    if(game.includes('zenless') || /\b(?:zenless\s*zone\s*zero|ZZZ)\b/i.test(title))return 'zzz';
    if(/\b(?:fire\s*emblem|three\s*houses|three\s*hopes)\b/i.test(title))return 'emblem';
    if(/\b(?:wuthering\s*waves|wuwa)\b/i.test(title))return 'wuwa';
    if(/\b(?:genshin\s*impact|teyvat)\b/i.test(title))return 'genshin';
    if(/\b(?:honkai\s*[:\-]?\s*star\s*rail|star\s*rail|HSR)\b/i.test(title))return 'hsr';
    return '';
  };
  function inferWorlds(video, groups) {
    const explicit=worldFromExplicit(video);
    if(explicit)return [explicit];
    const title=String(video.title||'');
    const found=[];
    // Only infer a world from clearly named characters on otherwise
    // unclassified titles. Short/generic names are not safe world evidence.
    for(const [world,group] of Object.entries(groups||{})) {
      if(world==='other')continue;
      if((group.people||[]).some(([name,...aliases])=>[name,...aliases].some(alias=>{
        const a=normalize(alias);
        return a.length>=5 && !GENERIC_ALIASES.has(a) && hasPhrase(title,alias);
      })))found.push(world);
    }
    return found.length ? found : ['other'];
  }
  function eligibleVideo(video, wuwaPlaylistIds) {
    if(!safeVideo(video))return false;
    // A curated Wuthering Waves playlist also contains some song-only edits
    // under an established historical exception. Do not let commentary
    // entries in that playlist slip into the Oracle.
    const curatedWuwa=wuwaPlaylistIds && wuwaPlaylistIds.has(video.id) &&
      /\|/.test(String(video.title)) &&
      !/\b(?:best\s+character|review|reaction|guide|livestream)\b/i.test(String(video.title));
    return titledAMV(video) || Boolean(curatedWuwa);
  }
  function buildIndex(videos, groups, wuwaPlaylistIds) {
    const seen=new Set();
    return (Array.isArray(videos)?videos:[]).filter(v=>
      eligibleVideo(v,wuwaPlaylistIds) && !seen.has(v.id) && seen.add(v.id)
    ).map(v=>({...v,oracleWorlds:inferWorlds(v,groups)}));
  }
  function forWorld(videos, world) {
    if(world==='all')return videos;
    return videos.filter(v=>(v.oracleWorlds||[]).includes(world));
  }
  function countByWorld(videos) {
    const counts={all:videos.length};
    for(const world of WORLDS)counts[world]=forWorld(videos,world).length;
    return counts;
  }
  return {WORLDS,AMV_TITLE,normalize,hasPhrase,titledAMV,safeVideo,
    inferWorlds,eligibleVideo,buildIndex,forWorld,countByWorld};
});
