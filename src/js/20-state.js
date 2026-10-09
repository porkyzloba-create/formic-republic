/* ============================================================
   STATE
   ============================================================ */
function fresh(){
  return {v:3, crumbs:0, run:0, lifetime:0, owned:{}, bought:[], pher:0, jelly:0, edicts:{}, medals:[], seenMedals:0,
    buffs:[], quota:null, quotaN:0, flights:0, taps:0, picnics:0, anteaters:0, flyers:0, rubbles:0, incidents:0,
    exp:{}, raids:0, daily:{last:'', streak:0, best:0},
    gems:0, inv:{}, packs:{}, cards:{}, pass:{xp:0, free:[], prem:[], premium:false, bonus:0}, pity:0, shopDay:'', tapMerit:0,
    rep:{}, shards:{}, crowns:0, crownsTotal:0, supers:0, doctrine:{}, war:{beaten:0, dmg:0}, hard:{}, chal:null, ascLife:0,
    dir:{day:'', list:[], chest:false, swapped:false, week:'', days:[], weekClaimed:false},
    abyss:{depth:0, torches:5, day:'', extra:0, shards:0, ppity:0, wins:0},
    flags:{seasons:{}}, iap:{owned:{}, first:{}}, ads:{day:'', n:{}, ex:0}, sound:true, started:Date.now(), last:Date.now(),
    online:freshOnline(), spin:{day:'', used:0, ads:0, total:0, jackpots:0}, auto:{until:0, forever:false, on:true}, privacy:{stats:true}};
}
// Online league: this week's score is kept locally and reported to the server; acct holds one
// identity per backend ('supabase' for the real game, 'preview' for the claude.ai preview league).
function freshOnline(){ return {week:'', score:0, prevWeek:'', prevScore:0, paid:'', chest:{week:'', got:[]}, acct:{}}; }
function derive(s, now){
  now = now || Date.now();
  const d = {prod:{}, tap:1, tapcps:0, global:1, offline:0.5, picnic:1, ferDecay:1, maps:false, rations:false, almanac:false};
  PRODUCERS.forEach(p => d.prod[p.id] = 1);
  for (const id of (s.chal === 'burning' ? [] : s.bought)){
    const u = UPG_BY_ID[id]; if (!u) continue;
    const f = u.fx;
    if (f.type==='prod') d.prod[f.id] *= f.x;
    else if (f.type==='tap') d.tap *= f.x;
    else if (f.type==='tapcps') d.tapcps += f.x;
    else if (f.type==='global') d.global *= f.x;
    else if (f.type==='offline') d.offline = f.x;
    else if (f.type==='picnic') d.picnic *= f.x;
    else if (f.type==='ferdecay') d.ferDecay *= f.x;
    else d[f.type] = true;
  }
  const e = s.edicts;
  const cf = {prod:{}, global:0, tap:0, fervor:0, raid:0, picnic:0, offline:0, cost:0, raidSpeed:0, war:0, pherGain:0, abyss:0, crownGain:0, drone:0};
  for (const [cid, lv] of Object.entries(s.cards||{})){
    const c = CARD_BY_ID[cid]; if (!c) continue; const f = c.fx;
    if (f.prod) cf.prod[f.prod] = (cf.prod[f.prod]||0) + f.v*lv;
    for (const k of ['global','tap','fervor','raid','picnic','offline','cost','raidSpeed','war','pherGain','abyss','crownGain','drone']) if (f[k]) cf[k] += f[k]*lv;
  }
  d.cards = cf;
  d.offline += cf.offline + (s.iap && s.iap.owned.party ? .25 : 0); d.picnic *= 1 + cf.picnic;
  COSTMULT = Math.max(.6, 1 - cf.cost) * (s.chal === 'austerity' ? 3 : 1);
  d.season = s.chal === 'winter' ? Object.assign(seasonAt(now), SEASONS[3], {fx:'output −60% (hardship)'}) : seasonAt(now);
  d.seasonProd = s.chal === 'winter' ? .4 : (d.season.id==='winter' && d.almanac) ? 1 : d.season.prod;
  d.pher = 1 + s.pher*pherRate(s);
  d.medal = 1 + s.medals.length*MEDAL_BONUS;
  d.decree = 1 + (e.decree||0)*0.25;
  const rp = s.chal === 'burning' ? {} : (s.rep||{});
  d.rep = rp;
  const hardN = Object.values(s.hard||{}).reduce((a,b)=>a+b,0);
  d.warMult = Math.pow(1.15, (s.war||{}).beaten||0);
  d.endMult = d.warMult * (s.pass && s.pass.premium ? 1 + PREM_OUTPUT : 1) * (1 + .05*(s.crownsTotal||0)) * (1 + .25*((s.doctrine||{}).network||0)) * Math.pow(1.2, hardN) * (1 + .05*(rp.eff||0));
  let pb = 1, tb = 1; d.buffs = [];
  for (const b of s.buffs) if (b.until > now){ pb *= b.prod||1; tb *= b.tap||1; d.buffs.push(b); }
  d.prodBuff = pb; d.tapBuff = tb;
  d.each = {}; d.baseCps = 0;
  PRODUCERS.forEach(p => {
    d.each[p.id] = p.cps * d.prod[p.id] * d.global * d.pher * d.medal * d.decree * (1 + (cf.prod[p.id]||0)) * (1 + cf.global) * d.endMult;
    d.baseCps += d.each[p.id] * (s.owned[p.id]||0);
  });
  d.cps = d.baseCps * pb * d.seasonProd;
  d.baseTap = (d.tap * d.pher * d.medal + d.baseCps * d.tapcps) * (1 + cf.tap) * (1 + .1*(rp.mand||0));
  d.tapValue = d.baseTap * tb * d.season.tap;
  if (s.chal === 'pacifist') d.tapValue = 0;
  d.offlineCap = ((s.doctrine||{}).longnight ? 72 : e.night ? 24 : 12) * 3600;
  d.fervMax = 3 + (e.fervor||0) + cf.fervor;
  d.drones = s.chal === 'pacifist' ? 0 : (e.drone||0) + cf.drone;
  d.abyssMult = 1 + cf.abyss;
  d.expSpeed = (d.maps ? .75 : 1) * (1 - (e.veterans||0)*.15) * Math.max(.5, 1 - cf.raidSpeed);
  d.expLoot = (d.rations ? 1.5 : 1) * (1 + (e.veterans||0)*.2) * d.season.picnic * (1 + cf.raid) * (1 + .05*(rp.loot||0));
  d.warDps = d.baseCps * ((s.doctrine||{}).totalwar ? 3 : 1) * (1 + .05*(rp.loot||0)) * (1 + cf.raid) * (1 + cf.war);
  return d;
}
function costOf(p, owned, n){ return COSTMULT * p.base * Math.pow(GROWTH, owned) * (Math.pow(GROWTH, n) - 1) / (GROWTH - 1); }
function maxAffordable(p, owned, bank){
  bank = bank / COSTMULT;
  const first = p.base * Math.pow(GROWTH, owned);
  return Math.max(0, Math.floor(Math.log(bank*(GROWTH-1)/first + 1) / Math.log(GROWTH)));
}
function upgCost(u){ return u.cost * (D ? D.season.research : 1); }
function pherBoost(s){ return ((s.doctrine && s.doctrine.swarming) ? 1.5 : 1) * (1 + .1*((s.cards||{}).m6||0)); }
// Pheromones: cube root of crumbs gathered since the last Supercolony, over 1e9 (was 1e7), so the first
// flight lands on day 2-4 and the Supercolony around day 8-13 instead of day 2-5 (see tools/sim.js).
function pherPotential(s){ return Math.floor(Math.cbrt((s.ascLife||0) / 1e9) * pherBoost(s)); }
function pherGain(s){ return Math.max(0, pherPotential(s) - s.pher); }
function nextPherAt(s){ const n = Math.max(pherPotential(s), s.pher) + 1; return Math.pow(n/pherBoost(s), 3)*1e9; }
function availableUpgrades(s){ return UPGRADES.filter(u => !s.bought.includes(u.id) && u.unlocked(s)).sort((a,b) => a.cost-b.cost); }
function nextLockedUpgrade(s){ return UPGRADES.filter(u => !s.bought.includes(u.id) && !u.unlocked(s)).sort((a,b) => a.cost-b.cost)[0]; }

const PERMA = ['abyss','dir','medals','seenMedals','lifetime','taps','picnics','anteaters','flyers','rubbles','incidents','raids','daily','quotaN','flags','sound','started',
  'gems','inv','packs','cards','shards','pass','pity','shopDay','tapMerit','crowns','crownsTotal','supers','doctrine','war','hard','online','spin','auto','privacy'];
function resetRun(s, extra){ const k = {}; for (const f of PERMA) k[f] = s[f]; Object.assign(s, fresh(), k, extra); }
function nuptialFlight(s, force){
  const g = pherGain(s); if (g < 1 && !force) return 0;
  const keepAll = s.doctrine.archive;
  const keepIds = keepAll ? s.bought.slice() : s.edicts.memory ? s.bought.filter(id => /^(plan|mand)-/.test(id)) : [];
  resetRun(s, {pher:s.pher+g, jelly:s.jelly+g, edicts:s.edicts, flights:s.flights+1, ascLife:s.ascLife, rep: keepAll ? s.rep : {}, chal:null});
  s.bought = keepIds;
  if (s.edicts.brood){ s.owned.forager = 10; s.owned.aphid = 5; }
  return g;
}
function crownGain(s){ return s.pher >= SUPER_REQ ? Math.floor(3*Math.pow(s.pher/SUPER_REQ, .6) * (1 + .2*((s.cards||{}).p5||0))) : 0; }
function supercolony(s){
  const g = crownGain(s); if (!g) return 0;
  const cellar = s.doctrine.cellar;
  resetRun(s, {crowns:s.crowns+g, crownsTotal:s.crownsTotal+g, supers:s.supers+1, pher:0, flights:s.flights, edicts: cellar ? s.edicts : {}, jelly: cellar ? s.jelly : 0, ascLife:0, rep:{}, chal:null});
  return g;
}
// "Dissolve the Republic": delete all progress. The league identity and this week's league
// points are kept, because the server already holds them (dropping them would orphan the
// player's leaderboard entry and make the next reports look like a score going backwards).
// The privacy choices (S.privacy) are kept too. The league entry is deleted separately, in the League tab.
function wipeSave(){ const online = S.online, privacy = S.privacy; S = fresh(); S.online = online; S.privacy = privacy; return S; }

