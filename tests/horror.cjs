// The reactive horror layer on foot: the omens read what you have been doing (ai/habits.js), an authored silence stops
// the machinery and brings nothing with it, sounds through a wall come out muffled, and ?debug=ai says what every
// entity believes.
const { open, newCampaign, check, finish, BASE } = require('./lib.cjs');
(async () => {
  const { browser, page, errors } = await open({ width: 800, height: 450 });
  await page.goto(`${BASE}/?quality=low&debug=ai`);
  await page.waitForFunction(() => !!window.__underflow, null, { timeout: 120000 });
  await page.click('#start-exp'); await page.click('#start'); // a real click starts the audio context
  await page.waitForTimeout(600);
  await page.evaluate(() => { document.querySelector('#modal-body .choice')?.click(); document.querySelector('#modal-actions button')?.click(); });
  await page.waitForTimeout(300);
  const r = await page.evaluate(async () => { const u = window.__underflow, sound = u.sound; // the game's own instance (an import here can get a separate copy after a dev-server reload)
    u.beginSector(2); u.startRide(); u.startExplore(); u.setState({ health: 1e6 }); u.step(2);
    const E = window.__explore;
    // Scanning for a while is noticed.
    const scan0 = E.habits.h.scanning;
    for (let k = 0; k < 90; k++) { u.hold('q', true); u.step(1); }
    u.hold('q', false);
    const scanned = E.habits.h.scanning;
    // Silence: the machinery stops, nothing spawns, it ends by itself.
    const active0 = E.blooms.filter((b) => b.active).length, viol0 = E.lifeguard?.violations || 0, hold0 = E.director.holding;
    for (let k = 0; k < 120 && E.director.phase !== 'relax'; k++) u.step(30); // omens only start when it is calm
    E.blooms.forEach((b) => { if (b.active && !b.dormant) b.active = false; });
    const activeQuiet = E.blooms.filter((b) => b.active).length;
    E.startFomen('silence'); u.step(3);
    const silent = sound.silent, during = E.fomen?.kind;
    for (let k = 0; k < 19; k++) u.step(30);
    const spawnedDuring = E.blooms.filter((b) => b.active).length - activeQuiet, stillSilent = sound.silent, viol = (E.lifeguard?.violations || 0) - viol0, rule = E.lifeguard?.rule;
    for (let k = 0; k < 11; k++) u.step(30);
    const after = { fomen: E.fomen?.kind || null, spawnedDuring, viol, rule, stillSilent, silentAfter: sound.silent };
    // Occlusion: a whistle from behind a wall is filtered; one in plain sight is not.
    const st0 = sound.spatialStats.occludedMade;
    sound.occluded(1, () => sound.whistle(0.4));
    const occluded = sound.spatialStats.occludedMade - st0;
    sound.occluded(0, () => sound.whistle(0.4));
    const clear = sound.spatialStats.occludedMade - st0 - occluded;
    u.step(10);
    const view = document.getElementById('ai-debug')?.textContent || '';
    return { scan0: +scan0.toFixed(2), scanned: +scanned.toFixed(2), silent, during, after, occluded, clear, view: view.split('\n').slice(0, 3) }; });
  check('scanning on foot is noticed by the omens', r.scanned > r.scan0 + 0.3, JSON.stringify({ scan0: r.scan0, scanned: r.scanned }));
  check('an authored silence stops the machinery, brings nothing with it, and ends by itself', r.silent && r.during === 'silence' && r.after.stillSilent && r.after.fomen !== 'silence' && !r.after.silentAfter && r.after.spawnedDuring <= 0, JSON.stringify({ silent: r.silent, during: r.during, ...r.after }));
  check('a sound from behind a wall comes out muffled; one in plain sight does not', r.occluded > 0 && r.clear === 0, JSON.stringify({ occluded: r.occluded, clear: r.clear }));
  check('?debug=ai shows what the director, the player habits and each entity are doing', /DIRECTOR/.test(r.view[0] || '') && /PLAYER/.test(r.view[1] || ''), JSON.stringify(r.view));

  // The Attendant acts (ai/attendant.js): honest instructions are safe to follow; a false one gets the guest count
  // wrong, and following it costs you; ignoring it costs nothing.
  const a = await page.evaluate(() => { const u = window.__underflow, E = window.__explore;
    u.setState({ health: 1e6 });
    const words = ['no', 'one', 'two', 'three', 'four', 'five', 'six'];
    const stayFor = (s) => { const p = [...E.player.pos]; for (let k = 0; k < s; k++) { E.player.pos = [...p]; u.step(30); } };
    const out = {};
    // Honest wait, followed.
    let d = E.issueDirective({ kind: 'wait', lie: false });
    out.honestText = d.text.toLowerCase().startsWith(words[E.guestsHere()]);
    const omen0 = E.lastOmen;
    stayFor(12);
    out.honest = { outcome: E.attendant.outcome, trust: E.attendant.trust, omen: E.lastOmen !== omen0 && E.lastOmen === 'lights' };
    // False wait, followed: the lights go.
    for (let k = 0; k < 40 && E.fomen; k++) u.step(30);
    d = E.issueDirective({ kind: 'wait', lie: true });
    out.lieCount = d.count !== E.guestsHere();
    stayFor(12);
    out.lie = { outcome: E.attendant.outcome, omen: E.fomen?.kind || null, trust: E.attendant.trust };
    // False wait, ignored: nothing happens to you.
    for (let k = 0; k < 40 && E.fomen; k++) u.step(30);
    d = E.issueDirective({ kind: 'wait', lie: true });
    const caught0 = E.attendant.caught;
    E.player.pos = [E.player.pos[0] + 0.1, E.player.pos[1], E.player.pos[2]];
    const p = [...E.player.pos];
    const free = E.find('.').map(([x, z]) => E.center(x, z)).find((c) => Math.hypot(c[0] - p[0], c[2] - p[2]) > 4 && Math.hypot(c[0] - p[0], c[2] - p[2]) < 8);
    E.player.pos = [free[0], p[1], free[2]]; u.step(2);
    out.ignored = { outcome: E.attendant.outcome, caught: E.attendant.caught - caught0, omen: E.fomen?.kind || null };
    // False proceed, followed: something waits there.
    for (let k = 0; k < 40 && E.fomen; k++) u.step(30);
    E.blooms.forEach((b) => { if (!b.dormant) b.active = false; }); // a free Bloom for it to send
    d = E.issueDirective({ kind: 'proceed', lie: true });
    const b0 = E.blooms.filter((b) => b.active).length;
    E.player.pos = [d.pos[0], E.player.pos[1], d.pos[2]]; u.step(2);
    out.proceed = { kind: d.kind, outcome: E.attendant.outcome, spawned: E.blooms.filter((b) => b.active).length - b0, named: /the (north|south|east|west) gallery/.test(d.text) };
    return out; });
  check('an honest instruction has the right guest count, and following it is safe', a.honestText && a.honest.outcome === 'complied' && a.honest.trust === 1 && !a.honest.omen, JSON.stringify(a.honest));
  check('a false instruction gets the guest count wrong, and waiting as told puts the lights out', a.lieCount && a.lie.outcome === 'complied' && a.lie.omen === 'lights' && a.lie.trust === 0, JSON.stringify(a.lie));
  check('ignoring a false instruction costs nothing', a.ignored.outcome === 'ignored' && a.ignored.caught === 1 && a.ignored.omen === null, JSON.stringify(a.ignored));
  check('going where a false instruction sent you finds something waiting there', a.proceed.kind === 'proceed' && a.proceed.outcome === 'complied' && a.proceed.spawned >= 1 && a.proceed.named, JSON.stringify(a.proceed));

  // Learned behaviour: after the burst tell has been dodged three times, one Bloom keeps coming while it swells.
  const l = await page.evaluate(() => { const u = window.__underflow, E = window.__explore;
    const trial = (learned) => {
      E.blooms.forEach((b) => { b.active = false; });
      E.learning.s.stepAways = learned ? 3 : 0; E.learning.s.spent = false;
      const free = E.find('.').map(([x, z]) => E.center(x, z)).filter((c) => !E.isWall(...E.cellOf(c[0] + 8, c[2])) && !E.isWall(...E.cellOf(c[0] + 4, c[2])));
      const c = free[Math.floor(free.length / 2)];
      E.player.pos = [c[0], E.player.pos[1], c[2]]; E.player.yaw = 0;
      u.setState({ health: 1000 }); u.step(1);
      const b = E.spawnBloom([c[0] - 0.9, 1.3, c[2]], false); b.lunge = 0;
      let creep = false, swelled = false, health0 = 0;
      // Walk away at walking pace from the moment it starts to swell; judge by how that one wind-up ends.
      for (let k = 0; k < 90; k++) {
        if (b.windup) { if (!swelled) health0 = window.__underflow.state.health; swelled = true; E.player.pos = [E.player.pos[0] + 4.2 / 30, E.player.pos[1], E.player.pos[2]]; }
        else if (swelled) break;
        u.step(1); creep ||= !!b.creep;
      }
      return { creep, swelled, burst: !b.active, hurt: +(health0 - window.__underflow.state.health).toFixed(1) };
    };
    return { plain: trial(false), learned: trial(true), burst: E.burstDamage }; });
  check('a Bloom swelling to burst holds still, so walking away from it is safe', l.plain.swelled && !l.plain.creep && !l.plain.burst && l.plain.hurt < l.burst, JSON.stringify(l.plain));
  check('once that is learned, one Bloom keeps coming while it swells, and walking away no longer works', l.learned.creep && l.learned.burst && l.learned.hurt >= l.burst, JSON.stringify(l.learned));

  // The Observer (ai/observer.js): watches from where you cannot reach it, moves when the line of sight breaks, never
  // attacks.
  const o = await page.evaluate(() => { const u = window.__underflow, E = window.__explore, W = E.watcher;
    E.blooms.forEach((b) => { b.active = false; });
    E.floaters.forEach((f) => { f.state = 'gone'; }); // the hall's other things stay out of this check
    const hurts = {}; const dmg = u.events.damage; u.events.damage = (n, why, ...rest) => { hurts[why] = (hurts[why] || 0) + n; return dmg.call(u.events, n, why, ...rest); };
    u.setState({ health: 1000 }); u.step(1);
    const shown = () => E.watcherFig.all.some((p) => p.matrix[13] > -100);
    const head = () => [W.at[0], W.at[1] + 1.65, W.at[2]];
    const dry = E.find('.').map(([x, z]) => E.center(x, z)).filter((c) => !E.isWater(c[0], c[2]));
    const near = (p, r) => dry.reduce((best, c) => { const d = Math.abs(Math.hypot(c[0] - p[0], c[2] - p[2]) - r); return d < best.d ? { c, d } : best; }, { c: dry[0], d: 1e9 }).c;
    const stepTo = (p, r) => { const c = near(p, r); E.player.pos = [c[0], E.player.pos[1], c[2]]; };
    const face = (p) => { E.player.yaw = Math.atan2(-(p[0] - E.player.pos[0]), -(p[2] - E.player.pos[2])); };
    let placed = false;
    for (let k = 0; k < 20 && !placed; k++) { placed = E.perchWatcher(); if (!placed) { E.player.yaw += 0.7; u.step(1); } }
    u.step(1);
    const out = { placed, shown: shown() };
    const d0 = Math.hypot(W.at[0] - E.player.pos[0], W.at[2] - E.player.pos[2]);
    E.blooms.forEach((b) => { b.active = false; }); face(head()); u.step(3);
    out.seen = W.seen; out.stays = W.moves === 0;
    const at0 = [...W.at];
    E.player.yaw += Math.PI; for (let k = 0; k < 6; k++) { E.blooms.forEach((b) => { b.active = false; }); u.step(10); } // look away for two seconds
    out.movedWhenLost = W.moves === 1 && (W.mode !== 'watching' || Math.hypot(W.at[0] - at0[0], W.at[2] - at0[2]) > 3);
    const d1 = W.mode === 'watching' ? Math.hypot(W.at[0] - E.player.pos[0], W.at[2] - E.player.pos[2]) : null;
    // Walk up to it: it is not there any more.
    if (W.mode === 'watching') { const m0 = W.moves; stepTo(W.at, 6); u.step(2); out.reach = W.moves === m0 + 1; }
    for (let k = 0; k < 40 && W.mode !== 'gone'; k++) { E.blooms.forEach((b) => { b.active = false; }); if (W.mode === 'watching') stepTo(W.at, 6); else { E.player.yaw += 0.9; E.perchWatcher(); } u.step(5); }
    out.gone = W.mode === 'gone'; out.hiddenAfter = !shown();
    out.hurts = hurts; out.moves = W.moves; out.mode = W.mode; u.events.damage = dmg;
    out.hurt = 1000 - window.__underflow.state.health; out.d0 = +d0.toFixed(1); out.d1 = d1 && +d1.toFixed(1);
    return out; });
  check('the Observer takes a place that can see you, out of your view, and stays while you watch it', o.placed && o.shown && o.seen && o.stays, JSON.stringify(o));
  check('it moves when you lose sight of it, and again when you walk towards it', o.movedWhenLost && o.reach, JSON.stringify(o));
  check('after a few places it leaves for good, and it never hurts you', o.gone && o.hiddenAfter && o.hurt < 1 && Object.keys(o.hurts).length === 0, JSON.stringify(o));

  // Low Drift: footsteps behind you that stop when you turn to look at where they are.
  const fs = await page.evaluate(() => { const u = window.__underflow, E = window.__explore;
    E.blooms.forEach((b) => { b.active = false; });
    u.setState({ health: 1000, drift: 40 }); u.step(1);
    let D = null;
    for (let k = 0; k < 12 && !D; k++) { D = E.startDriftSteps(); if (!D) { E.player.yaw += 0.6; u.step(1); } }
    if (!D) return { none: true };
    const yaw0 = E.player.yaw;
    for (let k = 0; k < 4; k++) { E.player.yaw = yaw0; u.step(15); }
    const walking = { n: D.n, running: E.driftSteps === D };
    E.player.yaw = Math.atan2(-(D.at[0] - E.player.pos[0]), -(D.at[2] - E.player.pos[2]));
    u.step(2);
    const n = D.n; u.step(30);
    return { walking, stopped: D.stopped, gone: E.driftSteps === null, after: D.n - n }; });
  check('at low Drift, footsteps behind you stop the moment you turn to look; nothing is there', !fs.none && fs.walking.n >= 3 && fs.walking.running && fs.stopped && fs.gone && fs.after === 0, JSON.stringify(fs));

  // Moderate Drift: a sign on a spot you already walked past, put there while you looked away; a crewmate's voice from
  // the wrong side, with the caption saying so.
  const md = await page.evaluate(() => { const u = window.__underflow, E = window.__explore;
    E.blooms.forEach((b) => { b.active = false; });
    u.setState({ health: 1000, drift: 60 }); u.step(1);
    const shown = () => (E.movedSign?.group || []).some((p) => p.matrix[13] > -100);
    if (!E.movedSign) return { noModel: true };
    const dry = E.find('.').map(([x, z]) => E.center(x, z)).filter((c) => !E.isWater(c[0], c[2]));
    // A spot you walked past 20 s ago, about 8 m behind you.
    const fwd = [-Math.sin(E.player.yaw), -Math.cos(E.player.yaw)];
    const behind = dry.filter((c) => { const dx = c[0] - E.player.pos[0], dz = c[2] - E.player.pos[2], d = Math.hypot(dx, dz); return d > 6 && d < 12 && (dx * fwd[0] + dz * fwd[1]) < -0.7 * d; });
    if (!behind.length) return { noSpot: true };
    E.trail.length = 0; E.trail.push({ t: E.time - 20, pos: [behind[0][0], 0, behind[0][2]] });
    const at = E.placeMoved(); u.step(1);
    const placed = { at: !!at, shown: shown(), noticed: E.moved.noticed };
    E.player.yaw = Math.atan2(-(at[0] - E.player.pos[0]), -(at[2] - E.player.pos[2])); u.step(2);
    const seen = { noticed: E.moved.noticed, caption: document.getElementById('caption').textContent };
    u.setState({ drift: 20 }); u.step(2); const stillThere = shown(); // looking at it: it stays
    E.player.yaw += Math.PI; u.step(2); const putAway = !shown();
    const v = E.wrongVoice(); u.step(1);
    return { placed, seen, stillThere, putAway, v, voiceCaption: document.getElementById('caption').textContent }; });
  check('at moderate Drift a sign stands on a spot you already passed, put there while you looked away, and is put away only while you are not looking', md.noModel || md.noSpot || (md.placed.at && md.placed.shown && !md.placed.noticed && md.seen.noticed && /walked/.test(md.seen.caption) && md.stillThere && md.putAway), JSON.stringify(md));
  check('a crewmate\'s voice comes from the opposite side to where they are, and the caption says both', md.noModel || md.noSpot || (md.v && md.v.fake !== md.v.real && md.voiceCaption.includes(md.v.fake) && md.voiceCaption.includes(md.v.real)), JSON.stringify(md));

  // High Drift: a doorway that is not there. The wall stays a wall; walk into it and it is gone.
  const fd = await page.evaluate(() => { const u = window.__underflow, E = window.__explore, F = E.falseDoor;
    E.blooms.forEach((b) => { b.active = false; });
    u.setState({ health: 1000, drift: 85 }); u.step(1);
    if (!F.cands.length) return { none: true };
    const opened = E.showFalseDoor(true) || F.shown; // at Drift 85 the game may already have shown it
    const [x, z] = F.cell, shown = F.gap.matrix[13] > -100, solid = E.isWall(x, z);
    // Walk up to it.
    const toward = [F.face[0] - E.player.pos[0], F.face[2] - E.player.pos[2]];
    E.player.yaw = Math.atan2(-toward[0], -toward[1]);
    const start = [...E.player.pos];
    for (let k = 1; k <= 30 && F.shown; k++) { E.player.pos = [start[0] + toward[0] * k / 30 * 0.97, start[1], start[2] + toward[1] * k / 30 * 0.97]; u.step(1); }
    const hidden = shown, back = F.gap.matrix[13] < -100;
    return { opened, hidden, solid, back, done: F.done, caption: document.getElementById('caption').textContent, stillWall: E.isWall(x, z) }; });
  check('at high Drift a doorway shows in a wall, but it is still a wall; walk into it and the doorway is gone', !fd.none && (fd.opened && fd.hidden && fd.solid && fd.back && fd.done && fd.stillWall && /never a doorway/.test(fd.caption)), JSON.stringify(fd));
  await finish(browser, errors);
})();
