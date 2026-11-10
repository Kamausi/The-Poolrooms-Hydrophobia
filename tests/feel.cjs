// Feel and pressure: walking has a little weight (it ramps up, and stops faster than it starts); only a couple
// of Blooms may commit at once while the rest hold off; standing still raises the hesitation signal (it only shortens the wait
// for the next omen; nothing in the code path spawns); the same kind of omen does not come twice running.
const { open, newCampaign, check, finish } = require('./lib.cjs');
(async () => {
  const { browser, page, errors } = await open({ width: 800, height: 450 });
  await newCampaign(page);
  const dock = (i = 2) => page.evaluate((i) => { const u = window.__underflow; u.beginSector(i); u.startRide(); u.startExplore(); u.setState({ health: 1e6 }); u.step(5); window.__explore.blooms.forEach((b) => { b.active = false; }); return true; }, i);
  await dock();
  let r = await page.evaluate(() => { const u = window.__underflow, E = window.__explore;
    const open = E.find('.').map(([x, z]) => E.center(x, z)); const c = open[Math.floor(open.length / 2)];
    E.player.pos = [c[0], 0, c[2]]; u.step(3); const p0 = [...E.player.pos];
    u.hold('w', true); u.step(1); const d1 = Math.hypot(E.player.pos[0] - p0[0], E.player.pos[2] - p0[2]);
    u.step(20); const p1 = [...E.player.pos]; u.step(1); const dFull = Math.hypot(E.player.pos[0] - p1[0], E.player.pos[2] - p1[2]);
    u.hold('w', false); const p2 = [...E.player.pos]; u.step(6); const coast = Math.hypot(E.player.pos[0] - p2[0], E.player.pos[2] - p2[2]);
    return { d1, dFull, coast }; });
  check('walking ramps up over a few frames and stops within a step', r.d1 > 0 && r.d1 < r.dFull * 0.75 && r.coast < 0.35, JSON.stringify(r));

  r = await page.evaluate(() => { const u = window.__underflow, E = window.__explore; const p = E.player.pos;
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; E.spawnBloom([p[0] + Math.sin(a) * 5, 1.2, p[2] + Math.cos(a) * 5]); }
    let maxCommit = 0, close = 0;
    for (let k = 0; k < 90; k++) { u.setState({ health: 1e6 }); E.player.pos = [p[0], 0, p[2]]; u.step(1); const live = E.blooms.filter((b) => b.active && !b.dying); maxCommit = Math.max(maxCommit, live.filter((b) => b.commit).length); close = Math.max(close, live.filter((b) => Math.hypot(b.pos[0] - p[0], b.pos[2] - p[2]) < 2.4).length); }
    return { maxCommit, close, live: E.blooms.filter((b) => b.active && !b.dying).length }; });
  check('only two Blooms commit at once; the rest hold off', r.maxCommit >= 1 && r.maxCommit <= 2 && r.close <= 2, JSON.stringify(r));

  await dock();
  r = await page.evaluate(() => { const u = window.__underflow, E = window.__explore; const h0 = E.hesitation;
    E.director.omen(0, 600); // hold the director: nothing escalates while we stand here
    for (let k = 0; k < 40; k++) { u.setState({ health: 1e6, drift: 0 }); u.step(15); if (E.hesitation > 0.3) break; }
    const h = E.hesitation; u.hold('w', true); u.hold('a', true);
    for (let k = 0; k < 60; k++) { u.setState({ health: 1e6, drift: 0 }); E.player.yaw += 0.3; u.step(15); if (E.hesitation < h * 0.6) break; }
    u.hold('w', false); u.hold('a', false);
    return { h0, h, after: E.hesitation }; });
  check('standing still raises the hesitation signal; moving again lets it fall', r.h > r.h0 && r.after < r.h, JSON.stringify(r));

  r = await page.evaluate(() => { const u = window.__underflow, E = window.__explore; const CAT = { handle: 'door', crack: 'door', keyhole: 'door', forced: 'door', lights: 'light', extraStep: 'presence', drain: 'sound', echo: 'voice', name: 'voice' };
    const seen = []; let last = E.lastOmen;
    for (let k = 0; k < 900 && seen.length < 4; k++) { u.setState({ health: 1e6, drift: 0 }); u.step(10); if (E.lastOmen !== last) { last = E.lastOmen; seen.push(CAT[last]); } }
    let repeats = 0; for (let i = 1; i < seen.length; i++) if (seen[i] === seen[i - 1]) repeats++;
    return { seen, repeats }; });
  check('omens come in different kinds: never the same kind twice running', r.seen.length >= 3 && r.repeats === 0, JSON.stringify(r));
  await finish(browser, errors);
})();
