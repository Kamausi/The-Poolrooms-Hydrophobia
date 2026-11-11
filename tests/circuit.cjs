// The lighting circuit: a relay switches the dock between main lights and emergency strips. Under emergency
// light one wall is a doorway with a service cache in it; under the main lights it is a wall again. You
// cannot switch back while standing in it. Crossing it once is a route found.
const { open, newCampaign, check, finish } = require('./lib.cjs');
(async () => {
  const { browser, page, errors } = await open({ width: 800, height: 450 });
  await newCampaign(page);
  let r = await page.evaluate(() => { const u = window.__underflow; let pick = -1;
    for (const i of [0, 1, 2, 3]) { u.beginSector(i); u.startRide(); u.startExplore(); u.setState({ health: 1e6 }); u.step(3); if (window.__explore.circuit) { pick = i; break; } }
    const E = window.__explore, C = E.circuit; if (!C) return { none: true };
    E.blooms.forEach((b) => { b.active = false; });
    const [x, z] = C.cell; const wall0 = E.isWall(x, z), blocked0 = E.blocked(x, z), lit0 = E.lamps.filter((l) => l.on).length;
    // At the relay, press E.
    E.player.pos = [C.relayPos[0], 0, C.relayPos[2]]; u.step(2); const prompt = document.getElementById('prompt').textContent; u.press('e'); u.step(3);
    const lights = E.lights(); const coral = lights.filter((l) => l.color[0] === 1 && l.color[1] < 0.4).length;
    return { sector: pick, wall0, blocked0, lit0, prompt, emergency: E.emergency, wall1: E.isWall(x, z), blocked1: E.blocked(x, z), lit1: E.lamps.filter((l) => l.on).length, coral }; });
  check('the relay switches to emergency strips: the main lamps go out and coral comes up', !r.none && /Lighting relay/.test(r.prompt) && r.emergency && r.lit0 > 0 && r.lit1 === 0 && r.coral > 0, JSON.stringify(r));
  check('under emergency light the wall is a doorway', r.wall0 && r.blocked0 && !r.wall1 && !r.blocked1, JSON.stringify({ wall0: r.wall0, wall1: r.wall1 }));

  r = await page.evaluate(() => { const u = window.__underflow, E = window.__explore, C = E.circuit; const [x, z] = C.cell;
    const routes0 = u.state.tally.awards.route || 0, cells0 = u.state.cells, credit0 = u.state.credit || 0;
    u.setState({ cells: 0 }); E.player.pos = [C.c[0], 0, C.c[2]]; u.step(2); const inside = E.cellPos ? true : true; u.press('e'); u.step(2);
    const cache = C.cacheTaken, cells = u.state.cells, route = (u.state.tally.awards.route || 0) - routes0;
    const refused = !E.setEmergency(false); const still = E.emergency;
    // Step out, switch back.
    E.player.pos = [C.relayPos[0], 0, C.relayPos[2]]; u.step(1); const ok = E.setEmergency(false); u.step(2);
    return { cache, cells, route, refused, still, ok, wall: E.isWall(x, z), blocked: E.blocked(x, z), lit: E.lamps.filter((l) => l.on).length, credit: (u.state.credit || 0) - credit0 }; });
  check('the cache in the doorway can be taken, and crossing it is a route found', r.cache && r.cells === 1 && r.route === 1 && r.credit >= 100, JSON.stringify(r));
  check('it will not switch back while you stand in it; from outside it does, and the wall is a wall again', r.refused && r.still && r.ok && r.wall && r.blocked && r.lit > 0, JSON.stringify(r));
  r = await page.evaluate(() => { const u = window.__underflow, E = window.__explore, C = E.circuit; u.setState({ health: 1e6, drift: 0 });
    E.blooms.forEach((b) => { b.active = false; });
    E.player.pos = [C.relayPos[0], 0, C.relayPos[2]]; u.step(1);
    // Two throws so far (to emergency and back). The third is allowed and warns; the fourth trips it.
    const third = E.setEmergency(true); u.step(1); const before = E.blackout; const fourth = E.setEmergency(false); u.step(2);
    const out = { switches: C.switches, third, before, fourth, blackout: E.blackout, emergency: E.emergency, lit: E.lamps.filter((l) => l.on).length,
      coral: E.lights().filter((l) => l.color[0] === 1 && l.color[1] < 0.4 && l.range === 7.5).length, signsDark: E.signParts.filter((s) => s.style !== 'uv').every((s) => s.part.material.emission < 0.1), signs: E.signParts.length,
      refused: !E.setEmergency(false) };
    const m0 = u.state.tally.awards.machine || 0;
    u.press('e'); u.step(2); out.winding = E.resetT > 0;
    // Walk away: it winds back.
    const far = E.find('.').map(([x, z]) => E.center(x, z)).sort((a, b) => Math.hypot(b[0] - C.relayPos[0], b[2] - C.relayPos[2]) - Math.hypot(a[0] - C.relayPos[0], a[2] - C.relayPos[2]))[0];
    E.player.pos = [far[0], 0, far[2]]; u.step(2); out.cancelled = E.resetT === 0 && E.blackout;
    E.player.pos = [C.relayPos[0], 0, C.relayPos[2]]; u.step(1); u.press('e'); for (let k = 0; k < 30 && E.blackout; k++) { u.setState({ health: 1e6, drift: 0 }); E.player.pos = [C.relayPos[0], 0, C.relayPos[2]]; u.step(6); }
    out.restored = !E.blackout; out.paid = (u.state.tally.awards.machine || 0) - m0; out.coralBack = E.lights().filter((l) => l.range === 7.5).length; out.signsLit = E.signParts.some((s) => s.part.material.emission > 0.5); out.again = E.setEmergency(false);
    return out; });
  check('the relay trips on the fourth throw: fixtures, strips and lit signs all go out, and it will not switch', r.third && !r.before && !r.fourth && r.blackout && r.emergency && r.lit === 0 && r.coral === 0 && r.signs > 0 && r.signsDark && r.refused, JSON.stringify(r));
  check('resetting the breaker takes time at the relay, winds back if you leave, and brings the circuit back as it was', r.winding && r.cancelled && r.restored && r.paid === 1 && r.coralBack > 0 && r.signsLit && r.again, JSON.stringify(r));
  r = await page.evaluate(() => { const u = window.__underflow, E = window.__explore, C = E.circuit; u.setState({ health: 1e6, drift: 0 });
    E.blooms.forEach((b) => { b.active = false; }); E.setBlackout(true);
    const me = [C.relayPos[0], 0, C.relayPos[2]]; E.player.pos = [...me]; u.state.lamp.mode = 0; u.state.lamp.charge = 100;
    const spot = E.find('.').map(([x, z]) => E.center(x, z)).map((c) => ({ c, d: Math.hypot(c[0] - me[0], c[2] - me[2]) })).filter((o) => o.d > 5 && o.d < 11).sort((a, b) => a.d - b.d)[0].c;
    const n0 = E.blooms.length; E.spawnBloom([spot[0], 1.2, spot[2]]); const b = E.blooms.find((x) => x.active) || E.blooms[n0];
    const start = [...b.pos]; const hold = () => { u.setState({ health: 1e6, drift: 0 }); E.player.pos = [...me]; };
    for (let k = 0; k < 20; k++) { hold(); u.step(3); }
    const blind = b.blind, stayed = Math.hypot(b.pos[0] - start[0], b.pos[2] - start[2]), d0 = Math.hypot(b.pos[0] - me[0], b.pos[2] - me[2]);
    u.state.lamp.mode = 1; for (let k = 0; k < 20; k++) { hold(); u.state.lamp.charge = 100; u.step(3); }
    const seen = !b.blind || !b.active, d1 = Math.hypot(b.pos[0] - me[0], b.pos[2] - me[2]);
    E.setBlackout(false); u.state.lamp.mode = 0;
    return { blind, stayed, d0, d1, seen, active: b.active }; });
  check('with the power out a Bloom that has not committed loses you while your lamp is off, and comes when you light it', r.blind && r.stayed < 0.5 && r.seen && r.d1 < r.d0 - 1, JSON.stringify(r));
  await finish(browser, errors);
})();
