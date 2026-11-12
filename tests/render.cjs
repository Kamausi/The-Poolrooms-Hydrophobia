// The full render tier (?quality=high): depth target, ambient occlusion, haze over the water and eye adaptation.
// The other browser tests run the light tier, which has none of these, so this file is the only one that draws them.
const { chromium } = require('playwright');
const { check, finish } = require('./lib.cjs');
const BASE = process.env.UNDERFLOW_URL || 'http://localhost:5173';
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGE ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text().slice(0, 200)); });
  const ready = async () => { await page.waitForFunction(() => !!window.__underflow, null, { timeout: 120000 }); await page.waitForTimeout(800); };
  await page.goto(`${BASE}/?quality=high`); await ready();
  await page.evaluate(() => localStorage.clear()); await page.reload(); await ready();
  await page.evaluate(() => window.__underflow.newCampaign()); await page.waitForTimeout(150);
  await page.evaluate(() => document.querySelector('#modal-body .choice').click()); await page.waitForTimeout(150);
  await page.evaluate(() => document.querySelector('#modal-actions button').click()); await page.waitForTimeout(300);

  let r = await page.evaluate(() => { const u = window.__underflow; u.beginSector(0); u.startRide(); u.setState({ health: 1e6 }); u.step(4); const R = window.__ride;
    return { depth: R.renderer.depth, diag: JSON.stringify(R.renderer.diagnostics), exp: R.eyeExposure, ao: u.settings.ambientOcclusion, haze: u.settings.haze }; });
  check('the full tier draws the raft with a depth target, ambient occlusion and haze, and the renderer reports no problem', r.depth === true && r.diag === '[]' && r.ao !== false && r.haze !== false && r.exp > 0.8 && r.exp < 1.5, JSON.stringify(r));

  r = await page.evaluate(() => { const u = window.__underflow; u.startExplore(); u.setState({ health: 1e6, drift: 0 }); u.step(4); const E = window.__explore; E.blooms.forEach((b) => { b.active = false; });
    const lit = E.lamps.filter((l) => l.on).sort((a, b) => 0)[0]; if (lit) E.player.pos = [lit.pos[0], 0, lit.pos[2]];
    for (let k = 0; k < 40; k++) { u.setState({ health: 1e6, drift: 0 }); u.step(3); } const bright = E.eyeExposure;
    E.setBlackout(true); u.step(2); const justDark = E.eyeExposure;
    for (let k = 0; k < 60; k++) { u.setState({ health: 1e6, drift: 0 }); u.step(3); } const dark = E.eyeExposure;
    E.setBlackout(false); for (let k = 0; k < 10; k++) { u.setState({ health: 1e6, drift: 0 }); u.step(3); } const back = E.eyeExposure;
    u.settings.autoExposure = false; u.step(2); const off = E.eyeExposure; u.settings.autoExposure = true;
    return { bright, justDark, dark, back, off, diag: JSON.stringify(E.renderer.diagnostics), depth: E.renderer.depth }; });
  check('on foot the eye adapts: the dark lifts slowly, the picture comes back down when the light returns, and the setting turns it off', r.depth && r.diag === '[]' && r.dark > r.bright + 0.1 && r.justDark < r.dark - 0.05 && r.back < r.dark - 0.1 && r.off === 1, JSON.stringify(r));

  r = await page.evaluate(() => { const u = window.__underflow; u.settings.ambientOcclusion = false; u.settings.haze = false; u.setState({ health: 1e6, drift: 0 }); u.step(3);
    const d = JSON.stringify(window.__explore.renderer.diagnostics); u.settings.ambientOcclusion = true; u.settings.haze = true; u.step(2); return { d }; });
  check('ambient occlusion and haze can be switched off and on again without a renderer problem', r.d === '[]', JSON.stringify(r));
  await finish(browser, errors);
})();
