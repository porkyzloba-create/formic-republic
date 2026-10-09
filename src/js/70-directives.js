/* ---------- Daily Directives ----------
   Three goals a day (they scale with the colony), each paying amber and crumbs.
   Finish all three for the Directive Chest. Finish every directive on 5 days
   of a week for the Weekly Chest. One free swap a day (behind an ad on mobile).
   Directives survive flights; they unlock once training is done. */
const DIR_KINDS = {
  taps:     {icon:'up',     make:s => { const t = 150 + Math.min(s.quotaN,40)*5; return [t, `Tap the hill ${t} times`]; }},
  hire:     {icon:'ant',    make:s => { const t = Math.max(10, Math.min(60, Math.round(totalOwned(s)*.15) + 10)); return [t, `Hire ${t} comrades`]; }},
  gather:   {icon:'crumb',  make:s => { const t = Math.max(2000, Math.round(D.baseCps*900 + D.baseTap*300)); return [t, `Gather ${fmt(t)} crumbs`]; }},
  quota:    {icon:'scroll', make:s => [3, 'Fulfil 3 Plan quotas']},
  raid:     {icon:'map',    make:s => [2, 'Bring home 2 raiding squads']},
  incident: {icon:'warn',   make:s => [3, 'Resolve 3 incidents']},
  research: {icon:'flask',  make:s => [2, 'Complete 2 research projects'], ok:s => availableUpgrades(s).length + s.bought.length >= 2},
  picnic:   {icon:'gift',   make:s => [2, 'Raid 2 picnic sugar cubes']},
  pack:     {icon:'cards',  make:s => [1, 'Open a card pack']},
};
const DIR_WEEK_GOAL = 5;
function weekKey(t){ const d = new Date(t); d.setHours(0,0,0,0); d.setDate(d.getDate() - (d.getDay()+6)%7); return dayKey(d.getTime()); }
function dirReward(){ return {gems: 10, crumbs: Math.max(500, Math.round(D.baseCps*300 + D.baseTap*60))}; }
function makeDirective(exclude){
  const pool = Object.keys(DIR_KINDS).filter(k => !exclude.includes(k) && (!DIR_KINDS[k].ok || DIR_KINDS[k].ok(S)));
  const k = pool[Math.floor(Math.random()*pool.length)];
  const [target, label] = DIR_KINDS[k].make(S);
  return {kind:k, target, label, progress:0, claimed:false, reward:dirReward()};
}
function checkDirectives(){
  if (tutActive()) return;
  const now = Date.now(), today = dayKey(now), wk = weekKey(now);
  const d = S.dir;
  if (d.week !== wk){ d.week = wk; d.days = []; d.weekClaimed = false; }
  if (d.day === today) return;
  d.day = today; d.list = []; d.chest = false; d.swapped = false;
  for (let i = 0; i < 3; i++) d.list.push(makeDirective(d.list.map(x => x.kind)));
  if (d.seen) toast('New Daily Directives', 'Three fresh goals are waiting in Goals.', 'gold', 'scroll');
  d.seen = true;
  if (tab === 'medals') render();
}
function dirTrack(kind, amt){
  const d = S.dir; if (!d || !d.list) return;
  for (const x of d.list){
    if (x.kind !== kind || x.progress >= x.target) continue;
    x.progress = Math.min(x.target, x.progress + amt);
    if (x.progress >= x.target){ toast('Directive complete', `${x.label}. Claim the reward in Goals.`, 'gold', DIR_KINDS[x.kind].icon); Sound.stamp(); }
  }
}
function dirClaimable(){
  const d = S.dir; if (!d || !d.list || !d.list.length) return 0;
  let n = d.list.filter(x => x.progress >= x.target && !x.claimed).length;
  if (!d.chest && d.list.every(x => x.claimed)) n++;
  if (!d.weekClaimed && (d.days||[]).length >= DIR_WEEK_GOAL) n++;
  return n;
}
function claimDirective(i){
  const d = S.dir, x = d.list[i]; if (!x || x.claimed || x.progress < x.target) return;
  x.claimed = true; addGems(x.reward.gems); gain(x.reward.crumbs); merit(30); bump();
  toast('Directive reward', `+${x.reward.gems} amber and +${fmt(x.reward.crumbs)} crumbs.`, 'gold', 'gem'); Sound.good();
}
function claimDirChest(){
  const d = S.dir; if (d.chest || !d.list.every(x => x.claimed)) return;
  d.chest = true; S.packs.rare = (S.packs.rare||0) + 1; addGems(20); merit(100);
  if (!d.days.includes(d.day)) d.days.push(d.day);
  showModal('Directive Chest', 'All 3 done!', `A Brigade Pack (open it in Cards), +20 amber and 100 pass merit. Week progress: ${d.days.length}/${DIR_WEEK_GOAL} full days.`, 'Glory to the Plan');
  Sound.stamp();
}
function claimWeekChest(){
  const d = S.dir; if (d.weekClaimed || d.days.length < DIR_WEEK_GOAL) return;
  d.weekClaimed = true; S.packs.epic = (S.packs.epic||0) + 1; S.jelly += 1; addGems(50);
  showModal('Weekly Chest', 'Hero of the Week', 'A Politburo Pack, 1 royal jelly and +50 amber. A new week of directives starts on Monday.', 'Long live the hill');
  Sound.stamp();
}
let swapBusy = false;
async function swapDirective(i){
  const d = S.dir, x = d.list[i]; if (!x || d.swapped || x.claimed || swapBusy) return;
  swapBusy = true;
  const ok = adFree() ? true : await Monetize.showRewarded('swap');
  swapBusy = false;
  if (!ok || d.swapped) return;
  d.swapped = true; d.list[i] = makeDirective(d.list.map(y => y.kind));
  toast('Directive swapped', d.list[i].label + '.', 'good', DIR_KINDS[d.list[i].kind].icon);
  save(); render();
}
function dirHTML(){
  const d = S.dir;
  if (tutActive() || !d.list || !d.list.length) return `<div class="locked">Daily Directives unlock when training is done.</div>`;
  const now = Date.now(), mid = new Date(now); mid.setHours(24,0,0,0);
  const allClaimed = d.list.every(x => x.claimed);
  let html = `<div class="dir-head"><div><div class="ph-eyebrow">DAILY DIRECTIVES</div><div class="dir-title">Today's orders from the Politburo</div></div><div class="dir-clock">New in<br><b>${fmtTime((mid - now)/1000)}</b></div></div>`;
  html += d.list.map((x,i) => {
    const done = x.progress >= x.target;
    const btn = x.claimed ? `<span class="dir-done">${icon('star')} Done</span>`
      : done ? `<button class="btn gold dir-btn" data-dclaim="${i}">Claim</button>`
      : !d.swapped ? `<button class="gbtn ${adFree() ? 'free' : 'ad'} dir-swap" data-dswap="${i}">${adFree() ? '' : icon('play')}Swap</button>` : '';
    return `<div class="dir ${x.claimed ? 'claimed' : done ? 'ready' : ''}" data-di="${i}"><div class="dir-ic">${icon(DIR_KINDS[x.kind].icon)}</div>
      <div class="row-main"><div class="row-name">${x.label}</div>
        <div class="dir-bar"><div class="dir-fill" style="width:${Math.min(100, x.progress/x.target*100)}%"></div></div>
        <div class="dir-meta"><span class="dir-prog">${x.kind === 'gather' ? fmt(x.progress) + ' / ' + fmt(x.target) : x.progress + ' / ' + x.target}</span><span>${icon('gem')}${x.reward.gems} · ${icon('crumb')}${fmt(x.reward.crumbs)}</span></div></div>
      <div class="dir-act">${btn}</div></div>`;
  }).join('');
  const chestReady = allClaimed && !d.chest;
  html += `<div class="dir-chest ${chestReady ? 'ready' : d.chest ? 'claimed' : ''}"><div class="dir-ic big">${icon('gift')}</div>
    <div class="row-main"><div class="row-name">Directive Chest</div><div class="row-sub">Finish all three: a Brigade Pack and 20 amber.</div></div>
    <div class="dir-act">${d.chest ? `<span class="dir-done">${icon('star')} Opened</span>` : `<button class="btn gold dir-btn" data-dchest ${chestReady ? '' : 'disabled'}>${chestReady ? 'Open' : d.list.filter(x=>x.claimed).length + '/3'}</button>`}</div></div>`;
  const days = d.days || [], wkReady = days.length >= DIR_WEEK_GOAL && !d.weekClaimed;
  html += `<div class="dir-week"><div class="dir-week-top"><span><b>Weekly Chest</b> · ${Math.min(days.length, DIR_WEEK_GOAL)}/${DIR_WEEK_GOAL} full days</span><span>Politburo Pack · 1 jelly · 50 amber</span></div>
    <div class="dir-dots">${Array.from({length:7}, (_,i) => `<i class="${i < days.length ? 'on' : ''} ${i === DIR_WEEK_GOAL-1 ? 'goal' : ''}"></i>`).join('')}</div>
    ${d.weekClaimed ? `<div class="dir-done" style="justify-content:center">${icon('star')} Claimed this week</div>` : `<button class="btn ${wkReady ? 'gold' : ''}" style="width:100%;font-size:16px;padding:9px" data-dweek ${wkReady ? '' : 'disabled'}>${wkReady ? 'Open the Weekly Chest' : 'Resets every Monday'}</button>`}</div>`;
  html += `<div class="locked">${d.swapped ? 'You have used today\'s swap.' : `You can swap one directive a day${adFree() ? '' : ' by watching a broadcast'}.`} Directives are kept through the Nuptial Flight.</div>`;
  return html;
}

