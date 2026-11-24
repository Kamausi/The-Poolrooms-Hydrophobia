// Water that breaks the facility's rules (ai/wrongwater.js). On the raft: one stretch of fast channel where the
// current streaks run upstream, never in the first attraction, noticed by the crew. On foot: once per dock, rings on
// still water that close on a point instead of spreading, where you can see them; a crewmate who sees it says so.
const { open, check, finish } = require('./lib.cjs');
(async () => {
  const { browser, page, errors } = await open({ width: 640, height: 360 });
  await page.click('#start-exp'); await page.click('#start');
  await page.waitForTimeout(600);
  await page.evaluate(() => { document.querySelector('#modal-body .choice')?.click(); document.querySelector('#modal-actions button')?.click(); });
  await page.waitForTimeout(300);
  const raft = await page.evaluate(() => { const u = window.__underflow;
    u.beginSector(0); u.startRide(); u.sim(1);
    const first = window.__ride.upstream;
    for (const i of [1, 2, 3, 4, 5, 6, 7]) {
      u.beginSector(i); u.startRide(); u.setState({ health: 1e6 }); u.sim(1);
      const R = window.__ride;
      if (!R.upstream) continue;
      const [a, b] = R.upstream;
      R.s = a - 30; u.sim(1); const before = R.streakFlowAt();
      R.s = (a + b) / 2; u.sim(2); const inside = R.streakFlowAt();
      const seen = R.upstreamSeen, ledger = localStorage.getItem('underflow-facility') || '';
      return { first, sector: i, stretch: [a, b], before, inside, seen, noted: /slid upstream/.test(ledger) };
    }
    return { first, none: true }; });
  check('never in the first attraction', raft.first === null, JSON.stringify(raft));
  check('on the raft, one stretch of fast channel where the current streaks slide upstream; the crew see it and it goes in the ledger', !raft.none && raft.before > 0 && raft.inside < 0 && raft.seen && raft.noted, JSON.stringify(raft));

  const foot = await page.evaluate(() => { const u = window.__underflow;
    for (const i of [1, 2, 3, 4, 5, 6, 7]) {
      u.beginSector(i); u.startRide(); u.startExplore(); u.setState({ health: 1e6, drift: 0 }); u.sim(2);
      const E = window.__explore, Wn = E.wrongWater;
      E.blooms.forEach((b) => { b.active = false; });
      const wet = E.find('~').filter(([x, z]) => E.isWater(x, z));
      // Stand on dry floor 6–9 m from a water cell, facing it.
      let spot = null, target = null;
      for (const [wx, wz] of wet) {
        const wc = E.center(wx, wz);
        const d = E.find('.').find(([x, z]) => { const c = E.center(x, z), dd = Math.hypot(c[0] - wc[0], c[2] - wc[2]); return !E.isWater(x, z) && dd > 6 && dd < 9 && E.lineOfSight([c[0], 1.6, c[2]], [wc[0], 0.2, wc[2]]); });
        if (d) { spot = d; target = wc; break; }
      }
      if (!spot) continue;
      const c = E.center(...spot); E.player.pos[0] = c[0]; E.player.pos[2] = c[2];
      E.player.yaw = Math.atan2(-(target[0] - c[0]), -(target[2] - c[2])); E.player.pitch = -0.3;
      // A crewmate beside you, to see it.
      E.followers.forEach((f) => { if (f.pos) { f.pos[0] = c[0] + 0.8; f.pos[2] = c[2]; } });
      u.step(2);
      Wn.wait = 0; E.updateWrongWater(0.03, true); u.step(1);
      const rings = () => E.waterField.rings.filter((r) => r.inward && E.time - r.t0 < 2.4).length;
      const at = Wn.at;
      u.step(50); // 1.7 s: all three rings started
      const n = rings(), dist = at && Math.hypot(at[0] - c[0], at[2] - c[2]);
      // Once per dock: asking again does nothing.
      const before = E.waterField.rings.filter((r) => r.inward).length;
      Wn.wait = 0; E.updateWrongWater(0.03, true); u.sim(60);
      const after = E.waterField.rings.filter((r) => r.inward).length;
      u.sim(100);
      return { sector: i, done: Wn.done, at: !!at, rings: n, dist, again: after - before, witness: Wn.witness, noted: /closed on a point/.test(localStorage.getItem('underflow-facility') || ''), followers: E.followers.length };
    }
    return { none: true }; });
  check('on foot, three rings close on a point of still water where you can see it, not underfoot', !foot.none && foot.done && foot.at && foot.rings === 3 && foot.dist >= 4 && foot.dist <= 12, JSON.stringify(foot));
  check('only once per dock', !foot.none && foot.again === 0, JSON.stringify(foot));
  check('a crewmate who sees it says so, and only then does it enter the ledger', !foot.none && (foot.followers ? !!foot.witness && foot.noted : !foot.noted), JSON.stringify(foot));
  await finish(browser, errors);
})();
