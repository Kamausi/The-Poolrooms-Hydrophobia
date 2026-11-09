// Balance with the DEV competent-player bot: each attraction from a fresh crew to the dock. Reports lowest
// health and raft condition; fails if the bot does not reach a dock. Slow (minutes); not part of the quick set.
const { open, newCampaign, check, finish } = require('./lib.cjs');
(async () => {
  const { browser, page, errors } = await open({ width: 800, height: 450 });
  for (let i = 0; i < 8; i++) {
    await newCampaign(page);
    const r = await page.evaluate((i) => { const u = window.__underflow; u.setState({ regrouped: i > 0 }); u.beginSector(i); u.startRide(); u.setState({ autopilot: true }); const R = window.__ride; R.bot = true;
      let minH = 100, docked = false;
      for (let k = 0; k < 500; k++) { u.setState({ drift: Math.min(u.state.drift, 60), sitting: false }); u.step(30); if (u.mode !== 'ride') break; minH = Math.min(minH, u.state.health); if (R.track.roomAt(R.s)?.sec.dock) { docked = true; break; } }
      const S = u.state; return { docked, minH: Math.round(minH), raft: Math.round(S.raft), cause: docked ? '' : S.lastHurt }; }, i);
    check(`sector ${i} reached by the bot`, r.docked, `lowest health ${r.minH} · raft ${r.raft}%${r.cause ? ' · ' + r.cause : ''}`);
  }
  await finish(browser, errors);
})();
