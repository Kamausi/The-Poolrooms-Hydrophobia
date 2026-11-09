// Resume: on foot, nothing is handed out twice; on the raft, nothing behind the resume point fires.
const { open, newCampaign, check, finish } = require('./lib.cjs');
(async () => {
  const { browser, page, errors } = await open({ width: 800, height: 450 });
  await newCampaign(page);
  let r = await page.evaluate(() => { const u = window.__underflow; u.beginSector(0); u.startRide(); u.startExplore(); u.setState({ health: 1e6 }); u.step(3); const E = window.__explore;
    const sc = E.find('s')[0]; E.player.pos = E.center(...sc); u.step(4); E.player.pos = [E.cellPos[0], 0, E.cellPos[2]]; u.step(1); u.press('e'); u.step(2);
    document.getElementById('quit').click(); return {}; });
  await page.waitForTimeout(300); await page.click('#continue'); await page.waitForTimeout(500);
  r = await page.evaluate(() => { const u = window.__underflow, E = window.__explore; const sc = E.find('s')[0]; const before = u.state.scrap; E.player.pos = E.center(...sc); u.step(4); return { mode: u.mode, before, after: u.state.scrap }; });
  check('on foot: a taken part is not given again', r.mode === 'explore' && r.before === r.after, JSON.stringify(r));
  await page.evaluate(() => { const u = window.__underflow; u.beginSector(1); u.startRide(); u.setState({ health: 1e6, autopilot: true }); const R = window.__ride; for (let k = 0; k < 200; k++) { u.setState({ drift: 0, sitting: false }); u.step(15); const sec = R.track.sectionAt(R.s); if (sec.sec.type === 'reservoir' && R.s > sec.s0 + 110) break; } document.getElementById('quit').click(); });
  await page.waitForTimeout(300); await page.click('#continue'); await page.waitForTimeout(500);
  r = await page.evaluate(() => { const u = window.__underflow, R = window.__ride; u.setState({ health: 1e6 }); const leaks0 = u.state.leaks.length; u.step(30); return { mode: u.mode, grab: !!R.grab, climber: !!R.coop.climber, newLeaks: u.state.leaks.length - leaks0 }; });
  check('on the raft: nothing behind the resume point fires', r.mode === 'ride' && !r.grab && !r.climber && r.newLeaks === 0, JSON.stringify(r));
  await finish(browser, errors);
})();
