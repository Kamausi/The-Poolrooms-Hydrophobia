// Omens on foot: the service door can be held shut (it stops pushing, and is open later with wet prints)
// or, left alone, it gives and Blooms come through; lights go out toward you and come back.
const { open, newCampaign, check, finish } = require('./lib.cjs');
(async () => {
  const { browser, page, errors } = await open({ width: 800, height: 450 });
  await newCampaign(page);
  const dock = () => page.evaluate(() => { const u = window.__underflow; u.beginSector(2); u.startRide(); u.startExplore(); u.setState({ health: 1e6, regrouped: true }); u.step(5); return !!window.__explore.door; });
  check('the dock has a service door', await dock());
  let r = await page.evaluate(() => { const u = window.__underflow, E = window.__explore;
    E.omen('forced'); const held = E.director.holding;
    E.player.pos = [E.door.hinge[0] + E.door.n[0] * 0.8 + E.door.t[0] * 0.45, 0, E.door.hinge[2] + E.door.n[2] * 0.8 + E.door.t[2] * 0.45];
    u.hold('e', true); for (let k = 0; k < 60; k++) { u.step(5); if (!E.omenState) break; } u.hold('e', false);
    return { held, ended: !E.omenState, angle: E.door.angle, blooms: E.blooms.filter((b) => b.active).length, reopen: E.door.reopenAt > 0 }; });
  check('held shut, the door stops pushing and will be found open later', r.ended && r.angle === 0 && r.reopen, JSON.stringify(r));
  await dock();
  r = await page.evaluate(() => { const u = window.__underflow, E = window.__explore; const before = E.blooms.filter((b) => b.active).length;
    E.omen('forced'); E.player.pos = [E.door.hinge[0] + E.door.n[0] * 6, 0, E.door.hinge[2] + E.door.n[2] * 6];
    for (let k = 0; k < 120; k++) { u.step(5); if (!E.omenState) break; }
    return { angle: E.door.angle, more: E.blooms.filter((b) => b.active).length - before }; });
  check('left alone, the door gives and something comes through', r.angle >= 1.1 && r.more >= 1, JSON.stringify(r));
  await dock();
  r = await page.evaluate(() => { const u = window.__underflow, E = window.__explore; E.omen('lights'); let outSeen = 0;
    for (let k = 0; k < 120; k++) { u.step(5); outSeen = Math.max(outSeen, E.lamps.filter((l) => l.out).length); if (!E.omenState) break; }
    return { outSeen, back: E.lamps.every((l) => !l.out), ended: !E.omenState }; });
  check('lights go out toward you, then come back', r.outSeen > 0 && r.back && r.ended, JSON.stringify(r));
  await finish(browser, errors);
})();
