// The reference chapter end to end: arrival, diverter, docking, followers, the generator choice, the rewritten
// exit, the bay and the Safe Room.
const { open, check, finish } = require('./lib.cjs');
(async () => {
  const { browser, page, errors } = await open({ width: 1280, height: 720 });
  check('menu offers the reference chapter', await page.evaluate(() => !!document.getElementById('chapter')));
  await page.click('#chapter'); await page.waitForTimeout(500);
  const U = (f) => page.evaluate(f);
  let r = await U(() => { const u = window.__underflow, R = window.__ride; let k = 0; for (; k < 200; k++) { u.setState({ drift: 0, sitting: false, health: 1e6 }); u.step(10); if (R.wave.active && R.wave.s - R.s < 22) break; } return { wave: R.wave.active }; });
  check('arrival at the wave pool', r.wave);
  r = await U(() => { const u = window.__underflow, R = window.__ride; for (let k = 0; k < 200; k++) { u.setState({ drift: 0, sitting: false, health: 1e6 }); u.step(10); if (R.wave.divActive && R.wave.divPos) break; } const hit = R.hitTarget('diverter'); u.step(10); return { hit, landing: u.state.landing }; });
  check('diverter can be shot', !!r.hit, JSON.stringify(r));
  r = await U(() => { const u = window.__underflow; for (let k = 0; k < 400; k++) { u.setState({ drift: 0, sitting: false, health: 1e6 }); u.step(15); if (document.getElementById('prompt').textContent.includes('Moor')) break; } u.press('e'); u.step(1); u.step(60); return { mode: u.mode }; });
  check('docking sequence ends on foot', r.mode === 'explore', JSON.stringify(r));
  r = await U(() => { const u = window.__underflow, E = window.__explore; u.setState({ health: 1e6 }); u.step(20); return { kind: E.dockKind, followers: E.followers.length }; });
  check('divert dock with the crew on foot', r.kind === 'divert' && r.followers > 0, JSON.stringify(r));
  r = await U(() => { const u = window.__underflow, E = window.__explore; E.player.pos = [E.cellPos[0], 0, E.cellPos[2]]; u.step(2); u.press('e'); u.step(2); E.player.pos = [E.panelPos[0] - 1.2, 0, E.panelPos[2] - 1.2]; u.step(2); u.press('e'); u.step(1); document.querySelector('#modal-actions button').click(); u.hold('e', true); for (let i = 0; i < 8; i++) { u.setState({ health: 1e6 }); u.step(30); } u.hold('e', false); return { mod: u.state.routeMod?.[u.state.sectorKey] }; });
  check('generator choice is stored', !!r.mod, JSON.stringify(r));
  r = await U(() => { const u = window.__underflow; u.events.board(); u.step(5); const dock = u.state.ride.items.find((i) => i.type === 'pool' && i.dock); const ex = dock.exits.find((e) => e.route === 'service'); return { mode: u.mode, modded: !!ex?.modded }; });
  check('the exit is rewritten from the choice', r.mode === 'ride' && r.modded, JSON.stringify(r));
  r = await U(() => { const u = window.__underflow, R = window.__ride; u.press(' '); u.step(2); for (let k = 0; k < 500; k++) { u.setState({ drift: 0, sitting: false, health: 1e6 }); u.step(15); if (u.mode !== 'ride') break; const room = R.track.roomAt(R.s); if (room?.sec.type === 'bay' && R.s > room.s1 - 6) { u.press('e'); u.step(2); } } return { mode: u.mode, title: document.getElementById('modal-title')?.textContent }; });
  check('the chapter ends in the Safe Room', r.mode !== 'ride', JSON.stringify(r));
  await finish(browser, errors);
})();
