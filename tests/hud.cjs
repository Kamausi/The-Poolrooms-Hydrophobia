// The HUD: a grabbed teammate becomes impossible to miss (roster entry, urgent banner, edge marker) and the
// optional PA yields; prompts name the player's current binding; the reticle shows brackets and hold arcs.
const { open, newCampaign, check, finish } = require('./lib.cjs');
(async () => {
  const { browser, page, errors } = await open({ width: 1280, height: 720 });
  await newCampaign(page);
  let r = await page.evaluate(() => { const u = window.__underflow; u.beginSector(1); u.startRide(); u.setState({ health: 1e6, autopilot: true });
    for (let k = 0; k < 20; k++) u.step(10);
    window.__ride.spawnEnc('crewGrab'); for (let k = 0; k < 4; k++) u.step(10);
    const q = (s) => document.querySelector(s);
    return { urgent: !q('#urgent').hidden && q('#urgent').textContent, mark: !q('#helpmark').hidden && q('#helpmark').textContent,
      entry: !!q('.mate.s-grabbed'), prompt: q('#prompt').textContent };
  });
  check('a grabbed teammate: roster entry, banner and edge marker', r.entry && /GRABBED/.test(r.urgent) && !!r.mark, JSON.stringify(r));
  check('the rescue prompt names the current binding', /\[E\]/.test(r.prompt), r.prompt);
  r = await page.evaluate(() => { const u = window.__underflow; window.__ride.reset(); u.setState({ crewState: { dez: 'ok', tubs: 'ok', june: 'ok' } }); u.step(5);
    return { banner: !document.getElementById('urgent').hidden }; });
  check('the banner clears when the teammate is safe', !r.banner);
  r = await page.evaluate(() => { const u = window.__underflow; u.startExplore(); u.setState({ health: 1e6 }); u.step(5); const E = window.__explore;
    E.player.pos = [E.cellPos[0], 0, E.cellPos[2]]; u.step(3);
    return { interact: document.getElementById('crosshair').classList.contains('interact'), prompt: document.getElementById('prompt').textContent }; });
  check('on foot, the reticle opens into brackets at something usable', r.interact, JSON.stringify(r));
  await finish(browser, errors);
})();
