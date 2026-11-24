// The architectural credibility rules on foot (src/architecture.js): every pool in the dock has main drains in its
// floor, and every machine that works the water has a service pipe run from it to the pool it serves.
const { open, check, finish } = require('./lib.cjs');
(async () => {
  const { browser, page, errors } = await open({ width: 640, height: 360 });
  await page.click('#start-exp'); await page.click('#start');
  await page.waitForTimeout(600);
  await page.evaluate(() => { document.querySelector('#modal-body .choice')?.click(); document.querySelector('#modal-actions button')?.click(); });
  await page.waitForTimeout(300);
  const out = await page.evaluate(() => { const u = window.__underflow, res = [];
    for (const i of [0, 3, 5, 7]) {
      u.beginSector(i); u.startRide(); u.startExplore(); u.sim(1);
      const E = window.__explore, names = E.parts.map((p) => p.name);
      const machines = E.rows.join('').split('').filter((c) => 'SCQo'.includes(c)).length;
      const pipes = names.filter((n) => n.startsWith('Service pipe')).length;
      const runs = E.pipeRuns.length;
      // Every pipe end at the water is over a pool edge: the last cell of each run borders water.
      const edges = E.pipeRuns.every(({ run }) => { const [x, z] = run[run.length - 1]; return [[1, 0], [-1, 0], [0, 1], [0, -1], [0, 0]].some(([dx, dz]) => '~ulrfo'.includes(E.rows[z + dz]?.[x + dx])); });
      const drains = names.filter((n) => n.startsWith('Main drain')).length;
      res.push({ sector: i, machines, runs, pipes, edges, drains, models: E.models().length > 0 });
    }
    return res; });
  check('every machine that works the water has a service pipe run to the pool it serves', out.every((r) => r.runs === r.machines && r.pipes >= r.runs * 2 && r.edges), JSON.stringify(out));
  check('every dock with pools has main drains in their floors (when the drain model is loaded)', out.every((r) => !r.models || r.drains > 0), JSON.stringify(out));
  await finish(browser, errors);
})();
