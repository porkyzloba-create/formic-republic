/* ============================================================
   FUN & GROWTH: critical taps, the Queen's Lottery, milestone
   celebrations, Comrade Ant (the advisor), the share card, and
   anonymous analytics.
   Marketing intent:
     · crits and milestones = moment-to-moment excitement
     · the Lottery = a daily reason to return (and an ad slot)
     · Comrade Ant = personality + nudges toward unused features
     · the share card = free word-of-mouth
     · analytics = learn what players actually do (store builds only)
   ============================================================ */

/* ---------- critical taps ---------- */
const CRIT_MULT = 7, CRIT_BASE = .03, CRIT_FERVOR = .06;
let lastCrit = false;
function critChance(){ return fervor > .98 ? CRIT_FERVOR : CRIT_BASE; }   // max fervor doubles the odds

/* ---------- the Queen's Lottery (daily wheel) ---------- */
const SPIN_ADS = 2;   // extra spins per day for watching a broadcast
// Wheel order alternates big and small prizes so the pointer always passes something exciting.
const SPIN_PRIZES = [
  {id:'a15',   w:25, top:'15',      sub:'amber',   icon:'gem',   col:'#FFC738', text:'15 amber',            give:() => addGems(15)},
  {id:'pk3',   w:6,  top:'Politburo',sub:'pack',   icon:'cards', col:'#8E5BF2', text:'a Politburo Pack',    give:() => { S.packs.epic = (S.packs.epic||0) + 1; }, big:true},
  {id:'rush',  w:14, top:'2×',      sub:'Rush',    icon:'bolt',  col:'#FFFBF3', text:'2 Sugar Rush',        give:() => { S.inv.rush = (S.inv.rush||0) + 2; }},
  {id:'jelly', w:10, top:'1',       sub:'jelly',   icon:'drop',  col:'#E5392D', text:'1 royal jelly',       give:() => { S.jelly += 1; }},
  {id:'pk1',   w:18, top:'Worker',  sub:'pack',    icon:'cards', col:'#FFC738', text:'a Worker Pack',       give:() => { S.packs.common = (S.packs.common||0) + 1; }},
  {id:'jack',  w:2,  top:'300',     sub:'JACKPOT', icon:'crown', col:'#1D1A2B', text:'the 300 amber JACKPOT', give:() => addGems(300), big:true},
  {id:'a40',   w:15, top:'40',      sub:'amber',   icon:'gem',   col:'#FFFBF3', text:'40 amber',            give:() => addGems(40)},
  {id:'pk2',   w:10, top:'Brigade', sub:'pack',    icon:'cards', col:'#E5392D', text:'a Brigade Pack',      give:() => { S.packs.rare = (S.packs.rare||0) + 1; }},
];
function spinDay(){ const k = dayKey(Date.now()); if (S.spin.day !== k){ S.spin.day = k; S.spin.used = 0; S.spin.ads = 0; } return S.spin; }
function spinFree(){ return spinDay().used < 1; }
function spinAdsLeft(){ return Math.max(0, SPIN_ADS - spinDay().ads); }
function rollSpin(r){
  r = r === undefined ? Math.random() : r;
  let x = r * SPIN_PRIZES.reduce((n, p) => n + p.w, 0);
  for (let i = 0; i < SPIN_PRIZES.length; i++){ if ((x -= SPIN_PRIZES[i].w) < 0) return i; }
  return 0;
}
function grantSpin(i){
  const p = SPIN_PRIZES[i]; p.give();
  S.spin.total++; if (p.id === 'jack') S.spin.jackpots++;
  merit(20);
  return p;
}

/* ---------- milestones ---------- */
const MILESTONES = [
  {at:1e6,  name:'One Million Crumbs',     quip:'The larder is full. The Politburo has ordered a bigger larder.'},
  {at:1e9,  name:'One Billion Crumbs',     quip:'A billion crumbs. Historians will call this "the Great Snack".'},
  {at:1e12, name:'One Trillion Crumbs',    quip:'The bakery has been notified. The bakery is afraid.'},
  {at:1e15, name:'One Quadrillion Crumbs', quip:'There are now more crumbs than ants. The plan worked.'},
  {at:1e18, name:'One Quintillion Crumbs', quip:'Scientists confirm: the planet is now 4% crumb.'},
  {at:1e21, name:'One Sextillion Crumbs',  quip:'The sun asked to join the colony. Request approved.'},
  {at:1e24, name:'One Septillion Crumbs',  quip:'Every crumb in the universe belongs to the hill. Glory!'},
];
// New field on old saves: count the milestones already passed so nobody gets a pile of celebrations.
function initMilestones(){ if (typeof S.flags.mile !== 'number') S.flags.mile = MILESTONES.filter(m => S.lifetime >= m.at).length; }
function nextMilestone(){ const m = MILESTONES[S.flags.mile]; return m && S.lifetime >= m.at ? m : null; }

/* ---------- Comrade Ant, the advisor ---------- */
const ADVISOR_LINES = [
  'Reminder: carrying ten times your body weight is a privilege, not a job.',
  'Tap faster, comrade. The beetles are watching.',
  'Fun fact: ants never sleep. Neither does the Five-Year Plan.',
  'The Ministry denies that picnics exist. Grab the sugar cubes anyway.',
  'An anteater is just a capitalist with a long nose. Tap it!',
  'Every crumb you gather is a crumb the wasps will never have.',
  'Our aphids are the happiest aphids. They said so. Under supervision.',
  'Max fervor doubles your critical taps. Science!',
  'I have never seen the Queen. I am told this is normal.',
  'Remember: the trail is the truth.',
  'Rumour says a Mythic card sleeps in the packs. Rumour is very well informed.',
  'If you see a winged royal, tap it. Do not ask questions.',
];
// Context tips point at features the player is ignoring (the most useful thing an advisor can say).
function advisorTip(){
  const tips = [];
  if (S.spin && spinFree() && !tutActive()) tips.push(['Comrade! Your free spin of the Queen\'s Lottery is waiting in the Shop.', 'shop']);
  if (raidsReady()) tips.push(['Your raiding squad is back with loot. March → Raids!', 'raids']);
  if (passClaimable() >= 3) tips.push([`${passClaimable()} pass rewards are waiting to be claimed. Goals → Pass.`, 'pass']);
  if (Object.values(S.packs).reduce((a, b) => a + b, 0) >= 3) tips.push(['You have unopened card packs. Cards make everything stronger!', 'cards']);
  if (pherGain(S) >= Math.max(3, S.pher)) tips.push(['A Nuptial Flight now would double your pheromones. Think about it.', 'flight']);
  if (!tutActive() && !Object.keys(S.online.acct).length) tips.push(['Other colonies are racing in the weekly league. Show them who\'s boss: Ranks!', 'ranks']);
  return tips.length && Math.random() < .6 ? tips[Math.floor(Math.random() * tips.length)] : [ADVISOR_LINES[Math.floor(Math.random() * ADVISOR_LINES.length)], null];
}
// A small vector Comrade Ant (also drawn on the share card). viewBox 0 0 100 100.
const ANT_FACE = {
  antL:'M38 26 C30 12 22 8 14 10', antR:'M62 26 C70 12 78 8 86 10',
  head:'M50 22 C74 22 88 40 86 60 C84 80 68 92 50 92 C32 92 16 80 14 60 C12 40 26 22 50 22 Z',
  cap:'M18 44 C20 26 34 16 52 16 C70 16 82 26 84 40 C70 34 36 34 18 44 Z',
  brim:'M60 36 C72 32 88 34 96 42 C86 44 72 44 60 42 Z',
  eyeL:'M37 58 m-9 0 a9 10 0 1 0 18 0 a9 10 0 1 0 -18 0', eyeR:'M63 58 m-9 0 a9 10 0 1 0 18 0 a9 10 0 1 0 -18 0',
  pupL:'M39 60 m-4.5 0 a4.5 5 0 1 0 9 0 a4.5 5 0 1 0 -9 0', pupR:'M65 60 m-4.5 0 a4.5 5 0 1 0 9 0 a4.5 5 0 1 0 -9 0',
  smile:'M38 76 C44 83 56 83 62 76',
};
function antFaceSVG(){
  const F = ANT_FACE, ink = '#1D1A2B';
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><g fill="none" stroke="${ink}" stroke-width="4" stroke-linecap="round"><path d="${F.antL}"/><path d="${F.antR}"/></g>
    <circle cx="14" cy="10" r="4" fill="${ink}"/><circle cx="86" cy="10" r="4" fill="${ink}"/>
    <path d="${F.head}" fill="#8A3F1C" stroke="${ink}" stroke-width="4"/>
    <path d="${F.cap}" fill="#E5392D" stroke="${ink}" stroke-width="4" stroke-linejoin="round"/><path d="${F.brim}" fill="#B52A20" stroke="${ink}" stroke-width="4" stroke-linejoin="round"/>
    <path d="${F.eyeL}" fill="#fff" stroke="${ink}" stroke-width="3"/><path d="${F.eyeR}" fill="#fff" stroke="${ink}" stroke-width="3"/>
    <path d="${F.pupL}" fill="${ink}"/><path d="${F.pupR}" fill="${ink}"/>
    <path d="${F.smile}" fill="none" stroke="${ink}" stroke-width="4" stroke-linecap="round"/></svg>`;
}

/* ---------- the share card ---------- */
// Draws a 1080×1350 poster of the colony (the 4:5 size Instagram and most feeds show in full).
function drawShareCard(cv){
  const W = 1080, H = 1350, c = cv.getContext('2d'); cv.width = W; cv.height = H;
  const INK = '#1D1A2B', RED = '#E5392D', SUN = '#FFC738', PAPER = '#FFFBF3';
  const DISP = "'Dela Gothic One','Arial Black',Impact,sans-serif", BODY = "'Onest',system-ui,sans-serif";
  c.fillStyle = '#F7F0E3'; c.fillRect(0, 0, W, H);
  // sunburst behind the mascot
  const cx = W / 2, cy = 530;
  for (let i = 0; i < 24; i++){
    const a0 = i / 24 * Math.PI * 2, a1 = (i + 1) / 24 * Math.PI * 2;
    c.fillStyle = i % 2 ? SUN : '#FFE08A';
    c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, 900, a0, a1); c.closePath(); c.fill();
  }
  c.fillStyle = RED; c.beginPath(); c.arc(cx, cy, 270, 0, Math.PI * 2); c.fill();
  // mascot, from the same vector as the advisor
  c.save(); c.translate(cx - 240, cy - 250); c.scale(4.8, 4.8); c.lineJoin = 'round'; c.lineCap = 'round';
  const P = d => new Path2D(d), F = ANT_FACE;
  c.strokeStyle = INK; c.lineWidth = 4; c.stroke(P(F.antL)); c.stroke(P(F.antR));
  c.fillStyle = INK; c.beginPath(); c.arc(14, 10, 4, 0, 7); c.arc(86, 10, 4, 0, 7); c.fill();
  [[F.head, '#8A3F1C', 4], [F.cap, RED, 4], [F.brim, '#B52A20', 4], [F.eyeL, '#fff', 3], [F.eyeR, '#fff', 3]].forEach(([d, f, w]) => { c.fillStyle = f; c.fill(P(d)); c.lineWidth = w; c.stroke(P(d)); });
  c.fillStyle = INK; c.fill(P(F.pupL)); c.fill(P(F.pupR)); c.lineWidth = 4; c.stroke(P(F.smile));
  c.restore();
  // title banner
  c.fillStyle = RED; c.fillRect(0, 60, W, 150); c.fillStyle = INK; c.fillRect(0, 210, W, 10);
  c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `92px ${DISP}`; c.fillText('FORMIC REPUBLIC', cx, 137);
  // stats panel
  const acct = Object.values(S.online.acct)[0], name = acct ? acct.name : 'My Colony';
  const px = 70, py = 880, pw = W - 140, ph = 400;
  c.fillStyle = PAPER; c.strokeStyle = INK; c.lineWidth = 8;
  c.beginPath(); if (c.roundRect) c.roundRect(px, py, pw, ph, 40); else c.rect(px, py, pw, ph); c.fill(); c.stroke();
  c.fillStyle = INK; c.font = `64px ${DISP}`; c.fillText(name.slice(0, 22), cx, py + 70);
  c.fillStyle = RED; c.font = `110px ${DISP}`; c.fillText(fmt(D.cps), cx, py + 175);
  c.fillStyle = '#5E5872'; c.font = `700 34px ${BODY}`; c.fillText('CRUMBS PER SECOND', cx, py + 245);
  const cards = Object.keys(S.cards).length;
  c.fillStyle = INK; c.font = `700 36px ${BODY}`;
  c.fillText(`${fmt(S.lifetime)} crumbs gathered · ${S.flights} flights${S.supers ? ` · ${S.supers} supercolon${S.supers > 1 ? 'ies' : 'y'}` : ''}`, cx, py + 305);
  c.fillText(`${cards} cards · ${S.medals.length} medals${(S.abyss || {}).depth ? ` · Abyss depth ${S.abyss.depth}` : ''}`, cx, py + 355);
  // call to action, on an ink pill between the mascot and the stats
  c.font = `44px ${DISP}`; const tw = c.measureText('Can your colony beat mine?').width + 70;
  c.fillStyle = INK; c.beginPath(); if (c.roundRect) c.roundRect(cx - tw / 2, 806, tw, 58, 29); else c.rect(cx - tw / 2, 806, tw, 58); c.fill();
  c.fillStyle = SUN; c.fillText('Can your colony beat mine?', cx, 836);
}
async function shareColony(where){
  try { await Promise.all([document.fonts.load("92px 'Dela Gothic One'"), document.fonts.load("700 34px 'Onest'")]); } catch(e){}   // draw with the poster fonts
  const cv = document.createElement('canvas'); drawShareCard(cv);
  const blob = await new Promise(res => cv.toBlob(res, 'image/png'));
  const text = `My ant colony makes ${fmt(D.cps)} crumbs a second in Formic Republic. Can yours beat it?`;
  Analytics.ev('share', {where});
  try {
    const file = new File([blob], 'formic-republic.png', {type:'image/png'});
    if (navigator.canShare && navigator.canShare({files:[file]})){ await navigator.share({files:[file], text, title:'Formic Republic'}); return 'shared'; }
  } catch(e){ if (e && e.name === 'AbortError') return 'cancelled'; }
  if (hasNative){ const url = await new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob); }); Native.post('share', {text, image:url}); return 'native'; }
  try {
    const dl = window.claude && typeof window.claude.use === 'function' ? await window.claude.use('downloads') : null;
    if (dl){ await dl.save({filename:'formic-republic.png', data:blob}); return 'saved'; }
  } catch(e){ if (e && e.code !== 'unavailable') return 'cancelled'; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'formic-republic.png'; document.body.appendChild(a); a.click(); a.remove();
  return 'downloaded';
}

/* ---------- anonymous analytics (PostHog, EU) ----------
   On in the store builds; off in the browser preview unless FR_PLATFORM.analytics is true.
   Sends a random install id (no names, no emails); the PostHog project anonymises IPs.
   Mention it in the store privacy policy. */
const Analytics = {
  host:'https://eu.i.posthog.com', key:'phc_teWpivyJJZ48jraYrC7wwgnNFrxbUxALeCLgdoqdkwVY',
  q:[], last:0,
  on(){ return PLATFORM.analytics === true || (PLATFORM.id !== 'web' && PLATFORM.analytics !== false); },
  id(){ if (!S.flags.aid) S.flags.aid = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2); return S.flags.aid; },
  ev(name, props){
    if (!S || !this.on()) return;
    this.q.push({event:name, timestamp:new Date().toISOString(), properties:Object.assign({distinct_id:this.id(), platform:PLATFORM.id, flights:S.flights, supers:S.supers, lifetime_log10: Math.floor(Math.log10(1 + S.lifetime))}, props || {})});
    if (this.q.length >= 25) this.flush();
  },
  flush(){
    if (!this.q.length) return; const batch = this.q.splice(0); this.last = Date.now();
    try { fetch(this.host + '/batch/', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({api_key:this.key, batch}), keepalive:true}).catch(() => {}); } catch(e){}
  },
};

/* ---------- the Fun controller (called from the main loop) ---------- */
const Fun = {
  nextAdvisor: 0, advisorUntil: 0, spinBusy: false, wheelRot: 0,
  tick(now){
    if (!S) return;
    if (now - Analytics.last > 30000) Analytics.flush();
    // milestones
    const m = nextMilestone();
    if (m && $('modal').hidden && $('opening').hidden){ S.flags.mile++; this.celebrate(m); }
    // Comrade Ant
    if (this.advisorUntil && now > this.advisorUntil) this.hideAdvisor();
    if (!this.nextAdvisor) this.nextAdvisor = now + 75000;
    if (now > this.nextAdvisor && !tutActive() && !activeEvent && !colony.busy() && $('modal').hidden && GROUP_OF[tab] === 'hill'){
      this.nextAdvisor = now + 150000 + Math.random() * 120000;
      const [line, go] = advisorTip(); this.say(line, go);
    }
  },
  say(line, go){
    const el = $('advisor'); if (!el) return;
    el.querySelector('.adv-text').textContent = line;
    el.dataset.go = go || ''; el.classList.toggle('has-go', !!go);
    el.hidden = false; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    this.advisorUntil = Date.now() + 7000;
  },
  hideAdvisor(){ const el = $('advisor'); if (el) el.hidden = true; this.advisorUntil = 0; },
  celebrate(m){
    confetti(); Sound.stamp(); setTimeout(() => Sound.good(), 250); buzz([40, 60, 80]);
    Analytics.ev('milestone', {at:m.at});
    showModal('Milestone reached', m.name, `"${m.quip}" Comrade Ant, Ministry of Morale.`, 'Glory to the hill',
      `<div class="mile-ant">${antFaceSVG()}</div><button class="gbtn big share-btn" data-share="milestone">${icon('up')} Share my colony</button>`);
  },
  // ----- the Lottery overlay -----
  openSpin(){
    spinDay();
    const svg = $('spin-wheel'), n = SPIN_PRIZES.length, R = 96, seg = 360 / n;
    let html = '';
    SPIN_PRIZES.forEach((p, i) => {
      const a0 = (i * seg - seg / 2 - 90) * Math.PI / 180, a1 = ((i + 1) * seg - seg / 2 - 90) * Math.PI / 180;
      const dark = p.col === '#1D1A2B' || p.col === '#8E5BF2' || p.col === '#E5392D';
      html += `<path d="M0 0 L${(R * Math.cos(a0)).toFixed(2)} ${(R * Math.sin(a0)).toFixed(2)} A${R} ${R} 0 0 1 ${(R * Math.cos(a1)).toFixed(2)} ${(R * Math.sin(a1)).toFixed(2)} Z" fill="${p.col}" stroke="#1D1A2B" stroke-width="2"/>`;
      html += `<g transform="rotate(${i * seg}) translate(0 -64)"><text text-anchor="middle" y="0" class="sw-top" fill="${dark ? '#fff' : '#1D1A2B'}">${p.top}</text><text text-anchor="middle" y="12" class="sw-sub" fill="${dark ? '#FFC738' : '#5E5872'}">${p.sub}</text></g>`;
    });
    html += `<circle r="${R}" fill="none" stroke="#1D1A2B" stroke-width="5"/>`;
    svg.innerHTML = html; svg.style.transition = 'none'; svg.style.transform = `rotate(${this.wheelRot}deg)`;
    this.spinUI(); $('spinov').hidden = false;
    Analytics.ev('spin_open');
  },
  spinUI(msg){
    const free = spinFree(), ads = spinAdsLeft(), b = $('spin-btn');
    b.disabled = this.spinBusy || (!free && !ads);
    b.innerHTML = free ? 'Free spin!' : ads ? `${adFree() ? '' : icon('play')}Spin again (${ads} left)` : 'Come back tomorrow';
    $('spin-msg').textContent = msg || (free ? 'One free spin every day. The jackpot is 300 amber!' : ads ? `Watch a broadcast for another spin. ${ads} left today.` : 'The wheel rests until tomorrow. Long live the Queen!');
  },
  async spin(){
    if (this.spinBusy) return;
    const st = spinDay();
    if (st.used < 1) st.used++;
    else if (spinAdsLeft() > 0){
      this.spinBusy = true; this.spinUI();
      const ok = adFree() ? true : await Monetize.showRewarded('spin');
      this.spinBusy = false;
      if (!ok){ this.spinUI(); return; }
      st.ads++;
    } else return;
    this.spinBusy = true; save();
    const i = rollSpin(), seg = 360 / SPIN_PRIZES.length;
    const jitter = (Math.random() - .5) * seg * .6;
    const target = this.wheelRot - (this.wheelRot % 360) + 360 * 5 + (360 - i * seg) + jitter;
    this.wheelRot = target;
    const svg = $('spin-wheel');
    svg.style.transition = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'none' : 'transform 4.2s cubic-bezier(.12,.75,.15,1)';
    svg.style.transform = `rotate(${target}deg)`;
    this.spinUI('Spinning…'); Sound.alert();
    await new Promise(r => setTimeout(r, matchMedia('(prefers-reduced-motion: reduce)').matches ? 200 : 4300));
    const p = grantSpin(i);
    this.spinBusy = false;
    if (p.big){ confetti(); Sound.reveal(p.id === 'jack' ? 'M' : 'E'); buzz([40, 60, 120]); } else Sound.good();
    toast(p.id === 'jack' ? 'JACKPOT!' : 'The Queen smiles on you', `You won ${p.text}!`, p.big ? 'jelly' : 'gold', p.icon);
    Analytics.ev('spin', {prize:p.id});
    afterChange(); this.spinUI(`You won ${p.text}!`);
  },
};

/* ---------- confetti ---------- */
function confetti(){
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cv = $('confetti'); if (!cv) return;
  const ctx = cv.getContext('2d'), W = cv.width = innerWidth, H = cv.height = innerHeight;
  const cols = ['#E5392D', '#FFC738', '#2FA862', '#8E5BF2', '#1D1A2B', '#FFFBF3'];
  const ps = Array.from({length:140}, () => ({x:W / 2 + (Math.random() - .5) * W * .3, y:H * .35, vx:(Math.random() - .5) * 900, vy:-Math.random() * 900 - 200, r:Math.random() * 6, vr:(Math.random() - .5) * 12, w:6 + Math.random() * 6, h:8 + Math.random() * 8, c:cols[Math.floor(Math.random() * cols.length)]}));
  cv.hidden = false; let last = performance.now(); const end = last + 2600;
  (function step(t){
    const dt = Math.min(.04, (t - last) / 1000); last = t;
    ctx.clearRect(0, 0, W, H);
    for (const p of ps){ p.vy += 1400 * dt; p.vx *= .99; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore(); }
    if (t < end) requestAnimationFrame(step); else { ctx.clearRect(0, 0, W, H); cv.hidden = true; }
  })(last);
}
