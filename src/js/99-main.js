/* ============================================================
   MAIN LOOP & BOOT
   ============================================================ */
let lastSave = 0, lastUi = 0, lastFrame = performance.now();
function loop(t){
  const now = Date.now();
  const el = (now - S.last) / 1000; S.last = now;
  const dt = Math.min(.25, (t - lastFrame)/1000); lastFrame = t;
  if (el > 15){
    D = derive(S, now);
    const secs = Math.min(el, D.offlineCap);
    const g = D.baseCps * secs * D.offline;
    if (g > 0){
      gain(g);
      const back = raidsReady();
      pendingOffline = g;
      const adBtn = `<button class="gbtn ad big" id="m-ad2">${icon(adFree() ? 'star' : 'play')}${S.iap.owned.party ? 'Party bonus' : !PLATFORM.ads ? 'Night bonus' : 'Watch an ad'}: double it to +${fmt(g*2)}</button>`;
      showModal('The night shift reports', '+' + fmt(g),
        `You were away for ${fmtTime(el)}${el > D.offlineCap ? ` (the shift covers ${D.offlineCap/3600}h at most)` : ''}. The colony kept gathering at ${Math.round(D.offline*100)}% speed.` + (D.offline < 1 ? ' Research Night Shift to bring that to 100%.' : '') + (back ? ` ${back} raiding squad${back>1?'s are':' is'} home with loot.` : ''), null, adBtn);
    }
    scheduleNextEvent();
  } else if (el > 0) gain(D.cps * el);
  if (el > 0) siege(el);

  if (t - lastTapAt > 600) fervor = Math.max(0, fervor - dt * .35 * D.ferDecay);
  if (t < fervorLockUntil) fervor = 1;
  const ar = autoTapRate(now);
  if (ar){
    autoAcc += ar * dt;
    while (autoAcc >= 1){ autoAcc--;
      if (colony.guardianActive()) colony.hitGuardian(hooks.guardianHit());
      else { const v = doTap(true); colony.autoTap(v, lastCrit); }
    }
  } else autoAcc = 0;
  if (D.drones){
    droneAcc += D.drones * dt;
    while (droneAcc >= 1){ droneAcc--; const v = D.tapValue; if (colony.guardianActive()) colony.hitGuardian(v * D.abyssMult); else { gain(v); colony.droneTap(v); } }
  }

  colony.frame(t);
  $('stage').classList.toggle('fighting', colony.guardianActive());
  $('crumbs').textContent = fmt(S.crumbs);
  const fv = $('fervor');
  if (S.taps >= 5){ $('hint').hidden = true; fv.hidden = false; }
  $('ferv-fill').style.width = (fervor*100) + '%';
  fv.classList.toggle('max', fervor > .98);
  $('ferv-lbl').textContent = (fervor > .98 ? 'MAX FERVOR ×' : 'FERVOR ×') + fervMult().toFixed(1);

  if (t - lastUi > 200){
    lastUi = t;
    D = derive(S, now);
    S.buffs = S.buffs.filter(b => b.until > now);
    const se = D.season;
    S.flags.seasons[se.id] = 1;
    if (lastSeason && lastSeason !== se.id){
      toast(`${se.name} has come`, `For the next 4 minutes: ${(se.id==='winter' && D.almanac) ? 'lab −20%' : se.fx}.`, se.id==='winter' ? 'neutral' : 'good', se.icon);
    }
    lastSeason = se.id;
    if (activeEvent){
      const left = (eventDeadline - now) / 25000;
      $('sh-fill').style.width = Math.max(0, left*100) + '%';
      $('sh-clock').textContent = Math.max(0, Math.ceil((eventDeadline - now)/1000)) + 's';
      if (left <= 0) resolveEvent('b', true);
    } else if (now > nextEventAt && $('modal').hidden && $('opening').hidden && !colony.busy()){
      fireEvent();
    }
    checkMedals(); checkDirectives();
    checkHardship(); automate(t); checkPassSeason(); Fun.tick(now);
    Online.tick(now);
    refresh();
  }
  if (t - lastSave > 5000){ lastSave = t; save(); }
  requestAnimationFrame(loop);
}

function start(data){
  S = (data && data.state) ? normalize(data.state) : (load() || fresh());
  D = derive(S);
  checkPassSeason();
  initTut();
  if (tutActive()) nextEventAt = Date.now() + 90000;
  if (!S.quota) genQuota();
  buildTicker();
  render();
  colony.resize();
  checkDaily();
  initMilestones();
  $('advisor').querySelector('.adv-face').innerHTML = antFaceSVG();
  Analytics.ev('session_start', {tut: tutStep(), gems: Math.floor(S.gems), pass_premium: !!S.pass.premium});
  if (!S.flags.v4){
    S.flags.v4 = true; S.gems += 50; S.packs.common = (S.packs.common||0) + 1;
    S.inv.rush = (S.inv.rush||0) + 1; S.inv.basket = (S.inv.basket||0) + 1;
    showModal('A gift from the Politburo', '+50 amber', 'Amber buys card packs, usables and the Revolution Pass in the Shop. You also got a free Worker Pack (open it in Cards) and two usables on your belt.', 'Glory to the hill');
    save();
  }

  const stage = $('stage');
  stage.addEventListener('pointerdown', e => {
    const r = stage.getBoundingClientRect();
    colony.tapAt(e.clientX - r.left, e.clientY - r.top);
    $('crumbs').textContent = fmt(S.crumbs);
  });
  stage.addEventListener('keydown', e => {
    if (e.key === ' ' || e.key === 'Enter'){ e.preventDefault(); const r = stage.getBoundingClientRect(); colony.tapAt(r.width/2, r.height*.6); }
  });
  $('nav').addEventListener('click', e => {
    const b = e.target.closest('[data-group]'); if (!b) return;
    const g = b.dataset.group, G = GROUPS[g];
    const t = lastIn[g] !== undefined && tabShown(lastIn[g]) ? lastIn[g] : G.tabs.find(tabShown);
    G.tabs.forEach(x => freshTabs.delete(x)); goTab(t);
  });
  $('groupbar').addEventListener('click', e => { const b = e.target.closest('[data-gt]'); if (!b) return; const [t, sc] = b.dataset.gt.split(':'); goTab(t, sc); });
  $('flightbtn').addEventListener('click', () => goTab('flight'));
  $('subbar').addEventListener('click', onPanelClick);
  $('m-extra').addEventListener('click', async e => {
    const sh = e.target.closest('[data-share]'); if (sh){ shareColony(sh.dataset.share); return; }
    const b = e.target.closest('#m-ad2'); if (b && !b.disabled){ doubleOffline(b); return; }
    if (e.target.closest('#m-kit')){ await buyIAP('starter'); if (S.iap.owned.starter) $('m-ok').click(); }
  });
  $('list').addEventListener('click', onPanelClick);
  $('list').addEventListener('scroll', onListScroll, {passive:true});
  $('list').addEventListener('wheel', e => { if (e.deltaY < 0) expandAtTop(); }, {passive:true});
  $('list').addEventListener('touchstart', e => { touchY = e.touches[0].clientY; }, {passive:true});
  $('list').addEventListener('touchmove', e => { if (touchY !== null && e.touches[0].clientY - touchY > 40) expandAtTop(); }, {passive:true});
  $('list').addEventListener('touchend', () => { touchY = null; }, {passive:true});
  $('list').addEventListener('keydown', e => {   // Enter in a league field presses its button
    if (e.key !== 'Enter' || !e.target.classList.contains('oinput')) return;
    e.preventDefault(); const b = e.target.parentElement.querySelector('[data-on]'); if (b && !b.disabled) b.click();
  });
  $('m-ok').addEventListener('click', () => { $('modal').hidden = true; if (modalQ.length) showModal(...modalQ.shift()); refresh(); });
  $('belt').addEventListener('click', e => {
    const u = e.target.closest('[data-use]'); if (u){ if (useItem(u.dataset.use)){ afterChange(); } return; }
    const go = e.target.closest('[data-goto]'); if (go){ tab = go.dataset.goto; render(); $('list').scrollTop = 0; }
  });
  $('quota').addEventListener('click', e => { const go = e.target.closest('[data-goto]'); if (go){ tab = go.dataset.goto; freshTabs.delete(tab); render(); $('list').scrollTop = 0; } });
  $('gempill').addEventListener('click', () => { tab = 'shop'; render(); $('list').scrollTop = 0; });
  $('op-cards').addEventListener('click', e => flipCard(e.target.closest('.flip')));
  $('op-all').addEventListener('click', () => document.querySelectorAll('#op-cards .flip:not(.open)').forEach((el,i) => setTimeout(() => flipCard(el), i*160)));
  $('op-done').addEventListener('click', () => { $('opening').hidden = true; D = derive(S); save(); render(); colony.rebuild(); });
  $('sh-a').addEventListener('click', () => resolveEvent('a'));
  $('sh-b').addEventListener('click', () => resolveEvent('b'));
  $('snd').addEventListener('click', () => { S.sound = !S.sound; save(); refresh(); if (S.sound) Sound.buy(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden){ save(true); Analytics.flush(); } });
  $('spinpill').addEventListener('click', e => { e.stopPropagation(); Fun.openSpin(); });
  $('spinpill').addEventListener('pointerdown', e => e.stopPropagation());
  $('advisor').addEventListener('pointerdown', e => e.stopPropagation());
  $('advisor').addEventListener('click', e => { e.stopPropagation(); const go = $('advisor').dataset.go; Fun.hideAdvisor(); if (go === 'pass'){ goTab('pass'); } else if (go === 'ranks'){ goTab('ranks'); } else if (go === 'shop'){ goTab('shop'); } else if (go){ goTab(go); } });
  $('spin-btn').addEventListener('click', () => Fun.spin());
  $('pol-web').addEventListener('click', () => openExternal(PLATFORM.privacyUrl));
  $('policyov').addEventListener('click', e => { if (e.target.id === 'policyov' || e.target.closest('#pol-close')) $('policyov').hidden = true; });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('policyov').hidden) $('policyov').hidden = true; });
  $('spin-close').addEventListener('click', () => { if (!Fun.spinBusy){ $('spinov').hidden = true; refresh(); } });
  addEventListener('pagehide', () => save(true));
  Native.post('ready', {});                                    // shell answers with local store prices
  if (PLATFORM.achievements) S.medals.forEach(id => Monetize.achievement(id));   // re-sync medals earned earlier

  try { document.fonts && document.fonts.ready.then(() => colony.rebuild()); } catch(e){}
  window.claude?.hot?.snapshot?.(() => ({state:S}));
  requestAnimationFrame(loop);
}
window.claude?.hot?.ready ? window.claude.hot.ready(start) : start(window.claude?.hot?.data ?? {});
