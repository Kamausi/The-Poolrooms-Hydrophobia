// Systems from the reference brief, rebuilt for UNDERFLOW: springs on the viewmodel, the pressure budget (who may
// commit an attack), and spawn scoring (nothing appears in plain sight).
const { open, newCampaign, check, finish } = require('./lib.cjs');
(async () => {
  const { browser, page, errors } = await open({ width: 800, height: 450 });
  await newCampaign(page);
  let r = await page.evaluate(() => { const u = window.__underflow; u.beginSector(0); u.startRide(); u.setState({ health: 1e6 }); u.step(5); const R = window.__ride;
    const trace = (profile) => { u.setState({ profile, charge: 100, heat: 0, special: 100 }); u.step(40); const out = []; R.blaster.trigger(1 / 60, true, true); for (let k = 0; k < 60; k++) { R.blaster.trigger(1 / 60, false, true); out.push(R.blaster.springs.push); } return out; };
    const p = trace('pulse'), s = trace('scatter');
    const settle = (a) => a.findIndex((v, i) => i > 3 && Math.abs(v) < 0.05 * Math.max(...a));
    return { pulsePeak: Math.max(...p), scatterPeak: Math.max(...s), pulseSettle: settle(p), scatterSettle: settle(s), overshoot: Math.min(...s) < 0 }; });
  check('the viewmodel is sprung: Scatter shoves further and settles slower than Pulse', r.scatterPeak > r.pulsePeak * 1.5 && r.pulseSettle > 0 && (r.scatterSettle < 0 || r.scatterSettle > r.pulseSettle), JSON.stringify(r));

  r = await page.evaluate(() => { const u = window.__underflow, R = window.__ride; for (const b of R.blooms) b.active = false;
    const sp = R.blooms.slice(0, 5); sp.forEach((b, i) => Object.assign(b, { active: true, dying: 0, hp: 50, spitter: true, goal: null, rear: false, spit: 0.75 + i * 0.01, pos: R.track.lateral(R.s + 14 + i, (i - 2) * 1.2, 1) }));
    let most = 0; for (let k = 0; k < 240; k++) { u.setState({ health: 1e6 }); u.step(1); most = Math.max(most, R.budget.count('ranged')); sp.forEach((b) => { b.hp = 50; }); }
    const fired = R.shots.filter((s) => s.active).length; sp.forEach((b) => { b.active = false; b.spitter = false; }); R.shots.forEach((s) => { s.active = false; });
    return { most, cap: R.budget.cap('ranged') }; });
  check('on the raft no more than two spitters wind up at once; the rest hold their shot', r.most >= 1 && r.most <= r.cap && r.cap === 2, JSON.stringify(r));

  r = await page.evaluate(() => { const u = window.__underflow; u.startExplore(); u.setState({ health: 1e6, drift: 0 }); u.step(3); const E = window.__explore;
    E.blooms.forEach((b) => { b.active = false; });
    const c = E.player.pos; let most = 0;
    for (let i = 0; i < 6; i++) E.spawnBloom([c[0] + Math.cos(i) * 2.6, 1.3, c[2] + Math.sin(i) * 2.6]);
    for (let k = 0; k < 120; k++) { u.setState({ health: 1e6, drift: 0 }); E.player.pos = [...c]; u.step(1); most = Math.max(most, E.blooms.filter((b) => b.active && b.commit).length); }
    const cap = E.budget.cap('melee'); E.blooms.forEach((b) => { b.active = false; }); u.step(1);
    return { most, cap, held: E.budget.count('melee') }; });
  check('on foot six Blooms around you, but only as many as the budget allows commit; the rest circle', r.most >= 1 && r.most <= r.cap && r.held === 0, JSON.stringify(r));

  r = await page.evaluate(() => { const u = window.__underflow, E = window.__explore; E.blooms.forEach((b) => { b.active = false; });
    const eye = [E.player.pos[0], 1.6, E.player.pos[2]]; const spots = [];
    for (let w = 0; w < 4; w++) { E.wave(3); for (const b of E.blooms.filter((x) => x.active)) { spots.push({ seen: E.lineOfSight(eye, [b.pos[0], 1, b.pos[2]]), d: Math.hypot(b.pos[0] - eye[0], b.pos[2] - eye[2]) }); b.active = false; } }
    return { n: spots.length, seen: spots.filter((s) => s.seen).length, near: Math.min(...spots.map((s) => s.d)) }; });
  check('a wave on foot comes in out of sight and at a distance', r.n >= 6 && r.seen === 0 && r.near > 11, JSON.stringify(r));
  await finish(browser, errors);
})();
