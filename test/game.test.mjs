// Logic tests for the game's rules. Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from './load-game.mjs';

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps * Math.max(1, Math.abs(b)), `${a} ≉ ${b}`);

test('number and time formatting', () => {
  const g = loadGame();
  assert.equal(g.run('fmt(999)'), '999');
  assert.equal(g.run('fmt(1500)'), '1.50 K');
  assert.equal(g.run('fmt(12345)'), '12.3 K');
  assert.equal(g.run('fmt(123456)'), '123 K');
  assert.equal(g.run('fmt(2e6)'), '2.00 M');
  assert.equal(g.run('fmt(-1500)'), '-1.50 K');
  assert.equal(g.run('fmt(1/0)'), '∞');
  assert.equal(g.run('fmtTime(90)'), '1m 30s');
  assert.equal(g.run('fmtTime(25*3600)'), '1d 1h');
});

test('caste prices grow 16% per hire and bulk prices are the exact sum', () => {
  const g = loadGame(); g.newGame();
  const p = g.run(`PRODUCERS[0]`);
  near(g.run(`costOf(PRODUCERS[0], 0, 1)`), p.base);
  near(g.run(`costOf(PRODUCERS[0], 1, 1)`), p.base * 1.16);
  let sum = 0; for (let i = 0; i < 10; i++) sum += p.base * 1.16 ** (5 + i);
  near(g.run(`costOf(PRODUCERS[0], 5, 10)`), sum, 1e-9);
});

test('"Max" buys exactly as many as the larder can pay for', () => {
  const g = loadGame(); g.newGame();
  for (const [owned, bank] of [[0, 15], [0, 14.99], [3, 1e4], [40, 7.7e6], [120, 1e15]]){
    const n = g.run(`maxAffordable(PRODUCERS[2], ${owned}, ${bank})`);
    assert.ok(g.run(`costOf(PRODUCERS[2], ${owned}, ${n})`) <= bank * (1 + 1e-12), `can afford ${n}`);
    assert.ok(g.run(`costOf(PRODUCERS[2], ${owned}, ${n + 1})`) > bank, `cannot afford ${n + 1}`);
  }
});

test('output adds up: colony output is the sum of every caste', () => {
  const g = loadGame(); g.newGame({ owned: { forager: 10, aphid: 5, leaf: 2 }, medals: ['tap1','tap100'] });
  const d = g.D;
  near(d.medal, 1.02);
  const sum = ['forager','aphid','leaf'].reduce((s, id) => s + d.each[id] * g.S.owned[id], 0);
  near(d.baseCps, sum);
  assert.ok(d.cps > 0);
});

test('pheromones: the cube root of crumbs gathered over a billion', () => {
  const g = loadGame(); g.newGame();
  assert.equal(g.run(`pherPotential(Object.assign(fresh(), {ascLife: 0.99e9}))`), 0);
  assert.equal(g.run(`pherPotential(Object.assign(fresh(), {ascLife: 1e9}))`), 1);
  assert.equal(g.run(`pherPotential(Object.assign(fresh(), {ascLife: 27e9}))`), 3);
  near(g.run(`nextPherAt(Object.assign(fresh(), {ascLife: 1e9, pher: 1}))`), 8e9);
});

test('Nuptial Flight resets the colony but keeps what it should', () => {
  const g = loadGame(); g.newGame({ ascLife: 8e9, crumbs: 5e8, owned: { forager: 50 }, gems: 77, cards: { c1: 3 }, bought: ['mand-0'], medals: ['tap1'] });
  g.run(`S.online.acct.supabase = {id:'x', secret:'y', name:'Hill', sent:0}; S.online.score = 40;`);
  const gained = g.run('nuptialFlight(S)');
  const s = g.S;
  assert.equal(gained, 2);
  assert.equal(s.pher, 2); assert.equal(s.jelly, 2); assert.equal(s.flights, 1);
  assert.equal(s.crumbs, 0); assert.deepEqual({ ...s.owned }, {}); assert.deepEqual([...s.bought], []);
  assert.equal(s.gems, 77); assert.equal(s.cards.c1, 3); assert.deepEqual([...s.medals], ['tap1']);
  assert.equal(s.online.acct.supabase.name, 'Hill', 'league identity survives the flight');
  assert.equal(s.online.score, 40, 'weekly league points survive the flight');
});

test('Institutional Memory keeps Five-Year Plans and Mandibles through the flight', () => {
  const g = loadGame(); g.newGame({ ascLife: 8e9, bought: ['mand-0', 'plan-0', 'forager-0'], edicts: { memory: 1 } });
  g.run('nuptialFlight(S)');
  assert.deepEqual([...g.S.bought].sort(), ['mand-0', 'plan-0']);
});

test('Revolution Pass tiers: 400 merit, then 80 more per tier', () => {
  const g = loadGame();
  assert.deepEqual({ ...g.run('passTier(0)') }, { tier: 0, into: 0, need: 400 });
  assert.deepEqual({ ...g.run('passTier(399)') }, { tier: 0, into: 399, need: 400 });
  assert.deepEqual({ ...g.run('passTier(400)') }, { tier: 1, into: 0, need: 480 });
  assert.deepEqual({ ...g.run('passTier(880)') }, { tier: 2, into: 0, need: 560 });
});

test('card packs: a legendary is guaranteed by the 30th pack without one', () => {
  const g = loadGame(); g.newGame({ pity: 29, packs: { common: 1 } });
  g.run('S.flags.pack1 = 1; Math.random = () => 0.99;');   // every roll is a common
  const res = g.run('openPack("common")');
  const rars = res.out.map(o => o.c.r);
  assert.ok(rars.includes('L'), `got ${rars}`);
  assert.equal(g.S.pity, 0);
  assert.equal(g.S.packs.common, undefined, 'the pack was used up');
});

test('card levels: level N to N+1 takes N duplicate copies', () => {
  const g = loadGame(); g.newGame();
  assert.equal(g.run('grantCard("c1").kind'), 'new');
  assert.equal(g.run('grantCard("c1").kind'), 'up');          // level 1 → 2 with 1 copy
  assert.equal(g.run('grantCard("c1").kind'), 'shard');       // 1 of 2
  assert.equal(g.run('grantCard("c1").kind'), 'up');          // level 2 → 3
  assert.equal(g.S.cards.c1, 3);
});

test('old saves load and get every newer field', () => {
  const g = loadGame();
  const s = g.run(`normalize({v: 3, crumbs: 5, lifetime: 900, owned: {forager: 2}})`);
  assert.equal(s.crumbs, 5);
  assert.equal(s.ascLife, 900, 'ascLife backfilled from lifetime');
  assert.ok(s.online && s.online.acct && s.online.chest, 'league fields added');
  assert.equal(s.abyss.torches, 5);
  assert.ok(Array.isArray(s.dir.list));
});

test('save → load round trip through browser storage', () => {
  const g = loadGame(); g.newGame({ crumbs: 123456, gems: 42 });
  g.storage.set(g.run('KEY'), g.run('JSON.stringify(S)'));
  const s = g.run('load()');
  assert.equal(s.crumbs, 123456); assert.equal(s.gems, 42);
});

test('league weeks match the server (ISO weeks, UTC)', () => {
  const g = loadGame();
  const cases = { '2026-01-01': '2026-W01', '2027-01-01': '2026-W53', '2027-01-04': '2027-W01', '2024-12-30': '2025-W01',
    '2026-10-11': '2026-W41', '2026-10-12': '2026-W42', '2025-12-29': '2026-W01', '2021-01-03': '2020-W53' };
  for (const [day, wk] of Object.entries(cases)) assert.equal(g.run(`leagueWeek(Date.parse('${day}T12:00:00Z'))`), wk, day);
  assert.equal(g.run(`new Date(leagueEnds(Date.parse('2026-10-09T08:50:00Z'))).toISOString()`), '2026-10-12T00:00:00.000Z');
});

test('league score: base merit counts, the premium boost does not; a new week starts at zero', () => {
  const g = loadGame(); g.newGame();
  g.run('S.pass.premium = true; merit(10);');
  assert.equal(g.S.pass.xp, 15);
  assert.equal(g.S.online.score, 10);
  g.run(`S.online.week = '2000-W01'; S.online.score = 50; leagueAdd(5);`);
  assert.equal(g.S.online.prevWeek, '2000-W01');
  assert.equal(g.S.online.prevScore, 50);
  assert.equal(g.S.online.score, 5);
});

test('alliance chests need 200 of your own points and open once a week', () => {
  const g = loadGame(); g.newGame();
  g.run(`leagueRoll(); Online.mine = {id:'a', name:'A', code:'X', total: 9000, rank: 1, max: 20, members: [{name:'Me', points: 150, me: true}]};`);
  assert.equal(g.run('Online.chestReady()'), 0);
  g.run('Online.claimChest(0)'); assert.equal(g.S.gems, 0);
  g.run('Online.mine.members[0].points = 250');
  assert.equal(g.run('Online.chestReady()'), 2);
  g.run('Online.claimChest(0)'); g.run('Online.claimChest(0)');
  assert.equal(g.S.gems, 20, 'opened once');
  assert.equal(g.S.packs.common, 1);
  assert.equal(g.run('Online.chestReady()'), 1);
});

test('wiping the save keeps the league identity and this week\'s league points', () => {
  const g = loadGame(); g.newGame({ gems: 500 });
  g.run(`S.online.acct.supabase = {id:'x', secret:'y', name:'Hill', sent: 10}; S.online.score = 10;`);
  g.run('wipeSave()');
  assert.equal(g.S.gems, 0);
  assert.equal(g.S.online.acct.supabase.name, 'Hill');
  assert.equal(g.S.online.score, 10, 'the server already counted them');
  assert.equal(g.S.crumbs, 0);
});

test('Lottery: prize odds follow the weights and the jackpot is rare', () => {
  const g = loadGame(); g.newGame();
  const prizes = g.run('SPIN_PRIZES.map(p => ({id: p.id, w: p.w}))'), total = prizes.reduce((n, p) => n + p.w, 0);
  assert.equal(total, 100, 'weights are percentages');
  assert.equal(prizes.find(p => p.id === 'jack').w, 2);
  // walking r from 0 to 1 visits every prize in wheel order, each for exactly its weight
  const counts = {}; for (let i = 0; i < 10000; i++){ const k = g.run(`SPIN_PRIZES[rollSpin(${(i + .5) / 10000})].id`); counts[k] = (counts[k] || 0) + 1; }
  for (const p of prizes) assert.equal(counts[p.id], p.w * 100, p.id);
});

test('Lottery: one free spin a day, and every prize is paid out', () => {
  const g = loadGame(); g.newGame();
  assert.equal(g.run('spinFree()'), true);
  g.run('S.spin.used = 1');
  assert.equal(g.run('spinFree()'), false);
  assert.equal(g.run('spinAdsLeft()'), 2);
  g.run(`S.spin.day = '1999-1-1'`);   // a new day resets it
  assert.equal(g.run('spinFree()'), true);
  const before = { gems: g.S.gems, jelly: g.S.jelly };
  g.run('SPIN_PRIZES.forEach((p, i) => grantSpin(i))');
  const s = g.S;
  assert.equal(s.gems - before.gems, 15 + 300 + 40);
  assert.equal(s.jelly - before.jelly, 1);
  assert.equal(s.packs.common, 1); assert.equal(s.packs.rare, 1); assert.equal(s.packs.epic, 1);
  assert.equal(s.inv.rush, 2);
  assert.equal(s.spin.total, 8); assert.equal(s.spin.jackpots, 1);
});

test('critical taps: 3% normally, 6% at max fervor, ×7 value', () => {
  const g = loadGame(); g.newGame();
  assert.equal(g.run('fervor = 0; critChance()'), 0.03);
  assert.equal(g.run('fervor = 1; critChance()'), 0.06);
  g.run('fervor = 0; Math.random = () => 0.01;');
  const crit = g.run('doTap()'); assert.equal(g.run('lastCrit'), true);
  g.run('fervor = 0; Math.random = () => 0.99;');   // same fervor as the first tap
  const normal = g.run('doTap()'); assert.equal(g.run('lastCrit'), false);
  near(crit / normal, 7);
});

test('milestones: old saves start past what they already reached; new ones trigger once', () => {
  const g = loadGame(); g.newGame({ lifetime: 5e9 });
  g.run('initMilestones()');
  assert.equal(g.S.flags.mile, 2, '1M and 1B already passed: no celebrations for them');
  assert.equal(g.run('nextMilestone()'), null);
  g.run('S.lifetime = 2e12');
  assert.equal(g.run('nextMilestone().name'), 'One Trillion Crumbs');
});

test('analytics stay off in the browser preview and on in store builds', () => {
  const g = loadGame(); g.newGame();
  assert.equal(g.run('Analytics.on()'), false);
  g.run(`PLATFORM.id = 'android'`); assert.equal(g.run('Analytics.on()'), true);
  g.run(`PLATFORM.analytics = false`); assert.equal(g.run('Analytics.on()'), false);
});

test('the Lottery and its history survive a Nuptial Flight', () => {
  const g = loadGame(); g.newGame({ ascLife: 8e9 });
  g.run(`S.spin = {day:'2026-10-9', used:1, ads:1, total:5, jackpots:1}; nuptialFlight(S);`);
  assert.equal(g.S.spin.total, 5); assert.equal(g.S.spin.used, 1);
});

test('auto-tapper: an hour per amber usable (stacking), forever with the purchase, off in the pacifist hardship', () => {
  const g = loadGame(); g.newGame();
  assert.equal(g.run('autoTapRate()'), 0);
  g.run('S.inv.autotap = 2; useItem("autotap"); useItem("autotap");');
  const left = g.run('S.auto.until - Date.now()');
  assert.ok(left > 7190e3 && left <= 7200e3, `two hours stacked, got ${left}`);
  assert.equal(g.run('autoTapRate()'), 8);
  g.run(`S.chal = 'pacifist'`); assert.equal(g.run('autoTapRate()'), 0);
  g.run(`S.chal = null; S.auto.until = 0; grantIAP('autotap')`);
  assert.equal(g.run('autoTapRate()'), 8);
  g.run('S.auto.on = false'); assert.equal(g.run('autoTapRate()'), 0);
});

test('auto taps count like real taps (fervor, merit) but make no sound', () => {
  const g = loadGame(); g.newGame();
  g.run('var sounds = 0; Sound.tap = () => sounds++; Math.random = () => 0.99;');
  for (let i = 0; i < 20; i++) g.run('doTap(true)');
  assert.equal(g.S.taps, 20); assert.equal(g.run('sounds'), 0);
  assert.equal(g.S.pass.xp, 2, '1 merit per 10 taps');
  assert.ok(g.run('fervor') > .9);
});

test('adding usables does not reshuffle the Revolution Pass rewards', () => {
  const g = loadGame();
  const uses = []; for (let t = 1; t <= 30; t++){ const r = g.run(`passReward(${t}, false)`); if (r.t === 'use') uses.push(t + ':' + r.id); }
  assert.deepEqual(uses, ['4:basket', '8:oil', '12:flare', '16:tonic', '24:hourglass', '28:rush']);
});
