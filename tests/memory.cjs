// Facility memory across two expeditions: a restored, drained, interesting dock comes back extended, with a
// plaque and lockers; a rescue is committed only at a Safe Room; the Safe Room shows a false record; the ledger keeps only what was witnessed.
const { open, newCampaign, check, finish } = require('./lib.cjs');
(async () => {
  const { browser, page, errors } = await open({ width: 1280, height: 720 });
  await newCampaign(page);
  await page.evaluate(() => { const u = window.__underflow; u.beginSector(4); u.startRide(); u.setState({ health: 1e6 }); u.startExplore(); u.step(5);
    u.state.routeMod = { [u.state.sectorKey]: 'drained' }; window.__explore.restorePower(); u.events.interest(3); u.setState({ rescued: 1 }); u.step(5); u.events.board(); u.step(5); });
  let pending = await page.evaluate(() => ({ pending: window.__underflow.state.pendingVisitors.length, committed: JSON.parse(localStorage.getItem('underflow-facility')).visitors.length }));
  check('a rescue is pending until a Safe Room', pending.pending === 1 && pending.committed === 0, JSON.stringify(pending));
  await page.evaluate(() => window.__underflow.enterSafeRoom());
  pending = await page.evaluate(() => JSON.parse(localStorage.getItem('underflow-facility')).visitors.length);
  check('the Safe Room commits it', pending === 1);
  await newCampaign(page);
  let r = await page.evaluate(() => { const v = window.__underflow.state.variants[4] || {}; return { exp: window.__underflow.state.expedition, extend: !!v.extend, plaque: !!v.plaque, lockers: !!v.lockers, water: v.water }; });
  check('second expedition authors variations', r.extend && r.plaque && r.lockers && r.water === 'drained', JSON.stringify(r));
  r = await page.evaluate(() => { const u = window.__underflow; u.beginSector(4); u.startRide(); u.setState({ health: 1e6, autopilot: true }); return window.__ride.track.ranges.some((x) => x.sec.extended); });
  check('the ride contains the extended corridor', r);
  r = await page.evaluate(() => { const u = window.__underflow; u.beginSector(4); u.enterSafeRoom(); const t = document.getElementById('modal-body').textContent; return { record: /ATTENDANCE SHEET|MAINTENANCE TERMINAL|STAFF PHOTOGRAPH/.test(t) }; });
  check('the Safe Room shows a false record', r.record);
  r = await page.evaluate(() => JSON.parse(localStorage.getItem('underflow-facility')).ledger.changes.length);
  check('nothing enters the ledger at departure', r === 0, `changes ${r}`);
  await finish(browser, errors);
})();
