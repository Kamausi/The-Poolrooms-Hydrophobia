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
