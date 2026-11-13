// 3D props: the GLB models (generated and CC0) load, and on foot they stand where the primitive stand-ins stood:
// supply lockers, pool ladders, pump valves, the rubber ducks you can pick up; and they dress the rooms: ceiling
// light fixtures, the electrical cabinet and junction box at the service panel, caged lamps over the valves, an
// extinguisher at every landing, tools on a maintenance platform, chairs and benches in the vignettes.
const { open, newCampaign, check, finish } = require('./lib.cjs');
(async () => {
  const { browser, page, errors } = await open({ width: 800, height: 450 });
  await newCampaign(page);
  const st = await page.evaluate(async () => { await window.__underflow.modelsReady; return window.__underflow.modelState(); });
  check('every model loads (generated and CC0)', st.ready.length === 48 && !Object.keys(st.failed).length, JSON.stringify(st));
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
  check('pool drains: overflow grates line the deck edges and main drains sit in the basin floor', (seen.drain || 0) > 8, JSON.stringify(seen));
  const marks = await page.evaluate(() => { const u = window.__underflow; let depth = 0, dive = 0, maps = new Set();
    for (let i = 0; i < 8; i++) { u.beginSector(i); u.startRide(); u.startExplore(); u.step(1); for (const p of window.__explore.parts) { if (/^Deck marking depth/.test(p.name)) { depth++; maps.add(p.material.map); } if (/^Deck marking dive/.test(p.name)) { dive++; maps.add(p.material.map); } } }
    return { depth, dive, distinctMaps: maps.size }; });
  check('the deck carries depth and no-diving markings at the pool edge, sharing one texture per text', marks.depth > 2 && marks.dive > 2 && marks.distinctMaps <= 16, JSON.stringify(marks));
  check('custom models: the lifeguard tower, ring buoys at the ladders, starting blocks at a pool edge, and the blaster in your hand', seen.tower > 0 && seen.buoy > 0 && seen.blaster > 0 && seen.startingBlock >= 3, JSON.stringify(seen));
  check('rooms are dressed: light fixtures, the cabinet, junction box and fire alarm at the panel, lamps and hose reels by the valves, extinguishers, tools, a jerrycan, chairs', ['fluorescent', 'utilityBox', 'powerBox', 'fireAlarm', 'wallLamp', 'hose', 'extinguisher', 'toolCart', 'jerrycan', 'chair'].every((n) => seen[n] > 0), JSON.stringify(seen));
  check('the facility is used: wet-floor signs at the pool edge, a wall clock at the panel, a stool, broom and chemical jug at a maintenance platform, a megaphone, bin bags and boxes at a landing', ['wetFloorSign', 'clock', 'stool', 'broom', 'jug', 'megaphone', 'trashBag', 'box'].every((n) => seen[n] > 0), JSON.stringify(seen));
  // The moored raft fills the middle of the landing; the dock dressing lines the side wall and stays out of it.
  const dock = await page.evaluate(() => { const u = window.__underflow; const out = [];
    for (let i = 0; i < 8; i++) { u.beginSector(i); u.startRide(); u.startExplore(); u.step(1); const E = window.__explore;
      const names = /^(Fire extinguisher|Parts rack|Jerrycan|Spare pipe sections|Tool cart|Tool chest|Chemical jug|Drain cleaner|Workshop stool|Toolbox|Broom|Generator|Bins|Equipment crate \d|Megaphone|Bin bag|Cardboard box|Searchlight)$/;
      for (const m of E.models()) if (names.test(m.name)) out.push({ i, name: m.name, d: +Math.hypot(m.at[0] - E.raftPos[0], m.at[2] - E.raftPos[2]).toFixed(2) }); }
    return out; });
  const tooClose = dock.filter((x) => x.d < 1.55);
  check('dock dressing stands along the side wall, clear of the moored raft (every prop over 1.55 m from its centre)', dock.length > 40 && !tooClose.length, JSON.stringify({ n: dock.length, tooClose: tooClose.slice(0, 6) }));
  check('a camera watches the service panel, an empty wheelchair faces the water, a generator and toolbox at the maintenance platform, a searchlight at a landing', ['camera', 'wheelchair', 'generator', 'toolbox', 'drainCleaner', 'hangingLight', 'searchlight'].every((n) => seen[n] > 0), JSON.stringify(seen));
  // The Lane Rope is a racing lane line: disc floats on a steel cable between wall anchors. Split an anchor and it drops.
  const rope = await page.evaluate(() => { const u = window.__underflow; u.beginSector(0); u.startRide(); u.setState({ health: 1e6 }); u.step(3); const R = window.__ride;
    R.spawnEnc('rope'); u.step(12);
    const size = (p) => Math.hypot(p.matrix[0], p.matrix[1], p.matrix[2]);
    const mine = R.parts.filter((p) => /^Lane rope 0 /.test(p.name));
    const shown = () => mine.filter((p) => size(p) > 0.001).length;
    const discs = mine.filter((p) => / disc /.test(p.name)), geos = new Set(discs.map((p) => p.geometry)).size;
    const before = shown(); R.hitTarget('ropeanchor0'); R.hitTarget('ropeanchor0'); u.step(2);
    return { parts: mine.length, discs: discs.length, geos, before, after: shown() }; });
  check('the Lane Rope is disc floats on a cable between wall anchors (one shared disc shape), and splitting an anchor drops it', rope.discs === 30 && rope.geos === 1 && rope.before === rope.parts && rope.after === 0, JSON.stringify(rope));
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
