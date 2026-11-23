// Omens on the raft: each one holds the director (no swarm on top of it), plays out and ends cleanly.
// Lights die toward the raft and come back; the platform's wave hurts only an unbraced raft; the thing under
// the raft can be escaped by bracing at the shallow edge, and takes a crewmate if ignored.
const { open, newCampaign, check, finish } = require('./lib.cjs');
(async () => {
  const { browser, page, errors } = await open({ width: 800, height: 450 });
  await newCampaign(page);
  const run = (kind, fn) => page.evaluate(([kind, fn]) => {
    const u = window.__underflow; u.beginSector(1); u.startRide(); u.setState({ health: 1e6, autopilot: true, regrouped: true }); u.step(20);
    const R = window.__ride; R.omen(kind);
    const held = R.director.holding;
    const res = new Function('u', 'R', fn)(u, R);
    return { held, ...res };
  }, [kind, fn]);
  // Habits on the raft (ai/habits.js RAFT_ANSWERS): what you have been doing weights which omen comes; a hard fight
  // holds them off.
  const hb = await page.evaluate(() => { const u = window.__underflow;
    u.beginSector(1); u.startRide(); u.setState({ health: 1e6 }); u.sim(2);
    const R = window.__ride;
    const kinds = ['lights', 'platform', 'footsteps', 'rub', 'beneath'];
    const top = () => { const w = R.omenWeights(kinds); return kinds[w.indexOf(Math.max(...w))]; };
    u.hold('x', true); u.sim(300); u.hold('x', false);
    const scan = { h: +R.habits.h.scanning.toFixed(2), top: top() };
    const t0 = R.habits.h.scanning;
    u.hold('s', true); for (let k = 0; k < 10; k++) u.sim(30); u.hold('s', false);
    const slow = { lingering: +R.habits.h.lingering.toFixed(2), scanning: +R.habits.h.scanning.toFixed(2), top: top() };
    // Hurt: the next omen waits longer.
    const rec0 = R.habits.recovery();
    u.setState({ health: u.state.health - 60 }); u.sim(2);
    const rec1 = R.habits.recovery();
    return { scan, slow, faded: R.habits.h.scanning < t0, rec0: +rec0.toFixed(2), rec1: +rec1.toFixed(2) }; });
  check('on the raft, looking back a lot makes the omens behind and above you the likeliest; holding still makes the slow ones likeliest', ['lights', 'footsteps'].includes(hb.scan.top) && hb.scan.h > 0.5 && ['rub', 'beneath'].includes(hb.slow.top) && hb.faded, JSON.stringify(hb));
  check('after the raft is hurt the next omen waits longer', hb.rec1 > hb.rec0 + 0.5, JSON.stringify(hb));
  // The learned tell on the raft (ai/attendant.js createLearning): shove three swelling Blooms back, and the next one
  // to swell leans into the shove (it breathes in twice, the first time is captioned); shooting is the answer.
  const lt = await page.evaluate(() => { const u = window.__underflow;
    u.beginSector(2); u.startRide(); u.setState({ health: 1e6 }); u.sim(2);
    const R = window.__ride;
    const put = () => { for (const b of R.blooms) b.active = false; const b = R.blooms.find((x) => !x.active);
      Object.assign(b, { active: true, dying: 0, hp: 5, noticed: true, flinch: 0, stagger: 0, warned: false, heavy: false, lunged: false, goal: null, spitter: false, rear: false, retreat: false, pos: R.track.lateral(R.s + 3.2, R.offset, 1.2) }); return b; };
    const out = { shoves: [] };
    for (let k = 0; k < 4; k++) {
      const b = put(); u.sim(1); // close enough to be swelling
      const warned = b.warned, heavy = b.heavy;
      const d0 = Math.hypot(b.pos[0] - R.eye[0], b.pos[1] - R.eye[1], b.pos[2] - R.eye[2]);
      R.shove(); for (let j = 0; j < 12; j++) u.sim(1); // shoves have a short cooldown
      out.shoves.push({ warned, heavy, flinched: b.flinch > 0 || b.stagger > 0 });
    }
    out.learned = R.learning.s.spent; out.caption = document.getElementById('caption').textContent;
    for (const b of R.blooms) b.active = false;
    return out; });
  check('on the raft, after three swelling Blooms are shoved back, the next one leans into the shove; it is captioned', lt.shoves.length === 4 && lt.shoves.slice(0, 3).every((x) => x.warned && !x.heavy && x.flinched) && lt.shoves[3].warned && lt.shoves[3].heavy && !lt.shoves[3].flinched && lt.learned && /does not flinch/.test(lt.caption), JSON.stringify(lt));
  let r = await run('lights', `let darkSeen = false; for (let k = 0; k < 120; k++) { u.step(5); if (R.omenState?.stage === 'dark') darkSeen = true; if (!R.omenState) break; } return { darkSeen, ended: !R.omenState };`);
  check('lights die toward the raft, then return; the director holds', r.held && r.darkSeen && r.ended, JSON.stringify(r));
  r = await run('platform', `u.setState({ health: 100 }); for (let k = 0; k < 40; k++) { u.step(5); if (!R.omenState) break; } return { health: u.state.health, ended: !R.omenState };`);
  check('the platform crashes and its wave hits an unbraced raft', r.held && r.health < 100 && r.ended, JSON.stringify(r));
  r = await run('footsteps', `for (let k = 0; k < 80; k++) { u.step(5); if (!R.omenState) break; } return { ended: !R.omenState };`);
  check('footsteps above keep pace, then stop', r.held && r.ended, JSON.stringify(r));
  r = await run('beneath', `u.hold('c', true); u.hold('d', true); for (let k = 0; k < 90; k++) { u.step(5); if (!R.omenState) break; } u.hold('c', false); u.hold('d', false); return { ended: !R.omenState, grab: !!R.coop.crewGrab };`);
  check('braced at the shallow edge, the thing under the raft lets go', r.held && r.ended && !r.grab, JSON.stringify(r));
  r = await run('beneath', `u.setState({ autopilot: true }); for (let k = 0; k < 140; k++) { u.step(5); if (!R.omenState) break; } return { ended: !R.omenState, grab: !!R.coop.crewGrab };`);
  check('ignored, it takes a crewmate (the ordinary rescue follows)', r.ended && r.grab, JSON.stringify(r));

  await finish(browser, errors);
})();
