// The raft's arcade layer: a line of service tokens draws the line and pays FULL LINE when all are taken;
// the facility's drops (double flow, full cell, max pressure, system purge) do what they say when driven
// through or shot; the Attendant offers one optional assessment a sector and pays when it is passed.
const { open, newCampaign, check, finish } = require('./lib.cjs');
(async () => {
  const { browser, page, errors } = await open({ width: 800, height: 450 });
  await newCampaign(page);
  const ride = () => page.evaluate(() => { const u = window.__underflow; u.beginSector(0); u.startRide(); u.setState({ health: 1e6, drift: 0 }); u.step(30); return true; });
  await ride();
  let r = await page.evaluate(() => { const u = window.__underflow, R = window.__ride; R.tokenCool = 0; u.step(2);
    const n = R.tokens.filter((t) => t.active).length; const credit0 = u.state.credit || 0, lines0 = u.state.tally.awards.line || 0;
    for (let k = 0; k < 900 && R.tokens.some((t) => t.active); k++) { const next = R.tokens.filter((t) => t.active).sort((a, b) => a.s - b.s)[0]; if (next) R.offset = next.lane; u.setState({ health: 1e6, drift: 0, sitting: false }); u.step(1); }
    return { n, credit: (u.state.credit || 0) - credit0, lines: (u.state.tally.awards.line || 0) - lines0 }; });
  check('a token line appears, and taking all of it is a FULL LINE', r.n === 7 && r.lines === 1 && r.credit >= 35, JSON.stringify(r));

  r = await page.evaluate(() => { const u = window.__underflow, R = window.__ride; const out = {};
    R.spawnDrop('double'); u.step(1); out.active = R.drop.active; out.shot = R.hitTarget('drop'); out.doubleT = u.state.doubleT;
    const s0 = u.state.score, f = u.state.flow; u.events.score(100, 'ENTITY DISPERSED'); out.paid = u.state.score - s0; out.expected = Math.round(100 * f * 2 / 5) * 5;
    u.setState({ chambers: { left: 40, right: 100, bow: 55, stern: 100 } }); R.spawnDrop('pressure'); R.hitTarget('drop'); out.left = u.state.chambers.left; out.bow = u.state.chambers.bow;
    u.setState({ charge: 1, cells: 0 }); R.spawnDrop('cell'); R.hitTarget('drop'); out.charge = u.state.charge >= u.state.maxCharge; out.cells = u.state.cells;
    const live = R.blooms.filter((b) => !b.active).slice(0, 3); for (const b of live) Object.assign(b, { active: true, dying: 0, hp: 2, pos: [R.eye[0], R.eye[1], R.eye[2] - 6] }); out.before = R.blooms.filter((b) => b.active && !b.dying).length;
    R.spawnDrop('purge'); R.hitTarget('drop'); out.after = R.blooms.filter((b) => b.active && !b.dying).length;
    return out; });
  check('DOUBLE FLOW pays twice; MAX PRESSURE fills the chambers; FULL CELL tops up the tool', r.active && r.shot && r.doubleT > 25 && r.paid === r.expected && r.left === 100 && r.bow === 100 && r.charge && r.cells === 1, JSON.stringify(r));
  check('SYSTEM PURGE clears what is in the channel', r.before >= 3 && r.after === 0, JSON.stringify({ before: r.before, after: r.after }));

  await ride();
  r = await page.evaluate(() => { const u = window.__underflow, R = window.__ride; u.setState({ assessed: {}, flow: 1 }); R.assessAt = 0; u.step(3);
    const a = R.assess; if (!a) return { none: true };
    const credit0 = u.state.credit || 0, s0 = u.state.score;
    // Whatever was asked, do it.
    if (a.id === 'flow') u.setState({ flow: 3.2 });
    else if (a.id === 'lines') { u.events.award('gate'); u.events.award('gate'); }
    else { for (let k = 0; k < 600 && !a.done; k++) { u.setState({ health: 1e6, drift: 0, sitting: false, raft: 100, chambers: { left: 100, right: 100, bow: 100, stern: 100 } }); u.step(15); } }
    u.step(3);
    return { id: a.id, done: a.done, credit: (u.state.credit || 0) - credit0, score: u.state.score - s0, once: !!u.state.assessed[u.state.sectorKey] }; });
  check('the Attendant offers one assessment a sector and pays when it is passed', !r.none && r.done && r.credit >= 150 && r.score >= 1500 && r.once, JSON.stringify(r));
  await finish(browser, errors);
})();
