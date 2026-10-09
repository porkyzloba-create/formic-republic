/* ---------- amber shop, packs, cards, usables, pass ---------- */
function rollRarity(odds){ let r = Math.random(); for (const k of ['P','M','L','E','R','C']){ if ((r -= (odds[k]||0)) < 0) return k; } return 'C'; }
function grantCard(cid){
  const c = CARD_BY_ID[cid], lv = S.cards[cid]||0;
  if (!lv){ S.cards[cid] = 1; S.shards[cid] = 0; return {c, lv:1, kind:'new'}; }
  if (lv >= CARD_MAX){ const g = RARITY[c.r].dust; addGems(g); return {c, lv, kind:'dust', g}; }
  S.shards[cid] = (S.shards[cid]||0) + 1;
  if (S.shards[cid] >= lv){ S.shards[cid] = 0; S.cards[cid] = lv + 1; return {c, lv: lv+1, kind:'up'}; }
  return {c, lv, kind:'shard', sh:S.shards[cid]};
}
function openPack(id){
  const pk = PACKS[id]; if (!(S.packs[id] > 0)) return null;
  S.packs[id]--; if (!S.packs[id]) delete S.packs[id];
  const rars = Array.from({length:pk.n}, () => rollRarity(pk.odds));
  const last = pk.n - 1;
  if (pk.guar && RAR_ORDER.indexOf(rars[last]) < RAR_ORDER.indexOf(pk.guar)) rars[last] = pk.guar;
  if (!S.flags.pack1){ S.flags.pack1 = 1; if (rars[last] === 'C') rars[last] = 'R'; }
  S.pity = (S.pity||0) + 1;
  const mythPool = CARDS.filter(c => c.r === 'M' && mythicUnlocked(c));
  for (let i = 0; i < rars.length; i++) if (rars[i] === 'M' && !mythPool.length) rars[i] = 'L';
  for (let i = 0; i < rars.length; i++) if (rars[i] === 'P' && !primUnlocked()) rars[i] = 'L';
  if (id === 'primordial'){ S.abyss.ppity++; if (!rars.includes('P') && S.abyss.ppity >= PRIM_PITY) rars[last] = 'P'; if (rars.includes('P')) S.abyss.ppity = 0; }
  if (!rars.some(r => r === 'L' || r === 'M' || r === 'P') && S.pity >= PITY) rars[last] = 'L';
  if (rars.some(r => r === 'L' || r === 'M' || r === 'P')) S.pity = 0;
  const out = rars.map(r => { const pool = r === 'M' ? mythPool : CARDS.filter(c => c.r === r); return grantCard(pool[Math.floor(Math.random()*pool.length)].id); });
  for (const o of out) if (o.c.r === 'M' && o.kind === 'new'){ toast('A MYTHIC CARD!', `${o.c.name} has revealed itself. ${cardFx(o.c, 1)}.`, 'jelly', o.c.icon); }
  for (const o of out) if (o.c.r === 'P' && o.kind === 'new'){ toast('A PRIMORDIAL CARD!', `${o.c.name} has risen from the deep. ${cardFx(o.c, 1)}.`, 'jelly', o.c.icon); }
  merit(10); track('pack', 1);
  return {pk, out};
}
function grantReward(r){
  if (r.t==='gems') addGems(r.n);
  else if (r.t==='pack') S.packs[r.id] = (S.packs[r.id]||0) + (r.n||1);
  else if (r.t==='crumbs'){ gain(D.baseCps*60*r.min + 100*r.min); bump(); }
  else if (r.t==='use') S.inv[r.id] = (S.inv[r.id]||0) + r.n;
  else if (r.t==='jelly') S.jelly += r.n;
  else if (r.t==='card') grantCard(r.id);
}
function rewardText(r){
  if (r.t==='gems') return `${r.n} amber`;
  if (r.t==='pack') return (r.n > 1 ? r.n + '× ' : '') + PACKS[r.id].name;
  if (r.t==='crumbs') return `${r.min} min of output`;
  if (r.t==='use') return `${r.n}× ${USABLES[r.id].name}`;
  if (r.t==='jelly') return `${r.n} royal jelly`;
  return `${RARITY[CARD_BY_ID[r.id].r].name}: ${CARD_BY_ID[r.id].name}`;
}
function rewardIcon(r){ return r.t==='gems' ? 'gem' : r.t==='pack' ? 'cards' : r.t==='crumbs' ? 'crumb' : r.t==='use' ? USABLES[r.id].icon : r.t==='jelly' ? 'drop' : 'crown'; }
function claimTier(t, prem){
  const list = prem ? S.pass.prem : S.pass.free;
  if (t > passTier(S.pass.xp).tier || list.includes(t) || (prem && !S.pass.premium)) return false;
  list.push(t); grantReward(passReward(t, prem)); return true;
}
function bonusAvailable(){ const p = passTier(S.pass.xp); return p.tier >= PASS_TIERS ? Math.max(0, Math.floor(p.into / BONUS_XP) - S.pass.bonus) : 0; }
function passClaimable(){
  const pt = passTier(S.pass.xp).tier; let n = 0;
  for (let t = 1; t <= pt; t++){ if (!S.pass.free.includes(t)) n++; if (S.pass.premium && !S.pass.prem.includes(t)) n++; }
  return n + bonusAvailable();
}
function claimAll(){
  const pt = passTier(S.pass.xp).tier; let n = 0;
  for (let t = 1; t <= pt; t++){ if (claimTier(t, false)) n++; if (claimTier(t, true)) n++; }
  const b = bonusAvailable(); if (b){ S.pass.bonus += b; const bk = S.pass.premium ? 'epic' : 'rare'; S.packs[bk] = (S.packs[bk]||0) + b; n += b; }
  return n;
}
let shopN = 1;
function shopQty(kind, id){
  if (!['pack','use','jelly'].includes(kind)) return 1;
  if (shopN === 'max') return Math.max(1, Math.min(10000, Math.floor(S.gems / shopPrice(kind, id))));
  return shopN;
}
function exchangeCost(){ return Math.max(5000, D.baseCps*1800); }
function shopPrice(kind, id){ return kind==='pack' ? PACKS[id].price : kind==='use' ? USABLES[id].price : kind==='jelly' ? 80 : kind==='premium' ? PREMIUM_COST : 0; }
function buyShop(kind, id){
  const price = shopPrice(kind, id);
  if (kind==='ration'){ if (S.shopDay === dayKey(Date.now())) return false; S.shopDay = dayKey(Date.now()); S.packs.common = (S.packs.common||0) + 1; return true; }
  if (kind==='exchange'){ const c = exchangeCost(); adDay(); if (S.crumbs < c || S.ads.ex >= EX_CAP) return false; spend(c); S.ads.ex++; addGems(10); return true; }
  if (kind==='premium' && S.pass.premium) return false;
  if (kind==='pack' && !PACKS[id].price) return false;
  const n = shopQty(kind, id), total = price * n;
  if (S.gems < total) return false;
  S.gems -= total;
  if (kind==='pack') S.packs[id] = (S.packs[id]||0) + n;
  else if (kind==='use') S.inv[id] = (S.inv[id]||0) + n;
  else if (kind==='jelly') S.jelly += n;
  else if (kind==='premium') unlockPremium();
  return true;
}
let fervorLockUntil = 0;
let superConfirm = 0, quitArmed = 0, hardArm = {id:null, until:0}, lastAuto = 0;
let sect = {raids:'raids', flight:'flight', goals:'dir'};
function segHTML(t, items){ return `<div class="seg" role="group">${items.map(([k,l]) => `<button data-sect="${t}:${k}" aria-pressed="${sect[t]===k}">${l}</button>`).join('')}</div>`; }
function buyRepeat(id){ if (S.chal === 'burning') return false; const r = REP_BY_ID[id], l = S.rep[id]||0, c = r.cost(l); if (S.crumbs < c) return false; spend(c); S.rep[id] = l+1; return true; }
function buyDoctrine(id){ const d = DOCTRINE.find(x => x.id === id), l = S.doctrine[id]||0, c = docCost(d, l); if (l >= (d.max||1) || S.crowns < c) return false; S.crowns -= c; S.doctrine[id] = l+1; return true; }
function siege(sec){
  let dmg = D.warDps * sec;
  while (dmg > 0 && S.war.beaten < RIVALS){
    const r = rival(S.war.beaten), need = r.hp - S.war.dmg;
    if (dmg >= need){
      dmg -= need; S.war.dmg = 0; S.war.beaten++;
      addGems(r.gems); S.jelly += 1; if (r.crown){ S.crowns++; S.crownsTotal++; }
      toast('Rival conquered!', `${r.name} has fallen. All output +15% forever, +${r.gems} amber${r.crown ? ', +1 crown' : ''}.`, 'medal', 'swords'); Sound.stamp();
      D = derive(S);
    } else { S.war.dmg += dmg; dmg = 0; }
  }
}
function checkHardship(){
  if (!S.chal || S.run < hardGoal(S.chal)) return;
  const h = HARD_BY_ID[S.chal];
  S.hard[S.chal] = (S.hard[S.chal]||0) + 1; S.chal = null; addGems(50);
  D = derive(S); save();
  toast(`Hardship survived: ${h.name}`, 'All output +20% forever, +50 amber. Normal rules return.', 'medal', h.icon); Sound.stamp();
  if (tab === 'flight') render();
}
function checkPassSeason(){
  const ps = passSeason(Date.now());
  if (S.pass.season === undefined){ S.pass.season = ps.n; return; }
  if (S.pass.season !== ps.n){
    S.pass = {xp:0, free:[], prem:[], premium:false, bonus:0, season:ps.n};
    toast(`Pass season ${ps.n}: ${ps.name}`, 'A new Revolution Pass has begun. Premium must be unlocked again.', 'gold', 'ticket');
    if (tab === 'pass') render();
  }
}
function automate(now){
  if (now - lastAuto < 2000) return; lastAuto = now;
  const dc = S.doctrine; let changed = false;
  if (dc.hiring){ const id = bestValueId(), p = PRODUCERS.find(x => x.id === id); if (p && costOf(p, S.owned[id]||0, 1) <= S.crumbs){ buyProducer(id, 1); changed = true; } }
  if (dc.selfdir && S.chal !== 'burning'){ const u = availableUpgrades(S).find(u => upgCost(u) <= S.crumbs); if (u){ buyUpgrade(u.id); changed = true; } }
  if (dc.standing){ for (const x of EXPEDITIONS){ const e = S.exp[x.id]; if (e && Date.now() >= e.end){ collectExp(x.id); changed = true; } else if (!e && canSend(x)){ sendExp(x.id); changed = true; } } }
  if (changed){ D = derive(S); colony.rebuild(); }
}
function repeatHTML(){
  return `<div class="shop-sec">Endless research</div>` + REPEATS.map(r => `<button class="row" data-rep="${r.id}" id="row-rep-${r.id}"><div class="row-main"><div class="row-target">Repeatable</div><div class="row-name">${r.name}<span class="tag" data-rlv></span></div><div class="row-sub" data-rl></div></div>${rowSide()}</button>`).join('') + `<div class="shop-sec">Projects</div>`;
}
function warHTML(){
  if (S.war.beaten >= RIVALS) return `<div class="flight"><h2>The world is ours</h2><p>All ${RIVALS} rival colonies have fallen. Their larders feed the Republic forever.</p></div>`;
  const r = rival(S.war.beaten);
  let html = `<div class="war-card">
    <div class="ph-eyebrow">CONQUEST · RIVAL ${S.war.beaten+1} OF ${RIVALS}</div>
    <div class="war-name">${r.name}</div>
    <div class="war-hp"><div id="w-hp"></div></div>
    <div class="ph-xp"><span id="w-left"></span><span id="w-eta"></span></div>
    <div class="chips"><span class="chip c">${icon('up')}+15% all output forever</span><span class="chip" style="color:var(--gem)">${icon('gem')}${r.gems} amber</span><span class="chip j">${icon('drop')}1 royal jelly</span>${r.crown ? `<span class="chip c">${icon('crown')}1 crown</span>` : ''}</div>
    <p class="war-note">The siege never stops. Your colony's base output batters the rival's walls, even while the app is closed. Each rival's walls are 9× thicker than the last. Siege damage: <b id="w-dps"></b>/s.</p>
  </div><div class="shop-sec">Next on the map</div>`;
  for (let k = 1; k <= 4 && S.war.beaten + k < RIVALS; k++){
    const q = rival(S.war.beaten + k);
    html += `<div class="srow"><div class="si" style="color:var(--banner)">${icon('swords')}</div><div class="row-main"><div class="row-name" style="color:var(--dust)">${q.name}</div><div class="row-sub">${fmt(q.hp)} wall strength${q.crown ? ' · yields a crown' : ''}</div></div><span></span></div>`;
  }
  return html + `<div class="locked">Conquests are permanent: they survive Nuptial Flights and Supercolonies.</div>`;
}
function superHTML(){
  return `<div class="flight">
    <h2 style="color:var(--r-l)">The Supercolony</h2>
    ${S.supers ? '' : `<p><b>Your first Supercolony also breaks the seal on the Abyss</b> (Raids tab): endless depths, guardians, and the giga-rare Primordial cards.</p>`}
    <p>Merge every hill you have founded into one continent-spanning Supercolony. Pheromones, castes, research, Lab levels, edicts and royal jelly are lost. You gain <b>crowns</b>: each crown ever earned adds +5% to all output forever, and crowns buy doctrines below. Cards, medals, amber, the Pass, hardships and conquests are kept.</p>
    <dl class="ledger">
      <dt>Requires</dt><dd>${SUPER_REQ} pheromones</dd>
      <dt>Pheromones held</dt><dd id="s-pher"></dd>
      <dt>Crowns from merging now</dt><dd class="big" id="s-gain"></dd>
      <dt>Crowns held / ever earned</dt><dd id="s-crowns"></dd>
      <dt>Supercolonies formed</dt><dd>${S.supers}</dd>
    </dl>
    <button class="btn" id="s-btn"></button>
    <h3 style="color:var(--r-l)">Hive Doctrine</h3>
    <p>Permanent laws bought with crowns. They survive every reset, and they include automation for the long haul.</p>
    <div class="edicts">${DOCTRINE.map(d => `<button class="row edict doc" data-doc="${d.id}" id="row-doc-${d.id}"><div class="row-main"><div class="row-name">${d.name}</div><div class="row-sub">${d.desc}</div><div class="lvl" data-lvl></div></div><div class="row-side"><div class="price" data-cost></div></div></button>`).join('')}</div>
  </div>`;
}
function hardHTML(){
  let html = `<div class="flight"><h2>Hardships</h2><p>Begin a new colony under a cruel decree (this counts as a Nuptial Flight). Reach the goal in that colony to lift the decree and earn <b>+20% all output forever</b> and 50 amber. Every hardship can be survived again, with a goal 100× higher each time.</p>`;
  if (!hardUnlocked()) html += `<p><b>Locked.</b> Take 10 Nuptial Flights or form a Supercolony to unlock hardships. Flights so far: ${S.flights}/10.</p>`;
  if (S.chal) html += `<div class="war-card" style="margin:0"><div class="ph-eyebrow">ACTIVE HARDSHIP</div><div class="war-name">${HARD_BY_ID[S.chal].name}</div><div class="war-hp gold"><div id="h-bar"></div></div><div class="ph-xp"><span id="h-txt"></span><span>log scale</span></div><button class="btn ghost" id="h-quit"></button></div>`;
  html += `</div><div class="edicts" style="margin:0">` + HARDSHIPS.map(h => `<div class="srow" id="hard-${h.id}"><div class="si" style="color:var(--banner)">${icon(h.icon)}</div><div class="row-main"><div class="row-name">${h.name}<span class="tag" data-hn></span></div><div class="row-sub">${h.rule}</div><div class="own" data-goal></div></div><button class="btn" style="font-size:14px;padding:7px 10px" data-hard="${h.id}"></button></div>`).join('') + `</div>`;
  return html;
}
function refreshWar(){
  if ($('w-sum')) $('w-sum').innerHTML = `<b>${S.war.beaten}</b>/${RIVALS} · ×${fmt(D.warMult, true)}`;
  if (!$('w-hp')) return;
  const r = rival(S.war.beaten), left = r.hp - S.war.dmg;
  $('w-hp').style.width = Math.max(0, left/r.hp*100) + '%';
  $('w-left').textContent = `${fmt(left)} / ${fmt(r.hp)} walls`;
  $('w-eta').textContent = D.warDps > 0 ? `falls in ${fmtTime(left / D.warDps)}` : 'hire castes to lay siege';
  $('w-dps').textContent = fmt(D.warDps, true);
}
function refreshEndgame(){
  const now = Date.now();
  if (sect.flight === 'super'){
    const g = crownGain(S), armed = now < superConfirm;
    $('s-pher').textContent = fmt(S.pher); $('s-gain').textContent = '+' + g;
    $('s-crowns').textContent = `${S.crowns} / ${S.crownsTotal} (+${S.crownsTotal*5}%)`;
    const b = $('s-btn'); b.disabled = !g; b.classList.toggle('confirm', armed && g > 0);
    b.textContent = !g ? `Need ${SUPER_REQ} pheromones` : armed ? `Confirm: merge for +${g} crowns` : 'Form the Supercolony';
    DOCTRINE.forEach(d => {
      const row = $('row-doc-' + d.id); if (!row) return;
      const l = S.doctrine[d.id]||0, max = d.max||1, c = docCost(d, l), maxed = l >= max, ready = !maxed && S.crowns >= c;
      row.classList.toggle('ready', ready); row.classList.toggle('maxed', maxed);
      row.querySelector('[data-cost]').textContent = maxed ? 'IN FORCE' : (ready ? 'ADOPT · ' : '') + c + (c > 1 ? ' crowns' : ' crown');
      row.querySelector('[data-lvl]').textContent = max > 1 ? `Level ${l}` : '';
    });
  } else {
    if (S.chal && $('h-bar')){
      const goal = hardGoal(S.chal);
      $('h-bar').style.width = Math.min(100, Math.log10(1+S.run)/Math.log10(1+goal)*100) + '%';
      $('h-txt').textContent = `${fmt(S.run)} / ${fmt(goal)} crumbs`;
      $('h-quit').textContent = now < quitArmed ? 'Tap again to abandon (counts as a flight)' : 'Abandon the hardship';
    }
    HARDSHIPS.forEach(h => {
      const row = $('hard-' + h.id); if (!row) return;
      const n = S.hard[h.id]||0, b = row.querySelector('[data-hard]');
      row.querySelector('[data-hn]').textContent = n ? `×${n}` : '';
      row.querySelector('[data-hn]').hidden = !n;
      row.querySelector('[data-goal]').textContent = `Goal: ${fmt(hardGoal(h.id))} crumbs in one colony`;
      const active = S.chal === h.id, armed = hardArm.id === h.id && now < hardArm.until;
      b.disabled = active || !!S.chal || !hardUnlocked();
      b.textContent = active ? 'Active' : !hardUnlocked() ? 'Locked' : S.chal ? 'Busy' : armed ? 'Confirm' : 'Begin';
      b.classList.toggle('confirm', armed);
    });
  }
}
function useItem(id){
  if (!(S.inv[id] > 0)) return false;
  const u = USABLES[id];
  let ok = true, msg = u.desc;
  if (id==='rush') addBuff({name:'Sugar Rush', prod:2, dur:120, gold:true});
  else if (id==='oil') addBuff({name:'Mandible Oil', tap:5, dur:60, gold:true});
  else if (id==='tonic'){ fervorLockUntil = performance.now() + 30000; fervor = 1; }
  else if (id==='hourglass'){ if (D.baseCps <= 0){ ok = false; msg = 'Hire some castes first: the hourglass collects their output.'; } else { const v = D.baseCps*3600; gain(v); bump(); msg = `+${fmt(v)} crumbs: one hour of labour, instantly.`; } }
  else if (id==='basket'){ if (colony.hasCube()){ ok = false; msg = 'A sugar cube is already on the hill. Grab it first!'; } else colony.spawnCube(); }
  else if (id==='flare'){ if (colony.hasFlyer()){ ok = false; msg = 'A royal is already in the sky. Catch it!'; } else colony.spawnFlyer(); }
  else if (id==='autotap'){ S.auto.until = Math.max(Date.now(), S.auto.until) + 3600e3; msg = `The hill is tapped 8 times a second for ${fmtTime((S.auto.until - Date.now())/1000)}.`; }
  else if (id==='whistle'){
    const ks = Object.keys(S.exp).filter(k => Date.now() < S.exp[k].end);
    if (!ks.length){ ok = false; msg = 'No squads are out raiding right now.'; }
    else { ks.forEach(k => S.exp[k].end = Date.now()); msg = `${ks.length} squad${ks.length>1?'s':''} rushed home. Collect the loot in Raids.`; }
  }
  if (!ok){ toast("Can't use that now", msg, 'bad', u.icon); return false; }
  S.inv[id]--; if (!S.inv[id]) delete S.inv[id];
  toast(u.name, msg, 'gold', u.icon); Sound.good(); buzz(15);
  return true;
}
function cardHTML(c, lv){
  const known = lv > 0, sh = S.shards[c.id]||0, max = lv >= CARD_MAX;
  if (!known) return `<div class="ccard v2 ${c.r} unknown">
    <div class="cb"><span class="rl">${RARITY[c.r].name}</span></div>
    <div class="ca"><span class="cq">?</span></div>
    <div class="cn">???</div>
    <div class="cf">${cardFx(c, 1)} at Lv 1</div>
  </div>`;
  return `<div class="ccard v2 ${c.r}">
    <div class="cb"><span class="rl">${RARITY[c.r].name}</span><span class="lv">LV ${lv}</span></div>
    <div class="ca"><div class="cd">${icon(c.icon)}</div></div>
    <div class="cn">${c.name}</div>
    <div class="cf"><span>${cardFx(c, lv)}</span></div>
    <div class="cl">${max ? '<span class="mx">MAX LEVEL</span>' : `<i><b style="width:${Math.min(100, sh/lv*100)}%"></b></i><span>${sh}/${lv}</span>`}</div>
  </div>`;
}
function cardBack(){ return `<div class="cbk"><div class="cbk-r"></div><div class="cbk-d">${icon('ant')}</div><b>FORMIC</b></div>`; }
let opened = 0, opTotal = 0, cardFilter = 'all';
function showOpening(res){
  Analytics.ev('pack_open', {pack: res.pk.name, n: 1});
  $('op-title').textContent = res.pk.name;
  $('op-sub').textContent = 'Tap a card to reveal it';
  $('opening').classList.remove('bulk');
  $('op-cards').innerHTML = res.out.map((o,i) => `<div class="flip ${o.c.r}" style="animation-delay:${i*90}ms"><div class="flip-in">
      <div class="face back">${cardBack()}</div>
      <div class="face front">${cardHTML(o.c, Math.min(o.lv, CARD_MAX))}<span class="tagnew ${o.c.r==='P' && o.kind==='new' ? 'prim' : o.c.r==='M' && o.kind==='new' ? 'myth' : o.kind==='up' ? 'up' : o.kind==='dust' ? 'dust' : o.kind==='shard' ? 'shard' : ''}">${o.c.r==='P' && o.kind==='new' ? 'PRIMORDIAL!' : o.c.r==='M' && o.kind==='new' ? 'MYTHIC!' : o.kind==='new' ? 'NEW!' : o.kind==='up' ? 'LEVEL ' + o.lv : o.kind==='shard' ? 'COPY ' + o.sh + '/' + o.lv : '+' + o.g + ' AMBER'}</span></div>
    </div></div>`).join('');
  opened = 0; opTotal = res.out.length;
  $('op-done').hidden = true; $('op-all').hidden = false;
  $('opening').hidden = false;
  Sound.alert();
}
function showBulk(pk, n, outs){
  Analytics.ev('pack_open', {pack: pk.name, n});
  const cnt = {C:0, R:0, E:0, L:0, M:0, P:0}, best = {}; let nw = 0, up = 0, amber = 0;
  for (const o of outs){
    cnt[o.c.r]++;
    if (o.kind === 'new') nw++; else if (o.kind === 'up') up++; else if (o.kind === 'dust') amber += o.g;
    const b = best[o.c.id] || (best[o.c.id] = {c:o.c, n:0, isNew:false});
    b.n++; if (o.kind === 'new') b.isNew = true;
  }
  const list = Object.values(best).sort((a,b) => RAR_ORDER.indexOf(b.c.r) - RAR_ORDER.indexOf(a.c.r) || b.n - a.n).slice(0, 12);
  $('op-title').textContent = `${fmt(n)} × ${pk.name}`;
  $('op-sub').textContent = `${fmt(outs.length)} cards: ${cnt.P ? cnt.P + ' PRIMORDIAL, ' : ''}${cnt.M ? cnt.M + ' MYTHIC, ' : ''}${cnt.L} legendary, ${cnt.E} epic, ${cnt.R} rare, ${cnt.C} common · ${nw} new · ${up} level-ups` + (amber ? ` · +${fmt(amber)} amber` : '');
  $('op-cards').innerHTML = list.map((x,i) => `<div class="flip open ${x.c.r}" style="animation-delay:${i*50}ms"><div class="flip-in"><div class="face back">${cardBack()}</div><div class="face front">${cardHTML(x.c, S.cards[x.c.id])}<span class="tagnew ${x.isNew ? (x.c.r==='P' ? 'prim' : x.c.r==='M' ? 'myth' : '') : 'up'}">${x.isNew ? (x.c.r==='P' ? 'PRIMORDIAL!' : x.c.r==='M' ? 'MYTHIC!' : 'NEW!') : '×' + x.n}</span></div></div></div>`).join('');
  opened = opTotal = list.length;
  $('op-done').hidden = false; $('op-all').hidden = true;
  $('opening').classList.add('bulk'); $('opening').hidden = false; $('opening').scrollTop = 0;
  Sound.reveal(cnt.P ? 'P' : cnt.M ? 'M' : cnt.L ? 'L' : cnt.E ? 'E' : 'R'); buzz(cnt.P || cnt.M || cnt.L ? [40,60,80] : 20);
}
function flipCard(el){
  if (!el || el.classList.contains('open')) return;
  el.classList.add('open'); opened++;
  const r = RAR_ORDER.find(k => el.classList.contains(k)) || 'C';
  Sound.reveal(r); if (r === 'L' || r === 'E' || r === 'M' || r === 'P') buzz(r === 'E' ? 25 : r === 'P' ? [60,40,60,40,200,80,300] : [40,60,80,60,120]);
  if (opened >= opTotal){ $('op-done').hidden = false; $('op-all').hidden = true; }
}


function doTap(auto){
  lastCrit = D.tapValue > 0 && Math.random() < critChance();
  const v = D.tapValue * fervMult() * (lastCrit ? CRIT_MULT : 1);
  gain(v); S.taps++;
  fervor = Math.min(1, fervor + 0.05); lastTapAt = performance.now();
  if (fervor >= 1) S.flags.fervor = true;
  track('taps', 1);
  if (++S.tapMerit >= 10){ S.tapMerit = 0; merit(1); }
  if (!auto){ Sound.tap(); buzz(6); }   // the auto-tapper works quietly
  return v;
}
function buyProducer(id, n){
  const p = PRODUCERS.find(q => q.id===id); const owned = S.owned[id]||0;
  const c = costOf(p, owned, n);
  if (n<1 || c > S.crumbs + 1e-9) return false;
  spend(c); S.owned[id] = owned + n;
  track('hire', n); track('hire_' + id, n);
  return true;
}
function buyUpgrade(id){
  const u = UPG_BY_ID[id];
  if (S.chal === 'burning') return false;
  if (!u || S.bought.includes(id) || !u.unlocked(S) || S.crumbs < upgCost(u)) return false;
  spend(upgCost(u)); S.bought.push(id);
  track('research', 1);
  return true;
}
function buyEdict(id){
  const e = EDICTS.find(x => x.id===id); const l = S.edicts[id]||0;
  if (l >= e.max || S.jelly < e.cost(l)) return false;
  S.jelly -= e.cost(l); S.edicts[id] = l+1; return true;
}

