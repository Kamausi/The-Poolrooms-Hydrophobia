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
  r = await page.evaluate(() => { const u = window.__underflow, E = window.__explore; u.setState({ health: 1e6, drift: 0 }); u.step(2);
    const high = E.chain.map((p) => p.name), grade = E.chain.find((p) => p.name === 'grade').uniforms;
    u.setState({ health: 20, drift: 90, hurtFx: 1 }); u.step(1); const g2 = E.chain.find((p) => p.name === 'grade').uniforms, o2 = E.chain.find((p) => p.name === 'optics').uniforms;
    u.setState({ health: 1e6, drift: 0, hurtFx: 0 });
    u.setTier('medium'); u.step(2); const medium = E.chain.map((p) => p.name), diagM = JSON.stringify(E.renderer.diagnostics);
    u.settings.postChain = false; u.step(2); const off = E.chain.length; u.settings.postChain = true;
    u.setTier('high'); u.step(2);
    return { high, medium, off, calm: [grade.drift, grade.lowHealth, grade.hurt], rough: [g2.drift, g2.lowHealth > 0, g2.hurt > 0.5], fringe: o2.aberration, diagM, diag: JSON.stringify(E.renderer.diagnostics) }; });
  check('the post chain runs four passes on high and two on medium, follows Drift, health and damage, and switches off', r.high.join() === 'optics,grade,fxaa,finish' && r.medium.join() === 'grade,finish' && r.off === 0 && r.calm[0] < 0.05 && r.calm[1] === 0 && r.calm[2] === 0 && r.rough[0] > 0.8 && r.rough[1] && r.rough[2] && r.fringe > 0.04 && r.diag === '[]' && r.diagM === '[]', JSON.stringify(r));

  r = await page.evaluate(() => { const u = window.__underflow; u.beginSector(0); u.startRide(); u.setState({ health: 1e6 }); u.step(3); const R = window.__ride;
    const dry = R.chain.find((p) => p.name === 'optics').uniforms.wet; R.overboard(); u.step(2); const wet = R.chain.find((p) => p.name === 'optics').uniforms.wet, under = R.chain.find((p) => p.name === 'grade').uniforms.under, damp = R.chain.find((p) => p.name === 'grade').uniforms.damp;
    R.reset(); u.step(1); return { dry, wet, under, damp, diag: JSON.stringify(R.renderer.diagnostics) }; });
  check('going overboard wets the lens and tints the picture; the walls above the water are drawn damp', r.dry < 0.7 && r.wet === 1 && r.under > 0 && r.damp === 1 && r.diag === '[]', JSON.stringify(r));

  r = await page.evaluate(() => { const u = window.__underflow; u.beginSector(0); u.startRide(); u.setState({ health: 1e6 }); u.step(2); const R = window.__ride;
    R.s = 358; for (const b of R.blooms) b.active = false; u.step(2); const on = R.chain.find((p) => p.name === 'optics').uniforms;
    u.settings.shafts = false; u.step(1); const off = R.chain.find((p) => p.name === 'optics').uniforms.shafts; u.settings.shafts = true;
    return { on: on.shafts, pos: on.shaftPos, off, diag: JSON.stringify(R.renderer.diagnostics) }; });
  check('the fixtures cast light shafts on the high tier, from where the lamp is on screen, and the setting turns them off', r.on > 0.1 && r.pos[1] > 0.5 && r.off === 0 && r.diag === '[]', JSON.stringify(r));

  r = await page.evaluate(() => { const u = window.__underflow; u.startExplore(); u.setState({ health: 1e6, drift: 0 }); u.step(3); const E = window.__explore; E.blooms.forEach((b) => { b.active = false; });
    u.setState({ lamp: { ...(u.state.lamp || {}), mode: 0, charge: 100 } }); u.step(2);
    const env0 = E.frameEnv(); const pointsCast = env0.pointLights.filter((l) => l.castShadow).length, spots0 = (env0.spotLights || []).length;
    u.setState({ lamp: { ...u.state.lamp, mode: 1, charge: 100 } }); u.step(2); const env1 = E.frameEnv();
    const spot = (env1.spotLights || [])[0];
    u.setTier('ultra'); u.step(2); const ultraCast = E.frameEnv().pointLights.filter((l) => l.castShadow).length; u.setTier('high');
    u.settings.shadows = false; u.step(2); const offCast = E.frameEnv().pointLights.filter((l) => l.castShadow).length + (E.frameEnv().spotLights || []).length; u.settings.shadows = true;
    u.setState({ lamp: { ...u.state.lamp, mode: 0 } }); u.step(1);
    return { pointsCast, spots0, spot: spot && { cast: spot.castShadow, angle: spot.angle }, ultraCast, offCast, diag: JSON.stringify(E.renderer.diagnostics) }; });
  check('on the high tier the nearest fixture casts shadows (two on ultra) and the carried lamp is a shadowed spot light; the setting turns them off', r.pointsCast === 1 && r.spots0 === 0 && r.spot && r.spot.cast && r.ultraCast === 2 && r.offCast === 0 && r.diag === '[]', JSON.stringify(r));

  r = await page.evaluate(async () => { const m = await import('/src/surfaces.js'); const loaded = m.surfacesLoaded();
    const c = m.surface('ceiling').image.getContext('2d').getImageData(0, 0, 256, 256).data; let varied = 0; for (let i = 0; i < c.length; i += 4 * 97) if (Math.abs(c[i] - 0xcf) > 12) varied += 1;
    return { loaded, varied }; });
  check('the generated surface textures (ceiling, clouds, painted steel, aqua tile, raft PVC, wet concrete) decode and are drawn, not left as their fallback colour', ['ceiling', 'clouds', 'metal', 'aqua', 'pvc', 'concrete'].every((k) => r.loaded[k]) && r.varied > 10, JSON.stringify(r));

  await page.goto(`${BASE}/?quality=high&bench=8`, { timeout: 120000 });
  await page.waitForFunction(() => !!window.__bench, null, { timeout: 120000 });
  r = await page.evaluate(() => ({ b: window.__bench, text: document.getElementById('bench')?.textContent || '' }));
  check('?bench rides for a fixed time and reports the GPU, the tier and frame-time numbers', r.b.tier === 'high' && r.b.frames >= 2 && r.b.median > 0 && r.b.p99 >= r.b.median && /GPU/.test(r.text) && /99th/.test(r.text) && /errors       none/.test(r.text), JSON.stringify(r.b));
  await finish(browser, errors);
})();
