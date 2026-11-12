// ?show=: every showcase sets up, pauses with its label and draws without errors. Screenshots go to
// SHOW_DIR (default: the OS temp folder) for review; this test checks only that each one comes up clean.
const { chromium } = require('playwright');
const os = require('os'); const path = require('path'); const fs = require('fs');
const { check, finish } = require('./lib.cjs');
const BASE = process.env.UNDERFLOW_URL || 'http://localhost:5173';
const NAMES = ['menu', 'water', 'architecture', 'entities', 'drift', 'hurt', 'overboard', 'omen', 'dock', 'emergency', 'blackout', 'lamp', 'signs', 'survey', 'saferoom'];
(async () => {
  const dir = process.env.SHOW_DIR || path.join(os.tmpdir(), 'underflow-shows'); fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGE ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text().slice(0, 200)); });
  const ok = [];
  for (const name of NAMES) {
    await page.goto(`${BASE}/?quality=high&show=${name}`, { timeout: 120000 });
    try { await page.waitForFunction(() => window.__show?.ready, null, { timeout: 120000 }); } catch { ok.push(`${name}: never ready`); continue; }
    const r = await page.evaluate(() => ({ ...window.__show, label: document.getElementById('showcase')?.textContent || '' }));
    const t0 = Date.now();
    try { await page.screenshot({ path: path.join(dir, `${name}.png`), timeout: 120000 }); } catch (e) { ok.push(`${name}: screenshot ${String(e.message).split('\n')[0]}`); continue; }
    if (Date.now() - t0 > 20000) console.log(`  slow screenshot: ${name} ${Date.now() - t0} ms`);
    if (r.name !== name || !/SHOWCASE/.test(r.label)) ok.push(`${name}: ${JSON.stringify(r)}`);
  }
  check(`every showcase (${NAMES.length}) sets up on the high tier, labels itself and draws without errors; screenshots in ${dir}`, ok.length === 0, ok.join(' | '));
  await finish(browser, errors);
})();
