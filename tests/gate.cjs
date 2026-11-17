// The Attendant holds the boarding gate (ai/attendant.js, explore.js): an honest closure really blocks boarding and opens
// if you are hurt; a false one miscounts the guests and is not closed at all, and the boarding prompt says which.
const { open, check, finish, BASE } = require('./lib.cjs');
(async () => {
  const { browser, page, errors } = await open({ width: 640, height: 360 });
  await page.click('#start-exp'); await page.click('#start');
  await page.waitForTimeout(600);
  await page.evaluate(() => { document.querySelector('#modal-body .choice')?.click(); document.querySelector('#modal-actions button')?.click(); });
  await page.waitForTimeout(300);
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
  await finish(browser, errors);
})();
