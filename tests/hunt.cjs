// Creatures: Blooms wait collapsed and fill unevenly before they lunge; a hit collapses a chamber;
// a supply locker can hold someone breathing; the Lifeguard wakes lamp, head, hand, then hunts:
// pursues, searches where it lost you, gives up, and when it catches you it drags you until you're freed.
const { open, newCampaign, check, finish } = require('./lib.cjs');
(async () => {
  const { browser, page, errors } = await open({ width: 800, height: 450 });
  await newCampaign(page);
  const dock = (i = 1) => page.evaluate((i) => { const u = window.__underflow; u.beginSector(i); u.startRide(); u.startExplore(); u.setState({ health: 1e6, regrouped: true }); u.step(5); return !!window.__explore.lifeguard; }, i);
  check('the dock has a Lifeguard', await dock());

  // A cell 7+ m away with an open neighbour, for a Bloom to lie in.
  let r = await page.evaluate(() => { const u = window.__underflow, E = window.__explore;
    E.blooms.forEach((b) => { b.active = false; });
    const p = E.player.pos;
    const cell = E.find('.').map(([x, z]) => E.center(x, z)).find((c) => Math.hypot(c[0] - p[0], c[2] - p[2]) > 8);
    const b = E.spawnBloom([cell[0], 0.07, cell[2]], true);
    u.step(30); const still = b.dormant;
    const dir = Math.hypot(cell[0] - p[0], cell[2] - p[2]);
    E.player.pos = [cell[0] + 2.5, 0, cell[2]];
    let sawWaking = false, filledFirst = false;
    for (let k = 0; k < 40; k++) { u.step(2); if (b.waking > 0.3 && b.waking < 0.7) { sawWaking = true; } if (!b.dormant && !b.waking) break; }
    return { still, sawWaking, awake: !b.dormant && !b.waking, lunge: b.lunge, y: b.pos[1] }; });
  check('a dormant Bloom lies still at a distance, fills when you come close, then lunges', r.still && r.sawWaking && r.awake && r.y > 1, JSON.stringify(r));

  r = await page.evaluate(() => { const u = window.__underflow, E = window.__explore;
    const p = E.player.pos; const b = E.spawnBloom([p[0], 1.2, p[2]]); b.hp = 3; b.stagger = 1;
    E.shoot([b.pos[0] + 1.6, b.pos[1], b.pos[2]], [-1, 0, 0]);
    return { ch: b.ch, hp: b.hp, alive: b.active && !b.dying }; });
  check('a hit that does not kill collapses one chamber', r.alive && r.ch.filter((c) => c < 0.5).length === 1, JSON.stringify(r));

  await dock();
  r = await page.evaluate(() => { const u = window.__underflow, E = window.__explore;
    if (!E.lockers.length) return { none: true };
    const lk = E.lockers[0]; E.occupant.locker = lk;
    E.player.pos = [lk.pos[0] + 0.3, 0, lk.pos[2] + 0.3]; u.step(3);
    u.press('e'); u.step(3); const shown = E.occupant.state;
    u.step(90); u.press('e'); u.step(3);
    return { shown, closed: E.occupant.state }; });
  check('a supply locker can hold someone breathing, and you can close it', r.none || (r.shown === 'shown' && r.closed === 'closed'), JSON.stringify(r));

  await dock();
  r = await page.evaluate(() => { const u = window.__underflow, E = window.__explore, L = E.lifeguard;
    // Wake it in stages: warn is the shared clock for lamp, head, hand.
    L.rule = 'run';
    const b = L.base; E.player.pos = [b[0] + 4, 0, b[2] + 4];
    const look0 = L.look ?? null; let flare = 0, hand = 0;
    u.hold('shift', true); u.hold('w', true);
    for (let k = 0; k < 40 && L.violations === 0; k++) { E.player.pos = [b[0] + 4, 0, b[2] + 4]; u.step(2); flare = Math.max(flare, L.flare || 0); hand = Math.max(hand, L.handUp || 0); }
    u.hold('shift', false); u.hold('w', false);
    return { flare, hand, violations: L.violations }; });
  check('the Lifeguard wakes in stages: lamp, then the hand to the whistle', r.flare > 0.5 && r.hand > 0.5 && r.violations >= 1, JSON.stringify(r));

  r = await page.evaluate(() => { const u = window.__underflow, E = window.__explore, L = E.lifeguard;
    L.cooldown = 0; L.state = 'watching'; L.violations = 1; L.blind = 0;
    E.violate('test'); const started = L.state;
    // Catch: it reaches you away from the tower.
    const c = E.find('.').map(([x, z]) => E.center(x, z)).find((q) => Math.hypot(q[0] - L.base[0], q[2] - L.base[2]) > 6);
    E.player.pos = [c[0], 0, c[2]]; L.pos = [c[0] + 0.6, 0, c[2]]; u.step(1); const caught = L.state;
    for (let k = 0; k < 8; k++) { u.press(' '); u.step(1); }
    return { started, caught, after: L.state }; });
  check('it pursues, grabs, and you can twist free', r.started === 'pursuit' && r.caught === 'grab' && (r.after === 'stunned' || r.after === 'returning'), JSON.stringify(r));

  r = await page.evaluate(() => { const u = window.__underflow, E = window.__explore, L = E.lifeguard;
    L.state = 'search'; L.pos = [...L.base]; L.target = [...L.base]; L.searchT = 0; L.next = null; L.blind = 0; L.doorUsed = true;
    E.player.pos = [L.base[0] + 30, 0, L.base[2] + 30]; // well out of sight
    const states = new Set();
    for (let k = 0; k < 600 && L.state !== 'watching'; k++) { u.step(1); states.add(L.state); }
    return { states: [...states], end: L.state }; });
  check('out of its sight, it searches, gives up and goes back to the tower', r.states.includes('returning') && r.end === 'watching', JSON.stringify(r));
  r = await page.evaluate(() => { const u = window.__underflow, E = window.__explore, L = E.lifeguard;
    if (!E.followers.length) return { none: true };
    const c = E.find('.').map(([x, z]) => E.center(x, z)).find((q) => Math.hypot(q[0] - L.base[0], q[2] - L.base[2]) > 6);
    L.state = 'pursuit'; L.blind = 0; L.lostSight = 0; L.next = null;
    E.player.pos = [c[0], 0, c[2]]; L.pos = [c[0] + 0.6, 0, c[2]]; E.followers[0].pos = [c[0] - 1, 0, c[2]];
    u.step(1); const caught = L.state; let t = 0;
    while (L.state === 'grab' && t < 300) { E.followers[0].pos = [E.player.pos[0] - 1, 0, E.player.pos[2]]; u.step(1); t++; }
    return { caught, after: L.state, frames: t }; });
  check('a crewmate pulls you loose', r.none || (r.caught === 'grab' && r.after === 'stunned'), JSON.stringify(r));
  await dock(2);
  r = await page.evaluate(() => { const u = window.__underflow, E = window.__explore, L = E.lifeguard, D = E.door;
    if (!L || !D) return { none: true };
    D.angle = 0; L.doorUsed = false; L.blind = 0;
    // You stand a few metres from the service door; it has lost you far away and finished looking.
    E.player.pos = [D.hinge[0] + D.n[0] * 8 + D.t[0] * 0.45, 0, D.hinge[2] + D.n[2] * 8 + D.t[2] * 0.45];
    const far = E.find('.').map(([x, z]) => E.center(x, z)).sort((a, b) => Math.hypot(b[0] - E.player.pos[0], b[2] - E.player.pos[2]) - Math.hypot(a[0] - E.player.pos[0], a[2] - E.player.pos[2]))[0];
    L.state = 'search'; L.pos = [...far]; L.target = [...far]; L.searchT = 5.5; L.next = null; L.look = Math.atan2(far[0] - E.player.pos[0], far[2] - E.player.pos[2]);
    u.step(1);
    return { used: L.doorUsed, angle: D.angle, state: L.state, near: Math.hypot(L.pos[0] - D.hinge[0], L.pos[2] - D.hinge[2]) < 2 }; });
  check('it comes through the service door to cut you off', r.none || (r.used && r.angle > 1 && r.near), JSON.stringify(r));
  r = await page.evaluate(() => { const u = window.__underflow, E = window.__explore, L = E.lifeguard; u.setState({ health: 1e6, drift: 0 });
    E.blooms.forEach((b) => { b.active = false; });
    const c = E.find('.').map(([x, z]) => E.center(x, z)).find((q) => Math.hypot(q[0] - L.base[0], q[2] - L.base[2]) > 6);
    L.state = 'watching'; E.player.pos = [c[0], 0, c[2]]; E.player.yaw = 0; E.player.pitch = 0; u.step(1); const calm = E.wedges.length;
    // Forward at yaw 0 is −z: put it four metres behind, already coming.
    L.state = 'pursuit'; L.blind = 0; L.lostSight = 0; L.next = null; L.pos = [c[0], 0, c[2] + 4]; E.player.pos = [c[0], 0, c[2]]; E.player.yaw = 0; u.step(1);
    const w = E.wedges.slice(); const st = L.state; L.state = 'returning'; u.step(1);
    return { calm, n: w.length, behind: w[0]?.behind, st, after: E.wedges.length }; });
  check('the Lifeguard gets a rim marker only while it is coming for you from out of view', r.calm === 0 && r.n === 1 && r.behind && r.after === 0, JSON.stringify(r));
  await finish(browser, errors);
})();
