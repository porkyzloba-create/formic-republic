/* ============================================================
   THE COLONY (canvas)
   ============================================================ */
const colony = (() => {
  const stage = $('stage'), cv = $('cv'), ctx = cv.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W=0, H=0, dpr=1, bg=null, routes=[], ants=[], floats=[], parts=[], weather=[], queenPulse=0;
  let cube=null, nextCube=performance.now()+40000, eater=null, flyer=null, rubble=null, guard=null, seasonId=null;
  const css = getComputedStyle(document.documentElement);
  const C = k => css.getPropertyValue(k).trim();
  const COL = {loam:C('--loam'), soil:C('--soil'), clay:C('--clay'), tunnel:C('--tunnel'), chalk:C('--chalk'), dust:C('--dust'), crumb:C('--crumb'), banner:C('--banner'), dusk:C('--dusk'), leaf:C('--leaf'), jelly:C('--jelly')};
  const MONO = C('--f-mono'), DISP = C('--f-display');

  const SPOTS = {forager:[.2,.4], aphid:[.8,.38], leaf:[.14,.62], fungus:[.86,.62], tunnel:[.3,.86], beetle:[.7,.86], ministry:[.1,.86], politburo:[.9,.86]};
  const geo = () => {
    const surf = H*0.29, mh = Math.min(H*0.12, 44);
    return {surf, mh, ent:[W*.5, surf-mh*0.8], hub:[W*.5, H*.42], queen:[W*.5, H*.66]};
  };
  function rng(seed){ return () => (seed = (seed*16807) % 2147483647) / 2147483647; }

  function resize(){
    const r = stage.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height); dpr = Math.min(devicePixelRatio||1, 2);
    cv.width = Math.round(W*dpr); cv.height = Math.round(H*dpr);
    rebuild();
  }

  function rebuild(){
    if (!W || !S || !D) return;
    const g = geo(), se = D.season; seasonId = se.id;
    bg = document.createElement('canvas'); bg.width = cv.width; bg.height = cv.height;
    const b = bg.getContext('2d'); b.setTransform(dpr,0,0,dpr,0,0);
    // ---- Poster hill: flat colour, ink outlines, a sun rising behind the mound ----
    const INK = '#1D1A2B', PAPER = '#FFFBF3';
    const PAL = {
      spring:{sky:'#9ED8F0', ray:'#B9E5F6', sun:'#FFC738', grass:'#3DAA55', mound:'#D88A4E'},
      summer:{sky:'#FFD66B', ray:'#FFE59E', sun:'#E5392D', grass:'#2FA862', mound:'#D88A4E'},
      autumn:{sky:'#F2995A', ray:'#F7B581', sun:'#E5392D', grass:'#C9922E', mound:'#D2803F'},
      winter:{sky:'#BFD2E6', ray:'#D5E2EF', sun:PAPER,     grass:'#F4F7FB', mound:'#C98652'},
    }[se.id] || {sky:'#9ED8F0', ray:'#B9E5F6', sun:'#FFC738', grass:'#3DAA55', mound:'#D88A4E'};
    const top = [W*.5, g.surf - g.mh*1.05];
    b.fillStyle = PAL.sky; b.fillRect(0, 0, W, g.surf);
    // sunburst
    const rays = 18, R = Math.hypot(W, g.surf) * 1.2;
    b.fillStyle = PAL.ray;
    for (let i = 0; i < rays; i += 2){
      const a0 = Math.PI + i/rays*Math.PI, a1 = Math.PI + (i+1)/rays*Math.PI;
      b.beginPath(); b.moveTo(top[0], top[1]); b.lineTo(top[0] + Math.cos(a0)*R, top[1] + Math.sin(a0)*R); b.lineTo(top[0] + Math.cos(a1)*R, top[1] + Math.sin(a1)*R); b.closePath(); b.fill();
    }
    // rising sun behind the hill
    const sunR = Math.min(W*.24, g.surf*.95);
    b.fillStyle = PAL.sun; b.strokeStyle = INK; b.lineWidth = 2.5;
    b.beginPath(); b.arc(top[0], g.surf, sunR, Math.PI, 0); b.closePath(); b.fill(); b.stroke();
    const r = rng(7);
    // flat clouds
    for (let i = 0; i < 3; i++){
      const cx = W*(.1 + i*.38) + r()*W*.08, cy = 10 + r()*g.surf*.32, cw = 30 + r()*24, chh = 11;
      b.fillStyle = PAPER; b.strokeStyle = INK; b.lineWidth = 1.5;
      b.beginPath(); if (b.roundRect) b.roundRect(cx - cw/2, cy, cw, chh, chh/2); else b.rect(cx - cw/2, cy, cw, chh); b.fill(); b.stroke();
    }
    // soil in flat bands
    const bands = ['#C77A45', '#B5693C', '#9D5833', '#82482A'];
    const bh = (H - g.surf) / bands.length;
    bands.forEach((c, i) => { b.fillStyle = c; b.fillRect(0, g.surf + i*bh, W, bh + 1); });
    for (let i = 0; i < 28; i++){ b.fillStyle = 'rgba(29,26,43,.22)'; b.beginPath(); b.ellipse(r()*W, g.surf + 14 + r()*(H - g.surf - 14), 2 + r()*3.5, 1.5 + r()*2, r()*3, 0, Math.PI*2); b.fill(); }
    // grass strip with an ink line
    b.fillStyle = PAL.grass; b.fillRect(0, g.surf - 3, W, 7);
    b.fillStyle = INK; b.fillRect(0, g.surf + 4, W, 2);
    for (let i = 0; i < 40; i++){ const x = r()*W; if (x > W*.27 && x < W*.73) continue; const h = 4 + r()*6; b.fillStyle = PAL.grass; b.beginPath(); b.moveTo(x - 2, g.surf - 2); b.lineTo(x + (r()-.5)*3, g.surf - 2 - h); b.lineTo(x + 2, g.surf - 2); b.closePath(); b.fill(); }
    if (se.id === 'spring') for (let i = 0; i < 12; i++){ const x = r()*W; if (x > W*.27 && x < W*.73) continue; b.fillStyle = r() < .5 ? '#E5392D' : PAPER; b.beginPath(); b.arc(x, g.surf - 6 - r()*4, 2, 0, Math.PI*2); b.fill(); }
    // the mound
    b.fillStyle = PAL.mound; b.strokeStyle = INK; b.lineWidth = 2.5;
    b.beginPath(); b.moveTo(W*.27, g.surf + 2);
    b.bezierCurveTo(W*.37, g.surf - g.mh*1.4, W*.63, g.surf - g.mh*1.4, W*.73, g.surf + 2); b.closePath(); b.fill(); b.stroke();
    if (se.id === 'winter'){
      b.fillStyle = PAPER; b.beginPath(); b.moveTo(W*.34, g.surf - g.mh*.55); b.bezierCurveTo(W*.42, g.surf - g.mh*1.3, W*.58, g.surf - g.mh*1.3, W*.66, g.surf - g.mh*.55);
      b.bezierCurveTo(W*.6, g.surf - g.mh*.8, W*.4, g.surf - g.mh*.8, W*.34, g.surf - g.mh*.55); b.fill(); b.stroke();
    }
    // the flag on top
    const fx = W*.5 + 12, fy = g.surf - g.mh*1.02;
    b.strokeStyle = INK; b.lineWidth = 2; b.beginPath(); b.moveTo(fx, fy); b.lineTo(fx, fy - 24); b.stroke();
    b.fillStyle = '#E5392D'; b.beginPath(); b.moveTo(fx, fy - 24); b.lineTo(fx + 17, fy - 21); b.lineTo(fx, fy - 14); b.closePath(); b.fill(); b.lineWidth = 1.5; b.stroke();
    b.fillStyle = '#FFC738'; b.beginPath(); b.arc(fx + 5, fy - 19.5, 1.6, 0, Math.PI*2); b.fill();

    routes = [];
    const owned = S.owned;
    const tw = Math.max(8, Math.min(W,H)*0.038);
    const tunnels = [];
    const tun = pts => tunnels.push(pts);
    routes.push(mkRoute([g.ent, [W*.36, g.surf-3], [-10, g.surf-3]], true));
    routes.push(mkRoute([g.ent, [W*.64, g.surf-3], [W+10, g.surf-3]], true));
    tun([g.ent, g.hub]);
    tun([g.hub, g.queen]);
    routes.push(mkRoute([g.ent, g.hub, g.queen], false));
    const chambers = [];
    PRODUCERS.forEach(p => {
      const sp = SPOTS[p.id]; if (!sp || !(owned[p.id] > 0)) return;
      const c = [W*sp[0], H*sp[1]];
      const elbow = [ (g.hub[0]+c[0])/2, c[1] < g.hub[1] ? g.hub[1] : (g.hub[1]+c[1])/2 ];
      tun([g.hub, elbow, c]);
      routes.push(mkRoute([g.ent, g.hub, elbow, c], false));
      chambers.push({p, c});
    });
    const rx = Math.min(W*.085, 44), ry = Math.min(H*.06, 22);
    const path = pts => { b.beginPath(); b.moveTo(...pts[0]); for (const q of pts.slice(1)) b.lineTo(...q); };
    const blobs = [[g.queen, rx*1.35, ry*1.35], ...chambers.map(ch => [ch.c, rx, ry])];
    // pass 1: ink outlines for every tunnel and chamber; pass 2: sand fills on top, so joints stay seamless
    b.lineCap = 'round'; b.lineJoin = 'round';
    b.strokeStyle = INK; b.lineWidth = tw + 5; for (const t of tunnels){ path(t); b.stroke(); }
    b.fillStyle = INK; for (const [c, ex, ey] of blobs){ b.beginPath(); b.ellipse(c[0], c[1], ex + 2.5, ey + 2.5, 0, 0, Math.PI*2); b.fill(); }
    b.strokeStyle = COL.tunnel; b.lineWidth = tw; for (const t of tunnels){ path(t); b.stroke(); }
    b.fillStyle = COL.tunnel; for (const [c, ex, ey] of blobs){ b.beginPath(); b.ellipse(c[0], c[1], ex, ey, 0, 0, Math.PI*2); b.fill(); }
    const pill = (txt, x, y, bgc, fg) => {
      b.font = `800 8.5px ${MONO}`; b.textAlign = 'center'; b.textBaseline = 'middle';
      const w = b.measureText(txt).width + 10, h = 13;
      b.fillStyle = bgc; b.strokeStyle = INK; b.lineWidth = 1.5;
      b.beginPath(); if (b.roundRect) b.roundRect(x - w/2, y - h/2, w, h, h/2); else b.rect(x - w/2, y - h/2, w, h); b.fill(); b.stroke();
      b.fillStyle = fg; b.fillText(txt, x, y + .5); b.textBaseline = 'alphabetic';
    };
    chambers.forEach(({p, c}, i) => {
      const rr = rng((i+1)*97 + 3), n = owned[p.id];
      for (let k = 0; k < Math.min(n, 14); k++){ const a = rr()*Math.PI*2, d = rr(); b.fillStyle = p.color; b.strokeStyle = INK; b.lineWidth = 1; b.beginPath(); b.arc(c[0] + Math.cos(a)*rx*.62*d, c[1] + ry*.15 + Math.sin(a)*ry*.4*d, 2.6, 0, Math.PI*2); b.fill(); b.stroke(); }
      pill(p.short + ' ' + n, c[0], Math.min(c[1] + ry + 10, H - 9), PAPER, INK);   // keep bottom-row labels inside the hill
    });
    // the queen's chamber
    b.strokeStyle = '#E5392D'; b.lineWidth = 2; b.setLineDash([4, 3]); b.beginPath(); b.ellipse(g.queen[0], g.queen[1], rx*1.1, ry*1.05, 0, 0, Math.PI*2); b.stroke(); b.setLineDash([]);
    pill('HER MAJESTY THE PEOPLE', g.queen[0], g.queen[1] - ry*1.35 - 9, '#E5392D', '#FFFFFF');
    if (owned.orbit > 0){
      const ox = W*.86, oy = g.surf*.4;
      b.strokeStyle = '#9fc3d6'; b.lineWidth = 1.5; b.beginPath(); b.ellipse(ox, oy, 16, 5, -.3, 0, Math.PI*2); b.stroke();
      b.fillStyle = COL.soil; b.beginPath(); b.arc(ox, oy, 7, Math.PI, 0); b.fill();
      b.fillStyle = 'rgba(255,248,236,.95)'; b.font = `600 9px ${MONO}`; b.textAlign='center'; b.fillText('ORBIT ' + owned.orbit, ox, oy+18);
    }
    if (owned.comintern > 0){
      for (const fx of [W*.06, W*.94]){
        b.strokeStyle = COL.dust; b.lineWidth = 1; b.beginPath(); b.moveTo(fx, g.surf); b.lineTo(fx, g.surf-22); b.stroke();
        b.fillStyle = COL.banner; b.fillRect(fx, g.surf-22, 10, 7);
      }
    }
    if (owned.dyson > 0){
      b.strokeStyle = 'rgba(255,213,106,.35)'; b.lineWidth = 1; b.setLineDash([2,3]);
      b.beginPath(); b.ellipse(W*.5, g.surf*.3, W*.42, g.surf*.18, 0, 0, Math.PI*2); b.stroke(); b.setLineDash([]);
    }
    b.fillStyle = '#1D1A2B'; b.beginPath(); b.ellipse(g.ent[0], g.ent[1], 6.5, 3.8, 0, 0, Math.PI*2); b.fill();
    syncAnts();
    weather = [];
    const wn = reduce ? 0 : se.id==='winter' ? 45 : se.id==='autumn' ? 14 : se.id==='spring' ? 10 : 0;
    for (let i=0;i<wn;i++) weather.push(newFlake(true));
  }
  function newFlake(anywhere){
    const g = geo(), se = D.season.id;
    return {x: Math.random()*W, y: anywhere ? Math.random()*g.surf : -6, vx: se==='autumn' ? 14+Math.random()*12 : (Math.random()-.5)*8, vy: se==='winter' ? 10+Math.random()*16 : se==='autumn' ? 12+Math.random()*10 : -4-Math.random()*6, r: Math.random()*6, s: 1+Math.random()*1.6};
  }

  function mkRoute(pts, surface){
    const cum = [0];
    for (let i=1;i<pts.length;i++) cum.push(cum[i-1] + Math.hypot(pts[i][0]-pts[i-1][0], pts[i][1]-pts[i-1][1]));
    return {pts, cum, len:cum[cum.length-1], surface};
  }
  function pointOn(r, d){
    d = Math.max(0, Math.min(r.len, d));
    let i = 1; while (i < r.cum.length-1 && r.cum[i] < d) i++;
    const a = r.pts[i-1], b = r.pts[i], seg = r.cum[i]-r.cum[i-1] || 1, t = (d - r.cum[i-1]) / seg;
    return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, Math.atan2(b[1]-a[1], b[0]-a[0])];
  }
  function newAnt(){
    const r = Math.floor(Math.random()*routes.length);
    return {r, d: Math.random()*routes[r].len, dir: Math.random()<.5?1:-1, speed: 18+Math.random()*16, ph: Math.random()*6, lane:(Math.random()-.5)*4};
  }
  function syncAnts(){
    const target = Math.min(6 + totalOwned(S), reduce ? 40 : 140);
    while (ants.length < target) ants.push(newAnt());
    if (ants.length > target) ants.length = target;
    ants.forEach(a => { if (a.r >= routes.length) a.r = Math.floor(Math.random()*routes.length); });
  }

  function drawAnt(x, y, ang, s, ph, carry, color){
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
    ctx.strokeStyle = color; ctx.lineWidth = .6;
    const w = Math.sin(ph)*1.2;
    for (const k of [-1.6, 0, 1.6]){
      ctx.beginPath(); ctx.moveTo(k*.6, 0); ctx.lineTo(k*.6 + w*(k===0?-1:1), -2.6); ctx.moveTo(k*.6,0); ctx.lineTo(k*.6 - w*(k===0?-1:1), 2.6); ctx.stroke();
    }
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(-2.6, 0, 1.9, 1.3, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, 0, 1.2, .8, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(2.1, 0, 1.1, 1, 0, 0, Math.PI*2); ctx.fill();
    if (carry){ ctx.fillStyle = COL.crumb; ctx.fillRect(3, -1.1, 2.2, 2.2); }
    ctx.restore();
  }
  function threatBars(x, y, hp, max, left){
    ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x-32, y-8, 64, 15, 4); else ctx.rect(x-32, y-8, 64, 15); ctx.fill();
    ctx.fillStyle = COL.clay; ctx.fillRect(x-28, y-5, 56, 4);
    ctx.fillStyle = COL.banner; ctx.fillRect(x-28, y-5, 56*(hp/max), 4);
    ctx.fillStyle = COL.crumb; ctx.fillRect(x-28, y+1, 56*Math.max(0,left), 3);
    ctx.font = `400 13px ${DISP}`; ctx.textAlign='center';
    ctx.lineWidth = 4; ctx.strokeStyle = COL.banner; ctx.strokeText('TAP!', x, y-12); ctx.fillStyle = '#fff'; ctx.fillText('TAP!', x, y-12);
  }
  function drawEater(t){
    const g = geo(), e = eater;
    const x = e.x + (e.hurt > 0 ? (Math.random()-.5)*6 : 0), y = g.surf - 13;
    ctx.save();
    ctx.fillStyle = '#4a3f36'; ctx.beginPath(); ctx.ellipse(x+34, y-6, 16, 10, -.4, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#3a312a'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    const st = Math.sin(t/120)*3;
    [[-12,st],[-4,-st],[10,st],[18,-st]].forEach(([dx,o]) => { ctx.beginPath(); ctx.moveTo(x+dx, y+4); ctx.lineTo(x+dx+o, g.surf); ctx.stroke(); });
    ctx.fillStyle = e.hurt > 0 ? '#9a6a55' : '#6e5d4f'; ctx.beginPath(); ctx.ellipse(x, y, 26, 12, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#e8dccb'; ctx.beginPath(); ctx.moveTo(x-14, y-10); ctx.lineTo(x+4, y+10); ctx.lineTo(x+10, y+8); ctx.lineTo(x-8, y-11); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#6e5d4f'; ctx.beginPath(); ctx.moveTo(x-22, y-6); ctx.lineTo(x-56, y+6); ctx.lineTo(x-56, y+8); ctx.lineTo(x-20, y+4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = COL.loam; ctx.beginPath(); ctx.arc(x-24, y-4, 1.6, 0, Math.PI*2); ctx.fill();
    if (Math.sin(t/180) > .3){ ctx.strokeStyle = '#d0607a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x-56, y+7); ctx.quadraticCurveTo(x-64, y+12, x-62+Math.sin(t/60)*3, y+16); ctx.stroke(); }
    ctx.restore();
    threatBars(x, Math.max(26, y-30), e.hp, e.max, (e.until - t)/10000);
  }
  function drawRubble(t){
    const r = rubble, rr = rng(42);
    const x = r.x + (r.hurt > 0 ? (Math.random()-.5)*5 : 0), y = r.y;
    const n = 4 + Math.ceil(r.hp/r.max*6);
    for (let i=0;i<n;i++){
      const ox = (rr()-.5)*34, oy = (rr()-.5)*18, s = 5 + rr()*7;
      ctx.fillStyle = i%2 ? '#6e5d4f' : '#8a7563';
      ctx.beginPath(); ctx.moveTo(x+ox-s, y+oy+s*.4); ctx.lineTo(x+ox-s*.3, y+oy-s*.8); ctx.lineTo(x+ox+s*.8, y+oy-s*.4); ctx.lineTo(x+ox+s, y+oy+s*.5); ctx.closePath(); ctx.fill();
    }
    if (Math.random() < .3) parts.push({x: x+(Math.random()-.5)*30, y: y-8, c:'#8a7563', vx:(Math.random()-.5)*20, vy:-10, life:.4, s:1.5});
    threatBars(x, y-26, r.hp, r.max, (r.until - t)/8000);
  }
  function drawFlyer(t){
    const f = flyer;
    ctx.save(); ctx.translate(f.x, f.y);
    const flap = Math.sin(t/40);
    ctx.fillStyle = 'rgba(228,200,240,.65)';
    ctx.beginPath(); ctx.ellipse(-1, -5 - flap*2, 8, 3, -.5 - flap*.3, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-1, 5 + flap*2, 8, 3, .5 + flap*.3, 0, Math.PI*2); ctx.fill();
    ctx.restore();
    drawAnt(f.x, f.y, 0, 2.2, t/90, false, '#2b1a10');
    ctx.save(); ctx.shadowColor = COL.jelly; ctx.shadowBlur = 12; ctx.fillStyle = COL.jelly; ctx.beginPath(); ctx.arc(f.x+5, f.y-4, 1.6, 0, Math.PI*2); ctx.fill(); ctx.restore();
  }

  function drawGuardian(t){
    const g = guard, shake = g.hurt > 0 ? (Math.random()-.5)*5 : 0;
    const baseX = W*.5 + shake, baseY = H + 10, top = Math.max(geo().surf + 30, H*.38);
    const segs = 9, body = g.boss ? '#7a1631' : '#4b2a6b', rim = g.boss ? '#ff4d6d' : '#b98cff';
    const pts = [];
    for (let i = 0; i <= segs; i++){
      const k = i / segs, y = baseY - (baseY - top) * k;
      pts.push([baseX + Math.sin(t/420 + k*4) * W*.08 * (1 - k*.3), y]);
    }
    for (let i = 0; i < pts.length; i++){
      const [x, y] = pts[i], r = (g.boss ? 26 : 21) * (1 - i/segs*.35);
      ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(x, y, r, r*.82, 0, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = rim; ctx.lineWidth = 2; ctx.stroke();
      if (i < pts.length - 1){ ctx.strokeStyle = body; ctx.lineWidth = 3; for (const sg of [-1,1]){ ctx.beginPath(); ctx.moveTo(x + sg*r*.8, y); ctx.lineTo(x + sg*(r + 10), y + 6 + Math.sin(t/90 + i)*3); ctx.stroke(); } }
    }
    const [hx, hy] = pts[pts.length-1];
    ctx.fillStyle = rim; for (const sg of [-1,1]){ ctx.beginPath(); ctx.moveTo(hx + sg*8, hy - 10); ctx.quadraticCurveTo(hx + sg*22, hy - 26 - Math.sin(t/150)*4, hx + sg*6, hy - 30); ctx.lineTo(hx + sg*4, hy - 12); ctx.fill(); }
    ctx.save(); ctx.shadowColor = '#ffe36e'; ctx.shadowBlur = 10; ctx.fillStyle = '#ffe36e';
    for (const sg of [-1,1]){ ctx.beginPath(); ctx.arc(hx + sg*7, hy - 3, 3, 0, Math.PI*2); ctx.fill(); }
    ctx.restore();
    const barY = Math.max(30, top - 54);
    threatBars(W*.5, barY, g.hp, g.max, (g.until - t)/(g.secs*1000));
    ctx.font = `700 12px ${MONO}`; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(29,43,83,.85)';
    const label = `DEPTH ${g.depth} · ${g.name.toUpperCase()}`;
    ctx.strokeText(label, W*.5, barY + 22); ctx.fillStyle = '#fff'; ctx.fillText(label, W*.5, barY + 22);
    const pct = Math.max(0, g.hp/g.max*100);
    ctx.font = `700 11px ${MONO}`; ctx.strokeText(`${pct.toFixed(pct < 10 ? 1 : 0)}% · ${Math.max(0, Math.ceil((g.until - t)/1000))}s`, W*.5, barY + 37); ctx.fillText(`${pct.toFixed(pct < 10 ? 1 : 0)}% · ${Math.max(0, Math.ceil((g.until - t)/1000))}s`, W*.5, barY + 37);
  }
  function hitGuardian(v, x, y){
    if (!guard) return;
    guard.hp -= v; guard.hurt = .12;
    if (x !== undefined){ burst(x, y, 5, guard.boss ? COL.banner : COL.jelly); floats.push({x, y: y - 8, text: '-' + fmt(v, true), life: .7, color: guard.boss ? COL.banner : COL.jelly}); if (floats.length > 30) floats.shift(); }
    if (guard.hp <= 0){ const d = guard.depth; burst(W*.5, H*.6, 40, COL.crumb); burst(W*.5, H*.6, 30, COL.jelly); floats.push({x: W*.5, y: H*.5, text: `DEPTH ${d} CLEARED`, life: 2.4, big: true}); guard = null; hooks.guardianWin(d); }
  }

  let lastT = performance.now();
  function frame(t){
    const dt = Math.min(.05, (t - lastT)/1000); lastT = t;
    if (!bg) return;
    if (D.season.id !== seasonId) rebuild();
    ctx.setTransform(1,0,0,1,0,0); ctx.drawImage(bg, 0, 0);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    const g = geo();
    const sid = D.season.id;
    for (const w of weather){
      w.x += w.vx*dt + (sid==='autumn' ? Math.sin(t/400 + w.r)*12*dt : 0); w.y += w.vy*dt; w.r += dt*2;
      if (sid==='spring'){ if (w.y < 0 || w.x > W+5 || w.x < -5){ Object.assign(w, newFlake(false), {y: g.surf - Math.random()*10}); } }
      else if (w.y > g.surf || w.x > W+10){ Object.assign(w, newFlake(false)); if (sid==='autumn') w.x = Math.random()*W*.8 - 20; }
      if (sid==='winter'){ ctx.fillStyle = 'rgba(240,244,250,.8)'; ctx.beginPath(); ctx.arc(w.x, w.y, w.s, 0, Math.PI*2); ctx.fill(); }
      else if (sid==='autumn'){ ctx.save(); ctx.translate(w.x, w.y); ctx.rotate(w.r); ctx.fillStyle = w.s > 1.8 ? '#c8622e' : '#d99a3a'; ctx.beginPath(); ctx.ellipse(0,0,3.2,1.6,0,0,Math.PI*2); ctx.fill(); ctx.restore(); }
      else if (sid==='spring'){ ctx.fillStyle = 'rgba(255,240,180,.7)'; ctx.fillRect(w.x, w.y, 1.4, 1.4); }
    }
    for (const a of ants){
      const r = routes[a.r]; if (!r) continue;
      const fast = (1 + (D.prodBuff > 1 ? .8 : 0) + fervor*.6) * (sid==='winter' && !D.almanac ? .8 : 1);
      a.d += a.dir * a.speed * dt * fast; a.ph += dt*14*fast;
      if (a.d >= r.len){ a.d = r.len; a.dir = -1; if (Math.random()<.35) { a.r = Math.floor(Math.random()*routes.length); a.d = routes[a.r].len; } }
      else if (a.d <= 0){ a.d = 0; a.dir = 1; if (Math.random()<.5) { a.r = Math.floor(Math.random()*routes.length); a.d = 0; } }
      const rr = routes[a.r];
      const [x,y,ang] = pointOn(rr, a.d);
      const carry = rr.surface ? a.dir < 0 : a.dir > 0;
      const nx = -Math.sin(ang)*a.lane, ny = Math.cos(ang)*a.lane;
      drawAnt(x+nx, y+(rr.surface?0:ny), a.dir>0?ang:ang+Math.PI, 1.15, a.ph, carry, rr.surface ? '#0e0907' : '#140d09');
    }
    queenPulse = Math.max(0, queenPulse - dt*3);
    const qs = 4.2 + queenPulse*0.8 + Math.sin(t/600)*.08;
    drawAnt(g.queen[0]-6, g.queen[1], 0, qs, t/900, false, '#140d09');
    ctx.fillStyle = COL.crumb; ctx.beginPath(); ctx.moveTo(g.queen[0]+3, g.queen[1]-6); ctx.lineTo(g.queen[0]+5, g.queen[1]-11); ctx.lineTo(g.queen[0]+7, g.queen[1]-8); ctx.lineTo(g.queen[0]+9, g.queen[1]-11); ctx.lineTo(g.queen[0]+11, g.queen[1]-6); ctx.closePath(); ctx.fill();

    if (!cube && t > nextCube && routes.length){
      cube = {x: W*(.12+Math.random()*.76), y: g.surf - 10 - Math.random()*g.surf*.4, born:t};
    }
    if (cube){
      const age = (t - cube.born)/1000;
      if (age > 13){ cube = null; scheduleCube(t); }
      else {
        const bob = Math.sin(t/250)*2, glow = .5 + Math.sin(t/180)*.3;
        ctx.save(); ctx.translate(cube.x, cube.y + bob); ctx.rotate(.2);
        ctx.shadowColor = COL.crumb; ctx.shadowBlur = 14*glow;
        ctx.fillStyle = '#fff4dc'; ctx.fillRect(-7,-7,14,14);
        ctx.shadowBlur = 0; ctx.strokeStyle = COL.crumb; ctx.lineWidth = 1.5; ctx.strokeRect(-7,-7,14,14);
        ctx.restore();
        if (age < 5){ ctx.fillStyle = COL.chalk; ctx.font = `600 10px ${MONO}`; ctx.textAlign='center'; ctx.fillText('PICNIC!', cube.x, cube.y - 14); }
      }
    }
    if (rubble){
      rubble.hurt = Math.max(0, rubble.hurt - dt);
      drawRubble(t);
      if (t > rubble.until){ rubble = null; hooks.rubbleLose(); }
    }
    if (eater){
      const stopX = W*.72 + 30;
      if (eater.x > stopX) eater.x -= 40*dt;
      eater.hurt = Math.max(0, eater.hurt - dt);
      drawEater(t);
      if (t > eater.until){ eater = null; hooks.anteaterLose(); }
    }
    if (guard){
      guard.hurt = Math.max(0, guard.hurt - dt);
      drawGuardian(t);
      if (guard && t > guard.until){ const d = guard.depth, frac = 1 - guard.hp/guard.max; guard = null; hooks.guardianLose(d, frac); }
    }
    if (flyer){
      flyer.x += 55*dt; flyer.y = flyer.y0 + Math.sin(t/300)*8;
      drawFlyer(t);
      if (flyer.x > W + 20) flyer = null;
    }
    for (let i=parts.length-1;i>=0;i--){
      const p = parts[i]; p.life -= dt; if (p.life <= 0){ parts.splice(i,1); continue; }
      p.vy += 260*dt; p.x += p.vx*dt; p.y += p.vy*dt;
      ctx.globalAlpha = Math.min(1, p.life*2); ctx.fillStyle = p.c || COL.crumb; ctx.fillRect(p.x, p.y, p.s, p.s);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    for (let i=floats.length-1;i>=0;i--){
      const f = floats[i]; f.life -= dt; if (f.life <= 0){ floats.splice(i,1); continue; }
      f.y -= 38*dt;
      ctx.globalAlpha = Math.min(1, f.life*1.6);
      ctx.font = `400 ${f.big?22:18}px ${DISP}`;
      ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.strokeStyle = '#1D1A2B'; ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color || (f.big ? '#fff' : '#FFC738'); ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }
  function scheduleCube(t){ nextCube = t + (60000 + Math.random()*90000) / ((S.edicts.scouts ? 2 : 1) * D.season.picnicRate); }
  function clampX(x){ return Math.max(60, Math.min(W-60, x)); }

  function tapAt(x, y){
    const g = geo();
    if (guard){ hitGuardian(hooks.guardianHit(), x, y); queenPulse = 1; return; }
    if (cube && Math.hypot(x-cube.x, y-cube.y) < 28){
      const v = hooks.picnic();
      floats.push({x:clampX(cube.x), y:cube.y-10, text:'Picnic! +' + fmt(v), life:2.2, big:true});
      burst(cube.x, cube.y, 24); cube = null; scheduleCube(performance.now());
      return;
    }
    if (flyer && Math.hypot(x-flyer.x, y-flyer.y) < 30){
      hooks.flyerCaught();
      floats.push({x:clampX(flyer.x), y:flyer.y, text:'Royal Frenzy ×7', life:2.2, big:true, color:COL.jelly});
      burst(flyer.x, flyer.y, 20, COL.jelly); flyer = null;
      return;
    }
    if (eater && Math.abs(x - eater.x + 10) < 52 && Math.abs(y - (g.surf-13)) < 34){
      eater.hp--; eater.hurt = .15; hooks.threatHit();
      burst(x, y, 5, COL.banner);
      floats.push({x, y:y-8, text:'POW', life:.6, color:COL.banner});
      if (eater.hp <= 0){ burst(eater.x, g.surf-13, 30); eater = null; hooks.anteaterWin(); }
      return;
    }
    if (rubble && Math.hypot(x - rubble.x, y - rubble.y) < 38){
      rubble.hp--; rubble.hurt = .15; hooks.threatHit();
      burst(x, y, 6, '#8a7563');
      floats.push({x, y:y-8, text:'DIG', life:.6, color:COL.chalk});
      if (rubble.hp <= 0){ burst(rubble.x, rubble.y, 26); rubble = null; hooks.rubbleWin(); }
      return;
    }
    const v = hooks.tap();
    queenPulse = 1;
    if (lastCrit){   // critical tap: big red number, a bigger burst and a little shake
      floats.push({x: clampX(x), y: y - 14, text:'CRIT! +' + fmt(v, true), life:1.3, big:true, color:'#E5392D'});
      burst(x, y, reduce ? 6 : 22, '#E5392D'); burst(x, y, reduce ? 0 : 12, COL.crumb);
      if (!reduce) try { stage.animate([{transform:'translate(0,0)'},{transform:'translate(-4px,2px)'},{transform:'translate(4px,-2px)'},{transform:'translate(0,0)'}], {duration:180}); } catch(e){}
      Sound.reveal('E'); buzz([15, 30, 25]);
    } else floats.push({x: x + (Math.random()-.5)*16, y: y - 8, text:'+' + fmt(v, true), life:1});
    burst(x, y, reduce ? 3 : 7);
    if (floats.length > 30) floats.shift();
  }
  function droneTap(v){
    const g = geo(); queenPulse = Math.max(queenPulse, .5);
    if (Math.random() < .5) floats.push({x: g.queen[0] + (Math.random()-.5)*40, y: g.queen[1]-16, text:'+' + fmt(v, true), life:.8, color:COL.jelly});
  }
  function burst(x, y, n, c){
    for (let i=0;i<n;i++) parts.push({x, y, c, vx:(Math.random()-.5)*160, vy:-60-Math.random()*120, life:.6+Math.random()*.4, s:1.5+Math.random()*2});
  }
  function reset(){ floats = []; parts = []; cube = null; eater = null; flyer = null; rubble = null; guard = null; nextCube = performance.now() + 40000; }
  function spawnGuardian(o){ const t = performance.now(); guard = {depth:o.depth, name:o.name, hp:o.hp, max:o.hp, boss:o.boss, secs:o.secs, until: t + o.secs*1000, hurt:0}; }
  function spawnAnteater(){ const t = performance.now(); eater = {x: W + 60, hp:12, max:12, until: t + 11500, hurt:0}; }
  function spawnFlyer(){ const g = geo(); flyer = {x:-20, y0: Math.max(14, g.surf*.4), y: g.surf*.4}; }
  function spawnRubble(){
    const g = geo(), t = performance.now();
    const spots = [[W*.36, H*.5], [W*.64, H*.5], [W*.5, (g.hub[1]+g.queen[1])/2]];
    const sp = spots[Math.floor(Math.random()*spots.length)];
    rubble = {x: sp[0], y: sp[1], hp:8, max:8, until: t + 8000, hurt:0};
  }
  function busy(){ return !!(eater || flyer || rubble || guard); }
  function spawnCube(){ const g = geo(); cube = {x: W*(.15 + Math.random()*.7), y: g.surf - 12 - Math.random()*g.surf*.35, born: performance.now()}; }
  function hasCube(){ return !!cube; }
  function hasFlyer(){ return !!flyer; }

  new ResizeObserver(resize).observe(stage);
  return {frame, rebuild, tapAt, reset, resize, droneTap, spawnAnteater, spawnFlyer, spawnRubble, busy, spawnCube, hasCube, hasFlyer, spawnGuardian, guardianActive: () => !!guard, hitGuardian: v => hitGuardian(v)};
})();

