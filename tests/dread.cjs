// Dread: the crew notices Drift in stages; a lucid survivor asks to be pulled slowly and asks for a towel at
// the Safe Room; Locker 0417 is "returned" while you still carry what was in it; and the Closed Wave Pool's
// beats: an empty chair that is occupied once you look away, a wave display that advances over flat water,
// something crossing against the waves, and the window aftermath that walks your route again.
const { open, newCampaign, check, finish } = require('./lib.cjs');
(async () => {
  const { browser, page, errors } = await open({ width: 800, height: 450 });
  await newCampaign(page);
  let r = await page.evaluate(() => { const u = window.__underflow; u.beginSector(1); u.startRide(); u.startExplore(); u.setState({ health: 1e6, regrouped: true, drift: 40 }); u.step(3);
    const s1 = u.state.driftTold; u.setState({ drift: 58 }); u.step(3); const s2 = u.state.driftTold; u.setState({ drift: 75 }); u.step(3);
    return { s1, s2, s3: u.state.driftTold }; });
  check('the crew notices Drift in three stages', r.s1 === 1 && r.s2 === 2 && r.s3 === 3, JSON.stringify(r));

  r = await page.evaluate(() => { const u = window.__underflow, E = window.__explore;
    if (!E.lockers.length) return { none: true };
    const lk = E.lockers[0]; E.occupant.locker = null;
    E.player.pos = [lk.pos[0] + 0.3, 0, lk.pos[2] + 0.3]; u.step(3); u.press('e'); u.step(3); return { opened: lk.opened }; });
  const sub = await page.evaluate(() => { let t = ''; for (let k = 0; k < 500; k++) { window.__underflow.step(3); t += '  ' + document.getElementById('subtitle').textContent; } return t; });
  check('the Attendant says Locker 0417 has been returned while you carry its contents', r.none || /Locker 0417 has been returned/.test(sub), JSON.stringify(r) + [...new Set(sub.split('  '))].join('|').slice(0, 600));

  // The chapter: a survivor in the water, the chair, the display, the window.
  r = await page.evaluate(() => { const u = window.__underflow; document.getElementById('chapter').click(); u.setState({ health: 1e6 }); u.startExplore(); u.step(5);
    const E = window.__explore; return { chapter: !!E.wavePool }; });
  check('the Closed Wave Pool builds its chair and display', r.chapter, JSON.stringify(r));

  r = await page.evaluate(() => { const u = window.__underflow; u.beginSector(1); u.startRide(); u.startExplore(); u.setState({ health: 1e6 }); u.step(3); const E = window.__explore;
    const f = E.floaters[0]; if (!f) return { none: true };
    f.survivor = true; f.state = 'floating';
    E.player.pos = [f.pos[0] + 1, 0, f.pos[2]]; u.step(2);
    u.hold('e', true); u.step(30); const mid = f.state; u.step(60); u.hold('e', false);
    return { mid, end: f.state, towel: u.state.towelAsk }; });
  check('a lucid survivor is pulled out slowly and will ask for a towel', r.none || (r.mid === 'floating' && r.end === 'gone' && !!r.towel), JSON.stringify(r));

  r = await page.evaluate(() => { const u = window.__underflow; document.getElementById('chapter').click(); u.setState({ health: 1e6 }); u.startExplore(); u.step(5); const E = window.__explore, B = E.wavePool;
    // Look at the empty chair, then away for a while.
    const seat = B.o(0, 0, 2.25);
    const spot = [1, -1].map((k) => [seat[0] + B.side[0] * 4 * k, 0, seat[2] + B.side[2] * 4 * k])[0];
    E.player.pos = spot;
    const face = (p) => { E.player.yaw = Math.atan2(-(p[0] - E.player.pos[0]), -(p[2] - E.player.pos[2])); E.player.pitch = 0; };
    face(seat); u.step(5); const seen = B.seenEmpty;
    E.player.yaw += Math.PI; E.player.pos = [seat[0] + B.side[0] * 7, 0, seat[2] + B.side[2] * 7]; u.step(400); const seated = B.seated;
    return { seen, seated, steps: B.step, wake: B.wakeT, away: B.awayT, d: Math.hypot(E.player.pos[0] - seat[0], E.player.pos[2] - seat[2]) }; });
  check('the empty chair is occupied after you look away; the display advances; something crosses the pool', r.seen && r.seated && r.steps >= 1 && r.wake > 0, JSON.stringify(r));

  r = await page.evaluate(() => { const u = window.__underflow; u.setState({ hesitation: { t: 9, near: 'the beach' } }); u.enterSafeRoom(); u.step(2);
    return document.body.innerText; });
  check('from the Safe Room window, four come along your route, one waits where you hesitated, then a fifth', /four .* along the exact route you took/.test(r) && /the beach, where you stood still the longest/.test(r) && /a fifth comes/.test(r), r.slice(0, 200));
  await finish(browser, errors);
})();
