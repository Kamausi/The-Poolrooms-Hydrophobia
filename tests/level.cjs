// The Closed Wave Pool as a level: a raised gallery round the basin; an inspection lamp that sweeps it; the
// tower stands somewhere different; the water decision changes the walk back (drained: dry floor; bypass: the
// basin turns and carries you) and the exit (discharge or bypass); at pump control a crewmate keeps the
// diverter turning when you let go, the room gets loud, the door handle moves and the lamp leaves the tower.
const { open, check, finish } = require('./lib.cjs');
(async () => {
  const { browser, page, errors } = await open({ width: 800, height: 450 });
  const start = (choice) => page.evaluate((choice) => { const u = window.__underflow; document.getElementById('chapter').click(); u.setState({ health: 1e6, regrouped: true }); u.startExplore(); u.step(5);
    const E = window.__explore; if (choice) u.state.routeMod = { [u.state.sectorKey]: choice }; return !!E.lifeguard; }, choice);
  check('the chapter has its Lifeguard', await start());
  let r = await page.evaluate(() => { const u = window.__underflow, E = window.__explore;
    const g = E.find('y')[3]; E.player.pos = E.center(...g); u.step(40); return { floor: E.player.floor ?? null, top: E.floorTop(...g) }; });
  check('the maintenance gallery is raised above the deck', r.top > 0.4, JSON.stringify(r));
  r = await page.evaluate(() => { const u = window.__underflow, E = window.__explore, L = E.lifeguard; let spots = 0, warned = false;
    for (let k = 0; k < 120; k++) { u.step(2); if (L.spot) { spots++; E.player.pos = [L.spot[0], 0, L.spot[2]]; } if (L.warn > 0) warned = true; if (L.violations) break; }
    return { rule: L.rule, spots, warned, violations: L.violations }; });
  check('the inspection lamp sweeps the floor; standing in it draws the warning, then the whistle', r.rule === 'inspect' && r.spots > 0 && r.warned && r.violations >= 1, JSON.stringify(r));

  r = await page.evaluate(() => { const towers = new Set(); for (let a = 0; a < 6; a++) { const u = window.__underflow; u.setState({ attempt: a }); u.startExplore(); u.step(1); const b = window.__explore.lifeguard.base; towers.add(b[0] + ',' + b[2]); } return { towers: towers.size }; });
  check('the tower stands in different places on different expeditions', r.towers > 1, JSON.stringify(r));

  await start('drained');
  r = await page.evaluate(() => { const u = window.__underflow, E = window.__explore;
    const w = E.find('~')[4]; const wetBefore = E.isWater(...w);
    E.player.pos = [E.cellPos[0], 0, E.cellPos[2]]; u.step(2); u.press('e'); u.step(2);
    E.player.pos = [...E.panelFront]; u.step(2); u.hold('e', true);
    for (let i = 0; i < 30 && E.basin === 'full'; i++) { u.setState({ health: 1e6 }); u.step(15); } u.hold('e', false);
    return { wetBefore, basin: E.basin, wetAfter: E.isWater(...w), undertow: E.undertow.alive }; });
  check('draining the basin leaves dry floor between you and the dock, and no Undertow', r.wetBefore && r.basin === 'drained' && !r.wetAfter && !r.undertow, JSON.stringify(r));
  r = await page.evaluate(() => { const u = window.__underflow; u.events.board(); u.step(3); const dock = u.state.ride.items.find((i) => i.type === 'pool' && i.dock); const ex = dock.exits.find((e) => e.modded); return { label: ex?.sections?.[0]?.label }; });
  check('…and the raft leaves on the discharge', r.label === 'THE DISCHARGE', JSON.stringify(r));

  await start('bypass');
  r = await page.evaluate(() => { const u = window.__underflow, E = window.__explore;
    E.player.pos = [E.cellPos[0], 0, E.cellPos[2]]; u.step(2); u.press('e'); u.step(2);
    E.player.pos = [...E.panelFront]; u.step(2);
    // Start it, then let go: the crewmate at the machine keeps it turning.
    const f = E.followers.find((x) => x.k === 0); u.hold('e', true); u.step(10); u.hold('e', false);
    let seen = { took: 0, lamp: false };
    for (let i = 0; i < 80 && E.basin === 'full'; i++) { f.pos = [...E.panelFront]; u.setState({ health: 1e6 }); const before = E.operating; u.step(10); if (E.operating > before) seen.took++; if (E.lifeguard.state !== 'watching') seen.lamp = true; }
    return { ...seen, basin: E.basin }; });
  check('at pump control a crewmate keeps the diverter turning and the lamp leaves the tower', r.took > 3 && r.lamp && r.basin === 'bypass', JSON.stringify(r));
  r = await page.evaluate(() => { const u = window.__underflow, E = window.__explore;
    const w = E.find('~')[6]; const c = E.center(...w); E.player.pos = [...c]; u.step(1); const p0 = [...E.player.pos]; u.step(30);
    return { moved: Math.hypot(E.player.pos[0] - p0[0], E.player.pos[2] - p0[2]), wet: E.isWater(...w) }; });
  check('with the bypass open the basin stays deep and carries you', r.wet && r.moved > 0.5, JSON.stringify(r));
  r = await page.evaluate(() => { const u = window.__underflow; u.events.board(); u.step(3); const dock = u.state.ride.items.find((i) => i.type === 'pool' && i.dock); const ex = dock.exits.find((e) => e.modded); return { label: ex?.sections?.[0]?.label }; });
  check('…and the raft leaves calm through the bypass', r.label === 'THE BYPASS', JSON.stringify(r));
  await finish(browser, errors);
})();
