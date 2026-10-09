// Browser smoke test: boots dist/formic-republic.html in Chromium and plays through every
// major system (tapping, castes, research, packs, raids, shop, pass, directives, flight,
// Supercolony + Abyss, the hill strip, the weekly league and alliances against a mock
// server). Fails on any page error. Run: npm run build && npm run test:e2e
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const FILE = 'file://' + join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'dist', 'formic-republic.html');
const W = (() => { const x = new Date(), d = new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate())); const n = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - n); const y = d.getUTCFullYear(); return `${y}-W${String(Math.ceil(((d - Date.UTC(y,0,1))/864e5 + 1)/7)).padStart(2,'0')}`; })();

// A tiny in-memory stand-in for the fr_* Supabase functions.
function mockServer(){
  const players = {}, scores = {}, alliances = {}; let n = 0;
  const me = (a) => players[a.p_id] && players[a.p_id].secret === a.p_secret ? players[a.p_id] : null;
  const mine = p => { if (!p.alliance) return { season: W, alliance: null }; const al = alliances[p.alliance];
    const members = Object.values(players).filter(x => x.alliance === al.id).map(x => ({ name: x.name, points: x.apts || 0, owner: x.id === al.owner, me: x.id === p.id }));
    return { season: W, alliance: { id: al.id, name: al.name, code: al.code, owner: al.owner === p.id, total: members.reduce((s, m) => s + m.points, 0), rank: 1, members, max: 20 } }; };
  return (fn, a) => {
    switch (fn){
      case 'fr_register': { const id = 'p' + (++n); players[id] = { id, name: a.p_name, secret: 's' + id }; return { id, secret: 's' + id, name: a.p_name, season: W }; }
      case 'fr_submit': { const p = me(a); const old = scores[p.id] || 0, d = Math.max(0, Math.min(a.p_score - old, 2500)); scores[p.id] = old + d; if (p.alliance) p.apts = (p.apts || 0) + d; return { season: W, score: old + d, accepted: d }; }
      case 'fr_leaderboard': { const rows = Object.entries(scores).sort((x, y) => y[1] - x[1]).map(([id, s], i) => ({ rank: i + 1, name: players[id].name, score: s, alliance: null, me: id === a.p_id }));
        const m = rows.find(r => r.me); return { season: a.p_season, current: W, players: rows.length, top: rows, me: m ? { rank: m.rank, score: m.score } : null, around: [] }; }
      case 'fr_alliance_board': return { season: a.p_season, alliances: Object.values(alliances).map((al, i) => ({ id: al.id, rank: i + 1, name: al.name, total: 0, members: 1 })) };
      case 'fr_my_alliance': return mine(me(a));
      case 'fr_create_alliance': { const p = me(a), id = 'a' + (++n); alliances[id] = { id, name: a.p_name, code: 'ABC234', owner: p.id }; p.alliance = id; return mine(p); }
      case 'fr_leave_alliance': { me(a).alliance = null; return { alliance: null }; }
    }
    return {};
  };
}

const steps = [];
const step = async (name, fn) => { await fn(); steps.push(name); };

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });   // CHROMIUM_PATH: use an already-installed Chromium
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
const rpc = mockServer();
await page.route('https://pfjixomcpkcrpbvdjekh.supabase.co/rest/v1/rpc/*', r => {
  const fn = r.request().url().split('/').pop();
  r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rpc(fn, JSON.parse(r.request().postData() || '{}'))) });
});
const closeModals = async () => { for (let i = 0; i < 6; i++){ if (await page.locator('#modal:not([hidden])').count()) await page.click('#m-ok'); else return; } };
const ev = (fn, arg) => page.evaluate(fn, arg);

try {
  await page.goto(FILE); await page.waitForTimeout(500); await closeModals();
  await step('tap the hill', async () => {
    const box = await page.locator('#stage').boundingBox();
    for (let i = 0; i < 20; i++) await page.mouse.click(box.x + box.width / 2, box.y + box.height * .6);
    if (await ev(() => S.taps) < 20) throw new Error('taps not counted');
  });
  await step('training: hire, research, open the gift pack, raid', async () => {
    await ev(() => { S.crumbs = 1e6; });
    await page.click('[data-buy="forager"]'); await page.click('[data-buy="forager"]'); await page.click('[data-buy="forager"]');
    await page.waitForTimeout(300); await closeModals();
    await page.click('[data-gt="research"]'); await page.locator('[data-upg]').first().click(); await closeModals();
    await page.click('#nav [data-group="cards"]'); await page.locator('[data-open]').first().click();
    await page.click('#op-all'); await page.waitForTimeout(1200); await page.click('#op-done'); await closeModals();
    await ev(() => { S.crumbs = 1e7; }); await page.click('#nav [data-group="hill"]'); await page.click('[data-gt="castes"]');
    await page.click('[data-buy="aphid"]'); await closeModals();
    await ev(() => { S.owned.forager = 30; });
    await page.click('#nav [data-group="march"]'); await page.click('[data-send="kitchen"]'); await closeModals();
    await ev(() => { S.inv.whistle = 1; });
    await page.click('#nav [data-group="hill"]'); await page.waitForTimeout(250);   // the usables belt lives on the Hill tab
    await page.click('[data-use="whistle"]'); await page.waitForTimeout(300);
    await page.click('#nav [data-group="march"]'); await page.waitForTimeout(300);
    await page.click('[data-collect="kitchen"]'); await page.waitForTimeout(300); await closeModals();
    await ev(() => { S.crumbs += 1e5; }); await page.waitForTimeout(600); await closeModals();
    if (await ev(() => tutActive())) await page.click('#nav [data-group="hill"]').then(() => page.click('[data-dev="skip"]')).then(closeModals);
  });
  await step('shop: buy packs and a usable with amber', async () => {
    await ev(() => { S.gems = 5000; }); await page.click('#nav [data-group="shop"]');
    await page.click('[data-shop="pack"][data-id="rare"]'); await page.click('[data-shop="use"][data-id="rush"]');
    if (!(await ev(() => S.packs.rare >= 1 && S.inv.rush >= 1))) throw new Error('shop purchase failed');
  });
  await step('cards: open all packs', async () => {
    await ev(() => { S.packs.common = 25; }); await page.click('#nav [data-group="cards"]');
    await page.click('[data-openall]'); await page.waitForTimeout(400); await page.click('#op-done');
  });
  await step('pass and directives', async () => {
    await ev(() => { merit(3000); }); await page.click('#nav [data-group="goals"]'); await page.click('[data-gt="pass"]');
    await page.click('#ph-all'); await page.click('[data-gt="medals:dir"]'); await page.waitForTimeout(200);
  });
  await step('hill tucks into a strip while scrolling the castes list', async () => {
    await page.click('#nav [data-group="hill"]'); await page.click('[data-gt="castes"]');
    await ev(() => { Object.assign(S.owned, { leaf: 5, fungus: 5, tunnel: 5, beetle: 5, ministry: 2 }); S.run = 1e9; render(); });
    await page.mouse.move(195, 760); for (let i = 0; i < 4; i++){ await page.mouse.wheel(0, 150); await page.waitForTimeout(120); }
    await page.waitForTimeout(450); if (!(await ev(() => hillCompact))) throw new Error('hill did not shrink');
    for (let i = 0; i < 12; i++){ await page.mouse.wheel(0, -300); await page.waitForTimeout(100); }
    await page.waitForTimeout(450); if (await ev(() => hillCompact)) throw new Error('hill did not come back');
  });
  await step('Nuptial Flight', async () => {
    await ev(() => { S.ascLife = 8e9; }); await page.click('#flightbtn'); await page.click('#f-btn'); await page.click('#f-btn'); await closeModals();
    if (await ev(() => S.flights) !== 1) throw new Error('flight did not happen');
  });
  await step('Supercolony, then an Abyss guardian fight', async () => {
    await page.click('#nav [data-group="hill"]'); await page.click('[data-gt="castes"]'); await page.click('[data-dev="super"]'); await closeModals();
    await page.click('[data-sect="raids:abyss"]').catch(() => {}); await page.click('[data-descend]');
    const box = await page.locator('#stage').boundingBox();
    for (let i = 0; i < 15; i++) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  });
  await step('weekly league and alliance (mock server)', async () => {
    await page.click('#nav [data-group="world"]'); await page.waitForTimeout(600);
    await page.fill('#on-name', 'Smoke Hill'); await page.click('[data-on="register"]'); await page.waitForTimeout(600);
    await page.click('[data-gt="alliance"]'); await page.waitForTimeout(300);
    await page.fill('#on-aname', 'Smoke Alliance'); await page.click('[data-on="create"]'); await page.waitForTimeout(600);
    if (await ev(() => Online.mine && Online.mine.code) !== 'ABC234') throw new Error('alliance not created');
    await page.click('[data-on="leave"]'); await page.click('[data-on="leave"]'); await page.waitForTimeout(500);
  });
  await step('save survives a reload', async () => {
    const before = await ev(() => { save(true); return { flights: S.flights, supers: S.supers, name: S.online.acct.supabase && S.online.acct.supabase.name }; });
    await page.reload(); await page.waitForTimeout(600); await closeModals();
    const after = await ev(() => ({ flights: S.flights, supers: S.supers, name: S.online.acct.supabase && S.online.acct.supabase.name }));
    if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error(`save mismatch ${JSON.stringify(before)} vs ${JSON.stringify(after)}`);
  });
} catch (e) {
  errors.push(`step after "${steps[steps.length - 1] || 'boot'}" failed: ${e.message}`);
}
await browser.close();
for (const s of steps) console.log('ok -', s);
if (errors.length){ console.error('\nFAILED\n' + errors.map(e => '  ' + e).join('\n')); process.exit(1); }
console.log(`\nall ${steps.length} steps passed, no page errors`);
