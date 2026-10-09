/* ============================================================
   GAME DATA (pure — ports to Expo as-is)
   ============================================================ */
const PRODUCERS = [
  {id:'forager',  name:'Foragers',              short:'FORAGE',  base:15,     cps:0.1,    color:'#f0b13c', slogan:'Every crumb belongs to the hill.'},
  {id:'aphid',    name:'Aphid Herders',         short:'APHIDS',  base:100,    cps:1,      color:'#93b65c', slogan:'Milk the aphids, not the workers.'},
  {id:'leaf',     name:'Leafcutter Brigade',    short:'LEAVES',  base:1100,   cps:8,      color:'#6f9a3f', slogan:'Carry ten times your weight. Smile while doing it.'},
  {id:'fungus',   name:'Fungus Kolkhoz',        short:'FUNGUS',  base:12000,  cps:47,     color:'#e6dcc4', slogan:'The garden is collective. So is the mold.'},
  {id:'tunnel',   name:'Tunnel Engineers',      short:'DIGGERS', base:325000, cps:260,    color:'#b88a5e', slogan:'Dig deeper than the bourgeois beetles.'},
  {id:'beetle',   name:'Beetle Tractor Pool',   short:'BEETLES', base:3.5e6,  cps:1400,   color:'#5b7fa6', slogan:'Requisitioned. Re-educated. Rolling.'},
  {id:'ministry', name:'Ministry of Pheromones',short:'SCENT',   base:5e7,    cps:7800,   color:'#c66fa8', slogan:'The trail is the truth.'},
  {id:'politburo',name:'Hive-Mind Politburo',   short:'POLITBURO',base:8.25e8,cps:44000,  color:'#c9372a', slogan:'Ten thousand minds. One opinion.'},
  {id:'orbit',    name:'Orbital Anthill',       short:'ORBIT',   base:1.275e10,cps:260000, color:'#9fc3d6', slogan:'The sky was never the limit. The lid was.'},
  {id:'comintern',name:'Comintern of Colonies', short:'COMINTERN',base:1.875e11,cps:1.6e6,  color:'#e8a33a', slogan:'Ants of all hills, unite. You have nothing to lose but your exoskeletons.'},
  {id:'dyson',    name:'Dyson Swarm',           short:'DYSON',   base:2.5e12, cps:1e7,    color:'#ffd56a', slogan:'Why carry crumbs when you can carry the sun?'},
  {id:'galactic', name:'Galactic Hive',         short:'GALAXY',  base:2.5e14, cps:6.5e7,  color:'#c9b8ff', slogan:'Every star a sugar cube.'},
  {id:'multiverse',name:'Multiverse Mound',     short:'MULTI',   base:5e16,   cps:4.5e8,  color:'#7fe0d0', slogan:'In every timeline, the hill wins.'},
  {id:'eternal',  name:'The Eternal Queen',     short:'ETERNAL', base:1.25e19,cps:3e9,    color:'#fff1cf', slogan:'She was here before the soil. She will be here after.'},
];
// Balance pass (tools/sim.js): castes 5+ cost 2.5x their first draft, so the first session
// reveals about six castes instead of nine and later ones arrive over days 1-2.
const GROWTH = 1.16;
let COSTMULT = 1;   // caste price multiplier (cards can lower it)
const PHER_BONUS = 0.04;
function pherRate(s){ return (s.doctrine && s.doctrine.potent) ? .06 : PHER_BONUS; }
const MEDAL_BONUS = 0.01;
const PICNIC_SECONDS = 300;

const SEASON_MS = 240000;   // each season lasts 4 minutes
const SEASONS = [
  {id:'spring', name:'Spring', icon:'flower', fx:'taps +50%',             prod:1,    tap:1.5, picnic:1,   picnicRate:1, research:1,  skyTop:'#4cc0ff', sky:'#c8f0ff', grass:'#5fd14b'},
  {id:'summer', name:'Summer', icon:'sun',    fx:'output +25%',           prod:1.25, tap:1,   picnic:1,   picnicRate:1, research:1,  skyTop:'#2aa2ff', sky:'#aee4ff', grass:'#4cbf3a'},
  {id:'autumn', name:'Autumn', icon:'leaf',   fx:'picnics ×2, loot +50%', prod:1,    tap:1,   picnic:1.5, picnicRate:2, research:1,  skyTop:'#ff9a5c', sky:'#ffe0b8', grass:'#d1a43c'},
  {id:'winter', name:'Winter', icon:'snow',   fx:'output −15%, lab −20%', prod:.85,  tap:1,   picnic:1,   picnicRate:1, research:.8, skyTop:'#8fb2dc', sky:'#e6eff9', grass:'#eef3f9'},
];
function seasonAt(now){ const i = Math.floor(now/SEASON_MS) % 4; return Object.assign({left:(SEASON_MS - now%SEASON_MS)/1000}, SEASONS[i]); }

const TIERS = [
  {req:10,  mult:25,     name:'Pheromone Drills'},
  {req:25,  mult:250,    name:'Stakhanovite Shifts'},
  {req:50,  mult:5000,   name:'Collective Ownership'},
  {req:100, mult:250000, name:'Order of the Red Mandible'},
  {req:150, mult:2.5e7,  name:'Eternal Brigade'},
];
const ROMAN = ['I','II','III','IV','V','VI'];
const UPGRADES = [];
PRODUCERS.forEach(p => TIERS.forEach((t,k) => UPGRADES.push({
  id:`${p.id}-${k}`, name:t.name, target:p.name, cost:p.base*t.mult,
  desc:`${p.name} produce twice as much.`, req:`Requires ${t.req} ${p.name}`,
  unlocked:s => (s.owned[p.id]||0) + (p.id==='forager' ? awayForagers(s) : 0) >= t.req, fx:{type:'prod', id:p.id, x:2}
})));
[100, 5000, 2.5e5, 2.5e7, 2.5e9, 2.5e11].forEach((c,i) => UPGRADES.push({
  id:`mand-${i}`, name:`Stronger Mandibles ${ROMAN[i]}`, target:'Your taps', cost:c,
  desc:'Each tap gathers twice as much.', req:`Gather ${fmt(c/4)} crumbs this colony`,
  unlocked:s => s.run >= c/4, fx:{type:'tap', x:2}
}));
[5e4, 5e6, 5e8, 5e10].forEach((c,i) => UPGRADES.push({
  id:`soli-${i}`, name:`Solidarity Tapping ${ROMAN[i]}`, target:'Your taps', cost:c,
  desc:'Taps also gather 1% of colony output per second.', req:`Gather ${fmt(c/4)} crumbs this colony`,
  unlocked:s => s.run >= c/4, fx:{type:'tapcps', x:0.01}
}));
[1e4, 1e6, 1e8, 1e10, 1e12, 1e14].forEach((c,i) => UPGRADES.push({
  id:`plan-${i}`, name:`Five-Year Plan ${ROMAN[i]}`, target:'Whole colony', cost:c,
  desc:'All castes produce 20% more.', req:`Gather ${fmt(c/4)} crumbs this colony`,
  unlocked:s => s.run >= c/4, fx:{type:'global', x:1.2}
}));
UPGRADES.push(
  {id:'night', name:'Night Shift', target:'While you are away', cost:2e5, desc:'Offline gathering rises from 50% to 100% speed.', req:'Gather 50 K crumbs this colony', unlocked:s => s.run >= 5e4, fx:{type:'offline', x:1}},
  {id:'lure', name:'Sugar Lure', target:'Picnics', cost:3e4, desc:'Picnic sugar cubes are worth twice as much.', req:'Raid 3 picnics', unlocked:s => s.picnics >= 3, fx:{type:'picnic', x:2}},
  {id:'drill', name:'Drill Sergeants', target:'Tap fervor', cost:1.5e4, desc:'Fervor drains half as fast when you stop tapping.', req:'Tap 300 times', unlocked:s => s.taps >= 300, fx:{type:'ferdecay', x:.5}},
  {id:'maps', name:'Expedition Maps', target:'Raids', cost:5e4, desc:'Raiding squads return 25% faster.', req:'Return from 1 raid', unlocked:s => s.raids >= 1, fx:{type:'maps'}},
  {id:'rations', name:'Field Rations', target:'Raids', cost:5e5, desc:'Raids bring back 50% more loot.', req:'Return from 5 raids', unlocked:s => s.raids >= 5, fx:{type:'rations'}},
  {id:'almanac', name:"Farmer's Almanac", target:'Seasons', cost:2e5, desc:'Winter no longer slows production.', req:'Live through a winter', unlocked:s => !!(s.flags.seasons||{}).winter, fx:{type:'almanac'}},
);
const UPG_BY_ID = Object.fromEntries(UPGRADES.map(u => [u.id,u]));

const EXPEDITIONS = [
  {id:'kitchen', name:'The Kitchen Floor', icon:'crumb',  flavor:'Crumbs under the fridge. Mostly safe.',                 dur:120,   squad:5,   mult:.6,  jelly:0},
  {id:'park',    name:'Picnic Park',       icon:'sun',    flavor:'Watermelon rinds as far as the antennae can sense.',    dur:600,   squad:15,  mult:.8,  jelly:0},
  {id:'bakery',  name:'Bakery Basement',   icon:'map',    flavor:'Flour sacks, croissant flakes, and one very large cat.',dur:1800,  squad:30,  mult:1,   jelly:.15},
  {id:'factory', name:'The Sugar Factory', icon:'swords', flavor:'A capitalist fortress of pure sucrose. Seize it.',       dur:7200,  squad:60,  mult:1.2, jelly:.5},
  {id:'moon',    name:'The Moon',          icon:'moon',   flavor:'Reportedly made of cheese. The Orbital Anthill will verify.', dur:28800, squad:100, mult:1.5, jelly:1, req:'orbit'},
];
const EXP_BY_ID = Object.fromEntries(EXPEDITIONS.map(x => [x.id,x]));

const EDICTS = [
  {id:'brood',   name:'Founding Brood',      max:1, cost:l=>1,     desc:()=>'Every new colony starts with 10 Foragers and 5 Aphid Herders.'},
  {id:'drone',   name:'Drone Chorus',        max:5, cost:l=>2+l*2, desc:l=>`Drones tap the hill for you ${l+1} time${l?'s':''} per second.`},
  {id:'fervor',  name:'Fervor Glands',       max:3, cost:l=>2+l*2, desc:l=>`Tap fervor peaks at ×${4+l} instead of ×${3+l}.`},
  {id:'scouts',  name:'Picnic Scouts',       max:1, cost:l=>3,     desc:()=>'Picnic sugar cubes drop twice as often.'},
  {id:'agitprop',name:'Agitprop Office',     max:1, cost:l=>3,     desc:()=>'Incidents happen 40% more often, and good ones last 50% longer.'},
  {id:'night',   name:'Endless Night Shift', max:1, cost:l=>2,     desc:()=>'Offline gathering covers 24 hours instead of 12.'},
  {id:'veterans',name:'Raid Veterans',       max:3, cost:l=>2+l*2, desc:l=>`Raids return ${(l+1)*15}% faster and with ${(l+1)*20}% more loot.`},
  {id:'memory',  name:'Institutional Memory',max:1, cost:l=>6,     desc:()=>'Five-Year Plans and Stronger Mandibles survive the Nuptial Flight.'},
  {id:'decree',  name:'Eternal Decree',      max:10,cost:l=>4+l*3, desc:()=>'All production +25%, forever. Stacks.'},
];

/* ---------- cards, packs, usables, pass ---------- */
const RAR_ORDER = ['C','R','E','L','M','P'];
const RARITY = {C:{name:'Common', dust:2}, R:{name:'Rare', dust:6}, E:{name:'Epic', dust:20}, L:{name:'Legendary', dust:60}, M:{name:'Mythic', dust:250}, P:{name:'Primordial', dust:1000}};
const RAR_COLOR = {C:'var(--r-c)', R:'var(--r-r)', E:'var(--r-e)', L:'var(--r-l)', M:'var(--r-m)', P:'var(--r-p)'};
const CARD_MAX = 25;
const CARDS = [
  {id:'c1', r:'C', name:'Worker No. 4471',      icon:'ant',      fx:{prod:'forager', v:.10}},
  {id:'c2', r:'C', name:'Aphid Whisperer',      icon:'bug',      fx:{prod:'aphid', v:.10}},
  {id:'c3', r:'C', name:'Leaf Sharpener',       icon:'leaf',     fx:{prod:'leaf', v:.10}},
  {id:'c4', r:'C', name:'Mold Enthusiast',      icon:'mushroom', fx:{prod:'fungus', v:.10}},
  {id:'c5', r:'C', name:'Spade Veteran',        icon:'rubble',   fx:{prod:'tunnel', v:.10}},
  {id:'c6', r:'C', name:'Tap Enthusiast',       icon:'up',       fx:{tap:.08}},
  {id:'c7', r:'C', name:'Larder Clerk',         icon:'scroll',   fx:{global:.02}},
  {id:'r1', r:'R', name:'Comrade Crumbski',     icon:'crumb',    fx:{global:.05}},
  {id:'r2', r:'R', name:'Beetle Mechanic',      icon:'beetle',   fx:{prod:'beetle', v:.20}},
  {id:'r3', r:'R', name:'Agit-Ant',             icon:'radio',    fx:{fervor:.2}},
  {id:'r4', r:'R', name:'Scout Captain',        icon:'map',      fx:{raid:.12}},
  {id:'r5', r:'R', name:'Picnic Spotter',       icon:'eye',      fx:{picnic:.20}},
  {id:'r6', r:'R', name:'Politburo Stenographer',icon:'scroll',  fx:{prod:'politburo', v:.20}},
  {id:'e1', r:'E', name:'The Iron Forager',     icon:'swords',   fx:{prod:'forager', v:.50}},
  {id:'e2', r:'E', name:'Minister of Scent',    icon:'drop',     fx:{prod:'ministry', v:.30}},
  {id:'e3', r:'E', name:'Night Watch Matron',   icon:'moon',     fx:{offline:.10}},
  {id:'e4', r:'E', name:'Field Marshal Mandible',icon:'star',    fx:{tap:.30}},
  {id:'e5', r:'E', name:'The Quartermaster',    icon:'bag',      fx:{cost:.02}},
  {id:'l1', r:'L', name:'Queen Mother Formica', icon:'crown',    fx:{global:.15}},
  {id:'l2', r:'L', name:'The Great Helmsman',   icon:'flag',     fx:{global:.08, tap:.15}},
  {id:'l3', r:'L', name:'Astro-Ant Laika',      icon:'rocket',   fx:{prod:'orbit', v:.50, raidSpeed:.05}},
  // Mythic: secret, only drop once their condition is met
  {id:'m1', r:'M', name:'The First Queen',      icon:'crown',    fx:{global:.50},              req:'super', n:1},
  {id:'m2', r:'M', name:'Red Comet',            icon:'bolt',     fx:{tap:1.0, fervor:.5},      req:'super', n:1},
  {id:'m3', r:'M', name:'Avatar of the Hive',   icon:'eye',      fx:{global:.40, cost:.01},    req:'super', n:3},
  {id:'m4', r:'M', name:'Winter Sovereign',     icon:'snow',     fx:{global:.35, offline:.25}, req:'hard',  n:1},
  {id:'m5', r:'M', name:'Unbroken Martyr',      icon:'swords',   fx:{global:.20, war:1.0},     req:'hard',  n:3},
  {id:'m6', r:'M', name:'Ouroboros Ant',        icon:'ant',      fx:{pherGain:.10},            req:'hard',  n:6},
  // Primordial: the giga-rare tier. Only exist once the first Supercolony opens the Abyss.
  // About 1 in 2,000 cards from a Politburo Pack, 2% per card from a Primordial Pack (Abyss shards),
  // guaranteed by the 40th Primordial Pack, and one is handed out every 15 depths of the Abyss.
  {id:'p1', r:'P', name:'The Ur-Queen',         icon:'crown',    fx:{global:1.0}},
  {id:'p2', r:'P', name:'Abyssal Leviathan',    icon:'bug',      fx:{abyss:.5, tap:.5}},
  {id:'p3', r:'P', name:'The Chrono-Ant',       icon:'clock',    fx:{offline:.5, raidSpeed:.1}},
  {id:'p4', r:'P', name:'The Hollow Sun',       icon:'sun',      fx:{global:.25, pherGain:.25}},
  {id:'p5', r:'P', name:'The Crowned Void',     icon:'eye',      fx:{crownGain:.2, war:2.0}},
  {id:'p6', r:'P', name:'The Eternal Swarm',    icon:'ant',      fx:{drone:3}},
];
const CARD_BY_ID = Object.fromEntries(CARDS.map(c => [c.id, c]));
function hardTotal(s){ return Object.values(s.hard||{}).reduce((a,b) => a+b, 0); }
function mythicUnlocked(c, s){ s = s || S; return c.req === 'super' ? (s.supers||0) >= c.n : hardTotal(s) >= c.n; }
function primUnlocked(s){ s = s || S; return (s.supers||0) >= 1; }
const PROD_NAME = Object.fromEntries(PRODUCERS.map(p => [p.id, p.name]));
const pctf = v => (Math.round(v*1000)/10) + '%';
function cardFx(c, l){
  const f = c.fx, out = [];
  if (f.prod) out.push(`${PROD_NAME[f.prod]} +${pctf(f.v*l)}`);
  if (f.global) out.push(`All output +${pctf(f.global*l)}`);
  if (f.tap) out.push(`Taps +${pctf(f.tap*l)}`);
  if (f.fervor) out.push(`Fervor peak +${(f.fervor*l).toFixed(1)}×`);
  if (f.raid) out.push(`Raid loot +${pctf(f.raid*l)}`);
  if (f.raidSpeed) out.push(`Raids ${pctf(f.raidSpeed*l)} faster`);
  if (f.picnic) out.push(`Picnics +${pctf(f.picnic*l)}`);
  if (f.offline) out.push(`Offline speed +${pctf(f.offline*l)}`);
  if (f.cost) out.push(`Castes ${pctf(f.cost*l)} cheaper`);
  if (f.war) out.push(`Siege damage +${pctf(f.war*l)}`);
  if (f.pherGain) out.push(`Pheromones +${pctf(f.pherGain*l)}`);
  if (f.abyss) out.push(`Guardian damage +${pctf(f.abyss*l)}`);
  if (f.crownGain) out.push(`Crowns +${pctf(f.crownGain*l)}`);
  if (f.drone) out.push(`+${f.drone*l} drone taps/s`);
  return out.join(' · ');
}
const PACKS = {
  common:{name:'Worker Pack',    n:3, price:50,  color:'var(--r-c)', guar:null, odds:{C:.749, R:.21, E:.035, L:.005, M:.001}},
  rare:  {name:'Brigade Pack',   n:4, price:150, color:'var(--r-r)', guar:'R',  odds:{C:.547, R:.33, E:.10,  L:.02, M:.003}},
  epic:  {name:'Politburo Pack', n:5, price:400, color:'var(--r-e)', guar:'E',  odds:{C:.3915, R:.35, E:.20,  L:.05, M:.008, P:.0005}},
  // Bought with Abyssal Shards in the Abyss, never with amber.
  primordial:{name:'Primordial Pack', n:3, price:0, shards:60, color:'var(--r-p)', guar:'L', odds:{E:.58, L:.30, M:.10, P:.02}},
};
const PITY = 30;
const PRIM_PITY = 40;  // a Primordial card is guaranteed by the 40th Primordial Pack without one
const USABLES = {
  rush:     {name:'Sugar Rush',          icon:'bolt',   price:20, desc:'Output ×2 for 2 minutes.'},
  oil:      {name:'Mandible Oil',        icon:'oil',    price:15, desc:'Taps ×5 for 60 seconds.'},
  tonic:    {name:'Fervor Tonic',        icon:'sun',    price:12, desc:'Fervor stays at maximum for 30 seconds.'},
  hourglass:{name:'Hourglass of Labour', icon:'clock',  price:50, desc:'Instantly collect one hour of output.'},
  basket:   {name:'Picnic Basket',       icon:'crumb',  price:10, desc:'Drop a picnic sugar cube on the hill right now.'},
  flare:    {name:'Royal Flare',         icon:'star',   price:25, desc:'Lure a winged royal over the hill right now.'},
  whistle:  {name:'Raid Whistle',        icon:'map',    price:40, desc:'Every squad out raiding returns instantly.'},
  autotap:  {name:'Auto-Tapper',         icon:'ant',    price:60, desc:'A mechanical mandible taps the hill 8 times a second for 1 hour. Stacks.'},
};
const USE_ORDER = Object.keys(USABLES);
// The pass rewards cycle through this fixed list, so adding a usable never reshuffles the pass.
const PASS_USES = ['rush','oil','tonic','hourglass','basket','flare','whistle'];
const PASS_TIERS = 30, PREMIUM_COST = 500, BONUS_XP = 2000;
const RAID_GEMS = {kitchen:1, park:3, bakery:6, factory:15, moon:40};
function tierNeed(t){ return 400 + t*80; }
function passTier(xp){ let t = 0; while (t < PASS_TIERS && xp >= tierNeed(t)){ xp -= tierNeed(t); t++; } return {tier:t, into:xp, need: t < PASS_TIERS ? tierNeed(t) : BONUS_XP}; }
function passReward(t, prem){
  const U = PASS_USES;
  if (!prem){
    if (t === PASS_TIERS) return {t:'card', id:'l1'};
    if (t % 10 === 0) return {t:'pack', id:'epic'};
    if (t % 5 === 0) return {t:'jelly', n:1};
    const c = t % 4;
    return c===1 ? {t:'gems', n:15} : c===2 ? {t:'pack', id:'common'} : c===3 ? {t:'crumbs', min:10} : {t:'use', id:U[t % U.length], n:1};
  }
  if (t === PASS_TIERS) return {t:'card', id:'l2'};
  if (t === PASS_TIERS - 1 || t % 10 === 0) return {t:'pack', id:'epic', n:2};
  if (t % 5 === 0) return {t:'gems', n:120};
  const c = t % 3;
  return c===1 ? {t:'pack', id:'rare'} : c===2 ? {t:'use', id:U[(t+3) % U.length], n:3} : t % 6 === 0 ? {t:'jelly', n:2} : {t:'gems', n:50};
}
// Premium perks for the season: faster merit, more output, an instant pack and better bonus packs.
const PREM_MERIT = 1.5, PREM_OUTPUT = .10;
function unlockPremium(){
  if (S.pass.premium) return false;
  S.pass.premium = true;
  S.packs.epic = (S.packs.epic||0) + 1;
  D = derive(S);
  return true;
}

/* ---------- endgame ---------- */
const REPEATS = [
  {id:'eff',  name:'Collective Efficiency', desc:l=>`All output +5% per level. Now +${l*5}%.`,             cost:l=>1e6*Math.pow(10,l)},
  {id:'mand', name:'Ceaseless Mandibles',   desc:l=>`Taps +10% per level. Now +${l*10}%.`,                cost:l=>2e5*Math.pow(8,l)},
  {id:'loot', name:'Deep Supply Lines',     desc:l=>`Raid loot and siege damage +5% per level. Now +${l*5}%.`, cost:l=>5e7*Math.pow(12,l)},
];
const REP_BY_ID = Object.fromEntries(REPEATS.map(r => [r.id, r]));
const SUPER_REQ = 150;
const DOCTRINE = [
  {id:'hiring',   name:'Automated Hiring',          cost:3,  desc:'Every 2 seconds the colony hires the best-value caste it can afford.'},
  {id:'standing', name:'Standing Orders',           cost:4,  desc:'Raiding squads are sent out and collected automatically.'},
  {id:'longnight',name:'Endless Dark',              cost:4,  desc:'Offline gathering covers 72 hours.'},
  {id:'selfdir',  name:'Self-Directed Research',    cost:5,  desc:'The Lab buys the cheapest affordable research by itself.'},
  {id:'potent',   name:'Potent Pheromones',         cost:6,  desc:'Each pheromone gives +6% instead of +4%.'},
  {id:'totalwar', name:'Doctrine of Total War',     cost:6,  desc:'Siege damage against rival colonies ×3.'},
  {id:'archive',  name:'Archive of the Revolution', cost:8,  desc:'All research and endless Lab levels survive the Nuptial Flight.'},
  {id:'swarming', name:'Mass Swarming',             cost:8,  desc:'Nuptial Flights yield 50% more pheromones.'},
  {id:'cellar',   name:'Royal Cellar',              cost:10, desc:'Edicts and royal jelly survive the Supercolony.'},
  {id:'expansion',name:'Hive Expansion',            cost:12, desc:'Unlocks three endgame castes beyond the Dyson Swarm.'},
  {id:'network',  name:'Supercolony Network',       cost:l=>5+l*5, max:99, desc:'All output +25% per level. Repeatable.'},
];
function docCost(d, l){ return typeof d.cost === 'function' ? d.cost(l) : d.cost; }
const RIVALS = 40;
const RIVAL_ADJ = ['Smug','Bourgeois','Decadent','Revisionist','Imperial','Gilded','Sinister','Eternal'];
const RIVAL_SPECIES = ['Red Ant','Fire Ant','Carpenter Ant','Army Ant','Weaver Ant','Bullet Ant','Honeypot Ant','Termite','Wasp','Hornet'];
const RIVAL_POLITY = ['Duchy','Junta','Commonwealth','Empire','Syndicate','Theocracy','Federation','Khanate'];
function rival(i){ return {name:`The ${RIVAL_ADJ[i%8]} ${RIVAL_SPECIES[i%10]} ${RIVAL_POLITY[Math.floor(i/5)%8]}`, hp: 5e8*Math.pow(9,i), gems: 25*(i+1), crown: (i+1)%5===0}; }
const HARDSHIPS = [
  {id:'winter',   name:'Eternal Winter',     icon:'snow',  rule:'It is always winter, and winter cuts output by 60%.'},
  {id:'pacifist', name:'Hands Off the Hill', icon:'mute',  rule:'Taps and drones gather nothing at all.'},
  {id:'austerity',name:'Austerity Plan',     icon:'scroll',rule:'Every caste costs three times as much.'},
  {id:'burning',  name:'Book Burning',       icon:'flask', rule:'The Lab is closed: research and Lab levels do nothing.'},
];
const HARD_BY_ID = Object.fromEntries(HARDSHIPS.map(h => [h.id, h]));
function hardGoal(id){ return 1e10 * Math.pow(100, (S.hard||{})[id]||0); }
function hardUnlocked(){ return S.supers >= 1 || S.flights >= 10; }
const PASS_EPOCH = Date.UTC(2026, 9, 1), PASS_LEN = 28*86400000;
const PASS_NAMES = ['The Red Spring','The Long March','Harvest of Plenty','The Great Thaw','Iron Mandibles','The Sugar Front','Night of Long Antennae','Glorious Swarm'];
function passSeason(now){ const i = Math.max(0, Math.floor((now - PASS_EPOCH)/PASS_LEN)); return {n:i+1, name:PASS_NAMES[i % PASS_NAMES.length], ends: PASS_EPOCH + (i+1)*PASS_LEN}; }

function totalOwned(s){ return PRODUCERS.reduce((n,p) => n + (s.owned[p.id]||0), 0); }
function awayForagers(s){ return Object.values(s.exp||{}).reduce((n,e) => n + e.squad, 0); }
const M = (id,name,req,cur,target) => ({id,name,req,cur,target});
const MEDALS = [
  M('tap1','First Crumb','Tap the hill once', s=>s.taps, 1),
  M('tap100','Calloused Mandibles','Tap 100 times', s=>s.taps, 100),
  M('tap1k','Hero of Tapping Labour','Tap 1,000 times', s=>s.taps, 1000),
  M('tap10k','Tapping Stakhanovite','Tap 10,000 times', s=>s.taps, 10000),
  M('fervor','Revolutionary Fervor','Fill the fervor meter', s=>s.flags.fervor?1:0, 1),
  M('life3','Modest Larder','Gather 1 K crumbs in total', s=>s.lifetime, 1e3),
  M('life6','Million-Crumb March','Gather 1 M crumbs in total', s=>s.lifetime, 1e6),
  M('life9','Billion-Crumb Banquet','Gather 1 B crumbs in total', s=>s.lifetime, 1e9),
  M('life12','Trillion-Crumb Triumph','Gather 1 T crumbs in total', s=>s.lifetime, 1e12),
  M('life15','Post-Scarcity Hill','Gather 1 Qa crumbs in total', s=>s.lifetime, 1e15),
  M('cps10','Steady Trail','Reach 10 crumbs per second', (s,d)=>d.baseCps, 10),
  M('cps1k','Industrial Hill','Reach 1 K per second', (s,d)=>d.baseCps, 1e3),
  M('cps1m','Superpower Status','Reach 1 M per second', (s,d)=>d.baseCps, 1e6),
  M('cps1b','Galactic Collective','Reach 1 B per second', (s,d)=>d.baseCps, 1e9),
  M('own10','A Small Cell','Have 10 comrades', s=>totalOwned(s), 10),
  M('own100','Mass Movement','Have 100 comrades', s=>totalOwned(s), 100),
  M('own500','Teeming Masses','Have 500 comrades', s=>totalOwned(s), 500),
  M('allc','Full Politburo','Own one of every caste', s=>PRODUCERS.filter(p=>(s.owned[p.id]||0)>0).length, PRODUCERS.length),
  M('pic1','Picnic Raider','Raid a picnic sugar cube', s=>s.picnics, 1),
  M('pic25','Scourge of Picnics','Raid 25 picnics', s=>s.picnics, 25),
  M('ant1','Anteater Repelled','Drive off an anteater', s=>s.anteaters, 1),
  M('ant10','Anteater Nemesis','Drive off 10 anteaters', s=>s.anteaters, 10),
  M('rub1','Tunnel Rescuer','Clear a tunnel collapse', s=>s.rubbles, 1),
  M('fly1','Royal Interception','Catch a winged royal', s=>s.flyers, 1),
  M('inc10','Seasoned Bureaucrat','Resolve 10 incidents', s=>s.incidents, 10),
  M('inc50','Minister of Crises','Resolve 50 incidents', s=>s.incidents, 50),
  M('raid1','Into the Kitchen','Return from a raid', s=>s.raids, 1),
  M('raid25','Raid Commissar','Return from 25 raids', s=>s.raids, 25),
  M('moon','Ants on the Moon','Return from the Moon', s=>s.flags.moon?1:0, 1),
  M('seas','Four Seasons Plan','Live through all four seasons', s=>Object.keys(s.flags.seasons||{}).length, 4),
  M('day3','Party Regular','Attend 3 Party Congresses in a row', s=>s.daily.best, 3),
  M('day7','Loyal Delegate','Attend 7 Party Congresses in a row', s=>s.daily.best, 7),
  M('q10','Plan Overfulfilled','Complete 10 quotas', s=>s.quotaN, 10),
  M('q50','Hero of the Plan','Complete 50 quotas', s=>s.quotaN, 50),
  M('res10','Academician','Complete 10 research projects', s=>s.bought.length, 10),
  M('res30','Institute Laureate','Complete 30 research projects', s=>s.bought.length, 30),
  M('fl1','First Flight','Take the Nuptial Flight', s=>s.flights, 1),
  M('fl5','Frequent Flyer','Take 5 flights', s=>s.flights, 5),
  M('ed5','Royal Bureaucracy','Pass 5 levels of edicts', s=>Object.values(s.edicts).reduce((a,b)=>a+b,0), 5),
  M('card1','First Draw','Collect your first card', s=>Object.keys(s.cards).length, 1),
  M('card10','Card Collector','Collect 10 different cards', s=>Object.keys(s.cards).length, 10),
  M('cardL','Legend of the Hill','Collect a legendary card', s=>CARDS.filter(c=>c.r==='L' && s.cards[c.id]).length, 1),
  M('pass10','Pass Veteran','Reach Revolution Pass tier 10', s=>passTier(s.pass.xp).tier, 10),
  M('war1','First Conquest','Conquer a rival colony', s=>s.war.beaten, 1),
  M('war10','Hegemon','Conquer 10 rival colonies', s=>s.war.beaten, 10),
  M('war25','World Hill','Conquer 25 rival colonies', s=>s.war.beaten, 25),
  M('super1','Supercolony','Form a Supercolony', s=>s.supers, 1),
  M('super5','Continental Hive','Form 5 Supercolonies', s=>s.supers, 5),
  M('hard1','Survivor','Survive a hardship', s=>Object.values(s.hard).reduce((a,b)=>a+b,0), 1),
  M('hard12','Iron Collective','Survive 12 hardships', s=>Object.values(s.hard).reduce((a,b)=>a+b,0), 12),
  M('eternal','Long Live the Queen','Hire The Eternal Queen', s=>s.owned.eternal||0, 1),
  M('abyss10','Into the Abyss','Clear depth 10 of the Abyss', s=>(s.abyss||{}).depth||0, 10),
  M('abyss50','Deep Earth Commissar','Clear depth 50 of the Abyss', s=>(s.abyss||{}).depth||0, 50),
  M('prim1','Primordial Awakening','Pull a Primordial card', s=>CARDS.filter(c=>c.r==='P' && s.cards[c.id]).length, 1),
  M('prim6','Keeper of the Deep','Collect all six Primordial cards', s=>CARDS.filter(c=>c.r==='P' && s.cards[c.id]).length, 6),
  M('myth1','Myth Made Real','Pull a secret Mythic card', s=>CARDS.filter(c=>c.r==='M' && s.cards[c.id]).length, 1),
  M('myth6','Keeper of Secrets','Collect all six Mythic cards', s=>CARDS.filter(c=>c.r==='M' && s.cards[c.id]).length, 6),
  M('cardmax','Perfected Comrade','Raise a card to level 25', s=>Object.values(s.cards).some(l=>l>=25)?1:0, 1),
  M('life21','Heat Death of Hunger','Gather 1 Sx crumbs in total', s=>s.lifetime, 1e21),
];

