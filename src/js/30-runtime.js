/* ============================================================
   RUNTIME + ACTIONS
   ============================================================ */
let S, D;
const $ = id => document.getElementById(id);
let tab = 'castes', buyN = 1, confirmUntil = 0, wipeArmed = 0;
let fervor = 0, lastTapAt = 0, droneAcc = 0, lastSeason = null;
let nextEventAt = Date.now() + 35000, activeEvent = null, eventDeadline = 0;

function gain(x){
  S.crumbs += x; S.run += x; S.lifetime += x; S.ascLife += x;
  track('gather', x);
}
function spend(x){ S.crumbs = Math.max(0, S.crumbs - x); }
function bump(){
  try { $('crumbs').animate([{transform:'scale(1.14)', color:'#fff1cf'},{transform:'scale(1)'}], {duration:420, easing:'ease-out'}); } catch(e){}
}
function addBuff(b){
  const now = Date.now();
  const good = (b.prod||1) >= 1 && (b.tap||1) >= 1;
  const dur = b.dur * (good && S.edicts.agitprop ? 1.5 : 1);
  S.buffs = S.buffs.filter(x => x.until > now && x.name !== b.name);
  S.buffs.push({name:b.name, prod:b.prod||1, tap:b.tap||1, until: now + dur*1000, dur, gold:!!b.gold});
  D = derive(S);
}
function fervMult(){ return 1 + fervor * (D.fervMax - 1); }

function addGems(n){
  if (!(n > 0)) return;
  S.gems += n;
  const gp = $('gempill'); if (gp){ gp.classList.remove('bump'); void gp.offsetWidth; gp.classList.add('bump'); }
}
function merit(n){
  const before = passTier(S.pass.xp).tier;
  leagueAdd(n);   // weekly league score = base merit (the premium boost does not count)
  S.pass.xp += S.pass.premium ? n * PREM_MERIT : n;
  const after = passTier(S.pass.xp).tier;
  if (after > before){ toast(`Pass tier ${after} reached`, 'New rewards are waiting in the Pass tab.', 'gold', 'ticket'); Sound.stamp(); }
}


