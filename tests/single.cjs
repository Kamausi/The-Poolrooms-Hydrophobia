// The single-file build opens from disk and starts an expedition without errors. Run `npm run build:single` first.
const path = require('node:path');
const { chromium } = require('playwright');
const { check, finish } = require('./lib.cjs');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('file://' + path.resolve(__dirname, '../dist/UNDERFLOW.html') + '?quality=low'); await page.waitForTimeout(1500);
  await page.click('#start'); await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelector('#modal-body .choice').click()); await page.click('#modal-actions button'); await page.waitForTimeout(3000);
  const hud = await page.evaluate(() => document.getElementById('chambers')?.textContent || '');
  check('the single file starts a ride', hud.length > 0, hud.slice(0, 40));
  await page.waitForTimeout(2500);
  const audio = await page.evaluate(() => ({ want: Object.keys(window.__UNDERFLOW_AUDIO?.manifest || {}).length, have: window.__underflowAudio?.loaded().length || 0 }));
  check('the single file carries its recorded sound', audio.want > 0 && audio.have === audio.want, `${audio.have}/${audio.want}`);
  await finish(browser, errors);
})();
