// Scoring: a kill pays and raises FLOW, the feed shows it, damage knocks FLOW down without resetting it, FLOW is
// frozen on foot, a hushed room keeps recording but stops talking, the Safe Room shows the debrief and the
// cabinet sells for Service Credit, and each blaster profile kicks differently.
const { open, newCampaign, check, finish } = require('./lib.cjs');
(async () => {
  const { browser, page, errors } = await open({ width: 900, height: 506 });
  await newCampaign(page);
  let r = await page.evaluate(() => { const u = window.__underflow; u.beginSector(0); u.startRide(); u.setState({ health: 1e6 }); u.step(20);
    const s0 = u.state.score, f0 = u.state.flow;
    u.events.score(100, 'ENTITY DISPERSED'); const s1 = u.state.score, f1 = u.state.flow, feed = document.getElementById('feed').textContent;
    u.events.award('save'); u.events.award('gate');
    const before = u.state.score; u.events.score(100, 'ENTITY DISPERSED'); const paid = u.state.score - before;
    u.step(2);
    return { s0, f0, s1, f1, feed, paid, flow: u.state.flow, credit: u.state.credit, rating: u.state.sectorScore, shown: !document.getElementById('score-wrap').hidden, text: document.getElementById('flow').textContent }; });
  check('a kill pays, raises FLOW and shows in the feed; FLOW multiplies the next one', r.s1 - r.s0 === 100 && r.f1 > r.f0 && /\+100/.test(r.feed) && r.paid > 100 && r.shown && /FLOW ×/.test(r.text), JSON.stringify(r));
  check('Service Credit and the signal rating are not multiplied', r.credit === 10 + 50 + 25 + 10 && r.rating === 100 + 500 + 250 + 100, JSON.stringify({ credit: r.credit, rating: r.rating }));

  r = await page.evaluate(() => { const u = window.__underflow; u.setState({ flow: 5, health: 1e6, protectT: 0 }); u.events.damage(20, 'test'); const hit = u.state.flow;
    u.setState({ flow: 5 }); u.startExplore(); u.step(300); const foot = u.state.flow; return { hit, foot }; });
  check('damage knocks FLOW down but not out; on foot it is frozen', r.hit < 5 && r.hit > 2.5 && r.foot === 5, JSON.stringify(r));

  r = await page.evaluate(() => { const u = window.__underflow; u.enterSafeRoom(); u.step(2);
    const d = document.querySelector('.debrief'); const rows = [...document.querySelectorAll('.debrief-row')].map((x) => x.textContent);
    const grade = document.querySelector('.debrief-grade b')?.textContent, verdict = document.querySelector('.debrief-verdict')?.textContent || '';
    u.setState({ credit: 300 }); const cab = document.querySelector('.cabinet'); const before = u.state.dressings;
    return { has: !!d, rows: rows.length, grade, verdict: /THE ATTENDANT/.test(verdict), cab: !!cab, before }; });
  check('the Safe Room shows the sector debrief with a grade and the Attendant\'s verdict', r.has && r.rows >= 6 && /^[SABCD]$/.test(r.grade || '') && r.verdict, JSON.stringify(r));
  r = await page.evaluate(() => { const u = window.__underflow; u.enterSafeRoom(); u.setState({ credit: 300 }); u.enterSafeRoom(); u.step(1);
    const b = [...document.querySelectorAll('.cabinet .choice')]; const dress = b.find((x) => /DRESSING/.test(x.textContent)), patch = b.find((x) => /PATCH/.test(x.textContent));
    const before = u.state.dressings || 0; const patchDisabled = patch.disabled; dress.click();
    return { bought: (u.state.dressings || 0) - before, credit: u.state.credit, patchDisabled, head: document.querySelector('.cabinet p').textContent }; });
  check('the emergency cabinet sells for Service Credit and refuses what you cannot afford', r.bought === 1 && r.credit === 0 && r.patchDisabled, JSON.stringify(r));

  r = await page.evaluate(() => { const u = window.__underflow; u.setState({ credit: 200, lostClaimed: null }); u.enterSafeRoom(); u.step(1);
    const lf = document.querySelector('.cabinet .lost-found'); const snap = () => JSON.stringify([u.state.dressings, u.state.cells, u.state.filters, u.state.patchKits, u.state.canisters || 0]);
    const before = snap(), was = lf.disabled; lf.click();
    return { was, credit: u.state.credit, got: u.state.lastLost, tag: document.querySelector('.lost-tag').textContent, closed: lf.disabled && /CLOSED/.test(lf.textContent), changed: snap() !== before }; });
  check('the Lost & Found returns one item per visit for credit, and says what it was', !r.was && [50, 350].includes(r.credit) && !!r.got && /RETURNED TO GUEST/.test(r.tag) && r.closed && (r.changed || r.got === 'sock' || r.got === 'refund'), JSON.stringify(r));

  r = await page.evaluate(() => { const u = window.__underflow; u.beginSector(0); u.startRide(); u.step(5); const c = document.querySelector('canvas');
    const w0 = c.width; const k = u.setResScale(0.5); u.step(1); const w1 = c.width; u.setResScale(1); u.step(1);
    const fx = u.rumble('scatter'); return { w0, w1, w2: c.width, k, fx }; });
  check('the render scale can be lowered and restored without rebuilding the scene; a shot asks for its own rumble', r.k === 0.5 && r.w1 < r.w0 * 0.6 && r.w2 === r.w0 && r.fx && r.fx.strongMagnitude > 0.9, JSON.stringify(r));

  r = await page.evaluate(() => { const u = window.__underflow; u.beginSector(0); u.startExplore(); u.step(5); const E = window.__explore;
    E.player.pos = [E.raftPos[0] + 1, 0, E.raftPos[2]]; u.step(2); const prompt = document.body.innerText.match(/Leave early[^\n]*/)?.[0] || '';
    u.press('e'); u.step(2); const early = !!u.state.early?.[u.state.sectorKey], mode = u.mode;
    const left = JSON.parse(localStorage.getItem('underflow-facility') || '{}').sectors?.[u.state.sectorKey]?.left || 0;
    u.enterSafeRoom(); u.step(1);
    return { left, prompt, early, mode, row: !!document.querySelector('.debrief-row.early'), grade: document.querySelector('.debrief-grade b')?.textContent, verdict: document.querySelector('.debrief-verdict')?.textContent || '' }; });
  check('boarding with the circuit dark is an early extraction: the prompt says what it costs, and the debrief records it', /grade capped/.test(r.prompt) && r.left === 1 && r.early && r.mode === 'ride' && r.row && /[BCD]/.test(r.grade || '') && /left before/.test(r.verdict), JSON.stringify(r));

  r = await page.evaluate(() => { const u = window.__underflow; u.setState({ variants: { 0: { left: 1, notes: [] } } }); u.beginSector(0); u.startExplore(); u.step(3); const E = window.__explore;
    return { kept: E.remembered.some((x) => /STOPPED HERE/.test(x.cap)) }; });
  check('next expedition the dock you left early has kept your place', r.kept, JSON.stringify(r));

  r = await page.evaluate(async () => { const m = await import('/src/blaster.js'); const F = m.FEEL; return { scatter: F.scatter.kick, pulse: F.pulse.kick, rep: F.repeater.walk, recS: F.scatter.rec, recP: F.pulse.rec }; });
  check('each blaster profile has its own kick: Scatter shoves and recovers slowly, Pulse is sharp, the Repeater rattles', r.scatter > r.pulse * 3 && r.recS < r.recP && r.rep > 0, JSON.stringify(r));

  r = await page.evaluate(() => { const u = window.__underflow; u.beginSector(0); u.startRide(); u.setState({ health: 1e6 }); u.step(30); const R = window.__ride;
    const before = u.state.tally.awards.landing || 0; u.press(' '); u.step(1); let air = 0; for (let k = 0; k < 80; k++) { u.step(1); } 
    return { landed: (u.state.tally.awards.landing || 0) - before, hop: true }; });
  check('a hop that comes down clean is scored', r.landed === 1, JSON.stringify(r));
  await finish(browser, errors);
})();
