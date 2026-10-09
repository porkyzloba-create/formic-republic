/* ---------- daily Party Congress ---------- */
function dayKey(t){ const d = new Date(t); return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`; }
function checkDaily(){
  const now = Date.now(), today = dayKey(now);
  if (S.daily.last === today) return;
  const yesterday = dayKey(now - 86400000);
  S.daily.streak = S.daily.last === yesterday ? S.daily.streak + 1 : 1;
  S.daily.last = today;
  S.daily.best = Math.max(S.daily.best, S.daily.streak);
  const st = S.daily.streak, day = ((st-1) % 7) + 1;
  const reward = (D.baseCps*300 + D.baseTap*50 + 100) * day;
  const jelly = day === 7 ? 2 : day === 4 ? 1 : 0;
  gain(reward); S.jelly += jelly; addGems(5*day); merit(100);
  if (tutActive()) return;  // brand-new players: no pop-up before their first tap; the day-1 gift is granted quietly
  const boxes = Array.from({length:7}, (_,i) => `<div class="${i+1 < day ? 'on' : i+1 === day ? 'today' : ''}">${i+1}</div>`).join('');
  showModal(`Party Congress · day ${st} in a row`, '+' + fmt(reward),
    `The delegates rise and applaud. Come back tomorrow for a bigger gift: day 4 adds 1 royal jelly, day 7 adds 2.` + (jelly ? ` Today: +${jelly} royal jelly!` : '') + ` Plus ${5*day} amber and 100 pass merit.`,
    'Accept the gift', `<div class="streak">${boxes}</div>`);
}

/* ---------- random incidents ---------- */
function bestCasteFor(value){
  const owned = PRODUCERS.filter(p => (S.owned[p.id]||0) > 0);
  for (let i = owned.length-1; i >= 0; i--){
    const p = owned[i], n = maxAffordable(p, S.owned[p.id], value);
    if (n >= 1) return {id:p.id, name:p.name, n};
  }
  return null;
}
const EVENTS = [
  {id:'aphids', w:3, type:'buff', icon:'bug', title:'Bumper Aphid Season', text:'The aphids are making honeydew faster than the Ministry can count it. Output ×2 for 45s.', buff:{name:'Aphid Season', prod:2, dur:45}},
  {id:'swarm', w:3, type:'buff', icon:'ant', title:'Swarm Day', text:'A national holiday! Every tap gathers 7× for 20 seconds. Tap!', buff:{name:'Swarm Day', tap:7, dur:20, gold:true}},
  {id:'census', w:2, type:'buff', icon:'scroll', title:'Glorious Census', text:'Being counted fills every ant with pride. Output +50% for 60s.', buff:{name:'Census Pride', prod:1.5, dur:60}},
  {id:'parade', w:2, type:'buff', icon:'star', title:'Victory Parade', text:'Marching beetle bands! Taps ×3 and output ×1.5 for 30s.', buff:{name:'Parade', prod:1.5, tap:3, dur:30}},
  {id:'radio', w:2, type:'buff', icon:'radio', title:'Radio Hill Broadcast', text:'Rousing anthems on every frequency. Taps ×2 and output +20% for 50s.', buff:{name:'Anthems', prod:1.2, tap:2, dur:50}},
  {id:'honeydew', w:1, type:'buff', icon:'drop', title:'Honeydew Rain', text:'It is raining sugar. Do not question it. Output ×3 for 20s.', buff:{name:'Honeydew Rain', prod:3, dur:20, gold:true}},
  {id:'flyer', w:2, type:'flyer', cond:s=>s.run>100},
  {id:'anteater', w:2, type:'anteater', cond:s=>s.run>300},
  {id:'quake', w:2, type:'rubble', cond:s=>s.run>800},
  {id:'petition', w:3, type:'choice', icon:'scroll', title:"Workers' Council Petition", text:'The Leafcutters demand a second leaf per ant. The Council awaits your answer.',
    a:{label:'Grant it', note:'costs 10% of the larder', run:()=>{ spend(S.crumbs*.1); addBuff({name:'Grateful Workers', prod:1.6, dur:90}); return ['The workers cheer','Output +60% for 90 seconds.','good']; }},
    b:{label:'Denounce them', note:'free, but morale drops', run:()=>{ addBuff({name:'Low Morale', prod:.75, dur:30}); return ['Petition shredded','Output −25% for 30 seconds.','bad']; }}},
  {id:'spy', w:3, type:'choice', icon:'wasp', title:'Wasp Spy Captured', text:'A wasp in a fake moustache was caught mapping the tunnels.',
    a:{label:'Interrogate', note:'take their rations', run:()=>{ const g = D.baseCps*120 + D.baseTap*20 + 10; gain(g); bump(); return ['The spy talks', `Stolen wasp rations: +${fmt(g)} crumbs.`,'good']; }},
    b:{label:'Recruit', note:'taps ×3 for 40s', run:()=>{ addBuff({name:'Wasp Recruit', tap:3, dur:40}); return ['The wasp joins the cause','Taps ×3 for 40 seconds.','good']; }}},
  {id:'war', w:2, type:'choice', icon:'swords', cond:s=>s.crumbs>200, title:'Rival Colony at the Border', text:'The red ants of the next hill are massing. They look smug.',
    a:{label:'Declare war', note:'stake 15%, 60% to win', run:()=>{ const stake = S.crumbs*.15; if (Math.random() < .6){ const g = stake*1.5 + D.baseCps*300; gain(g); bump(); return ['Victory!', `Their larder is now our larder: +${fmt(g)}.`,'good']; } spend(stake); return ['Defeat', `The war cost ${fmt(stake)} crumbs.`,'bad']; }},
    b:{label:'Sign a pact', note:'safe and boring', run:()=>['Pact signed','A non-aggression pact. Nobody believes it.','neutral']}},
  {id:'rain', w:2, type:'choice', icon:'cloud', title:'Rainstorm Over the Hill', text:'Water is seeping into the upper tunnels.',
    a:{label:'Seal tunnels', note:'output −50% for 30s', run:()=>{ addBuff({name:'Sealed Tunnels', prod:.5, dur:30}); return ['The hill stays dry','Work resumes slowly.','neutral']; }},
    b:{label:'Keep working', note:'50/50: flood or glory', run:()=>{ if (Math.random() < .5){ const l = S.crumbs*.1; spend(l); return ['Flood!', `${fmt(l)} crumbs washed away.`,'bad']; } addBuff({name:'Storm Heroes', prod:2, dur:45}); return ['Storm heroes','Output ×2 for 45 seconds.','good']; }}},
  {id:'beetle', w:2, type:'choice', icon:'beetle', cond:s=>totalOwned(s)>=5 && s.crumbs>300, title:'A Beetle Offers a Trade', text:'A shifty dung beetle offers "volunteers from abroad" for a fifth of your larder.',
    a:{label:'Make the trade', note:'costs 20% of the larder', run:()=>{ const pay = S.crumbs*.2; spend(pay); const p = bestCasteFor(pay*1.7); if (!p) return ['Scammed','The beetle took the crumbs and rolled away.','bad']; S.owned[p.id] += p.n; colony.rebuild(); return ['New comrades', `${p.n} ${p.name} join the colony.`,'good']; }},
    b:{label:'Report him', note:'the Ministry pays a bounty', run:()=>{ const g = D.baseCps*45 + 20; gain(g); return ['Bounty collected', `+${fmt(g)} crumbs.`,'good']; }}},
  {id:'rot', w:2, type:'choice', icon:'mushroom', cond:s=>s.run>2000, title:'Fungus Garden Rot', text:'A patch of the Kolkhoz garden is turning a worrying shade of purple.',
    a:{label:'Burn it', note:'lose 5%, then output +30%', run:()=>{ spend(S.crumbs*.05); addBuff({name:'Fresh Garden', prod:1.3, dur:120}); return ['Garden replanted','Output +30% for 2 minutes.','good']; }},
    b:{label:'Eat it anyway', note:'what could go wrong', run:()=>{ if (Math.random() < .5){ addBuff({name:'Visions', tap:5, dur:30}); return ['Visions!','The workers see the future. Taps ×5 for 30s.','good']; } addBuff({name:'Stomach Ache', prod:.6, dur:30}); return ['Stomach ache','Output −40% for 30 seconds.','bad']; }}},
  {id:'purge', w:1, type:'choice', icon:'eye', cond:s=>s.run>5000, title:'Suspicious Ant in the Brood', text:'One ant was seen walking the trail in the wrong direction. On purpose.',
    a:{label:'Public trial', note:'taps ×4 for 30s', run:()=>{ addBuff({name:'Show Trial', tap:4, dur:30}); return ['Justice is served','The crowd taps with renewed zeal. Taps ×4.','good']; }},
    b:{label:'Promote it', note:'innovation? maybe', run:()=>{ if (Math.random()<.5){ const g = D.baseCps*200 + 50; gain(g); bump(); return ['A new shortcut!', `The wrong way was the right way: +${fmt(g)}.`,'good']; } return ['It got lost','Nothing happens. The ant is never seen again.','neutral']; }}},
  {id:'ladybird', w:2, type:'choice', icon:'bug', cond:s=>s.run>1500, title:'Ladybird Ambassador', text:'A spotted diplomat arrives with a suspiciously glossy gift basket.',
    a:{label:'Accept the gift', note:'could be jelly…', run:()=>{ if (Math.random() < .3){ S.jelly++; return ['Royal jelly!','The basket held a jar of royal jelly. +1 jelly.','jelly']; } const g = D.baseCps*90 + 30; gain(g); return ['Aphid treats', `A nice gesture: +${fmt(g)} crumbs.`,'good']; }},
    b:{label:'Expel the spy', note:'taps ×2 for 60s', run:()=>{ addBuff({name:'Vigilance', tap:2, dur:60}); return ['Ambassador expelled','The hill is vigilant. Taps ×2 for 60s.','good']; }}},
  {id:'drought', w:1, type:'choice', icon:'sun', cond:s=>s.run>3000, title:'Summer Drought', text:'The dew has dried up. The aphids look parched and resentful.',
    a:{label:'Ration water', note:'output −20% for 60s', run:()=>{ addBuff({name:'Rationing', prod:.8, dur:60}); return ['Belts tightened','Output −20% for a minute. Nobody complains, officially.','neutral']; }},
    b:{label:'Dig a well', note:'costs 8%, output ×1.8', run:()=>{ spend(S.crumbs*.08); addBuff({name:'The People\'s Well', prod:1.8, dur:60}); return ['Water!','The Tunnel Engineers strike water. Output ×1.8 for 60s.','good']; }}},
];
function pickEvent(){
  const pool = EVENTS.filter(e => !e.cond || e.cond(S));
  let r = Math.random() * pool.reduce((a,e) => a+e.w, 0);
  for (const e of pool){ if ((r -= e.w) <= 0) return e; }
  return pool[0];
}
function scheduleNextEvent(){
  nextEventAt = Date.now() + (65 + Math.random()*70) * 1000 / (S.edicts.agitprop ? 1.4 : 1);
}
function fireEvent(){
  const e = pickEvent();
  scheduleNextEvent();
  if (e.type === 'buff'){
    addBuff(e.buff); toast(e.title, e.text, e.buff.gold ? 'gold' : 'good', e.icon); Sound.good();
  } else if (e.type === 'flyer'){
    colony.spawnFlyer(); toast('A winged royal!', 'A royal ant is flying over the hill. Tap it before it escapes!', 'jelly', 'ant'); Sound.alert();
  } else if (e.type === 'anteater'){
    colony.spawnAnteater(); toast('Anteater attack!', 'Tap it 12 times in 10 seconds or it eats 8% of the larder!', 'bad', 'warn'); Sound.alert(); buzz([40,40,40]);
  } else if (e.type === 'rubble'){
    colony.spawnRubble(); toast('Tunnel collapse!', 'Tap the rubble 8 times in 8 seconds or output halves for 40s!', 'bad', 'quake'); Sound.alert(); buzz([60,30,60]);
  } else {
    activeEvent = e; eventDeadline = Date.now() + 25000;
    $('sh-no').textContent = `Incident report № ${String(S.incidents+1).padStart(4,'0')}`;
    $('sh-icon').innerHTML = icon(e.icon);
    $('sh-title').textContent = e.title; $('sh-text').textContent = e.text;
    $('sh-a').innerHTML = `<span>${e.a.label}</span><small>${e.a.note}</small>`;
    $('sh-b').innerHTML = `<span>${e.b.label}</span><small>${e.b.note}</small>`;
    $('sheet').hidden = false; Sound.alert(); buzz([30,40,30]);
  }
}
function resolveEvent(choice, auto){
  const e = activeEvent; if (!e) return;
  activeEvent = null; $('sheet').hidden = true;
  const [t, msg, tone] = e[choice].run();
  S.incidents++; track('incident', 1); merit(25);
  toast(t, (auto ? 'The Council decided for you. ' : '') + msg, tone, tone==='bad' ? 'down' : tone==='jelly' ? 'drop' : e.icon);
  tone === 'bad' ? Sound.bad() : Sound.good();
  D = derive(S); save(); render();
}
const hooks = {
  tap: () => doTap(),
  picnic: () => {
    const v = (D.baseCps*PICNIC_SECONDS + D.baseTap*30 + 15) * D.picnic * D.season.picnic;
    gain(v); S.picnics++; track('picnic', 1); merit(15); Sound.good(); buzz(20); bump();
    if (Math.random() < .08){ addGems(3); toast('Amber in the sugar!', 'A fossil gem was stuck inside the cube: +3 amber.', 'gold', 'gem'); }
    return v;
  },
  threatHit: () => { Sound.hit(); buzz(10); },
  anteaterWin: () => {
    const v = D.baseCps*120 + D.baseTap*20 + 25; gain(v); S.anteaters++; S.incidents++; track('incident', 1); merit(25); addGems(2); bump();
    toast('Anteater repelled!', `The hill holds. War spoils: +${fmt(v)} crumbs, +2 amber.`, 'good', 'swords'); Sound.good();
  },
  anteaterLose: () => {
    const l = S.crumbs*.08; spend(l); S.incidents++; track('incident', 1);
    toast('The anteater fed', `It slurped ${fmt(l)} crumbs and wandered off.`, 'bad', 'down'); Sound.bad();
  },
  rubbleWin: () => {
    const v = D.baseCps*60 + D.baseTap*10 + 15; gain(v); S.rubbles++; S.incidents++; track('incident', 1); merit(20); addGems(1);
    toast('Tunnel cleared!', `The diggers found buried crumbs: +${fmt(v)}.`, 'good', 'rubble'); Sound.good();
  },
  rubbleLose: () => {
    addBuff({name:'Collapsed Tunnel', prod:.5, dur:40}); S.incidents++; track('incident', 1);
    toast('The tunnel caved in', 'Output halved for 40 seconds while the diggers dig.', 'bad', 'down'); Sound.bad();
  },
  guardianHit: () => {
    const v = D.tapValue * fervMult() * D.abyssMult;
    S.taps++; fervor = Math.min(1, fervor + 0.05); lastTapAt = performance.now();
    if (fervor >= 1) S.flags.fervor = true;
    Sound.hit(); buzz(5);
    return v;
  },
  guardianWin: d => guardianWon(d),
  guardianLose: (d, frac) => guardianLost(d, frac),
  flyerCaught: () => {
    S.flyers++; merit(20); addBuff({name:'Royal Frenzy', prod:7, dur:15, gold:true});
    toast('Royal Frenzy!', 'The colony goes wild. Output ×7 for 15 seconds.', 'gold', 'star'); Sound.good(); buzz(30);
  },
};

