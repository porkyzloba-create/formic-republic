// Builds the single-file game: dist/formic-republic.html
//
// The game ships as ONE self-contained HTML file (the claude.ai preview, the Expo WebView
// shell and the Steam/Electron shell all load the same file). Source lives in src/ as
// ordered pieces; this script stitches them back together. Files are concatenated in
// name order, so the numeric prefixes are the load order. The scripts share one global
// scope (no modules), exactly as in the single file.
//
//   node build.mjs           build dist/formic-republic.html
//   node build.mjs --check   build to memory and fail if dist/ is out of date (used by CI)
//
// The privacy policy is written once, in src/privacy.md. The build turns it into HTML,
// embeds it in the game (PRIVACY_POLICY, shown in-game) and writes docs/privacy.html,
// a standalone page to host (GitHub Pages) and link from the store listings.
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const src = p => join(root, 'src', p);
const read = p => readFileSync(p, 'utf8');
const dir = d => readdirSync(src(d)).filter(f => !f.startsWith('.')).sort().map(f => read(join(src(d), f)));

// A tiny Markdown subset: # headings, paragraphs, "- " lists, **bold**, bare https links.
const escHTML = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = t => escHTML(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
  .replace(/https:\/\/[^\s<]+[^\s<.,;:)]/g, u => `<a href="${u}" target="_blank" rel="noopener">${u}</a>`);
export function markdown(md){
  const out = []; let para = [], list = null;
  const flush = () => { if (para.length){ out.push(`<p>${inline(para.join(' '))}</p>`); para = []; } if (list){ out.push(`<ul>${list.map(i => `<li>${inline(i)}</li>`).join('')}</ul>`); list = null; } };
  for (const line of md.split(/\r?\n/)){
    const h = /^(#{1,3}) (.*)/.exec(line);
    if (h){ flush(); out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); }
    else if (line.startsWith('- ')){ if (para.length) flush(); (list = list || []).push(line.slice(2)); }
    else if (!line.trim()) flush();
    else if (list) list[list.length - 1] += ' ' + line.trim();
    else para.push(line.trim());
  }
  flush(); return out.join('\n');
}
export function privacyHTML(){ return markdown(read(src('privacy.md'))); }

export function build(){
  const policy = JSON.stringify(privacyHTML()).replace(/<\//g, '<\\/');
  return read(src('head.html'))
    + '<style>\n' + dir('styles').join('') + '</style>\n'
    + read(src('markup.html'))
    + '<script>\n' + `const PRIVACY_POLICY = ${policy};\n` + dir('js').join('')
    + read(src('tail.html'));
}

export function privacyPage(){
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Formic Republic Privacy Policy</title>
<style>
:root{--bg:#F7F0E3;--paper:#FFFBF3;--ink:#1D1A2B;--soft:#5E5872;--red:#E5392D;color-scheme:light dark}
@media (prefers-color-scheme:dark){:root{--bg:#15131D;--paper:#1F1C2A;--ink:#F3EEE4;--soft:#B5AFC4;--red:#FF6B5E}}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:720px;margin:0 auto;padding:32px 16px 64px}
article{background:var(--paper);border:3px solid var(--ink);border-radius:20px;padding:8px 24px 24px}
h1{font-size:1.7rem;line-height:1.2;margin:24px 0 4px}h2{font-size:1.15rem;margin:28px 0 6px;color:var(--red)}
p,li{color:var(--ink)}ul{padding-left:1.2em}a{color:var(--red);overflow-wrap:anywhere}
h1+p{color:var(--soft);margin-top:0}
</style></head><body><main><article>
${privacyHTML()}
</article></main></body></html>
`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)){
  const outputs = [[join(root, 'dist', 'formic-republic.html'), build()], [join(root, 'docs', 'privacy.html'), privacyPage()]];
  if (process.argv.includes('--check')){
    for (const [out, html] of outputs) if (!existsSync(out) || read(out) !== html){ console.error(`${out} is out of date: run \`npm run build\` and commit it.`); process.exit(1); }
    console.log('dist and docs are up to date');
  } else {
    for (const [out, html] of outputs){
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, html);
      console.log(`built ${out} (${(html.length / 1024).toFixed(1)} KB)`);
    }
  }
  if (read(src('privacy.md')).includes('[CONTACT EMAIL]')) console.warn('note: src/privacy.md still has the [CONTACT EMAIL] placeholder; fill it in before release.');
}
