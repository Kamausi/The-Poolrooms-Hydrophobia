// Things that watch, and Drift you cannot trust, on foot: the Observer (ai/observer.js) and the Drift effects
// (ai/driftfx.js, driftsign.js): footsteps that stop when you look, a sign on a spot you already passed, a voice from
// the wrong side, a doorway in a wall that is only tile. Split from horror.cjs so no one page runs for too long.
const { open, check, finish, BASE } = require('./lib.cjs');
(async () => {
  const { browser, page, errors } = await open({ width: 800, height: 450 });
  await page.goto(`${BASE}/?quality=low`);
  await page.waitForFunction(() => !!window.__underflow, null, { timeout: 120000 });
  await page.click('#start-exp'); await page.click('#start'); // a real click starts the audio context
  await page.waitForTimeout(600);
  await page.evaluate(() => { document.querySelector('#modal-body .choice')?.click(); document.querySelector('#modal-actions button')?.click(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { const u = window.__underflow; u.beginSector(2); u.startRide(); u.startExplore(); u.setState({ health: 1e6 }); u.sim(2); });
  // The Observer (ai/observer.js): watches from where you cannot reach it, moves when the line of sight breaks, never
  // attacks.
  const o = await page.evaluate(() => { const u = window.__underflow, E = window.__explore, W = E.watcher;
    E.blooms.forEach((b) => { b.active = false; });
    E.floaters.forEach((f) => { f.state = 'gone'; }); // the hall's other things stay out of this check
    const hurts = {}; const dmg = u.events.damage; u.events.damage = (n, why, ...rest) => { hurts[why] = (hurts[why] || 0) + n; return dmg.call(u.events, n, why, ...rest); };
    u.setState({ health: 1000 }); u.sim(1);
    const shown = () => E.watcherFig.all.some((p) => p.matrix[13] > -100);
    const head = () => [W.at[0], W.at[1] + 1.65, W.at[2]];
    const dry = E.find('.').map(([x, z]) => E.center(x, z)).filter((c) => !E.isWater(c[0], c[2]));
    const near = (p, r) => dry.reduce((best, c) => { const d = Math.abs(Math.hypot(c[0] - p[0], c[2] - p[2]) - r); return d < best.d ? { c, d } : best; }, { c: dry[0], d: 1e9 }).c;
    const stepTo = (p, r) => { const c = near(p, r); E.player.pos = [c[0], E.player.pos[1], c[2]]; };
    const face = (p) => { E.player.yaw = Math.atan2(-(p[0] - E.player.pos[0]), -(p[2] - E.player.pos[2])); };
    let placed = false;
    for (let k = 0; k < 20 && !placed; k++) { placed = E.perchWatcher(); if (!placed) { E.player.yaw += 0.7; u.sim(1); } }
    u.sim(1);
    const out = { placed, shown: shown() };
    const d0 = Math.hypot(W.at[0] - E.player.pos[0], W.at[2] - E.player.pos[2]);
    E.blooms.forEach((b) => { b.active = false; }); face(head()); u.sim(3);
    out.seen = W.seen; out.stays = W.moves === 0;
    const at0 = [...W.at];
    E.player.yaw += Math.PI; for (let k = 0; k < 6; k++) { E.blooms.forEach((b) => { b.active = false; }); u.sim(10); } // look away for two seconds
    out.movedWhenLost = W.moves === 1 && (W.mode !== 'watching' || Math.hypot(W.at[0] - at0[0], W.at[2] - at0[2]) > 3);
    const d1 = W.mode === 'watching' ? Math.hypot(W.at[0] - E.player.pos[0], W.at[2] - E.player.pos[2]) : null;
    // Walk up to it: it is not there any more.
    if (W.mode === 'watching') { const m0 = W.moves; stepTo(W.at, 6); u.sim(2); out.reach = W.moves === m0 + 1; }
    for (let k = 0; k < 40 && W.mode !== 'gone'; k++) { E.blooms.forEach((b) => { b.active = false; }); if (W.mode === 'watching') stepTo(W.at, 6); else { E.player.yaw += 0.9; E.perchWatcher(); } u.sim(5); }
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
    u.setState({ health: 1000, drift: 40 }); u.sim(1);
    let D = null;
    for (let k = 0; k < 12 && !D; k++) { D = E.startDriftSteps(); if (!D) { E.player.yaw += 0.6; u.sim(1); } }
    if (!D) return { none: true };
    const yaw0 = E.player.yaw;
    for (let k = 0; k < 4; k++) { E.player.yaw = yaw0; u.sim(15); }
    const walking = { n: D.n, running: E.driftSteps === D };
    E.player.yaw = Math.atan2(-(D.at[0] - E.player.pos[0]), -(D.at[2] - E.player.pos[2]));
    u.sim(2);
    const n = D.n; u.sim(30);
    return { walking, stopped: D.stopped, gone: E.driftSteps === null, after: D.n - n }; });
  check('at low Drift, footsteps behind you stop the moment you turn to look; nothing is there', !fs.none && fs.walking.n >= 3 && fs.walking.running && fs.stopped && fs.gone && fs.after === 0, JSON.stringify(fs));

  // Moderate Drift: a sign on a spot you already walked past, put there while you looked away; a crewmate's voice from
  // the wrong side, with the caption saying so.
  const md = await page.evaluate(() => { const u = window.__underflow, E = window.__explore;
    E.blooms.forEach((b) => { b.active = false; });
    u.setState({ health: 1000, drift: 60 }); u.sim(1);
    const shown = () => (E.movedSign?.group || []).some((p) => p.matrix[13] > -100);
    if (!E.movedSign) return { noModel: true };
    const dry = E.find('.').map(([x, z]) => E.center(x, z)).filter((c) => !E.isWater(c[0], c[2]));
    // A spot you walked past 20 s ago, about 8 m behind you.
    const fwd = [-Math.sin(E.player.yaw), -Math.cos(E.player.yaw)];
    const behind = dry.filter((c) => { const dx = c[0] - E.player.pos[0], dz = c[2] - E.player.pos[2], d = Math.hypot(dx, dz); return d > 6 && d < 12 && (dx * fwd[0] + dz * fwd[1]) < -0.7 * d; });
    if (!behind.length) return { noSpot: true };
    E.trail.length = 0; E.trail.push({ t: E.time - 20, pos: [behind[0][0], 0, behind[0][2]] });
    const at = E.placeMoved(); u.sim(1);
    const placed = { at: !!at, shown: shown(), noticed: E.moved.noticed };
    E.player.yaw = Math.atan2(-(at[0] - E.player.pos[0]), -(at[2] - E.player.pos[2])); u.sim(2);
    const seen = { noticed: E.moved.noticed, caption: document.getElementById('caption').textContent };
    u.setState({ drift: 20 }); u.sim(2); const stillThere = shown(); // looking at it: it stays
    E.player.yaw += Math.PI; u.sim(2); const putAway = !shown();
    const v = E.wrongVoice(); u.sim(1);
    return { placed, seen, stillThere, putAway, v, voiceCaption: document.getElementById('caption').textContent }; });
  check('at moderate Drift a sign stands on a spot you already passed, put there while you looked away, and is put away only while you are not looking', md.noModel || md.noSpot || (md.placed.at && md.placed.shown && !md.placed.noticed && md.seen.noticed && /walked/.test(md.seen.caption) && md.stillThere && md.putAway), JSON.stringify(md));
  check('a crewmate\'s voice comes from the opposite side to where they are, and the caption says both', md.noModel || md.noSpot || (md.v && md.v.fake !== md.v.real && md.voiceCaption.includes(md.v.fake) && md.voiceCaption.includes(md.v.real)), JSON.stringify(md));

  // High Drift: a doorway that is not there. The wall stays a wall; walk into it and it is gone.
  const fd = await page.evaluate(() => { const u = window.__underflow, E = window.__explore, F = E.falseDoor;
    E.blooms.forEach((b) => { b.active = false; });
    u.setState({ health: 1000, drift: 85 }); u.sim(1);
    if (!F.cands.length) return { none: true };
    const opened = E.showFalseDoor(true) || F.shown; // at Drift 85 the game may already have shown it
    const [x, z] = F.cell, shown = F.gap.matrix[13] > -100, solid = E.isWall(x, z);
    // Walk up to it.
    const toward = [F.face[0] - E.player.pos[0], F.face[2] - E.player.pos[2]];
    E.player.yaw = Math.atan2(-toward[0], -toward[1]);
    const start = [...E.player.pos];
    for (let k = 1; k <= 30 && F.shown; k++) { E.player.pos = [start[0] + toward[0] * k / 30 * 0.97, start[1], start[2] + toward[1] * k / 30 * 0.97]; u.sim(1); }
    const hidden = shown, back = F.gap.matrix[13] < -100;
    return { opened, hidden, solid, back, done: F.done, caption: document.getElementById('caption').textContent, stillWall: E.isWall(x, z) }; });
  check('at high Drift a doorway shows in a wall, but it is still a wall; walk into it and the doorway is gone', !fd.none && (fd.opened && fd.hidden && fd.solid && fd.back && fd.done && fd.stillWall && /never a doorway/.test(fd.caption)), JSON.stringify(fd));

  // The reflection (ai/reflection.js): at the edge of still water you see yourself, upside down; from moderate Drift
  // it follows late; at high Drift it stops following and looks up at where you are, and is gone when you look away.
  const rf = await page.evaluate(() => { const u = window.__underflow, E = window.__explore, R = E.refl;
    E.blooms.forEach((b) => { b.active = false; });
    E.floaters.forEach((f) => { f.state = 'gone'; });
    if (E.fomen) E.fomen.t = 1e6;
    u.setState({ health: 1000, drift: 10 }); u.sim(1);
    const dry = E.find('.').map(([x, z]) => E.center(x, z)).filter((c) => !E.isWater(c[0], c[2]));
    let spot = null;
    for (const c of dry) { E.player.pos = [c[0], 0, c[2]]; spot = E.reflectionSpot(); if (spot) break; }
    if (!spot) return { none: true };
    const F = E.selfFig, y = (p) => p.matrix[13], xz = (p) => [p.matrix[12], p.matrix[14]];
    const toward = [spot.feet[0] - E.player.pos[0], spot.feet[2] - E.player.pos[2]];
    E.player.yaw = Math.atan2(-toward[0], -toward[1]);
    u.sim(3);
    const out = { mode0: R.mode, shown: R.shown, under: y(F.head) < spot.feet[1] && y(F.head) < y(F.footL), level: spot.feet[1] };
    // Moderate: a sudden step sideways is followed late.
    u.setState({ drift: 55 }); u.sim(60);
    const b0 = xz(F.body), side = [-toward[1], toward[0]], len = Math.hypot(...side);
    const p0 = [...E.player.pos];
    E.player.pos = [p0[0] + side[0] / len * 0.8, 0, p0[2] + side[1] / len * 0.8];
    if (!E.reflectionSpot()) E.player.pos = [p0[0] - side[0] / len * 0.8, 0, p0[2] - side[1] / len * 0.8];
    u.sim(3);
    const b1 = xz(F.body);
    u.sim(60);
    const b2 = xz(F.body);
    out.mode1 = R.mode; out.lagStill = Math.hypot(b1[0] - b0[0], b1[1] - b0[1]) < 0.2; out.caughtUp = Math.hypot(b2[0] - b0[0], b2[1] - b0[1]) > 0.5;
    // High: look at it until it stops following.
    E.player.pos = p0; u.setState({ drift: 85 }); u.sim(60);
    let pitch = null;
    for (const pt of [-0.6, -0.9, 0.6, 0.9, -0.3]) { E.player.pitch = pt; u.sim(2); for (let k = 0; k < 4 && !R.own; k++) u.sim(30); if (R.own) { pitch = pt; break; } }
    out.own = !!R.own; out.pitch = pitch;
    if (R.own) {
      const ownAt = xz(F.body);
      // Step back from the edge, still looking at it.
      const back = [-toward[0], -toward[1]], bl = Math.hypot(...back);
      E.player.pos = [p0[0] + back[0] / bl * 1.8, 0, p0[2] + back[1] / bl * 1.8];
      const t = [ownAt[0] - E.player.pos[0], ownAt[1] - E.player.pos[2]]; E.player.yaw = Math.atan2(-t[0], -t[1]);
      for (let k = 0; k < 6 && !R.told; k++) { E.player.pitch = pitch; u.sim(10); }
      const still = xz(F.body);
      out.stayed = Math.hypot(still[0] - ownAt[0], still[1] - ownAt[1]) < 0.3;
      out.told = R.told; out.caption = document.getElementById('caption').textContent;
      E.player.yaw += Math.PI; E.player.pitch = 0; u.sim(5);
      out.gone = !R.own && R.spent && F.head.matrix[13] < -100;
    }
    out.hurt = 1000 - u.state.health;
    return out; });
  check('at the edge of still water your reflection is there, upside down under the surface, and follows you', rf.none || (rf.mode0 === 'follow' && rf.shown && rf.under), JSON.stringify(rf));
  check('from moderate Drift it follows late: a quick step and it stays a moment before it catches up', rf.none || (rf.mode1 === 'lag' && rf.lagStill && rf.caughtUp), JSON.stringify(rf));
  check('at high Drift it stops following, stays where it was and looks up at you; look away and it is gone; nothing hurts you', !rf.none && rf.own && rf.stayed && rf.told && /has not moved/.test(rf.caption) && rf.gone && rf.hurt < 1, JSON.stringify(rf));

  // Readings (fieldnotes.js): the inspection beam's readings enter the journal, and a sign read again after high Drift
  // changed it leaves both versions there.
  const rd = await page.evaluate(() => { const u = window.__underflow, E = window.__explore;
    E.blooms.forEach((b) => { b.active = false; });
    u.setState({ health: 1000, drift: 0 }); u.sim(2);
    const i = E.signParts.findIndex((s) => s.alt && !s.home && s.part.matrix[13] > -100);
    if (i < 0) return { none: true };
    const sg = E.signParts[i];
    const read = () => { const m = sg.home ? sg.alt.matrix : sg.part.matrix, p = [m[12], m[13], m[14]], eye = [p[0] + 2, p[1], p[2] + 2];
      const d = [p[0] - eye[0], p[1] - eye[1], p[2] - eye[2]], l = Math.hypot(...d);
      let out = ''; for (let k = 0; k < 8; k++) out = E.scanTick(0.1, eye, d.map((v) => v / l)); return out; };
    const n0 = (u.state.readings || []).length;
    const first = read(); read();
    const afterTwo = u.state.readings.length - n0;
    // High Drift, looking the other way: the sign changes; read it again.
    u.setState({ drift: 85 });
    for (let k = 0; k < 20 && !sg.home; k++) { E.player.yaw += 0.7; u.sim(10); u.setState({ drift: 85 }); }
    const changed = !!sg.home;
    const second = read();
    const mine = u.state.readings.filter((r) => r.key === `sign ${i}`);
    u.setState({ drift: 0 });
    return { first, second, afterTwo, changed, lines: mine.map((r) => [r.text, r.again]) }; });
  check('the beam\'s readings enter the field notes once; a sign read again after Drift changed it keeps both versions', !rd.none && rd.afterTwo === 1 && rd.changed && rd.lines.length === 2 && rd.lines[0][1] === false && rd.lines[1][1] === true && rd.lines[0][0] !== rd.lines[1][0], JSON.stringify(rd));

  // Lighting per kind of space (render/lightstyle.js): each fixture's light follows the zone it hangs in.
  const ls = await page.evaluate(() => { const u = window.__underflow, E = window.__explore;
    u.setState({ drift: 0 }); E.setEmergency?.(false); u.sim(2);
    const by = {};
    for (const l of E.lamps) { const z = E.zoneHere(l.x, l.z); (by[z] ||= { n: 0, range: l.style.range, intensity: l.style.intensity, warmth: +(l.style.color[0] / l.style.color[2]).toFixed(2) }).n++; }
    // The light a lit fixture gives in the frame carries its style.
    const pairs = E.lights().map((g) => [g, E.lamps.find((l) => l.pos === g.position)]).filter(([, l]) => l);
    return { by, given: pairs.length ? { n: pairs.length, match: pairs.every(([g, l]) => g.range === l.style.range && g.color === l.style.color) } : null }; });
  check('each fixture\'s light follows the kind of space it hangs in: a hall\'s are brighter and reach further, a room\'s are dimmer and yellower', ls.by.hall && ls.by.room && ls.by.hall.range > ls.by.room.range && ls.by.hall.intensity > ls.by.room.intensity && ls.by.room.warmth > ls.by.hall.warmth && ls.given && ls.given.match, JSON.stringify(ls));

  // Acoustic zones (audio/zones.js): where you stand sets the reverb; held under, everything goes dull; a line on
  // screen pulls the music and ambience back.
  const az = await page.evaluate(() => { const u = window.__underflow, E = window.__explore;
    E.blooms.forEach((b) => { b.active = false; });
    u.setState({ health: 1000, drift: 0 }); u.sim(1);
    const kinds = new Set(E.find('.').map(([x, z]) => E.zoneHere(x, z)));
    const out = { kinds: [...kinds] };
    // Stand somewhere of each kind; check the zone of the cell you end up in (currents and walls can move you).
    for (const k of kinds) for (const [x, z] of E.find('.').filter(([x, z]) => E.zoneHere(x, z) === k).slice(0, 6)) {
      const c = E.center(x, z); E.player.pos = [c[0], E.player.pos[1], c[2]]; u.sim(60);
      const here = E.zoneHere(...E.cellOf(E.player.pos[0], E.player.pos[2]));
      if (here === k) { out[k] = { zone: E.acousticZone, space: u.sound.space }; break; }
    }
    return out; });
  check("where you stand sets the reverb: each kind of space in the dock gives its own zone, and the sound follows it", az.kinds.length >= 2 && az.kinds.every((k) => az[k] && az[k].zone === k && az[k].space === k), JSON.stringify(az));
  const mx = await page.evaluate(async () => { const u = window.__underflow, E = window.__explore;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    u.hud.clearSpeech(); // the lines queued by the checks above
    u.sim(2);
    const quiet = { ...u.sound.mix };
    u.hud.say('DEZ', 'Hold on, I have you. Pull.', 'crew', true);
    u.sim(3);
    const talking = { ...u.sound.mix, speaking: u.hud.speaking };
    // Held under by a Floater: the muffle and the under-water mix.
    const f = E.floaters[0];
    let under = null;
    if (f) { f.state = 'holding'; f.holdT = 30; f.pos = [E.player.pos[0], f.pos[1], E.player.pos[2]]; u.sim(2); under = { submerged: E.submerged, muffled: u.sound.muffled, mix: { ...u.sound.mix } }; f.state = 'gone'; u.hud.clearSpeech(); u.sim(2); under.after = { submerged: E.submerged, muffled: u.sound.muffled, mix: { ...u.sound.mix } }; }
    return { quiet, talking, under }; });
  check('a line on screen pulls the music and ambience back for it', mx.quiet.music === 1 && mx.talking.speaking && mx.talking.music < 0.5 && mx.talking.beds < 1, JSON.stringify(mx));
  check('held under the water everything goes dull and the music nearly goes; back up, it comes back', !!mx.under && mx.under.submerged && mx.under.muffled && mx.under.mix.music < 0.5 && !mx.under.after.submerged && !mx.under.after.muffled, JSON.stringify(mx.under));
  // Sound through vents (audio/vents.js): a sound behind a wall near one vent comes out of the vent near you.
  // In the Filtration Works: corridors and rooms, so there are walls between vents.
  await page.evaluate(() => { const u = window.__underflow; u.beginSector(5); u.startRide(); u.startExplore(); u.setState({ health: 1e6 }); u.sim(2); });
  const vt = await page.evaluate(() => { const u = window.__underflow, E = window.__explore;
    E.blooms.forEach((b) => { b.active = false; });
    u.setState({ drift: 0 }); u.sound.unlock?.();
    const vs = E.vents, stats = () => u.sound.spatialStats;
    let found = null;
    for (const a of vs) {
      E.player.pos = [a[0], 0, a[2]]; u.step(1);
      const eye = [a[0], 1.6, a[2]];
      for (const b of vs) {
        const src = [b[0], 1, b[2]], d = Math.hypot(b[0] - a[0], b[2] - a[2]);
        if (b === a || d < 6 || d > 20 || E.lineOfSight(eye, src)) continue;
        const n0 = E.ventHeard.n, m0 = stats().ventedMade;
        E.heard(src, () => u.sound.footstep(0.5, false));
        if (E.ventHeard.n === n0 + 1) { found = { d: +d.toFixed(1), made: stats().ventedMade - m0, gain: +E.ventHeard.last.gain.toFixed(2), at: E.ventHeard.last.at === a || Math.hypot(E.ventHeard.last.at[0] - a[0], E.ventHeard.last.at[2] - a[2]) < 0.01 }; break; }
      }
      if (found) break;
    }
    // A sound in plain sight is not sent through the ducts; one far from every vent is only muffled.
    const o0 = stats().occludedMade, n1 = E.ventHeard.n;
    if (found) { E.heard([E.player.pos[0] + 0.5, 1, E.player.pos[2]], () => u.sound.footstep(0, false)); }
    return { vents: vs.length, found, direct: E.ventHeard.n === n1, caption: document.getElementById('caption').textContent }; });
  check('a sound behind a wall near one vent comes out of the vent near you, thin and quieter, and is not sent round when it is in plain sight', vt.vents > 3 && !!vt.found && vt.found.made >= 1 && vt.found.at && vt.found.gain > 0.1 && vt.found.gain <= 0.8 && vt.direct, JSON.stringify(vt));

  await finish(browser, errors);
})();
