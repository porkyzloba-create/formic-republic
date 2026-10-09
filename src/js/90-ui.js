/* ============================================================
   UI
   ============================================================ */
const HEADLINES = [
  'Glorious harvest: crumb output up 400% since last Tuesday',
  'Queen thanks workers for voluntary 24-hour shifts',
  'Neighbouring wasp regime condemned for decadent individualism',
  'Aphid herds report record milk yields, aphids unavailable for comment',
  'Ministry reminds citizens: the trail is the truth',
  'Beetle tractors exceed quota, beetles exceed patience',
  'Rumours of a "picnic" on the surface are bourgeois propaganda',
  'Fungus Kolkhoz celebrates 1,000 days without a single individual thought',
  'Hive-Mind Politburo votes 10,000 to 0, again',
  'Reminder: carrying ten times your body weight is a privilege',
  'Anteaters are a myth spread by the capitalist ladybird press',
  'Five-Year Plan completed in four days, new Five-Year Plan announced',
  'Kitchen Floor raid declared "a brilliant liberation of crumbs"',
  'Winter cancelled by decree; winter proceeds anyway',
  'Moon confirmed 0% cheese, 100% ours',
  'Amber reserves at record high; Ministry denies hoarding',
  'Revolution Pass launched: freedom, now available in two tracks',
  'Legendary Queen Mother card spotted; collectors faint',
];
function buildTicker(){
  const html = HEADLINES.map(h => `<span>★ ${h}</span>`).join('');
  $('ticker').innerHTML = html + html;
}

function toast(title, text, tone, ic){
  const box = $('toasts');
  const el = document.createElement('div');
  el.className = 'toast ' + (tone||'');
  const fallback = {good:'up', bad:'warn', gold:'crumb', jelly:'drop', medal:'star'}[tone] || 'scroll';
  el.innerHTML = `<div class="ti">${icon(ic || fallback)}</div><div><b></b><span></span></div>`;
  el.querySelector('b').textContent = title; el.querySelector('span').textContent = text;
  box.appendChild(el);
  while (box.children.length > 2) box.firstChild.remove();
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, 3600);
}

function visibleProducers(){
  let maxIdx = 0;
  PRODUCERS.forEach((p,i) => { if ((S.owned[p.id]||0) > 0 || S.run >= p.base*0.6) maxIdx = Math.max(maxIdx, i+1); });
  return Math.min(maxIdx, S.doctrine.expansion ? PRODUCERS.length-1 : 10);
}
function etaText(cost){
  if (cost <= S.crumbs) return 'ready';
  if (D.cps <= 0) return 'tap to earn';
  return 'in ' + fmtTime((cost - S.crumbs) / D.cps);
}
function bestValueId(){
  let best = null, bestPay = Infinity;
  PRODUCERS.slice(0, visibleProducers()+1).forEach(p => {
    const c = costOf(p, S.owned[p.id]||0, 1), pay = c / D.each[p.id];
    if (pay < bestPay){ bestPay = pay; best = p.id; }
  });
  return best;
}
function rowSide(extra){
  return `<div class="row-side">${extra||''}<div class="price" data-cost></div><div class="eta" data-eta></div></div><div class="fill" data-fill></div>`;
}
function setRow(row, cost, label){
  const ready = cost <= S.crumbs + 1e-9;
  row.classList.toggle('ready', ready);
  row.setAttribute('aria-disabled', !ready);
  row.querySelector('[data-cost]').textContent = (ready ? 'BUY ' : '') + label;
  row.querySelector('[data-eta]').textContent = etaText(cost);
  row.querySelector('[data-fill]').style.width = Math.min(100, S.crumbs/cost*100) + '%';
}

/* Hill tab: scrolling the list down tucks the hill into a strip; scrolling (or pulling) back
   to the top brings the big hill back. A short lock after each change stops the list's own
   resize from flipping it straight back. */
let hillCompact = false, compactLock = 0, lastListTop = 0, touchY = null;
function setCompact(v){
  if (hillCompact === v) return;
  hillCompact = v; compactLock = performance.now() + 400;
  document.querySelector('.app').classList.toggle('compact', v);
}
function onListScroll(){
  const t = $('list').scrollTop, up = t < lastListTop; lastListTop = t;
  if (GROUP_OF[tab] !== 'hill' || performance.now() < compactLock) return;
  if (!hillCompact && t > 30) setCompact(true);
  else if (hillCompact && up && t <= 2) setCompact(false);
}
function expandAtTop(){ if (hillCompact && $('list').scrollTop <= 0 && performance.now() > compactLock) setCompact(false); }

function render(){
  const grp = GROUP_OF[tab] || 'hill';
  if (grp !== 'hill' || $('list').dataset.tab !== tab){ setCompact(false); $('list').dataset.tab = tab; } document.querySelector('.app').dataset.group = grp; if (lastIn[grp] !== undefined) lastIn[grp] = tab;
  const sub = $('subbar'), list = $('list');
  sub.hidden = false;
  if (tab === 'castes'){
    sub.innerHTML = `<span id="aff-c"></span>
      <div class="seg" role="group" aria-label="Buy amount">
        ${[1,10,'max'].map(n => `<button data-n="${n}" aria-pressed="${buyN===n}">${n==='max'?'Max':'×'+n}</button>`).join('')}
      </div>`;
    const last = visibleProducers();
    let html = '';
    PRODUCERS.slice(0, last+1).forEach(p => {
      html += `<button class="row caste" data-buy="${p.id}" id="row-${p.id}" style="--cc:${p.color}" title="${p.slogan}">
        <div class="ctile"><b data-owned></b></div>
        <div class="row-main">
          <div class="row-name">${p.name}<span class="tag" data-best hidden>BEST VALUE</span></div>
          <div class="row-meta" data-meta></div>
        </div>
        ${rowSide()}
      </button>`;
    });
    if (last < PRODUCERS.length-1){
      const nx = PRODUCERS[last+1];
      html += (last >= 10 && !S.doctrine.expansion) ? `<div class="locked">Three more castes exist beyond the Dyson Swarm. Unlock them with the <b>Hive Expansion</b> doctrine (Flight, then Supercolony).</div>` : `<div class="locked">Next caste revealed at <b>${fmt(nx.base*0.6)}</b> crumbs gathered this colony.</div>`;
    }
    if (PLATFORM.id === 'web') html += devHTML();
    list.innerHTML = html;
  } else if (tab === 'research'){
    sub.innerHTML = `<span id="aff-r"></span><span>${S.bought.length} / ${UPGRADES.length} complete</span>`;
    const avail = availableUpgrades(S);
    let html = avail.map(u => `<button class="row" data-upg="${u.id}" id="row-${u.id}">
        <div class="row-main">
          <div class="row-target">${u.target}</div>
          <div class="row-name">${u.name}</div>
          <div class="row-sub">${u.desc}</div>
        </div>
        ${rowSide()}
      </button>`).join('');
    html = (S.chal === 'burning' ? '<div class="locked"><b>Book Burning:</b> the Lab is closed during this hardship.</div>' : (S.flights || S.supers || S.run >= 5e4 || S.bought.length >= 8) ? repeatHTML() : '') + html;
    const nl = nextLockedUpgrade(S);
    if (!avail.length) html += `<div class="locked">No research ready. Grow the colony to fund the Institute.</div>`;
    if (nl) html += `<div class="locked">Next discovery: <b>${nl.name}</b> · ${nl.req}.</div>`;
    list.innerHTML = html;
  } else if (tab === 'raids'){
    const segR = segHTML('raids', [['raids','Raids'],['war','Conquest'],['abyss','Abyss']]);
    if (sect.raids === 'abyss'){ sub.innerHTML = segR + (abyssUnlocked() ? `<span>${icon('star')} <b>${fmt(S.abyss.shards)}</b></span>` : ''); list.innerHTML = abyssHTML(); list.dataset.ak = ''; refresh(); return; }
    if (sect.raids === 'war'){ sub.innerHTML = segR + `<span id="w-sum"></span>`; list.innerHTML = warHTML(); refresh(); return; }
    sub.innerHTML = segR + `<span id="r-home"></span>`;
    list.innerHTML = EXPEDITIONS.map(x => `<div class="raid" id="raid-${x.id}">
        <div class="raid-head"><div class="raid-icon">${icon(x.icon)}</div>
          <div class="row-main"><div class="row-name">${x.name}</div><div class="row-sub">${x.flavor}</div></div></div>
        <div class="chips">
          <span class="chip">${icon('clock')}<span data-dur></span></span>
          <span class="chip">${icon('ant')}${x.squad} foragers</span>
          <span class="chip c">${icon('crumb')}<span data-loot></span></span>
          ${x.jelly ? `<span class="chip j">${icon('drop')}${x.jelly >= 1 ? '1–2 jelly' : Math.round(x.jelly*100) + '% jelly'}</span>` : ''}
        </div>
        <div class="raid-act" data-act></div>
      </div>`).join('') + `<div class="locked">Squads keep marching while the app is closed. Foragers on a raid don't gather crumbs at home.</div>`;
  } else if (tab === 'cards'){
    const owned = Object.keys(S.cards).length;
    const visibleCards = CARDS.filter(c => (c.r !== 'M' && c.r !== 'P') || S.cards[c.id]);
    const hiddenMyth = CARDS.filter(c => c.r === 'M' && !S.cards[c.id]).length;
    const hiddenPrim = CARDS.filter(c => c.r === 'P' && !S.cards[c.id]).length;
    sub.hidden = true;
    const packs = Object.entries(PACKS).filter(([k]) => S.packs[k] > 0);
    const totalPacks = packs.reduce((a,[k]) => a + S.packs[k], 0);
    const byR = {}; for (const id in S.cards){ const r = CARD_BY_ID[id].r; byR[r] = (byR[r]||0) + 1; }
    const total = visibleCards.length;
    let html = `<div class="cmeter">
      <div class="cm-top"><span class="cm-t">Collection</span><span class="cm-n"><b>${owned}</b> / ${total}${hiddenMyth ? '+?' : ''}</span></div>
      <div class="cm-bar">${RAR_ORDER.filter(r => byR[r]).map(r => `<i class="${r}" style="width:${byR[r]/Math.max(total,owned)*100}%"></i>`).join('')}</div>
      <div class="cm-leg">${RAR_ORDER.filter(r => byR[r]).map(r => `<span class="${r}"><i></i>${byR[r]} ${RARITY[r].name.toLowerCase()}</span>`).join('')}<span class="cm-pity">Legendary in ≤ ${Math.max(1, PITY - (S.pity||0))} packs</span></div>
    </div>`;
    if (packs.length){
      html += `<div class="pshelf">${packs.map(([k,p]) => `<button class="ptile2" data-open="${k}" style="--pc:${p.color}" aria-label="Open ${p.name}">
          <span class="pk2"><span class="pk2-s">${icon('cards')}</span><em>×${fmt(S.packs[k])}</em></span>
          <span class="pt2"><b>${p.name}</b><small>${p.n} cards${p.guar ? ' · ' + RARITY[p.guar].name.toLowerCase() + '+' : ''}</small><span class="pt2-go">Open</span></span>
        </button>`).join('')}</div>`;
      if (totalPacks > 1) html += `<button class="btn gold openall2" data-openall="${packs.length === 1 ? packs[0][0] : '*'}">Open all ${fmt(Math.min(totalPacks, 1000))} packs</button>`;
    } else html += `<button class="belt-empty" data-goto="shop">${icon('bag')} No packs to open · get them in the Shop or Pass</button>`;
    const FILTERS = [['all','All'],['C','Common'],['R','Rare'],['E','Epic'],['L','Legend+']];
    html += `<div class="cfilter" role="group" aria-label="Filter by rarity">${FILTERS.map(([k,l]) => `<button data-cfilter="${k}" aria-pressed="${cardFilter===k}">${l}</button>`).join('')}</div>`;
    const shown = visibleCards.filter(c => cardFilter === 'all' || (cardFilter === 'L' ? 'LMP'.includes(c.r) : c.r === cardFilter));
    html += `<div class="cgrid">${shown.map(c => cardHTML(c, S.cards[c.id]||0)).join('')}</div>`;
    if (hiddenPrim) html += `<div class="secret prim"><b>${hiddenPrim} Primordial card${hiddenPrim>1?'s':''}</b> sleep${hiddenPrim>1?'':'s'} beneath the hill, rarer and stronger than any Mythic. ${primUnlocked() ? `Dig for them in the <b>Abyss</b> (Raids tab): every 15 depths raises one, and Primordial Packs bought with Abyssal Shards hold them at 2% a card.` : `They stir only once a <b>Supercolony</b> opens the Abyss.`}</div>`;
    if (hiddenMyth) html += `<div class="secret"><b>${hiddenMyth} secret Mythic card${hiddenMyth>1?'s':''}</b> are hidden in the packs, far more powerful than any legendary. Rumour says some only stir after a <b>Supercolony</b> is formed, and others only after the colony survives <b>hardships</b>.</div>`;
    html += `<div class="locked">Each level needs as many copies as the card's current level (level 5 to 6 takes 5 copies), up to level ${CARD_MAX}. Copies of a maxed card turn into amber. Cards survive the Nuptial Flight.</div>`;
    list.innerHTML = html;
  } else if (tab === 'pass'){
    sub.hidden = true;
    let html = `<div class="pass-head">
      <div class="ph-top"><div><div class="ph-eyebrow" id="ph-eye"></div><div class="ph-title" id="ph-name"></div></div><div class="ph-tier" id="ph-tier"></div></div>
      <div class="xpbar"><div id="ph-bar"></div></div>
      <div class="ph-xp"><span id="ph-xp"></span><span id="ph-next"></span></div>
      <div class="ph-how">Earn merit by tapping, filling quotas, raiding, resolving incidents, raiding picnics, opening packs, earning medals and attending the Party Congress.</div>
      ${S.pass.premium ? `<div class="ph-perks on">${icon('ticket')}<span><b>Premium active</b> +50% merit · +10% output this season</span></div>` : `<div class="ph-perks">${icon('ticket')}<span><b>Premium:</b> +50% merit · +10% output all season · a free Politburo Pack now · 7 Politburo Packs, 560 amber and 8 jelly on the track</span></div>`}
      <div class="ph-btns"><button class="gbtn" id="ph-prem"></button><button class="btn gold" id="ph-all"></button></div>
    </div>
    <div class="tracks-h"><span>TIER</span><span>FREE</span><span>PREMIUM</span></div>`;
    for (let t = 1; t <= PASS_TIERS; t++){
      const f = passReward(t, false), p = passReward(t, true);
      html += `<div class="tier" id="tier-${t}"><div class="tn">${t}</div>
        <div class="rw" data-claim="${t}" data-prem="0"><div class="ri">${icon(rewardIcon(f))}</div><span>${rewardText(f)}<em></em></span></div>
        <div class="rw prem" data-claim="${t}" data-prem="1"><div class="ri">${icon(rewardIcon(p))}</div><span>${rewardText(p)}<em></em></span></div></div>`;
    }
    html += `<div class="locked">After tier ${PASS_TIERS}, every ${BONUS_XP} merit earns a bonus Brigade Pack (a Politburo Pack with premium).</div>`;
    list.innerHTML = html;
  } else if (tab === 'shop'){
    sub.innerHTML = `<div class="seg" role="group" aria-label="Buy amount">${[1,10,100,'max'].map(n => `<button data-shopn="${n}" aria-pressed="${shopN===n}">${n==='max' ? 'Max' : '×' + n}</button>`).join('')}</div><span style="color:var(--gem);display:inline-flex;gap:4px;align-items:center">${icon('gem')}<b style="color:var(--gem)" id="shop-gems"></b> amber</span>`;
    const party = S.iap.owned.party, claimLbl = adFree();
    let html = ['starter','amber1','amber2','amber3','amber4','amber5','party','pass'].some(sold) ? `<div class="shop-sec">Amber store</div>` : '';
    if (!S.iap.owned.starter && sold('starter')) html += `<div class="offer"><div class="of-ic">${icon('gift')}</div><div class="row-main"><div class="of-tag">One-time offer</div><div class="row-name">${IAP.starter.name}</div><div class="row-sub">${IAP.starter.desc}</div></div><button class="gbtn cash" data-iap="starter">${IAP.starter.price}</button></div>`;
    html += `<div class="amber5">${['amber1','amber2','amber3','amber4','amber5'].filter(sold).map((k,i) => { const it = IAP[k], first = !S.iap.first[k];
      return `<div class="atile${it.tag ? ' hot' : ''}">${it.tag ? `<span class="atag">${it.tag}</span>` : ''}<span class="agem" style="font-size:${18+i*3}px">${icon('gem')}</span><div class="an">${fmt(it.amber)}</div><div class="ab">${it.bonus ? '+' + fmt(it.bonus) + ' bonus' : '&nbsp;'}</div>${first ? '<div class="dbl">\u00d72 first buy</div>' : '<div class="dbl off">&nbsp;</div>'}<button class="gbtn cash" data-iap="${k}">${it.price}</button></div>`; }).join('')}</div>`;
    if (sold('autotap')) html += S.iap.owned.autotap
      ? `<div class="srow"><div class="si" style="color:var(--crumb-deep)">${icon('ant')}</div><div class="row-main"><div class="row-name">${IAP.autotap.name}</div><div class="row-sub">Owned. ${S.auto.on ? 'Tapping 8 times a second.' : 'Switched off.'}</div></div><button class="gbtn ${S.auto.on ? 'free' : ''}" data-autotoggle>${S.auto.on ? 'ON' : 'OFF'}</button></div>`
      : `<div class="srow"><div class="si" style="color:var(--crumb-deep)">${icon('ant')}</div><div class="row-main"><div class="row-name">${IAP.autotap.name}</div><div class="row-sub">${IAP.autotap.desc}</div></div><button class="gbtn cash" data-iap="autotap">${IAP.autotap.price}</button></div>`;
    if (sold('party')) html += `<div class="srow"><div class="si" style="color:var(--banner)">${icon('star')}</div><div class="row-main"><div class="row-name">${IAP.party.name}</div><div class="row-sub">${IAP.party.desc}</div></div><button class="gbtn cash" data-iap="party" ${party ? 'disabled' : ''}>${party ? 'OWNED' : IAP.party.price}</button></div>`;
    if (!S.pass.premium && sold('pass')) html += `<div class="srow"><div class="si" style="color:var(--gem)">${icon('ticket')}</div><div class="row-main"><div class="row-name">${IAP.pass.name}</div><div class="row-sub">${IAP.pass.desc}</div></div><button class="gbtn cash" data-iap="pass">${IAP.pass.price}</button></div>`;
    html += `<div class="shop-sec">Free rewards</div>`;
    html += `<div class="srow lottery"><div class="si" style="color:var(--banner)">${icon('crown')}</div><div class="row-main"><div class="row-name">The Queen's Lottery</div><div class="row-sub">One free spin every day, two more for broadcasts. Jackpot: 300 amber.</div></div><button class="gbtn ${spinFree() ? 'free' : ''}" data-spin>${spinFree() ? 'FREE SPIN' : 'Spin'}</button></div>`;
    html += `<div class="srow"><div class="si" style="color:var(--leaf)">${icon('gift')}</div><div class="row-main"><div class="row-name">Daily Ration</div><div class="row-sub">A free Worker Pack, once a day.</div></div><button class="gbtn free" data-shop="ration"></button></div>`;
    html += Object.entries(AD_REWARDS).map(([k,r]) => { const left = adLeft(k);
      return `<div class="srow"><div class="si" style="color:var(--leaf)">${icon(r.icon)}</div><div class="row-main"><div class="row-name">${r.name}</div><div class="row-sub">${r.desc} \u00b7 ${left} of ${r.cap} left today</div></div><button class="gbtn ad" data-ad="${k}" ${left ? '' : 'disabled'}>${left ? (claimLbl ? 'Claim' : icon('play') + 'Watch') : 'Tomorrow'}</button></div>`; }).join('');
    html += `<div class="shop-sec">Card packs</div><div class="packs3">${Object.entries(PACKS).filter(([,p]) => p.price).map(([k,p]) => `<div class="ptile"><span class="pk" style="--rc:${p.color}">${icon('cards')}</span><div class="pn">${p.name}</div><div class="pd">${p.n} cards${p.guar ? `<br>1 ${RARITY[p.guar].name} or better` : '<br>&nbsp;'}</div><button class="gbtn" data-shop="pack" data-id="${k}">${icon('gem')}${p.price}</button></div>`).join('')}</div>`;
    html += `<div class="odds">Drop rate per card (common / rare / epic / legendary / mythic / primordial)<br>${Object.values(PACKS).map(p => `${p.name}: ${RAR_ORDER.map(r => +((p.odds[r]||0)*100).toFixed(2) + '%').join(' / ')}`).join('<br>')}<br>Primordial cards drop only after your first Supercolony; before that they count as legendary.<br>A legendary is guaranteed by your ${PITY}th pack without one.</div>`;
    html += `<div class="shop-sec">Usables</div>` + USE_ORDER.map(k => { const u = USABLES[k]; return `<div class="srow"><div class="si">${icon(u.icon)}</div><div class="row-main"><div class="row-name">${u.name}</div><div class="row-sub">${u.desc}</div><div class="own" data-own="${k}"></div></div><button class="gbtn" data-shop="use" data-id="${k}">${icon('gem')}${u.price}</button></div>`; }).join('');
    html += `<div class="shop-sec">Treasury</div>
      <div class="srow"><div class="si" style="color:var(--gem)">${icon('ticket')}</div><div class="row-main"><div class="row-name">Revolution Pass Premium</div><div class="row-sub">Unlocks the premium track: Brigade and Politburo packs, extra amber and the legendary Great Helmsman.</div></div><button class="gbtn" data-shop="premium">${icon('gem')}${PREMIUM_COST}</button></div>
      <div class="srow"><div class="si" style="color:var(--jelly)">${icon('drop')}</div><div class="row-main"><div class="row-name">Royal Jelly</div><div class="row-sub">One jar for the Queen's Edicts.</div></div><button class="gbtn" data-shop="jelly">${icon('gem')}80</button></div>
      <div class="srow"><div class="si">${icon('crumb')}</div><div class="row-main"><div class="row-name">Crumb Exchange</div><div class="row-sub" id="ex-sub"></div></div><button class="gbtn" style="background:var(--crumb)" data-shop="exchange">+10 ${icon('gem')}</button></div>`;
    html += `<div class="locked">Amber is also earned by playing: medals, quotas, raids, the Pass, Party Congress days, anteater fights and lucky picnics.${Monetize.test ? '<br><b>Browser preview:</b> ads and purchases are simulated and nothing is ever charged.' : ''}</div>`;
    if (PLATFORM.restore) html += `<div style="padding:4px 12px 14px"><button class="btn ghost" style="width:100%" id="restore">Restore purchases</button></div>`;
    html += privacyLinks();
    list.innerHTML = html;
  } else if (tab === 'ranks' || tab === 'alliance'){
    sub.hidden = true;
    if (Online.status === 'idle') Online.init();
    Online.load(tab === 'alliance' ? 'mine' : Online.view === 'alliances' ? 'alliances' : 'players');
    if (tab === 'ranks' && Online.view === 'alliances' && Online.acct() && !Online.mine) Online.load('mine');
    const st = list.scrollTop;
    list.innerHTML = tab === 'ranks' ? ranksHTML() : allianceHTML();
    list.scrollTop = st;
  } else if (tab === 'medals' && sect.goals === 'dir'){
    sub.innerHTML = `<span>Three new orders every day</span><span><b>${dirClaimable()}</b> to claim</span>`;
    list.innerHTML = dirHTML();
  } else if (tab === 'medals'){
    S.seenMedals = S.medals.length;
    sub.innerHTML = `<span><b>${S.medals.length}</b> of ${MEDALS.length} medals</span><span>+${S.medals.length}% to all output</span>`;
    list.innerHTML = `<div class="medals">${MEDALS.map(m => {
      const won = S.medals.includes(m.id);
      const pct = won ? 100 : Math.min(100, (m.cur(S, D)||0) / m.target * 100);
      return `<div class="medal ${won?'won':''}"><div class="disc" aria-hidden="true">${icon('star')}</div>
        <div style="min-width:0"><div class="mn">${m.name}</div><div class="mr">${m.req}</div>${won ? '' : `<div class="mp"><div style="width:${pct}%"></div></div>`}</div></div>`;
    }).join('')}</div>`;
  } else {
    sub.innerHTML = segHTML('flight', [['flight','Flight'],['super','Supercolony'],['hard','Hardships']]);
    if (sect.flight === 'super'){ list.innerHTML = superHTML(); refresh(); return; }
    if (sect.flight === 'hard'){ list.innerHTML = hardHTML(); refresh(); return; }
    list.innerHTML = `<div class="flight">
      <div class="fl-hero">
        <div class="fl-top"><div class="fl-ic">${icon('wing')}</div><div><div class="fl-eye">Prestige · start a new colony</div><h2>The Nuptial Flight</h2></div></div>
        <div class="fl-gain"><span>Pheromones from a flight now</span><b id="f-gain"></b></div>
        <div class="fl-stats">
          <div><span>Held</span><b id="f-held"></b></div>
          <div><span>Bonus now</span><b id="f-bonus"></b></div>
          <div class="w"><span>Next pheromone at</span><b id="f-next"></b></div>
        </div>
        <button class="btn" id="f-btn"></button>
      </div>
      <div class="fl-trade">
        <div class="fl-col keep"><b>You keep</b><span>Pheromones · +4% to every caste each</span><span>Royal jelly equal to pheromones</span><span>Cards, medals, amber</span></div>
        <div class="fl-col lose"><b>You lose</b><span>Crumbs and castes</span><span>Research</span><span>Squads out raiding</span></div>
      </div>
      <div class="sec-h"><h3>Queen's Edicts</h3><span class="jpill">${icon('drop')}<b id="f-jelly"></b></span></div>
      <p>Permanent laws paid for in royal jelly. Earn more from flights, every 5th quota, Party Congress days, raids and lucky incidents.</p>
      <div class="edicts">${EDICTS.map(e => `<button class="row edict" data-edict="${e.id}" id="row-ed-${e.id}">
          <div class="row-main"><div class="row-name">${e.name}</div><div class="row-sub" data-desc></div><div class="lvl" data-lvl></div></div>
          <div class="row-side"><div class="price" data-cost></div></div>
        </button>`).join('')}</div>
      <div class="sec-h"><h3 class="ink">Colony record</h3></div>
      <dl class="ledger record">
        <dt>Crumbs ever gathered</dt><dd id="f-life" data-l="Crumbs ever gathered"></dd>
        <dt>Flights taken</dt><dd id="f-flights" data-l="Flights taken"></dd>
        <dt>Taps</dt><dd id="f-taps" data-l="Taps"></dd>
        <dt>Picnics raided</dt><dd id="f-picnics" data-l="Picnics raided"></dd>
        <dt>Raids completed</dt><dd id="f-raids" data-l="Raids completed"></dd>
        <dt>Incidents resolved</dt><dd id="f-inc" data-l="Incidents resolved"></dd>
        <dt>Quotas fulfilled</dt><dd id="f-quota" data-l="Quotas fulfilled"></dd>
        <dt>Congress streak (best)</dt><dd id="f-streak" data-l="Congress streak (best)"></dd>
      </dl>
      <button class="gbtn big share-btn" data-share="record">${icon('up')} Share my colony</button>
      <button class="btn ghost" id="f-wipe"></button>
      ${privacyPanelHTML()}
    </div>`;
  }
  refresh();
}

function countAffordable(){
  let c = 0;
  PRODUCERS.slice(0, visibleProducers()+1).forEach(p => { if (costOf(p, S.owned[p.id]||0, 1) <= S.crumbs) c++; });
  const r = availableUpgrades(S).filter(u => upgCost(u) <= S.crumbs).length;
  const e = EDICTS.filter(x => (S.edicts[x.id]||0) < x.max && x.cost(S.edicts[x.id]||0) <= S.jelly).length;
  return {c, r, e};
}
function setTab(id, label, badge){
  const el = $(id); const key = label + badge;
  if (el.dataset.k === key) return;
  el.dataset.k = key;
  el.innerHTML = label + badge;
}

function refresh(){
  const now = Date.now();
  $('crumbs').textContent = fmt(S.crumbs);
  const cpsEl = $('cps'); cpsEl.textContent = fmt(D.cps, true);
  const prodTot = D.prodBuff * D.seasonProd;
  cpsEl.className = prodTot > 1.001 ? 'boost' : prodTot < .999 ? 'slump' : '';
  const tapEl = $('tapv'); tapEl.textContent = '+' + fmt(D.tapValue * fervMult(), true);
  tapEl.className = (D.tapBuff > 1 || D.season.tap > 1 || fervor > .05) ? 'boost' : '';
  const pc = $('pherchip');
  if (S.pher > 0){ pc.hidden = false; pc.textContent = `${fmt(S.pher)} pheromones · +${fmt(S.pher*pherRate(S)*100)}%`; } else pc.hidden = true;
  const sk = 'snd' + S.sound;
  if ($('snd').dataset.k !== sk){ $('snd').dataset.k = sk; $('snd').innerHTML = icon(S.sound ? 'sound' : 'mute'); $('snd').setAttribute('aria-pressed', S.sound); $('snd').setAttribute('aria-label', S.sound ? 'Sound on' : 'Sound off'); }

  const se = D.season;
  const seasonFx = (se.id==='winter' && D.almanac) ? 'lab −20%' : se.fx;
  $('season').innerHTML = `${icon(se.icon)}<span>${se.name.toUpperCase()} ${clock(se.left)}</span><em>${seasonFx}</em>`;

  const q = S.quota;
  if (q){
    $('q-num').textContent = S.quotaN+1;
    $('q-text').textContent = q.label;
    $('q-count').textContent = q.kind==='gather' ? `${fmt(q.progress)} / ${fmt(q.target)}` : `${Math.min(q.progress,q.target)} / ${q.target}`;
    $('q-fill').style.width = Math.min(100, q.progress/q.target*100) + '%';
    const goBtn = q.go && tab !== q.go ? `<button class="q-go" data-goto="${q.go}">Go to ${q.go === 'castes' ? 'Castes' : TAB_NAME[q.go]} ${icon('up').replace('class="i"', 'class="i" style="transform:rotate(90deg)"')}</button>` : '';
    const rk = q.reward + '|' + q.jelly + '|' + goBtn;
    if ($('q-reward').dataset.k !== rk){ $('q-reward').dataset.k = rk;
      $('q-reward').innerHTML = `<span>Reward <b>${fmt(q.reward)} crumbs</b></span>` + (q.jelly ? `<span class="j">+1 royal jelly</span>` : '') + goBtn; }
    $('quota').classList.toggle('tut', q.tut !== undefined);
  }
  $('gempill').hidden = !tabShown('shop');
  $('spinpill').hidden = !(tabShown('shop') && !tutActive() && spinFree());

  const a = countAffordable();
  const rr = raidsReady(), np = Object.values(S.packs).reduce((x,y) => x+y, 0), pcl = passClaimable();
  const newMedals = S.medals.length - (S.seenMedals||0), dc = dirClaimable();
  const B = {castes: a.c ? [a.c,''] : null, research: a.r ? [a.r,''] : null, raids: rr ? [rr,'go'] : null, cards: np ? [np,''] : null,
    pass: pcl ? [pcl,'red'] : null, shop: (S.shopDay !== dayKey(now) || spinFree()) ? [(S.shopDay !== dayKey(now) ? 1 : 0) + (spinFree() ? 1 : 0),'go'] : null,
    medals: dc ? [dc,''] : newMedals > 0 && !(tab === 'medals' && sect.goals === 'medals') ? [newMedals,'red'] : null,
    alliance: Online.chestReady() ? [Online.chestReady(),'go'] : null};
  const bHTML = b => b ? `<span class="badge ${b[1]}">${b[0]}</span>` : '';
  // bottom nav
  let navHTML = '';
  for (const [g, G] of Object.entries(GROUPS)){
    if (!G.tabs.some(tabShown)) continue;
    const on = GROUP_OF[tab] === g, badge = G.tabs.map(t => B[t]).find(Boolean);
    const nudge = !!(q && q.go && G.tabs.includes(q.go) && !on), fresh = !on && !nudge && G.tabs.some(t => freshTabs.has(t));
    navHTML += `<button class="navb${on ? ' on' : ''}${nudge ? ' nudge' : ''}${fresh ? ' fresh' : ''}" data-group="${g}" role="tab" aria-selected="${on}">${icon(G.icon)}<span>${G.label}</span>${bHTML(badge)}</button>`;
  }
  if ($('nav').dataset.k !== navHTML){ $('nav').dataset.k = navHTML; $('nav').innerHTML = navHTML; }
  // sub-tabs for Hill and Goals
  const G = GROUPS[GROUP_OF[tab]];
  let gbHTML = '';
  if (G && G.sub){
    const items = G.sub.filter(([k]) => tabShown(k.split(':')[0]));
    if (items.length > 1) gbHTML = items.map(([k, label]) => {
      const [t, sc] = k.split(':'), on = tab === t && (!sc || sect.goals === sc);
      const badge = t === 'medals' ? (sc === 'dir' ? (dc ? [dc,''] : null) : (newMedals > 0 && !on ? [newMedals,'red'] : null)) : B[t];
      const nudge = !!(q && q.go === t && tab !== t);
      return `<button class="gtab${on ? ' on' : ''}${nudge ? ' nudge' : ''}" data-gt="${k}" role="tab" aria-selected="${on}">${label}${bHTML(badge)}</button>`;
    }).join('');
  }
  const gb = $('groupbar'); gb.hidden = !gbHTML;
  if (gb.dataset.k !== gbHTML){ gb.dataset.k = gbHTML; gb.innerHTML = gbHTML; }
  if (tab === 'medals' && sect.goals === 'dir' && S.dir.list.length){
    // Redraw only when a state changes (done / claimed / chest / swap / week); otherwise just move the bars.
    const d = S.dir, k = d.day + d.list.map(x => x.kind + (x.progress >= x.target) + x.claimed).join() + d.chest + d.swapped + d.days.length + d.weekClaimed;
    if ($('list').dataset.dk !== k){ $('list').dataset.dk = k; const st = $('list').scrollTop; $('list').innerHTML = dirHTML(); $('list').scrollTop = st; }
    else d.list.forEach((x,i) => { const el = document.querySelector(`[data-di="${i}"]`); if (!el) return;
      el.querySelector('.dir-fill').style.width = Math.min(100, x.progress/x.target*100) + '%';
      el.querySelector('.dir-prog').textContent = x.kind === 'gather' ? fmt(x.progress) + ' / ' + fmt(x.target) : x.progress + ' / ' + x.target; });
  }
  const fb = $('flightbtn'), flb = $('flbadge');
  fb.hidden = !tabShown('flight'); fb.classList.toggle('on', tab === 'flight'); fb.classList.toggle('fresh', freshTabs.has('flight') && tab !== 'flight');
  const fl = (pherGain(S) >= 1 || crownGain(S) >= 1) ? '!' : a.e ? String(a.e) : '';
  flb.hidden = !fl; flb.textContent = fl; flb.className = 'badge ' + (fl === '!' ? 'red' : 'jelly');

  const gk = 'g' + Math.floor(S.gems);
  if ($('gempill').dataset.k !== gk){ $('gempill').dataset.k = gk; $('gempill').innerHTML = icon('gem') + fmt(S.gems); }
  const ik = JSON.stringify(S.inv);
  $('belt').hidden = !USE_ORDER.some(k => S.inv[k] > 0);   // shown only when there is something to use
  if ($('belt').dataset.k !== ik){
    $('belt').dataset.k = ik;
    const items = USE_ORDER.filter(k => S.inv[k] > 0);
    $('belt').innerHTML = items.length
      ? items.map(k => `<button class="use" data-use="${k}" aria-label="Use ${USABLES[k].name}: ${USABLES[k].desc}"><span class="ui">${icon(USABLES[k].icon)}</span>${USABLES[k].name}<b>${S.inv[k]}</b></button>`).join('')
      : `<button class="belt-empty" data-goto="shop">${icon('bag')} Your usables appear here · visit the Shop</button>`;
  }

  const autoChip = autoTapActive(now) ? `<span class="buff gold">${icon('ant')}AUTO <em>${AUTO_RATE}/s${S.auto.forever && S.auto.on ? '' : ' · ' + fmtTime((S.auto.until - now)/1000)}</em></span>` : '';
  $('buffs').innerHTML = autoChip + D.buffs.filter(b => b.until > now).map(b => {
    const bad = b.prod < 1 || b.tap < 1;
    const fx = [b.prod !== 1 ? `output ×${+b.prod.toFixed(2)}` : '', b.tap !== 1 ? `taps ×${b.tap}` : ''].filter(Boolean).join(' ');
    const left = (b.until-now)/1000, p = b.dur ? Math.max(0, Math.min(1, left/b.dur)) : 1;
    return `<span class="buff ${bad?'bad':b.gold?'gold':''}">${icon(bad?'down':'up')}${b.name.toUpperCase()} <em>${fx} · ${Math.ceil(left)}s</em><i style="--p:${p.toFixed(3)}"></i></span>`;
  }).join('');

  if (tab === 'castes'){
    const best = bestValueId();
    $('aff-c').innerHTML = a.c ? `<b>${a.c}</b> caste${a.c>1?'s':''} ready to hire` : 'Saving up…';
    PRODUCERS.forEach(p => {
      const row = $('row-'+p.id); if (!row) return;
      const owned = S.owned[p.id]||0;
      const n = buyN === 'max' ? Math.max(1, maxAffordable(p, owned, S.crumbs)) : buyN;
      const c = costOf(p, owned, n);
      row.dataset.n = n;
      setRow(row, c, (n>1?`×${n} `:'') + fmt(c));
      const away = p.id==='forager' ? awayForagers(S) : 0;
      row.querySelector('[data-owned]').textContent = owned;
      row.querySelector('[data-best]').hidden = p.id !== best;
      const share = D.baseCps>0 ? Math.round(D.each[p.id]*owned/D.baseCps*100) : 0;
      row.querySelector('[data-meta]').textContent = `${fmt(D.each[p.id], true)}/s each` + (owned ? ` · ${share}% of output` : '') + (away ? ` · ${away} raiding` : '');
    });
  } else if (tab === 'research'){
    $('aff-r').innerHTML = a.r ? `<b>${a.r}</b> ready to research` : (D.season.research < 1 ? 'Winter studies: lab −20%' : 'Saving up…');
    document.querySelectorAll('[data-upg]').forEach(row => {
      const u = UPG_BY_ID[row.dataset.upg]; setRow(row, upgCost(u), fmt(upgCost(u)));
    });
    document.querySelectorAll('[data-rep]').forEach(row => {
      const r = REP_BY_ID[row.dataset.rep], l = S.rep[r.id]||0;
      setRow(row, r.cost(l), fmt(r.cost(l)));
      row.querySelector('[data-rl]').textContent = r.desc(l);
      row.querySelector('[data-rlv]').textContent = 'LV ' + l;
    });
  } else if (tab === 'raids' && sect.raids === 'abyss'){
    if (abyssUnlocked()){
      const a = S.abyss, k = [a.depth, a.torches, a.shards, a.extra, a.ppity, colony.guardianActive(), Math.round(Math.log10(Math.max(1, abyssEstimate()))*20), S.gems >= ABYSS_TORCH_AMBER].join('|');
      if ($('list').dataset.ak !== k){ $('list').dataset.ak = k; const st = $('list').scrollTop; $('list').innerHTML = abyssHTML(); $('list').scrollTop = st; }
    }
  } else if (tab === 'ranks'){
    if ($('lb-pts')) $('lb-pts').textContent = fmt(S.online.score);
    if ($('lb-ends')) $('lb-ends').textContent = fmtTime((leagueEnds(now) - now) / 1000);
    const la = Online.acct(), unsent = !!(la && S.online.score > (la.sent || 0));
    if (Online.view === 'players' && Online.board && Online.status === 'ready' && unsent !== !!Online.shownUnsent) Online.pending = true;
    if (Online.pending && !($('list').contains(document.activeElement) && document.activeElement.tagName === 'INPUT')) Online.changed();
  } else if (tab === 'alliance'){
    if (Online.pending && !($('list').contains(document.activeElement) && document.activeElement.tagName === 'INPUT')) Online.changed();
  } else if (tab === 'raids' && sect.raids === 'war'){
    refreshWar();
  } else if (tab === 'raids'){
    $('r-home').innerHTML = `<b>${S.owned.forager||0}</b> foragers home`;
    EXPEDITIONS.forEach(x => {
      const el = $('raid-'+x.id); if (!el) return;
      const e = S.exp[x.id];
      el.querySelector('[data-dur]').textContent = fmtTime(expDur(x));
      el.classList.toggle('nudge', !!(S.quota && S.quota.tut !== undefined && S.quota.go === 'raids' && x.id === 'kitchen'));
      el.querySelector('[data-loot]').textContent = '~' + fmt(e ? e.loot : expLootEst(x));
      let state, html = '';
      if (!expUnlocked(x)){ state = 'off'; html = `<button class="btn" disabled>Needs an Orbital Anthill</button>`; }
      else if (e && now >= e.end){ state = 'done'; html = `<button class="btn gold" data-collect="${x.id}">Collect ${fmt(e.loot)} crumbs</button>`; }
      else if (e){ state = 'away'; html = `<div class="prog"><div class="prog-bar"><div data-pb></div></div><div class="prog-txt"><span>Squad of ${e.squad} marching</span><span data-left></span></div></div>`; }
      else if ((S.owned.forager||0) < x.squad){ state = 'need'; html = `<button class="btn" disabled>Need ${x.squad - (S.owned.forager||0)} more foragers</button>`; }
      else { state = 'send'; html = `<button class="btn go" data-send="${x.id}">Send the squad</button>`; }
      const key = state + (state==='need' ? (S.owned.forager||0) : '');
      if (el.dataset.state !== key){
        el.dataset.state = key; el.querySelector('[data-act]').innerHTML = html;
        el.className = 'raid ' + state;
      }
      if (state === 'away'){
        el.querySelector('[data-pb]').style.width = Math.min(100, (now - e.start)/(e.end - e.start)*100) + '%';
        el.querySelector('[data-left]').textContent = fmtTime((e.end - now)/1000) + ' left';
      }
    });
  } else if (tab === 'shop'){
    $('shop-gems').textContent = fmt(S.gems);
    document.querySelectorAll('[data-shop]').forEach(b => {
      const k = b.dataset.shop, id = b.dataset.id;
      if (k==='ration'){ const ready = S.shopDay !== dayKey(now); b.disabled = !ready; b.textContent = ready ? 'FREE' : 'Tomorrow'; }
      else if (k==='exchange'){ adDay(); b.disabled = S.crumbs < exchangeCost() || S.ads.ex >= EX_CAP; }
      else if (k==='premium'){ b.disabled = S.pass.premium || S.gems < PREMIUM_COST; if (S.pass.premium) b.textContent = 'OWNED'; }
      else {
        const n = shopQty(k, id), tot = shopPrice(k, id) * n;
        b.disabled = S.gems < tot;
        const lbl = icon('gem') + fmt(tot) + (n > 1 ? ` · ×${fmt(n)}` : '');
        if (b.dataset.k !== lbl){ b.dataset.k = lbl; b.innerHTML = lbl; }
      }
    });
    document.querySelectorAll('[data-own]').forEach(el => { const n = S.inv[el.dataset.own]||0; el.textContent = n ? `${n} on your belt` : ''; });
    $('ex-sub').textContent = `Trade ${fmt(exchangeCost())} crumbs (30 min of output) for 10 amber. ${EX_CAP - S.ads.ex} of ${EX_CAP} left today.`;
  } else if (tab === 'pass'){
    const pt = passTier(S.pass.xp), beyond = pt.tier >= PASS_TIERS;
    const ps = passSeason(now);
    $('ph-eye').textContent = `REVOLUTION PASS · SEASON ${ps.n} · ENDS IN ${fmtTime((ps.ends - now)/1000).toUpperCase()}`;
    $('ph-name').textContent = ps.name;
    const shown = beyond ? pt.into % BONUS_XP : pt.into;
    $('ph-tier').innerHTML = `<small>TIER</small>${pt.tier}`;
    $('ph-bar').style.width = Math.min(100, shown / pt.need * 100) + '%';
    $('ph-xp').textContent = `${Math.floor(shown)} / ${pt.need} merit`;
    $('ph-next').textContent = beyond ? 'to the next bonus pack' : `to tier ${pt.tier + 1}`;
    const pb = $('ph-prem');
    const pk = 'p' + S.pass.premium + (S.gems >= PREMIUM_COST);
    if (pb.dataset.k !== pk){ pb.dataset.k = pk; pb.innerHTML = S.pass.premium ? 'Premium active' : `${icon('gem')} Unlock premium · ${PREMIUM_COST}`; }
    pb.disabled = S.pass.premium || S.gems < PREMIUM_COST;
    const n = passClaimable(), ab = $('ph-all');
    ab.textContent = n ? `Claim all (${n})` : 'All claimed'; ab.disabled = !n;
    for (let t = 1; t <= PASS_TIERS; t++){
      const row = $('tier-' + t); if (!row) continue;
      row.classList.toggle('reached', t <= pt.tier);
      row.querySelectorAll('.rw').forEach(rw => {
        const prem = rw.dataset.prem === '1', listT = prem ? S.pass.prem : S.pass.free;
        const done = listT.includes(t), reach = t <= pt.tier, can = reach && !done && (!prem || S.pass.premium);
        const st = done ? 'done' : can ? 'can' : 'lock';
        const label = done ? 'CLAIMED' : can ? 'TAP TO CLAIM' : (prem && !S.pass.premium) ? 'PREMIUM' : `TIER ${t}`;
        if (rw.dataset.st !== st + label){ rw.dataset.st = st + label; rw.classList.remove('done','can','lock'); rw.classList.add(st); rw.querySelector('em').textContent = label; }
      });
    }
  } else if (tab === 'flight'){
    if (sect.flight !== 'flight') refreshEndgame(); else {
    const g = pherGain(S);
    $('f-held').textContent = fmt(S.pher);
    $('f-bonus').textContent = '+' + fmt(S.pher*pherRate(S)*100) + '%';
    $('f-gain').textContent = '+' + fmt(g);
    $('f-next').textContent = fmt(nextPherAt(S)) + ' gathered';
    $('f-jelly').textContent = fmt(S.jelly);
    $('f-life').textContent = fmt(S.lifetime);
    $('f-flights').textContent = S.flights;
    $('f-taps').textContent = fmt(S.taps);
    $('f-picnics').textContent = S.picnics;
    $('f-raids').textContent = S.raids;
    $('f-inc').textContent = S.incidents;
    $('f-quota').textContent = S.quotaN;
    $('f-streak').textContent = `${S.daily.streak} (${S.daily.best})`;
    const b = $('f-btn'); const armed = Date.now() < confirmUntil;
    b.disabled = g < 1;
    b.classList.toggle('confirm', armed && g>=1);
    b.textContent = g < 1 ? 'Not enough pheromone yet' : armed ? `Confirm: fly for +${fmt(g)}` : 'Begin the flight';
    EDICTS.forEach(e => {
      const row = $('row-ed-'+e.id); if (!row) return;
      const l = S.edicts[e.id]||0, maxed = l >= e.max, c = e.cost(l), ready = !maxed && c <= S.jelly;
      row.classList.toggle('ready', ready); row.classList.toggle('maxed', maxed);
      row.querySelector('[data-desc]').textContent = e.desc(Math.min(l, e.max-1));
      row.querySelector('[data-lvl]').innerHTML = e.max > 1 ? Array.from({length:e.max}, (_,i) => `<i class="${i<l?'on':''}"></i>`).join('') : '';
      row.querySelector('[data-cost]').textContent = maxed ? 'IN FORCE' : (ready ? 'PASS · ' : '') + c + ' jelly';
    });
    $('f-wipe').textContent = Date.now() < wipeArmed ? 'Tap again to delete everything' : 'Dissolve the Republic (delete save)';
  }}
}

function checkMedals(){
  let any = false;
  for (const m of MEDALS){
    if (!S.medals.includes(m.id) && (m.cur(S, D)||0) >= m.target){
      S.medals.push(m.id); any = true; addGems(5); merit(50); Monetize.achievement(m.id);
      toast('Medal: ' + m.name, m.req + '. +1% output, +5 amber.', 'medal', 'star');
    }
  }
  if (any){ Sound.good(); D = derive(S); if (tab==='medals') render(); }
}

function onPanelClick(e){
  if (e.target.closest('[data-autotoggle]')){ S.auto.on = !S.auto.on; toast('Eternal Auto-Tapper', S.auto.on ? 'Switched on: 8 taps a second.' : 'Switched off.', S.auto.on ? 'gold' : 'neutral', 'ant'); afterChange(); render(); return; }
  if (e.target.closest('[data-spin]')){ Fun.openSpin(); return; }
  const shb = e.target.closest('[data-share]'); if (shb){ shareColony(shb.dataset.share); return; }
  const onb = e.target.closest('[data-on]');
  if (onb){ if (!onb.disabled) onlineClick(onb); return; }
  const sc = e.target.closest('[data-sect]');
  if (sc){ const [t, k] = sc.dataset.sect.split(':'); sect[t] = k; render(); $('list').scrollTop = 0; return; }
  const sn = e.target.closest('[data-shopn]');
  if (sn){ shopN = sn.dataset.shopn === 'max' ? 'max' : +sn.dataset.shopn; render(); return; }
  const cfb = e.target.closest('[data-cfilter]');
  if (cfb){ cardFilter = cfb.dataset.cfilter; render(); return; }
  const oa = e.target.closest('[data-openall]');
  if (oa){
    const k = oa.dataset.openall, outs = [];
    const kinds = k === '*' ? Object.keys(PACKS).reverse() : [k];
    let n = 0;
    for (const kind of kinds){ while (S.packs[kind] > 0 && n < 1000){ const r = openPack(kind); if (!r) break; outs.push(...r.out); n++; } }
    if (outs.length){ afterChange(); showBulk(k === '*' ? {name: n > 1 ? 'Packs' : 'Pack'} : PACKS[k], n, outs); }
    return;
  }
  const rp = e.target.closest('[data-rep]');
  if (rp){ if (buyRepeat(rp.dataset.rep)){ Sound.buy(); buzz(8); afterChange(); } return; }
  const dc = e.target.closest('[data-doc]');
  if (dc){ if (buyDoctrine(dc.dataset.doc)){ const d = DOCTRINE.find(x => x.id === dc.dataset.doc); toast('Doctrine adopted', `${d.name} is now law of the Supercolony.`, 'medal', 'crown'); Sound.stamp(); afterChange(); } return; }
  if (e.target.closest('#s-btn')){
    if (Date.now() < superConfirm){
      const g = supercolony(S); superConfirm = 0; if (g) Analytics.ev('supercolony', {crowns: g});
      if (g){ D = derive(S); genQuota(); save(); colony.rebuild(); colony.reset(); fervor = 0;
        if (S.supers === 1) showModal('The seal breaks', 'The Abyss opens', 'Beneath the new Supercolony, the ground has split. Raids → Abyss: fight the guardians of each depth for Abyssal Shards and the six Primordial cards.', 'Descend soon');
        showModal('The Supercolony is born', `+${g} crown${g>1?'s':''}`, `Every hill is now one. You have ${S.crowns} crowns to spend on Hive Doctrine, and every crown ever earned adds +5% to all output.`, 'Begin the new era');
        tab = 'castes'; render(); }
    } else { superConfirm = Date.now() + 4000; refresh(); }
    return;
  }
  const hb = e.target.closest('[data-hard]');
  if (hb){
    const id = hb.dataset.hard;
    if (hardArm.id === id && Date.now() < hardArm.until){
      hardArm = {id:null, until:0}; nuptialFlight(S, true); S.chal = id;
      D = derive(S); genQuota(); save(); colony.rebuild(); colony.reset(); fervor = 0;
      toast(`Hardship begun: ${HARD_BY_ID[id].name}`, HARD_BY_ID[id].rule, 'bad', HARD_BY_ID[id].icon); Sound.alert();
      tab = 'castes'; render();
    } else { hardArm = {id, until: Date.now() + 4000}; refresh(); }
    return;
  }
  if (e.target.closest('#h-quit')){
    if (Date.now() < quitArmed){ quitArmed = 0; nuptialFlight(S, true); D = derive(S); genQuota(); save(); colony.rebuild(); colony.reset();
      toast('Hardship abandoned', 'A normal colony has been founded.', 'neutral', 'wing'); tab = 'castes'; render(); }
    else { quitArmed = Date.now() + 4000; refresh(); }
    return;
  }
  const go = e.target.closest('[data-goto]');
  if (go){ tab = go.dataset.goto; render(); $('list').scrollTop = 0; return; }
  const op = e.target.closest('[data-open]');
  if (op){ const r = openPack(op.dataset.open); if (r){ afterChange(); showOpening(r); } return; }
  const ab = e.target.closest('[data-ad]');
  if (ab){ if (!ab.disabled) watchFor(ab.dataset.ad); return; }
  if (e.target.closest('#restore')){ restorePurchases(); return; }
  const dv = e.target.closest('[data-dev]'); if (dv){ if (!dv.disabled && PLATFORM.id === 'web') devAction(dv.dataset.dev); return; }
  if (e.target.closest('[data-descend]')){ startGuardian(); return; }
  const tb = e.target.closest('[data-torch]'); if (tb){ buyTorch(tb.dataset.torch); return; }
  if (e.target.closest('[data-primpack]')){ buyPrimPack(); return; }
  if (e.target.closest('[data-policy]')){ showPolicy(); return; }
  if (e.target.closest('[data-stats]')){ const t = e.target.closest('[data-stats]'); if (t.disabled) return; Analytics.setStats(S.privacy.stats === false); save(); render();
    toast('Play statistics', S.privacy.stats ? 'Switched on. Thank you, comrade.' : 'Switched off. Nothing more will be sent.', 'neutral', 'scroll'); return; }
  if (e.target.closest('[data-adchoices]')){ Native.post('adchoices', {}); return; }
  const dcb = e.target.closest('[data-dclaim]'); if (dcb){ claimDirective(+dcb.dataset.dclaim); afterChange(); return; }
  const dsw = e.target.closest('[data-dswap]'); if (dsw){ swapDirective(+dsw.dataset.dswap); return; }
  if (e.target.closest('[data-dchest]')){ claimDirChest(); afterChange(); return; }
  if (e.target.closest('[data-dweek]')){ claimWeekChest(); afterChange(); return; }
  const ib = e.target.closest('[data-iap]');
  if (ib){ if (!ib.disabled) buyIAP(ib.dataset.iap); return; }
  const sb = e.target.closest('[data-shop]');
  if (sb){
    const k = sb.dataset.shop, id = sb.dataset.id, qn = shopQty(k, id);
    if (buyShop(k, id)){
      const what = k==='pack' ? `${qn > 1 ? fmt(qn) + '× ' : ''}${PACKS[id].name} added. Open ${qn > 1 ? 'them' : 'it'} in Cards.` : k==='use' ? `${qn > 1 ? fmt(qn) + '× ' : ''}${USABLES[id].name} added to your belt.` : k==='jelly' ? `+${fmt(qn)} royal jelly.` : k==='premium' ? 'Premium track unlocked. Claim your rewards in the Pass.' : k==='ration' ? 'A free Worker Pack. Open it in Cards.' : '+10 amber.';
      toast(k==='premium' ? 'Premium unlocked!' : 'Purchased', what, 'gold', k==='use' ? USABLES[id].icon : k==='premium' ? 'ticket' : 'bag');
      Sound.buy(); buzz(10); afterChange(); render();
    } else if (k==='exchange') toast(S.ads.ex >= EX_CAP ? 'Exchange closed' : 'Not enough crumbs', S.ads.ex >= EX_CAP ? 'The exchange reopens tomorrow.' : `You need ${fmt(exchangeCost())} crumbs.`, 'bad', 'crumb');
    else if (k!=='ration' && !(k==='premium' && S.pass.premium)) toast('Not enough amber', 'Earn amber by playing, watch a broadcast, or visit the Amber Store at the top of the Shop.', 'bad', 'gem');
    return;
  }
  const rw = e.target.closest('.rw.can');
  if (rw){ const t = +rw.dataset.claim, prem = rw.dataset.prem === '1';
    if (claimTier(t, prem)){ const r = passReward(t, prem); toast(`Tier ${t} reward`, rewardText(r), 'gold', rewardIcon(r)); Sound.good(); afterChange(); } return; }
  if (e.target.closest('#ph-all')){ const n = claimAll(); if (n){ toast('Rewards claimed', `${n} reward${n>1?'s':''} collected.`, 'gold', 'ticket'); Sound.good(); afterChange(); } return; }
  if (e.target.closest('#ph-prem')){
    if (buyShop('premium')){ toast('Premium unlocked!', 'A free Politburo Pack is in Cards. +50% merit and +10% output are on for the season.', 'gold', 'ticket'); Sound.good(); afterChange(); }
    else if (!S.pass.premium) toast('Not enough amber', `Premium costs ${PREMIUM_COST} amber.`, 'bad', 'gem');
    return;
  }
  const segBtn = e.target.closest('.seg button');
  if (segBtn){ buyN = segBtn.dataset.n === 'max' ? 'max' : +segBtn.dataset.n; render(); return; }
  const prow = e.target.closest('[data-buy]');
  if (prow){
    if (buyProducer(prow.dataset.buy, +prow.dataset.n || 1)){ Sound.buy(); buzz(8); afterChange(); colony.rebuild(); }
    return;
  }
  const urow = e.target.closest('[data-upg]');
  if (urow){ if (buyUpgrade(urow.dataset.upg)){ Sound.buy(); buzz(8); afterChange(); render(); } return; }
  const erow = e.target.closest('[data-edict]');
  if (erow){ if (buyEdict(erow.dataset.edict)){ Sound.good(); afterChange(); toast('Edict passed', EDICTS.find(x=>x.id===erow.dataset.edict).name + ' is now law.', 'jelly', 'scroll'); } return; }
  const send = e.target.closest('[data-send]');
  if (send){ const x = EXP_BY_ID[send.dataset.send]; if (sendExp(x.id)){ Sound.buy(); buzz(15); afterChange(); colony.rebuild(); toast('Squad dispatched', `${x.squad} foragers march on ${x.name}.`, 'good', 'map'); } return; }
  const col = e.target.closest('[data-collect]');
  if (col){
    const r = collectExp(col.dataset.collect);
    if (r){ Sound.good(); buzz(25); bump(); afterChange(); colony.rebuild();
      toast('The squad returns!', `+${fmt(r.loot)} crumbs and ${r.gm} amber from ${r.x.name}` + (r.j ? ` and ${r.j} royal jelly!` : '.'), r.j ? 'jelly' : 'gold', r.x.icon); }
    return;
  }
  if (e.target.id === 'f-btn'){
    if (Date.now() < confirmUntil){
      const g = nuptialFlight(S); confirmUntil = 0; if (g) Analytics.ev('nuptial_flight', {pheromones: g});
      if (g){ D = derive(S); genQuota(); save(); colony.rebuild(); colony.reset(); fervor = 0;
        showModal('A new colony is founded', '+' + fmt(g) + ' pheromones', `Every caste now works ${fmt(S.pher*pherRate(S)*100)}% harder, and you have ${fmt(S.jelly)} royal jelly to spend on edicts.`, 'Begin again');
        offerStarterKit();
        tab='castes'; render(); }
    } else { confirmUntil = Date.now() + 4000; refresh(); }
    return;
  }
  if (e.target.id === 'f-wipe'){
    if (Date.now() < wipeArmed){ wipeSave(); wipeArmed = 0; D = derive(S); initTut(); genQuota(); save(); colony.rebuild(); colony.reset(); tab='castes'; render(); }
    else { wipeArmed = Date.now() + 4000; refresh(); }
  }
}
function afterChange(){ D = derive(S); save(); refresh(); }

const modalQ = [];
function showModal(eyebrow, amount, text, ok, extra){
  if (!$('modal').hidden){ modalQ.push([eyebrow, amount, text, ok, extra]); return; }
  $('m-eyebrow').textContent = eyebrow;
  $('m-amount').textContent = amount;
  $('m-text').textContent = text;
  $('m-extra').innerHTML = extra || '';
  $('m-ok').textContent = ok || 'Collect for the colony';
  const soft = !!(extra && extra.includes('id="m-kit"'));
  $('m-ok').classList.toggle('ghost', soft); $('m-ok').classList.toggle('confirm', !soft);
  $('modal').hidden = false;
  $('m-ok').focus();
}

