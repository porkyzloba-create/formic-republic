/* ---------- first-session Plan (onboarding) ----------
   A fixed run of quotas for brand-new players. Each step teaches one system,
   points at the tab that does it, and pays enough to make the next step quick.
   Tabs appear as the steps reach them, so the first screen stays simple. */
const TUT = [
  {kind:'taps',         target:15, reward:60,  label:'Tap the hill 15 times'},
  {kind:'hire_forager', target:3,  reward:80,  label:'Hire 3 Foragers',                go:'castes'},
  {kind:'research',     target:1,  reward:150, label:'Research Stronger Mandibles',    go:'research'},
  {kind:'pack',         target:1,  reward:200, label:'Open the gift pack from the Politburo', go:'cards', gems:5,
     begin:s => { s.packs.common = (s.packs.common||0) + 1; addGems(50); toast('A gift from the Politburo', 'A free Worker Pack and +50 amber. Open the pack in Cards.', 'gold', 'gift'); }},
  {kind:'hire_aphid',   target:1,  reward:250, label:'Hire an Aphid Herder',           go:'castes'},
  {kind:'send',         target:1,  reward:200, label:'Send 5 Foragers to raid the Kitchen', go:'raids',
     skip:s => s.raids > 0 || Object.keys(s.exp).length > 0},
  {kind:'gather',       target:500,reward:300, label:'Gather 500 crumbs while they march'},
  {kind:'raid',         target:1,  reward:400, label:'Bring the raiding squad home',   go:'raids', gems:10,
     skip:s => !Object.keys(s.exp).length},
];
const TAB_AT = {castes:0, research:2, cards:3, shop:3, raids:5, pass:TUT.length, medals:TUT.length, flight:TUT.length, ranks:TUT.length, alliance:TUT.length};
const TAB_NAME = {research:'Lab', cards:'Cards', shop:'Shop', raids:'Raids', pass:'Pass', medals:'Goals', flight:'Flight', ranks:'Ranks', alliance:'Alliance'};
function tutStep(){ const t = S.flags.tut; return typeof t === 'number' ? t : TUT.length; }
function tutActive(){ return tutStep() < TUT.length; }
function initTut(){
  if (S.flags.tut !== undefined) return;
  const isNew = S.lifetime < 50 && !S.flights && !S.supers && !S.quotaN;
  S.flags.tut = isNew ? 0 : TUT.length;
  if (isNew){ S.flags.v4 = true; S.quota = null; }
}
function tabShown(t){ return tutStep() >= (TAB_AT[t]||0); }
const freshTabs = new Set();
/* Navigation: five sections in the bottom bar, each holding one or more of the
   internal tabs. Hill and Goals show their tabs as sub-tabs; March keeps its own
   Raids / Conquest / Abyss switch; the Nuptial Flight is the red header button. */
const GROUPS = {
  hill:  {label:'Hill',  icon:'ant',   tabs:['castes','research'], sub:[['castes','Castes'],['research','Lab']]},
  march: {label:'March', icon:'map',   tabs:['raids']},
  cards: {label:'Cards', icon:'cards', tabs:['cards']},
  goals: {label:'Goals', icon:'star',  tabs:['medals','pass'], sub:[['medals:dir','Directives'],['pass','Pass'],['medals:medals','Medals']]},
  world: {label:'Ranks', icon:'crown', tabs:['ranks','alliance'], sub:[['ranks','Weekly league'],['alliance','Alliance']]},
  shop:  {label:'Shop',  icon:'bag',   tabs:['shop']},
};
const GROUP_OF = {castes:'hill', research:'hill', raids:'march', cards:'cards', medals:'goals', pass:'goals', ranks:'world', alliance:'world', shop:'shop', flight:'flight'};
const lastIn = {hill:'castes', goals:'medals', world:'ranks'};
function goTab(t, goalsSect){ tab = t; if (t === 'medals' && goalsSect) sect.goals = goalsSect; freshTabs.delete(t); confirmUntil = 0; render(); $('list').scrollTop = 0; }
function finishTut(){
  S.inv.rush = (S.inv.rush||0) + 1; S.inv.basket = (S.inv.basket||0) + 1; addGems(25);
  ['pass','medals','flight','ranks'].forEach(t => freshTabs.add(t));
  showModal('Training complete', 'The Bureau is open', 'Pass, Goals, Ranks and the Nuptial Flight are now on the panel. Goals holds three Daily Directives that refresh every day. Ranks is the weekly league: race other colonies and team up with friends in an alliance. Your quotas will vary from here on. You also got +25 amber, a Sugar Rush and a Picnic Basket on your belt.', 'Glory to the hill');
}

/* ---------- quotas (the Plan) ---------- */
function genQuota(){
  const n = S.quotaN;
  while (tutActive()){
    const st = tutStep(), t = TUT[st];
    if (t.skip && t.skip(S)){ S.flags.tut = st + 1; continue; }
    if (t.begin) t.begin(S);
    Object.keys(TAB_AT).forEach(k => { if (TAB_AT[k] === st && st > 0) freshTabs.add(k); });
    S.quota = {kind:t.kind, target:t.target, progress:0, label:t.label, reward:t.reward, jelly:0, gems:t.gems||2, go:t.go||null, tut:st};
    return;
  }
  let pool = ['gather','taps','hire'];
  const cheap = availableUpgrades(S).some(u => upgCost(u) < S.crumbs + D.baseCps*240 + 200);
  if (cheap) pool.push('research');
  if (n >= 2) pool.push('picnic','incident');
  if (EXPEDITIONS.some(canSend) || Object.keys(S.exp).length) pool.push('raid');
  if (S.quota) pool = pool.filter(k => k !== S.quota.kind);
  const k = pool[Math.floor(Math.random()*pool.length)];
  let target, label;
  if (k==='gather'){ target = Math.max(80, Math.round(D.baseCps*150 + D.baseTap*30)); label = `Gather ${fmt(target)} crumbs`; }
  else if (k==='taps'){ target = 40 + Math.min(n,12)*10; label = `Tap the hill ${target} times`; }
  else if (k==='hire'){ target = 4 + Math.min(n,16)*2; label = `Hire ${target} comrades`; }
  else if (k==='research'){ target = 1; label = 'Complete a research project'; }
  else if (k==='picnic'){ target = 1; label = 'Raid a picnic sugar cube'; }
  else if (k==='raid'){ target = 1; label = 'Bring a raiding squad home'; }
  else { target = 1; label = 'Resolve an incident'; }
  S.quota = {kind:k, target, progress:0, label, reward: Math.max(60, D.baseCps*240 + D.baseTap*40), jelly: (n+1)%5===0 ? 1 : 0};
}
function track(kind, amt){
  dirTrack(kind, amt);
  const q = S.quota; if (!q || q.kind !== kind) return;
  q.progress += amt;
  if (q.progress >= q.target){
    S.quotaN++; dirTrack('quota', 1);
    S.crumbs += q.reward; S.run += q.reward; S.lifetime += q.reward; S.ascLife += q.reward;
    if (q.jelly) S.jelly += q.jelly;
    const gm = q.gems || (q.jelly ? 10 : 2);
    addGems(gm); merit(40);
    toast(`Quota ${S.quotaN} fulfilled`, `+${fmt(q.reward)} crumbs` + (q.jelly ? ' and +1 royal jelly' : '') + ` · +${gm} amber. The Plan is ahead of schedule.`, q.jelly ? 'jelly' : 'gold', 'scroll');
    if (q.tut !== undefined){ S.flags.tut = q.tut + 1; if (!tutActive()) finishTut(); }
    const qe = $('quota'); qe.classList.remove('stamped'); void qe.offsetWidth; qe.classList.add('stamped');
    Sound.stamp(); bump();
    genQuota();
  }
}

