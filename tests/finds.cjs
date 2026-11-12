// Things picked up and the work lamp: a sector offers collectibles and a power-up; taking one scores, is
// written in the ledger and is not offered again; a dry thing takes Drift off you; a dry pack stops Drift
// rising out of the water; a canister fills the softest chamber on boarding; the lamp cycles, lights, drains,
// recharges at the raft, shows a dormant Bloom under UV, and draws uncommitted Blooms when left on the floor.
const { open, newCampaign, check, finish } = require('./lib.cjs');
(async () => {
  const { browser, page, errors } = await open({ width: 800, height: 450 });
  await newCampaign(page);
  const dock = (i = 2) => page.evaluate((i) => { const u = window.__underflow; u.beginSector(i); u.startRide(); u.startExplore(); u.setState({ health: 1e6 }); u.step(5); window.__explore.blooms.forEach((b) => { b.active = false; }); return window.__explore.finds.map((f) => f.type + ':' + f.id); }, i);
  const list = await dock();
  check('the dock offers two collectibles and one power-up', list.filter((x) => x.startsWith('collectible')).length === 2 && list.filter((x) => x.startsWith('powerup')).length === 1, JSON.stringify(list));

  let r = await page.evaluate(() => { const u = window.__underflow, E = window.__explore; const f = E.finds.find((x) => x.type === 'collectible');
    const s0 = u.state.score; E.player.pos = [f.pos[0] + 0.4, 0, f.pos[2]]; u.step(2); const prompt = document.getElementById('prompt').textContent; u.press('e'); u.step(2);
    return { prompt, taken: f.taken, scored: u.state.score - s0, inLedger: !!E.found[f.id], id: f.id }; });
  check('picking one up scores it and writes it in the ledger', /Pick it up/.test(r.prompt) && r.taken && r.scored >= 250 && r.inLedger, JSON.stringify(r));
  const again = await dock();
  check('what is in the ledger is not offered again', !again.includes('collectible:' + r.id), JSON.stringify(again));

  r = await page.evaluate(() => { const u = window.__underflow, E = window.__explore; const out = {};
    u.setState({ dryT: 30, drift: 10 }); const dry = E.find('.').map(([x, z]) => E.center(x, z))[3]; E.player.pos = [dry[0], 0, dry[2]]; u.step(90); out.dryDrift = u.state.drift;
    u.setState({ dryT: 0, drift: 10 }); E.player.pos = [dry[0], 0, dry[2]]; u.step(90); out.normalDrift = u.state.drift;
    u.setState({ canisters: 1, chambers: { left: 30, right: 90, bow: 90, stern: 90 }, raft: 75 }); u.events.board(); u.step(2); out.left = u.state.chambers.left; out.canisters = u.state.canisters;
    return out; });
  check('a dry pack stops Drift rising out of the water; a canister fills the softest chamber on boarding', r.dryDrift <= 10 && r.normalDrift > 10 && r.left === 100 && r.canisters === 0, JSON.stringify(r));

  await dock();
  r = await page.evaluate(() => { const u = window.__underflow, E = window.__explore; const far = E.find('.').map(([x, z]) => E.center(x, z)).sort((a, b) => Math.hypot(b[0] - E.raftPos[0], b[2] - E.raftPos[2]) - Math.hypot(a[0] - E.raftPos[0], a[2] - E.raftPos[2]))[0];
    E.player.pos = [far[0], 0, far[2]]; u.setState({ lamp: { charge: 100, mode: 0 } }); u.step(2);
    const n0 = E.lights().length; u.press('l'); u.step(2); const n1 = E.lights().length, mode1 = u.state.lamp.mode;
    u.step(120); const drained = u.state.lamp.charge; u.press('l'); u.step(2); const mode2 = u.state.lamp.mode;
    // Under UV a dormant Bloom on the floor shows.
    const b = E.spawnBloom([far[0] + 5, 0.07, far[2]], true); u.step(2); const glow = b.core.material.emission;
    u.press('k'); u.step(2); const placed = !!E.lampPlaced;
    E.player.pos = [E.raftPos[0] + 1, 0, E.raftPos[2]]; u.step(2); const before = u.state.lamp.charge;
    u.press('k'); u.step(1); const stillPlaced = !!E.lampPlaced;
    return { n0, n1, mode1, drained, mode2, glow, placed, stillPlaced, status: document.getElementById('status').textContent }; });
  check('the lamp cycles off, white, UV; it is a light, it drains, and UV shows a dormant Bloom', r.n1 === r.n0 + 1 && r.mode1 === 1 && r.drained < 100 && r.mode2 === 2 && r.glow > 0.5 && /LAMP UV/.test(r.status), JSON.stringify(r));
  check('set down, the lamp stays where you left it', r.placed && r.stillPlaced, JSON.stringify(r));

  await dock();
  r = await page.evaluate(() => { const u = window.__underflow, E = window.__explore; const cells = E.find('.').map(([x, z]) => E.center(x, z));
    const c = cells[Math.floor(cells.length / 2)]; E.player.pos = [c[0], 0, c[2]]; u.setState({ lamp: { charge: 100, mode: 1 } }); u.step(1); u.press('k'); u.step(2);
    const lamp = E.lampPlaced; if (!lamp) return { none: true };
    // You walk off; a Bloom between you and the lamp, closer to the lamp.
    const away = cells.sort((a, b) => Math.hypot(b[0] - lamp[0], b[2] - lamp[2]) - Math.hypot(a[0] - lamp[0], a[2] - lamp[2]))[0];
    E.player.pos = [away[0], 0, away[2]]; const b = E.spawnBloom([lamp[0] + 4, 1.2, lamp[2]]);
    const d0 = Math.hypot(b.pos[0] - lamp[0], b.pos[2] - lamp[2]);
    for (let k = 0; k < 60; k++) { u.setState({ health: 1e6 }); E.player.pos = [away[0], 0, away[2]]; u.step(1); }
    return { d0, d1: Math.hypot(b.pos[0] - lamp[0], b.pos[2] - lamp[2]), playerFar: Math.hypot(away[0] - lamp[0], away[2] - lamp[2]) }; });
  check('a lamp left burning draws a Bloom that has not committed to you', r.none || (r.playerFar > 8 && r.d1 < r.d0 - 1), JSON.stringify(r));
  r = await page.evaluate(() => { const u = window.__underflow; u.beginSector(0); u.startExplore(); u.step(3); const E = window.__explore;
    const c0 = E.surveyCoverage; u.press('m'); u.step(2); const el = document.getElementById('survey'); const shown = !el.hidden, text = el.textContent;
    const s0 = u.state.score; const aw0 = u.state.tally.awards.survey || 0;
    for (const [x, z] of E.surveyOpen) { u.setState({ health: 1e6, drift: 0 }); const c = E.center(x, z); E.player.pos = [c[0], 0, c[2]]; u.step(1); if (E.survey.done) break; }
    const text2 = el.textContent; u.press('m'); u.step(1);
    return { c0, shown, you: /[▲▶▼◀]/.test(text), raft: /R/.test(text.split('\n').slice(1, -1).join('')), small: text.length, grew: text2.length > text.length, c1: E.surveyCoverage, done: E.survey.done, paid: (u.state.tally.awards.survey || 0) - aw0, hidden: el.hidden }; });
  check('the survey map starts with what you can see from the dock, grows as you walk, and a full survey is scored once', r.c0 > 0 && r.c0 < 0.5 && r.shown && r.you && r.grew && r.c1 >= 0.85 && r.done && r.paid === 1 && r.hidden, JSON.stringify(r));
  r = await page.evaluate(() => { const u = window.__underflow; u.beginSector(0); u.startExplore(); u.step(3); const E = window.__explore; u.setState({ health: 1e6, drift: 0 });
    E.blooms.forEach((b) => { b.active = false; }); u.step(1); const none = E.wedges.length;
    const spot = E.find('.').map(([x, z]) => E.center(x, z)).sort((a, b) => Math.hypot(b[0] - E.raftPos[0], b[2] - E.raftPos[2]) - Math.hypot(a[0] - E.raftPos[0], a[2] - E.raftPos[2]))[3];
    E.player.pos = [spot[0], 0, spot[2]]; E.player.yaw = 0; E.player.pitch = 0; u.step(1);
    // Forward at yaw 0 is −z, so +z is behind.
    const n0 = E.blooms.length; E.spawnBloom([spot[0], 1.3, spot[2] + 1.6]); const b = E.blooms.find((x) => x.active);
    let w = []; for (let k = 0; k < 20 && !w.length; k++) { u.setState({ health: 1e6, drift: 0 }); E.player.pos = [spot[0], 0, spot[2]]; E.player.yaw = 0; u.step(1); w = E.wedges.slice(); }
    const shown = [...document.querySelectorAll('#wedges i')].filter((x) => !x.hidden).length;
    b.active = false; u.step(1);
    return { none, n: w.length, behind: w[0]?.behind, commit: b.commit, shown, cleared: E.wedges.length }; });
  check('on foot a Bloom that has committed to you from behind gets a rim marker', r.none === 0 && r.n === 1 && r.behind && r.shown === 1 && r.cleared === 0, JSON.stringify(r));
  await finish(browser, errors);
})();
