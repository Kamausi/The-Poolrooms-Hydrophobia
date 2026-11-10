// Runs the test set against a dev server it starts (or UNDERFLOW_URL if set).
//   node tests/run.mjs            maps, smoke, chapter, memory, resume
//   node tests/run.mjs balance    one named test
//   node tests/run.mjs all        everything, including the slow balance run
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(dir);
const QUICK = ['maps.mjs', 'smoke.cjs', 'chapter.cjs', 'memory.cjs', 'resume.cjs', 'audio.cjs', 'hud.cjs', 'omens.cjs', 'doors.cjs', 'hunt.cjs', 'dread.cjs', 'level.cjs', 'uncanny.cjs', 'score.cjs', 'feel.cjs', 'finds.cjs'];
const arg = process.argv[2];
const list = !arg ? QUICK : arg === 'all' ? [...QUICK, 'balance.cjs'] : [QUICK.concat('balance.cjs').find((f) => f.startsWith(arg)) || arg];

let server = null;
const port = 5199;
if (!process.env.UNDERFLOW_URL) {
  server = spawn('npx', ['vite', '--port', String(port), '--strictPort'], { cwd: root, stdio: 'ignore' });
  process.env.UNDERFLOW_URL = `http://localhost:${port}`;
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(process.env.UNDERFLOW_URL)).ok) break; } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
}
let failed = 0;
for (const f of list) {
  console.log(`\n# ${f}`);
  const r = spawnSync('node', [path.join(dir, f)], { stdio: 'inherit', env: process.env, timeout: 15 * 60 * 1000 });
  if (r.status !== 0) failed++;
}
server?.kill();
console.log(failed ? `\n${failed} test file(s) failed` : '\nall passed');
process.exit(failed ? 1 : 0);
