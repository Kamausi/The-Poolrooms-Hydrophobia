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
  r = await page.evaluate(() => { const u = window.__underflow; u.beginSector(1); u.startRide(); u.setState({ health: 1e6 }); u.step(5);
    u.hold('b', true); for (let i = 0; i < 4; i++) u.step(5);
    const open = !document.getElementById('callouts').hidden, labels = [...document.querySelectorAll('#callouts span')].map((x) => x.textContent);
    u.hold('b', false); u.step(3);
    return { open, labels, closed: document.getElementById('callouts').hidden }; });
  check('holding Ping opens six callouts; releasing sends one', r.open && r.labels.length === 6 && r.closed, JSON.stringify(r));
  r = await page.evaluate(() => { const u = window.__underflow; u.beginSector(1); u.enterSafeRoom(); u.step(2);
    const heads = [...document.querySelectorAll('.sheet-head')].map((h) => h.textContent);
    const deal = document.querySelector('.choice .deal')?.textContent || '';
    const arrival = /ARRIVAL CONFIRMED/.test(document.querySelector('.terminal')?.textContent || '');
    return { heads, deal, arrival }; });
  check('the Safe Room is a three-part maintenance sheet', r.heads.length === 3 && /SUPPLIES/.test(r.heads[0]) && /RAFT/.test(r.heads[1]) && /ROUTE/.test(r.heads[2]), JSON.stringify(r.heads));
  check('supplies read as transactions', /Carrying: \d+( → \d+ · Cost: \d+ part| · full)/.test(r.deal), r.deal);
  check('the route terminal confirms arrival before departure', r.arrival);
  r = await page.evaluate(() => { const u = window.__underflow; document.querySelector('#modal-actions button').click(); u.step(5); document.getElementById('pause').click();
    const tabs = [...document.querySelectorAll('#pause-extra .journal .tab')].map((t) => t.textContent); return { tabs }; });
  const groups = await page.evaluate(() => { document.querySelector('#pause-extra .tab[data-v="settings"]').click(); return [...document.querySelectorAll('#pause-extra .settings-group .sheet-head')].map((h) => h.textContent); });
  check('settings come in six categories with a preview', groups.join('|') === 'CONTROLS|INTERFACE|AUDIO|CAMERA AND EFFECTS|GAMEPLAY ASSISTANCE|DISPLAY' && await page.evaluate(() => !!document.querySelector('.settings-preview')), groups.join('|'));
  check('the pause journal has crew observations, facility records and a route map', r.tabs.join('|') === 'CREW OBSERVATIONS|FACILITY RECORDS|ROUTE MAP', r.tabs.join('|'));
  await finish(browser, errors);
})();
