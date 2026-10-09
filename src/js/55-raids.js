/* ---------- raids (expeditions) ---------- */
function expUnlocked(x){ return !x.req || (S.owned[x.req]||0) > 0; }
function expDur(x){ return x.dur * D.expSpeed * (x.id === 'kitchen' && !S.raids && !S.exp.kitchen ? .25 : 1); }
function expLootEst(x){ return (D.baseCps * x.dur * x.mult + 40*x.squad) * D.expLoot; }
function canSend(x){ return !S.exp[x.id] && expUnlocked(x) && (S.owned.forager||0) >= x.squad; }
function sendExp(id){
  const x = EXP_BY_ID[id]; if (!canSend(x)) return false;
  const loot = expLootEst(x), now = Date.now();
  S.owned.forager -= x.squad;
  S.exp[id] = {start:now, end: now + expDur(x)*1000, loot, squad:x.squad};
  track('send', 1);
  return true;
}
function collectExp(id){
  const e = S.exp[id]; if (!e || Date.now() < e.end) return null;
  const x = EXP_BY_ID[id];
  S.owned.forager = (S.owned.forager||0) + e.squad;
  gain(e.loot);
  let j = 0; if (Math.random() < x.jelly) j++; if (x.jelly >= 1 && Math.random() < .5) j++;
  S.jelly += j; S.raids++;
  if (id === 'moon') S.flags.moon = true;
  const gm = RAID_GEMS[id]||0; addGems(gm); merit(20 + Math.round(x.dur/120));
  delete S.exp[id];
  track('raid', 1);
  return {loot:e.loot, j, x, gm};
}
function raidsReady(){ return Object.entries(S.exp).filter(([,e]) => Date.now() >= e.end).length; }

