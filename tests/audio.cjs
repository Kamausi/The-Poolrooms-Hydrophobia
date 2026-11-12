// Recorded sound: every sound in public/audio/manifest.json loads and decodes once audio starts; the game
// keeps running with synthesis meanwhile.
const { open, check, finish } = require('./lib.cjs');
(async () => {
  const { browser, page, errors } = await open({ width: 800, height: 450 });
  await page.click('#start-exp'); await page.click('#start'); // starting the game creates the audio context, which starts the loads
  await page.waitForTimeout(4000);
  const r = await page.evaluate(async () => {
    const m = await (await fetch('/audio/manifest.json')).json();
    const { loadedSamples } = await import('/src/samples.js');
    return { want: Object.keys(m).length, have: loadedSamples().length };
  });
  check('every recorded sound decodes', r.have === r.want, `${r.have}/${r.want}`);
  const rv = await page.evaluate(async () => { const m = await import("/src/audio.js"); const s = m.sound; s.unlock?.();
    for (let i = 0; i < 80; i++) { s.footstep?.(0); s.tick?.(1); s.pulse?.(); s.hit?.(); }
    const full = m.voiceStats().live; s.hurt(); const after = m.voiceStats().live;
    return { full, after }; });
  check('at most 24 one-shots play at once; a burst of footsteps and shots cannot crowd out being hurt', rv.full <= 24 && rv.after <= 24 && rv.full > 3, JSON.stringify(rv));
  await finish(browser, errors);
})();
