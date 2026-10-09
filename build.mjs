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
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const src = p => join(root, 'src', p);
const read = p => readFileSync(p, 'utf8');
const dir = d => readdirSync(src(d)).filter(f => !f.startsWith('.')).sort().map(f => read(join(src(d), f)));

export function build(){
  return read(src('head.html'))
    + '<style>\n' + dir('styles').join('') + '</style>\n'
    + read(src('markup.html'))
    + '<script>\n' + dir('js').join('')
    + read(src('tail.html'));
}

if (process.argv[1] === fileURLToPath(import.meta.url)){
  const html = build(), out = join(root, 'dist', 'formic-republic.html');
  if (process.argv.includes('--check')){
    if (!existsSync(out) || read(out) !== html){ console.error('dist/formic-republic.html is out of date: run `npm run build` and commit it.'); process.exit(1); }
    console.log('dist is up to date');
  } else {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, html);
    console.log(`built ${out} (${(html.length / 1024).toFixed(1)} KB)`);
  }
}
