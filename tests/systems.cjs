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
    for (let k = 0; k < 450; k++) { u.setState({ health: 1e6, drift: 0 }); E.player.pos = [...c]; u.step(1); most = Math.max(most, E.blooms.filter((b) => b.active && b.commit).length); }
    const cap = E.budget.cap('melee'); E.blooms.forEach((b) => { b.active = false; }); u.step(1);
    return { most, cap, held: E.budget.count('melee') }; });
  check('on foot six Blooms around you, but only as many as the budget allows commit; the rest circle', r.most >= 1 && r.most <= r.cap && r.held === 0, JSON.stringify(r));

  r = await page.evaluate(() => { const u = window.__underflow, E = window.__explore; E.blooms.forEach((b) => { b.active = false; });
    const eye = [E.player.pos[0], 1.6, E.player.pos[2]]; const spots = [];
    for (let w = 0; w < 4; w++) { E.wave(3); for (const b of E.blooms.filter((x) => x.active)) { spots.push({ seen: E.lineOfSight(eye, [b.pos[0], 1, b.pos[2]]), d: Math.hypot(b.pos[0] - eye[0], b.pos[2] - eye[2]) }); b.active = false; } }
    return { n: spots.length, seen: spots.filter((s) => s.seen).length, near: Math.min(...spots.map((s) => s.d)) }; });
  check('a wave on foot comes in out of sight and at a distance', r.n >= 6 && r.seen === 0 && r.near > 11, JSON.stringify(r));
  r = await page.evaluate(() => { const u = window.__underflow; u.beginSector(0); u.startRide(); u.setState({ health: 1e6 }); u.step(3); const R = window.__ride;
    const before = R.flashes.lights().length; u.setState({ profile: 'pulse', charge: 100, heat: 0 }); R.fireAt(); const lit = R.flashes.lights().length; const all = R.gatherLights().length;
    u.step(8); const after = R.flashes.lights().length;
    for (let i = 0; i < 12; i++) R.fireAt(); const busy = R.flashes.lights().length;
    return { before, lit, all, after, busy }; });
  check('a shot lights the room for a moment from a fixed pool of four, within the engine limit of 16 lights', r.before === 0 && r.lit >= 1 && r.all <= 16 && r.after === 0 && r.busy <= 4, JSON.stringify(r));
  r = await page.evaluate(() => { const u = window.__underflow; u.beginSector(0); u.startExplore(); u.setState({ health: 1e6, drift: 0, noise: 0 }); u.step(3); const E = window.__explore;
    E.blooms.forEach((b) => { b.active = false; });
    const me = [...E.player.pos], eye = [me[0], 1.6, me[2]];
    // A cell out of sight of the player, 9 to 15 m away.
    const hidden = E.find('.').map(([x, z]) => E.center(x, z)).find((c) => { const d = Math.hypot(c[0] - me[0], c[2] - me[2]); return d > 9 && d < 15 && !E.lineOfSight([c[0], 1.3, c[2]], [eye[0], 1.2, eye[2]]); });
    if (!hidden) return { none: true };
    const b = E.spawnBloom([hidden[0], 1.3, hidden[2]], false); b.perc.awareness = 0; b.perc.lastKnown = null; b.perc.state = 'unaware';
    const hold = () => { u.setState({ health: 1e6, drift: 0 }); E.player.pos = [...me]; };
    const start = [...b.pos]; for (let k = 0; k < 60; k++) { hold(); u.setState({ noise: 0 }); u.step(1); }
    const quiet = { state: b.perc.state, moved: Math.hypot(b.pos[0] - start[0], b.pos[2] - start[2]) };
    for (let k = 0; k < 10; k++) { hold(); u.setState({ noise: 60 }); u.step(1); } const heard = b.perc.state, toward = b.perc.lastKnown && Math.hypot(b.perc.lastKnown[0] - me[0], b.perc.lastKnown[2] - me[2]) < 1;
    b.active = false; u.setState({ noise: 0 });
    return { quiet, heard, toward }; });
  check('on foot a Bloom that cannot see or hear you does not come; a loud shot and it knows where you were', r.none || (r.quiet.state === 'unaware' && r.quiet.moved < 0.5 && r.heard !== 'unaware' && r.toward), JSON.stringify(r));
  // Pursuit (pursuit.js): a Bloom that loses you goes to where it last sensed you, never to where you really are,
  // searches around that spot, and then drifts back toward the grate it came from.
  r = await page.evaluate(() => { const u = window.__underflow; u.beginSector(0); u.startExplore(); u.setState({ health: 1e6, drift: 0, noise: 0 }); u.step(3); const E = window.__explore;
    E.blooms.forEach((b) => { b.active = false; });
    const me = [...E.player.pos], eye = [me[0], 1.6, me[2]];
    const cells = E.find('.').map(([x, z]) => E.center(x, z));
    const home = cells.find((c) => { const d = Math.hypot(c[0] - me[0], c[2] - me[2]); return d > 6 && d < 10 && E.lineOfSight([c[0], 1.3, c[2]], [eye[0], 1.2, eye[2]]); });
    if (!home) return { none: 'home' };
    // Somewhere far from both, that the Bloom cannot see from anywhere near its route.
    const away = cells.find((c) => Math.hypot(c[0] - me[0], c[2] - me[2]) > 14 && Math.hypot(c[0] - home[0], c[2] - home[2]) > 14 && !E.lineOfSight([home[0], 1.3, home[2]], [c[0], 1.2, c[2]]) && !E.lineOfSight([me[0], 1.3, me[2]], [c[0], 1.2, c[2]]));
    if (!away) return { none: 'away' };
    const b = E.spawnBloom([home[0], 1.3, home[2]], false); b.perc.awareness = 1; b.perc.lastKnown = [me[0], 1.3, me[2]]; b.perc.state = 'aware'; b.perc.sinceSensed = 0;
    E.player.pos = [away[0], 0, away[2]];
    const modes = new Set(); let closestToMe = Infinity, closestToOld = Infinity;
    for (let k = 0; k < 120; k++) { u.setState({ health: 1e6, drift: 0, noise: 0 }); E.player.pos = [away[0], 0, away[2]]; u.step(1); if (!b.active) break; modes.add(b.pur.mode);
      closestToMe = Math.min(closestToMe, Math.hypot(b.pos[0] - away[0], b.pos[2] - away[2])); closestToOld = Math.min(closestToOld, Math.hypot(b.pos[0] - me[0], b.pos[2] - me[2])); }
    const out = { modes: [...modes], closestToOld: +closestToOld.toFixed(2), closestToMe: +closestToMe.toFixed(2), final: b.pur.mode };
    b.active = false; return out; });
  check('a Bloom that loses you goes to where it last sensed you (not where you are), searches there, then turns back', r.none || (r.modes.includes('search') && r.closestToOld < 2.5 && r.closestToMe > 8 && (r.modes.includes('return') || r.final === 'search')), JSON.stringify(r));
  // Marco senses separation: away from every crewmate, its voices come faster.
  r = await page.evaluate(() => { const u = window.__underflow; let E = null;
    for (let i = 1; i < 8; i++) { u.beginSector(i); u.startRide(); u.startExplore(); u.setState({ health: 1e6, regrouped: true }); u.step(2); E = window.__explore; if (E.marcos.length && E.followers.length) break; E = null; }
    if (!E) return { none: true };
    const m = E.marcos[0], me = [...E.player.pos];
    const drain = (near) => { m.timer = 100; for (let k = 0; k < 30; k++) { E.player.pos = [...me]; E.followers.forEach((f) => { f.pos = near ? [me[0] + 1, 0, me[2]] : [me[0] + 40, 0, me[2] + 40]; }); u.step(1); } return { used: +(100 - m.timer).toFixed(2), apart: E.marcoApart }; };
    return { together: drain(true), alone: drain(false) }; });
  check('Marco calls faster when you are apart from every crewmate', r.none || (r.together.apart === false && r.alone.apart === true && r.alone.used > r.together.used * 1.5), JSON.stringify(r));
  // One grab at a time (pressure.js 'grab'): a crewmate cannot be taken while a climber has the raft.
  r = await page.evaluate(() => { const u = window.__underflow; u.beginSector(2); u.startRide(); u.setState({ health: 1e6 }); u.step(3); const R = window.__ride;
    R.spawnEnc('climber'); u.step(1); let both = 0, climbed = !!R.coop.climber, slotHeld = R.budget.holds('climber');
    for (let k = 0; k < 120; k++) { if (k % 20 === 0) R.spawnEnc('crewGrab'); u.setState({ health: 1e6 }); u.step(1); if (R.coop.climber && R.coop.crewGrab) both++; }
    return { climbed, slotHeld, both, grabCap: R.budget.cap('grab') }; });
  check('only one thing grabs the raft at a time: a crewmate is not taken while a climber is on', r.climbed && r.slotHeld && r.both === 0 && r.grabCap === 1, JSON.stringify(r));
  // Springs (spring.js) carry the jolts: a hull scrape dips the view, rolls it toward that side, and it settles back;
  // a shot only nods it; on foot a Bloom burst dips the view and it recovers.
  r = await page.evaluate(() => { const u = window.__underflow; u.beginSector(2); u.startRide(); u.setState({ health: 1e6 }); u.step(3); const R = window.__ride;
    const rig = R.camRig; const get = (k) => +rig.get(k).toFixed(3);
    for (let k = 0; k < 60; k++) u.step(1);
    const rest = { heave: get('heave'), roll: get('roll') };
    R.spawnEnc('hullScrape', { side: 'right' }); u.step(3);
    const hit = { heave: get('heave'), roll: get('roll') };
    for (let k = 0; k < 90; k++) u.step(1);
    const after = { heave: get('heave'), roll: get('roll') };
    u.startExplore(); u.step(3); const E = window.__explore; for (let k = 0; k < 30; k++) u.step(1);
    E.jolt(1); u.step(2); const foot = +E.camRig.get('heave').toFixed(3); for (let k = 0; k < 60; k++) u.step(1); const footAfter = +E.camRig.get('heave').toFixed(3);
    return { rest, hit, after, foot, footAfter }; });
  check('a jolt is a spring, not noise: the view dips and rolls toward the hit, then settles; on foot too', Math.abs(r.rest.heave) < 0.05 && r.hit.heave < -0.015 && r.hit.roll > 0.01 && Math.abs(r.after.heave) < 0.03 && Math.abs(r.after.roll) < 0.03 && r.foot < -0.05 && Math.abs(r.footAfter) < 0.03, JSON.stringify(r));
  // A Bloom bursting lights the room for a moment from the shared pool, on the raft and on foot.
  r = await page.evaluate(() => { const u = window.__underflow; u.beginSector(1); u.startRide(); u.startExplore(); u.setState({ health: 1e6 }); u.step(3); const E = window.__explore;
    E.blooms.forEach((b) => { b.active = false; }); u.step(2);
    const count = () => E.frameEnv().pointLights.filter((l) => Math.abs(l.color[0] - 0.77) < 0.01 && Math.abs(l.color[1] - 0.35) < 0.01).length;
    const before = count(); const p = [...E.player.pos];
    // A Bloom that reaches you bursts against you (the game's own path, not a test call).
    const b = E.spawnBloom([p[0], 1.3, p[2]], false); let lit = 0, burst = false;
    for (let k = 0; k < 4 && !burst; k++) { u.setState({ health: 1e6 }); E.player.pos = [...p]; u.step(1); burst = !b.active; lit = Math.max(lit, count()); }
    for (let k = 0; k < 12; k++) u.step(1); const after = count();
    return { before, burst, lit, after }; });
  check('a burst lights the room from the shared light pool, then it is gone', r.before === 0 && r.burst && r.lit === 1 && r.after === 0, JSON.stringify(r));
  // Impact effects from a fixed pool (effectpool.js): a shot at the wall throws sparks, a shot into water throws
  // droplets; nothing is created during play, and the pieces fade out.
  r = await page.evaluate(() => { const u = window.__underflow; u.beginSector(0); u.startRide(); u.startExplore(); u.setState({ health: 1e6 }); u.step(3); const E = window.__explore;
    const parts0 = E.parts.length; const p = E.player.pos;
    E.shoot([p[0], 1.6, p[2]], [0, -1, 0]); u.step(1); const sparks = E.effects.live('spark');
    const w = E.find('~')[0] || E.find('x')[0]; let drops = -1;
    if (w) { const c = E.center(...w); E.shoot([c[0], 1.6, c[2]], [0, -1, 0]); u.step(1); drops = E.effects.live('droplet'); }
    const any = sparks;
    for (let k = 0; k < 40; k++) u.step(1);
    return { sparks, drops, after: E.effects.live('spark') + E.effects.live('droplet'), sameParts: E.parts.length === parts0 }; });
  check('a shot throws sparks (or droplets off water) from a fixed pool, and they fade', r.sparks > 0 && (r.drops === -1 || r.drops > 0) && r.after === 0 && r.sameParts, JSON.stringify(r));
  await finish(browser, errors);
})();
