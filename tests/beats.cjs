// The reference chapter's sequence (chapterbeats.js): false safety, mastery, suspicion, escalation, compromised
// safety. Each beat is checked for what it allows: no escalation and no omens at first, threats but no omens in
// mastery, the Attendant honest until suspicion, a crescendo when escalation begins, and the safe dock compromised.
const { open, check, finish } = require('./lib.cjs');
(async () => {
  const { browser, page, errors } = await open({ width: 640, height: 360 });
  await page.click('#start-exp'); await page.click('#chapter'); await page.waitForTimeout(500);
  const r = await page.evaluate(() => { const u = window.__underflow, R = window.__ride, out = {};
    u.setState({ health: 1e6, drift: 0 }); u.sim(30);
    out.start = { beat: u.state.chapterBeat, holding: R.director.holding, omenCool: R.omenCool, phase: R.director.phase };
    u.state.chapterT = 130; u.sim(60);
    out.mastery = { beat: u.state.chapterBeat, holding: R.director.holding, omenCool: R.omenCool };
    // On foot: the Attendant stays honest until suspicion, however much it is trusted.
    u.startExplore(); u.setState({ health: 1e6, drift: 0 }); u.sim(2);
    const E = window.__explore, A = E.attendant;
    const issue = () => { const ls = []; for (let k = 0; k < 12; k++) { A.trust = 6; A.lastFalse = false; A.d = null; ls.push(E.issueDirective().lie); } A.d = null; return ls; };
    out.foot = { beat: u.state.chapterBeat, lies: issue().filter(Boolean).length, taught: !!u.state.chapterSaid?.mastery };
    // The chair: seen empty, then looked away from for long enough. Before suspicion it stays empty.
    const B = E.wavePool; B.seenEmpty = true; B.awayT = 10; u.sim(2); out.foot.chairBefore = B.seated;
    u.state.chapterT = 310; u.sim(2);
    out.suspicion = { beat: u.state.chapterBeat, lies: issue().filter(Boolean).length };
    B.seenEmpty = true; B.awayT = 10; E.player.pos[0] = E.raftPos[0] + 40; u.sim(2); out.suspicion.chair = B.seated;
    // The water decision: escalation, with a crescendo.
    E.player.pos[0] += 0; (u.state.routeMod ||= {})[u.state.sectorKey] = 'bypass';
    E.player.pos[0] = E.raftPos[0] + 40; E.player.pos[2] = E.raftPos[2] + 40; // well away from the raft
    u.sim(2);
    out.escalation = { beat: u.state.chapterBeat, phase: E.director.phase, caption: document.getElementById('caption').textContent, display: B.step, lit: B.steps.filter((q) => q.material.emission > 2).length };
    // Back to the raft after the decision: compromised.
    E.player.pos[0] = E.raftPos[0] + 6; E.player.pos[2] = E.raftPos[2]; u.sim(2);
    out.compromised = { beat: u.state.chapterBeat, flag: !!u.state.chapterCompromised };
    return out; });
  await page.waitForTimeout(3200);
  const after = await page.evaluate(() => ({ caption: document.getElementById('caption').textContent, ledger: /one place that had been safe/.test(localStorage.getItem('underflow-facility') || '') }));
  check('the chapter begins in false safety: nothing escalates and no omens', r.start.beat === 'false-safety' && r.start.holding && r.start.omenCool >= 5, JSON.stringify(r.start));
  check('mastery: the director runs (no hold) but there are still no omens', r.mastery.beat === 'mastery' && !r.mastery.holding && r.mastery.omenCool >= 5, JSON.stringify(r.mastery));
  check('the Attendant is honest before suspicion, however much it is trusted, and may lie after', r.foot.lies === 0 && r.suspicion.beat === 'suspicion' && r.suspicion.lies > 0, JSON.stringify({ foot: r.foot, suspicion: r.suspicion }));
  check('each beat has its moment: mastery teaches the rule; the chair is only found occupied from suspicion', r.foot.taught && r.foot.chairBefore === false && r.suspicion.chair === true, JSON.stringify({ foot: r.foot, suspicion: r.suspicion }));
  check('escalation runs the wave display to the end in one go', r.escalation.display === 12 && r.escalation.lit === 12, JSON.stringify(r.escalation));
  check('the water decision brings escalation, and it begins with a crescendo', r.escalation.beat === 'escalation' && ['buildup', 'peak'].includes(r.escalation.phase) && /every pump/.test(r.escalation.caption), JSON.stringify(r.escalation));
  check('going back to the raft after it, the safe dock is compromised: something is on it, and it goes in the ledger', r.compromised.beat === 'compromised' && r.compromised.flag && /on the dock|over the dock/.test(after.caption) && after.ledger, JSON.stringify({ c: r.compromised, after }));
  await finish(browser, errors);
})();
