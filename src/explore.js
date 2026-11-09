// On foot at a dock. You can go anywhere you can reach, but you must find your own way back to the raft.
// The goal: carry the power cell to the service panel (which opens the gate to the Safe Room's arrival
// bay), then return to the moored raft. Each attraction adds its own rules (see sectors.js).
import { Renderer67, box, sphere, cylinder, torus } from '67js';
import { writeYaw, writeBasis, writeSegment, hide, add, sub, scale, normalize, clamp, damp, rng, raySphere, rayPlaneY, linear, distance, cross, display, angleTo, soundDir } from './math.js';
import { tileTexture, tileNormal } from './textures.js';
import { signMaterial, quad } from './labels.js';
import { createBlaster, PROFILES, PROFILE_ORDER } from './blaster.js';
import { createCrewFigure, hideCrewFigure, poseStanding, poseProne, VISITOR_LOOK } from './crewfigure.js';
import { input, wasPressed, isDown, requestLock } from './input.js';
import { hud } from './hud.js';
import { sound } from './audio.js';
import { quality } from './quality.js';
import { settings } from './settings.js';
import { AMBIENT } from './sectors.js';
import { documentFor } from './documents.js';
import { createDirector, AFTERMATH } from './director.js';
import { compressorRefill } from './hull.js';
import { facility as facilityMem } from './memory.js';
import { showModal, hideModal } from './ui.js';

/** Machines whose setting changes the way out: [title, option A, option B] with [label, routeMod, toast]. */
const ROUTE_CHOICES = {
  water: ['Raise or drain?', ['RAISE THE POOL · fast, flooded outlet', 'flooded', 'THE OUTLET WILL BE FLOODED · FAST, DEEP, THINGS IN IT'], ['DRAIN THE SIDE CHANNEL · slow, exposed outlet', 'drained', 'THE OUTLET WILL BE EXPOSED · SLOW, SHALLOW, SUPPLIES ON THE LEDGES']],
  divert: ['Where does the pressure go?', ['DIVERT TO THE SUBMERGED EXIT · the water comes off it', 'drained', 'THE EXIT WILL BE EXPOSED · YOU RIDE OUT THROUGH IT'], ['DIVERT INTO THE POOL · the waves finally start', 'flooded', 'THE WAVES WILL START · THE WAY OUT WILL BE ROUGH']],
};

/** What the stop is for. Every kind restores or reroutes the raft; every kind opens the way on. */
const DOCK = {
  power: { item: 'power cell', sign: 'SERVICE GATE\nCIRCUIT 3', machine: 'SERVICE PANEL', verb: 'restoring the circuit', hold: 5,
    find: 'Find the power cell. Restore the service gate. Return to the raft.', carry: 'Bring the power cell to the service panel.' },
  repair: { item: 'compressor fitting', sign: 'COMPRESSOR\nSERVICE AIR · GATE 3', machine: 'COMPRESSOR', verb: 'priming the compressor', hold: 5,
    find: 'Repair stop. Find a fitting for the compressor: it refills the raft and powers the gate back onto the slide.', carry: 'Fit it to the compressor.' },
  water: { item: 'pump fuse', sign: 'POOL PUMP\nRAISE LEVEL', machine: 'POOL PUMP', verb: 'raising the holding pool', hold: 5,
    find: 'Water-control stop. Find the pump fuse and raise the holding pool so the raft can reach the high outlet.', carry: 'Bring the fuse to the pool pump.' },
  retrieval: { item: 'power cell', sign: 'SERVICE GATE\nCIRCUIT 3', machine: 'SERVICE PANEL', verb: 'restoring the circuit', hold: 5,
    find: 'Restore the service gate. A supply container fell onto the deck somewhere: worth the detour.', carry: 'Bring the power cell to the service panel.' },
  divert: { item: 'pressure key', sign: 'WAVE GENERATOR\nPRESSURE · DIVERT', machine: 'WAVE GENERATOR', verb: 'diverting pressure', hold: 6,
    find: 'Find the pressure key. Divert the wave generator\'s pressure so the water comes off the submerged exit. A side basin may hold a survivor.', carry: 'Fit the key to the wave generator.' },
  winch: { item: 'winch handle', sign: 'GATE WINCH\nHAND OPERATED', machine: 'GATE WINCH', verb: 'winching the gate up', hold: 8,
    find: 'Winch stop. The gate collapsed behind the raft. Find the winch handle, then winch it up while the crew holds them off.', carry: 'Fit the handle to the winch.' },
};

const CELL = 4;
const FOV = 74;
const EYE = 1.65;
const POOL = -0.65;
const DEEP = -2.2;
const RADIUS = 0.45;
const UP = [0, 1, 0];
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const CURRENT = { '>': [1, 0], '<': [-1, 0], '^': [0, -1], v: [0, 1] };
const WATERISH = new Set(['~', 'u', 'L', 'f', 'R', 'r', '>', '<', '^', 'v']);

export function createExplore(canvas, state, sector, events, opts = {}) {
  const rules = sector.explore || {};
  const random = rng(2000 + sector.index * 17 + state.attempt * 3 + (state.seed || 0));
  const rows = sector.map;
  const H = rows.length, W = rows[0].length;
  const key = state.sectorKey;
  const drained = !!state.drained?.[key];
  const powered = () => !!state.power?.[key];
  const dockItem = (state.ride?.items || []).find((it) => it.type === 'pool' && it.dock);
  const dockKind = DOCK[dockItem?.dock?.kind] ? dockItem.dock.kind : 'power';
  const K = DOCK[dockKind];
  const grid = rows.map((row) => [...row]);
  const find = (ch) => {
    const out = [];
    grid.forEach((row, z) => row.forEach((c, x) => c === ch && out.push([x, z])));
    return out;
  };
  // Authored landmarks stay; which candidate is used varies by run.
  const choose = (ch, keepAs) => {
    const list = find(ch);
    const keep = list.length ? list[Math.floor(random() * list.length)] : null;
    for (const [x, z] of list) if (keep && (x !== keep[0] || z !== keep[1])) grid[z][x] = keepAs;
    return keep;
  };
  const cellP = choose('P', '.');
  const cellU = choose('u', '~');
  const at = (x, z) => (z < 0 || z >= H || x < 0 || x >= W ? '#' : grid[z][x]);
  const cellOf = (x, z) => [Math.floor(x / CELL), Math.floor(z / CELL)];
  const center = (x, z) => [x * CELL + CELL / 2, 0, z * CELL + CELL / 2];
  const isWall = (x, z) => at(x, z) === '#';

  // Mutable world state
  let highWater = false; // floating bridge raised
  let pumpOn = true; // currents
  let lagoonLevel = 0; // rooftop: 0 low, 1 mid, 2 high
  let waveT = 0;
  let waveOn = false;
  let keypadOpen = false;
  let gateOpen = false;
  let sensorRevealed = false;
  const surface = (x, z) => (rules.reflection && WATERISH.has(at(x, z)) ? [-0.45, -0.2, -0.05][lagoonLevel] : -0.05);
  const isWater = (x, z) => {
    const c = at(x, z);
    if (WATERISH.has(c)) return true;
    if (c === 'd') return !drained;
    if (c === 'w') return waveOn;
    return false;
  };
  const floorTop = (x, z) => {
    const c = at(x, z);
    if (c === 'x') return DEEP;
    if (c === 'B') return highWater ? 0.07 : DEEP;
    if (WATERISH.has(c) || c === 'd') return POOL;
    return 0;
  };
  const blocked = (x, z) => {
    const c = at(x, z);
    return c === '#' || c === 'x' || (c === 'B' && !highWater) || (c === 'K' && !keypadOpen) || (c === 'G' && !gateOpen);
  };
  const inWaterAt = (px, pz) => isWater(...cellOf(px, pz));

  // ---------- Parts ----------
  const map = tileTexture(sector);
  const tileMat = { color: [1, 1, 1], metallic: 0, roughness: 0.22, map, normalMap: tileNormal(), normalScale: [1, 1], boxMapScale: 0.5 };
  const lampColor = linear(sector.lamp);
  const slab = box(0, 1);
  const ball = sphere(28, 18);
  const plane = quad();
  const parts = [];
  const P = (name, geometry, material) => {
    const p = { name, geometry, matrix: new Float32Array(16), material };
    parts.push(p);
    return p;
  };
  const glow = (color, emission, extra = {}) => ({ color, metallic: 0, roughness: 1, emission, emissiveColor: color, ...extra });
  const dark = (c = [0.02, 0.02, 0.02]) => ({ color: c, metallic: 0.2, roughness: 0.6 });
  const waterMat = () => ({ tag: 'water', color: linear(sector.water), metallic: 0.55, roughness: 0.08 });
  const facing = (part, pos, normal, w, h) => writeBasis(part.matrix, pos, normalize(cross(scale(normal, -1), UP)), UP, normal, w, h, 1);
  const wallH = rules.openSky ? 1.4 : 5;
  const hash = (a, b) => {
    const v = Math.sin(a * 127.1 + b * 311.7 + sector.index * 74.7) * 43758.5453;
    return v - Math.floor(v);
  };

  const waterParts = [];
  const tidal = [];
  const lamps = [];
  for (let z = 0; z < H; z++) {
    for (let x = 0; x < W; x++) {
      const c = center(x, z);
      if (isWall(x, z)) {
        if (DIRS.some(([dx, dz]) => !isWall(x + dx, z + dz))) writeYaw(P(`Wall ${x},${z}`, slab, tileMat).matrix, [c[0], wallH / 2 - 0.5, c[2]], 0, CELL, wallH + 1, CELL);
        continue;
      }
      const ch = at(x, z);
      const top = ch === 'B' ? DEEP : floorTop(x, z);
      writeYaw(P(`Floor ${x},${z}`, slab, tileMat).matrix, [c[0], top - 0.25, c[2]], 0, CELL, 0.5, CELL);
      if (WATERISH.has(ch) || ch === 'x' || ch === 'B' || (ch === 'd' && !drained)) waterParts.push({ part: P(`Water ${x},${z}`, slab, waterMat()), x, z });
      if (ch === 'w') tidal.push({ part: P(`Tide ${x},${z}`, slab, waterMat()), x, z });
      if (ch === 'd' && drained) writeYaw(P(`Marking ${x},${z}`, slab, glow([1, 0.8, 0.2], 0.3, { color: [0.9, 0.75, 0.15], roughness: 0.6 })).matrix, [c[0], POOL + 0.01, c[2]], 0, 0.35, 0.02, CELL * 0.8);
      if ((x + z) % 2 === 0 && !rules.openSky) {
        const lamp = P(`Lamp ${x},${z}`, slab, glow(lampColor, 9));
        lamps.push({ part: lamp, pos: [c[0], wallH - 0.4, c[2]], x, z, dark: hash(x, z) < (rules.dark || 0), broken: 0, flicker: hash(z, x), on: false, level: 0 });
      }
    }
  }
  if (!rules.openSky) writeYaw(P('Ceiling', slab, tileMat).matrix, [(W * CELL) / 2, wallH + 0.25, (H * CELL) / 2], 0, W * CELL, 0.5, H * CELL);
  // Ledges where a pool meets dry floor.
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
    const top = floorTop(x, z);
    if (isWall(x, z) || top >= 0 || at(x, z) === 'B') continue;
    for (const [dx, dz] of DIRS) {
      if (isWall(x + dx, z + dz) || floorTop(x + dx, z + dz) < 0 || at(x + dx, z + dz) === 'B') continue;
      const c = center(x, z);
      writeYaw(P(`Ledge ${x},${z},${dx},${dz}`, slab, tileMat).matrix, [c[0] + dx * (CELL / 2 - 0.12), top / 2, c[2] + dz * (CELL / 2 - 0.12)], 0, dx ? 0.24 : CELL, -top, dz ? 0.24 : CELL);
    }
  }
  // Depth markings on pool walls. The Blacklight Pavilion's keypad code is painted here.
  const code = [1 + Math.floor(random() * 9), Math.floor(random() * 10), Math.floor(random() * 10)];
  const markings = find('n').map(([x, z], i) => {
    const wd = DIRS.find(([dx, dz]) => isWall(x + dx, z + dz)) || [0, -1];
    const c = center(x, z);
    const pos = [c[0] + wd[0] * (CELL / 2 - 0.04), 1.6, c[2] + wd[1] * (CELL / 2 - 0.04)];
    const part = P(`Depth marking ${i}`, plane, { ...signMaterial(`${['I', 'II', 'III'][i] || 'IV'} · ${code[i] ?? 0}`, rules.uv ? 'uv' : 'depth', rules.uv ? 2 : 0.4, 256, 128), doubleSided: true });
    return { part, pos, normal: [-wd[0], 0, -wd[1]] };
  });
  const uvArrows = rules.uv && cellP ? Array.from({ length: 6 }, (_, i) => ({ part: P(`UV arrow ${i}`, slab, glow([0.8, 0.5, 1], 3)) })) : [];

  // The moored raft at the dock
  const [dx0, dz0] = find('D')[0];
  const dockC = center(dx0, dz0);
  const dockWall = DIRS.find(([dx, dz]) => isWall(dx0 + dx, dz0 + dz)) || [-1, 0];
  const raftPos = [dockC[0] + dockWall[0] * 0.8, 0.05, dockC[2] + dockWall[1] * 0.8];
  writeBasis(P('Moored raft', torus(0.3, 48, 16), { color: [0.75, 0.32, 0.12], metallic: 0, roughness: 0.6 }).matrix, raftPos, [1, 0, 0], [0, 0, -1], UP, 1.05, 1.05, 1.3);
  writeYaw(P('Tether post', cylinder(16, 0.05, 1), { color: [0.75, 0.6, 0.15], metallic: 0.6, roughness: 0.4 }).matrix, [dockC[0] - dockWall[0] * 0.6, 0.6, dockC[2] - dockWall[1] * 0.6], 0, 0.08, 1.2, 0.08);

  // Power cell and service panel
  const cellPos = cellP ? add(center(...cellP), [0, 0.9, 0]) : null;
  const powerCell = P('Power cell', cylinder(24, 0.1, 2), glow([0.85, 1, 0.35], 4, { color: [0.9, 1, 0.4], roughness: 0.3 }));
  if (cellPos) writeYaw(P('Cell stand', slab, { color: [0.2, 0.22, 0.2], metallic: 0.6, roughness: 0.4 }).matrix, [cellPos[0], 0.3 + floorTop(...cellP), cellPos[2]], 0, 0.8, 0.6, 0.8);
  let hasCell = !!opts.hasCell || powered();
  const [scx, scz] = find('S')[0];
  const sWall = DIRS.find(([dx, dz]) => isWall(scx + dx, scz + dz)) || [1, 0];
  const sC = center(scx, scz);
  const panelPos = [sC[0] + sWall[0] * (CELL / 2 - 0.05), 1.4, sC[2] + sWall[1] * (CELL / 2 - 0.05)];
  const panel = P('Service panel', slab, glow([1, 0.15, 0.1], 1.2, { color: [0.4, 0.06, 0.05], metallic: 0.5, roughness: 0.35 }));
  writeYaw(panel.matrix, panelPos, 0, sWall[0] ? 0.12 : 1.6, 2.2, sWall[1] ? 0.12 : 1.6);
  facing(P('Service sign', plane, { ...signMaterial(K.sign, 'sign', 0.6, 256, 128), doubleSided: true }), add(panelPos, [-sWall[0] * 0.08, 1.6, -sWall[1] * 0.08]), [-sWall[0], 0, -sWall[1]], 1.4, 0.7);

  // Fake shelters: amber beacon, no vent tone.
  const fake = find('F').map(([x, z]) => {
    const wd = DIRS.find(([dx, dz]) => isWall(x + dx, z + dz)) || [0, 1];
    const c = center(x, z);
    const pos = [c[0] + wd[0] * (CELL / 2 - 0.05), 1.4, c[2] + wd[1] * (CELL / 2 - 0.05)];
    writeYaw(P('Shelter door', slab, { color: [0.15, 0.25, 0.18], metallic: 0.7, roughness: 0.4 }).matrix, pos, 0, wd[0] ? 0.14 : 2, 2.8, wd[1] ? 0.14 : 2);
    writeYaw(P('Shelter beacon', ball, glow([1, 0.65, 0.15], 4)).matrix, add(pos, [-wd[0] * 0.15, 1.9, -wd[1] * 0.15]), 0, 0.22, 0.22, 0.22);
    facing(P('Shelter sign', plane, { ...signMaterial('SHELTER\nPRESSURE SEALED', 'amber', 0.7, 256, 128), doubleSided: true }), add(pos, [-wd[0] * 0.09, 1.7, -wd[1] * 0.09]), [-wd[0], 0, -wd[1]], 1.3, 0.6);
    return { pos, used: false };
  });

  // Pickups and props
  // A retrieval stop: a supply container knocked onto the deck, as far from the raft as the level allows.
  let container = null;
  if (dockKind === 'retrieval') {
    const spots = find('.').filter(([x, z]) => Math.abs(x - dx0) + Math.abs(z - dz0) > 5);
    const c = spots.length ? spots[Math.floor(random() * spots.length)] : null;
    if (c) container = { part: P('Supply container', box(0.08, 2), { color: [0.85, 0.55, 0.12], metallic: 0.3, roughness: 0.5, emission: 0.4, emissiveColor: [1, 0.6, 0.2] }), pos: add(center(...c), [0, 0.45, 0]), taken: false };
  }
  let paddleCool = 0;
  let deathCache = null;
  let surge = null;
  const facility = facilityMem;

  // ---------- Exploration pass: puzzles, architecture, the thread, the crew ----------
  const label = (text, style, pos, normal, w, h, px = 384, py = 160) => facing(P(`Sign ${text.slice(0, 12)}`, plane, { ...signMaterial(text, style, 0.8, px, py), doubleSided: true }), pos, normal, w, h);
  const wallSpot = (x, z) => {
    const wd = DIRS.find(([dx, dz]) => isWall(x + dx, z + dz)) || [0, 1];
    const c = center(x, z);
    return { pos: [c[0] + wd[0] * (CELL / 2 - 0.08), 1.7, c[2] + wd[1] * (CELL / 2 - 0.08)], normal: [-wd[0], 0, -wd[1]] };
  };
  const floorCells = find('.').filter(([x, z]) => Math.abs(x - dx0) + Math.abs(z - dz0) > 3);
  const takeCell = () => floorCells.splice(Math.floor(random() * floorCells.length), 1)[0];
  // Pump sequence (water-control and repair stops): three valves, an order on a diagram at the dock that varies by run.
  // The diagram shows four pumps. You will only ever find three.
  const valvesOn = dockKind === 'water' || dockKind === 'repair';
  const valveOrder = ['A', 'B', 'C'].sort(() => random() - 0.5);
  const pumpValves = valvesOn ? ['A', 'B', 'C'].map((id) => {
    const c = takeCell();
    if (!c) return null;
    const w = wallSpot(...c);
    const wheel = P(`Pump valve ${id}`, torus(0.1, 32, 10), glow([0.3, 0.65, 1], 1.5, { color: [0.2, 0.5, 1] }));
    writeBasis(wheel.matrix, add(w.pos, scale(w.normal, 0.1)), normalize(cross(w.normal, UP)), UP, w.normal, 0.45, 0.45, 0.45);
    label(`VALVE ${id}\nPUMP ${'ABC'.indexOf(id) + 1} OF 4`, 'sign', add(w.pos, [0, 0.8, 0]), w.normal, 1, 0.42);
    return { id, pos: w.pos, wheel, open: false };
  }).filter(Boolean) : [];
  let valveStep = 0;
  if (valvesOn) {
    const w = wallSpot(dx0, dz0);
    label(`PRESSURE DIAGRAM\nOPEN IN ORDER: ${valveOrder.join(' → ')}\nPUMPS: 1 2 3 4`, 'rule', add(w.pos, [0, 0.2, 0]), w.normal, 1.6, 0.7, 512, 220);
  }
  // ---------- What the facility remembers (memory.js authored this expedition's variation) ----------
  // The payoff is physical first: the player should notice the contradiction before any caption explains it.
  // Captions only come when you are close and looking at it, and the ledger records only what the crew saw.
  const variant = sector.variant || {};
  const remembered = [];
  const prop = (name, mat, pos, size, yaw = 0) => { const p = P(name, box(0.02, 2), mat); writeYaw(p.matrix, pos, yaw, ...size); return p; };
  const vestMat = { color: linear('#b46a3c'), metallic: 0, roughness: 0.65 };
  const cupMat = { color: [0.88, 0.88, 0.84], metallic: 0, roughness: 0.4 };
  // The same small details, in the same places relative to a wall: they will be here, and again later.
  const repeatDetails = (w) => {
    const side = normalize(cross(w.normal, UP));
    prop('Missing tile', { color: [0.05, 0.06, 0.06], metallic: 0, roughness: 1 }, add(add(w.pos, scale(side, -1.1)), [0, -0.5, 0]), [0.24, 0.24, 0.03], Math.atan2(w.normal[0], w.normal[2]));
    writeYaw(P('Discarded cup', cylinder(14, 0.05, 1), cupMat).matrix, add(add(w.pos, scale(side, 0.9)), add(scale(w.normal, 0.35), [0, -1.65, 0])), 0, 0.06, 0.1, 0.06);
  };
  if (variant.plaque) {
    // The repair is still there: your tape is still on the handle. The plate credits Crew Seven, twenty years ago.
    const w = wallSpot(dx0, dz0);
    label('PUMP REPAIRED · 2006\nCREDIT: DRAINER CREW SEVEN\nINSPECTION PLATE 14', 'count', add(w.pos, [0.9, -0.3, 0]), w.normal, 1.3, 0.6, 512, 220);
    prop('Fresh tape on the handle', { color: linear('#b19a50'), metallic: 0, roughness: 0.7 }, add(panelPos, [0, -0.35, 0]), [0.32, 0.08, 0.32]);
    repeatDetails(w);
    remembered.push({ pos: add(w.pos, [0.9, -0.3, 0]), cap: '[the plate says Crew Seven repaired this in 2006. The tape on the handle is the tape you wrapped. The wrench marks are yours.]', ledger: `${sector.name}: our repair, credited to Crew Seven in 2006` });
  }
  const lockerCell = variant.lockers ? takeCell() : null;
  if (lockerCell) {
    // A second changing room: the same locker numbers, the same broken hinge, the same missing tile, the same cup.
    const w = wallSpot(...lockerCell);
    const side = normalize(cross(w.normal, UP));
    const yaw = Math.atan2(w.normal[0], w.normal[2]);
    for (let i = 0; i < 6; i++) {
      const at = add(add(w.pos, scale(side, (i - 2.5) * 0.62)), [0, -0.7, 0]);
      prop(`Remembered locker ${i}`, { color: [0.18, 0.28, 0.38], metallic: 0.6, roughness: 0.45 }, at, [0.58, 2, 0.5], yaw);
      if (i === 1) prop('Broken locker door', { color: [0.2, 0.3, 0.4], metallic: 0.6, roughness: 0.45 }, add(at, add(scale(w.normal, 0.45), scale(side, 0.2))), [0.56, 1.9, 0.04], yaw + 0.9);
    }
    label('0415 · 0416 · 0417 · 0418 · 0419 · 0420', 'count', add(w.pos, [0, 0.6, 0]), w.normal, 2.4, 0.3, 640, 80);
    repeatDetails(w);
    // In 0417: a dry flotation vest, folded. The name in the collar is someone you brought back.
    const vestAt = add(add(w.pos, scale(side, (1 - 2.5) * 0.62 + 0.62)), add(scale(w.normal, 0.38), [0, -0.9, 0]));
    prop('Dry vest in 0417', vestMat, vestAt, [0.42, 0.14, 0.32], yaw);
    const visitor = (state.visitorsThisRun || [])[0] || facility.visitors[facility.visitors.length - 1]?.name;
    label(visitor ? visitor.toUpperCase() : `DRAINER ${state.band}`, 'count', add(vestAt, add(scale(w.normal, 0.17), [0, 0.12, 0])), w.normal, 0.36, 0.08, 384, 64);
    remembered.push({ pos: vestAt, cap: visitor ? `[locker 0417: a dry flotation vest. The name in the collar is ${visitor}.]` : `[locker 0417: a dry flotation vest with your wristband number in the collar. You are wearing your vest.]`, ledger: `${sector.name}: a second changing room with the same lockers, the same hinge, the same cup` });
  }
  if (variant.waiting) {
    // The dock you skipped last time: every light on, the tether post polished.
    for (let i = 0; i < 4; i++) prop(`Waiting light ${i}`, { color: [1, 1, 1], metallic: 0, roughness: 1, emission: 7, emissiveColor: linear('#d8d6a6') }, add(dockC, [Math.cos(i * 1.57) * 1.6, 3.2, Math.sin(i * 1.57) * 1.6]), [0.9, 0.05, 0.25]);
    writeYaw(P('Polished tether ring', torus(0.04, 32, 8), { color: [0.95, 0.8, 0.45], metallic: 1, roughness: 0.08 }).matrix, [dockC[0] - dockWall[0] * 0.6, 1.05, dockC[2] - dockWall[1] * 0.6], 0, 0.22, 0.22, 0.22);
    remembered.push({ pos: [dockC[0], 0, dockC[2]], cap: '[last time you skipped this dock. Every light in it is on. Someone polished the tether post.]', ledger: `${sector.name}: the skipped dock was waiting with its lights on` });
  }
  if (variant.dangerous) {
    // Where you died: a vest caught where it happened, a warning in two hands, an incident notice for an incident
    // that "did not occur", and an abandoned cache. The place is observant, not harder.
    const d = variant.deathAt || {};
    const at = d.pos ? [d.pos[0], 0, d.pos[2]] : [dockC[0], 0, dockC[2]];
    const [ax, az] = cellOf(at[0], at[2]);
    if (d.pos) prop('Vest where you died', vestMat, [at[0] + 0.3, floorTop(ax, az) + 0.1, at[2]], [0.42, 0.12, 0.32], 0.7);
    const w = wallSpot(dx0, dz0);
    label("DON'T STAY HERE\ndon't stay here", 'hand', add(w.pos, [-0.9, -0.6, 0]), w.normal, 1.2, 0.55, 512, 220);
    label('INCIDENT REPORT\nNO INCIDENT OCCURRED\nGUESTS ACCOUNTED FOR: ALL', 'count', add(w.pos, [-0.9, 0.35, 0]), w.normal, 1.2, 0.5, 512, 200);
    const cacheAt = add(at, [-0.6, 0, 0.5]);
    deathCache = { pos: [cacheAt[0], floorTop(ax, az) + 0.25, cacheAt[2]], part: prop('Abandoned cache', { color: [0.55, 0.5, 0.3], metallic: 0.3, roughness: 0.6 }, [cacheAt[0], floorTop(ax, az) + 0.25, cacheAt[2]], [0.6, 0.4, 0.4]), taken: false };
    remembered.push({ pos: at, cap: `[a flotation vest, caught right where it happened. ${d.cause ? `The report on the wall says no incident occurred.` : ''}]`, ledger: `${sector.name}: it remembers where you died` });
  }
  if (variant.map) {
    // The water stayed where you left it. When it drops, the old line is still there: on the ceiling.
    if (variant.water === 'drained') for (let i = 0; i < 3; i++) { const w = wallSpot(dx0 + i, dz0); prop(`Ceiling waterline ${i}`, { color: linear('#4d7472'), metallic: 0, roughness: 0.4 }, add(w.pos, [0, 1.35, 0]), [CELL, 0.12, 0.04], Math.atan2(w.normal[0], w.normal[2]) + Math.PI / 2); }
    remembered.push({ pos: [dockC[0], 0, dockC[2]], cap: variant.water === 'drained' ? '[the water is lower than you left it. There is a waterline on the ceiling. Everything below it is cleaner.]' : '[the water is higher than you left it. Your last diversion held, and then some.]', ledger: `${sector.name}: the water is where we left it` });
  }

  // A pool clock that only moves while nobody is looking at it.
  const clockCell = takeCell();
  const clock = clockCell ? (() => {
    const w = wallSpot(...clockCell);
    const faces = ['03:14', '03:14', '04:51', '11:02', '03:13'].map((t, i) => {
      const part = P(`Pool clock ${i}`, plane, { ...signMaterial(`POOL CLOCK\n${t}`, 'depth', 0.8, 256, 128), doubleSided: true });
      facing(part, add(w.pos, [0, 0.9, 0]), w.normal, 0.8, 0.4);
      return { part, m: Float32Array.from(part.matrix) };
    });
    return { pos: w.pos, faces, i: 0, away: 0 };
  })() : null;
  // The same maintenance notice, every attraction, one more name each time.
  const NOTICE_NAMES = ['R. Imbert', 'C. Teague', 'P. Natarajan', 'O. Bassey', 'H. Vance', 'J. Sato', state.name];
  const noticeCell = takeCell();
  const notice = noticeCell ? (() => {
    const w = wallSpot(...noticeCell);
    const names = NOTICE_NAMES.slice(0, Math.min(NOTICE_NAMES.length, 1 + sector.index));
    label(`MAINTENANCE NOTICE\nDO NOT ENTER THE OVERFLOW ALONE\n${names.join(' · ')}`, 'sign', add(w.pos, [0, 0.4, 0]), w.normal, 1.7, 0.75, 512, 220);
    return { pos: w.pos, seen: false, names };
  })() : null;
  // Every depth marker says 1.2 metres. Including the one by the shaft with no bottom.
  const shafts = find('x').slice(0, 2);
  // Laid flat at the edge of the shaft (a flat basis: the wall-facing helper has no 'up' for a floor sign).
  for (const [x, z] of shafts) writeBasis(P('Depth 1.2', plane, { ...signMaterial('1.2 M', 'depth', 0.8, 256, 128), doubleSided: true }).matrix, add(center(x, z), [0, 0.06, CELL * 0.3]), [1, 0, 0], [0, 0, -1], [0, 1, 0], 0.8, 0.4, 1);
  // June in the water: the defining moment. After a fight, she sits down in the warm water and looks relieved.
  const juneCan = sector.index >= 4 && state.character !== 'june' && !(state.forgotten || []).includes('june') && !sector.custom;
  const juneParts = { body: P('June, sitting', cylinder(12, 0.3, 2), { color: [0.25, 0.4, 0.6], metallic: 0, roughness: 0.6 }), head: P('June head', sphere(12, 8), { color: [0.75, 0.62, 0.52], metallic: 0, roughness: 0.4 }) };
  const juneEvent = { state: juneCan ? 'waiting' : 'none', pos: null, lift: 0 };
  // Ariadne's thread: a line paid out from the raft behind you, so you can find the way back. Grout cuts it.
  const threadParts = Array.from({ length: 70 }, (_, i) => P(`Thread ${i}`, slab, glow([1, 0.82, 0.25], 0.55, { color: [0.75, 0.6, 0.2] })));
  const thread = [];
  // Fumes: only in marked stagnant pockets, and around a pump you have just started.
  const stagnant = new Set();
  for (const [x, z] of [...find('~'), ...find('x')]) if (hash(x * 3.1, z * 1.7) < 0.22 && stagnant.size < 10) stagnant.add(`${x},${z}`);
  const haze = [...stagnant].map((k) => {
    const [x, z] = k.split(',').map(Number);
    const part = P(`Stagnant haze ${k}`, slab, { color: [0.55, 0.8, 0.4], metallic: 0, roughness: 1, emission: 0.25, emissiveColor: [0.6, 0.9, 0.4], alphaMode: 'blend', opacity: 0.07 });
    writeYaw(part.matrix, add(center(x, z), [0, 0.35, 0]), 0, CELL * 0.95, 0.7, CELL * 0.95);
    return part;
  });
  let vapour = 0; // seconds of trapped vapour after a pump starts
  // Pump Defence (challenge): hold the chamber through five cycles.
  const pumpChallenge = opts.challenge === 'pump' ? { cycle: 0, t: 0 } : null;
  let shoveCool = 0, shoveFatigue = 0, pingT = 0, callerAt = -100, callerWho = null;
  const pingMark = P('Ping marker', torus(0.06, 32, 8), glow([0.4, 1, 0.9], 6));
  // The crew on foot: they walk your own trail behind you (so they never take a route you couldn't), cover you,
  // come to you when you are down, and are at the raft when you board. Distinct silhouettes, as on the raft.
  const followers = (state.regrouped || sector.index > 0) && !state.endless && (!sector.custom || sector.chapter)
    ? Object.keys(state.crewState || {}).filter((c) => !(state.forgotten || []).includes(c) && state.crewState[c] !== 'hurt').slice(0, 3).map((id, k) => ({
      id, k, pos: null, cool: 1 + k * 0.5,
      fig: createCrewFigure(P, id, ' on foot'), walk: 0, pace: 0, yaw: 0,
    }))
    : [];
  const crewShot = P('Crew shot on foot', slab, glow([0.85, 1, 0.45], 10));
  let crewShotT = 0;
  const scrap = find('s').map(([x, z], i) => ({ part: P(`Scrap ${i}`, box(0.1, 2), glow([0.6, 1, 0.8], 0.4, { color: [0.55, 0.6, 0.58], metallic: 0.9, roughness: 0.3 })), pos: add(center(x, z), [(random() - 0.5) * 1.5, 0.25 + floorTop(x, z), (random() - 0.5) * 1.5]), taken: false }));
  const lockers = find('h').map(([x, z], i) => {
    const wd = DIRS.find(([dx, dz]) => isWall(x + dx, z + dz)) || [0, 1];
    const c = center(x, z);
    const pos = [c[0] + wd[0] * (CELL / 2 - 0.4), 1, c[2] + wd[1] * (CELL / 2 - 0.4)];
    const part = P(`Supply locker ${i}`, box(0.05, 2), { color: [0.35, 0.45, 0.5], metallic: 0.7, roughness: 0.35, emission: 0.3, emissiveColor: [0.4, 0.9, 1] });
    writeYaw(part.matrix, pos, 0, 0.8, 2, 0.6);
    return { part, pos, opened: false, item: random() < 0.55 ? 'cell' : 'filter' };
  });
  const docs = find('l').map(([x, z], i) => {
    const doc = documentFor(sector.index, i);
    const pos = add(center(x, z), [(random() - 0.5) * 1.2, 0.95 + floorTop(x, z), (random() - 0.5) * 1.2]);
    writeYaw(P(`Document ${i}`, slab, glow([1, 0.97, 0.85], 0.8, { color: [0.95, 0.93, 0.85], roughness: 0.9 })).matrix, pos, random() * 3, 0.32, 0.02, 0.42);
    writeYaw(P(`Document stand ${i}`, slab, { color: [0.3, 0.3, 0.28], metallic: 0.3, roughness: 0.6 }).matrix, [pos[0], pos[1] - 0.5, pos[2]], 0, 0.5, 0.9, 0.5);
    return { doc, pos };
  });
  const fountains = find('o').map(([x, z]) => ({ part: P('Fountain', cylinder(16, 0, 1), glow([0.7, 0.9, 1], 0.4)), pos: center(x, z), active: 0 }));
  const jets = rules.jets ? find('j').map(([x, z]) => ({ part: P(`Jet ${x},${z}`, cylinder(16, 0, 1), glow([0.85, 0.95, 1], 1.2)), pos: add(center(x, z), [0, floorTop(x, z), 0]), phase: hash(x, z) * 5, on: false, extra: 0 })) : [];
  const ring = torus(0.16, 40, 12);
  const signalSpots = [];
  for (let z = 1; z < H - 1; z++) for (let x = 1; x < W - 1; x++) if (!blocked(x, z)) for (const [dx, dz] of DIRS) if (isWall(x + dx, z + dz)) signalSpots.push({ x, z, dx, dz });
  const signals = Array.from({ length: 3 }, (_, i) => {
    const spot = signalSpots.splice(Math.floor(random() * signalSpots.length), 1)[0];
    const c = center(spot.x, spot.z);
    const pos = [c[0] + spot.dx * (CELL / 2 - 0.1), Math.min(2.2, wallH + 0.3), c[2] + spot.dz * (CELL / 2 - 0.1)];
    const part = P(`Signal ${i}`, ring, glow([0.55, 1, 0.5], 3, { color: [0.5, 1, 0.55], roughness: 0.4 }));
    writeYaw(part.matrix, pos, spot.dx ? Math.PI / 2 : 0, 0.5, 0.5, 0.5);
    return { part, pos, used: 0 };
  });

  // Floating bridge platforms and controls
  const platforms = find('B').map(([x, z]) => ({ part: P(`Platform ${x},${z}`, box(0.05, 2), { color: [0.5, 0.45, 0.35], metallic: 0.3, roughness: 0.7 }), x, z }));
  const panelAt = (cellXZ, label, color) => {
    if (!cellXZ) return null;
    const [x, z] = cellXZ;
    const wd = DIRS.find(([dx, dz]) => isWall(x + dx, z + dz)) || [0, 1];
    const c = center(x, z);
    const pos = [c[0] + wd[0] * (CELL / 2 - 0.1), 1.3, c[2] + wd[1] * (CELL / 2 - 0.1)];
    writeYaw(P(`${label} panel`, slab, glow(color, 1.5, { color: [0.15, 0.15, 0.15], metallic: 0.6 })).matrix, pos, 0, wd[0] ? 0.15 : 1, 1, wd[1] ? 0.15 : 1);
    facing(P(`${label} sign`, plane, { ...signMaterial(label, 'sign', 0.6, 256, 96), doubleSided: true }), add(pos, [-wd[0] * 0.1, 0.8, -wd[1] * 0.1]), [-wd[0], 0, -wd[1]], 1.2, 0.45);
    return pos;
  };
  const levelPos = panelAt(find('Q')[0], rules.reflection ? 'LAGOON LEVEL' : 'WATER LEVEL', [0.3, 0.7, 1]);
  const pumpPos = panelAt(find('C')[0], 'PUMP CONTROL', [1, 0.6, 0.2]);
  const keypads = find('K').map(([x, z]) => ({ part: P(`Keypad door ${x},${z}`, slab, { color: [0.3, 0.15, 0.4], metallic: 0.6, roughness: 0.4, emission: 0.6, emissiveColor: [0.7, 0.4, 1] }), x, z }));
  const gates = find('G').map(([x, z]) => ({ part: P(`Gate ${x},${z}`, slab, { color: [0.3, 0.32, 0.3], metallic: 0.8, roughness: 0.35 }), x, z }));
  const loops = find('T');
  // Rooftop reflection puzzle: the sensor exists only in the reflection until the level is right.
  const reflCell = find('R')[0];
  const reflection = reflCell ? P('Reflected sensor', plane, { ...signMaterial('◉', 'uv', 2.5, 128, 128), doubleSided: true }) : null;
  const sensorPos = reflCell ? [center(...reflCell)[0], wallH + 0.25, CELL + 0.1] : null;
  const sensor = reflCell ? P('Balcony sensor', ball, glow([0.4, 0.85, 1], 3)) : null;
  const towers = rules.openSky ? Array.from({ length: 7 }, (_, i) => P(`Tower ${i}`, slab, tileMat)) : [];
  const clouds = rules.openSky ? Array.from({ length: 12 }, (_, i) => ({ part: P(`Cloud ${i}`, box(0.4, 3), { tag: 'unlit', color: [0.97, 0.98, 1], metallic: 0, roughness: 1 }), base: [(W * CELL) / 2 + (hash(i, 1) - 0.5) * 500, 60 + hash(i, 2) * 30, (H * CELL) / 2 - 100 - hash(i, 3) * 300] })) : [];

  // ---------- Vignettes: ordinary pool details with one thing wrong. No loot, no enemy. ----------
  const VIGNETTES = [
    { cap: '[three plastic chairs, arranged to face the wall]', build: (c, wd) => [0, 1, 2].map((k) => chair(add(c, [(k - 1) * 0.8 * (wd[1] ? 1 : 0), 0, (k - 1) * 0.8 * (wd[0] ? 1 : 0)]), Math.atan2(wd[0], wd[1]))) },
    { cap: '[a pair of sandals at the edge, still wet. Nobody else\'s footprints]', build: (c) => [P('Sandal A', box(0.1, 2), { color: [0.85, 0.3, 0.25], metallic: 0, roughness: 0.6 }), P('Sandal B', box(0.1, 2), { color: [0.85, 0.3, 0.25], metallic: 0, roughness: 0.6 })].map((p, k) => (writeYaw(p.matrix, add(c, [k * 0.28 - 0.14, 0.04, 0]), 0.1 * k, 0.12, 0.04, 0.3), p)) },
    { cap: '[towels folded on a bench. Still warm]', build: (c) => { const b = P('Bench', slab, { color: [0.55, 0.42, 0.3], metallic: 0, roughness: 0.7 }); writeYaw(b.matrix, add(c, [0, 0.35, 0]), 0, 1.8, 0.1, 0.45); const t = P('Towels', box(0.2, 2), { color: [0.95, 0.95, 0.93], metallic: 0, roughness: 0.9 }); writeYaw(t.matrix, add(c, [0.3, 0.5, 0]), 0, 0.4, 0.2, 0.35); return [b, t]; } },
    { cap: '[a locker standing open. Number 0417. Empty, except for a folded vest]', build: (c, wd) => { const l = P('Open locker', box(0.05, 2), { color: [0.18, 0.28, 0.38], metallic: 0.6, roughness: 0.4 }); writeYaw(l.matrix, add(c, [wd[0] * 1.5, 1, wd[1] * 1.5]), 0, 0.7, 2, 0.6); const v = P('Locker vest', box(0.2, 2), { color: [1, 0.45, 0.1], metallic: 0, roughness: 0.6 }); writeYaw(v.matrix, add(c, [wd[0] * 1.4, 0.6, wd[1] * 1.4]), 0, 0.4, 0.12, 0.3); return [l, v]; } },
    { cap: '[a radio on the floor, tuned to a station that reads the weather for a town that does not exist]', build: (c) => { const r = P('Radio', box(0.15, 2), glow([0.4, 1, 0.5], 0.4, { color: [0.2, 0.2, 0.2], metallic: 0.4 })); writeYaw(r.matrix, add(c, [0, 0.15, 0]), 0.4, 0.45, 0.28, 0.18); return [r]; } },
    { cap: '[a shower drain gurgles under your feet, then goes quiet as if it noticed you]', build: (c) => { const d = P('Drain', cylinder(24, 0, 1), { color: [0.25, 0.27, 0.27], metallic: 0.9, roughness: 0.3 }); writeYaw(d.matrix, add(c, [0, 0.01, 0]), 0, 0.3, 0.02, 0.3); return [d]; } },
  ];
  function chair(pos, yaw) {
    const seat = P('Plastic chair', box(0.08, 2), { color: [0.93, 0.93, 0.9], metallic: 0, roughness: 0.4 });
    writeYaw(seat.matrix, add(pos, [0, 0.45, 0]), yaw, 0.5, 0.06, 0.5);
    const back = P('Plastic chair back', box(0.08, 2), { color: [0.93, 0.93, 0.9], metallic: 0, roughness: 0.4 });
    writeYaw(back.matrix, add(pos, [-Math.sin(yaw) * 0.22, 0.75, -Math.cos(yaw) * 0.22]), yaw, 0.5, 0.55, 0.06);
    return seat;
  }
  const vignettes = [];
  for (let z = 1; z < H - 1; z++) for (let x = 1; x < W - 1; x++) {
    if (at(x, z) !== '.' || hash(x + 0.3, z + 0.7) > 0.16 || Math.abs(x - find('D')[0][0]) + Math.abs(z - find('D')[0][1]) < 2) continue;
    const wd = DIRS.find(([dx, dz]) => isWall(x + dx, z + dz)) || [0, 1];
    const v = VIGNETTES[Math.floor(hash(z, x + 5) * VIGNETTES.length)];
    v.build(center(x, z), wd);
    vignettes.push({ pos: center(x, z), cap: v.cap, seen: false });
  }

  // ---------- Entities ----------
  const blooms = Array.from({ length: 16 }, (_, i) => ({
    core: P(`Bloom ${i}`, ball, { color: [0.62, 0.66, 0.6], metallic: 0, roughness: 0.15, emission: 0.02, emissiveColor: [0.77, 0.35, 0.31], alphaMode: 'blend', opacity: 0.62 }),
    heart: P(`Bloom heart ${i}`, sphere(12, 8), glow(linear('#c45a50'), 2, { color: [0.35, 0.06, 0.05] })),
    spikes: P(`Bloom spikes ${i}`, slab, dark([0.12, 0.02, 0.02])),
    active: false, pos: [0, 0, 0], hp: 2, phase: 0, dying: 0,
  }));
  const undertow = {
    patch: P('Undertow', cylinder(48, 0, 1), { color: [0.004, 0.01, 0.012], metallic: 0.9, roughness: 0.02 }),
    eye: P('Undertow glint', ball, glow([1, 0.1, 0.05], 0.02, { color: [0.2, 0, 0] })),
    pos: cellU ? center(...cellU) : [0, 0, 0], hp: 5 + Math.floor(sector.index / 2) * 2, holding: 0, alive: !!cellU, cooldown: 0, agitated: 0,
  };
  const towerCell = find('L')[0];
  const ruleText = { swim: 'NO SWIMMING DURING\nTHE MAINTENANCE CYCLE', run: 'NO RUNNING\nON DECK', fire: 'NO BLASTER DISCHARGE\nWHILE THE LAMP IS LIT' }[rules.lifeguard];
  const lifeguard = towerCell && rules.lifeguard ? {
    rule: rules.lifeguard,
    base: center(...towerCell),
    legs: [P('Tower leg A', cylinder(12, 0, 1), { color: [0.92, 0.92, 0.9], metallic: 0, roughness: 0.4 }), P('Tower leg B', cylinder(12, 0, 1), { color: [0.92, 0.92, 0.9], metallic: 0, roughness: 0.4 })],
    seat: P('Tower seat', slab, { color: [0.92, 0.92, 0.9], metallic: 0, roughness: 0.4 }),
    body: P('Lifeguard', cylinder(20, 0.3, 3), { color: linear('#9a5a50'), metallic: 0, roughness: 0.85 }), // a faded red uniform
    head: P('Lifeguard head', ball, { color: [0.78, 0.76, 0.7], metallic: 0, roughness: 0.6 }),
    hands: [0, 1].map((k) => P(`Lifeguard hand ${k}`, sphere(10, 8), { color: [0.85, 0.84, 0.8], metallic: 0, roughness: 0.5 })),
    shoulders: P('Lifeguard shoulders', box(0.2, 3), { color: linear('#9a5a50'), metallic: 0, roughness: 0.85 }),
    arms: [0, 1].map((k) => P(`Lifeguard arm ${k}`, cylinder(10, 0.3, 2), { color: linear('#9a5a50'), metallic: 0, roughness: 0.85 })),
    legs2: [0, 1].map((k) => P(`Lifeguard leg ${k}`, cylinder(10, 0.3, 2), { color: linear('#3c3a36'), metallic: 0, roughness: 0.85 })),
    cord: P('Whistle cord', slab, glow(linear('#c45a50'), 0.6, { color: linear('#c45a50') })),
    glasses: P('Lifeguard glasses', slab, { color: [0.01, 0.01, 0.01], metallic: 1, roughness: 0.05 }),
    lamp: P('Cycle lamp', ball, glow([1, 0.2, 0.1], 8)),
    breaker: P('Cycle breaker', slab, glow([1, 0.75, 0.2], 2)),
    sign: P('Rule sign', plane, { ...signMaterial(ruleText, 'rule', 0.7, 512, 200), doubleSided: true }),
    pos: null, state: 'watching', violations: 0, calm: 0, blind: 0, stopped: false, lostSight: 0, lampOn: false, breakerPos: null,
  } : null;
  const floaters = find('f').map(([x, z], i) => ({
    fig: createCrewFigure(P, 'visitor', ` floater ${i}`, VISITOR_LOOK),
    eyes: P(`Floater eyes ${i}`, slab, glow([0.7, 0.9, 1], 0.02)),
    cell: [x, z], pos: center(x, z), survivor: random() < 0.4, state: 'floating', hp: 3, holdT: 0,
  }));
  // Lane ropes across water crossings: they wrap anyone wading through until their floats are cut.
  const ropes = find('r').map(([x, z], i) => ({
    line: P(`Foot rope ${i}`, slab, { color: [0.85, 0.85, 0.8], metallic: 0, roughness: 0.6 }),
    floats: [0, 1, 2].map((j) => ({ part: P(`Foot rope float ${i}.${j}`, ball, glow([1, 0.4, 0.1], 0.6, { color: j % 2 ? [0.9, 0.9, 0.85] : [0.9, 0.25, 0.08], roughness: 0.4 })), alive: true })),
    x, z, cut: false, holding: 0, cooldown: 0,
  }));
  const marcos = find('m').map(([x, z]) => ({ pos: center(x, z), timer: 4 + random() * 6, throat: P('Marco throat', sphere(16, 12), { color: [0.85, 0.7, 0.68], metallic: 0, roughness: 0.3 }), shown: 0, throatPos: null }));
  const groutSources = find('g');
  const grout = new Map(); // "x,z" -> { cleared }
  const groutParts = Array.from({ length: 24 }, (_, i) => P(`Grout ${i}`, slab, dark([0.025, 0.028, 0.022])));
  let groutTimer = 6;
  let groutTold = false;

  const blaster = createBlaster(state);
  parts.push(...blaster.parts);
  for (const p of parts) if (p.matrix[15] === 0) hide(p);

  const sky = sector.sky;
  const renderer = new Renderer67(canvas, parts, {
    ground: false, world: true, hdr: true, ...quality.renderer,
    environment: {
      keyIntensity: rules.openSky ? 1 : 0.04, fillIntensity: rules.openSky ? 0.6 : 0.1, ambientIntensity: rules.openSky ? 0.7 : rules.uv ? 0.08 : 0.2,
      fogColor: linear(sector.fog), fogDensity: rules.openSky ? 0.005 : 0.05 + sector.index * 0.006,
      skyTop: display(sky ? sky.top : sector.fog), skyBottom: display(sky ? sky.bottom : sector.fog), lightDirection: [0.4, 1, 0.3],
    },
  });
  renderer.resize();

  // ---------- Player ----------
  const player = { pos: opts.pos ? [...opts.pos] : [dockC[0] - dockWall[0] * 1.2, 0, dockC[2] - dockWall[1] * 1.2], yaw: 0, pitch: 0, floor: 0 };
  player.yaw = opts.yaw ?? ([[0, -1, 0], [1, 0, -Math.PI / 2], [0, 1, Math.PI], [-1, 0, Math.PI / 2]].find(([dx, dz]) => !blocked(dx0 + dx, dz0 + dz))?.[2] ?? 0);
  let time = 0;
  let ripple = [0, -100, 0], rippleTime = -10;
  let waveTimer = 30;
  let nextLine = 8;
  let bob = 0;
  let wasWater = false;
  let saveTimer = 0;
  let moving = false;
  let stoppedAt = -10;
  let footstepCooldown = 0;
  let lastLoop = null;
  let scanTarget = null;
  let operating = 0;
  let lastPanelHealth = state.health;
  let waterT = 0;
  let stillT = 0;
  let sink = 0;
  let healing = 0;
  let fumeSaid = false;
  const pick = (list) => list[Math.floor(random() * list.length)];
  const forwardVec = () => [-Math.sin(player.yaw), 0, -Math.cos(player.yaw)];
  hud.objective(hasCell ? (powered() ? 'Done. Return to the raft.' : K.carry) : K.find);
  sound.setSpace(rules.openSky ? 'dry' : 'room');
  if (opts.challenge === 'pump') setTimeout(() => { director.crescendo(); hud.say('DEZ', 'Pump\'s running and it\'s loud. Five cycles. Stay near it — it stalls without us.', 'crew'); }, 1500);
  if (state.highWater) hud.caption('[the water is up. The tidal floors are under. The air over the water is heavy.]');
  if (state.landing === key && !state.landingTaken?.[key]) {
    (state.landingTaken ||= {})[key] = true;
    state.patchKits = (state.patchKits || 0) + 2;
    state.cells = Math.min(3, state.cells + 1);
    hud.toast('MAINTENANCE LANDING · EQUIPMENT CRATES · +2 PATCH KITS · +1 CELL');
  }
  if (dockKind === 'repair') {
    hud.caption('[a maintenance platform: a dead compressor, a route diagram under plastic, a pile of discarded life vests]');
    setTimeout(() => hud.say('TUBS', 'Vests. Eleven of them. Somebody counted them off and left them here.', 'crew'), 3500);
  } else if (dockKind === 'water') hud.say('JUNE', 'The outlet\'s too high. Raise the pool, the raft floats up to it. Pump house first.', 'crew');
  else if (dockKind === 'winch') hud.say('DEZ', 'Gate came down behind us. Winch is manual, and it\'s going to be loud. We hold, you crank.', 'crew');
  else if (dockKind === 'retrieval') hud.say('JUNE', 'Container fell off a cart up here. Supplies. It\'s a detour. Your call.', 'crew');
  if (find('d').length) hud.say('DEZ', drained ? 'Valve worked. That passage is drained. Walk it dry.' : 'You missed the valve, so that passage is still flooded. Watch the water.', 'crew');
  if (rules.uv) hud.say('DEZ', 'Black light. Hold right-click to scan: the marks only show up in the beam.', 'crew');
  if (rules.currents) hud.say('TUBS', 'Currents. The pump control stops them. Restart it before you board.', 'crew');
  if (rules.waves) hud.say('JUNE', 'Waves every fourteen seconds. Stay on the beach when one comes in.', 'crew');
  if (lifeguard) hud.say('MARS', `Lifeguard on the tower. Its rule: ${ruleText.replace('\n', ' ').toLowerCase()}.`, 'crew');

  const spawnBloom = (pos) => {
    const b = blooms.find((x) => !x.active);
    if (b) Object.assign(b, { active: true, pos: [...pos], hp: 2 + (sector.index > 3 ? 1 : 0), phase: random() * 6, dying: 0, stagger: 0, flash: 0, retreat: false });
  };
  for (const [x, z] of find('b')) spawnBloom(add(center(x, z), [0, 1.4, 0]));
  /** A wave spawns out of sight: an open cell at least 14 m away. */
  function wave(count, flank = false) {
    const options = [];
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (!blocked(x, z) && distance(center(x, z), player.pos) > (flank ? 9 : 14)) options.push(center(x, z));
    if (!options.length) return;
    if (!flank) {
      for (let k = 0; k < count; k++) spawnBloom(add(options[Math.floor(random() * options.length)], [0, 1.2 + random(), 0]));
      return;
    }
    // Flanking: spread the group around you by direction, so it comes from more than one side.
    const byQuarter = [[], [], [], []];
    for (const o of options) {
      const a = Math.atan2(o[0] - player.pos[0], o[2] - player.pos[2]);
      byQuarter[Math.floor(((a + Math.PI) / (Math.PI * 2)) * 4) % 4].push(o);
    }
    const quarters = byQuarter.filter((q) => q.length);
    for (let k = 0; k < count; k++) {
      const q = quarters[k % quarters.length];
      spawnBloom(add(q[Math.floor(random() * q.length)], [0, 1.2 + random(), 0]));
    }
  }

  const director = createDirector(random, { relax: [30, 46], level: sector.index });
  let lastHealth = state.health;
  function runDirector(dt, eye) {
    const hurt = Math.max(0, lastHealth - state.health);
    lastHealth = state.health;
    const live = blooms.filter((b) => b.active && !b.dying && !b.retreat);
    const nearby = live.filter((b) => distance(b.pos, eye) < 10).length;
    state.directorPhase = director.phase;
    for (const a of director.update(dt, { hurt, enemies: live.length, nearby })) {
      if (a.type === 'unease') {
        hud.caption(a.caption);
        if (random() < 0.4) sound.splash();
      } else if (a.type === 'warn') {
        hud.caption(a.caption);
        sound.pump();
        if (random() < 0.5) hud.say('THE ATTENDANT', 'Attention guests: rush hour.', 'attendant');
      } else if (a.type === 'spawn') wave(a.count, a.flank);
      else if (a.type === 'recover') {
        for (const b of live) b.retreat = true;
        const [who, line] = AFTERMATH[Math.floor(random() * AFTERMATH.length)];
        hud.say(who, line, 'crew');
        // Something useful within reach after a fight.
        const sc = scrap.find((x) => x.taken);
        if (sc) { sc.taken = false; sc.pos = add(player.pos, [(random() - 0.5) * 4, 0.25 + floorTop(...cellOf(player.pos[0], player.pos[2])), (random() - 0.5) * 4]); collide(sc.pos); }
      }
    }
  }

  function collide(pos) {
    const [cx, cz] = cellOf(pos[0], pos[2]);
    if (blocked(cx, cz)) {
      // A gate closed on you, or a platform sank: step back to the nearest open neighbour.
      const open = DIRS.find(([dx, dz]) => !blocked(cx + dx, cz + dz));
      if (open) { pos[0] = center(cx + open[0], cz + open[1])[0]; pos[2] = center(cx + open[0], cz + open[1])[2]; }
      return;
    }
    for (let z = cz - 1; z <= cz + 1; z++) for (let x = cx - 1; x <= cx + 1; x++) {
      if (!blocked(x, z)) continue;
      const nx = clamp(pos[0], x * CELL, x * CELL + CELL);
      const nz = clamp(pos[2], z * CELL, z * CELL + CELL);
      const ddx = pos[0] - nx, ddz = pos[2] - nz;
      const d = Math.hypot(ddx, ddz);
      if (d < RADIUS && d > 1e-6) {
        pos[0] = nx + (ddx / d) * RADIUS;
        pos[2] = nz + (ddz / d) * RADIUS;
      }
    }
  }
  function lineOfSight(a, b) {
    const d = sub(b, a);
    const n = Math.ceil(Math.hypot(d[0], d[2]) / 0.5);
    for (let i = 1; i < n; i++) if (isWall(...cellOf(a[0] + (d[0] * i) / n, a[2] + (d[2] * i) / n))) return false;
    return true;
  }
  function rayWorld(eye, dir) {
    for (let t = 0.2; t < 50; t += 0.15) {
      const p = add(eye, scale(dir, t));
      const [x, z] = cellOf(p[0], p[2]);
      if ((!rules.openSky && p[1] > 5) || (isWall(x, z) && p[1] < wallH)) return t;
      if (p[1] < (isWater(x, z) ? surface(x, z) : floorTop(x, z))) return t;
    }
    return 50;
  }

  // ---------- Shooting ----------
  function shoot(eye, dir) {
    let best = rayWorld(eye, dir), hit = null;
    const test = (c, r, fn) => {
      const t = raySphere(eye, dir, c, r);
      if (t < best) { best = t; hit = fn; }
    };
    for (const b of blooms) if (b.active && !b.dying) test(b.pos, 0.75, () => {
      b.hp -= state.damage;
      hud.hitmarker();
      sound.hit();
      b.flash = 0.12;
      b.stagger = 0.35;
      const away = normalize(sub(b.pos, eye));
      const pushed = add(b.pos, scale([away[0], 0, away[2]], 0.8));
      if (!isWall(...cellOf(pushed[0], pushed[2]))) b.pos = pushed;
      if (b.hp <= 0) { b.dying = 0.001; sound.burst(); events.score(100, 'ENTITY DISPERSED'); events.cleared(); }
    });
    for (const g of signals) if (!g.used) test(g.pos, 0.8, () => {
      g.used = 0.001;
      sound.heal();
      events.heal(20);
      events.score(50, 'SIGNAL · VITALS RESTORED');
      state.drift = Math.max(0, state.drift - 25);
    });
    for (const l of lamps) if (l.on) test(l.pos, 0.5, () => {
      l.broken = 20;
      sound.burst();
      hud.caption('[glass breaking — above]');
    });
    for (const f of floaters) if (f.state === 'floating' || f.state === 'revealed' || f.state === 'holding') test(add(f.pos, [0, surface(...f.cell) + 0.1, 0]), 0.75, () => {
      hud.hitmarker();
      if (f.survivor) {
        f.state = 'gone';
        hud.say('JUNE', 'It flinched. It was alive. It\'s gone under.', 'crew');
        state.drift = Math.min(100, state.drift + 8);
      } else {
        f.state = 'revealed';
        f.hp -= state.damage;
        sound.hit();
        if (f.hp <= 0) { f.state = 'gone'; sound.burst(); events.score(150, 'FLOATER DISPERSED'); events.cleared(); }
      }
    });
    if (lifeguard && lifeguard.breakerPos && !lifeguard.stopped) test(lifeguard.breakerPos, 0.5, () => {
      if (lifeguard.rule === 'fire' && lifeguard.lampOn) return;
      lifeguard.stopped = true;
      sound.gate();
      hud.toast('CYCLE BREAKER CUT · THAT RULE NO LONGER APPLIES');
    });
    if (sensor && sensorRevealed && !gateOpen) test(sensorPos, 0.5, () => {
      gateOpen = true;
      sound.gate();
      hud.toast('SENSOR TRIPPED · GATE OPEN');
    });
    for (const r of ropes) if (!r.cut) r.floats.forEach((f, j) => f.alive && test(ropeFloatPos(r, j), 0.4, () => {
      f.alive = false;
      sound.burst();
      hud.hitmarker();
      if (r.floats.every((q) => !q.alive)) { r.cut = true; r.holding = 0; hud.toast('LANE ROPE CUT'); events.cleared(); }
    }));
    for (const m of marcos) if (m.shown > 0 && m.throatPos) test(m.throatPos, 0.6, () => {
      m.shown = 0;
      sound.burst();
      hud.caption('[the voice stops — for now]');
      m.timer = 25;
    });
    if (undertow.alive) {
      const t = rayPlaneY(eye, dir, undertowY());
      if (t < best + 0.3) {
        const p = add(eye, scale(dir, t));
        if (Math.hypot(p[0] - undertow.pos[0], p[2] - undertow.pos[2]) < 1.5) {
          best = t;
          hit = () => {
            undertow.hp -= state.damage;
            hud.hitmarker();
            sound.hit();
            ripple = [undertow.pos[0], 0, undertow.pos[2]];
            rippleTime = time;
            undertow.holding = 0;
            if (undertow.hp <= 0) {
              undertow.alive = false;
              sound.splash();
              events.score(250, 'UNDERTOW DISPERSED');
              events.cleared();
            }
          };
        }
      }
    }
    // Grout on the floor: shooting it clears that patch for a while.
    const end0 = add(eye, scale(dir, best));
    const gk = cellOf(end0[0], end0[2]).join(',');
    if (!hit && grout.has(gk) && !grout.get(gk).cleared && end0[1] < 0.3) hit = () => {
      grout.get(gk).cleared = 12;
      sound.splash();
      hud.toast('GROUT DISPERSED · IT WILL COME BACK');
    };
    if (!hit && end0[1] < 0.2) { ripple = end0; rippleTime = time; }
    hit?.();
    if (lifeguard && lifeguard.rule === 'fire' && lifeguard.lampOn && !lifeguard.stopped && distance(player.pos, lifeguard.base) < 22 && lineOfSight(lifeguard.base, player.pos)) violate('You fired while the lamp was lit.');
    return end0;
  }

  function violate(why) {
    const L = lifeguard;
    if (!L || L.blind > 0 || L.state !== 'watching' || L.cooldown > 0) return;
    L.violations += 1;
    L.calm = 0;
    L.cooldown = 3;
    const info = soundDir(player.pos, forwardVec(), L.base);
    sound.whistle(info.pan);
    hud.caption(`[whistle — ${info.label}]`);
    hud.toast(`RULE BROKEN · ${why}`);
    if (L.violations === 1) {
      hud.say('THE LIFEGUARD', '— one long whistle —', 'attendant');
      state.drift = Math.min(100, state.drift + 12);
      wave(3 + Math.floor(sector.index / 2));
    } else {
      L.state = 'pursuit';
      L.pos = [...L.base];
      L.lostSight = 0;
      hud.say('MARS', 'It\'s off the tower. It\'s coming. Break its line of sight!', 'crew');
      state.drift = Math.min(100, state.drift + 15);
    }
  }

  function burst(eye) {
    if (!blaster.burst(eye)) { hud.toast('NO CHARGE CELLS'); return; }
    hud.caption('[disruption burst]');
    for (const b of blooms) if (b.active && !b.dying && distance(b.pos, eye) < 14) { b.dying = 0.001; events.cleared(); }
    if (undertow.alive && distance(undertow.pos, player.pos) < 10) { undertow.holding = 0; undertow.cooldown = 8; }
    if (lifeguard && distance(lifeguard.pos || lifeguard.base, player.pos) < 24) {
      lifeguard.blind = 10;
      if (lifeguard.state === 'pursuit') { lifeguard.state = 'returning'; hud.toast('LIFEGUARD BLINDED'); }
    }
    const [cx, cz] = cellOf(player.pos[0], player.pos[2]);
    for (const [k, gr] of grout) {
      const [x, z] = k.split(',').map(Number);
      if (Math.abs(x - cx) <= 2 && Math.abs(z - cz) <= 2) gr.cleared = 15;
    }
    for (const f of floaters) if (f.state === 'holding') f.state = 'revealed';
  }

  // ---------- Scanning ----------
  function scanTick(dt, eye, dir) {
    const lens = state.upgrades.includes('lens');
    const cone = lens ? 0.16 : 0.1;
    const range = lens ? 40 : 22;
    const cands = [];
    markings.forEach((m) => cands.push({ obj: m, pos: m.pos, need: 0.6, label: 'MARKING', done: () => 'DEPTH MARKING · READ' }));
    floaters.forEach((f) => f.state !== 'gone' && cands.push({ obj: f, pos: f.pos, need: 1, label: 'FIGURE IN THE WATER', done: () => {
      const honest = hash(f.cell[0], f.cell[1] + 9) < 0.7; // readings are honest about 70% of the time
      return `PULSE: ${f.survivor === honest ? 'FAINT' : 'NONE'} · READING UNRELIABLE`;
    } }));
    fake.forEach((f) => cands.push({ obj: f, pos: f.pos, need: 0.6, label: 'SHELTER', done: () => 'BEACON: AMBER · NO PRESSURE SEAL · NO VENT TONE' }));
    if (lifeguard) cands.push({ obj: lifeguard, pos: add(lifeguard.base, [0, 4.5, 0]), need: 0.4, label: 'LIFEGUARD', done: () => `RULE: ${ruleText.replace('\n', ' ')}${lifeguard.rule !== 'run' ? ' · BREAKER ON THE TOWER LEG' : ''}` });
    if (reflection) cands.push({ obj: 'reflection', pos: reflectionPos(), need: 1, label: 'REFLECTION', done: () => {
      if (lagoonLevel !== 1) return 'MISALIGNED · CHANGE THE LAGOON LEVEL';
      if (!sensorRevealed) { sensorRevealed = true; sound.gate(); hud.toast('THE SENSOR IS REAL · IT IS ON THE NORTH PARAPET'); }
      return 'ALIGNED · SENSOR ON THE NORTH PARAPET';
    } });
    for (const [k, gr] of grout) if (!gr.cleared) {
      const [x, z] = k.split(',').map(Number);
      cands.push({ obj: gr, pos: add(center(x, z), [0, 0.1, 0]), need: 0.5, label: 'GROUT', done: () => 'SPREADS THROUGH WET, DARK TILE · LIGHT AND DRY FLOOR STOP IT' });
    }
    let best = null, bestA = cone;
    for (const c of cands) {
      if (distance(eye, c.pos) > range) continue;
      const a = angleTo(eye, dir, c.pos);
      if (a < bestA) { bestA = a; best = c; }
    }
    if (!best) { scanTarget = null; return 'SCANNING…'; }
    if (!scanTarget || scanTarget.obj !== best.obj) scanTarget = { obj: best.obj, t: 0 };
    scanTarget.t += dt;
    if (scanTarget.t >= best.need) return best.done();
    return `${best.label} · ${Math.round((scanTarget.t / best.need) * 100)}%`;
  }
  function ropeFloatPos(r, j) {
    const c = center(r.x, r.z);
    return [c[0] + (j - 1) * 1.2, surface(r.x, r.z) + 0.2, c[2]];
  }
  function reflectionPos() {
    const c = center(...reflCell);
    return [c[0], surface(...reflCell) + 0.02, c[2]];
  }
  function undertowY() {
    const [ux, uz] = cellOf(undertow.pos[0], undertow.pos[2]);
    return at(ux, uz) === 'x' || at(ux, uz) === 'B' ? (highWater ? -0.05 : -0.9) : surface(ux, uz);
  }

  // ---------- Frame ----------
  function update(dt) {
    time += dt;
    hud.update(dt);
    state.mounted = false;
    const prompts = [];
    const ask = (p, text) => prompts.push([p, text]);

    const sens = 0.0022 * (settings.sensitivity || 1);
    player.yaw -= input.look[0] * sens + ((isDown('arrowright') ? 1 : 0) - (isDown('arrowleft') ? 1 : 0)) * dt * 2.2;
    player.pitch = clamp(player.pitch - input.look[1] * sens + ((isDown('arrowup') ? 1 : 0) - (isDown('arrowdown') ? 1 : 0)) * dt * 1.6, -1.35, 1.35);
    const forward = forwardVec();
    const right = [Math.cos(player.yaw), 0, -Math.sin(player.yaw)];
    const [pcx, pcz] = cellOf(player.pos[0], player.pos[2]);
    const water = inWaterAt(player.pos[0], player.pos[2]);
    const groutHere = grout.get(`${pcx},${pcz}`);

    // Move, unless something has you.
    let mx = (isDown('d') ? 1 : 0) - (isDown('a') ? 1 : 0) + input.move[0];
    let mz = (isDown('w') ? 1 : 0) - (isDown('s') ? 1 : 0) + input.move[1];
    const len = Math.hypot(mx, mz);
    if (len > 1) { mx /= len; mz /= len; }
    const running = isDown('shift') && len > 0.1;
    let speed = (water ? 2.3 : 4.2) * (running ? (water ? 1.35 : 1.45) : 1);
    if (groutHere && !groutHere.cleared) speed *= 0.5;
    const held = undertow.holding > 0 || floaters.some((f) => f.state === 'holding') || ropes.some((r) => r.holding > 0) || state.sitting || !!state.downed;
    if (!held) {
      player.pos = add(player.pos, add(scale(forward, mz * speed * dt), scale(right, mx * speed * dt)));
      const cur = CURRENT[at(pcx, pcz)];
      if (cur && pumpOn) player.pos = add(player.pos, [cur[0] * 2.4 * dt, 0, cur[1] * 2.4 * dt]);
      if (waveOn && at(pcx, pcz) === 'w') player.pos = add(player.pos, [0, 0, -1.6 * dt]);
    }
    collide(player.pos);
    const nowMoving = len > 0.1 && !held;
    if (moving && !nowMoving) stoppedAt = time;
    moving = nowMoving;
    if (nowMoving) bob += dt * (water ? 5 : 8);
    if (water && !wasWater) { sound.splash(); ripple = [...player.pos]; rippleTime = time; }
    wasWater = water;
    const ft = floorTop(pcx, pcz);
    player.floor = damp(player.floor, ft > -1 ? ft : 0, 10, dt);

    // Looping doorways: step into one T, come out of its partner.
    const [qx, qz] = cellOf(player.pos[0], player.pos[2]);
    const tIdx = loops.findIndex(([x, z]) => x === qx && z === qz);
    if (tIdx >= 0 && lastLoop !== tIdx) {
      const partner = loops[tIdx ^ 1];
      if (partner) {
        const from = center(...loops[tIdx]), to = center(...partner);
        player.pos = [to[0] + (player.pos[0] - from[0]), player.pos[1], to[2] + (player.pos[2] - from[2])];
        lastLoop = tIdx ^ 1;
        hud.caption('[the corridor repeats]');
      }
    } else if (tIdx < 0) lastLoop = null;

    const swayY = settings.sway ? Math.sin(bob) * 0.045 : 0;
    // Cold water makes you shiver. The shivering stops as the water starts to feel warm, which is worse.
    const shiver = water && state.drift < 35 && settings.sway ? (35 - state.drift) / 35 * 0.008 : 0;
    // Sitting down in the water: you lower yourself until your eyes are almost at the surface.
    sink = damp(sink, state.sitting ? EYE - 0.35 : 0, 1.2, dt);
    if (state.sitting) player.pitch = damp(player.pitch, -0.25, 1, dt);
    const eye = [player.pos[0] + (Math.random() - 0.5) * shiver, player.floor + EYE - sink - (state.downed ? 1.1 : 0) + swayY + (Math.random() - 0.5) * shiver, player.pos[2]];
    // Field dressing: H. Takes a moment, and you cannot fire while you do it.
    if (wasPressed('h') && !healing && state.dressings > 0 && state.health < 100) { healing = 2.5; state.dressings -= 1; hud.toast('APPLYING A FIELD DRESSING'); }
    if (healing > 0) {
      healing -= dt;
      events.heal(dt * 16);
      ask(3, 'DRESSING THE WOUND…');
    }
    const dir = [-Math.sin(player.yaw) * Math.cos(player.pitch), Math.sin(player.pitch), -Math.cos(player.yaw) * Math.cos(player.pitch)];
    const target = add(eye, dir);
    state.cameraUp = UP;
    hud.crosshair(0, 0, true);

    // Composure: warm water, the dark, being alone.
    const litHere = rules.openSky || lamps.some((l) => Math.abs(l.x - pcx) <= 1 && Math.abs(l.z - pcz) <= 1 && l.on);
    // Drift builds from prolonged immersion, stillness, being far from the raft, and the dark.
    // A short scouting trip is cheap; staying still in warm water is not.
    waterT = water ? waterT + dt : Math.max(0, waterT - dt * 2);
    stillT = moving ? 0 : stillT + dt;
    const fromRaft = Math.hypot(raftPos[0] - player.pos[0], raftPos[2] - player.pos[2]);
    const driftRate = (water ? 0.6 + Math.min(2.4, waterT * 0.12) : 0.08) + (stillT > 6 ? 0.8 : 0) + (fromRaft > 34 ? 0.35 : 0) + (litHere ? 0 : 0.5);
    state.drift = clamp(state.drift + dt * driftRate * (1 + sector.index * 0.1), 0, 100);
    // Fumes are a condition, not a clock: a marked stagnant pocket, or the vapour a pump releases when you start it.
    vapour = Math.max(0, vapour - dt);
    const inFumes = (water && stagnant.has(`${pcx},${pcz}`)) || (vapour > 0 && Math.hypot(panelPos[0] - player.pos[0], panelPos[2] - player.pos[2]) < 9) || (state.highWater && water);
    if (inFumes && !fumeSaid) { fumeSaid = true; hud.caption('[the air here is thick and sweet — chlorine. Your filter starts working]'); }
    if (inFumes) {
      state.filter -= dt * 2.4;
      if (state.filter <= 0) {
        if (state.filters > 1) { state.filters -= 1; state.filter = 100; hud.toast('FILTER SPENT · SWAPPED'); }
        else { state.filters = 0; state.filter = 0; events.damage(dt * 1.5, 'Chlorine fumes. No filter left.', true); }
      }
    }
    if (groutHere && !groutHere.cleared) {
      events.damage(dt * 5, 'The Grout closed over you.', true);
      state.drift = Math.min(100, state.drift + dt * 3);
      ask(3, 'GROUT · get off the dark tile');
    }
    // Footsteps that keep going after you stop.
    footstepCooldown -= dt;
    if (state.drift > 50 && !moving && time - stoppedAt > 0.4 && time - stoppedAt < 0.5 && footstepCooldown <= 0) {
      footstepCooldown = 20;
      sound.footstep(-0.4, water);
      setTimeout(() => sound.footstep(-0.3, water), 380);
      hud.caption('[footsteps behind you]');
    }

    for (const v of vignettes) if (!v.seen && Math.hypot(v.pos[0] - eye[0], v.pos[2] - eye[2]) < 3) {
      v.seen = true;
      hud.caption(v.cap);
      events.interest?.(1);
      state.drift = Math.min(100, state.drift + 2);
    }

    // ---------- Interactions ----------
    if (!hasCell && cellPos) {
      writeYaw(powerCell.matrix, add(cellPos, [0, floorTop(...cellP) + Math.sin(time * 2) * 0.08, 0]), time, 0.18, 0.55, 0.18);
      if (distance(cellPos, [eye[0], cellPos[1], eye[2]]) < 2.3) {
        ask(2, `E · Take the ${K.item}`);
        if (wasPressed('e')) {
          hasCell = true;
          sound.pickup();
          events.score(250, `${K.item.toUpperCase()} RECOVERED`);
          hud.objective(K.carry);
          hud.say('DEZ', `That ${K.item} fits the ${K.machine.toLowerCase()}. Find it.`, 'crew');
          wave(2 + Math.floor(sector.index / 2));
        }
      }
    } else hide(powerCell);
    panel.material.color = powered() ? [0.08, 0.35, 0.12] : [0.4, 0.06, 0.05];
    panel.material.emissiveColor = powered() ? [0.35, 1, 0.45] : [1, 0.15, 0.1];
    panel.material.emission = 1 + Math.sin(time * 3) * 0.4;
    if (Math.hypot(panelPos[0] - eye[0], panelPos[2] - eye[2]) < 2.6 && !powered()) {
      if (!hasCell) ask(1, `${K.machine} · needs a ${K.item}`);
      else if (pumpValves.length && valveStep < 3) ask(2, `${K.machine} · NO PRESSURE · open the valves in the diagram's order (it is posted at the dock)`);
      else {
        // Operating the panel takes time and noise: hold E while the swarm comes. Getting hit sets you back.
        // At a water machine the crew decides what the water does next. The raft rides out through the result.
        if (wasPressed('e') && ROUTE_CHOICES[dockKind] && !(state.routeMod ||= {})[key] && !(pumpValves.length && valveStep < 3)) {
          const [title, a, b] = ROUTE_CHOICES[dockKind];
          showModal(title, 'This decides the route the raft takes out of here, and what is waiting on it.', [
            [a[0], () => { state.routeMod[key] = a[1]; hideModal(); hud.toast(a[2]); }, true],
            [b[0], () => { state.routeMod[key] = b[1]; hideModal(); hud.toast(b[2]); }],
          ], K.machine);
        }
        if (isDown('e') && !(pumpValves.length && valveStep < 3) && (!ROUTE_CHOICES[dockKind] || state.routeMod?.[key])) {
          if (!operating) { operating = 0.001; director.crescendo(); sound.lever(); if (dockKind === 'winch') sound.chains(); hud.caption(dockKind === 'winch' ? '[the winch chain screams on its drum — and something answers, everywhere]' : '[the machine groans awake — and something answers, everywhere]'); hud.say('DEZ', `That ${K.machine.toLowerCase()}\'s loud. Hold it. Whatever comes, hold it.`, 'crew'); }
          operating += dt;
          if (state.health < lastPanelHealth - 0.5) operating = Math.max(0.001, operating - 1.2);
          ask(4, `HOLD E · ${K.verb} ${Math.min(100, Math.round((operating / K.hold) * 100))}%`);
          if (operating >= K.hold) { operating = 0; restorePower(); }
        } else {
          ask(2, operating ? `HOLD E · ${K.verb} ${Math.round((operating / K.hold) * 100)}% (paused)` : `HOLD E · ${K.verb} (it takes time, and it is loud)`);
        }
        lastPanelHealth = state.health;
      }
    }
    if (Math.hypot(raftPos[0] - eye[0], raftPos[2] - eye[2]) < 2.8) {
      if (state.upgrades.includes('valve') && find('d').length && !drained) {
        ask(3, 'V · Valve tool: drain the flooded passage');
        if (wasPressed('v')) {
          (state.drained ||= {})[key] = true;
          sound.gurgle();
          hud.toast('DRAINED BY HAND · IT TAKES EFFECT NEXT TIME YOU LAND HERE');
        }
      }
      ask(2, powered() ? 'E · Board the raft (service gate open)' : 'E · Board the raft (no power: bypass only)');
      if (wasPressed('e') && surge && !surge.done) {
        // Leaving before the surge passes: the line goes, and the way out floods behind you.
        (state.routeMod ||= {})[key] = 'flooded';
        hud.caption('[behind you the line lets go. The way out is flooding.]');
      }
      if (wasPressed('e') && juneEvent.state === 'sitting') {
        // Leaving her there. The count closes over her.
        juneEvent.state = 'left';
        (state.forgotten ||= []).push('june');
        hud.say('THE ATTENDANT', 'Thank you, all three guests, for staying together.', 'attendant');
      }
      if (wasPressed('e')) {
        if (rules.currents && !pumpOn) {
          sound.wrong();
          hud.toast('THE PUMP IS OFF · NO WATER IN THE CHANNEL · RESTART IT');
        } else {
          events.board();
          return;
        }
      }
    }
    if (container && !container.taken) {
      writeYaw(container.part.matrix, container.pos, 0.4, 1.1, 0.8, 0.7);
      if (Math.hypot(container.pos[0] - eye[0], container.pos[2] - eye[2]) < 2.4) {
        ask(2, 'E · Open the supply container');
        if (wasPressed('e')) {
          container.taken = true;
          state.patchKits = (state.patchKits || 0) + 2;
          state.filters += 1;
          state.cells = Math.min(3, state.cells + 1);
          sound.pickup();
          hud.toast('SUPPLY CONTAINER · +2 PATCH KITS · +1 FILTER · +1 CELL');
          events.score(150, 'SUPPLIES RETRIEVED');
          wave(2);
        }
      }
    }
    // The paddle on foot: V. Reach, prod, push, and test whether a surface is really water.
    paddleCool -= dt;
    if (wasPressed('v') && paddleCool <= 0 && !(Math.hypot(raftPos[0] - eye[0], raftPos[2] - eye[2]) < 2.8 && state.upgrades.includes('valve') && find('d').length && !drained)) {
      paddleCool = 0.6;
      paddleProd(eye);
    }
    for (const sc of scrap) {
      if (sc.taken) { hide(sc.part); continue; }
      writeYaw(sc.part.matrix, add(sc.pos, [0, Math.sin(time * 3 + sc.pos[0]) * 0.05, 0]), time, 0.35, 0.18, 0.25);
      if (Math.hypot(sc.pos[0] - eye[0], sc.pos[2] - eye[2]) < 1.3) {
        sc.taken = true;
        state.scrap += 1;
        sound.pickup();
        hud.toast('+1 PART');
      }
    }
    for (const lk of lockers) {
      if (lk.opened || Math.hypot(lk.pos[0] - eye[0], lk.pos[2] - eye[2]) > 2.2) continue;
      ask(2, 'E · Open the supply locker');
      if (wasPressed('e')) {
        lk.opened = true;
        lk.part.material.emission = 0.02;
        if (lk.item === 'cell') { state.cells = Math.min(3, state.cells + 1); hud.toast('+1 CHARGE CELL'); }
        else { state.filters = Math.min(3, state.filters + 1); if (state.filter <= 0) state.filter = 100; hud.toast('+1 FILTER'); }
        sound.pickup();
      }
    }
    for (const d of docs) {
      if (Math.hypot(d.pos[0] - eye[0], d.pos[2] - eye[2]) > 2.2) continue;
      ask(2, `E · Read: ${d.doc.title}`);
      if (wasPressed('e')) { events.read(d.doc); return; }
    }
    for (const f of fake) {
      if (Math.hypot(f.pos[0] - eye[0], f.pos[2] - eye[2]) > 2.6) continue;
      ask(2, 'E · Enter the shelter');
      if (wasPressed('e') && !f.used) {
        f.used = true;
        sound.burst();
        hud.say('JUNE', 'It\'s not sealed. It\'s not sealed! There\'s no hum!', 'crew');
        hud.caption('[the shelter door opens onto water — ahead]');
        state.drift = Math.min(100, state.drift + 20);
        for (let k = 0; k < 3; k++) spawnBloom(add(f.pos, [(random() - 0.5) * 2, 0.6, (random() - 0.5) * 2]));
      }
    }
    for (const fo of fountains) {
      fo.active = Math.max(0, fo.active - dt);
      writeYaw(fo.part.matrix, add(fo.pos, [0, fo.active ? 1.2 : 0.2, 0]), 0, 0.25, fo.active ? 2.4 : 0.4, 0.25);
      fo.part.material.emission = fo.active ? 2 : 0.4;
      if (Math.hypot(fo.pos[0] - eye[0], fo.pos[2] - eye[2]) < 2.4) {
        ask(2, 'E · Start the fountain (draws the Undertow)');
        if (wasPressed('e')) {
          fo.active = 15;
          sound.jet();
          hud.caption('[fountain running — the water moves toward it]');
        }
      }
    }
    if (levelPos && Math.hypot(levelPos[0] - eye[0], levelPos[2] - eye[2]) < 2.4) {
      ask(2, rules.reflection ? `E · Lagoon level: ${['LOW', 'MID', 'HIGH'][lagoonLevel]} → change` : `E · ${highWater ? 'Lower' : 'Raise'} the water`);
      if (wasPressed('e')) {
        sound.gurgle();
        if (rules.reflection) lagoonLevel = (lagoonLevel + 1) % 3;
        else {
          highWater = !highWater;
          if (highWater) {
            hud.toast('WATER RISING · THE PLATFORM FLOATS');
            hud.caption('[water rushing into the deep channel — and something with it]');
            undertow.agitated = 30;
          } else hud.toast('WATER FALLING · THE PLATFORM SINKS');
        }
      }
    }
    if (pumpPos && Math.hypot(pumpPos[0] - eye[0], pumpPos[2] - eye[2]) < 2.4) {
      ask(2, `E · ${pumpOn ? 'Stop' : 'Restart'} the pump`);
      if (wasPressed('e')) {
        pumpOn = !pumpOn;
        sound.pump();
        hud.toast(pumpOn ? 'PUMP RUNNING · CURRENTS ON' : 'PUMP STOPPED · RESTART IT BEFORE YOU LAUNCH');
        if (!pumpOn) hud.caption('[the machinery stops — and now you can hear everything else]');
      }
    }
    for (const k of keypads) {
      const c = center(k.x, k.z);
      if (keypadOpen) { hide(k.part); continue; }
      writeYaw(k.part.matrix, [c[0], 1.6, c[2]], 0, CELL, 3.2, CELL);
      if (Math.hypot(c[0] - eye[0], c[2] - eye[2]) < 3.4) {
        ask(2, 'E · Enter the code');
        if (wasPressed('e')) {
          events.keypad(code.join(''), () => {
            keypadOpen = true;
            sound.gate();
            hud.toast('CODE ACCEPTED');
          });
          return;
        }
      }
    }
    for (const g of gates) {
      const c = center(g.x, g.z);
      if (!gateOpen) {
        writeYaw(g.part.matrix, [c[0], 1.6, c[2]], 0, CELL, 3.2, CELL);
        if (Math.hypot(c[0] - eye[0], c[2] - eye[2]) < 3.4) ask(1, 'GATE · opened by a sensor you can only see reflected in the lagoon');
      } else hide(g.part);
    }

    // ---------- World behaviour ----------
    updateWaves(dt);
    updateJets(dt, eye);
    updateGrout(dt);
    updateLamps(dt, eye, dir);
    for (const p of platforms) {
      const c = center(p.x, p.z);
      writeYaw(p.part.matrix, [c[0], (highWater ? -0.02 : DEEP + 0.2) + Math.sin(time + p.x) * 0.02, c[2]], 0, CELL - 0.3, 0.25, CELL - 0.3);
    }
    for (const w of waterParts) {
      const c = center(w.x, w.z);
      const ch = at(w.x, w.z);
      const h = ch === 'x' || ch === 'B' ? (highWater ? -0.05 : -0.9) : surface(w.x, w.z);
      writeYaw(w.part.matrix, [c[0], h - 0.01, c[2]], 0, CELL, 0.02, CELL);
    }
    for (const m of markings) {
      const visible = !rules.uv || (input.scanning && angleTo(eye, dir, m.pos) < 0.6 && distance(eye, m.pos) < 14);
      if (visible) facing(m.part, m.pos, m.normal, 1.3, 0.65);
      else hide(m.part);
    }
    uvArrows.forEach((a, i) => {
      const t = (i + 1) / (uvArrows.length + 1);
      const p = [dockC[0] + (cellPos[0] - dockC[0]) * t, 0, dockC[2] + (cellPos[2] - dockC[2]) * t];
      const [ax, az] = cellOf(p[0], p[2]);
      const show = input.scanning && !blocked(ax, az) && angleTo(eye, dir, p) < 0.6 && distance(eye, p) < 16 && !hasCell;
      if (show) writeYaw(a.part.matrix, [p[0], floorTop(ax, az) + 0.03, p[2]], Math.atan2(cellPos[0] - dockC[0], cellPos[2] - dockC[2]), 0.2, 0.02, 0.9);
      else hide(a.part);
    });
    if (reflection) {
      const rp = reflectionPos();
      const aligned = lagoonLevel === 1;
      writeBasis(reflection.matrix, aligned ? rp : add(rp, [1.1, 0, 0.6]), [1, 0, 0], [0, 0, -1], UP, 0.9, 0.9, 1);
      reflection.material.emission = aligned ? 2.5 : 1;
      if (sensorRevealed && !gateOpen) writeYaw(sensor.matrix, sensorPos, 0, 0.28, 0.28, 0.28);
      else hide(sensor);
    }
    updateBlooms(dt, eye);
    updateUndertow(dt, water, running);
    updateLifeguard(dt, eye, water, running);
    updateFloaters(dt, eye);
    updateMarco(dt, eye);
    updateSky();
    for (const g of signals) {
      if (g.used) g.used += dt;
      g.part.material.emission = g.used ? Math.max(0.2, 8 - g.used * 20) : 2.4 + Math.sin(time * 4) * 0.7;
    }
    if (undertow.holding > 0) ask(5, 'THE UNDERTOW HAS YOU · tap SPACE to kick free, shoot the still water, or burst (F)');
    updateRopes(dt);
    if (ropes.some((r) => r.holding > 0)) ask(5, 'THE ROPE HAS YOU · shoot its floats, or tap SPACE to pull free');
    if (floaters.some((f) => f.state === 'holding')) ask(5, 'IT HAS YOU · shoot it, or burst (F)');
    if (lifeguard && lifeguard.state === 'pursuit') ask(4, 'THE LIFEGUARD IS COMING · break its line of sight');
    if (lifeguard && lifeguard.warn > 0 && lifeguard.state === 'watching') ask(4, `THE LIFEGUARD HAS SEEN YOU · ${lifeguard.rule === 'swim' ? 'get out of the water' : 'stop running'} or get out of its sight · ${Math.max(0, 2.5 - lifeguard.warn).toFixed(1)} s`);

    runDirector(dt, eye);
    voices(dt);

    let scanText = '';
    if (input.scanning && (input.locked || input.touch)) {
      blaster.showScan(true, blaster.muzzle(eye, target, dir), add(eye, scale(dir, Math.min(30, rayWorld(eye, dir)))));
      scanText = scanTick(dt, eye, dir);
      state.visible = true;
    } else {
      blaster.showScan(false);
      state.visible = false;
      scanTarget = null;
    }
    hud.scan(scanText);

    if (wasPressed('r')) blaster.recharge();
    if (!input.locked && !input.touch && (input.firing || input.scanning)) requestLock();
    for (const id of PROFILE_ORDER) if (wasPressed(PROFILES[id].key)) { state.profile = id; hud.toast(`${PROFILES[id].label} · ${PROFILES[id].job}`); }
    if (wasPressed('tab') || wasPressed('cycle-')) { state.profile = PROFILE_ORDER[(PROFILE_ORDER.indexOf(state.profile || 'pulse') + (wasPressed('tab') ? 1 : 4)) % 5]; hud.toast(PROFILES[state.profile].label); }
    if (state.downed) state.profile = 'pulse';
    if (blaster.trigger(dt, input.firing && (input.locked || input.touch) && healing <= 0, false)) {
      const P0 = PROFILES[state.profile] || PROFILES.pulse;
      const base = state.damage;
      state.damage = base * P0.damage * (state.downed ? 0.6 : 1);
      if (state.profile === 'hook') hookReach(eye, dir);
      else if (state.profile === 'scatter') {
        const r0 = normalize(cross(dir, UP)), u0 = cross(r0, dir);
        let to = null;
        for (let k = 0; k < P0.pellets; k++) {
          const a = (k / P0.pellets) * Math.PI * 2, rr = k ? P0.spread : 0;
          const d = normalize(add(dir, add(scale(r0, Math.cos(a) * rr), scale(u0, Math.sin(a) * rr))));
          const hitAt = shoot(eye, d);
          if (distance(hitAt, eye) > P0.range) continue;
          to ||= hitAt;
        }
        blaster.showBeam(blaster.muzzle(eye, target, dir), to || add(eye, scale(dir, P0.range)));
        for (const b of blooms) if (b.active && !b.dying && distance(b.pos, eye) < 5 && angleTo(eye, dir, b.pos) < 0.35) { b.stagger = 0.7; b.pos = add(b.pos, scale(dir, 1.4)); }
      } else blaster.showBeam(blaster.muzzle(eye, target, dir), shoot(eye, dir));
      state.damage = base;
    }
    if (wasPressed('z')) shoveFoot(eye, dir);
    if (wasPressed('b')) pingFoot(eye, dir);
    updateFootExtras(dt, eye, dir, ask);
    if (wasPressed('f')) burst(eye);
    blaster.place(eye, target, dir, swayY * 0.4);

    if (!input.locked && !input.touch) ask(0, 'CLICK to look around');
    prompts.sort((a, b) => b[0] - a[0]);
    hud.prompt(prompts[0]?.[1] || '');
    const depthInfo = state.upgrades.includes('depth') ? ` · ${water ? 'WAIST DEEP' : 'DRY'}${undertow.alive ? ` · WAKE ${Math.round(distance(undertow.pos, player.pos))} M` : ''}` : '';
    hud.depth(`${sector.depth.toFixed(1)} M · ON FOOT${water ? ' · IN WATER' : ''}${depthInfo}`);
    hud.route([`▸ ON FOOT · ${sector.name}`, hasCell ? (powered() ? `● ${K.machine} DONE · RETURN TO THE RAFT` : `○ CARRYING THE ${K.item.toUpperCase()} · FIND THE ${K.machine}`) : `○ FIND THE ${K.item.toUpperCase()}`, `MOORED RAFT ${Math.round(Math.hypot(raftPos[0] - eye[0], raftPos[2] - eye[2]))} M`]);

    saveTimer -= dt;
    if (saveTimer <= 0) {
      saveTimer = 3;
      events.position({ mode: 'explore', pos: [...player.pos], yaw: player.yaw, hasCell, taken: takenState() });
    }
    events.tick(dt);

    if (quality.skipRender) return;
    renderer.updateParts(parts);
    renderer.render({
      eye, target, fov: FOV, time,
      waterRipple: ripple, rippleTime: time - rippleTime,
      environment: { pointLights: gatherLights(eye) },
      exposure: (rules.openSky ? 0.95 : 1.05) - state.drift * 0.002,
      effects: {
        bloom: { strength: quality.bloom, threshold: 1, radius: 1.3 },
        vignette: settings.distortion ? Math.min(1, 0.35 + state.drift * 0.004 + (held ? 0.3 : 0)) : 0.28,
        grain: settings.grain ? 0.04 : 0,
        saturation: 1 - state.drift * 0.006,
        temperature: sector.index === 0 ? 0.08 : -0.04,
      },
    });
  }

  /** The hook line on foot: reach. Pull a part, a cell or a container to you across water or a gap. */
  function hookReach(eye, dir) {
    const range = (state.gear || []).includes('hookgear') ? 18 : 12;
    let best = range, got = null;
    for (const sc of scrap) if (!sc.taken) { const t = raySphere(eye, dir, sc.pos, 0.8); if (t < best) { best = t; got = () => { sc.pos = [eye[0] + dir[0] * 0.8, sc.pos[1], eye[2] + dir[2] * 0.8]; }; } }
    if (!hasCell && cellPos) { const t = raySphere(eye, dir, cellPos, 0.9); if (t < best) { best = t; got = () => { hasCell = true; sound.pickup(); events.score(250, `${K.item.toUpperCase()} HOOKED`); hud.objective(K.carry); wave(2); }; } }
    if (container && !container.taken) { const t = raySphere(eye, dir, container.pos, 1); if (t < best) { best = t; got = () => { container.pos = add(eye, add(scale(forwardVec(), 1.4), [0, -1.2, 0])); hud.caption('[you drag the container across on the line]'); }; } }
    sound.hookThrow();
    if (got) { got(); state.stats && (state.stats.shared += 1); } else hud.caption('[the hook skitters across the tile and comes back empty]');
  }

  function shoveFoot(eye, dir) {
    if (shoveCool > 0) return;
    shoveCool = 0.35;
    const power = shoveFatigue < 2 ? 1 : shoveFatigue < 4 ? 0.5 : 0.2;
    shoveFatigue += 1;
    sound.shove();
    for (const b of blooms) if (b.active && !b.dying && distance(b.pos, eye) < 2.8) { b.stagger = 0.9 * power; b.pos = add(b.pos, scale([dir[0], 0, dir[2]], 2.4 * power)); }
    if (power < 0.5) hud.caption('[tired arms — the shove is weak]');
  }

  /** Ping: mark a spot for the crew; with a recent unverified voice, it is a radio check. */
  function pingFoot(eye, dir) {
    sound.ping();
    pingT = 4;
    const t = rayWorld(eye, dir);
    writeYaw(pingMark.matrix, add(eye, scale(dir, Math.min(t, 25) - 0.2)), 0, 0.5, 0.5, 0.5);
    const crew = Object.keys(state.crewState || {}).filter((c) => !(state.forgotten || []).includes(c) && state.crewState[c] !== 'hurt');
    if (time - callerAt < 25 && callerWho) {
      sound.radio();
      if (crew.includes(callerWho.toLowerCase())) hud.say(callerWho, 'Wasn\'t me. I\'m nowhere near the showers. Don\'t go toward it.', 'crew');
      else hud.say(crew[0]?.toUpperCase() || state.name.toUpperCase(), `${callerWho} isn't on the radio. Whatever that was, it wasn't ${callerWho}.`, 'crew');
      hud.caption('[radio check: that voice was not on the radio]');
      callerAt = -100;
    } else if (crew.length) hud.say(crew[0].toUpperCase(), pick(['Marked.', 'Seen. Go.', 'I see it. Careful.']), 'crew');
    else hud.caption('[radio check: static]');
  }

  function updateFollowers(dt) {
    crewShotT -= dt;
    if (crewShotT <= 0) hide(crewShot);
    for (const f of followers) {
      f.pos ||= [raftPos[0] + (f.k - 1) * 0.9, 0, raftPos[2] + 0.9];
      const sitting = f.id === 'june' && juneEvent.state === 'sitting';
      if (sitting || juneEvent.state === 'left' && f.id === 'june') { hideCrewFigure(f.fig); continue; }
      // Target: a point on your trail behind you; when you are down, your side.
      const trailPt = thread[thread.length - 1 - (f.k + 1)] || [raftPos[0] + (f.k - 1) * 0.9, 0, raftPos[2] + 0.8];
      const target = state.downed && f.k === 0 ? [player.pos[0] + 0.7, 0, player.pos[2] + 0.4] : trailPt;
      const to = [target[0] - f.pos[0], 0, target[2] - f.pos[2]];
      const dd = Math.hypot(to[0], to[2]);
      const spd = dd > 6 ? 5.5 : 3.6;
      const moving = dd > 0.6;
      if (moving) f.pos = add(f.pos, scale(normalize(to), Math.min(dd, spd * dt)));
      // Stride from actual movement, so feet don't skate: pace eases in and out.
      f.pace = damp(f.pace, moving ? Math.min(1, spd / 5) : 0, 6, dt);
      f.walk += dt * (4 + f.pace * 6) * (f.pace > 0.05 ? 1 : 0);
      const [cx, cz] = cellOf(f.pos[0], f.pos[2]);
      const fl = floorTop(cx, cz);
      const wet = inWaterAt(f.pos[0], f.pos[2]);
      const kneel = state.downed && f.k === 0 && dd < 1 ? 0.45 : 0;
      const h = 1.25 * f.fig.L.tall - kneel - (wet ? 0.35 : 0);
      // Face where they are going while walking; turn to you when they stop.
      const want = moving ? Math.atan2(to[0], to[2]) : Math.atan2(player.pos[0] - f.pos[0], player.pos[2] - f.pos[2]);
      f.yaw += Math.atan2(Math.sin(want - f.yaw), Math.cos(want - f.yaw)) * Math.min(1, dt * 6);
      poseStanding(f.fig, { feet: [f.pos[0], fl - (wet ? 0.35 : 0), f.pos[2]], yaw: f.yaw, walk: f.walk, pace: f.pace, drop: kneel });
      // Cover fire: the nearest Bloom they can see, or the Undertow if it has you.
      f.cool -= dt;
      if (f.cool > 0) continue;
      f.cool = 1.7 + f.k * 0.3;
      const from = [f.pos[0], fl + h * 0.75, f.pos[2]];
      let tgt = null;
      if (undertow.alive && undertow.holding > 0) tgt = { pos: undertow.pos, hit: () => { undertow.hp -= 1; } };
      else {
        const b = blooms.filter((x) => x.active && !x.dying && distance(x.pos, from) < 14 && lineOfSight(from, x.pos)).sort((a, c) => distance(a.pos, from) - distance(c.pos, from))[0];
        if (b) tgt = { pos: b.pos, hit: () => { b.hp -= 1; b.stagger = 0.3; if (b.hp <= 0) { b.dying = 0.001; sound.burst(); events.cleared(); } } };
      }
      if (!tgt) continue;
      tgt.hit();
      const d = sub(tgt.pos, from);
      const Lg = Math.hypot(...d) || 1;
      writeBasis(crewShot.matrix, scale(add(from, tgt.pos), 0.5), normalize(cross(d, UP)), scale(d, 1 / Lg), cross(normalize(cross(d, UP)), scale(d, 1 / Lg)), 0.03, Lg, 0.03);
      crewShotT = 0.08;
      sound.fire();
    }
  }

  /** Per-frame: valves, clock, notice, June, the thread, fumes haze, Pump Defence. */
  function updateFootExtras(dt, eye, dir, ask) {
    updateFollowers(dt);
    shoveCool -= dt;
    shoveFatigue = Math.max(0, shoveFatigue - dt * 0.6);
    pingT -= dt;
    if (pingT <= 0) hide(pingMark);
    if (deathCache && !deathCache.taken && Math.hypot(deathCache.pos[0] - eye[0], deathCache.pos[2] - eye[2]) < 2.2) {
      ask(2, 'E · Open the abandoned cache');
      if (wasPressed('e')) { deathCache.taken = true; hide(deathCache.part); state.filters = Math.min(3, state.filters + 1); state.dressings = (state.dressings || 0) + 1; state.patchKits = (state.patchKits || 0) + 1; sound.pickup(); hud.toast('ABANDONED CACHE · +1 FILTER · +1 DRESSING · +1 PATCH KIT'); }
    }
    // Close, and looking at it: then the caption, and only then does the crew's ledger record it.
    for (const r of remembered) if (!r.seen && Math.hypot(r.pos[0] - eye[0], r.pos[2] - eye[2]) < 3.4 && angleTo(eye, dir, add(r.pos, [0, 0.8, 0])) < 0.7) {
      r.seen = true;
      hud.caption(r.cap);
      events.ledger?.('changes', r.ledger);
    }
    // Valves in the diagram's order. A wrong one resets them all, loudly.
    for (const v of pumpValves) {
      v.wheel.material.emissiveColor = v.open ? [0.4, 1, 0.5] : [0.3, 0.65, 1];
      if (v.open || Math.hypot(v.pos[0] - eye[0], v.pos[2] - eye[2]) > 2.4) continue;
      ask(3, `E · Open valve ${v.id}`);
      if (wasPressed('e')) {
        if (valveOrder[valveStep] === v.id) {
          v.open = true;
          valveStep += 1;
          sound.valve();
          sound.gate();
          hud.toast(valveStep === 3 ? 'ALL THREE VALVES OPEN · PRESSURE AT THE PUMP · the diagram says four' : `VALVE ${v.id} OPEN · ${valveStep}/3`);
          if (valveStep === 3) { events.interest?.(2); events.ledger?.('machinery', 'Pressure diagram: valves in the posted order; the fourth pump is behind the glass'); }
          if (valveStep === 3) setTimeout(() => hud.caption('[through a submerged observation window: the fourth pump, in a room that should be where the corridor you just walked through is]'), 2500);
        } else {
          for (const x of pumpValves) x.open = false;
          valveStep = 0;
          sound.wrong();
          sound.thump(0);
          hud.toast('WRONG ORDER · PRESSURE DUMPED · ALL VALVES CLOSED');
          director.crescendo();
        }
      }
    }
    // The clock advances only when you are not looking at it.
    if (clock) {
      const looking = angleTo(eye, dir, add(clock.pos, [0, 0.9, 0])) < 0.5 && distance(clock.pos, eye) < 14;
      if (!looking) clock.away += dt;
      if (!looking && clock.away > 3) { clock.away = 0; clock.i = (clock.i + 1) % clock.faces.length; }
      clock.faces.forEach((f, i) => (i === clock.i ? f.part.matrix.set(f.m) : hide(f.part)));
      if (looking && !clock.told && clock.i > 0) { clock.told = true; hud.caption('[the pool clock has moved. Nobody saw it move.]'); }
    }
    if (notice && !notice.seen && distance(notice.pos, eye) < 3.5) {
      notice.seen = true;
      hud.caption(`[the same maintenance notice as the last attraction. ${notice.names.length} names this time.${notice.names.includes(state.name) ? ' The last one is yours.' : ''}]`);
      if (!state.logbook.some((d) => d.id === `notice-${key}`)) state.logbook.push({ id: `notice-${key}`, title: `MAINTENANCE NOTICE · ${sector.name.toUpperCase()}`, text: `DO NOT ENTER THE OVERFLOW ALONE. Signed: ${notice.names.join(', ')}. The same notice hangs in every attraction. Each copy has one more name than the last.` });
    }
    for (const [x, z] of shafts) if (Math.hypot(center(x, z)[0] - eye[0], center(x, z)[2] - eye[2]) < 3 && !shafts.told) { shafts.told = true; hud.caption('[every depth marker in this room says 1.2 metres. Including this one, beside a shaft whose bottom you cannot see.]'); }
    // June: after the first fight, she stops answering. She is sitting in the warm water, looking relieved.
    if (juneEvent.state === 'waiting' && director.phase === 'relax' && state.cleared > 2 && !juneEvent.pos) {
      const wet = [...find('~')].filter(([x, z]) => distance(center(x, z), player.pos) < 22 && distance(center(x, z), player.pos) > 6);
      const c = wet[Math.floor(random() * wet.length)];
      if (c) {
        juneEvent.pos = add(center(...c), [0, -0.35, 0]);
        juneEvent.state = 'sitting';
        state.crewState.june = 'drifting';
        hud.caption('[June has stopped answering the radio]');
        setTimeout(() => hud.say(state.name.toUpperCase(), 'June? June, count off.', 'crew'), 1500);
      }
    }
    if (juneEvent.state === 'sitting') {
      writeYaw(juneParts.body.matrix, juneEvent.pos, 0, 0.25, 0.55, 0.2);
      writeYaw(juneParts.head.matrix, add(juneEvent.pos, [0, 0.62, 0]), 0, 0.15, 0.17, 0.15);
      if (distance(juneEvent.pos, player.pos) < 2.4) {
        ask(5, `HOLD E · lift June out of the water ${'▮'.repeat(Math.round(juneEvent.lift * 10))}${'▯'.repeat(10 - Math.round(juneEvent.lift * 10))}`);
        if (!juneEvent.met) { juneEvent.met = true; hud.say('JUNE', 'It\'s okay. It\'s so warm. I\'ll catch up. You go on.', 'voice'); }
        juneEvent.lift = isDown('e') ? juneEvent.lift + dt / 3 : Math.max(0, juneEvent.lift - dt * 0.2);
        if (juneEvent.lift >= 1) {
          juneEvent.state = 'lifted';
          state.crewState.june = 'ok';
          if (state.stats) state.stats.freed += 1;
          state.recognized += 1;
          hide(juneParts.body); hide(juneParts.head);
          hud.say('JUNE', 'I — sorry. I was sure I\'d finished. I was sure I was home. Don\'t let me sit down again.', 'crew');
          setTimeout(() => hud.say('THE ATTENDANT', 'Thank you, all three guests, for staying together.', 'attendant'), 3000);
          events.score(300, 'JUNE LIFTED OUT');
        }
      }
    } else { hide(juneParts.body); hide(juneParts.head); }
    // The thread: paid out from the raft behind you, a point every two and a half metres.
    const lastT = thread[thread.length - 1] || [raftPos[0], 0.03, raftPos[2]];
    if (Math.hypot(player.pos[0] - lastT[0], player.pos[2] - lastT[2]) > 2.5) {
      thread.push([player.pos[0], player.floor + 0.03, player.pos[2]]);
      if (thread.length > threadParts.length) thread.shift();
    }
    threadParts.forEach((part, i) => {
      const a = i === 0 ? [raftPos[0], 0.05, raftPos[2]] : thread[i - 1];
      const b = thread[i];
      if (!a || !b || b.cut) return hide(part);
      // Stop short of your own feet, so the line guides from the floor ahead instead of running into the lens.
      if (Math.hypot(b[0] - player.pos[0], b[2] - player.pos[2]) < 1.4) return hide(part);
      const d = [b[0] - a[0], 0, b[2] - a[2]];
      const L = Math.hypot(d[0], d[2]) || 0.01;
      writeYaw(part.matrix, [(a[0] + b[0]) / 2, Math.max(a[1], b[1]), (a[2] + b[2]) / 2], Math.atan2(d[0], d[2]), 0.022, 0.015, L);
    });
    if (surge && !surge.done) {
      const near = Math.hypot(panelPos[0] - player.pos[0], panelPos[2] - player.pos[2]) < 9;
      if (near) surge.t += dt;
      hud.objective(`SURGE · keep the mechanism running ${Math.min(100, Math.round((surge.t / surge.need) * 100))}%${near ? '' : ' · STALLING — get back to it'}`);
      if (surge.t >= surge.need) {
        surge.done = true;
        (state.routeMod ||= {})[key] = 'drained';
        hud.toast('THE LINE HOLDS · THE ESCAPE ROUTE IS SECURE');
        hud.objective('The surge passed. Return to the raft.');
        events.ledger?.('machinery', 'Filtration Works: the compressor surges; hold the valve through it');
      }
    }
    // Pump Defence: the chamber must be held. The pump stalls without you.
    if (pumpChallenge) {
      const nearPump = Math.hypot(panelPos[0] - player.pos[0], panelPos[2] - player.pos[2]) < 12;
      if (nearPump) pumpChallenge.t += dt;
      if (pumpChallenge.t > 28) {
        pumpChallenge.t = 0;
        pumpChallenge.cycle += 1;
        sound.pump(0);
        events.score(250, `PUMP CYCLE ${pumpChallenge.cycle}/5`);
        if (pumpChallenge.cycle >= 5) return events.challengeDone('The pump ran five cycles. The chamber held.');
        director.crescendo();
      }
      hud.objective(`PUMP DEFENCE · cycle ${pumpChallenge.cycle + 1}/5 · ${Math.round((pumpChallenge.t / 28) * 100)}%${nearPump ? '' : ' · STALLED — get back to the pump'}`);
    }
  }

  /** What has been picked up, opened or solved here, so a resume cannot hand out the same supplies twice. */
  function takenState() {
    return {
      scrap: scrap.map((x, i) => (x.taken ? i : -1)).filter((i) => i >= 0),
      lockers: lockers.map((x, i) => (x.opened ? i : -1)).filter((i) => i >= 0),
      container: !!container?.taken, cache: !!deathCache?.taken, june: juneEvent.state, valves: valveStep,
    };
  }

  /** The paddle on foot: knock a Bloom back, hook a part out of reach, or sound the water ahead. */
  function paddleProd(eye) {
    const f = forwardVec();
    const tip = add(eye, scale(f, 2.6));
    sound.stroke(0);
    const b = blooms.find((x) => x.active && !x.dying && distance(x.pos, tip) < 1.8);
    if (b) {
      b.stagger = 0.8;
      b.pos = add(b.pos, scale(f, 2.2));
      hud.caption('[you shove it back with the blade — it gives like wet bread]');
      return;
    }
    const sc = scrap.find((x) => !x.taken && distance(x.pos, tip) < 1.9);
    if (sc) {
      sc.pos = [eye[0] + f[0] * 0.6, sc.pos[1], eye[2] + f[2] * 0.6];
      hud.caption('[you hook it with the blade and drag it in]');
      return;
    }
    const [cx, cz] = cellOf(tip[0], tip[2]);
    const c = at(cx, cz);
    if (c === 'x') hud.caption(random() < 0.5 ? '[the blade goes in to the grip. No bottom. Something under there closes on it, and lets go.]' : '[deep water. The paddle finds nothing at all.]');
    else if (WATERISH.has(c) || (c === 'd' && !drained)) hud.caption(random() < 0.3 ? '[water. Knee deep. Something under the surface moves away from the blade.]' : '[water. Knee deep. You can wade it.]');
    else if (c === '#') hud.caption('[tile. Solid. The grout is soft.]');
    else hud.caption('[dry tile. Probably.]');
  }

  function restorePower() {
    sound.switchOn();
    // The Last Drain's problem (Filtration Works): starting the compressor triggers a surge. Keep the mechanism
    // running through it and the escape route holds; walk away and the way out floods.
    if (sector.id === 'filtration-works' && dockKind === 'repair' && !surge) {
      surge = { t: 0, need: 20, done: false };
      director.crescendo();
      hud.say('DEZ', 'Pressure surge — it\'s going to blow the line. Somebody stays on this valve for twenty seconds or the way out floods.', 'crew');
    }
    vapour = 40;
    events.ledger?.('machinery', `${K.machine}: ${K.verb}`);
    hud.caption('[the pump coughs out trapped vapour — chlorine, thick, around the machine. Get clear or use a filter]');
    (state.power ||= {})[key] = true;
    // What the raft gets from this stop.
    if (dockKind === 'repair') {
      compressorRefill(state);
      state.patchKits = Math.max(state.patchKits || 0, 2);
      hud.toast('COMPRESSOR RUNNING · THE RAFT IS FIRM · FRESH PATCH ON EVERY HOLE');
      if (!state.logbook.some((d) => d.id === `diagram-${key}`)) state.logbook.push({ id: `diagram-${key}`, title: 'ROUTE DIAGRAM · MAINTENANCE PLATFORM', text: 'A laminated diagram of the slide network, water-stained. Someone has drawn the route in grease pencil and counted heads at every dock: 4, 4, 4, 4, 3. The last dock has no number. Underneath, in different handwriting: "the compressor knocks back. Do not answer it."' });
    } else if (dockKind === 'water') {
      hud.caption('[the holding pool rises a metre. The high outlet is level with the water now.]');
    } else if (dockKind === 'winch') {
      hud.caption('[the collapsed gate comes up on its chain and locks]');
    }
    sound.door();
    events.score(300, 'CIRCUIT RESTORED');
    hud.objective({ repair: 'The compressor is running and the gate is live. Return to the raft.', water: 'The pool is up. The raft can reach the outlet. Return to it.', winch: 'The gate is up. Return to the raft.' }[dockKind] || 'Power restored. The service gate is open. Return to the raft.');
    hud.say('DEZ', 'Gate\'s live. Lights too. And the pumps. Get back to the raft.', 'crew');
    // Restoring power starts the pumps: something in the deep water wakes up.
    sound.pump();
    hud.caption('[pumps starting — everywhere]');
    undertow.agitated = 40;
    if (!undertow.alive && cellU) Object.assign(undertow, { alive: true, pos: center(...cellU), hp: 4, holding: 0 });
    // Light stops the Grout.
    for (const [k, gr] of grout) {
      const [x, z] = k.split(',').map(Number);
      if (lamps.some((l) => Math.abs(l.x - x) <= 1 && Math.abs(l.z - z) <= 1)) gr.cleared = 999;
    }
  }

  function voices(dt) {
    nextLine -= dt;
    if (nextLine > 0) return;
    nextLine = 15 + random() * 10;
    if (state.drift > 60) hud.say('THE ATTENDANT', pick(AMBIENT.drift), 'drift');
    else if (state.drift > 40) hud.say('THE ATTENDANT', pick(AMBIENT.personal).replace('{name}', state.name).replace('{band}', state.band), 'attendant');
    else hud.say('THE ATTENDANT', sector.attendant.explore, 'attendant');
  }

  function updateRopes(dt) {
    const [pcx, pcz] = cellOf(player.pos[0], player.pos[2]);
    for (const r of ropes) {
      if (r.cut) { hide(r.line); r.floats.forEach((f) => hide(f.part)); continue; }
      const c = center(r.x, r.z);
      writeYaw(r.line.matrix, [c[0], surface(r.x, r.z) + 0.2, c[2]], Math.PI / 2, 0.04, 0.04, CELL);
      r.floats.forEach((f, j) => (f.alive ? writeYaw(f.part.matrix, add(ropeFloatPos(r, j), [0, Math.sin(time * 3 + j) * 0.05, 0]), 0, 0.28, 0.22, 0.28) : hide(f.part)));
      r.cooldown = Math.max(0, r.cooldown - dt);
      if (r.holding > 0) {
        r.holding -= dt;
        if (wasPressed(' ')) r.holding -= 0.5;
        events.damage(dt * 6, 'The Lane Rope wrapped you under.', true);
        state.drift = Math.min(100, state.drift + dt * 4);
        if (r.holding <= 0) r.cooldown = 4;
      } else if (pcx === r.x && pcz === r.z && r.cooldown <= 0) {
        r.holding = 2.5;
        sound.gurgle();
        hud.caption('[the rope tightens around your legs]');
      }
    }
  }

  function updateWaves(dt) {
    if (state.highWater) {
      // High Water: the tidal floors stay under.
      waveOn = true;
      tidal.forEach((t) => { const c = center(t.x, t.z); writeYaw(t.part.matrix, [c[0], 0.25, c[2]], 0, CELL, 0.02, CELL); });
      return;
    }
    if (!rules.waves) { tidal.forEach((t) => hide(t.part)); return; }
    waveT += dt;
    const was = waveOn;
    waveOn = waveT % 14 > 9;
    if (waveOn && !was) {
      sound.splash();
      hud.caption('[a wave coming in — ahead]');
      // Each wave leaves something closer to shore.
      for (const f of floaters) {
        if (f.state === 'gone' || f.state === 'holding') continue;
        const nz = f.cell[1] - 1;
        if (nz >= 1 && !blocked(f.cell[0], nz)) { f.cell = [f.cell[0], nz]; f.pos = center(...f.cell); }
      }
      if (random() < 0.6) spawnBloom(add(center(1 + Math.floor(random() * (W - 2)), 5), [0, 1, 0]));
    }
    tidal.forEach((t) => {
      const c = center(t.x, t.z);
      if (waveOn) writeYaw(t.part.matrix, [c[0], 0.25 + Math.sin(waveT * 2) * 0.05, c[2]], 0, CELL, 0.02, CELL);
      else hide(t.part);
    });
  }

  function updateJets(dt, eye) {
    for (const j of jets) {
      const t = (time + j.phase) % 5;
      j.extra = Math.max(0, j.extra - dt);
      // Some jets fire for nobody.
      if (random() < dt * 0.02) {
        j.extra = 1.2;
        const info = soundDir(eye, forwardVec(), j.pos);
        sound.laugh(info.pan);
        hud.caption(`[a child laughing — ${info.label}]`);
      }
      const on = t < 2 || j.extra > 0;
      if (on && !j.on) sound.jet(soundDir(eye, forwardVec(), j.pos).pan * 0.5);
      j.on = on;
      writeYaw(j.part.matrix, add(j.pos, [0, on ? 1.6 : 0.05, 0]), 0, 0.3, on ? 3.2 : 0.1, 0.3);
      j.part.material.emission = on ? 1.6 : 0.2;
      if (on && Math.hypot(j.pos[0] - player.pos[0], j.pos[2] - player.pos[2]) < 0.9) {
        events.damage(dt * 14, 'A jet threw you across the tiles.', true);
        const away = normalize(sub(player.pos, j.pos));
        player.pos = add(player.pos, scale([away[0], 0, away[2]], dt * 6));
      }
    }
  }

  function updateGrout(dt) {
    if (!groutSources.length) { groutParts.forEach(hide); return; }
    if (!grout.size) for (const [x, z] of groutSources) grout.set(`${x},${z}`, { cleared: 0 });
    groutTimer -= dt;
    // Grout gives evidence before it moves: fine ceramic clicks, then the grind of a passage changing.
    if (groutTimer < 1.8 && !groutTold) { groutTold = true; sound.clicks((random() - 0.5) * 1.2); if (random() < 0.4) hud.caption('[fine ceramic clicks, moving across the floor]'); }
    if (groutTimer <= 0) {
      groutTimer = 7;
      groutTold = false;
      // Spreads through connected wet, unlit tile. Light and dry floor stop it.
      const wet = (x, z) => isWater(x, z) || at(x, z) === 'd' || DIRS.some(([dx, dz]) => isWater(x + dx, z + dz));
      const lit = (x, z) => lamps.some((l) => l.x === x && l.z === z && l.on);
      const front = [];
      for (const k of grout.keys()) {
        const [x, z] = k.split(',').map(Number);
        for (const [dx, dz] of DIRS) {
          const nx = x + dx, nz = z + dz;
          if (blocked(nx, nz) || grout.has(`${nx},${nz}`) || !wet(nx, nz) || lit(nx, nz)) continue;
          front.push(`${nx},${nz}`);
        }
      }
      if (front.length && grout.size < groutParts.length) {
        const k = front[Math.floor(random() * front.length)];
        grout.set(k, { cleared: 0 });
        const [gx, gz] = k.split(',').map(Number);
        sound.grind(soundDir(player.pos, forwardVec(), center(gx, gz)).pan);
        hud.caption('[a deeper scrape — the grout lines have moved. That passage is different now]');
        // It cuts the thread where it crosses.
        const before = thread.length;
        for (let i = thread.length - 1; i >= 0; i--) { const [tx, tz] = cellOf(thread[i][0], thread[i][2]); if (tx === gx && tz === gz) thread[i].cut = true; }
        if (thread.some((t) => t.cut) && before) hud.caption('[the thread back to the raft is cut where the grout moved]');
      }
    }
    let i = 0;
    for (const [k, gr] of grout) {
      gr.cleared = Math.max(0, gr.cleared - dt);
      const part = groutParts[i++];
      if (!part) break;
      const [x, z] = k.split(',').map(Number);
      const c = center(x, z);
      if (gr.cleared) hide(part);
      else writeYaw(part.matrix, [c[0], (isWater(x, z) ? surface(x, z) : floorTop(x, z)) + 0.02, c[2]], hash(x, z) * 3, CELL * 0.85, 0.03, CELL * 0.85);
    }
    for (; i < groutParts.length; i++) hide(groutParts[i]);
  }

  function updateLamps(dt, eye, dir) {
    for (const l of lamps) {
      if (l.broken) {
        l.broken -= dt;
        // Repaired while you were not looking.
        if (l.broken <= 0) {
          if (distance(l.pos, eye) > 8 && angleTo(eye, dir, l.pos) > 1.2) {
            l.broken = 0;
            hud.caption('[a ladder scraping — behind you]');
            hud.toast('SOMEONE REPLACED THE TUBE');
          } else l.broken = 3;
        }
      }
      const on = !l.broken && (!l.dark || powered());
      const flick = l.flicker > 0.88 ? (Math.sin(time * 41 + l.flicker * 50) > 0.5 ? 0.12 : 1) : 1;
      if (on) {
        writeYaw(l.part.matrix, [l.pos[0], wallH - 0.03, l.pos[2]], 0, 1.4, 0.06, 0.5);
        l.part.material.emission = 9 * flick;
      } else hide(l.part);
      l.on = on;
      l.level = on ? flick : 0;
    }
  }

  function gatherLights(eye) {
    const out = lamps.filter((l) => l.on).map((l) => ({ l, d: distance(l.pos, eye) })).sort((a, b) => a.d - b.d).slice(0, quality.lights)
      .map(({ l }) => ({ position: l.pos, color: lampColor, intensity: 8 * l.level, radius: 0.4, range: 10 })); // bleached under the fixture, dark between
    if (lifeguard && lifeguard.lampOn) out.push({ position: add(lifeguard.base, [0, 4.6, 0]), color: lifeguard.rule === 'swim' ? [1, 0.25, 0.12] : [1, 0.9, 0.7], intensity: 9, radius: 0.3, range: 16 });
    if (rules.uv) out.push({ position: [eye[0], 3.5, eye[2]], color: [0.5, 0.25, 1], intensity: 3, radius: 1, range: 12 });
    return out;
  }

  function updateBlooms(dt, eye) {
    for (const b of blooms) {
      if (!b.active) { hide(b.core); hide(b.spikes); hide(b.heart); continue; }
      if (b.dying) {
        b.dying += dt;
        const k = 1 + b.dying * 6;
        writeYaw(b.core.matrix, b.pos, 0, 0.45 * k, 0.25 * k, 0.45 * k);
        writeYaw(b.heart.matrix, b.pos, 0, 0.2 * k, 0.2 * k, 0.2 * k);
        b.heart.material.emission = Math.max(0.02, 6 - b.dying * 30);
        hide(b.spikes);
        if (b.dying > 0.18) b.active = false;
        continue;
      }
      const to = sub(add(eye, [0, -0.3, 0]), b.pos);
      const d = Math.hypot(...to);
      b.stagger = Math.max(0, (b.stagger || 0) - dt);
      b.flash = Math.max(0, (b.flash || 0) - dt);
      if (b.retreat) {
        // After the peak, survivors sink back into the grates.
        b.pos = add(b.pos, [0, -dt * 1.2, 0]);
        if (b.pos[1] < -0.5) b.active = false;
      } else if (!b.stagger) {
        // Swarm movement: close in, but spread around you instead of queueing in one line.
        const v = (d < 18 ? 1.5 + sector.index * 0.2 : 0.4) * (state.visible ? 1.3 : 1);
        const side = cross(normalize(to), UP);
        const orbit = d > 3 ? Math.sin(b.phase * 0.4 + b.hp) * 0.6 : 0;
        const next = add(b.pos, add(scale(normalize(to), v * dt), scale(side, orbit * dt)));
        if (!isWall(...cellOf(next[0], next[2]))) b.pos = next;
      }
      b.phase += dt * 3;
      const pulse = 0.45 + Math.sin(b.phase) * 0.05;
      const squash = b.stagger > 0 ? 0.75 : 1;
      writeYaw(b.core.matrix, [b.pos[0], b.pos[1] + Math.sin(b.phase * 0.7) * 0.12, b.pos[2]], b.phase * 0.4, pulse / squash, pulse * 0.92 * squash, pulse);
      writeYaw(b.spikes.matrix, b.pos, b.phase, pulse * 2.3, 0.07, 0.07);
      writeYaw(b.heart.matrix, [b.pos[0], b.pos[1] + Math.sin(b.phase * 0.7) * 0.12, b.pos[2]], 0, pulse * 0.42, pulse * 0.42, pulse * 0.42);
      b.heart.material.emission = b.flash > 0 ? 9 : 1.4 + Math.sin(b.phase * 2) * 0.6;
      if (d < 1) {
        b.active = false;
        sound.burst();
        events.damage(14, 'A Bloom burst against you.');
      }
    }
  }

  function updateUndertow(dt, water, running) {
    if (!undertow.alive) { hide(undertow.patch); hide(undertow.eye); return; }
    undertow.agitated = Math.max(0, undertow.agitated - dt);
    undertow.cooldown -= dt;
    const toP = sub(player.pos, undertow.pos);
    const d = Math.hypot(toP[0], toP[2]);
    const canEnter = (x, z) => isWater(x, z) || at(x, z) === 'x' || (at(x, z) === 'B' && highWater);
    if (undertow.holding > 0) {
      undertow.holding -= dt;
      // Solo rule: nobody can pull you out, so you can kick free yourself.
      if (wasPressed(' ')) {
        undertow.holding -= 0.55;
        sound.splash();
        if (undertow.holding <= 0) hud.caption('[you kick free]');
      }
      events.damage(dt * 9, 'The Undertow pulled you under.', true);
      state.drift = Math.min(100, state.drift + dt * 10);
      player.pos = add(player.pos, scale(sub(undertow.pos, player.pos), dt * 0.8));
      if (undertow.holding <= 0) undertow.cooldown = 4;
    } else {
      // A running fountain draws it; otherwise it follows you through connected water. Noise speeds it up.
      const fountain = fountains.find((f) => f.active > 0);
      const goal = fountain ? fountain.pos : water ? player.pos : null;
      if (goal) {
        const g = sub(goal, undertow.pos);
        const gl = Math.hypot(g[0], g[2]);
        const noise = (running ? 0.8 : 0) + state.noise * 0.01 + (undertow.agitated ? 0.6 : 0);
        const next = add(undertow.pos, scale(normalize([g[0], 0, g[2]]), Math.min(gl, (1.2 + sector.index * 0.15 + noise) * dt)));
        if (canEnter(...cellOf(next[0], next[2]))) undertow.pos = next;
      }
      if (!fountain && water && d < 0.9 && undertow.cooldown <= 0) {
        undertow.holding = 3.5;
        sound.gurgle();
        hud.say('JUNE', 'It has you! Shoot the water under you!', 'crew');
      }
    }
    const h = undertowY();
    const r = 1.3 + Math.sin(time * 0.8) * 0.1;
    writeYaw(undertow.patch.matrix, [undertow.pos[0], h + 0.012, undertow.pos[2]], 0, r, 0.01, r);
    undertow.eye.material.emission = d < 8 ? 3 + Math.sin(time * 9) * 2 : 0.02;
    writeYaw(undertow.eye.matrix, [undertow.pos[0], h + 0.02, undertow.pos[2]], 0, 0.12, 0.03, 0.12);
  }

  function updateLifeguard(dt, eye, water, running) {
    const L = lifeguard;
    if (!L) return;
    const b = L.base;
    writeYaw(L.legs[0].matrix, add(b, [-0.4, 1.6, 0]), 0, 0.08, 4.2, 0.08);
    writeYaw(L.legs[1].matrix, add(b, [0.4, 1.6, 0]), 0, 0.08, 4.2, 0.08);
    writeYaw(L.seat.matrix, add(b, [0, 3.7, 0]), 0, 1, 0.08, 0.7);
    L.breakerPos = L.rule === 'run' ? null : add(b, [-0.4, 1.2, 0.05]);
    if (L.breakerPos) { writeYaw(L.breaker.matrix, L.breakerPos, 0, 0.3, 0.12, 0.3); L.breaker.material.emission = L.stopped ? 0.1 : 1.6 + Math.sin(time * 6); }
    else hide(L.breaker);
    facing(L.sign, add(b, [0, 2.5, 0.3]), [0, 0, 1], 2.4, 0.95);
    L.blind = Math.max(0, L.blind - dt);
    L.cooldown = Math.max(0, (L.cooldown || 0) - dt);
    // 'swim': the lamp is the maintenance cycle (lit = no swimming). 'fire': the warning lamp.
    L.lampOn = !L.stopped && L.rule !== 'run' && Math.floor(time / (L.rule === 'swim' ? 6 : 4)) % 2 === 0;
    // The cycle lamp hangs on an arm beside the seat, so it never sits in front of the figure.
    writeYaw(L.lamp.matrix, add(b, [0.75, 3.35, 0]), 0, 0.16, 0.16, 0.16);
    L.lamp.material.emission = L.lampOn ? 5 : 0.05;
    const pos = L.state === 'watching' ? add(b, [0, 3.75, 0]) : L.pos;
    const head = add(pos, [0, L.state === 'watching' ? 1.55 : 2.1, 0]);
    const watch = Math.atan2(eye[0] - head[0], eye[2] - head[2]);
    const up = L.state === 'watching';
    // Torso only; legs below it. Too tall standing, and the arms too long either way.
    writeYaw(L.body.matrix, add(pos, [0, up ? 0.95 : 1.55, 0]), watch, 0.17, up ? 0.8 : 0.85, 0.13);
    writeYaw(L.head.matrix, head, watch, 0.17, 0.24, 0.17);
    // Unnaturally rigid: arms straight down, pale hands, one whistle cord. The posture reads before the face.
    const sideV = [Math.cos(watch), 0, -Math.sin(watch)];
    L.hands.forEach((h, k) => writeYaw(h.matrix, add(pos, add(scale(sideV, (k ? 1 : -1) * 0.24), [0, L.state === 'watching' ? 0.25 : 0.55, 0])), watch, 0.06, 0.09, 0.06));
    const shY = up ? 1.33 : 1.95;
    writeYaw(L.shoulders.matrix, add(pos, [0, shY, 0]), watch, 0.48, 0.1, 0.2);
    const fwdV = [Math.sin(watch), 0, Math.cos(watch)];
    L.arms.forEach((a, k) => {
      const sgn = k ? 1 : -1;
      writeSegment(a.matrix, add(pos, add(scale(sideV, sgn * 0.24), [0, shY - 0.03, 0])), add(pos, add(scale(sideV, sgn * 0.24), [0, (up ? 0.25 : 0.55) + 0.08, 0])), 0.045);
    });
    L.legs2.forEach((g, k) => {
      const sgn = k ? 1 : -1;
      const hip = add(pos, add(scale(sideV, sgn * 0.09), [0, up ? 0.58 : 1.15, 0]));
      // Seated on the tower, the legs hang off the front of the seat; standing, they are straight and long.
      const foot = up ? add(add(hip, scale(fwdV, 0.42)), [0, -0.75, 0]) : add(pos, add(scale(sideV, sgn * 0.1), [0, 0.05, 0]));
      writeSegment(g.matrix, hip, foot, 0.07);
    });
    writeYaw(L.cord.matrix, add(head, [Math.sin(watch) * 0.12, -0.42, Math.cos(watch) * 0.12]), watch, 0.012, 0.5, 0.012);
    writeYaw(L.glasses.matrix, add(head, [Math.sin(watch) * 0.13, 0.03, Math.cos(watch) * 0.13]), watch, 0.3, 0.06, 0.04);
    const sees = distance(b, player.pos) < 20 && lineOfSight(b, player.pos) && L.blind <= 0;
    L.calm += dt;
    if (L.calm > 30 && L.violations > 0 && L.state === 'watching') { L.violations -= 1; L.calm = 0; }
    // A violation is: being exposed while breaking the posted rule, after a warning. Getting out of the water,
    // stopping, or breaking line of sight during the warning ends it.
    const breaking = sees && L.state === 'watching' && ((L.rule === 'swim' && water && L.lampOn) || (L.rule === 'run' && running));
    L.warn = breaking ? (L.warn || 0) + dt : Math.max(0, (L.warn || 0) - dt * 2);
    if (breaking && L.warn > 0 && !L.warned) {
      L.warned = true;
      sound.chair(soundDir(player.pos, forwardVec(), L.base).pan * 0.5);
      hud.caption('[the chair on the tower creaks — then a short warning whistle]');
      sound.whistle(soundDir(player.pos, forwardVec(), L.base).pan * 0.5);
    }
    if (!breaking && L.warn <= 0) L.warned = false;
    if (L.warn > 2.5) {
      L.warn = 0;
      violate(L.rule === 'swim' ? 'Swimming during the maintenance cycle.' : 'Running on deck.');
    }
    if (L.state === 'pursuit') {
      const to = sub(player.pos, L.pos);
      const dd = Math.hypot(to[0], to[2]);
      const next = add(L.pos, scale(normalize([to[0], 0, to[2]]), Math.min(dd, (2.4 + sector.index * 0.1) * dt)));
      if (!blocked(...cellOf(next[0], next[2]))) L.pos = next;
      L.lostSight = lineOfSight(L.pos, player.pos) ? 0 : L.lostSight + dt;
      if (dd < 1.1) {
        events.damage(35, 'The Lifeguard caught you on the deck.');
        state.drift = Math.min(100, state.drift + 20);
        L.state = 'returning';
      } else if (L.lostSight > 5 || dd > 26 || L.blind > 0) {
        L.state = 'returning';
        hud.toast('IT LOST YOU');
      }
    } else if (L.state === 'returning') {
      const to = sub(b, L.pos);
      const dd = Math.hypot(to[0], to[2]);
      L.pos = add(L.pos, scale(normalize([to[0], 0, to[2]]), Math.min(dd, 3 * dt)));
      if (dd < 0.2) { L.state = 'watching'; L.violations = 1; }
    }
  }

  function updateFloaters(dt, eye) {
    for (const f of floaters) {
      if (f.state === 'gone') { hideCrewFigure(f.fig); hide(f.eyes); continue; }
      const p = [f.pos[0], surface(...f.cell) + 0.08 + Math.sin(time + f.cell[0]) * 0.02, f.pos[2]];
      poseProne(f.fig, { at: add(p, [0, -0.04, -0.3]), dir: [0, 0, -1], drift: time + f.cell[0] });
      if (f.state === 'revealed' || f.state === 'holding') {
        writeYaw(f.eyes.matrix, add(p, [0, 0.08, -0.74]), 0, 0.12, 0.02, 0.04); // at the face, turned up out of the water
        f.eyes.material.emission = 3;
      } else hide(f.eyes);
      const d = Math.hypot(p[0] - eye[0], p[2] - eye[2]);
      if (f.state === 'floating' && d < 2) {
        if (f.survivor) {
          f.state = 'gone';
          const item = random() < 0.5 ? 'cell' : 'filter';
          if (item === 'cell') state.cells = Math.min(3, state.cells + 1);
          else state.filters = Math.min(3, state.filters + 1);
          sound.pickup();
          state.rescued += 1;
          hud.say('???', 'You came back. You came back for me.', 'marco');
          hud.toast(`A SURVIVOR · ${state.rescued} RESCUED · +1 ${item === 'cell' ? 'CHARGE CELL' : 'FILTER'} · they swim for the dock`);
        } else {
          f.state = 'holding';
          f.holdT = 2.5;
          sound.gurgle();
          hud.caption('[it rolls over]');
        }
      }
      if (f.state === 'holding') {
        f.holdT -= dt;
        events.damage(dt * 6, 'A Floater held you under.', true);
        state.drift = Math.min(100, state.drift + dt * 6);
        if (f.holdT <= 0) f.state = 'revealed';
      }
    }
  }

  function updateMarco(dt, eye) {
    for (const m of marcos) {
      m.timer -= dt;
      m.shown = Math.max(0, m.shown - dt);
      if (m.timer <= 0) {
        m.timer = 12 + random() * 8;
        const info = soundDir(eye, forwardVec(), m.pos);
        // Unverified speech reads the same whoever said it. Ping (B) for a radio check.
        const who = pick(['JUNE', 'DEZ', 'TUBS', 'MARS'].filter((n) => n !== state.name.toUpperCase()));
        hud.say(`VOICE · ${info.label.toUpperCase()}`, pick([`${who[0] + who.slice(1).toLowerCase()} here — there's another cell through the showers.`, 'Marco…', `It's ${who[0] + who.slice(1).toLowerCase()}. Over here. I found the way out.`]), 'voice');
        callerAt = time;
        callerWho = who;
        state.drift = Math.min(100, state.drift + 3);
      }
      // Following the voice brings you to its source.
      if (Math.hypot(m.pos[0] - player.pos[0], m.pos[2] - player.pos[2]) < 3.5 && !m.shown && !m.moving) {
        m.shown = 8;
        const [mx, mz] = cellOf(m.pos[0], m.pos[2]);
        const wd = DIRS.find(([dx, dz]) => isWall(mx + dx, mz + dz)) || [0, -1];
        m.throatPos = [m.pos[0] + wd[0] * (CELL / 2 - 0.2), 0.4, m.pos[2] + wd[1] * (CELL / 2 - 0.2)];
        hud.say('JUNE', 'It\'s a throat. It\'s just a throat in the wall.', 'crew');
        state.drift = Math.min(100, state.drift + 25);
        for (let k = 0; k < 3; k++) spawnBloom(add(m.pos, [(random() - 0.5) * 3, 1, (random() - 0.5) * 3]));
        // It is not one creature: the voice moves somewhere else.
        const open = [];
        for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (!blocked(x, z) && distance(center(x, z), player.pos) > 16) open.push(center(x, z));
        m.moving = true;
        m.next = open.length ? open[Math.floor(random() * open.length)] : m.pos;
      }
      if (m.moving && m.shown <= 0) { m.pos = m.next; m.moving = false; }
      if (m.shown > 0) writeYaw(m.throat.matrix, m.throatPos, time, 0.5 + Math.sin(time * 6) * 0.06, 0.35, 0.5);
      else hide(m.throat);
    }
  }

  function updateSky() {
    if (!rules.openSky) return;
    towers.forEach((t, i) => {
      const a = (i / towers.length) * Math.PI * 2;
      writeYaw(t.matrix, [(W * CELL) / 2 + Math.cos(a) * 240, 60, (H * CELL) / 2 + Math.sin(a) * 240], a, 28, 160 + hash(i, 9) * 80, 28);
    });
    const cycle = time % 40;
    if (cycle < 1 / 30) hud.caption('[the clouds jump back]');
    clouds.forEach((c, i) => writeYaw(c.part.matrix, [c.base[0] + cycle * 3, c.base[1], c.base[2]], 0, 30 + hash(i, 4) * 30, 4 + hash(i, 5) * 4, 14 + hash(i, 6) * 14));
  }

  // Resuming: restore what was already taken, opened or solved.
  if (opts.restore) {
    const r = opts.restore;
    for (const i of r.scrap || []) if (scrap[i]) scrap[i].taken = true;
    for (const i of r.lockers || []) if (lockers[i]) lockers[i].opened = true;
    if (r.container && container) container.taken = true;
    if (r.cache && deathCache) { deathCache.taken = true; hide(deathCache.part); }
    if (r.june && r.june !== 'waiting') juneEvent.state = r.june === 'sitting' ? 'waiting' : r.june;
    for (let i = 0; i < (r.valves || 0); i++) { const v = pumpValves.find((x) => x.id === valveOrder[i]); if (v) v.open = true; }
    valveStep = r.valves || 0;
  }
  if (import.meta.env.DEV) window.__explore = { followers, get dockKind() { return dockKind; }, get valves() { return { order: valveOrder, step: valveStep, list: pumpValves }; }, june: juneEvent, thread, get clock() { return clock; }, stagnant, player, center, undertow, lifeguard, cellPos, panelPos, raftPos, code, find, floaters, restorePower };

  return {
    update,
    resize: () => renderer.resize(),
    dispose: () => renderer.dispose(),
    /** Where the player is right now, for an immediate resume save. */
    snapshot: () => ({ mode: 'explore', pos: [...player.pos], yaw: player.yaw, hasCell, taken: takenState() }),
  };
}
