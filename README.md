# Formic Republic

An ant-colony idle game: tap the hill, hire castes, research, raid, collect cards, take the
Nuptial Flight (prestige), form Supercolonies, dig into the Abyss, and race other colonies in
the weekly league with your alliance.

The whole game ships as **one self-contained HTML file**, `dist/formic-republic.html`. The same
file runs in three places:

| Where | How it loads the file | Ads / purchases | League backend |
|---|---|---|---|
| claude.ai preview | published as an artifact | simulated, nothing charged | Supabase, or the artifact's own database if Supabase is unreachable |
| Android | Expo app, WebView shell | AdMob + Google Play (RevenueCat) | Supabase |
| Steam | Electron shell | none / Steam purchases | Supabase |

A shell tells the game where it is running by setting `window.FR_PLATFORM` before the script
runs, and talks to native code through `window.FR_send` / `window.FR_receive`. See
`src/js/40-monetize-platform.js`.

## Working on it

```sh
npm install
npm run build      # src/ → dist/formic-republic.html
npm test           # game-logic tests (Node, no browser)
npm run test:e2e   # plays through the built game in Chromium (needs `npx playwright install chromium`)
```

Edit files in `src/`, never `dist/` directly, then run `npm run build` and commit both.
CI fails if `dist/` doesn't match `src/`.

## Layout

```
src/
  head.html, markup.html, tail.html   page skeleton and static markup
  styles/   01-base … 07-online        CSS, applied in name order (later files restyle earlier ones)
  js/       00-helpers … 99-main       scripts, concatenated in name order into one shared global scope
build.mjs                              stitches src/ into dist/
test/                                  logic tests (test/load-game.mjs runs the real scripts in a Node VM)
test/e2e/smoke.mjs                     browser play-through
supabase/migrations/                   the league server (tables + fr_* functions)
```

Scripts, in load order:

| File | What it holds |
|---|---|
| `00-helpers.js` | number/time formatting, icons |
| `10-data.js` | all game data: castes, research, raids, edicts, cards, packs, pass, medals, endgame |
| `20-state.js` | the save shape, `derive()` (every multiplier), costs, prestige maths |
| `21-save.js` | load / normalize old saves / save (browser storage + Steam Cloud file) |
| `30-runtime.js` | `S` (state) and `D` (derived numbers), gain/spend, buffs, merit |
| `40-monetize-platform.js` | the store shells, rewarded ads, purchases, preview tools |
| `50-shop-cards-pass.js` | amber shop, packs and cards, pass, endgame actions, taps and hiring |
| `55-raids.js` | expeditions |
| `60-tutorial-quota.js` | first-session training, navigation groups, the Plan quotas |
| `65-abyss.js` | the Abyss (after the first Supercolony) |
| `70-directives.js` | Daily Directives |
| `75-online.js` | weekly league + alliances (Supabase API, preview fallback, UI) |
| `77-fun.js` | critical taps, the Queen's Lottery, milestones, Comrade Ant, the share card, analytics |
| `80-daily-events.js` | Party Congress streak, random incidents |
| `85-sound.js` | sound effects and haptics |
| `90-ui.js` | rendering of every tab, click handling, modals, the hill strip on scroll |
| `95-colony.js` | the canvas hill: ants, chambers, threats, guardians |
| `99-main.js` | the game loop and boot |

## The league server

Supabase project `formic-republic` (ref `pfjixomcpkcrpbvdjekh`, Frankfurt). The game only calls
the `fr_*` SQL functions; tables are locked. Weekly score = pass merit earned that ISO week
(UTC). The server caps how fast a score can rise (2.5 points/second with a 2,500-point buffer),
and points above the cap are reported again later, not lost.
