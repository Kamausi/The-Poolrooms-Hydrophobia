// Browser services: raw mouse input for the pointer lock, a screen wake lock while a run is played, and persistent
// storage asked once after the first save. Headless Chromium refuses a real wake lock and pointer lock, so the page
// gets stand-ins that record what the game asks for; the refusal path is checked against the real browser after.
const { open, newCampaign, check, finish } = require('./lib.cjs');
(async () => {
  const { browser, page, errors } = await open({ width: 800, height: 450 });
  await page.addInitScript(() => {
    window.__wake = { requests: 0, releases: 0 };
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request: () => { window.__wake.requests++;
      const s = new EventTarget(); s.release = () => { window.__wake.releases++; s.dispatchEvent(new Event('release')); return Promise.resolve(); }; return Promise.resolve(s); } } });
    window.__lockArgs = [];
    Element.prototype.requestPointerLock = function (o) { window.__lockArgs.push(o || null); return Promise.resolve(); };
  });
  await page.reload();
  await page.waitForFunction(() => !!window.__underflow, null, { timeout: 120000 });
  await page.waitForTimeout(800);
  await newCampaign(page);
  await page.evaluate(() => window.__underflow.toMenu());
  await page.waitForTimeout(500);
  const menu = await page.evaluate(() => ({ ...window.__wake, wake: window.__underflow.platform().wake }));
  await page.evaluate(() => { const u = window.__underflow; u.beginSector(0); u.startRide(); });
  await page.waitForTimeout(800);
  const riding = await page.evaluate(() => ({ ...window.__wake, wake: window.__underflow.platform().wake }));
  const prof = await page.evaluate(() => ({ sections: window.__underflow.profile(), steps: window.__underflow.stepsLast }));
  check('the frame loop attributes its time to subsystems (scene update, render, audio) and steps the simulation in bounded steps', ['scene', 'render'].every((n) => prof.sections.some((x) => x.name === n && x.avg > 0)) && prof.steps >= 1 && prof.steps <= 3, JSON.stringify(prof));
  await page.evaluate(() => window.__underflow.toMenu());
  await page.waitForTimeout(500);
  const back = await page.evaluate(() => ({ ...window.__wake, wake: window.__underflow.platform().wake }));
  check('the screen is kept awake while a run is played, asked for once, and let go on the menu',
    menu.wake === 'off' && riding.wake === 'on' && riding.requests === menu.requests + 1 && back.wake === 'off' && back.releases === riding.releases + 1, JSON.stringify({ menu, riding, back }));
  const saved = await page.evaluate(async () => { const u = window.__underflow; u.setState({ endless: false }); u.saveCheckpoint();
    // The browser answers in its own time; wait for the answer (up to 5 s) rather than a fixed 300 ms.
    for (let i = 0; i < 50 && u.platform().persist === 'asking'; i++) await new Promise((r) => setTimeout(r, 100));
    return u.platform().persist; });
  check('after a save the game asks once for persistent storage', ['granted', 'denied', 'unsupported'].includes(saved), saved);
  const lock = await page.evaluate(async () => { window.__underflow.requestLock(); await new Promise((r) => setTimeout(r, 100)); return { args: window.__lockArgs, raw: window.__underflow.platform().rawMouse }; });
  check('the pointer lock asks for raw, unaccelerated mouse movement', lock.args.some((a) => a && a.unadjustedMovement === true) && lock.raw === 'on', JSON.stringify(lock));
  const tone = await page.evaluate(() => { const u = window.__underflow; u.settings.agx = true; u.beginSector(0); u.startRide(); u.step(2);
    const on = window.__ride.renderer.viewTransform; u.settings.agx = false; u.startRide(); u.step(2);
    return { on, off: window.__ride.renderer.viewTransform }; });
  check('the AgX tone-curve setting gives the next scene the engine\'s AgX view transform; off, ACES as graded', tone.on === 'agx' && tone.off === 'aces', JSON.stringify(tone));
  const store = await page.evaluate(async () => { const S = await window.__underflow.storage();
    localStorage.setItem('underflow-save-v2', JSON.stringify({ marker: 4242 }));
    const text = JSON.stringify(S.packSave((k) => localStorage.getItem(k))), z = await S.gzip(text);
    localStorage.setItem('underflow-save-v2', JSON.stringify({ marker: 0 }));
    const keys = await S.importSave(z);
    const restored = JSON.parse(localStorage.getItem('underflow-save-v2')).marker;
    for (let i = 0; i < 10; i++) await S.savePhoto({ sector: 's' + i, label: 'test', url: 'data:image/jpeg;base64,AA==' });
    const album = await S.loadPhotos();
    return { keys: keys.length, restored, ratio: +(z.length / text.length).toFixed(2), album: album.length, newest: album.at(-1)?.sector }; });
  check('a save file exports compressed and imports back; ride photos are kept across sessions in IndexedDB, the last eight', store.restored === 4242 && store.keys >= 1 && store.ratio < 1 && store.album === 8 && store.newest === 's9', JSON.stringify(store));
  const sv = await page.evaluate(() => { const u = window.__underflow;
    u.setState({ endless: false, sectorIndex: 1 }); u.saveCheckpoint();
    u.setState({ sectorIndex: 2 }); u.saveCheckpoint();
    const env = JSON.parse(localStorage.getItem(u.SAVE_KEY));
    localStorage.setItem(u.SAVE_KEY, localStorage.getItem(u.SAVE_KEY).slice(0, 60)); // a cut-off write
    const back = u.loadSave(u.SAVE_KEY);
    return { schema: env.schema, build: env.build, hasSum: !!env.sum, restored: back?.sectorIndex, notice: u.saveNotice }; });
  check('saves are versioned and checksummed; a damaged save falls back to the one before it, and the player is told', sv.schema === 3 && sv.hasSum && typeof sv.build === 'string' && sv.restored === 1 && /damaged/.test(sv.notice), JSON.stringify(sv));
  await finish(browser, errors);
})();
