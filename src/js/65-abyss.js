/* ---------- The Abyss (endgame after the first Supercolony) ----------
   An endless dig downward. Each depth is guarded by a creature you fight on the hill:
   30 seconds, every tap (and every drone tap) hits it. Win to go one depth deeper and
   earn Abyssal Shards; shards buy Primordial Packs. Every 10th depth is a Matriarch
   (big shard haul + a Primordial Pack); every 15th raises a Primordial card.
   Guardian health grows about 3.2x per depth, so the depth you can reach tracks how
   strong the current colony is, and keeps going for as long as the numbers do.
   Five torches a day (one fight each). Depth, shards and cards survive every reset. */
const ABYSS_TORCHES = 5, ABYSS_SECS = 30, ABYSS_TORCH_AMBER = 25, ABYSS_EXTRA_CAP = 2;
const GUARD_MINOR = ['Mole Cricket Sentinel','Blind Cave Beetle','Root Wyrm','Termite Inquisitor','Velvet Worm','Cave Centipede','Pale Mantis','Bone Weevil','Glow-Worm Choir'];
const GUARD_BOSS = ['The Clay Matriarch','The Fossil Matriarch','The Magma Matriarch','The Iron-Core Matriarch','The Matriarch of Echoes','The Last Matriarch'];
function abyssUnlocked(){ return (S.supers||0) >= 1; }
function guardianHP(d){ return 300 * Math.pow(10, (d - 1) / 2); }
function guardianName(d){ return d % 10 === 0 ? GUARD_BOSS[(d/10 - 1) % GUARD_BOSS.length] + (d > 60 ? ' ' + ROMAN[Math.min(5, Math.floor((d-1)/60))] : '') : GUARD_MINOR[(d - 1) % GUARD_MINOR.length]; }
function guardianShards(d){ return 4 + Math.floor(d / 5) + (d % 10 === 0 ? 20 : 0); }
function abyssDay(){ const a = S.abyss, k = dayKey(Date.now()); if (a.day !== k){ a.day = k; a.torches = Math.max(a.torches, ABYSS_TORCHES); a.extra = 0; } return a; }
// Rough damage a player deals in one fight: ~6 taps/s with fervor near its peak, plus drones.
function abyssEstimate(){ return D.tapValue * (1 + (D.fervMax - 1) * .8) * 6 * ABYSS_SECS * D.abyssMult + D.drones * D.tapValue * ABYSS_SECS * D.abyssMult; }
function startGuardian(){
  const a = abyssDay(); if (!abyssUnlocked() || a.torches <= 0) return;
  if (colony.busy() || activeEvent){ toast('The hill is busy', 'Deal with what is on the hill first, then descend.', 'bad', 'warn'); return; }
  const d = a.depth + 1;
  a.torches--;
  colony.spawnGuardian({depth: d, name: guardianName(d), hp: guardianHP(d), boss: d % 10 === 0, secs: ABYSS_SECS});
  nextEventAt = Math.max(nextEventAt, Date.now() + 60000);
  toast(d % 10 === 0 ? 'A Matriarch rises!' : 'A guardian rises!', `${guardianName(d)} blocks depth ${d}. Tap the hill for 30 seconds!`, 'bad', 'swords');
  Sound.alert(); buzz([60,40,60]); save(); render();
}
function guardianWon(d){
  const a = S.abyss; a.depth = Math.max(a.depth, d); a.wins++;
  const sh = guardianShards(d); a.shards += sh; merit(30);
  let extra = '';
  if (d % 10 === 0){ S.packs.primordial = (S.packs.primordial||0) + 1; extra += ' and a Primordial Pack'; }
  if (d % 15 === 0){
    const missing = CARDS.filter(c => c.r === 'P' && !S.cards[c.id]);
    if (missing.length){ const c = missing[Math.floor(Math.random()*missing.length)]; grantCard(c.id); D = derive(S);
      showModal('From the deep', c.name, `A Primordial card rises at depth ${d}. ${cardFx(c, 1)}.`, 'Bow to it'); }
    else { S.packs.primordial = (S.packs.primordial||0) + 1; extra += ' and a Primordial Pack'; }
  }
  toast(`Depth ${d} cleared`, `+${sh} Abyssal Shards${extra}.`, 'gold', 'swords'); Sound.stamp(); buzz([30,30,80]);
  save(); if (tab === 'raids') render();
}
function guardianLost(d, frac){
  toast('The guardian holds', `You dealt ${Math.round(frac*100)}% of its health. Grow the colony, or try Mandible Oil and a full fervor meter.`, 'bad', 'down'); Sound.bad();
  save(); if (tab === 'raids') render();
}
let torchBusy = false;
async function buyTorch(how){
  const a = abyssDay(); if (torchBusy) return;
  if (how === 'ad'){
    if (a.extra >= ABYSS_EXTRA_CAP) return;
    torchBusy = true; const ok = adFree() ? true : await Monetize.showRewarded('torch'); torchBusy = false;
    if (!ok) return; a.extra++; a.torches++;
  } else {
    if (S.gems < ABYSS_TORCH_AMBER){ toast('Not enough amber', `A torch costs ${ABYSS_TORCH_AMBER} amber.`, 'bad', 'gem'); return; }
    S.gems -= ABYSS_TORCH_AMBER; a.torches++;
  }
  toast('Torch lit', 'One more descent into the Abyss.', 'gold', 'sun'); Sound.good(); afterChange(); render();
}
function buyPrimPack(){
  const a = S.abyss, pk = PACKS.primordial;
  if (a.shards < pk.shards){ toast('Not enough shards', `A Primordial Pack costs ${pk.shards} Abyssal Shards.`, 'bad', 'star'); return; }
  a.shards -= pk.shards; S.packs.primordial = (S.packs.primordial||0) + 1;
  toast('Primordial Pack', 'Added. Open it in Cards.', 'gold', 'cards'); Sound.buy(); afterChange(); render();
}
function abyssHTML(){
  if (!abyssUnlocked()) return `<div class="abyss-head locked-abyss"><div class="ph-eyebrow">THE ABYSS · SEALED</div><div class="abyss-title">Something is down there</div>
    <p>Form your first <b>Supercolony</b> (Flight tab) to break the seal. Below the hill wait endless depths, guardians to fight, Abyssal Shards, and the six <b>Primordial</b> cards, the rarest in the Republic.</p></div>`;
  const a = abyssDay(), d = a.depth + 1, hp = guardianHP(d), est = abyssEstimate(), frac = Math.min(1, est / hp);
  const fighting = colony.guardianActive();
  const nextBoss = Math.ceil(d / 10) * 10, nextPrim = Math.ceil(d / 15) * 15;
  const primLeft = CARDS.filter(c => c.r === 'P' && !S.cards[c.id]).length;
  const chance = frac >= 1 ? 'Likely win' : frac >= .7 ? 'Close fight' : frac >= .35 ? 'Hard' : 'Out of reach for now';
  let html = `<div class="abyss-head"><div class="abyss-top"><div><div class="ph-eyebrow">THE ABYSS</div><div class="abyss-title">Depth ${a.depth} cleared</div></div>
    <div class="abyss-res"><span>${icon('sun')}<b>${a.torches}</b> torch${a.torches === 1 ? '' : 'es'}</span><span>${icon('star')}<b>${fmt(a.shards)}</b> shards</span></div></div>
    <div class="guard ${d % 10 === 0 ? 'boss' : ''}"><div class="guard-ic">${icon(d % 10 === 0 ? 'crown' : 'bug')}</div>
      <div class="row-main"><div class="guard-eyebrow">DEPTH ${d}${d % 10 === 0 ? ' · MATRIARCH' : ''}</div><div class="guard-name">${guardianName(d)}</div>
      <div class="guard-hp">Health <b>${fmt(hp)}</b> · your 30 seconds ≈ <b>${fmt(est)}</b></div>
      <div class="guard-bar"><div style="width:${(frac*100).toFixed(1)}%"></div></div>
      <div class="guard-odds ${frac >= 1 ? 'good' : frac >= .7 ? 'close' : 'bad'}">${chance}</div></div></div>
    <button class="btn abyss-go" data-descend ${a.torches > 0 && !fighting ? '' : 'disabled'}>${fighting ? 'Fight in progress: tap the hill!' : a.torches > 0 ? `Descend · 1 torch` : 'No torches left today'}</button>
    <div class="abyss-reward">Win: +${guardianShards(d)} shards${d % 10 === 0 ? ' + Primordial Pack' : ''}${d % 15 === 0 && primLeft ? ' + a Primordial card' : ''}</div></div>`;
  html += `<div class="srow"><div class="si" style="color:var(--crumb-deep)">${icon('sun')}</div><div class="row-main"><div class="row-name">Extra torch</div><div class="row-sub">Five torches return every day. ${ABYSS_EXTRA_CAP - a.extra} free extra left today.</div></div>
    <div class="torch-btns"><button class="gbtn ${adFree() ? 'free' : 'ad'}" data-torch="ad" ${a.extra < ABYSS_EXTRA_CAP ? '' : 'disabled'}>${adFree() ? 'Claim' : icon('play') + 'Watch'}</button><button class="gbtn" data-torch="amber">${icon('gem')}${ABYSS_TORCH_AMBER}</button></div></div>`;
  html += `<div class="srow"><div class="si" style="color:var(--r-p)">${icon('cards')}</div><div class="row-main"><div class="row-name">Primordial Pack</div><div class="row-sub">3 cards: epic or better, 2% Primordial per card. One is guaranteed by your ${PRIM_PITY}th pack (${Math.max(1, PRIM_PITY - a.ppity)} to go).</div></div>
    <button class="gbtn prim" data-primpack ${a.shards >= PACKS.primordial.shards ? '' : 'disabled'}>${icon('star')}${PACKS.primordial.shards}</button></div>`;
  html += `<div class="shop-sec">Milestones</div><div class="abyss-miles">
    <div><b>Depth ${nextBoss}</b><span>${guardianName(nextBoss)}: +${guardianShards(nextBoss)} shards and a Primordial Pack</span></div>
    <div><b>Depth ${nextPrim}</b><span>${primLeft ? 'A Primordial card rises' : 'All six Primordials found: a Primordial Pack instead'}</span></div></div>`;
  html += `<div class="locked">Each depth is about 3× tougher than the last, so your reach grows with the colony: dive deep late in a run, when taps hit hardest. Taps get stronger with Solidarity Tapping research, fervor, Mandible Oil and tap cards. Drones fight too. Depth, shards and Primordial cards are kept through every flight and Supercolony.</div>`;
  return html;
}

