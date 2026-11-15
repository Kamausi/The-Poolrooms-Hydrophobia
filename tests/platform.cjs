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
  await page.evaluate(() => window.__underflow.toMenu());
  await page.waitForTimeout(500);
  const back = await page.evaluate(() => ({ ...window.__wake, wake: window.__underflow.platform().wake }));
  check('the screen is kept awake while a run is played, asked for once, and let go on the menu',
    menu.wake === 'off' && riding.wake === 'on' && riding.requests === menu.requests + 1 && back.wake === 'off' && back.releases === riding.releases + 1, JSON.stringify({ menu, riding, back }));
  const saved = await page.evaluate(async () => { const u = window.__underflow; u.setState({ endless: false }); u.saveCheckpoint(); await new Promise((r) => setTimeout(r, 300)); return u.platform().persist; });
  check('after a save the game asks once for persistent storage', ['granted', 'denied', 'unsupported'].includes(saved), saved);
  const lock = await page.evaluate(async () => { window.__underflow.requestLock(); await new Promise((r) => setTimeout(r, 100)); return { args: window.__lockArgs, raw: window.__underflow.platform().rawMouse }; });
  check('the pointer lock asks for raw, unaccelerated mouse movement', lock.args.some((a) => a && a.unadjustedMovement === true) && lock.raw === 'on', JSON.stringify(lock));
  await finish(browser, errors);
})();
