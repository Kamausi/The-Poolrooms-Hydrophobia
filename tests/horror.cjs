// The reactive horror layer on foot: the omens read what you have been doing (ai/habits.js), an authored silence stops
// the machinery and brings nothing with it, sounds through a wall come out muffled, and ?debug=ai says what every
// entity believes.
const { open, newCampaign, check, finish, BASE } = require('./lib.cjs');
(async () => {
  const { browser, page, errors } = await open({ width: 800, height: 450 });
  await page.goto(`${BASE}/?quality=low&debug=ai`);
  await page.waitForFunction(() => !!window.__underflow, null, { timeout: 120000 });
  await page.click('#start-exp'); await page.click('#start'); // a real click starts the audio context
  await page.waitForTimeout(600);
  await page.evaluate(() => { document.querySelector('#modal-body .choice')?.click(); document.querySelector('#modal-actions button')?.click(); });
  await page.waitForTimeout(300);
  const r = await page.evaluate(async () => { const u = window.__underflow, sound = u.sound; // the game's own instance (an import here can get a separate copy after a dev-server reload)
    u.beginSector(2); u.startRide(); u.startExplore(); u.setState({ health: 1e6 }); u.step(2);
    const E = window.__explore;
    // Scanning for a while is noticed.
    const scan0 = E.habits.h.scanning;
    for (let k = 0; k < 90; k++) { u.hold('q', true); u.step(1); }
    u.hold('q', false);
    const scanned = E.habits.h.scanning;
    // Silence: the machinery stops, nothing spawns, it ends by itself.
    const active0 = E.blooms.filter((b) => b.active).length;
    E.startFomen('silence'); u.step(3);
    const silent = sound.silent, during = E.fomen?.kind;
    for (let k = 0; k < 19; k++) u.step(30);
    const spawnedDuring = E.blooms.filter((b) => b.active).length - active0, stillSilent = sound.silent;
    for (let k = 0; k < 11; k++) u.step(30);
    const after = { fomen: E.fomen?.kind || null, spawnedDuring, stillSilent, silentAfter: sound.silent };
    // Occlusion: a whistle from behind a wall is filtered; one in plain sight is not.
    const st0 = sound.spatialStats.occludedMade;
    sound.occluded(1, () => sound.whistle(0.4));
    const occluded = sound.spatialStats.occludedMade - st0;
    sound.occluded(0, () => sound.whistle(0.4));
    const clear = sound.spatialStats.occludedMade - st0 - occluded;
    u.step(10);
    const view = document.getElementById('ai-debug')?.textContent || '';
    return { scan0: +scan0.toFixed(2), scanned: +scanned.toFixed(2), silent, during, after, occluded, clear, view: view.split('\n').slice(0, 3) }; });
  check('scanning on foot is noticed by the omens', r.scanned > r.scan0 + 0.3, JSON.stringify({ scan0: r.scan0, scanned: r.scanned }));
  check('an authored silence stops the machinery, brings nothing with it, and ends by itself', r.silent && r.during === 'silence' && r.after.stillSilent && r.after.fomen !== 'silence' && !r.after.silentAfter && r.after.spawnedDuring <= 0, JSON.stringify({ silent: r.silent, during: r.during, ...r.after }));
  check('a sound from behind a wall comes out muffled; one in plain sight does not', r.occluded > 0 && r.clear === 0, JSON.stringify({ occluded: r.occluded, clear: r.clear }));
  check('?debug=ai shows what the director, the player habits and each entity are doing', /DIRECTOR/.test(r.view[0] || '') && /PLAYER/.test(r.view[1] || ''), JSON.stringify(r.view));
  await finish(browser, errors);
})();
