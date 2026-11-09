// Eight-sector smoke: each attraction rides to its dock, moors, restores, boards and leaves without errors.
const { open, newCampaign, check, finish } = require('./lib.cjs');
(async () => {
  const { browser, page, errors } = await open({ width: 800, height: 450 });
  await newCampaign(page);
  // HUD: entering play hides the menu; the control list shows, then fades so the frame stays clear.
  const hud = await page.evaluate(() => { const u = window.__underflow; u.beginSector(0); u.startRide(); u.setState({ health: 1e6 });
    u.step(2); const shown = document.getElementById('hint').classList.contains('show');
    for (let k = 0; k < 9; k++) u.step(60);
    return { menuHidden: document.getElementById('menu').hidden, shown, faded: !document.getElementById('hint').classList.contains('show') }; });
  check('in play: menu hidden, controls shown then faded', hud.menuHidden && hud.shown && hud.faded, JSON.stringify(hud));
  for (let i = 0; i < 8; i++) {
    const r = await page.evaluate((i) => {
      const u = window.__underflow; u.beginSector(i); u.startRide(); u.setState({ health: 1e6, autopilot: true });
      let k = 0;
      for (; k < 500; k++) { u.setState({ drift: 0, sitting: false, health: 1e6 }); u.step(30); if (u.mode !== 'ride') break; const R = window.__ride; if (R && R.track.roomAt(R.s)?.sec.dock) break; }
      const reached = u.mode === 'ride' && !!window.__ride.track.roomAt(window.__ride.s)?.sec.dock;
      u.events.moor({ s: window.__ride?.s || 0, departed: [] }); u.step(20); const explore = u.mode;
      window.__explore.restorePower(); u.step(10); u.events.board(); u.step(30);
      return { reached, explore, mode: u.mode };
    }, i);
    check(`sector ${i} reaches its dock, explores and boards`, r.reached && r.explore === 'explore' && r.mode === 'ride', JSON.stringify(r));
  }
  await finish(browser, errors);
})();
