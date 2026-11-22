// Builds dist/ and inlines its one script and one stylesheet into a single playable file: dist/HYDROPHOBIA.html.
// Fonts still load from Google Fonts; everything else, recorded sound included, is in the file.
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, rmSync } from 'node:fs';

rmSync('dist', { recursive: true, force: true });
execSync('npx vite build --logLevel error', { stdio: 'inherit' });
const assets = readdirSync('dist/assets');
// The entry is the script index.html loads, not whichever .js sorts first.
const entry = readFileSync('dist/index.html', 'utf8').match(/<script type="module" crossorigin src="\/assets\/([^"]+)"/)[1];
if (assets.filter((f) => f.endsWith('.js')).length !== 1) throw new Error(`expected one script in dist/assets, found ${assets.filter((f) => f.endsWith('.js')).join(', ')}`);
const js = readFileSync(`dist/assets/${entry}`, 'utf8').replaceAll('</script', '<\\/script');
const css = readFileSync(`dist/assets/${assets.find((f) => f.endsWith('.css'))}`, 'utf8');
let html = readFileSync('dist/index.html', 'utf8');
html = html.replace(/<script type="module" crossorigin src="[^"]+"><\/script>/, () => `<script type="module">\n${js}\n</script>`);
html = html.replace(/<link rel="stylesheet" crossorigin href="\/assets\/[^"]+">/, () => `<style>\n${css}\n</style>`);
// Recorded sounds travel inside the file as data URIs, so the single file needs nothing beside it.
const manifest = JSON.parse(readFileSync('public/audio/manifest.json', 'utf8'));
const files = {};
for (const list of Object.values(manifest)) for (const f of list) files[f] = `data:audio/mpeg;base64,${readFileSync(`public/audio/${f}.mp3`).toString('base64')}`;
html = html.replace('<script type="module">', () => `<script>window.__UNDERFLOW_AUDIO = ${JSON.stringify({ manifest, files })};</script>\n<script type="module">`);
if (html.includes('/assets/')) throw new Error('an asset reference was not inlined');
// The single file carries no source maps (they stay with dist/ for debugging); drop the references to them.
html = html.replace(/\/\/# sourceMappingURL=[^\s"'<]*/g, '');
writeFileSync('dist/HYDROPHOBIA.html', html);
console.log(`dist/HYDROPHOBIA.html · ${(html.length / 1024).toFixed(0)} KB`);
