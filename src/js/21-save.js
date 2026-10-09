/* ============================================================
   PERSISTENCE
   ============================================================ */
const KEY = 'formic-republic-v1';
function load(){
  // Use whichever is newer: browser storage or the shell's save file (Steam Cloud may have synced a newer one).
  let a = null, b = null;
  try { const raw = localStorage.getItem(KEY); if (raw) a = JSON.parse(raw); } catch(e){}
  try { if (PLATFORM.initialSave) b = JSON.parse(PLATFORM.initialSave); } catch(e){}
  const pick = a && b ? ((b.last||0) > (a.last||0) ? b : a) : (a || b);
  return pick ? normalize(pick) : null;
}
function normalize(o){
  const s = Object.assign(fresh(), o);
  s.flags = Object.assign({seasons:{}}, s.flags||{}); s.flags.seasons = s.flags.seasons || {};
  s.edicts = s.edicts || {}; s.buffs = s.buffs || []; s.medals = s.medals || []; s.exp = s.exp || {};
  s.daily = Object.assign({last:'', streak:0, best:0}, s.daily||{});
  s.inv = s.inv||{}; s.packs = s.packs||{}; s.cards = s.cards||{};
  s.iap = Object.assign({owned:{}, first:{}}, s.iap||{}); s.ads = Object.assign({day:'', n:{}, ex:0}, s.ads||{});
  s.pass = Object.assign({xp:0, free:[], prem:[], premium:false, bonus:0}, s.pass||{});
  s.rep = s.rep||{}; s.shards = s.shards||{}; s.doctrine = s.doctrine||{}; s.hard = s.hard||{};
  s.war = Object.assign({beaten:0, dmg:0}, s.war||{});
  s.abyss = Object.assign({depth:0, torches:5, day:'', extra:0, shards:0, ppity:0, wins:0}, s.abyss||{});
  s.dir = Object.assign({day:'', list:[], chest:false, swapped:false, week:'', days:[], weekClaimed:false}, s.dir||{});
  s.online = Object.assign(freshOnline(), s.online||{}); s.online.acct = s.online.acct || {};
  s.online.chest = Object.assign({week:'', got:[]}, s.online.chest||{});
  s.spin = Object.assign({day:'', used:0, ads:0, total:0, jackpots:0}, s.spin||{});
  if (o.ascLife === undefined) s.ascLife = s.lifetime;
  return s;
}
let lastFileSave = 0;
function save(force){
  let raw = null;
  try { raw = JSON.stringify(S); localStorage.setItem(KEY, raw); } catch(e){}
  // Steam: mirror to a save file the shell writes to disk, so Steam Cloud can sync it.
  if (PLATFORM.fileSave && raw && (force === true || Date.now() - lastFileSave > 3000)){ lastFileSave = Date.now(); Native.post('save', {data: raw}); }
}

