# Notes for working on Formic Republic

Read README.md first for the layout.

- Edit `src/`, then `npm run build`. Never hand-edit `dist/formic-republic.html`; commit it rebuilt.
- Scripts share ONE global scope, concatenated in file-name order. A function can be used
  from any file, but top-level code runs in order, so a top-level statement may only use
  things from files with a lower number. No `import`/`export` in `src/js`.
- Game data (`10-data.js`) and state maths (`20-state.js`) must stay free of DOM access:
  the logic tests load them in Node (`test/load-game.mjs`).
- Anything that should survive the Nuptial Flight / Supercolony must be listed in `PERMA`
  (`20-state.js`). New save fields need a default in `fresh()` and a backfill in `normalize()`
  so old saves keep loading; add a test in `test/game.test.mjs`.
- User-supplied text (colony and alliance names from the server) must go through `esc()`
  before it is put into HTML.
- Run `npm test` and `npm run test:e2e` before committing. Add tests for new rules.
- The claude.ai preview is published from `dist/formic-republic.html` to the existing
  artifact https://claude.ai/artifact/FC9HXdn7bK4UPLRwqiLdtN (update it in place; it
  declares the `db` and `user` capabilities for the preview league).
- Anything new that sends data off the device (a new service, analytics event or league field)
  must be added to `src/privacy.md` in the same change.
- League server changes go in a new file in `supabase/migrations/` and are applied to
  Supabase project `pfjixomcpkcrpbvdjekh`.
