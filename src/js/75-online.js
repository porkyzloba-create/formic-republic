/* ============================================================
   ONLINE: weekly league + colony alliances
   Weekly score = pass merit earned this week (taps, quotas, raids, incidents,
   picnics, packs, medals, Congress days). It rewards activity, not progress,
   so new colonies can race veterans. Weeks are ISO weeks in UTC and reset on
   Monday 00:00 UTC. Members' points this week fill their alliance's war chest.

   Backend: Supabase project "formic-republic" (SQL functions fr_*). The server
   checks every report: it accepts at most 2.5 points a second since the last
   one plus a 2,500-point buffer, so an edited save can't climb faster than a
   very active real player (extra points wait and count later). The store
   shells can pass their own {url, key} in FR_PLATFORM.online.
   In the claude.ai preview, if the page can't reach Supabase, the league runs
   on the artifact's own shared database instead: a friends-only preview league.
   ============================================================ */
const ONLINE = Object.assign({url:'https://pfjixomcpkcrpbvdjekh.supabase.co', key:'sb_publishable__Cz2y2jrr3NtjR-qD8ar5g_Yh5w9nWK'}, PLATFORM.online || {});
const LEAGUE_REWARDS = [
  {max:1,  label:'1st place', gems:300, packs:{epic:2}},
  {max:3,  label:'Top 3',     gems:200, packs:{epic:1}},
  {max:10, label:'Top 10',    gems:120, packs:{rare:1}},
  {max:50, label:'Top 50',    gems:60,  packs:{common:1}},
  {max:Infinity, label:'Everyone with 200+ points', gems:20, packs:{}, min:200},
];
const CHEST_MIN = 200;   // points you must add yourself this week to open your alliance's chests
const CHEST_TIERS = [
  {need:2000,   gems:20,  pack:'common'},
  {need:6000,   gems:30,  pack:'rare'},
  {need:15000,  gems:40,  use:'rush', n:2},
  {need:35000,  gems:60,  pack:'rare', n:2},
  {need:75000,  gems:80,  pack:'epic'},
  {need:150000, gems:120, pack:'epic', n:2, jelly:1},
];
function leagueWeek(t){
  const d = new Date(t), x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dn = x.getUTCDay() || 7; x.setUTCDate(x.getUTCDate() + 4 - dn);
  const y = x.getUTCFullYear(), w = Math.ceil(((x - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
  return `${y}-W${String(w).padStart(2, '0')}`;
}
function leagueEnds(t){ const d = new Date(t); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - (d.getUTCDay() + 6) % 7 + 7); }
function weekLabel(k){ return k ? 'Week ' + +k.split('-W')[1] : ''; }
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function leagueRoll(){
  const o = S.online, wk = leagueWeek(Date.now());
  if (o.week === wk) return false;
  if (o.week){ o.prevWeek = o.week; o.prevScore = o.score; }
  o.week = wk; o.score = 0;
  for (const a of Object.values(o.acct)) a.sent = 0;
  return true;
}
function leagueAdd(n){ if (!S || !(n > 0)) return; leagueRoll(); S.online.score += n; }
function chestReward(t){ return [`${t.gems} amber`, t.pack ? `${t.n > 1 ? t.n + '× ' : ''}${PACKS[t.pack].name}` : '', t.use ? `${t.n}× ${USABLES[t.use].name}` : '', t.jelly ? `${t.jelly} royal jelly` : ''].filter(Boolean).join(' · '); }
function rewardLine(r){ return [`${r.gems} amber`, ...Object.entries(r.packs).map(([k,n]) => `${n > 1 ? n + '× ' : ''}${PACKS[k].name}`)].join(' · '); }

const ONLINE_ERR = {
  offline:'Could not reach the league server. Check your connection.',
  server:'The league server had a problem. Try again in a moment.',
  bad_player:'This colony is not registered on this server.',
  bad_name_length:'Names need 2 to 20 characters (alliances 3 to 24).',
  bad_name_chars:'Use letters, numbers, spaces and _ . - \' only.',
  name_taken:'An alliance with that name already exists.',
  no_such_code:'No alliance has that code. Check it with your friend.',
  alliance_full:'That alliance is full (20 members).',
  already_in_alliance:'Leave your current alliance first.',
};
function onlineErr(code){ const e = new Error(ONLINE_ERR[code] || ONLINE_ERR.server); e.code = code; return e; }

// Real backend: Supabase RPC over HTTPS. Works in the Android (Expo) and Steam (Electron) shells.
const SupaAPI = {
  kind:'supabase',
  async rpc(fn, args){
    const ctl = typeof AbortController === 'function' ? new AbortController() : null;
    const tm = setTimeout(() => ctl && ctl.abort(), 9000);
    let res;
    try { res = await fetch(`${ONLINE.url}/rest/v1/rpc/${fn}`, {method:'POST', headers:{apikey:ONLINE.key, 'Content-Type':'application/json'}, body:JSON.stringify(args || {}), signal: ctl ? ctl.signal : undefined}); }
    catch(e){ throw onlineErr('offline'); }
    finally { clearTimeout(tm); }
    let body = null; try { body = await res.json(); } catch(e){}
    if (!res.ok) throw onlineErr(body && ONLINE_ERR[body.message] ? body.message : 'server');
    return body;
  },
  register(name){ return this.rpc('fr_register', {p_name:name}); },
  rename(a, name){ return this.rpc('fr_rename', {p_id:a.id, p_secret:a.secret, p_name:name}); },
  submit(a, week, score){ return this.rpc('fr_submit', {p_id:a.id, p_secret:a.secret, p_season:week, p_score:Math.floor(score)}); },
  board(a, week){ return this.rpc('fr_leaderboard', {p_season:week, p_id:a ? a.id : null, p_limit:50}); },
  allianceBoard(week){ return this.rpc('fr_alliance_board', {p_season:week, p_limit:50}); },
  mine(a, week){ return this.rpc('fr_my_alliance', {p_id:a.id, p_secret:a.secret, p_season:week}); },
  create(a, name){ return this.rpc('fr_create_alliance', {p_id:a.id, p_secret:a.secret, p_name:name}); },
  join(a, code){ return this.rpc('fr_join_alliance', {p_id:a.id, p_secret:a.secret, p_code:code}); },
  leave(a){ return this.rpc('fr_leave_alliance', {p_id:a.id, p_secret:a.secret}); },
};

// Preview backend: the claude.ai artifact's shared database (only used when Supabase is unreachable).
// One document per player at players/<viewer id> (only that viewer may write it); alliances/<id> docs.
// There is no server-side check here, so it is meant for a group of friends trying the game.
function makeDbAPI(db, uid){
  const meRef = () => db.doc('players/' + uid);
  const NAME_OK = /^[\p{L}\p{N} _'.-]+$/u;
  const clean = (n, lo, hi) => { n = String(n || '').trim().replace(/\s+/g, ' '); if (n.length < lo || n.length > hi) throw onlineErr('bad_name_length'); if (!NAME_OK.test(n)) throw onlineErr('bad_name_chars'); return n; };
  const wrap = async f => { try { return await f(); } catch(e){ throw e && e.code && ONLINE_ERR[e.code] ? e : onlineErr('server'); } };
  const players = async () => (await db.collection('players').limit(1000).get()).docs.filter(d => d.exists).map(d => Object.assign({id:d.id}, d.data()));
  const alliances = async () => (await db.collection('alliances').limit(1000).get()).docs.filter(d => d.exists).map(d => Object.assign({id:d.id}, d.data()));
  const scoreIn = (p, wk) => p.week === wk ? (p.score || 0) : (p.prev && p.prev.week === wk ? p.prev.score || 0 : 0);
  async function mine(a, week){
    const wk = week || leagueWeek(Date.now());
    const s = await meRef().get(); const p = s.exists ? s.data() : null;
    if (!p) throw onlineErr('bad_player');
    if (!p.alliance) return {season:wk, alliance:null};
    const as = await db.doc('alliances/' + p.alliance).get();
    if (!as.exists){ await meRef().update({alliance:null, apts:0}); return {season:wk, alliance:null}; }
    const al = as.data(), all = await players();
    const members = all.filter(x => x.alliance === p.alliance).map(x => ({name:x.name, points: x.week === wk ? x.apts || 0 : 0, owner: x.id === al.owner, me: x.id === uid})).sort((x, y) => y.points - x.points);
    const total = members.reduce((n, m) => n + m.points, 0);
    const board = await api.allianceBoard(wk), row = board.alliances.find(r => r.id === p.alliance);
    return {season:wk, alliance:{id:p.alliance, name:al.name, code:al.code, owner: al.owner === uid, total, rank: row ? row.rank : board.alliances.length + 1, members, max:20}};
  }
  const api = {
    kind:'preview',
    register: name => wrap(async () => { name = clean(name, 2, 20); const wk = leagueWeek(Date.now());
      await meRef().set({name, alliance:null, week:wk, score:0, apts:0, prev:null, at:Date.now()}); return {id:uid, secret:'', name, season:wk}; }),
    rename: (a, name) => wrap(async () => { name = clean(name, 2, 20); await meRef().update({name}); return {name}; }),
    submit: (a, week, score) => wrap(async () => {
      const s = await meRef().get(); const p = s.exists ? s.data() : null; if (!p) throw onlineErr('bad_player');
      const cur = leagueWeek(Date.now()); if (week !== cur) return {season:cur, score:0, accepted:0, stale:true};
      const same = p.week === cur, base = same ? p.score || 0 : 0, delta = Math.max(0, Math.floor(score) - base);
      if (!delta && same) return {season:cur, score:base, accepted:0};
      await meRef().update({week:cur, score:base + delta, apts:(same ? p.apts || 0 : 0) + (p.alliance ? delta : 0), prev: same ? (p.prev || null) : (p.week ? {week:p.week, score:p.score || 0} : null), at:Date.now()});
      return {season:cur, score:base + delta, accepted:delta};
    }),
    board: (a, week) => wrap(async () => {
      const [ps, als] = await Promise.all([players(), alliances()]), names = Object.fromEntries(als.map(x => [x.id, x.name]));
      const rows = ps.map(p => ({id:p.id, name:p.name, alliance:names[p.alliance] || null, score:scoreIn(p, week)})).filter(p => p.score > 0).sort((x, y) => y.score - x.score)
        .map((p, i) => ({rank:i + 1, name:p.name, score:p.score, alliance:p.alliance, me:p.id === uid}));
      const m = rows.find(r => r.me);
      return {season:week, players:rows.length, top:rows.slice(0, 50), me: m ? {rank:m.rank, score:m.score} : null, around: m ? rows.slice(Math.max(0, m.rank - 3), m.rank + 2) : []};
    }),
    allianceBoard: week => wrap(async () => {
      const [ps, als] = await Promise.all([players(), alliances()]);
      const rows = als.map(al => { const ms = ps.filter(p => p.alliance === al.id); return {id:al.id, name:al.name, members:ms.length, total:ms.reduce((n, p) => n + (p.week === week ? p.apts || 0 : 0), 0)}; })
        .filter(r => r.members > 0).sort((x, y) => y.total - x.total || x.name.localeCompare(y.name)).map((r, i) => Object.assign(r, {rank:i + 1}));
      return {season:week, alliances:rows.slice(0, 50)};
    }),
    mine: (a, week) => wrap(() => mine(a, week)),
    create: (a, name) => wrap(async () => {
      name = clean(name, 3, 24);
      const als = await alliances();
      if (als.some(x => String(x.name).toLowerCase() === name.toLowerCase())) throw onlineErr('name_taken');
      const AB = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let code;
      do { code = Array.from({length:6}, () => AB[Math.floor(Math.random() * AB.length)]).join(''); } while (als.some(x => x.code === code));
      const ref = db.collection('alliances').doc();
      await ref.set({name, code, owner:uid, at:Date.now()});
      await meRef().update({alliance:ref.id, apts:0});
      return mine(a);
    }),
    join: (a, code) => wrap(async () => {
      const s = await meRef().get(); if (s.exists && s.data().alliance) throw onlineErr('already_in_alliance');
      code = String(code || '').trim().toUpperCase();
      const al = (await alliances()).find(x => x.code === code); if (!al) throw onlineErr('no_such_code');
      if ((await players()).filter(p => p.alliance === al.id).length >= 20) throw onlineErr('alliance_full');
      await meRef().update({alliance:al.id, apts:0});
      return mine(a);
    }),
    leave: a => wrap(async () => {
      const s = await meRef().get(), aid = s.exists ? s.data().alliance : null; if (!aid) return {alliance:null};
      await meRef().update({alliance:null, apts:0});
      const rest = (await players()).filter(p => p.alliance === aid && p.id !== uid);
      const ar = db.doc('alliances/' + aid);
      if (!rest.length) await ar.delete();
      else { const al = await ar.get(); if (al.exists && al.data().owner === uid) await ar.update({owner:rest[0].id}); }
      return {alliance:null};
    }),
  };
  return api;
}

const Online = {
  api:null, status:'idle', lastTry:0, lastSync:0, lastMine:0,
  board:null, aboard:null, mine:null, boardAt:0, aboardAt:0, view:'players', busy:false, leaveArmed:0,
  acct(){ return this.api ? S.online.acct[this.api.kind] || null : null; },
  wanted(){ return tab === 'ranks' || tab === 'alliance' || Object.keys(S.online.acct).length > 0; },
  async init(){
    if (this.status !== 'idle') return;
    this.status = 'connecting'; this.lastTry = Date.now(); this.changed();
    try { await SupaAPI.allianceBoard(leagueWeek(Date.now())); this.api = SupaAPI; }
    catch(e){
      // Supabase unreachable. In the claude.ai preview, fall back to the artifact's shared database.
      try {
        const c = window.claude && typeof window.claude.use === 'function' ? window.claude : null;
        const [db, user] = c ? await Promise.all([c.use('db'), c.use('user')]) : [null, null];
        const uid = db && user && typeof user.id === 'function' ? await user.id() : null;
        if (db && uid){ this.api = makeDbAPI(db, uid); await this.api.allianceBoard(leagueWeek(Date.now())); }
        else this.api = null;
      } catch(e2){ this.api = null; }
    }
    this.status = this.api ? 'ready' : 'offline';
    if (this.api){ await this.payout(); this.refreshMine(); this.sync(); }
    this.changed();
  },
  tick(now){
    if (!S) return;
    if (leagueRoll()){ this.board = this.aboard = this.mine = null; this.boardAt = this.aboardAt = this.lastMine = 0; this.payout(); }
    if (this.status === 'offline' && now - this.lastTry > 60000 && this.wanted()) this.status = 'idle';
    if (this.status === 'idle' && this.wanted()){ this.init(); return; }
    if (this.status !== 'ready' || !this.acct()) return;
    const a = this.acct();
    if (now - this.lastSync > 45000 && S.online.score > (a.sent || 0)) this.sync();
    if (now - this.lastMine > 120000) this.refreshMine();
  },
  async sync(force){
    const a = this.acct(); if (!a || this.syncing) return;
    if (!force && S.online.score <= (a.sent || 0)) return;
    this.syncing = true; this.lastSync = Date.now();
    try {
      const r = await this.api.submit(a, S.online.week, S.online.score);
      if (r && r.stale){ leagueRoll(); } else if (r){ a.sent = r.score; }
      save();
    } catch(e){ if (e.code === 'bad_player'){ delete S.online.acct[this.api.kind]; save(); this.changed(); } }
    this.syncing = false;
  },
  async refreshMine(){
    const a = this.acct(); if (!a) return;
    this.lastMine = Date.now();
    try { const r = await this.api.mine(a, S.online.week); this.mine = r.alliance; this.changed(); } catch(e){}
  },
  async load(kind){
    if (this.status !== 'ready') return;
    const now = Date.now(), a = this.acct();
    try {
      if (kind === 'players' && now - this.boardAt > 20000){ this.boardAt = now; if (a) await this.sync(); this.board = await this.api.board(a, S.online.week); this.changed(); }
      if (kind === 'alliances' && now - this.aboardAt > 20000){ this.aboardAt = now; this.aboard = await this.api.allianceBoard(S.online.week); this.changed(); }
      if (kind === 'mine' && a && now - this.lastMine > 15000){ await this.sync(); await this.refreshMine(); }
    } catch(e){ this.err = e.message; this.changed(); }
  },
  // Last week's league rewards, granted once when a new week starts.
  async payout(){
    const o = S.online, a = this.acct();
    if (!a || !o.prevWeek || o.paid === o.prevWeek || this.status !== 'ready') return;
    const wk = o.prevWeek;
    try {
      const b = await this.api.board(a, wk);
      o.paid = wk;
      const me = b.me;
      const r = me && LEAGUE_REWARDS.find(x => me.rank <= x.max && me.score >= (x.min || 0));
      if (r){
        addGems(r.gems); for (const [k, n] of Object.entries(r.packs)) S.packs[k] = (S.packs[k] || 0) + n;
        showModal(`League results · ${weekLabel(wk)}`, `#${me.rank} of ${b.players}`, `${r.label}! You scored ${fmt(me.score)} points. Reward: ${rewardLine(r)}. Packs are waiting in Cards. A new week has begun.`, 'Glory to the hill');
        Sound.stamp();
      }
      save();
    } catch(e){}
  },
  async act(kind, arg){
    if (this.busy || this.status !== 'ready') return;
    this.busy = true; this.changed(true);
    try {
      const a = this.acct();
      if (kind === 'register'){
        const r = await this.api.register(arg);
        S.online.acct[this.api.kind] = {id:r.id, secret:r.secret || '', name:r.name, sent:0};
        this.lastSync = 0; await this.sync(true); this.boardAt = 0; await this.load('players');
        toast('Welcome to the league', `${r.name} is on the board. Earn merit this week to climb.`, 'gold', 'crown'); Sound.good();
      } else if (kind === 'rename'){
        const r = await this.api.rename(a, arg); a.name = r.name; this.boardAt = 0; this.renaming = false; await this.load('players');
        toast('Colony renamed', r.name, 'good', 'scroll');
      } else if (kind === 'create'){
        const r = await this.api.create(a, arg); this.mine = r.alliance; this.aboardAt = this.boardAt = 0;
        toast('Alliance founded', `Share the code ${r.alliance.code} with your friends.`, 'gold', 'flag'); Sound.stamp();
      } else if (kind === 'join'){
        const r = await this.api.join(a, arg); this.mine = r.alliance; this.aboardAt = this.boardAt = 0;
        toast('Alliance joined', `You march with ${r.alliance.name}. Points you earn from now count toward its war chest.`, 'gold', 'flag'); Sound.good();
      } else if (kind === 'leave'){
        await this.api.leave(a); this.mine = null; this.aboardAt = this.boardAt = 0;
        toast('You left the alliance', 'Your colony marches alone again.', 'neutral', 'flag');
      }
      save();
    } catch(e){ toast("That didn't work", e.message, 'bad', 'warn'); Sound.bad(); }
    this.busy = false; this.changed(true);
  },
  chestReady(){
    const m = this.mine; if (!m) return 0;
    const me = m.members.find(x => x.me), c = S.online.chest;
    if (!me || me.points < CHEST_MIN) return 0;
    const got = c.week === S.online.week ? c.got : [];
    return CHEST_TIERS.filter((t, i) => m.total >= t.need && !got.includes(i)).length;
  },
  claimChest(i){
    const m = this.mine, t = CHEST_TIERS[i], c = S.online.chest;
    if (!m || !t) return;
    if (c.week !== S.online.week){ c.week = S.online.week; c.got = []; }
    const me = m.members.find(x => x.me);
    if (c.got.includes(i) || m.total < t.need || !me || me.points < CHEST_MIN) return;
    c.got.push(i); addGems(t.gems);
    if (t.pack) S.packs[t.pack] = (S.packs[t.pack] || 0) + (t.n || 1);
    if (t.use) S.inv[t.use] = (S.inv[t.use] || 0) + t.n;
    if (t.jelly) S.jelly += t.jelly;
    toast('War chest opened', chestReward(t) + '.', 'gold', 'gift'); Sound.stamp();
    afterChange(); this.changed(true);
  },
  // Redraw the online tabs when data arrives, unless the player is typing in one of their fields.
  changed(force){
    if (tab !== 'ranks' && tab !== 'alliance') return;
    const ae = document.activeElement;
    if (!force && ae && ae.tagName === 'INPUT' && $('list').contains(ae)){ this.pending = true; return; }
    this.pending = false; render();
  },
};
function onlineNote(){
  if (Online.status === 'connecting' || Online.status === 'idle') return `<div class="lb-empty">Connecting to the league…</div>`;
  if (Online.status === 'offline') return `<div class="lb-empty">The league server can't be reached right now. Your points this week are kept and sent when the connection is back.<br><button class="linkbtn" data-on="retry">Try again</button></div>`;
  return '';
}
function joinFormHTML(){
  const sug = 'Colony ' + (1000 + Math.floor(Math.random() * 9000));
  return `<div class="oform"><h4>Join the weekly league</h4>
    <p>Pick a colony name. It appears on the public leaderboard. Your score is the pass merit you earn each week, and the top colonies win amber and packs every Monday.</p>
    <div class="orow"><input class="oinput" id="on-name" maxlength="20" autocomplete="off" placeholder="Colony name" value="${esc(sug)}"><button class="btn gold" data-on="register" ${Online.busy ? 'disabled' : ''}>Enter</button></div></div>`;
}
function lbRow(r){
  return `<div class="lb-row${r.me ? ' me' : ''}${r.rank <= 3 ? ' p' + r.rank : ''}"><div class="lb-rank">${r.rank}</div>
    <div style="min-width:0"><div class="lb-name">${esc(r.name)}${r.me ? ' (you)' : ''}</div><div class="lb-sub">${r.alliance ? icon('flag') + ' ' + esc(r.alliance) : r.members !== undefined ? r.members + ' member' + (r.members === 1 ? '' : 's') : 'No alliance'}</div></div>
    <div class="lb-score">${fmt(r.score !== undefined ? r.score : r.total)}</div></div>`;
}
function ranksHTML(){
  const a = Online.acct(), o = S.online, now = Date.now();
  let html = `<div class="lb-head"><div class="lb-top"><div><div class="ph-eyebrow">WEEKLY LEAGUE · ${weekLabel(o.week).toUpperCase()}</div><div class="lb-title">${a ? esc(a.name) : 'Race every colony on Earth'}</div></div>
      ${a ? `<button class="gbtn" style="width:auto;background:rgba(255,255,255,.14);color:#fff;box-shadow:none" data-on="renameopen">Rename</button>` : ''}</div>
    <div class="lb-stats"><div><span>Your points</span><b id="lb-pts">${fmt(o.score)}</b></div><div><span>Your rank</span><b>${Online.board && Online.board.me ? '#' + Online.board.me.rank : '–'}</b></div><div><span>Ends in</span><b id="lb-ends">${fmtTime((leagueEnds(now) - now) / 1000)}</b></div></div>
    <div class="lb-note">Points = pass merit earned this week: tapping, quotas, raids, incidents, picnics, packs, medals and Congress days.${Online.api && Online.api.kind === 'preview' ? ' <b>Preview league:</b> only people you share this page with play here.' : ''}</div></div>`;
  if (Online.renaming && a) html += `<div class="oform"><h4>Rename your colony</h4><div class="orow"><input class="oinput" id="on-rename" maxlength="20" autocomplete="off" value="${esc(a.name)}"><button class="btn gold" data-on="rename" ${Online.busy ? 'disabled' : ''}>Save</button></div></div>`;
  const note = onlineNote(); if (note) return html + note;
  if (!a) html += joinFormHTML();
  html += `<div class="seg" role="group" style="align-self:flex-start"><button data-on="view:players" aria-pressed="${Online.view === 'players'}">Colonies</button><button data-on="view:alliances" aria-pressed="${Online.view === 'alliances'}">Alliances</button></div>`;
  if (Online.view === 'alliances'){
    const b = Online.aboard;
    if (!b) html += `<div class="lb-empty">Loading alliances…</div>`;
    else if (!b.alliances.length) html += `<div class="lb-empty">No alliances yet this week. Found the first one in the Alliance tab.</div>`;
    else html += `<div class="lb-list">${b.alliances.map(r => lbRow(Object.assign({}, r, {me: !!(Online.mine && Online.mine.id === r.id)}))).join('')}</div>`;
  } else {
    const b = Online.board;
    if (!b) html += `<div class="lb-empty">Loading the leaderboard…</div>`;
    else if (!b.top.length) html += `<div class="lb-empty">Nobody has scored yet this week. Be the first colony on the board!</div>`;
    else {
      html += `<div class="lb-list">${b.top.map(lbRow).join('')}`;
      if (b.me && b.me.rank > b.top.length) html += `<div class="lb-gap">• • •</div>` + b.around.map(lbRow).join('');
      html += `</div>`;
    }
    Online.shownUnsent = !!(a && o.score > (a.sent || 0));
    if (Online.shownUnsent) html += `<div class="osync">${fmt(o.score - (a.sent || 0))} points still on their way to the server · <button data-on="sync">Send now</button></div>`;
  }
  html += `<div class="shop-sec">Weekly rewards · paid when the week ends</div><div class="rewards">${LEAGUE_REWARDS.map(r => `<span><b>${r.label}</b></span><span>${rewardLine(r)}</span>`).join('')}</div>`;
  html += `<div class="locked">The server checks every report: it counts at most about 9,000 points an hour, and anything above that waits and counts later. Points don't carry over: each week starts at zero on Monday (UTC).</div>`;
  return html;
}
function allianceHTML(){
  const a = Online.acct(), m = Online.mine;
  const note = onlineNote(); if (note) return note;
  if (!a) return `<div class="lb-empty">Join the weekly league first (Weekly league tab), then found or join an alliance with your friends.</div>` + joinFormHTML();
  if (!m) return `<div class="lb-head"><div class="ph-eyebrow">ALLIANCES</div><div class="lb-title">Grind together</div>
      <div class="lb-note">Up to 20 colonies per alliance. Every point the members earn this week fills a shared war chest with six reward tiers, and alliances race each other on the league board.</div></div>
    <div class="oform"><h4>Found an alliance</h4><p>You get a 6-letter code to send to your friends.</p>
      <div class="orow"><input class="oinput" id="on-aname" maxlength="24" autocomplete="off" placeholder="Alliance name"><button class="btn gold" data-on="create" ${Online.busy ? 'disabled' : ''}>Found</button></div></div>
    <div class="oform"><h4>Join with a code</h4><p>Ask a friend in an alliance for their code.</p>
      <div class="orow"><input class="oinput code" id="on-code" maxlength="6" autocomplete="off" placeholder="ABC123"><button class="btn go" data-on="join" ${Online.busy ? 'disabled' : ''}>Join</button></div></div>`;
  const me = m.members.find(x => x.me), myPts = me ? me.points : 0, next = CHEST_TIERS.find(t => m.total < t.need);
  const c = S.online.chest, got = c.week === S.online.week ? c.got : [];
  let html = `<div class="lb-head"><div class="lb-top"><div><div class="ph-eyebrow">ALLIANCE · RANK #${m.rank} THIS WEEK</div><div class="lb-title">${esc(m.name)}</div></div>
      <span class="al-code">${esc(m.code)}<button data-on="copy">Copy</button></span></div>
    <div class="lb-stats"><div><span>War chest</span><b>${fmt(m.total)}</b></div><div><span>You added</span><b>${fmt(myPts)}</b></div><div><span>Members</span><b>${m.members.length}/${m.max}</b></div></div>
    <div class="chest-bar"><div style="width:${Math.min(100, m.total / CHEST_TIERS[CHEST_TIERS.length - 1].need * 100)}%"></div></div>
    <div class="lb-note">${next ? `${fmt(next.need - m.total)} more points to the next chest.` : 'Every chest is unlocked this week!'} Send the code to friends so they can join.${myPts < CHEST_MIN ? ` Add ${fmt(CHEST_MIN - myPts)} points yourself this week to open chests.` : ''}</div></div>`;
  html += `<div class="shop-sec">War chest · resets on Monday</div>` + CHEST_TIERS.map((t, i) => {
    const has = got.includes(i), ok = m.total >= t.need, can = ok && !has && myPts >= CHEST_MIN;
    return `<div class="ctier ${has ? 'got' : can ? 'ready' : ''}"><div class="dir-ic">${icon(has ? 'star' : 'gift')}</div>
      <div class="row-main"><div class="row-name">Chest ${i + 1} · ${fmt(t.need)} points</div><div class="row-sub">${chestReward(t)}</div></div>
      ${has ? `<span class="dir-done">${icon('star')} Opened</span>` : `<button class="btn ${can ? 'gold' : ''} dir-btn" data-on="chest:${i}" ${can ? '' : 'disabled'}>${can ? 'Open' : ok ? 'Locked' : Math.floor(m.total / t.need * 100) + '%'}</button>`}</div>`;
  }).join('');
  html += `<div class="shop-sec">Members this week</div><div class="mems">${m.members.map(x => `<div class="mem${x.me ? ' me' : ''}"><span>${x.owner ? icon('crown') + ' ' : ''}${esc(x.name)}${x.me ? '<small>you</small>' : ''}</span><b>${fmt(x.points)}</b></div>`).join('')}</div>`;
  html += `<div class="locked">Only points earned while you are a member count for the alliance, and they stay with it if you leave.</div>`;
  html += `<button class="btn ghost" data-on="leave" ${Online.busy ? 'disabled' : ''}>${Date.now() < Online.leaveArmed ? 'Tap again to leave the alliance' : 'Leave the alliance'}</button>`;
  return html;
}
function onlineClick(el){
  const k = el.dataset.on, val = id => ($(id) || {}).value || '';
  if (k === 'register') Online.act('register', val('on-name'));
  else if (k === 'renameopen'){ Online.renaming = !Online.renaming; render(); }
  else if (k === 'rename') Online.act('rename', val('on-rename'));
  else if (k === 'create') Online.act('create', val('on-aname'));
  else if (k === 'join') Online.act('join', val('on-code'));
  else if (k === 'leave'){ if (Date.now() < Online.leaveArmed){ Online.leaveArmed = 0; Online.act('leave'); } else { Online.leaveArmed = Date.now() + 4000; render(); } }
  else if (k === 'copy'){ const code = Online.mine && Online.mine.code; try { navigator.clipboard.writeText(code).then(() => toast('Code copied', `Send ${code} to your friends.`, 'good', 'flag'), () => toast('Alliance code', code, 'good', 'flag')); } catch(e){ toast('Alliance code', code, 'good', 'flag'); } }
  else if (k === 'sync'){ Online.sync(true).then(() => { Online.boardAt = 0; Online.load('players'); }); }
  else if (k === 'retry'){ Online.status = 'idle'; Online.init(); }
  else if (k.startsWith('view:')){ Online.view = k.slice(5); render(); }
  else if (k.startsWith('chest:')) Online.claimChest(+k.slice(6));
}

