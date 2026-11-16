// Recorded sound: every sound in public/audio/manifest.json loads and decodes once audio starts; the game
// keeps running with synthesis meanwhile.
const { open, check, finish } = require('./lib.cjs');
(async () => {
  const { browser, page, errors } = await open({ width: 800, height: 450 });
  await page.click('#start-exp'); await page.click('#start'); // starting the game creates the audio context, which starts the loads
  await page.waitForTimeout(4000);
  const r = await page.evaluate(async () => {
    const m = await (await fetch('/audio/manifest.json')).json();
    const { loadedSamples } = await import('/src/audio/samples.js');
    return { want: Object.keys(m).length, have: loadedSamples().length };
  });
  check('every recorded sound decodes', r.have === r.want, `${r.have}/${r.want}`);
  const rv = await page.evaluate(async () => { const m = await import("/src/audio/audio.js"); const s = m.sound; s.unlock?.();
    for (let i = 0; i < 80; i++) { s.footstep?.(0); s.tick?.(1); s.pulse?.(); s.hit?.(); }
    const full = m.voiceStats().live; s.hurt(); const after = m.voiceStats().live;
    return { full, after }; });
  check('at most 24 one-shots play at once; a burst of footsteps and shots cannot crowd out being hurt', rv.full <= 24 && rv.after <= 24 && rv.full > 3, JSON.stringify(rv));
  const sp = await page.evaluate(async () => { const m = await import("/src/audio/audio.js"); const s = m.sound;
    const at = (k) => { s.setSpace(k); return s.spaceSettings; };
    return { hall: at('hall'), tile: at('tile'), dry: at('dry') }; });
  check('each space reverbs by Sabine: the tiled hall rings longest, the Safe Room is short and dry', sp.hall.seconds > sp.tile.seconds && sp.tile.seconds > sp.dry.seconds && sp.dry.wet < sp.tile.wet && sp.dry.seconds < 0.5, JSON.stringify(sp));
  const sp2 = await page.evaluate(async () => { const m = await import("/src/audio/audio.js"); const settings = window.__underflow.settings; const s = m.sound;
    const before = s.spatialStats.hrtfMade;
    settings.binaural = false; s.hit?.(0.8);
    const stereo = s.spatialStats.hrtfMade - before;
    settings.binaural = true; s.breath(0.7); s.whistle(-0.5);
    const hrtf = s.spatialStats.hrtfMade - before - stereo;
    settings.binaural = false;
    let inside = 0; s.doppler(1.04, () => { inside = s.spatialStats.pitch; s.breath(0.2); });
    return { stereo, hrtf, inside, after: s.spatialStats.pitch }; });
  check('with headphones on, panned sounds go through the HRTF panner; a Doppler ratio pitches just the sounds played inside it', sp2.stereo === 0 && sp2.hrtf >= 2 && Math.abs(sp2.inside - 1.04) < 1e-9 && sp2.after === 1, JSON.stringify(sp2));
  await finish(browser, errors);
})();
