// Recorded sound: every sound in public/audio/manifest.json loads and decodes once audio starts; the game
// keeps running with synthesis meanwhile.
const { open, check, finish } = require('./lib.cjs');
(async () => {
  const { browser, page, errors } = await open({ width: 800, height: 450 });
  await page.click('#start'); // starting the game creates the audio context, which starts the loads
  await page.waitForTimeout(4000);
  const r = await page.evaluate(async () => {
    const m = await (await fetch('/audio/manifest.json')).json();
    const { loadedSamples } = await import('/src/samples.js');
    return { want: Object.keys(m).length, have: loadedSamples().length };
  });
  check('every recorded sound decodes', r.have === r.want, `${r.have}/${r.want}`);
  await finish(browser, errors);
})();
