/* ============================================================
   SOUND + HAPTICS
   ============================================================ */
const Sound = (() => {
  let ac = null;
  function ctx(){ if (ac === null){ try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){ ac = false; } } return ac; }
  function blip(freq, dur, type, vol, delay){
    if (!S || !S.sound) return;
    const a = ctx(); if (!a) return;
    try {
      if (a.state === 'suspended') a.resume();
      const t0 = a.currentTime + (delay||0);
      const o = a.createOscillator(), g = a.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
      o.connect(g); g.connect(a.destination); o.start(t0); o.stop(t0 + dur + .02);
    } catch(e){}
  }
  return {
    tap:   () => blip(480 + Math.random()*120 + fervor*300, .05, 'triangle', .035),
    hit:   () => blip(160 + Math.random()*40, .08, 'square', .04),
    buy:   () => { blip(660, .07, 'square', .02); blip(990, .09, 'square', .018, .06); },
    good:  () => { blip(523, .1, 'triangle', .05); blip(659, .1, 'triangle', .05, .09); blip(784, .16, 'triangle', .05, .18); },
    bad:   () => { blip(220, .18, 'sawtooth', .03); blip(165, .25, 'sawtooth', .03, .15); },
    alert: () => { blip(392, .12, 'square', .03); blip(523, .16, 'square', .03, .13); },
    reveal: r => { const f = {C:440, R:587, E:740, L:880, M:1046, P:523}[r]; blip(f, .12, 'triangle', .05); if (r==='P'){ [1,1.26,1.5,2,2.52,3,4].forEach((m,i) => blip(f*m, .5, i%2 ? 'sine' : 'triangle', .045, .08 + i*.11)); blip(f/2, 1.4, 'sine', .05, .05); return; } if (r==='E' || r==='L' || r==='M'){ blip(f*1.25, .16, 'triangle', .05, .1); blip(f*1.5, .3, 'triangle', .05, .2); } if (r==='L' || r==='M') blip(f*2, .4, 'triangle', .04, .32); if (r==='M'){ blip(f*2.5, .5, 'sine', .04, .45); blip(f*3, .7, 'sine', .035, .6); } },
    stamp: () => { blip(110, .12, 'square', .05); blip(784, .12, 'triangle', .04, .12); blip(1046, .2, 'triangle', .04, .22); },
  };
})();
function buzz(p){ try { navigator.vibrate && navigator.vibrate(p); } catch(e){} }

