// The Attendant holds doors (ai/attendant.js, explore.js). First a door you have opened (the code door in the
// Blacklight Pavilion): an honest lock really shuts it and opens by itself or when you are hurt; a false one leaves it
// open, and walking through is noticed. Then the boarding gate: an honest closure really blocks boarding and opens if
// you are hurt; a false one miscounts the guests and is not closed at all, and the boarding prompt says which.
const { open, check, finish, BASE } = require('./lib.cjs');
(async () => {
  const { browser, page, errors } = await open({ width: 640, height: 360 });
  await page.click('#start-exp'); await page.click('#start');
  await page.waitForTimeout(600);
  await page.evaluate(() => { document.querySelector('#modal-body .choice')?.click(); document.querySelector('#modal-actions button')?.click(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { const u = window.__underflow; u.beginSector(4); u.startRide(); u.startExplore(); u.setState({ health: 1e6 }); u.sim(2); });
  const lk = await page.evaluate(() => { const u = window.__underflow, E = window.__explore, A = E.attendant;
    E.blooms.forEach((b) => { b.active = false; });
    E.openKeypad(); u.sim(1);
    const k = E.keypads[0];
    if (!k) return { none: true };
    const kc = E.center(k.x, k.z);
    // Stand a few cells away, on dry floor.
    const dry = E.find('.').map(([x, z]) => [x, z]).filter(([x, z]) => !E.isWater(...E.center(x, z).filter((_, i) => i !== 1)));
    const far = dry.map(([x, z]) => ({ x, z, d: Math.hypot(x - k.x, z - k.z) })).filter((c) => c.d >= 2 && c.d <= 3).sort((a, b) => a.d - b.d)[0];
    const at = (x, z) => { const c = E.center(x, z); E.player.pos = [c[0], E.player.pos[1], c[2]]; };
    at(far.x, far.z); u.sim(1);
    const shown = () => k.part.matrix[13] > -100;
    const out = { near: !!E.openDoorNear() };
    let d = E.issueDirective({ kind: 'lock', lie: false }); u.sim(2);
    out.honest = { kind: d.kind, text: d.text, locked: !!E.lockCell, blocked: E.blockedAt(k.x, k.z), shown: shown() };
    // Up to the door: the prompt says it is locked.
    const side = dry.find(([x, z]) => Math.abs(x - k.x) + Math.abs(z - k.z) === 1);
    if (side) { const c = E.center(...side); E.player.pos = [c[0] + (kc[0] - c[0]) * 0.45, E.player.pos[1], c[2] + (kc[2] - c[2]) * 0.45]; u.sim(2); out.honest.prompt = E.prompts.find((p) => /DOOR LOCKED/.test(p)) || ''; at(far.x, far.z); u.sim(1); }
    for (let k2 = 0; k2 < 24; k2++) u.sim(30);
    out.honest.after = { locked: !!E.lockCell, blocked: E.blockedAt(k.x, k.z), shown: shown(), outcome: A.outcome };
    // Hurt while it holds the door: it opens at once.
    E.issueDirective({ kind: 'lock', lie: false }); u.sim(2);
    const held = !!E.lockCell;
    u.setState({ health: u.state.health - 20 }); u.sim(2);
    out.override = { held, open: !E.lockCell && !E.blockedAt(k.x, k.z) };
    // False: it says locked, the door stands open, and walking through it is noticed.
    d = E.issueDirective({ kind: 'lock', lie: true }); u.sim(2);
    out.lie = { lie: d.lie, wrongCount: d.count !== E.guestsHere(), locked: !!E.lockCell, blocked: E.blockedAt(k.x, k.z), shown: shown() };
    at(k.x, k.z); u.sim(3);
    out.lie.outcome = A.outcome; out.lie.caption = document.getElementById('caption').textContent;
    return out; });
  check('an honest lock on a door you opened really shuts it, the prompt says so, and it opens by itself', !lk.none && lk.near && lk.honest.kind === 'lock' && /code door is locked/.test(lk.honest.text) && lk.honest.locked && lk.honest.blocked && lk.honest.shown && /DOOR LOCKED/.test(lk.honest.prompt || '') && !lk.honest.after.locked && !lk.honest.after.blocked && !lk.honest.after.shown && lk.honest.after.outcome === 'complied', JSON.stringify(lk));
  check('hurt while it holds the door, the door opens at once', !lk.none && lk.override.held && lk.override.open, JSON.stringify(lk.override));
  check('a false lock miscounts the guests and leaves the door open; walking through it is noticed', !lk.none && lk.lie.lie && lk.lie.wrongCount && !lk.lie.locked && !lk.lie.blocked && !lk.lie.shown && lk.lie.outcome === 'ignored' && /never locked/.test(lk.lie.caption), JSON.stringify(lk.lie));
  // The field notes (fieldnotes.js): each of those instructions is in the pause journal's COUNTS page, what it said
  // beside how many of you there were, with nothing marked.
  const claims = await page.evaluate(() => (window.__underflow.state.claims || []).map((c) => [c.said, c.actual, c.what]));
  await page.keyboard.press('Escape'); await page.waitForTimeout(600);
  const page1 = await page.evaluate(() => { const t = [...document.querySelectorAll('.tab')].find((b) => b.textContent === 'FIELD NOTES'); t?.click();
    return { tab: !!t, head: document.querySelector('.counts .case h3')?.textContent || '', lines: [...(document.querySelector('.counts .case')?.querySelectorAll('.claim') || [])].map((p) => p.textContent) }; });
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  check('the journal\'s FIELD NOTES, by attraction (route first), list what the facility said beside how many of you there were, newest first, unmarked', claims.length >= 3 && page1.tab && /THE BLACKLIGHT PAVILION · YOU ARE HERE/.test(page1.head) && page1.lines.length === claims.length && /locked a door · there were/.test(page1.lines[0]) && claims.some(([s, a]) => s !== a) && !page1.lines.some((l) => /false|lie|wrong/i.test(l)), JSON.stringify({ claims, page1 }));
  await page.evaluate(() => { const u = window.__underflow; u.beginSector(2); u.startRide(); u.startExplore(); u.setState({ health: 1e6 }); u.sim(2); });
  // The Attendant holds the boarding gate: an honest closure really blocks boarding (and opens if you are hurt); a false
  // one is not closed, and the boarding prompt says so. Last, because boarding ends the dock.
  const g = await page.evaluate(() => { const u = window.__underflow, E = window.__explore, A = E.attendant;
    E.blooms.forEach((b) => { b.active = false; });
    u.setState({ health: 1e6 });
    E.restorePower?.(); u.sim(2);
    E.player.pos = [E.raftPos[0] + 1, E.player.pos[1], E.raftPos[2]]; u.sim(2);
    const prompt = () => E.prompts.join(' | ');
    const out = {};
    // Honest.
    let d = E.issueDirective({ kind: 'gate', lie: false }); u.sim(2);
    out.honest = { kind: d.kind, closedPrompt: /GATE CLOSED/.test(prompt()), gateT: +A.gateT.toFixed(1) };
    u.press('e'); u.sim(2);
    out.honest.stillHere = u.mode === 'explore';
    out.honest.outcome = A.outcome;
    for (let k = 0; k < 24; k++) u.sim(30);
    out.honest.reopened = A.gateT === 0 && /Board the raft/.test(prompt());
    // Hurt while it holds the gate: it opens.
    E.issueDirective({ kind: 'gate', lie: false }); u.sim(2);
    const held = A.gateT > 0;
    u.events.damage(5, 'test'); u.sim(2);
    out.override = { held, open: A.gateT === 0 };
    for (let k = 0; k < 3; k++) u.sim(30);
    // False: it says closed, the prompt says open, and you can board.
    d = E.issueDirective({ kind: 'gate', lie: true }); u.sim(2);
    out.lie = { lie: d.lie, wrongCount: d.count !== E.guestsHere(), gateT: A.gateT, openPrompt: /Board the raft/.test(prompt()) };
    u.press('e'); u.sim(3);
    out.lie.boarded = u.mode !== 'explore';
    return out; });
  check('an honest gate closure blocks boarding while the prompt says so, then opens by itself', g.honest.kind === 'gate' && g.honest.closedPrompt && g.honest.stillHere && g.honest.reopened, JSON.stringify(g.honest));
  check('hurt while the gate is held, it opens at once', g.override.held && g.override.open, JSON.stringify(g.override));
  check('a false gate closure miscounts the guests and is not closed at all: the prompt says open and you can board', g.lie.lie && g.lie.wrongCount && g.lie.gateT === 0 && g.lie.openPrompt && g.lie.boarded, JSON.stringify(g.lie));

  // On the raft (ai/attendant.js chooseRoute): before a junction it names a channel. Honest names the safest offered;
  // false names the riskiest and miscounts the raft. Each is judged by the exit the raft takes.
  const rp = await page.evaluate(() => { const u = window.__underflow;
    for (const i of [1, 2, 3, 4, 5, 6, 7]) {
      u.beginSector(i); u.startRide(); u.setState({ health: 1e6 }); u.sim(1);
      const R = window.__ride, T = R.track;
      let J = null;
      for (let s = 0, k = 0; s < T.length && k < 40 && !J; k++) { const r = T.nextRoom(s, 'pool'); if (!r) break; if (r.sec.junction) J = r; s = r.s1 + 1; }
      if (!J) continue;
      const risk = { public: 0, maintenance: 1, overflow: 2 }, routes = J.sec.exits.map((e) => e.route);
      const n0 = (u.state.claims || []).length;
      const h = R.directRoute(J, { lie: false });
      const out = { sector: i, routes, honest: { exit: h.exit, safest: risk[routes[h.exit]] <= Math.min(...routes.map((r) => risk[r])), count: h.count, noted: (u.state.claims || []).length === n0 + 1 } };
      // Ignore it: take the other exit.
      T.choices[J.sec.id] = 1 - h.exit; R.s = J.s1 + 2; u.sim(2);
      out.honest.outcome = R.raftPA.outcome; out.honest.trust = R.raftPA.trust;
      const f = R.directRoute(J, { lie: true });
      out.lie = { exit: f.exit, riskiest: risk[routes[f.exit]] >= Math.max(...routes.map((r) => risk[r])), count: f.count, guests: u.state.claims.at(-1).actual };
      // Follow it.
      T.choices[J.sec.id] = f.exit; R.s = J.s1 + 3; u.sim(2);
      out.lie.outcome = R.raftPA.outcome; out.lie.caption = document.getElementById('caption').textContent;
      return out;
    }
    return { none: true }; });
  check('on the raft the Attendant names a channel before a junction: honest is the safest offered, it is noted, and ignoring it costs nothing', !rp.none && rp.honest.safest && rp.honest.noted && rp.honest.outcome === 'ignored' && rp.honest.trust === 0, JSON.stringify(rp));
  check('a false channel names the riskiest, miscounts the raft, and following it is noticed', !rp.none && rp.lie.riskiest && rp.lie.count !== rp.lie.guests && rp.lie.outcome === 'complied' && /Nothing in the other one/.test(rp.lie.caption), JSON.stringify(rp));

  // The consequence stage (consequence.js): boarding says what was left behind and what it changes. Left dark, the
  // stretch after the dock runs on emergency light; restored, the report names the open gate. The notes keep both.
  const cq = await page.evaluate(() => { const u = window.__underflow;
    const out = {};
    for (const i of [1, 2, 3]) {
      u.beginSector(i); u.startRide(); u.startExplore(); u.setState({ health: 1e6 }); u.sim(1);
      const key = u.state.sectorKey;
      u.state.power[key] = false;
      u.events.board(); u.sim(2);
      const R = window.__ride, rep = u.state.departures?.[key];
      out.dark = { rep, range: R.darkRange };
      if (!R.darkRange) return out;
      R.s = (R.darkRange[0] + R.darkRange[1]) / 2; u.sim(1);
      const sum = () => R.gatherLights().reduce((a, l) => a + l.intensity, 0);
      const dim = sum(); const keep = R.darkRange; R.darkRange = null; const full = sum(); R.darkRange = keep;
      out.dark.ratio = dim / full;
      u.state.power[key] = true; u.startExplore(); u.sim(1); u.events.board(); u.sim(2);
      out.lit = { rep: u.state.departures[key], range: window.__ride.darkRange };
      out.toast = document.body.textContent.includes('LEFT BEHIND');
      return out;
    }
    return out; });
  check('leaving a dock dark: the crew says so and the stretch after the dock runs on emergency light (dimmer lamps)', cq.dark?.rep?.dim && /emergency light/.test(cq.dark.rep.text[0]) && cq.dark.range && cq.dark.ratio < 0.9, JSON.stringify(cq));
  check('leaving it lit: the report names the open service gate and nothing is dimmed', cq.lit && !cq.lit.rep.dim && /service gate/.test(cq.lit.rep.text[0]) && !cq.lit.range, JSON.stringify(cq.lit));
  await finish(browser, errors);
})();
