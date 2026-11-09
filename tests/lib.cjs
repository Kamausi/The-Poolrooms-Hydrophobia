// Shared harness for the browser tests: a headless page on the dev server (software GL, low quality), page
// errors collected, and helpers for the usual steps. Tests drive the game through its DEV hooks
// (window.__underflow, window.__ride, window.__explore), which exist only in the dev build.
const { chromium } = require('playwright');

const BASE = process.env.UNDERFLOW_URL || 'http://localhost:5173';

async function open({ width = 960, height = 540, clear = true } = {}) {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGE ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text().slice(0, 200)); });
  // A freshly started dev server (CI) can take a while to transform the modules: wait for the game's hooks,
  // not for a fixed time.
  const ready = async () => { await page.waitForFunction(() => !!window.__underflow, null, { timeout: 120000 }); await page.waitForTimeout(800); };
  await page.goto(`${BASE}/?quality=low`);
  await ready();
  if (clear) { await page.evaluate(() => localStorage.clear()); await page.reload(); await ready(); }
  return { browser, page, errors };
}

/** New campaign: start, pick the first dispatch choice, confirm. */
async function newCampaign(page) {
  await page.evaluate(() => window.__underflow.newCampaign());
  await page.waitForTimeout(150);
  await page.evaluate(() => document.querySelector('#modal-body .choice').click());
  await page.waitForTimeout(150);
  await page.evaluate(() => document.querySelector('#modal-actions button').click());
  await page.waitForTimeout(150);
}

let failures = 0;
function check(label, ok, detail = '') {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail ? ' · ' + detail : ''}`);
  if (!ok) failures++;
}

async function finish(browser, errors) {
  check('no page errors', errors.length === 0, errors.slice(0, 4).join(' | '));
  await browser.close();
  process.exit(failures ? 1 : 0);
}

module.exports = { open, newCampaign, check, finish, BASE };
