// 3D props: the GLB models (generated and CC0) load, and on foot they stand where the primitive stand-ins stood:
// supply lockers, pool ladders, pump valves, the rubber ducks you can pick up; and they dress the rooms: ceiling
// light fixtures, the electrical cabinet and junction box at the service panel, caged lamps over the valves, an
// extinguisher at every landing, tools on a maintenance platform, chairs and benches in the vignettes.
const { open, newCampaign, check, finish } = require('./lib.cjs');
(async () => {
  const { browser, page, errors } = await open({ width: 800, height: 450 });
  await newCampaign(page);
  const st = await page.evaluate(async () => { await window.__underflow.modelsReady; return window.__underflow.modelState(); });
  check('every model loads (generated and CC0)', st.ready.length === 23 && !Object.keys(st.failed).length, JSON.stringify(st));
  const seen = {};
  let sample = null;
  for (let i = 0; i < 8; i++) {
    const r = await page.evaluate((i) => { const u = window.__underflow; u.beginSector(i); u.startRide(); u.startExplore(); u.setState({ health: 1e6 }); u.step(3);
      const E = window.__explore; return { models: E.models(), lockers: E.lockers.map((l) => l.part.model || null), valves: E.valves.list.map((v) => v.wheel.model || null), ducks: E.finds.filter((f) => f.set === 'ducks').map((f) => f.part.model || null) }; }, i);
    for (const m of r.models) seen[m.model] = (seen[m.model] || 0) + 1;
    if (!sample && r.lockers.length) sample = { sector: i, ...r, models: r.models.length };
    if ([...r.lockers, ...r.valves, ...r.ducks].some((x) => x === null)) { check(`sector ${i}: every locker, valve and duck uses its model`, false, JSON.stringify(r)); }
  }
  check('lockers, pool ladders and pump valves are models on foot', seen.locker > 0 && seen.ladder > 0 && seen.valve > 0, JSON.stringify({ seen, sample }));
  check('landings carry equipment crates; a maintenance platform has spare pipe sections; fake shelters are closed roller shutters', seen.crate > 0 && seen.pipes > 0 && seen.shutter > 0, JSON.stringify(seen));
  // Materials: brushed stainless rails, wet concrete where you dock, glass you see through, PVC seams on the raft.
  const mats = await page.evaluate(() => { const u = window.__underflow; u.beginSector(0); u.startRide(); u.step(2);
    const raft = window.__ride.parts.find((p) => p.name === 'Raft');
    u.startExplore(); u.step(2); const E = window.__explore; const parts = E.parts;
    const find = (re) => parts.find((p) => re.test(p.name));
    const rail = find(/^Gallery rail|^Pool ladder rail/), glass = find(/^Observation glass/), dock = find(new RegExp(`^Floor ${E.find('D')[0].join(',')}$`)), moored = find(/^Moored raft$/);
    return { rail: rail && rail.material.anisotropy, glass: glass ? glass.material.transmission : 'none here', dock: dock && !!dock.material.map, moored: moored && !!moored.material.map, raft: !!(raft && raft.material.map) }; });
  check('materials: wet concrete at the landing, PVC seams on the raft you ride and the moored one, glass that transmits, brushed stainless rails', mats.dock && mats.moored && mats.raft && (mats.glass === 'none here' || mats.glass > 0.5) && (mats.rail === undefined || mats.rail > 0), JSON.stringify(mats));
  check('custom models: the lifeguard chair, ring buoys at the ladders, and the blaster in your hand', seen.tower > 0 && seen.buoy > 0 && seen.blaster > 0, JSON.stringify(seen));
  check('rooms are dressed: light fixtures, the cabinet and junction box at the panel, lamps over valves, extinguishers, tools, chairs', ['fluorescent', 'utilityBox', 'powerBox', 'wallLamp', 'extinguisher', 'toolCart', 'chair'].every((n) => seen[n] > 0), JSON.stringify(seen));
  // Instancing: parts that share one geometry (and texture maps) draw as one batch. Shapes come from src/shapes.js,
  // models share their geometry across placements, so a scene of well over a thousand parts draws in a few dozen batches.
  const inst = await page.evaluate(() => { const u = window.__underflow; u.beginSector(1); u.startRide(); u.step(2); const R = window.__ride.renderer;
    const ride = { parts: R.partCount, batches: R.batches.length }; u.startExplore(); u.step(2); const E = window.__explore.renderer;
    const fixtures = window.__explore.models().filter((m) => m.model === 'fluorescent').length;
    return { ride, foot: { parts: E.partCount, batches: E.batches.length }, fixtures }; });
  check('instancing: the raft scene draws its parts in under 150 batches and on foot in under 120 (dozens of light fixtures add none)', inst.ride.parts > 1000 && inst.ride.batches < 150 && inst.foot.batches < 120 && inst.fixtures > 20, JSON.stringify(inst));
  // A model stands on the floor: a locker's base is at floor height, next to its wall.
  const r = await page.evaluate(() => { const u = window.__underflow; u.beginSector(0); u.startRide(); u.startExplore(); u.step(2); const E = window.__explore;
    const l = E.lockers[0]; if (!l) return null; E.player.pos = [l.pos[0] - l.wd[0] * 1.5, 0, l.pos[2] - l.wd[1] * 1.5]; u.step(2);
    return { base: l.part.matrix[13], prompt: document.getElementById('prompt').textContent }; });
  check('a model locker stands on the floor and can still be opened', !r || (Math.abs(r.base) < 1.2 && /supply locker/i.test(r.prompt)), JSON.stringify(r));
  await finish(browser, errors);
})();
