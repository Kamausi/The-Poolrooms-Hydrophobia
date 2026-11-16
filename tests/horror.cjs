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

  await finish(browser, errors);
})();
