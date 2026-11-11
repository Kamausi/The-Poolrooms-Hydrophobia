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
  await finish(browser, errors);
})();
