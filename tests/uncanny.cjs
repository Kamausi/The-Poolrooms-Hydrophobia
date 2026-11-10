// Helm, architecture and borrowed behaviour: a crewmate takes the helm and gives it back when you steer; round
// columns push you out; the Lifeguard does its ladder rounds, including the ladder that is not there, and stops
// when it sees you; something performs a crewmate's habit and is gone when you walk up to it.
const { open, newCampaign, check, finish } = require('./lib.cjs');
(async () => {
  const { browser, page, errors } = await open({ width: 800, height: 450 });
  await newCampaign(page);
  let r = await page.evaluate(() => { const u = window.__underflow; u.beginSector(1); u.startRide(); u.setState({ health: 1e6, regrouped: true, crewState: { dez: 'ok', tubs: 'ok', june: 'ok' } }); u.step(20);
    u.press('y'); u.step(3); const helm = u.state.helm, label = document.getElementById('helm').textContent;
    u.hold('d', true); u.step(20); u.hold('d', false); u.step(2);
    return { helm, label, after: u.state.helm, label2: document.getElementById('helm').textContent }; });
  check('a crewmate takes the helm, the HUD names them, and steering hard takes it back', !!r.helm && r.label.includes(r.helm.toUpperCase()) && !r.after && /YOU/.test(r.label2), JSON.stringify(r));

  r = await page.evaluate(() => { const u = window.__underflow; let best = null;
    for (const i of [0, 1, 2]) { u.beginSector(i); u.startRide(); u.startExplore(); u.setState({ health: 1e6 }); u.step(2); const E = window.__explore; if (E.columns.length) { best = i; break; } }
    const E = window.__explore; const c = E.columns[0]; if (!c) return { none: true };
    E.player.pos = [c.x + 0.1, 0, c.z]; u.step(2);
    return { sector: best, columns: E.columns.length, d: Math.hypot(E.player.pos[0] - c.x, E.player.pos[2] - c.z), r: c.r }; });
  check('round columns stand in the room and push you out', !r.none && r.d >= r.r + 0.4, JSON.stringify(r));

  r = await page.evaluate(() => { const u = window.__underflow; u.beginSector(1); u.startRide(); u.startExplore(); u.setState({ health: 1e6 }); u.step(3);
    const E = window.__explore, L = E.lifeguard; if (!L || L.ladders.length < 2) return { none: true, ladders: L?.ladders.length };
    // Keep well away and out of the way while it works.
    const far = E.find('.').map(([x, z]) => E.center(x, z)).sort((a, b) => Math.hypot(b[0] - L.base[0], b[2] - L.base[2]) - Math.hypot(a[0] - L.base[0], a[2] - L.base[2]))[0];
    L.roundsT = 0; const states = new Set(); let acted = 0, maxIdx = 0;
    for (let k = 0; k < 1500 && !(states.has('rounds') && L.state === 'watching'); k++) { E.player.pos = [far[0], 0, far[2]]; L.blind = 0.5; u.step(2); states.add(L.state); if (L.act > 4.2) acted++; maxIdx = Math.max(maxIdx, L.idx); }
    return { states: [...states], acted, maxIdx, ladders: L.ladders.length, missing: L.ladders.filter((l) => l.missing).length, violations: L.violations }; });
  check('the Lifeguard does its ladder rounds, the missing ladder included, and returns to the chair', r.none || (r.states.includes('rounds') && r.acted > 0 && r.maxIdx >= r.ladders && r.missing === 1 && r.violations === 0), JSON.stringify(r));

  r = await page.evaluate(() => { const u = window.__underflow, E = window.__explore, L = E.lifeguard; if (!L || L.ladders.length < 2) return { none: true };
    L.state = 'rounds'; L.idx = 0; L.act = 2; L.blind = 0; const lad = L.ladders[0]; L.pos = [...lad.stand]; L.look = lad.yaw; L.heading = lad.yaw;
    // Stand right in front of it.
    E.player.pos = [lad.stand[0] + Math.sin(lad.yaw) * 3, 0, lad.stand[2] + Math.cos(lad.yaw) * 3]; u.step(1); const noticed = L.state;
    for (let k = 0; k < 70; k++) { E.player.pos = [lad.stand[0] + Math.sin(lad.yaw) * 3, 0, lad.stand[2] + Math.cos(lad.yaw) * 3]; u.step(1); }
    return { noticed, then: L.state }; });
  check('in front of it on its rounds, it stops, then comes for you', r.none || (r.noticed === 'noticed' && ['pursuit', 'grab', 'search'].includes(r.then)), JSON.stringify(r));

  r = await page.evaluate(() => { const u = window.__underflow, E = window.__explore;
    const far = E.find('.').map(([x, z]) => E.center(x, z)).sort((a, b) => Math.hypot(b[0] - E.player.pos[0], b[2] - E.player.pos[2]) - Math.hypot(a[0] - E.player.pos[0], a[2] - E.player.pos[2]))[0];
    E.marcoAct = { t: 0, who: 'TUBS', at: [far[0], 0, far[2]], said: false }; u.step(30); const showing = !!E.marcoAct;
    E.player.pos = [far[0] + 2, 0, far[2]]; u.step(3);
    return { showing, gone: !E.marcoAct }; });
  check('something performs a crewmate\'s habit, and is gone when you walk up to it', r.showing && r.gone, JSON.stringify(r));
  await finish(browser, errors);
})();
