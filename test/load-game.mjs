// Loads the game's logic (everything except the canvas and the boot code) into a Node VM,
// with just enough fake browser around it, so tests can call the real game functions.
//
//   const g = loadGame();         // fresh world each call
//   g.run('fresh()')              // evaluate any expression in the game's global scope
//   g.S                           // the current save state (after g.newGame())
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const jsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'js');
// 95-colony draws on a <canvas> and 99-main boots the page: both need a real browser.
const SKIP = new Set(['95-colony.js', '99-main.js']);

// An element that accepts anything: reads give more fake elements, calls do nothing.
function fakeEl(){
  const target = function(){};
  const store = { children: [], dataset: {}, style: {}, hidden: false, textContent: '', innerHTML: '', value: '' };
  return new Proxy(target, {
    get(t, k){
      if (k in store) return store[k];
      if (k === 'classList') return { add(){}, remove(){}, toggle(){}, contains(){ return false; } };
      if (k === 'getBoundingClientRect') return () => ({ top:0, left:0, width:390, height:200, bottom:200, right:390 });
      if (k === 'querySelector') return () => fakeEl();
      if (k === 'querySelectorAll') return () => [];
      if (k === Symbol.toPrimitive) return () => '';
      return fakeEl();
    },
    set(t, k, v){ store[k] = v; return true; },
    apply(){ return fakeEl(); },
  });
}

export function loadGame({ now } = {}){
  const storage = new Map();
  const window = {};
  const ctx = {
    window, console, setTimeout, clearTimeout, setInterval, clearInterval,   // Math, JSON, Date come from the VM's own realm
    document: { getElementById: () => fakeEl(), querySelector: () => fakeEl(), querySelectorAll: () => [], createElement: () => fakeEl(), documentElement: fakeEl(), activeElement: null, hidden: false, addEventListener(){} },
    localStorage: { getItem: k => storage.has(k) ? storage.get(k) : null, setItem: (k, v) => storage.set(k, String(v)), removeItem: k => storage.delete(k) },
    navigator: {}, performance: { now: () => 0 }, matchMedia: () => ({ matches: false }),
    requestAnimationFrame(){}, getComputedStyle: () => ({ getPropertyValue: () => '' }), addEventListener(){},
    fetch: () => Promise.reject(new Error('offline in tests')),
  };
  Object.assign(window, ctx);
  vm.createContext(ctx);
  if (now) vm.runInContext(`Date.now = () => ${now};`, ctx);
  for (const f of readdirSync(jsDir).filter(f => f.endsWith('.js')).sort()){
    if (SKIP.has(f)) continue;
    vm.runInContext(readFileSync(join(jsDir, f), 'utf8'), ctx, { filename: f });
  }
  // Quiet the UI side-effects the logic triggers (toasts, sounds, modals, redraws).
  vm.runInContext(`toast = () => {}; showModal = () => {}; bump = () => {}; render = () => {}; refresh = () => {}; save = () => {};
    var colony = { rebuild(){}, reset(){}, busy: () => false, guardianActive: () => false, hasCube: () => false, hasFlyer: () => false };`, ctx);
  const run = code => vm.runInContext(code, ctx);
  return {
    run, storage,
    newGame(patch){ run('S = fresh(); S.sound = false; D = derive(S);'); if (patch) run(`Object.assign(S, ${JSON.stringify(patch)}); D = derive(S);`); return run('S'); },
    get S(){ return run('S'); },
    get D(){ return run('D'); },
  };
}
