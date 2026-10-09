/* ============================================================
   MONETISATION LAYER
   Every ad and every real-money purchase goes through Monetize.
   In this browser build both are simulated: a 5-second fake ad and
   a fake checkout, and no money is ever charged. In the Expo build,
   replace the two method bodies with AdMob (rewarded ads) and
   RevenueCat (purchases); nothing else in the game needs to change.
   ============================================================ */
const IAP = {
  amber1: {name:'Pouch of Amber',    amber:80,   bonus:0,    price:'$0.99'},
  amber2: {name:'Jar of Amber',      amber:500,  bonus:50,   price:'$4.99'},
  amber3: {name:'Chest of Amber',    amber:1200, bonus:200,  price:'$9.99',  tag:'Popular'},
  amber4: {name:'Vault of Amber',    amber:2600, bonus:600,  price:'$19.99'},
  amber5: {name:'Treasury of Amber', amber:7000, bonus:2000, price:'$49.99', tag:'Best value'},
  starter:{name:'Comrade Starter Kit', price:'$1.99', once:true, icon:'gift',
           desc:'300 amber, a Politburo Pack, 3 Sugar Rush and an Hourglass of Labour. Once per account.'},
  autotap:{name:'Eternal Auto-Tapper', price:'$2.99', once:true, icon:'ant',
           desc:'A mechanical mandible taps the hill 8 times a second, forever, keeping fervor high. Switch it on or off any time.'},
  party:  {name:'Party Membership Card', price:'$3.99', once:true, icon:'star',
           desc:'Claim every broadcast reward instantly with no ad, plus +25% offline gathering. Forever.'},
  pass:   {name:'Revolution Pass Premium', price:'$4.99', icon:'ticket',
           desc:'Premium track: +50% merit, +10% output all season, a free Politburo Pack now, 7 Politburo Packs, 560 amber and 8 royal jelly on the track.'},
};
const AD_REWARDS = {
  amber:{name:'Comrade Broadcast', desc:'+8 amber',                      cap:5, icon:'gem'},
  boost:{name:'State Television',  desc:'All output ×2 for 15 minutes', cap:4, icon:'bolt'},
  pack: {name:'Supply Drop',       desc:'A free Worker Pack',            cap:2, icon:'cards'},
};
const EX_CAP = 3;

function dlg({band, text, ok, wait}){
  return new Promise(res => {
    const ov = $('adov'), okb = $('ad-ok'), cb = $('ad-cancel'), scr = $('ad-screen');
    $('ad-band').textContent = band; $('ad-text').textContent = text;
    scr.hidden = !wait; okb.textContent = ok; okb.disabled = !!wait;
    let left = wait || 0, timer = null;
    if (wait){
      $('ad-count').textContent = left;
      timer = setInterval(() => { left--; $('ad-count').textContent = left > 0 ? left : '✓';
        if (left <= 0){ clearInterval(timer); okb.disabled = false; okb.focus(); } }, 1000);
    }
    ov.hidden = false;
    const done = v => { clearInterval(timer); ov.hidden = true; okb.onclick = cb.onclick = null; res(v); };
    okb.onclick = () => done(true); cb.onclick = () => done(false);
  });
}
/* ---------- PLATFORM ----------
   The store shell sets window.FR_PLATFORM before this script runs, and
   window.FR_send(msg) to talk to native code. Native answers via FR_receive.
     web     (default) simulated ads and checkout, nothing charged
     android Expo shell: AdMob rewarded ads + Google Play purchases (RevenueCat)
     steam   Electron shell: no ads (rewards are free claims), Steam purchases,
             Steam achievements, save file for Steam Cloud */
const PLATFORM = Object.assign({id:'web', privacyUrl:'', adChoices:false, ads:true, skus:null, restore:false, achievements:false, fileSave:false, initialSave:null}, window.FR_PLATFORM || {});
const hasNative = typeof window.FR_send === 'function';
const Native = {
  seq: 0, wait: {},
  call(type, data){ return new Promise(res => { const id = ++this.seq; this.wait[id] = res; window.FR_send(Object.assign({id, type}, data)); }); },
  post(type, data){ if (hasNative) try { window.FR_send(Object.assign({type}, data)); } catch(e){} },
};
window.FR_receive = msg => {
  if (!msg) return;
  if (msg.id && Native.wait[msg.id]){ const r = Native.wait[msg.id]; delete Native.wait[msg.id]; r(msg.result || {}); }
  if (msg.prices){ for (const [k,v] of Object.entries(msg.prices)) if (IAP[k] && v) IAP[k].price = v; if (S && tab === 'shop') render(); }
};
if (typeof window.FR_onMessage === 'function') window.FR_onMessage(window.FR_receive);
function openExternal(url){ if (!url) return; if (hasNative) Native.post('open', {url}); else window.open(url, '_blank', 'noopener'); }
function privacyLinks(){
  const a = `<button class="linkbtn" data-policy>Privacy policy</button>`;
  const b = PLATFORM.adChoices ? `<button class="linkbtn" data-adchoices>Ad privacy choices</button>` : '';
  return `<div class="privacy-links">${a}${b}</div>`;
}
// The policy text is built from src/privacy.md into PRIVACY_POLICY (see build.mjs), so it
// reads the same offline, in every shell, as the hosted page at PLATFORM.privacyUrl.
function showPolicy(){
  $('pol-text').innerHTML = typeof PRIVACY_POLICY === 'string' ? PRIVACY_POLICY : '';
  $('pol-web').hidden = !PLATFORM.privacyUrl;
  $('policyov').hidden = false; $('pol-text').scrollTop = 0; $('pol-close').focus();
}
function privacyPanelHTML(){
  const on = Analytics.available(), st = S.privacy.stats !== false;
  return `<div class="sec-h"><h3 class="ink">Privacy</h3></div>
    <div class="srow priv-row"><div class="row-main"><div class="row-name">Share anonymous play statistics</div>
      <div class="row-sub">${on ? 'Events such as finishing the tutorial or opening a pack, with a random install ID. No name, email, ad ID or location.' : 'Off in the browser preview: nothing is sent.'}</div>
      ${on ? `<div class="row-sub priv-id">Install ID: <code>${esc(st ? Analytics.id() : (S.flags.aid || 'none yet'))}</code></div>` : ''}</div>
      <button class="tgl" role="switch" data-stats aria-checked="${on && st}" ${on ? '' : 'disabled'} aria-label="Share anonymous play statistics"><i></i></button></div>
    ${privacyLinks()}`;
}
// Preview tools: only in the browser build (never in the Google Play or Steam builds),
// so features gated behind days of play can be checked straight away.
function devHTML(){
  return `<div class="devbox"><div class="devhead"><b>Preview tools</b><span>Browser build only · changes your save</span></div><div class="devbtns">
    <button data-dev="skip" ${tutActive() ? '' : 'disabled'}>Skip training</button>
    <button data-dev="super">Jump to a Supercolony</button>
    <button data-dev="rich">+1 day of output</button>
    <button data-dev="abyss" ${abyssUnlocked() ? '' : 'disabled'}>+5 torches, +200 shards</button>
    <button data-dev="prim" ${abyssUnlocked() ? '' : 'disabled'}>+3 Primordial Packs</button>
    <button data-dev="prim10k">+10,000 Primordial Packs</button></div></div>`;
}
function devAction(k){
  if (k === 'skip' || k === 'super'){ if (tutActive()){ S.flags.tut = TUT.length; S.quota = null; genQuota(); } }
  if (k === 'super'){
    S.pher = Math.max(S.pher, SUPER_REQ);
    const g = supercolony(S);
    D = derive(S); genQuota(); colony.rebuild(); colony.reset(); fervor = 0;
    S.crumbs += 5e4; S.run += 5e4; S.lifetime += 5e4; S.ascLife += 5e4;   // a head start so the first guardians are in reach
    showModal('The seal breaks', 'The Abyss opens', `Preview: Supercolony formed (+${g} crowns). Open Raids → Abyss to fight the guardians, and Cards to see the Primordial teaser.`, 'Descend');
    tab = 'raids'; sect.raids = 'abyss';
  }
  if (k === 'rich'){ const v = Math.max(1e6, D.baseCps * 86400); gain(v); toast('Preview', `+${fmt(v)} crumbs.`, 'gold', 'crumb'); }
  if (k === 'abyss'){ abyssDay(); S.abyss.torches += 5; S.abyss.shards += 200; toast('Preview', '+5 torches and +200 Abyssal Shards.', 'gold', 'sun'); }
  if (k === 'prim'){ S.packs.primordial = (S.packs.primordial||0) + 3; toast('Preview', '+3 Primordial Packs. Open them in Cards.', 'gold', 'cards'); }
  if (k === 'prim10k'){ S.packs.primordial = (S.packs.primordial||0) + 10000; toast('Preview', '+10,000 Primordial Packs. Open them in Cards (up to 1,000 per tap).', 'gold', 'cards'); }
  D = derive(S); save(); render();
}
function sold(sku){ return !PLATFORM.skus || PLATFORM.skus.includes(sku); }
function adFree(){ return !PLATFORM.ads || !!S.iap.owned.party; }

const Monetize = {
  test: !hasNative,
  // Resolves true only if the player watched the whole ad (or the platform has no ads).
  async showRewarded(placement){
    if (!PLATFORM.ads) return true;
    if (hasNative){
      const r = await Native.call('ad', {placement});
      if (!r.ok && r.error) toast('No broadcast available', r.error, 'bad', 'radio');
      return !!r.ok;
    }
    return dlg({band:'Sponsored broadcast · test ad', wait:5, ok:'Claim reward',
      text:'In the real app a rewarded video plays here. Closing early gives no reward.'});
  },
  // Resolves true only if the store confirmed the payment.
  async purchase(sku){
    if (hasNative){
      const r = await Native.call('buy', {sku});
      if (!r.ok && r.error) toast('Purchase not completed', r.error, 'bad', 'bag');
      return !!r.ok;
    }
    const it = IAP[sku];
    return dlg({band:'Checkout · test mode', ok:`Buy for ${it.price}`,
      text:`${it.name}. This is a browser preview, so no money is charged. In the app this opens the Google Play or Steam payment sheet.`});
  },
  // Resolves to {owned:[sku,...]} of one-time purchases the store knows about.
  restore(){ return hasNative && PLATFORM.restore ? Native.call('restore', {}) : Promise.resolve({owned:[]}); },
  achievement(id){ if (PLATFORM.achievements) Native.post('achievement', {id}); },
};

function adDay(){ const k = dayKey(Date.now()); if (S.ads.day !== k){ S.ads.day = k; S.ads.n = {}; S.ads.ex = 0; } return S.ads.n; }
function adLeft(k){ return Math.max(0, AD_REWARDS[k].cap - (adDay()[k]||0)); }
let adBusy = false;
async function watchFor(k){
  if (adBusy || adLeft(k) <= 0) return;
  adBusy = true;
  const ok = adFree() ? true : await Monetize.showRewarded(k);
  adBusy = false;
  if (!ok) return;
  adDay()[k] = (adDay()[k]||0) + 1;
  Analytics.ev('ad_reward', {placement: k});
  const r = AD_REWARDS[k];
  if (k === 'amber') addGems(8);
  else if (k === 'boost') addBuff({name:'State Television', prod:2, dur:900, gold:true});
  else if (k === 'pack') S.packs.common = (S.packs.common||0) + 1;
  toast(r.name, r.desc + (k==='pack' ? '. Open it in Cards.' : '.'), 'gold', r.icon); Sound.good();
  afterChange(); render();
}
// Called after the store confirms a purchase (in Expo: after RevenueCat says the purchase is valid).
function grantIAP(sku){
  const it = IAP[sku];
  if (sku.startsWith('amber')){
    const first = !S.iap.first[sku]; S.iap.first[sku] = true;
    const n = (it.amber + it.bonus) * (first ? 2 : 1); addGems(n);
    return `+${fmt(n)} amber` + (first ? ' (first purchase doubled!)' : '');
  }
  if (sku === 'starter'){ S.iap.owned.starter = true; addGems(300); S.packs.epic = (S.packs.epic||0) + 1;
    S.inv.rush = (S.inv.rush||0) + 3; S.inv.hourglass = (S.inv.hourglass||0) + 1; return '300 amber, a Politburo Pack and 4 usables.'; }
  if (sku === 'party'){ S.iap.owned.party = true; return 'Broadcast rewards are now instant, and offline gathering is up 25%.'; }
  if (sku === 'autotap'){ S.iap.owned.autotap = true; S.auto.forever = true; S.auto.on = true; return 'The Eternal Auto-Tapper is working. Switch it off in the Shop whenever you like.'; }
  if (sku === 'pass'){ unlockPremium(); return 'Premium unlocked: +50% merit, +10% output and a free Politburo Pack. Claim your rewards in the Pass.'; }
}
// One-time Starter Kit offer, shown right after the player's first Nuptial Flight
// (their most invested moment). Never shown again once seen or bought.
function offerStarterKit(){
  if (S.iap.owned.starter || S.flags.kitOffered || !sold('starter')) return;
  S.flags.kitOffered = true; save();
  const items = [['gem','300 amber'],['cards','Politburo Pack'],['bolt','3× Sugar Rush'],['clock','Hourglass of Labour']];
  showModal('A gift for the new colony', IAP.starter.price, 'Give the new hill a running start. You can buy this bundle once per account. If you skip it now, it stays in the Shop.', 'Maybe later',
    `<div class="kit">${items.map(([i,t]) => `<div class="kit-i"><span>${icon(i)}</span>${t}</div>`).join('')}</div><button class="gbtn cash big" id="m-kit">${icon('gift')} Get the Starter Kit · ${IAP.starter.price}</button>`);
}
async function restorePurchases(){
  const r = await Monetize.restore(); let n = 0;
  for (const sku of (r.owned || [])){
    if (sku === 'party' && !S.iap.owned.party){ S.iap.owned.party = true; n++; }
    if (sku === 'autotap' && !S.iap.owned.autotap){ S.iap.owned.autotap = true; S.auto.forever = true; n++; }
    if (sku === 'starter' && !S.iap.owned.starter){ S.iap.owned.starter = true; n++; }
  }
  toast(n ? 'Purchases restored' : 'Nothing to restore', n ? `${n} purchase${n>1?'s':''} restored to this colony.` : 'No one-time purchases were found for this account.', n ? 'gold' : 'neutral', 'gift');
  afterChange(); render();
}
let iapBusy = false;
async function buyIAP(sku){
  const it = IAP[sku];
  if (iapBusy || (it.once && S.iap.owned[sku]) || (sku === 'pass' && S.pass.premium)) return;
  iapBusy = true;
  const ok = await Monetize.purchase(sku);
  iapBusy = false;
  if (!ok) return;
  const msg = grantIAP(sku);
  Analytics.ev('purchase', {sku, price: it.price});
  toast('Thank you, comrade!', msg, 'gold', it.icon || 'gem'); Sound.stamp();
  afterChange(); render();
}
let pendingOffline = 0;
async function doubleOffline(btn){
  if (!pendingOffline || adBusy) return;
  adBusy = true;
  const ok = adFree() ? true : await Monetize.showRewarded('offline');
  adBusy = false;
  if (!ok || !pendingOffline) return;
  gain(pendingOffline); $('m-amount').textContent = '+' + fmt(pendingOffline*2);
  pendingOffline = 0; btn.disabled = true; btn.textContent = 'Doubled!'; Sound.good(); save();
}

