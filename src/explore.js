// On foot at a dock. You can go anywhere you can reach, but you must find your own way back to the raft.
// The goal: carry the power cell to the service panel (which opens the gate to the Safe Room's arrival
// bay), then return to the moored raft. Each attraction adds its own rules (see sectors.js).
import { rumble } from './haptics.js';
import { wedges as threatWedges } from './aim.js';
import { driftSign, driftState } from './driftsign.js';
import { createBudget } from './pressure.js';
import { scoreSpawns } from './spawnscore.js';
import { lightAtEye, targetExposure, adapt as adaptExposure, hazeVolume } from './exposure.js';
import { buildChain } from './postchain.js';
import { installUserPasses } from '67js/addons/user-pass';
import { createSurvey, visit as surveyVisit, mark as surveyMark, coverage as surveyCoverage, render as surveyRender, seenList, carryList, disagreements } from './survey.js';
import { Renderer67, box, sphere, cylinder, torus } from '67js';
import { writeYaw, writeBasis, writeSegment, hide, add, sub, scale, normalize, clamp, damp, rng, raySphere, rayPlaneY, linear, distance, cross, display, angleTo, soundDir } from './math.js';
import { tileTexture, tileNormal } from './textures.js';
import { signMaterial, quad } from './labels.js';
import { createBlaster, PROFILES, PROFILE_ORDER } from './blaster.js';
import { createCrewFigure, hideCrewFigure, poseStanding, poseProne, VISITOR_LOOK } from './crewfigure.js';
import { createCallouts } from './callouts.js';
import { input, wasPressed, isDown, requestLock } from './input.js';
import { hud } from './hud.js';
import { sound } from './audio.js';
import { quality } from './quality.js';
import { settings } from './settings.js';
import { AMBIENT } from './sectors.js';
import { documentFor } from './documents.js';
import { createDirector, AFTERMATH } from './director.js';
import { compressorRefill } from './hull.js';
import { facility as facilityMem, saveFacility, recordSurvey, surveyMem } from './memory.js';
import { plan as planFinds, collect as collectFind, headcountLine } from './collectibles.js';
import { planColumns, pushOutOfColumns, columnBlocks, planArches, cloudTexture } from './poolrooms.js';
import { showModal, hideModal } from './ui.js';

/** Machines whose setting changes the way out: [title, option A, option B] with [label, routeMod, toast]. */
const ROUTE_CHOICES = {
  water: ['Raise or drain?', ['RAISE THE POOL · fast, flooded outlet', 'flooded', 'THE OUTLET WILL BE FLOODED · FAST, DEEP, THINGS IN IT'], ['DRAIN THE SIDE CHANNEL · slow, exposed outlet', 'drained', 'THE OUTLET WILL BE EXPOSED · SLOW, SHALLOW, SUPPLIES ON THE LEDGES']],
  // The Closed Wave Pool: which half of the escape is dangerous. A safer walk back, or a safer raft.
  divert: ['Safer walk back, or safer raft?', ['DRAIN THE BASIN INTO THE EXIT CHANNEL · walk back across the dry floor · the raft rides out on the discharge: fast and rough', 'drained', 'THE BASIN IS EMPTYING · DRY WALK BACK · ROUGH EXIT'], ['KEEP IT CIRCULATING · OPEN THE BYPASS · the basin stays deep and moving between you and the dock · the raft rides out calm', 'bypass', 'THE BYPASS IS OPEN · WET WALK BACK · CALM EXIT']],
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
    find: 'Find the pressure key in the changing rooms (west). Pump control is north, across the basin or round the gallery. Decide where the water goes.', carry: 'Take the key to pump control (north): across the basin, or round the gallery under the lamp.' },
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
  choose('L', '~'); // the Lifeguard's tower stands somewhere different each expedition
  const at = (x, z) => (z < 0 || z >= H || x < 0 || x >= W ? '#' : grid[z][x]);
  const cellOf = (x, z) => [Math.floor(x / CELL), Math.floor(z / CELL)];
  const center = (x, z) => [x * CELL + CELL / 2, 0, z * CELL + CELL / 2];
  // Facility state: under the emergency lighting circuit one wall is a doorway. Nothing animates; the light
  // changes and the room is simply different. eCell is that wall; emergency is which circuit is live.
  let emergency = false, eCell = null;
  // Power loss: the relay trips if it is thrown too often. No fixtures, no strips, no lit signs, until the breaker
  // is reset at the relay. The architecture stays as it was when the power went.
  let blackout = false, resetT = 0;
  let lastWedges = [], eyeExposure = 1;
  const signParts = [];
  const isWall = (x, z) => at(x, z) === '#' && !(emergency && eCell && x === eCell[0] && z === eCell[1]);

  // Mutable world state
  let highWater = false; // floating bridge raised
  let pumpOn = true; // currents
  let lagoonLevel = 0; // rooftop: 0 low, 1 mid, 2 high
  let waveT = 0;
  let waveOn = false;
  let keypadOpen = false;
  let gateOpen = false;
  let sensorRevealed = false;
  // The Closed Wave Pool: once the crew chooses, the basin is drained (dry floor) or kept circulating (a current).
  let basin = 'full', basinLevel = -0.05;
  let basinC = null;
  const basinCentre = () => basinC ||= (() => { const cs = find('~').map(([x, z]) => center(x, z)); return cs.reduce((a, c) => add(a, scale(c, 1 / cs.length)), [0, 0, 0]); })();
  const surface = (x, z) => (rules.reflection && WATERISH.has(at(x, z)) ? [-0.45, -0.2, -0.05][lagoonLevel] : -0.05);
  const isWater = (x, z) => {
    const c = at(x, z);
    if (basin === 'drained' && (c === '~' || c === 'u' || c === 'L')) return false;
    if (WATERISH.has(c)) return true;
    if (c === 'd') return !drained;
    if (c === 'w') return waveOn;
    return false;
  };
  const floorTop = (x, z) => {
    const c = at(x, z);
    if (c === 'x') return DEEP;
    if (c === 'B') return highWater ? 0.07 : DEEP;
    if (c === 'y') return 0.6; // the raised maintenance gallery
    if (WATERISH.has(c) || c === 'd') return POOL;
    return 0;
  };
  const blocked = (x, z) => {
    const c = at(x, z);
    if (c === '#') return isWall(x, z);
    return c === 'x' || c === 'o' || (c === 'B' && !highWater) || (c === 'K' && !keypadOpen) || (c === 'G' && !gateOpen);
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
  const waterMat = () => ({ tag: 'water', color: linear(sector.water), metallic: 0.2, roughness: 0.1, emission: rules.uv ? 0.05 : 0.32, emissiveColor: linear(sector.water) });
  const facing = (part, pos, normal, w, h) => writeBasis(part.matrix, pos, normalize(cross(scale(normal, -1), UP)), UP, normal, w, h, 1);
  const wallH = rules.openSky ? 1.4 : 5;
  const hash = (a, b) => {
    const v = Math.sin(a * 127.1 + b * 311.7 + sector.index * 74.7) * 43758.5453;
    return v - Math.floor(v);
  };

  let vignetteExtra = null;
  const wallParts = new Map();
  const waterParts = [];
  const tidal = [];
  const lamps = [];
  for (let z = 0; z < H; z++) {
    for (let x = 0; x < W; x++) {
      const c = center(x, z);
      if (isWall(x, z)) {
        if (DIRS.some(([dx, dz]) => !isWall(x + dx, z + dz))) { const wp = P(`Wall ${x},${z}`, slab, tileMat); writeYaw(wp.matrix, [c[0], wallH / 2 - 0.5, c[2]], 0, CELL, wallH + 1, CELL); wallParts.set(`${x},${z}`, wp); }
        continue;
      }
      const ch = at(x, z);
      if (ch === 'o') {
        // An observation window: tiled below and above, wired glass between. You see through it; you can't pass.
        writeYaw(P(`Window sill ${x},${z}`, slab, tileMat).matrix, [c[0], 0.5, c[2]], 0, CELL, 1.0, CELL);
        writeYaw(P(`Window head ${x},${z}`, slab, tileMat).matrix, [c[0], (2.6 + wallH) / 2, c[2]], 0, CELL, wallH - 2.6, CELL);
        writeYaw(P(`Observation glass ${x},${z}`, slab, { color: [0.55, 0.7, 0.7], metallic: 0.3, roughness: 0.05, alphaMode: 'blend', opacity: 0.18 }).matrix, [c[0], 1.8, c[2]], 0, 0.06, 1.6, CELL * 0.9);
        continue;
      }
      const top = ch === 'B' ? DEEP : floorTop(x, z);
      writeYaw(P(`Floor ${x},${z}`, slab, tileMat).matrix, [c[0], top > 0 ? (top - 0.5) / 2 : top - 0.25, c[2]], 0, CELL, top > 0 ? top + 0.5 : 0.5, CELL);
      // The gallery's open edge over the basin: a low tiled parapet with a steel rail you can see and shoot over.
      if (ch === 'y') for (const [dx, dz] of DIRS) {
        const n = at(x + dx, z + dz);
        if (n !== '~' && n !== 'u' && n !== 'L') continue;
        writeYaw(P(`Gallery parapet ${x},${z}`, slab, tileMat).matrix, [c[0] + dx * (CELL / 2 - 0.08), top + 0.25, c[2] + dz * (CELL / 2 - 0.08)], 0, dx ? 0.16 : CELL, 0.5, dz ? 0.16 : CELL);
        writeYaw(P(`Gallery rail ${x},${z}`, slab, { color: [0.75, 0.77, 0.76], metallic: 0.9, roughness: 0.25 }).matrix, [c[0] + dx * (CELL / 2 - 0.08), top + 0.95, c[2] + dz * (CELL / 2 - 0.08)], 0, dx ? 0.05 : CELL, 0.05, dz ? 0.05 : CELL);
      }
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

  // ---------- The Poolrooms grammar: grid, circle, arch ----------
  // Round tiled columns rise straight out of floor and water; arches stand where a corridor opens into a room.
  const avoidPts = [...'DSPLhlsTKGjmfrgCQR'].flatMap((ch) => find(ch).map(([x, z]) => center(x, z)));
  const columns = rules.openSky ? [] : planColumns({ W, H, at, hash, cell: CELL, avoid: avoidPts, density: 0.3 });
  for (const c of columns) writeYaw(P(`Column ${c.x},${c.z}`, cylinder(28, 0, 1), tileMat).matrix, [c.x, (POOL - 0.1 + wallH) / 2, c.z], 0, c.r, wallH - POOL + 0.1, c.r);
  for (const a of rules.openSky ? [] : planArches({ W, H, at, isWall, limit: 8 })) {
    const ca = center(a.x, a.z), cb = center(a.x + a.dx, a.z + a.dz);
    const mid = [(ca[0] + cb[0]) / 2, 0, (ca[2] + cb[2]) / 2];
    const n = [a.dx, 0, a.dz], t = [a.dz, 0, a.dx];
    const fl = Math.max(floorTop(a.x, a.z), floorTop(a.x + a.dx, a.z + a.dz), 0);
    const R = CELL / 2 - 0.3, spring = fl + 2.3, top = spring + R;
    if (top > wallH - 0.2) continue;
    const piece = (name, off, y, w, h) => writeBasis(P(name, slab, tileMat).matrix, [mid[0] + t[0] * off, y, mid[2] + t[2] * off], t, UP, n, w, h, 0.34);
    piece('Arch header', 0, (top + wallH) / 2, CELL, wallH - top);
    for (const sg of [-1, 1]) {
      piece('Arch pier', sg * (CELL / 2 - 0.15), (fl + spring) / 2, 0.3, spring - fl);
      // The curve, stepped in courses the way tile would be cut.
      for (let k = 0; k < 6; k++) {
        const y0 = spring + (R * k) / 6, y1 = spring + (R * (k + 1)) / 6;
        const w = Math.sqrt(Math.max(0, R * R - (y0 - spring) ** 2));
        piece('Arch course', sg * (w + CELL / 2) / 2, (y0 + y1) / 2, CELL / 2 - w, y1 - y0);
      }
    }
  }
  // The painted room: clouds over the tile grid, three slides into the water, and nobody.
  if (rules.kids) {
    const [kx0, kz0, kx1, kz1] = rules.kids;
    const cloud = { color: [1, 1, 1], metallic: 0, roughness: 0.4, map: cloudTexture(), boxMapScale: 0, emission: 0.03, emissiveColor: [0.5, 0.75, 0.95] };
    // Brightly, evenly lit: the one room where every lamp works.
    for (const l of lamps) if (l.x >= kx0 && l.x <= kx1 && l.z >= kz0 && l.z <= kz1) { l.dark = false; l.always = true; }
    let slideCell = null;
    for (let z = kz0; z <= kz1; z++) for (let x = kx0; x <= kx1; x++) {
      if (isWall(x, z)) continue;
      const c = center(x, z);
      for (const [dx, dz] of DIRS) if (isWall(x + dx, z + dz)) {
        facing(P(`Cloud wall ${x},${z},${dx},${dz}`, plane, { ...cloud, doubleSided: true }), [c[0] + dx * (CELL / 2 - 0.03), wallH / 2, c[2] + dz * (CELL / 2 - 0.03)], [-dx, 0, -dz], CELL, wallH);
        if (!slideCell && (WATERISH.has(at(x, z)) || at(x, z) === 'd')) slideCell = { c, d: [dx, dz] };
      }
    }
    if (slideCell) {
      const { c, d } = slideCell;
      const side = [d[1], 0, d[0]];
      [[0.86, 0.12, 0.1], [0.95, 0.8, 0.1], [0.1, 0.62, 0.22]].forEach((col, i) => {
        const o = (i - 1) * 0.62;
        const a0 = [c[0] + d[0] * 1.9 + side[0] * o, 2.3, c[2] + d[1] * 1.9 + side[2] * o];
        const b0 = [c[0] - d[0] * 1.2 + side[0] * o, POOL + 0.5, c[2] - d[1] * 1.2 + side[2] * o];
        const zAx = normalize(sub(b0, a0));
        writeBasis(P(`Painted slide ${i}`, slab, { color: col, metallic: 0, roughness: 0.25 }).matrix, scale(add(a0, b0), 0.5), side, cross(zAx, side), zAx, 0.55, 0.07, distance(a0, b0));
      });
      vignetteExtra = { pos: slideCell.c, cap: '[clouds painted over the tiles. Three slides, red, yellow, green, running into still water. The paint is fresh]' };
    }
  }

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
  const label = (text, style, pos, normal, w, h, px = 384, py = 160) => { const part = P(`Sign ${text.slice(0, 12)}`, plane, { ...signMaterial(text, style, 0.8, px, py), doubleSided: true });
    // A second panel for high Drift, where the rule allows one (driftsign.js). It waits hidden in the same place.
    const other = driftSign(text, style, state.band);
    const alt = other ? P(`Drift sign ${signParts.length}`, plane, { ...signMaterial(other, style, 0.8, px, py), doubleSided: true }) : null;
    if (alt) hide(alt);
    signParts.push({ part, style, alt, home: null });
    return facing(part, pos, normal, w, h);
  };
  const wallSpot = (x, z) => {
    const wd = DIRS.find(([dx, dz]) => isWall(x + dx, z + dz)) || [0, 1];
    const c = center(x, z);
    return { pos: [c[0] + wd[0] * (CELL / 2 - 0.08), 1.7, c[2] + wd[1] * (CELL / 2 - 0.08)], normal: [-wd[0], 0, -wd[1]] };
  };
  const floorCells = find('.').filter(([x, z]) => Math.abs(x - dx0) + Math.abs(z - dz0) > 3);
  const takeCell = () => floorCells.splice(Math.floor(random() * floorCells.length), 1)[0];

  // ---------- The lighting circuit ----------
  // A relay on the wall switches the dock between its main lights and the emergency strips. Under emergency
  // light a wall between two rooms is a doorway, with a service cache in it. The dark costs composure.
  const circuit = rules.openSky ? null : (() => {
    const plain = (x, z) => at(x, z) === '.';
    const cands = [];
    for (let z = 1; z < H - 1; z++) for (let x = 1; x < W - 1; x++) {
      if (at(x, z) !== '#' || !wallParts.has(`${x},${z}`)) continue;
      const ew = plain(x - 1, z) && plain(x + 1, z), ns = plain(x, z - 1) && plain(x, z + 1);
      if ((ew || ns) && Math.abs(x - dx0) + Math.abs(z - dz0) > 2) cands.push([x, z, ew ? 1 : 0]);
    }
    const relayCells = find('.').filter(([x, z]) => { const md = Math.abs(x - dx0) + Math.abs(z - dz0); return md >= 2 && md <= 6 && DIRS.some(([ddx, ddz]) => at(x + ddx, z + ddz) === '#'); });
    if (!cands.length || !relayCells.length) return null;
    const [ex, ez, ew] = cands[Math.floor(hash(3.3, 9.1) * cands.length)];
    // The relay is never beside the doorway it opens: you switch it, then go and look.
    const apart = relayCells.filter(([x, z]) => Math.abs(x - ex) + Math.abs(z - ez) >= 3);
    const rcPool = apart.length ? apart : relayCells;
    const rc = rcPool[Math.floor(hash(5.7, 2.2) * rcPool.length)];
    const rs = wallSpot(...rc);
    const c = center(ex, ez);
    const floor = P('Emergency doorway floor', slab, tileMat);
    const trim = { color: linear('#3c3a36'), metallic: 0.3, roughness: 0.7 };
    const along = ew ? [0, 0, 1] : [1, 0, 0]; // the doorway's width runs across the passage
    const frame = [-1, 1].map((k) => ({ part: P('Emergency doorway jamb', slab, trim), pos: [c[0] + along[0] * k * (CELL / 2 - 0.1), wallH / 2, c[2] + along[2] * k * (CELL / 2 - 0.1)], size: ew ? [CELL, wallH, 0.2] : [0.2, wallH, CELL] }));
    const relay = P('Lighting relay', box(0.03, 2), glow(linear('#b19a50'), 1.4, { color: [0.3, 0.3, 0.28], metallic: 0.7, roughness: 0.4 }));
    writeYaw(relay.matrix, [rs.pos[0], 1.35, rs.pos[2]], Math.atan2(rs.normal[0], rs.normal[2]), 0.34, 0.46, 0.1);
    label('LIGHTING\nMAIN · EMERGENCY', 'amber', [rs.pos[0] + rs.normal[0] * 0.02, 1.95, rs.pos[2] + rs.normal[2] * 0.02], rs.normal, 0.7, 0.3, 256, 110);
    const cache = P('Service cache (emergency side)', box(0.06, 2), glow([0.6, 1, 0.8], 0.5, { color: [0.3, 0.36, 0.34], metallic: 0.6, roughness: 0.4 }));
    return { cell: [ex, ez], c, floor, frame, relay, relayPos: [rs.pos[0], 1.35, rs.pos[2]], cache, cacheTaken: false, crossed: false, told: false, switches: 0 };
  })();
  if (circuit) eCell = circuit.cell;
  function setEmergency(v) {
    if (!circuit || v === emergency) return false;
    const [px, pz] = cellOf(player.pos[0], player.pos[2]);
    if (!v && px === eCell[0] && pz === eCell[1]) { hud.toast('NOT WHILE YOU ARE STANDING IN IT'); return false; }
    if (blackout) { sound.wrong(); hud.toast('NO POWER · RESET THE BREAKER AT THE RELAY'); return false; }
    // The relay takes three throws. It warns on the third and trips on the fourth.
    if (circuit.switches >= 3) { setBlackout(true); return false; }
    emergency = v;
    circuit.switches += 1;
    if (circuit.switches === 3) hud.caption('[the relay housing is hot. It will not take another throw]');
    sound.switchOn(); sound.lever();
    if (v) {
      hud.caption(circuit.told ? '[the main lights drop out. Coral strips. The doorway is there again]' : '[the main lights drop out and the emergency strips come up coral. There is a doorway in the wall that was not a doorway]');
      if (!circuit.told) { circuit.told = true; director.omen(0.5, 16); hud.hush(10, followers[0]?.id.toUpperCase() || null, 'That was a wall. I had my hand on it.'); events.ledger?.('changes', `${sector.name}: under emergency light there is a doorway where the main lights show a wall`); }
    } else hud.caption('[the lights come back. The wall is a wall]');
    return true;
  }
  // High Drift: the signs that are allowed to change are about you now. Swapped in place; nothing animates.
  let driftSigns = false, driftSignsTold = false;
  function setDriftSigns(v) {
    driftSigns = v;
    let n = 0;
    for (const s of signParts) {
      if (!s.alt) continue;
      if (v) {
        if (s.part.matrix[13] < -100) continue; // not standing anywhere right now
        s.home = Float32Array.from(s.part.matrix);
        s.alt.matrix.set(s.home); hide(s.part); n += 1;
      } else if (s.home) { s.part.matrix.set(s.home); hide(s.alt); s.home = null; }
    }
    if (v && n && !driftSignsTold) {
      driftSignsTold = true;
      hud.caption('[the signs have your wristband number on them. All of them]');
      hud.say(followers[0]?.id.toUpperCase() || 'MARS', 'Don\'t read the signs. Read the map.', 'crew');
      events.ledger?.('changes', `${sector.name}: at high Drift the signs are addressed to you`);
    }
    return n;
  }
  function setBlackout(v) {
    if (!circuit || v === blackout) return false;
    blackout = v;
    resetT = 0;
    // Lit signs go dark with the power. Blacklight paint was never on the circuit: it is all you can read.
    for (const s of signParts) { s.part.material.emission = v ? (s.style === 'uv' ? 1.4 : 0.02) : 0.8; if (s.alt) s.alt.material.emission = s.part.material.emission; }
    if (v) {
      sound.lever(); sound.duck(4); sound.thump(0);
      hud.caption('[a breaker lets go somewhere in the wall. Everything is out: the fixtures, the strips, the signs]');
      director.omen(0.6, 20);
      if (!circuit.tripped) { circuit.tripped = true; hud.hush(12, followers[0]?.id.toUpperCase() || null, 'Nobody touch anything. Back to the relay.'); events.ledger?.('machinery', `${sector.name}: the lighting relay trips on the fourth throw`); }
    } else {
      circuit.switches = 0;
      sound.switchOn(); sound.pump(0);
      hud.caption(emergency ? '[the breaker holds. The coral strips come back]' : '[the breaker holds. The lights come back]');
      events.award('machine', 'BREAKER RESET');
    }
    return true;
  }
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

  // ---------- The service door ----------
  // One ordinary door in every dock, set in a wall away from the raft: teal paint, wired glass, a handle, a
  // keyhole. Omens use it (the handle turns, it opens a crack, water runs from the keyhole) and sometimes
  // something forces it, and a player can hold it shut.
  const door = (() => {
    const [sx0, sz0] = find('S')[0];
    const cands = rules.basin
      ? find('.').filter(([x, z]) => Math.abs(x - sx0) + Math.abs(z - sz0) <= 3 && Math.abs(x - sx0) + Math.abs(z - sz0) >= 1 && DIRS.some(([ddx, ddz]) => isWall(x + ddx, z + ddz)))
      : find('.').filter(([x, z]) => { const md = Math.abs(x - dx0) + Math.abs(z - dz0); return md >= 4 && md <= 10 && DIRS.some(([ddx, ddz]) => isWall(x + ddx, z + ddz)); });
    if (!cands.length) return null;
    const [cx, cz] = cands[Math.floor(random() * cands.length)];
    const w = wallSpot(cx, cz);
    const n = w.normal, t = [n[2], 0, -n[0]];
    const fl = floorTop(cx, cz);
    const hinge = [w.pos[0] - t[0] * 0.45 + n[0] * 0.02, fl, w.pos[2] - t[2] * 0.45 + n[2] * 0.02];
    const teal = { color: linear('#6f9694'), metallic: 0.25, roughness: 0.6 };
    // A worn safety-yellow frame and a stencilled sign, so the door reads at a glance in poor light.
    const trim = { color: linear('#b19a50'), metallic: 0.1, roughness: 0.7 };
    for (const [nm, off, size] of [['Door jamb L', -0.5, [0.08, 2.1, 0.06]], ['Door jamb R', 0.5, [0.08, 2.1, 0.06]]]) writeBasis(P(nm, box(0.02, 2), trim).matrix, [w.pos[0] + t[0] * off + n[0] * 0.02, fl + 1.05, w.pos[2] + t[2] * off + n[2] * 0.02], t, UP, n, ...size);
    label('SERVICE · KEEP CLOSED', 'rule', [w.pos[0] + n[0] * 0.03, fl + 2.42, w.pos[2] + n[2] * 0.03], n, 1.0, 0.24, 384, 92);
    writeBasis(P('Door header', box(0.02, 2), trim).matrix, [w.pos[0] + n[0] * 0.02, fl + 2.12, w.pos[2] + n[2] * 0.02], t, UP, n, 1.08, 0.08, 0.06);
    return {
      cell: [cx, cz], n, t, hinge, angle: 0, turn: 0, fl,
      gap: P('Service door opening', box(0, 1), { color: [0.01, 0.012, 0.014], metallic: 0, roughness: 1 }),
      leaf: P('Service door', box(0.02, 2), teal),
      glass: P('Service door wired glass', box(0, 1), { color: [0.12, 0.16, 0.15], metallic: 0.3, roughness: 0.15 }),
      handle: P('Service door handle', cylinder(8, 0.2, 2), { color: [0.55, 0.55, 0.5], metallic: 0.8, roughness: 0.35 }),
      stream: P('Water from the keyhole', cylinder(6, 0, 1), { color: [0.5, 0.6, 0.6], metallic: 0.2, roughness: 0.05, alphaMode: 'blend', opacity: 0.6 }),
      puddle: P('Puddle under the door', cylinder(20, 0, 1), { color: [0.05, 0.07, 0.07], metallic: 0.6, roughness: 0.05 }),
      prints: [0, 1, 2, 3].map((i) => P(`Wet footprint ${i}`, box(0.2, 2), { color: [0.06, 0.07, 0.07], metallic: 0.5, roughness: 0.1 })),
      puddleR: 0, streamT: 0, printsOn: false, forced: null, heldT: 0, reopenAt: 0,
    };
  })();
  function placeDoor() {
    if (!door) return;
    const { n, t, hinge } = door;
    const a = door.angle;
    const d = [t[0] * Math.cos(a) + n[0] * Math.sin(a), 0, t[2] * Math.cos(a) + n[2] * Math.sin(a)];
    const z = cross(d, UP);
    const c = add(hinge, [d[0] * 0.45, 1.0, d[2] * 0.45]);
    writeBasis(door.gap.matrix, add(hinge, [t[0] * 0.45 - n[0] * 0.03, 1.0, t[2] * 0.45 - n[2] * 0.03]), t, UP, n, 0.92, 2.02, 0.01);
    writeBasis(door.leaf.matrix, c, d, UP, z, 0.9, 2.0, 0.05);
    writeBasis(door.glass.matrix, add(c, [-z[0] * 0.03, 0.5, -z[2] * 0.03]), d, UP, z, 0.32, 0.4, 0.01);
    const hp = add(hinge, [d[0] * 0.78 - z[0] * 0.05, 1.0, d[2] * 0.78 - z[2] * 0.05]);
    writeSegment(door.handle.matrix, hp, add(hp, [-d[0] * 0.13 * Math.cos(door.turn), -0.13 * Math.sin(door.turn), -d[2] * 0.13 * Math.cos(door.turn)]), 0.014);
    const keyhole = add(hp, [0, -0.08, 0]);
    if (door.streamT > 0) writeSegment(door.stream.matrix, keyhole, [keyhole[0] - z[0] * 0.08, door.fl + 0.01, keyhole[2] - z[2] * 0.08], 0.008); else hide(door.stream);
    if (door.puddleR > 0) writeBasis(door.puddle.matrix, [keyhole[0] - z[0] * 0.3, door.fl + 0.005, keyhole[2] - z[2] * 0.3], [1, 0, 0], [0, 1, 0], [0, 0, 1], door.puddleR, 0.004, door.puddleR * 0.8); else hide(door.puddle);
    door.prints.forEach((p, i) => {
      if (!door.printsOn) return hide(p);
      const along = 0.5 + i * 0.55, side = (i % 2 ? 0.12 : -0.12);
      writeYaw(p.matrix, add(hinge, [t[0] * (0.45 + side) + n[0] * along, door.fl + 0.004, t[2] * (0.45 + side) + n[2] * along]), Math.atan2(n[0], n[2]), 0.11, 0.004, 0.26);
    });
  }
  const omenFigure = createCrewFigure(P, 'visitor', ' standing at the far lamp', { ...VISITOR_LOOK, jacket: '#5d6461', vest: '#6d4a36' });
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
  if (variant.left) {
    // You left this dock unfinished: a notice on the wall by the mooring, wall side, where the raft ties up.
    const at = [dockC[0] + dockWall[0] * (CELL / 2 - 0.04), 1.7, dockC[2] + dockWall[1] * (CELL / 2 - 0.04)];
    label(`YOUR PARTY STOPPED HERE\nPLEASE CONTINUE · VISIT ${variant.left + 1}`, 'rule', at, [-dockWall[0], 0, -dockWall[1]], 1.1, 0.42, 512, 192);
    remembered.push({ pos: [dockC[0], 0, dockC[2]], cap: '[a notice by the mooring: YOUR PARTY STOPPED HERE. PLEASE CONTINUE. It is dated the day you left.]', ledger: `${sector.name}: the dock kept our place` });
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
    return { part, pos, wd, opened: false, item: random() < 0.55 ? 'cell' : 'filter' };
  });
  // The first supply locker is always 0417.
  if (lockers[0]) { const { pos, wd } = lockers[0]; label('0417', 'count', [pos[0] - wd[0] * 0.31, 1.75, pos[2] - wd[1] * 0.31], [-wd[0], 0, -wd[1]], 0.36, 0.12, 192, 64); }
  let attendant0417 = false, attendant0417T = 0;

  // ---------- Things worth picking up: collectibles (kept in the ledger across expeditions) and one power-up ----------
  const found = (facilityMem.found ||= {});
  const findCells = find('.').filter(([x, z]) => Math.abs(x - dx0) + Math.abs(z - dz0) >= 4);
  const finds = planFinds({ sectorIndex: sector.index, cells: findCells, found, hash }).map((it, i) => {
    const c = center(...it.cell);
    const pos = [c[0] + (hash(i, 3) - 0.5) * 1.6, floorTop(...it.cell) + 0.1, c[2] + (hash(i, 7) - 0.5) * 1.6];
    const duck = it.set === 'ducks';
    const part = it.type === 'powerup' ? P(`Found ${it.id}`, cylinder(12, 0.1, 2), glow(linear('#4d7472'), 0.5, { color: [0.5, 0.6, 0.58], metallic: 0.7, roughness: 0.3 }))
      : duck ? P(`Found ${it.id}`, ball, { color: [0.95, 0.8, 0.15], metallic: 0, roughness: 0.4 })
        : P(`Found ${it.id}`, box(0.03, 2), glow([0.85, 0.85, 0.78], 0.1, { color: [0.85, 0.85, 0.8], metallic: 0, roughness: 0.6 }));
    const head = duck ? P(`Found ${it.id} head`, ball, { color: [0.95, 0.8, 0.15], metallic: 0, roughness: 0.4 }) : null;
    return { ...it, pos, part, head, taken: false, yaw: hash(i, 11) * 6 };
  });
  // ---------- The work lamp: carried or set down, white or UV, a limited charge ----------
  state.lamp ||= { charge: 100, mode: 0 }; // mode: 0 off, 1 white, 2 UV
  const lampPart = P('Work lamp', box(0.04, 2), glow([1, 0.95, 0.85], 0.02, { color: [0.75, 0.6, 0.15], metallic: 0.5, roughness: 0.5 }));
  let lampPlaced = null, lampTold = false, lastLit = true;
  const lampOn = () => state.lamp.mode > 0 && state.lamp.charge > 0;
  const lampAt = () => lampPlaced || add(player.pos, [0, 1.3, 0]);
  const uvNear = (p, r = 8) => lampOn() && state.lamp.mode === 2 && distance(lampAt(), p) < r;
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
    // Things maintained for people who are becoming something else.
    { cap: '[a life vest on a hook. Six armholes, and every strap has been adjusted to fit]', build: (c, wd) => {
      const w = onWall(c, wd, 0.16); const n = [-wd[0], 0, -wd[1]]; const t = [n[2], 0, -n[0]];
      const v = P('Six-hole vest', box(0.12, 2), { color: [1, 0.45, 0.1], metallic: 0, roughness: 0.6 });
      writeBasis(v.matrix, add(w, [0, 1.25, 0]), t, UP, n, 0.5, 0.62, 0.12);
      for (let k = 0; k < 6; k++) writeBasis(P(`Vest armhole ${k}`, slab, dark([0.05, 0.03, 0.02])).matrix, add(w, [t[0] * (k % 2 ? 0.255 : -0.255) + n[0] * 0.01, 1.47 - Math.floor(k / 2) * 0.2, t[2] * (k % 2 ? 0.255 : -0.255) + n[2] * 0.01]), t, UP, n, 0.03, 0.12, 0.1);
      return [v];
    } },
    { cap: '[a pool ladder bolted to a dry wall. The rungs get closer together toward the floor, and keep going into it]', build: (c, wd) => {
      const w = onWall(c, wd, 0.12); const n = [-wd[0], 0, -wd[1]]; const t = [n[2], 0, -n[0]];
      const steel = { color: [0.75, 0.77, 0.76], metallic: 0.9, roughness: 0.25 };
      for (const sx of [-0.25, 0.25]) writeBasis(P('Ladder rail', box(0.02, 2), steel).matrix, add(w, [t[0] * sx, 0.95, t[2] * sx]), t, UP, n, 0.05, 1.9, 0.05);
      let y = 1.7, gap = 0.32;
      for (let k = 0; k < 9 && y > 0.02; k++) { writeBasis(P(`Ladder rung ${k}`, box(0.02, 2), steel).matrix, add(w, [0, y, 0]), t, UP, n, 0.5, 0.035, 0.05); gap *= 0.7; y -= gap + 0.04; }
      return [];
    } },
    { cap: '[a bench worn into four shallow hollows. Something sat here long enough to change its shape]', build: (c) => {
      const b = P('Worn bench', slab, { color: [0.55, 0.42, 0.3], metallic: 0, roughness: 0.7 }); writeYaw(b.matrix, add(c, [0, 0.35, 0]), 0, 1.8, 0.1, 0.45);
      for (let k = 0; k < 4; k++) writeYaw(P(`Bench hollow ${k}`, cylinder(16, 0, 1), { color: [0.34, 0.25, 0.17], metallic: 0, roughness: 0.4 }).matrix, add(c, [-0.66 + k * 0.44, 0.4, 0]), 0, 0.17, 0.006, 0.15);
      return [b];
    } },
    { cap: '[a laminated maintenance card. It calls removing a guest from the filter "cleaning"]', build: (c, wd) => {
      label('FILTER BASKET · WEEKLY\n1 ISOLATE PUMP   2 OPEN LID\n3 REMOVE GUEST FROM BASKET\n4 RINSE · RETURN GUEST TO POOL', 'sign', add(onWall(c, wd, 0.03), [0, 1.5, 0]), [-wd[0], 0, -wd[1]], 1.1, 0.55, 512, 256);
      return [];
    } },
    { cap: '[a plastic chair, repaired. The seat is braced flat and the back splinted dead straight, for someone who no longer bends]', build: (c, wd) => {
      const yaw = Math.atan2(-wd[0], -wd[1]); chair(add(c, [wd[0] * 0.8, 0, wd[1] * 0.8]), yaw);
      const p0 = add(c, [wd[0] * 0.8, 0, wd[1] * 0.8]);
      for (const sx of [-0.2, 0.2]) writeYaw(P('Chair splint', box(0.01, 2), { color: [0.55, 0.55, 0.5], metallic: 0.8, roughness: 0.4 }).matrix, add(p0, [Math.cos(yaw) * sx - Math.sin(yaw) * 0.26, 0.7, -Math.sin(yaw) * sx - Math.cos(yaw) * 0.26]), yaw, 0.04, 1.0, 0.03);
      writeYaw(P('Chair tape', box(0.01, 2), { color: [0.75, 0.7, 0.45], metallic: 0, roughness: 0.8 }).matrix, add(p0, [-Math.sin(yaw) * 0.25, 0.92, -Math.cos(yaw) * 0.25]), yaw, 0.55, 0.06, 0.08);
      return [];
    } },
    { cap: '[a depth sign. The second number is not for swimmers]', build: (c, wd) => {
      label('POOL DEPTH: 1.2 M\nRECOVERY DEPTH: 18.6 M', 'depth', add(onWall(c, wd, 0.03), [0, 1.6, 0]), [-wd[0], 0, -wd[1]], 1.2, 0.42, 512, 180);
      return [];
    } },
    { cap: '[a notice, recently laminated]', build: (c, wd) => {
      label('PLEASE REPORT ANY GUEST WHO HAS\nSTOPPED CASTING A REFLECTION.\nDO NOT INTERRUPT THEIR ACTIVITY.', 'rule', add(onWall(c, wd, 0.03), [0, 1.55, 0]), [-wd[0], 0, -wd[1]], 1.3, 0.48, 576, 212);
      return [];
    } },
  ];
  function onWall(c, wd, off) { return add(c, [wd[0] * (CELL / 2 - off), 0, wd[1] * (CELL / 2 - off)]); }
  function chair(pos, yaw) {
    const seat = P('Plastic chair', box(0.08, 2), { color: [0.93, 0.93, 0.9], metallic: 0, roughness: 0.4 });
    writeYaw(seat.matrix, add(pos, [0, 0.45, 0]), yaw, 0.5, 0.06, 0.5);
    const back = P('Plastic chair back', box(0.08, 2), { color: [0.93, 0.93, 0.9], metallic: 0, roughness: 0.4 });
    writeYaw(back.matrix, add(pos, [-Math.sin(yaw) * 0.22, 0.75, -Math.cos(yaw) * 0.22]), yaw, 0.5, 0.55, 0.06);
    return seat;
  }
  const vignettes = [];
  if (vignetteExtra) vignettes.push({ ...vignetteExtra, seen: false });
  for (let z = 1; z < H - 1; z++) for (let x = 1; x < W - 1; x++) {
    if (at(x, z) !== '.' || hash(x + 0.3, z + 0.7) > 0.11 || Math.abs(x - find('D')[0][0]) + Math.abs(z - find('D')[0][1]) < 2) continue;
    const wd = DIRS.find(([dx, dz]) => isWall(x + dx, z + dz)) || [0, 1];
    const v = VIGNETTES[Math.floor(hash(z, x + 5) * VIGNETTES.length)];
    v.build(center(x, z), wd);
    vignettes.push({ pos: center(x, z), cap: v.cap, seen: false });
  }

  // ---------- The Closed Wave Pool: the benchmark beats ----------
  // An empty lifeguard chair with wet prints on its ladder. Look away long enough and its lamp is on and it
  // is occupied. A wave display that advances while the pool stays flat. Something crossing under the surface
  // against the way the water goes.
  const wavePool = sector.chapter ? (() => {
    const cell = find('.').find(([x, z]) => at(x + 1, z) === '~' && isWall(x - 1, z)) || find('.').find(([x, z]) => DIRS.some(([dx, dz]) => at(x + dx, z + dz) === '~'));
    if (!cell) return null;
    const c = center(...cell);
    const wd = DIRS.find(([dx, dz]) => at(cell[0] + dx, cell[1] + dz) === '~') || [1, 0];
    const yaw = Math.atan2(wd[0], wd[1]);
    const fwd = [Math.sin(yaw), 0, Math.cos(yaw)], side = [Math.cos(yaw), 0, -Math.sin(yaw)];
    const white = { color: [0.92, 0.92, 0.9], metallic: 0, roughness: 0.4 };
    const wet = { color: [0.05, 0.06, 0.06], metallic: 0.6, roughness: 0.08 };
    const o = (f, s0, y) => add(c, add(add(scale(fwd, f), scale(side, s0)), [0, y, 0]));
    for (const [f, s0] of [[0.25, 0.28], [0.25, -0.28], [-0.25, 0.28], [-0.25, -0.28]]) writeYaw(P('Wave chair leg', box(0.02, 2), white).matrix, o(f, s0, 1.1), yaw, 0.07, 2.2, 0.07);
    writeYaw(P('Wave chair seat', slab, white).matrix, o(0, 0, 2.22), yaw, 0.62, 0.06, 0.55);
    writeYaw(P('Wave chair back', slab, white).matrix, o(-0.27, 0, 2.55), yaw, 0.62, 0.6, 0.05);
    for (let k = 0; k < 5; k++) {
      const y = 0.35 + k * 0.4;
      writeYaw(P(`Wave chair step ${k}`, slab, white).matrix, o(-0.42, 0, y), yaw, 0.56, 0.04, 0.12);
      // Wet prints, bare, going up. None coming down.
      writeYaw(P(`Wet print on rung ${k}`, slab, wet).matrix, o(-0.42, (k % 2 ? 0.1 : -0.1), y + 0.022), yaw, 0.1, 0.004, 0.11);
    }
    writeYaw(P('Puddle at the chair ladder', cylinder(20, 0, 1), wet).matrix, o(-0.6, 0, 0.012), 0, 0.42, 0.004, 0.3);
    const lamp = P('Wave chair lamp', ball, glow([1, 0.85, 0.6], 0.05));
    writeYaw(P('Wave chair lamp pole', box(0.02, 2), white).matrix, o(-0.3, 0.32, 2.9), yaw, 0.04, 1.2, 0.04);
    writeYaw(lamp.matrix, o(-0.1, 0.32, 3.5), 0, 0.14, 0.14, 0.14);
    const red = { color: linear('#9a5a50'), metallic: 0, roughness: 0.85 };
    const fig = {
      torso: P('Wave chair occupant', cylinder(16, 0.3, 3), red),
      head: P('Wave chair occupant head', ball, { color: [0.78, 0.76, 0.7], metallic: 0, roughness: 0.6 }),
      thighs: [0, 1].map((k) => P(`Wave chair occupant leg ${k}`, cylinder(10, 0.3, 2), { color: linear('#3c3a36'), metallic: 0, roughness: 0.85 })),
    };
    // The wave display: twelve lamps under a label, on the wall nearest the deep end.
    const wcell = find('~').map(([x, z]) => [x, z - 1]).find(([x, z]) => isWall(x, z)) || [Math.floor(W / 2), 0];
    const wc = center(wcell[0], wcell[1] + 1);
    const wpos = [wc[0], 0, wc[2] - CELL / 2 + 0.04];
    label('WAVE SEQUENCE', 'count', add(wpos, [0, 2.75, 0]), [0, 0, 1], 1.4, 0.22, 384, 60);
    const steps = Array.from({ length: 12 }, (_, k) => {
      const q = P(`Wave display step ${k}`, slab, glow([0.55, 0.85, 0.8], 0.04, { color: [0.1, 0.14, 0.14] }));
      writeYaw(q.matrix, add(wpos, [(k - 5.5) * 0.12, 2.5, 0]), 0, 0.08, 0.12, 0.02);
      return q;
    });
    const wake = P('Disturbance under the surface', slab, { color: [0.01, 0.025, 0.03], metallic: 0.8, roughness: 0.02 });
    return { c, yaw, fwd, side, lamp, fig, steps, wake, o, seenEmpty: false, awayT: 0, seated: false, seatSaid: false, step: 0, stepT: 12, wakeT: -1, wakeDone: false, stepSaid: false };
  })() : null;

  // ---------- Entities ----------
  const blooms = Array.from({ length: 16 }, (_, i) => ({
    core: P(`Bloom ${i}`, ball, { color: [0.62, 0.66, 0.6], metallic: 0, roughness: 0.15, emission: 0.02, emissiveColor: [0.77, 0.35, 0.31], alphaMode: 'blend', opacity: 0.62 }),
    heart: P(`Bloom heart ${i}`, sphere(12, 8), glow(linear('#c45a50'), 2, { color: [0.35, 0.06, 0.05] })),
    spikes: P(`Bloom spikes ${i}`, slab, dark([0.12, 0.02, 0.02])),
    // Two side chambers. They fill one after the other, and a hit that doesn't kill collapses one.
    lobes: [0, 1].map((k) => P(`Bloom chamber ${i}.${k}`, ball, { color: [0.58, 0.62, 0.57], metallic: 0, roughness: 0.2, emission: 0.02, emissiveColor: [0.77, 0.35, 0.31], alphaMode: 'blend', opacity: 0.7 })),
    active: false, pos: [0, 0, 0], hp: 2, phase: 0, dying: 0, ch: [1, 1], dormant: false, waking: 0, lunge: 0,
  }));
  // A body folded into a supply locker. It is breathing. It is holding what you came for.
  const occupant = {
    torso: P('Locker occupant', ball, { color: linear('#8f8a80'), metallic: 0, roughness: 0.8 }),
    head: P('Locker occupant head', ball, { color: [0.74, 0.72, 0.66], metallic: 0, roughness: 0.6 }),
    knees: P('Locker occupant knees', ball, { color: linear('#3c3a36'), metallic: 0, roughness: 0.85 }),
    locker: null, state: 'none', t: 0, away: 0,
  };
  if (lockers.length && sector.index >= 1 && random() < 0.4) occupant.locker = lockers[lockers.length - 1];
  const undertow = {
    patch: P('Undertow', cylinder(48, 0, 1), { color: [0.004, 0.01, 0.012], metallic: 0.9, roughness: 0.02 }),
    eye: P('Undertow glint', ball, glow([1, 0.1, 0.05], 0.02, { color: [0.2, 0, 0] })),
    pos: cellU ? center(...cellU) : [0, 0, 0], hp: 5 + Math.floor(sector.index / 2) * 2, holding: 0, alive: !!cellU, cooldown: 0, agitated: 0,
  };
  const towerCell = find('L')[0];
  const ruleText = { swim: 'NO SWIMMING DURING\nTHE MAINTENANCE CYCLE', run: 'NO RUNNING\nON DECK', fire: 'NO BLASTER DISCHARGE\nWHILE THE LAMP IS LIT', inspect: 'GUESTS MUST NOT STAND\nIN THE INSPECTION LAMP' }[rules.lifeguard];
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
    clip: P('Lifeguard clipboard', slab, { color: [0.5, 0.42, 0.3], metallic: 0, roughness: 0.7 }),
    ladders: [], idx: 0, act: 0, roundsT: 18, noticeT: 0,
    beam: P('Inspection lamp pool', cylinder(32, 0, 1), glow([1, 0.93, 0.78], 0.5, { color: [1, 0.95, 0.85], alphaMode: 'blend', opacity: 0.18 })),
    spot: null,
    pos: null, state: 'watching', violations: 0, calm: 0, blind: 0, stopped: false, lostSight: 0, lampOn: false, breakerPos: null,
  } : null;
  // The ladders it inspects on its rounds. The last one was removed years ago: four mounting holes in the tile.
  if (lifeguard && (rules.lifeguard === 'run' || rules.lifeguard === 'swim')) {
    const edge = find('.').filter(([x, z]) => DIRS.some(([dx, dz]) => at(x + dx, z + dz) === '~') && distance(center(x, z), lifeguard.base) > 5);
    const picks = [];
    for (const c of edge) if (picks.every((q) => Math.abs(q[0] - c[0]) + Math.abs(q[1] - c[1]) >= 3) && picks.length < 3) picks.push(c);
    const steel = { color: [0.75, 0.77, 0.76], metallic: 0.9, roughness: 0.25 };
    picks.forEach(([x, z], i) => {
      const [dx, dz] = DIRS.find(([ax, az]) => at(x + ax, z + az) === '~');
      const c = center(x, z);
      const lip = [c[0] + dx * (CELL / 2 - 0.1), 0, c[2] + dz * (CELL / 2 - 0.1)];
      const side = [dz, 0, dx];
      const missing = i === picks.length - 1 && picks.length > 1;
      if (!missing) {
        for (const sg of [-1, 1]) {
          writeYaw(P(`Pool ladder rail ${i}`, cylinder(8, 0, 1), steel).matrix, [lip[0] + side[0] * 0.28 * sg, 0.45, lip[2] + side[2] * 0.28 * sg], 0, 0.025, 0.9, 0.025);
          writeYaw(P(`Pool ladder rail low ${i}`, cylinder(8, 0, 1), steel).matrix, [lip[0] + dx * 0.25 + side[0] * 0.28 * sg, -0.3, lip[2] + dz * 0.25 + side[2] * 0.28 * sg], 0, 0.025, 0.9, 0.025);
        }
        for (let k = 0; k < 3; k++) writeYaw(P(`Pool ladder rung ${i}.${k}`, slab, steel).matrix, [lip[0] + dx * 0.25, -0.1 - k * 0.25, lip[2] + dz * 0.25], 0, dx ? 0.05 : 0.56, 0.03, dz ? 0.05 : 0.56);
      } else {
        for (const sg of [-1, 1]) for (const f of [0, 0.14]) writeYaw(P(`Ladder mounting hole ${i}`, cylinder(10, 0, 1), dark([0.03, 0.03, 0.03])).matrix, [lip[0] - dx * f + side[0] * 0.28 * sg, 0.012, lip[2] - dz * f + side[2] * 0.28 * sg], 0, 0.03, 0.004, 0.03);
      }
      lifeguard.ladders.push({ stand: [lip[0] - dx * 0.75, 0, lip[2] - dz * 0.75], yaw: Math.atan2(dx, dz), missing });
    });
  }
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
      keyIntensity: rules.openSky ? 1 : 0.04, fillIntensity: rules.openSky ? 0.6 : 0.1, ambientIntensity: rules.openSky ? 0.7 : rules.uv ? 0.08 : 0.15,
      fogColor: linear(sector.fog), fogDensity: rules.openSky ? 0.005 : 0.05 + sector.index * 0.006,
      skyTop: display(sky ? sky.top : sector.fog), skyBottom: display(sky ? sky.bottom : sector.fog), lightDirection: [0.4, 1, 0.3],
    },
  });
  renderer.resize();
  // The depth target is fixed for the life of this scene: AO, haze and the post chain all need it.
  const hasDepth = !!quality.renderer.depth;
  let lastChain = [];
  if (hasDepth) installUserPasses(renderer);

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
  let vel = [0, 0, 0];
  let hesitation = 0;
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

  const spawnBloom = (pos, dormant = false) => {
    const b = blooms.find((x) => !x.active);
    if (b) Object.assign(b, { active: true, pos: [...pos], hp: 2 + (sector.index > 3 ? 1 : 0), phase: random() * 6, dying: 0, stagger: 0, flash: 0, retreat: false, ch: [1, 1], dormant, waking: 0, lunge: 0, woken: false, floorY: pos[1] });
    return b;
  };
  // Placed Blooms wait collapsed on the floor: a heap of wet vinyl, a dropped jacket. Close enough, it breathes in.
  let dormantTold = false;
  for (const [x, z] of find('b')) {
    const wd = DIRS.find(([dx, dz]) => isWall(x + dx, z + dz)) || [0, 0];
    const c = center(x, z);
    spawnBloom([c[0] + wd[0] * (CELL / 2 - 0.7), floorTop(x, z) + 0.07, c[2] + wd[1] * (CELL / 2 - 0.7)], true);
  }
  const spawnRecent = new Map();
  /** A wave spawns out of sight: an open cell at least 14 m away. */
  function wave(count, flank = false) {
    const options = [];
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (!blocked(x, z) && distance(center(x, z), player.pos) > (flank ? 9 : 14)) options.push(center(x, z));
    if (!options.length) return;
    if (!flank) {
      // Out of sight, at a fair distance, ahead of where you are looking, not where the last one came from
      // (spawnscore.js). Falls back to any far cell if every candidate is in view.
      const eye = add(player.pos, [0, 1.6, 0]);
      const ranked = scoreSpawns(options.map((p) => ({ pos: p })), { eye, forward: forwardVec(), visible: (p) => lineOfSight(eye, add(p, [0, 1, 0])), near: 12, far: 30, recent: spawnRecent, now: time, random });
      for (let k = 0; k < count; k++) {
        const c = ranked.filter((r) => r.score > 0)[k % Math.max(1, ranked.filter((r) => r.score > 0).length)] || ranked[0];
        spawnRecent.set(c.id, time);
        spawnBloom(add(c.pos, [0, 1.2 + random(), 0]));
      }
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

  // ---------- Omens on foot ----------
  let fomen = null, fomenCool = 28 + random() * 18, lastFomen = '', fused = new Set();
  const doorDist = () => (door ? Math.hypot(door.hinge[0] - player.pos[0], door.hinge[2] - player.pos[2]) : 99);
  let viewEye = [0, 1.6, 0], viewDir = [0, 0, -1];
  const panTo = (p) => soundDir(viewEye, viewDir, p).pan;
  function startFomen(kind) {
    lastFomen = kind;
    fused.add(kind);
    fomen = { kind, t: 0 };
    const crew = Object.keys(state.crewState || {}).filter((c) => !(state.forgotten || []).includes(c) && state.crewState[c] !== 'hurt' && followers.some((f) => f.id === c));
    const who = (crew[0] || state.name).toUpperCase();
    director.omen(0.3, kind === 'forced' ? 30 : 14); // the door is the event: no swarm on top of it
    if (kind === 'handle') { hud.hush(12); sound.lever(panTo(door.hinge)); hud.caption('[the handle of the service door is turning — slowly — nobody behind the glass]'); }
    else if (kind === 'crack') { hud.hush(12, who, 'Did that door just open?'); sound.chair(panTo(door.hinge)); hud.caption('[the service door opens a few centimetres, and stops]'); }
    else if (kind === 'keyhole') { hud.hush(10); door.streamT = 10; hud.caption('[water running out of the service door\'s keyhole. The lock was dry a minute ago]'); }
    else if (kind === 'forced') { hud.hush(20); fomen.push = 0; hud.caption('[something is forcing the service door — get to it and HOLD IT SHUT]'); hud.say(who, 'The door — someone hold the door!', 'crew'); }
    else if (kind === 'lights') {
      hud.hush(14, who, 'Lights. Stay close.');
      fomen.order = lamps.filter((l) => !l.broken && distance(l.pos, player.pos) < 22).sort((a, b) => distance(b.pos, player.pos) - distance(a.pos, player.pos));
      fomen.i = 0; fomen.step = 0;
      hud.caption('[the lights are going out — one at a time — toward you]');
    }
    else if (kind === 'extraStep') fomen.armed = true;
    else if (kind === 'drain') { sound.gurgle(); setTimeout(() => { sound.breath(0); hud.caption('[the drain empties — and at the end of it, a breath drawn in]'); }, 1900); hud.hush(10); }
    else if (kind === 'echo') { hud.say(who, 'Radio check. Everyone okay?', 'crew'); setTimeout(() => { hud.say('VOICE · UNDER THE WATER', '…okay?', 'voice'); hud.caption('[the last word again — from under the water]'); }, 3200); hud.hush(12); }
    else if (kind === 'name') { sound.gurgle(); setTimeout(() => { hud.say('VOICE · THE DRAIN', `${state.name}?`, 'voice'); hud.caption('[your own voice, calling your name, from the drain]'); }, 1200); hud.hush(12); }
  }
  function endFomen() { fomen = null; fomenCool = 40 + random() * 35; }
  function updateFomens(dt, ask) {
    // Door bookkeeping that outlives any one omen.
    if (door) {
      if (door.streamT > 0) { door.streamT -= dt; door.puddleR = Math.min(0.55, door.puddleR + dt * 0.05); }
      if (door.reopenAt && time > door.reopenAt && doorDist() > 7) { door.reopenAt = 0; door.angle = 0.9; door.printsOn = true; events.ledger?.('changes', `${sector.name}: the service door you held shut was open later, with wet prints over the threshold`); }
      placeDoor();
    }
    const quiet = director.phase === 'relax' && !surge && !(undertow.alive && undertow.holding > 0) && !state.downed && !(lifeguard && lifeguard.state !== 'watching');
    if (!fomen) {
      if (!quiet) return;
      // Hesitation: standing still with the objective known, or doubling back, is noticed. It brings the next
      // unexplained thing sooner. It never brings enemies: confusion should be frightening, not punished.
      hesitation = stillT > 8 ? Math.min(1, hesitation + dt / 20) : Math.max(0, hesitation - dt / 30);
      if ((fomenCool -= dt * (1 + hesitation * 1.5)) > 0) return;
      const CAT = { handle: 'door', crack: 'door', keyhole: 'door', forced: 'door', lights: 'light', extraStep: 'presence', drain: 'sound', echo: 'voice', name: 'voice' };
      let pool = ['handle', 'crack', 'keyhole', 'forced', 'lights', 'extraStep', 'drain', 'echo', 'name'].filter((k) => !fused.has(k) && k !== lastFomen
        && (door || !['handle', 'crack', 'keyhole', 'forced'].includes(k))
        && !(k === 'forced' && (sector.index === 0 || !fused.has('handle') && !fused.has('crack')))
        && !(k === 'name' && state.drift < 35)
        && !(k === 'echo' && !followers.length));
      // Not the same kind of thing twice running: a door, then a sound, then a voice, not door, door, door.
      const varied = pool.filter((k) => CAT[k] !== CAT[lastFomen]);
      if (varied.length) pool = varied;
      if (pool.length) startFomen(pool[Math.floor(random() * pool.length)]);
      else fomenCool = 60;
      return;
    }
    const f = fomen;
    f.t += dt;
    if (f.kind === 'handle') {
      door.turn = f.t < 1.4 ? Math.sin(Math.min(1, f.t / 1.2) * Math.PI / 2) * 0.7 : Math.max(0, 0.7 - (f.t - 1.8) * 1.2);
      if (f.t > 4) { door.turn = 0; endFomen(); }
    } else if (f.kind === 'crack') {
      if (!f.wider) door.angle = Math.min(0.1, door.angle + dt * 0.3);
      // It opens farther once you walk away from it.
      if (!f.wider && (doorDist() > 6 || f.t > 30)) { f.wider = true; sound.chair(panTo(door.hinge)); hud.caption('[behind you — the door, opening wider]'); }
      if (f.wider) door.angle = Math.min(0.5, door.angle + dt * 0.4);
      if (f.wider && door.angle >= 0.5) endFomen();
    } else if (f.kind === 'keyhole') {
      if (f.t > 10) endFomen();
    } else if (f.kind === 'forced') {
      f.bang = (f.bang || 0) - dt;
      if (f.bang <= 0) { f.bang = 1.1; sound.thump(panTo(door.hinge)); }
      door.angle = Math.min(1.5, door.angle + dt * 0.09);
      const near = doorDist() < 1.9;
      if (near) {
        ask(5, `HOLD E · Hold the door shut · ${Math.round((door.heldT / 6) * 100)}%`);
        if (isDown('e')) { door.angle = Math.max(0, door.angle - dt * 0.3); door.heldT += dt; }
      }
      if (door.heldT >= 6) {
        hud.caption('[the pushing stops. Wet footsteps on the other side, going away]');
        door.angle = 0; door.reopenAt = time + 70; endFomen();
      } else if (door.angle >= 1.1) {
        // The hinges give: what was pushing comes through.
        door.angle = 1.5;
        sound.burstBig?.();
        hud.caption('[the hinges give — it\'s through]');
        for (let k = 0; k < 3; k++) spawnBloom(add(door.hinge, [door.n[0] * (1 + k * 0.4) + door.t[0] * 0.45, 1.3, door.n[2] * (1 + k * 0.4) + door.t[2] * 0.45]));
        endFomen();
      }
    } else if (f.kind === 'lights') {
      f.step -= dt;
      if (f.i < f.order.length && f.step <= 0) { f.step = 0.5; f.order[f.i++].out = true; sound.switchOn(); }
      if (f.i >= f.order.length && !f.darkT) f.darkT = f.t;
      if (f.darkT && f.t - f.darkT > 3 && !f.outcome) {
        const r = random();
        f.outcome = r < 0.4 ? 'nothing' : r < 0.7 ? 'blooms' : 'figure';
        if (f.outcome === 'blooms') { const dir = normalize(sub(f.order[0]?.pos || player.pos, player.pos)); for (let k = 0; k < 2; k++) spawnBloom(add(player.pos, [dir[0] * (7 + k) || 6, 1.2, dir[2] * (7 + k) || 6])); }
        if (f.outcome === 'figure' && f.order[0]) { f.figAt = [f.order[0].pos[0], floorTop(f.order[0].x, f.order[0].z), f.order[0].pos[2]]; f.persist = random() < 0.35; f.figT = 0; }
        for (const l of f.order) l.out = false;
        sound.switchOn();
        if (f.outcome === 'blooms') hud.caption('[the lights come back — and they are already close]');
      }
      if (f.figAt) {
        f.figT += dt;
        const yaw = Math.atan2(player.pos[0] - f.figAt[0], player.pos[2] - f.figAt[2]);
        poseStanding(omenFigure, { feet: f.figAt, yaw, walk: 0, pace: 0 });
        if (f.figT < 0.2 && !f.said) { f.said = true; hud.caption('[at the far end, under the last lamp: someone standing still]'); }
        // Most are gone a moment later. Some stay, until someone walks up to them.
        const gone = f.persist ? Math.hypot(f.figAt[0] - player.pos[0], f.figAt[2] - player.pos[2]) < 4 : f.figT > 2.4;
        if (gone) {
          hideCrewFigure(omenFigure);
          if (f.persist) hud.caption('[nobody there. A wet patch on the tiles, the size of two feet]');
          endFomen();
        }
      } else if (f.outcome && f.outcome !== 'figure') endFomen();
    } else if (f.kind === 'extraStep') {
      // The next time you stop: the crew's steps stop with yours, then one more.
      if (f.armed && !moving && time - stoppedAt > 0.5) {
        f.armed = false;
        setTimeout(() => sound.footstep(-0.5, false), 450);
        hud.caption(followers.length ? `[${followers.length + 1} of you stopped walking. One more step — behind you]` : '[you stopped. One more step — behind you]');
        hud.hush(10);
      }
      if (!f.armed && f.t > 3 || f.t > 40) endFomen();
    } else if (f.t > 6) endFomen();
  }
  let lastHealth = state.health;
  function runDirector(dt, eye) {
    const hurt = Math.max(0, lastHealth - state.health);
    lastHealth = state.health;
    const live = blooms.filter((b) => b.active && !b.dying && !b.retreat && !b.dormant);
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
    return !columnBlocks(a, b, columns);
  }
  function rayWorld(eye, dir) {
    for (let t = 0.2; t < 50; t += 0.15) {
      const p = add(eye, scale(dir, t));
      const [x, z] = cellOf(p[0], p[2]);
      if ((!rules.openSky && p[1] > 5) || (isWall(x, z) && p[1] < wallH)) return t;
      if (columns.length && columns.some((c) => (p[0] - c.x) ** 2 + (p[2] - c.z) ** 2 < c.r * c.r)) return t;
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
    for (const b of blooms) if (b.active && !b.dying) test(b.dormant ? add(b.pos, [0, 0.1, 0]) : b.pos, b.dormant ? 0.55 : 0.75, () => {
      b.hp -= state.damage;
      if (b.dormant) b.woken = true;
      // A hit that doesn't kill collapses a chamber: it sags, hisses, and the Bloom lurches to the other side.
      else if (b.hp > 0) { const k = b.ch[0] > 0.5 ? 0 : 1; if (b.ch[k] > 0.5) { b.ch[k] = 0.2; sound.gurgle(); } }
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
    if (circuit) test(circuit.relayPos, 0.4, () => { sound.hit(); setEmergency(!emergency); });
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
    else noise(player.pos);
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
      L.next = null;
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
      if (['pursuit', 'search', 'investigate', 'grab', 'rounds', 'noticed'].includes(lifeguard.state)) { if (lifeguard.state !== 'grab') { lifeguard.fromRounds = ['rounds', 'noticed'].includes(lifeguard.state); lifeguard.state = 'returning'; } lifeguard.next = null; hud.toast('LIFEGUARD BLINDED'); }
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
    const held = undertow.holding > 0 || (lifeguard && lifeguard.state === 'grab') || floaters.some((f) => f.state === 'holding') || ropes.some((r) => r.holding > 0) || state.sitting || !!state.downed;
    if (held) vel = [0, 0, 0];
    if (!held) {
      // Immediate response, a little weight: quick to start and quicker to stop on tile; in water you carry on.
      const wantV = add(scale(forward, mz * speed), scale(right, mx * speed));
      const rate = len > 0.1 ? (water ? 6 : 15) : (water ? 4.5 : 22);
      vel = [damp(vel[0], wantV[0], rate, dt), 0, damp(vel[2], wantV[2], rate, dt)];
      player.pos = add(player.pos, scale(vel, dt));
      if (rules.basin && basin === 'bypass' && WATERISH.has(at(pcx, pcz))) {
        // The basin turning: a slow circulation that carries you sideways while you wade.
        const bc = basinCentre();
        const t = normalize([-(player.pos[2] - bc[2]), 0, player.pos[0] - bc[0]]);
        player.pos = add(player.pos, scale(t, 1.3 * dt));
      }
      const cur = CURRENT[at(pcx, pcz)];
      if (cur && pumpOn) player.pos = add(player.pos, [cur[0] * 2.4 * dt, 0, cur[1] * 2.4 * dt]);
      if (waveOn && at(pcx, pcz) === 'w') player.pos = add(player.pos, [0, 0, -1.6 * dt]);
    }
    collide(player.pos);
    pushOutOfColumns(player.pos, columns, RADIUS);
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
    const litHere = rules.openSky || lamps.some((l) => Math.abs(l.x - pcx) <= 1 && Math.abs(l.z - pcz) <= 1 && l.on) || (lampOn() && distance(lampAt(), add(player.pos, [0, 1.3, 0])) < 6);
    lastLit = litHere;
    // Drift builds from prolonged immersion, stillness, being far from the raft, and the dark.
    // A short scouting trip is cheap; staying still in warm water is not.
    waterT = water ? waterT + dt : Math.max(0, waterT - dt * 2);
    stillT = moving ? 0 : stillT + dt;
    const fromRaft = Math.hypot(raftPos[0] - player.pos[0], raftPos[2] - player.pos[2]);
    const driftRate = (water ? 0.6 + Math.min(2.4, waterT * 0.12) : 0.08) + (stillT > 6 ? 0.8 : 0) + (fromRaft > 34 ? 0.35 : 0) + (litHere ? 0 : 0.5);
    // A dry pack: out of the water, Drift does not rise while it lasts.
    if (!(state.dryT > 0 && !water)) state.drift = clamp(state.drift + dt * driftRate * (1 + sector.index * 0.1), 0, 100);
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
          showModal(title, dockKind === 'divert' ? 'Two pipes leave this room. One runs to the exit channel: open it and the basin empties into it, so the floor between you and the dock dries out, and the raft leaves on the discharge. The other loops back into the basin: the water stays deep and moving, and the exit channel stays calm.' : 'This decides the route the raft takes out of here, and what is waiting on it.', [
            [a[0], () => { state.routeMod[key] = a[1]; hideModal(); hud.toast(a[2]); }, true],
            [b[0], () => { state.routeMod[key] = b[1]; hideModal(); hud.toast(b[2]); }],
          ], K.machine);
        }
        if (isDown('e') && !(pumpValves.length && valveStep < 3) && (!ROUTE_CHOICES[dockKind] || state.routeMod?.[key])) {
          if (!operating) { operating = 0.001; director.crescendo(); sound.lever(); if (dockKind === 'winch') sound.chains(); hud.caption(dockKind === 'winch' ? '[the winch chain screams on its drum — and something answers, everywhere]' : '[the machine groans awake — and something answers, everywhere]'); hud.say('DEZ', `That ${K.machine.toLowerCase()}\'s loud. Hold it. Whatever comes, hold it.`, 'crew'); }
          operating += dt;
          if (state.health < lastPanelHealth - 0.5) operating = Math.max(0.001, operating - 1.2);
          ask(4, `HOLD E · ${K.verb} ${Math.min(100, Math.round((operating / holdT) * 100))}%`);
          if (operating >= holdT) { operating = 0; restorePower(); }
        } else if (!crewOperator()) {
          ask(2, operating ? `HOLD E · ${K.verb} ${Math.round((operating / holdT) * 100)}% (paused)` : `HOLD E · ${K.verb} (it takes time, and it is loud)`);
        }
        lastPanelHealth = state.health;
      }
    }
    pumpRoomStep(dt, ask);
    if (Math.hypot(raftPos[0] - eye[0], raftPos[2] - eye[2]) < 2.8) {
      if (state.upgrades.includes('valve') && find('d').length && !drained) {
        ask(3, 'V · Valve tool: drain the flooded passage');
        if (wasPressed('v')) {
          (state.drained ||= {})[key] = true;
          sound.gurgle();
          hud.toast('DRAINED BY HAND · IT TAKES EFFECT NEXT TIME YOU LAND HERE');
        }
      }
      ask(2, powered() ? 'E · Board the raft (service gate open)' : 'E · Leave early (circuit dark: bypass exit, you keep what you earned, grade capped at B)');
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
          if (keepsSurvey) recordSurvey(key, W, H, carryList(survey));
          if (!powered()) { (state.early ||= {})[key] = true; events.log('extract', { sector: key, early: true }); }
          else if (state.early) delete state.early[key];
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
    if (circuit) {
      const C = circuit;
      C.relay.material.emission = blackout ? 0.02 : emergency ? 0.5 : 1.2 + Math.sin(time * 2) * 0.2;
      const atCache = emergency && !C.cacheTaken && Math.hypot(C.c[0] - eye[0], C.c[2] - eye[2]) < 1.9;
      const atRelay = Math.hypot(C.relayPos[0] - eye[0], C.relayPos[2] - eye[2]) < 2.3;
      if (blackout) {
        // Resetting takes a few seconds with your hands on it, in the dark. Step away and it winds back.
        if (resetT > 0) {
          if (!atRelay) { resetT = 0; hud.toast('THE BREAKER WINDS BACK'); }
          else { resetT -= dt; ask(3, `Resetting the breaker · ${Math.max(0, resetT).toFixed(1)} s · stay at the relay`); if (resetT <= 0) setBlackout(false); }
        } else if (atRelay && !atCache) {
          ask(2, 'E · Reset the breaker (4 s, stay at the relay)');
          if (wasPressed('e')) { resetT = 4; sound.lever(); return; }
        }
      } else if (!atCache && atRelay) {
        ask(2, emergency ? 'E · Lighting relay: back to MAIN' : 'E · Lighting relay: switch to EMERGENCY (or shoot it)');
        if (wasPressed('e')) { setEmergency(!emergency); return; }
      }
      const wp = wallParts.get(`${eCell[0]},${eCell[1]}`);
      if (emergency) {
        hide(wp);
        writeYaw(C.floor.matrix, [C.c[0], -0.25, C.c[2]], 0, CELL, 0.5, CELL);
        for (const f of C.frame) writeYaw(f.part.matrix, f.pos, 0, ...f.size);
        if (!C.cacheTaken) {
          writeYaw(C.cache.matrix, [C.c[0], 0.3, C.c[2]], 0.5, 0.6, 0.5, 0.4);
          if (Math.hypot(C.c[0] - eye[0], C.c[2] - eye[2]) < 1.9) {
            ask(2, 'E · Open the service cache');
            if (wasPressed('e')) { C.cacheTaken = true; state.cells = Math.min(3, state.cells + 1); state.credit = (state.credit || 0) + 100; sound.pickup(); hud.toast('SERVICE CACHE · +1 CELL · +100 CREDIT'); return; }
          }
        } else hide(C.cache);
        const [px, pz] = cellOf(player.pos[0], player.pos[2]);
        if (!C.crossed && px === eCell[0] && pz === eCell[1]) { C.crossed = true; events.award('route', 'ROUTE FOUND · EMERGENCY DOORWAY'); }
      } else {
        writeYaw(wp.matrix, [C.c[0], wallH / 2 - 0.5, C.c[2]], 0, CELL, wallH + 1, CELL);
        hide(C.floor); hide(C.cache); for (const f of C.frame) hide(f.part);
      }
    }
    for (const f of finds) {
      if (f.taken) { hide(f.part); if (f.head) hide(f.head); continue; }
      if (f.type === 'powerup') writeYaw(f.part.matrix, add(f.pos, [0, 0.12, 0]), time * 0.6, 0.08, 0.3, 0.08);
      else if (f.head) {
        // One of them is always facing you.
        const yaw = f.id === 'duck-facing' ? Math.atan2(eye[0] - f.pos[0], eye[2] - f.pos[2]) : f.yaw;
        writeYaw(f.part.matrix, add(f.pos, [0, 0.02, 0]), yaw, 0.1, 0.08, 0.13);
        writeYaw(f.head.matrix, add(f.pos, [Math.sin(yaw) * 0.08, 0.11, Math.cos(yaw) * 0.08]), yaw, 0.06, 0.06, 0.06);
      } else writeYaw(f.part.matrix, f.pos, f.yaw, 0.2, 0.025, 0.12);
      if (Math.hypot(f.pos[0] - eye[0], f.pos[2] - eye[2]) < 1.9) {
        ask(2, f.type === 'powerup' ? `E · Take the ${f.name.toLowerCase()}` : 'E · Pick it up');
        if (wasPressed('e')) { takeFind(f); return; }
      }
    }
    for (const lk of lockers) {
      if (lk.opened || Math.hypot(lk.pos[0] - eye[0], lk.pos[2] - eye[2]) > 2.2) continue;
      ask(2, 'E · Open the supply locker');
      if (wasPressed('e')) {
        lk.opened = true;
        lk.part.material.emission = 0.02;
        // The facility's records are ahead of you: the item is in your hand, and it has already been returned.
        if (lk === lockers[0] && !attendant0417) { attendant0417 = true; attendant0417T = 7; }
        if (occupant.locker === lk) {
          // Not an ambush. Somebody folded in there, knees to chin, breathing in slow, satisfied pulls.
          occupant.state = 'shown'; occupant.t = 0;
          sound.gurgle();
          hud.hush(12, null, null);
          hud.caption('[someone is folded into the locker, knees to chin. It is breathing in. It is holding the cell against its chest]');
          director.omen(0.6, 20);
          setTimeout(() => hud.say(followers[0] ? followers[0].id.toUpperCase() : state.name.toUpperCase(), 'Don\'t. Take it and close it. Please close it.', 'crew', true), 3200);
          events.ledger?.('changes', `${sector.name}: a person folded into a supply locker, breathing, holding a charge cell`);
        }
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
    if (basin === 'drained') basinLevel = Math.max(POOL - 0.1, basinLevel - dt * 0.12);
    if (basin === 'bypass' && Math.floor(time * 1.5) !== Math.floor((time - dt) * 1.5)) { const cs = find('~'); const [rx, rz] = cs[Math.floor(random() * cs.length)]; ripple = add(center(rx, rz), [0, -0.05, 0]); rippleTime = time; }
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
      const h = ch === 'x' || ch === 'B' ? (highWater ? -0.05 : -0.9) : rules.basin && (ch === '~' || ch === 'u' || ch === 'L') ? basinLevel : surface(w.x, w.z);
      if (h < POOL + 0.02) hide(w.part);
      else writeYaw(w.part.matrix, [c[0], h - 0.01, c[2]], 0, CELL, 0.02, CELL);
    }
    for (const m of markings) {
      const visible = !rules.uv || (input.scanning && angleTo(eye, dir, m.pos) < 0.6 && distance(eye, m.pos) < 14) || uvNear(m.pos, 10);
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
    updateOccupant(dt, eye, ask);
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
    if (floatAsk) ask(3, floatAsk);
    if (lifeguard && lifeguard.state === 'pursuit') ask(4, 'THE LIFEGUARD IS COMING · break its line of sight');
    if (lifeguard && lifeguard.state === 'rounds' && distance(lifeguard.pos, player.pos) < 14) ask(2, 'THE LIFEGUARD IS ON ITS ROUNDS · it only looks where it is going');
    if (lifeguard && lifeguard.state === 'noticed') ask(4, 'IT HAS STOPPED · get out of its sight');
    if (lifeguard && lifeguard.state === 'search') ask(3, 'IT IS LOOKING FOR YOU · stay out of its sight');
    if (lifeguard && lifeguard.state === 'grab') ask(5, `THE LIFEGUARD HAS YOU · tap SPACE to twist free (${Math.max(0, 6 - lifeguard.kicks)}), or burst (F)`);
    if (lifeguard && lifeguard.warn > 0 && lifeguard.state === 'watching') ask(4, `THE LIFEGUARD HAS SEEN YOU · ${lifeguard.rule === 'swim' ? 'get out of the water' : lifeguard.rule === 'inspect' ? 'get out of the light' : 'stop running'} or get out of its sight · ${Math.max(0, 2.5 - lifeguard.warn).toFixed(1)} s`);

    runDirector(dt, eye);
    updateFomens(dt, ask);
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
    callouts.update(dt, -player.yaw);
    lastAim = [eye, dir];
    viewEye = eye; viewDir = dir;
    updateFootExtras(dt, eye, dir, ask);
    if (wasPressed('f')) burst(eye);
    blaster.place(eye, target, dir, swayY * 0.4);

    if (!input.locked && !input.touch) ask(0, 'CLICK to look around');
    prompts.sort((a, b) => b[0] - a[0]);
    hud.prompt(prompts[0]?.[1] || '');
    // Reticle: brackets while something can be used; an arc while the machine is held.
    hud.reticle({ interact: prompts.some((p) => p[0] > 0), progress: operating && isDown('e') ? Math.min(1, operating / K.hold) : 0 });
    const depthInfo = state.upgrades.includes('depth') ? ` · ${water ? 'WAIST DEEP' : 'DRY'}${undertow.alive ? ` · WAKE ${Math.round(distance(undertow.pos, player.pos))} M` : ''}` : '';
    hud.depth(`${sector.depth.toFixed(1)} M · ON FOOT${water ? ' · IN WATER' : ''}${depthInfo}`);
    hud.route([`▸ ON FOOT · ${sector.name}`, hasCell ? (powered() ? `● ${K.machine} DONE · RETURN TO THE RAFT` : `○ CARRYING THE ${K.item.toUpperCase()} · FIND THE ${K.machine}`) : `○ FIND THE ${K.item.toUpperCase()}`, `MOORED RAFT ${Math.round(Math.hypot(raftPos[0] - eye[0], raftPos[2] - eye[2]))} M`]);

    saveTimer -= dt;
    if (saveTimer <= 0) {
      saveTimer = 3;
      events.position({ mode: 'explore', pos: [...player.pos], yaw: player.yaw, hasCell, taken: takenState() });
    }
    events.tick(dt);

    // Rim markers for a Bloom that has committed to you and is out of view. Ones that are only circling get none.
    {
      const near = [];
      if (settings.threatWedges !== false) for (const b of blooms) {
        if (!b.active || b.dying || b.dormant || !b.commit) continue;
        const rel = sub(b.pos, eye), d = Math.hypot(...rel);
        if (d < 10) near.push({ rel, urgency: 1 / Math.max(0.5, d) });
      }
      // The Lifeguard, once it is coming for you: it outranks everything else.
      if (settings.threatWedges !== false && lifeguard && lifeguard.state === 'pursuit' && lifeguard.pos) {
        const rel = sub(add(lifeguard.pos, [0, 1.4, 0]), eye);
        near.push({ rel, urgency: 3 / Math.max(0.5, Math.hypot(...rel)) });
      }
      if (near.length) {
        const fwd = normalize(sub(target, eye)), rgt = normalize(cross(fwd, [0, 1, 0])), up = cross(rgt, fwd);
        lastWedges = threatWedges(near, fwd, rgt, up, Math.tan((FOV * Math.PI) / 360), canvas.clientWidth / Math.max(1, canvas.clientHeight));
      } else lastWedges = [];
      hud.wedges(lastWedges);
    }

    if (quality.skipRender) return;
    renderer.updateParts(parts);
    const frameLights = gatherLights(eye);
    eyeExposure = settings.autoExposure === false ? 1 : adaptExposure(eyeExposure, targetExposure(lightAtEye(frameLights, eye, rules.openSky ? 0.7 : rules.uv ? 0.08 : 0.15)), dt);
    if (undertow.alive && undertow.holding > 0) state.wetLens = 1;
    lastChain = !hasDepth || settings.postChain === false ? [] : buildChain(quality.tier, { drift: state.drift, health: state.health, hurt: state.hurtFx, wet: state.wetLens, reduceFlash: settings.flashReduce, distortion: settings.distortion, under: undertow.alive && undertow.holding > 0 ? 0.8 : 0, warm: sector.index === 0 });
    if (hasDepth) renderer.userPasses.set(lastChain);
    renderer.render({
      eye, target, fov: FOV, time,
      waterRipple: ripple, rippleTime: time - rippleTime,
      environment: { pointLights: frameLights, volumeFog: hazeVolume(eye, { density: !hasDepth || settings.haze === false ? 0 : quality.haze, steps: quality.hazeSteps, color: linear(sector.fog), sky: !!rules.openSky }) },
      exposure: ((rules.openSky ? 0.95 : 1.05) - state.drift * 0.002) * eyeExposure,
      effects: {
        ambientOcclusion: !hasDepth || settings.ambientOcclusion === false ? 0 : quality.ao, ambientOcclusionRadius: 0.6,
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
  let lastAim = null;
  const callouts = createCallouts({
    step: 0.12,
    ping: () => lastAim && pingFoot(...lastAim),
    call: (c) => {
      if (lastAim) pingFoot(...lastAim, true);
      hud.say(state.name.toUpperCase(), c.line, 'crew');
      const crew = Object.keys(state.crewState || {}).filter((x) => !(state.forgotten || []).includes(x) && state.crewState[x] !== 'hurt');
      if (crew.length) setTimeout(() => hud.say(crew[0].toUpperCase(), pick(c.reply), 'crew'), 900);
    },
  });
  function pingFoot(eye, dir, quiet = false) {
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
    } else if (quiet) return;
    else if (crew.length) hud.say(crew[0].toUpperCase(), pick(['Marked.', 'Seen. Go.', 'I see it. Careful.']), 'crew');
    else hud.caption('[radio check: static]');
  }

  function updateFollowers(dt) {
    hud.carry(hasCell ? `CARRYING ${K.item.toUpperCase()}` : '');
    crewShotT -= dt;
    if (crewShotT <= 0) hide(crewShot);
    for (const f of followers) {
      f.pos ||= [raftPos[0] + (f.k - 1) * 0.9, 0, raftPos[2] + 0.9];
      const sitting = f.id === 'june' && juneEvent.state === 'sitting';
      if (sitting || juneEvent.state === 'left' && f.id === 'june') { hideCrewFigure(f.fig); continue; }
      // Target: a point on your trail behind you; when you are down, your side.
      const trailPt = thread[thread.length - 1 - (f.k + 1)] || [raftPos[0] + (f.k - 1) * 0.9, 0, raftPos[2] + 0.8];
      const target = state.downed && f.k === 0 ? [player.pos[0] + 0.7, 0, player.pos[2] + 0.4] : f.post || trailPt;
      const to = [target[0] - f.pos[0], 0, target[2] - f.pos[2]];
      const dd = Math.hypot(to[0], to[2]);
      const spd = dd > 6 ? 5.5 : 3.6;
      const moving = dd > 0.6;
      if (moving) f.pos = add(f.pos, scale(normalize(to), Math.min(dd, spd * dt)));
      pushOutOfColumns(f.pos, columns, 0.35);
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
        const b = blooms.filter((x) => x.active && !x.dying && !x.dormant && distance(x.pos, from) < 14 && lineOfSight(from, x.pos)).sort((a, c) => distance(a.pos, from) - distance(c.pos, from))[0];
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

  function updateWavePool(dt, eye, dir) {
    const B = wavePool;
    if (!B) return;
    const seat = B.o(0, 0, 2.25);
    const d = Math.hypot(seat[0] - eye[0], seat[2] - eye[2]);
    const looking = d < 16 && angleTo(eye, dir, seat) < 0.45 && lineOfSight(eye, seat);
    if (!B.seated) {
      if (looking) B.seenEmpty = true;
      B.awayT = B.seenEmpty && !looking && d > 3 ? B.awayT + dt : 0;
      if (B.awayT > 4) {
        B.seated = true;
        B.lamp.material.emission = 6;
        sound.switchOn();
        hud.caption('[behind you, a lamp clicks on]');
      }
      hide(B.fig.torso); hide(B.fig.head); B.fig.thighs.forEach(hide);
    } else {
      // Seated, facing the pool, the way it is supposed to. It does not move. That is the whole thing.
      writeYaw(B.fig.torso.matrix, B.o(-0.05, 0, 2.62), B.yaw, 0.18, 0.75, 0.13);
      writeYaw(B.fig.head.matrix, B.o(-0.05, 0, 3.15), B.yaw, 0.16, 0.22, 0.16);
      B.fig.thighs.forEach((g, k) => writeSegment(g.matrix, B.o(-0.05, (k ? 0.1 : -0.1), 2.3), B.o(0.42, (k ? 0.1 : -0.1), 1.6), 0.07));
      if (looking && !B.seatSaid) {
        B.seatSaid = true;
        director.omen(0.7, 25);
        hud.hush(14, followers[0]?.id.toUpperCase() || null, 'That chair was empty. I looked at it. It was empty.');
        events.ledger?.('changes', `${sector.name}: the lifeguard chair was empty, and then it was not`);
      }
    }
    // The display advances on its own schedule. The pool does not move.
    B.stepT -= dt;
    if (B.stepT <= 0 && B.step < 12) {
      B.stepT = 16;
      B.steps[B.step].material.emission = 2.2;
      B.step += 1;
      sound.thump?.(0);
      if (!B.stepSaid) { B.stepSaid = true; hud.caption('[on the wall, the wave display advances one step. The water stays flat]'); }
    }
    // Once, after the chair is occupied: something crosses the pool under the surface, against the waves.
    if (B.seated && !B.wakeDone && B.wakeT < 0) B.wakeT = 0;
    if (B.wakeT >= 0 && !B.wakeDone) {
      B.wakeT += dt;
      const pool = find('~').filter(([x, z]) => z < 6);
      const zs = pool.map(([, z]) => z), xs = pool.map(([x]) => x);
      const z0 = Math.max(...zs), z1 = Math.min(...zs), xm = (Math.min(...xs) + Math.max(...xs)) / 2;
      const k = Math.min(1, B.wakeT / 10);
      const p = [center(xm, z0)[0] + Math.sin(B.wakeT * 0.7) * 0.6, -0.02, center(0, z0)[2] + (center(0, z1)[2] - center(0, z0)[2]) * k];
      writeYaw(B.wake.matrix, p, 0, 0.5, 0.01, 1.4);
      if (Math.floor(B.wakeT * 2) !== Math.floor((B.wakeT - dt) * 2)) { ripple = p; rippleTime = time; }
      if (B.wakeT > 0.05 && B.wakeT - dt <= 0.05) hud.caption('[out in the pool, something moves under the surface — toward the deep end, against the way the waves go]');
      if (k >= 1) { B.wakeDone = true; hide(B.wake); }
    } else hide(B.wake);
  }

  /** Per-frame: valves, clock, notice, June, the thread, fumes haze, Pump Defence. */
  function updateFootExtras(dt, eye, dir, ask) {
    updateFollowers(dt);
    updateWavePool(dt, eye, dir);
    updateLamp(dt, eye, ask);
    updateSurvey();
    if (driftState(driftSigns, state.drift) !== driftSigns) setDriftSigns(!driftSigns);
    if (attendant0417T > 0 && (attendant0417T -= dt) <= 0) hud.say('THE ATTENDANT', 'Thank you. The item removed from Locker 0417 has been returned.', 'attendant', true);
    // Where you stand still the longest: the Safe Room window remembers it.
    if (sector.chapter) { const sp = Math.hypot(player.pos[0] - (lastStill?.[0] ?? 0), player.pos[2] - (lastStill?.[2] ?? 0)); if (sp < 0.3) { stillHere += dt; if (stillHere > (state.hesitation?.t || 0)) state.hesitation = { t: stillHere, near: nearestFeature(player.pos) }; } else { stillHere = 0; lastStill = [...player.pos]; } }
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
  function takeFind(f) {
    f.taken = true;
    sound.pickup();
    if (f.type === 'powerup') {
      if (f.id === 'overcharge') state.overchargeT = f.seconds;
      else if (f.id === 'drypack') state.dryT = f.seconds;
      else state.canisters = (state.canisters || 0) + 1;
      hud.toast(`${f.name} · ${f.note}`);
      return;
    }
    const r = collectFind(state, found, f);
    if (!r) return;
    saveFacility();
    hud.caption(`[${r.text}]`);
    events.score(r.score, `RECORDED · ${r.setName}`, 'evidence');
    events.ledger?.('changes', `${r.setName}: ${r.text}`);
    events.interest?.(1);
    if (r.effect === 'dry') hud.say(followers[0]?.id.toUpperCase() || 'JUNE', 'That was under the water. Why is it dry? …Why do you look better?', 'crew', true);
    if (r.complete) events.score(r.bonus, `${r.setName} · COMPLETE`, 'evidence');
    const hc = f.set === 'headcount' ? headcountLine(found, 1 + followers.length) : null;
    if (hc) hud.toast(hc);
  }
  /** The work lamp, each frame: cycle (L), set down or pick up (K), drain, recharge at the raft. */
  function updateLamp(dt, eye, ask) {
    const lamp = state.lamp;
    if (!lampTold) { lampTold = true; hud.toast('WORK LAMP · L: off / white / UV · K: set it down or pick it up'); }
    if (wasPressed('l')) { lamp.mode = (lamp.mode + 1) % 3; sound.switchOn(); hud.toast(lamp.charge <= 0 ? 'WORK LAMP · NO CHARGE · the raft recharges it' : ['WORK LAMP OFF', 'WORK LAMP · WHITE', 'WORK LAMP · UV'][lamp.mode]); }
    if (wasPressed('k')) {
      if (lampPlaced && Math.hypot(lampPlaced[0] - player.pos[0], lampPlaced[2] - player.pos[2]) < 2.2) { lampPlaced = null; hud.toast('LAMP PICKED UP'); }
      else if (!lampPlaced) { const f = forwardVec(); lampPlaced = [player.pos[0] + f[0] * 0.7, player.floor + 0.25, player.pos[2] + f[2] * 0.7]; hud.toast('LAMP SET DOWN · it stays lit until its charge runs out'); }
      else hud.toast('THE LAMP IS WHERE YOU LEFT IT');
    }
    if (lampOn()) lamp.charge = Math.max(0, lamp.charge - dt * (lamp.mode === 2 ? 100 / 150 : 100 / 240));
    if (!lampPlaced && Math.hypot(raftPos[0] - player.pos[0], raftPos[2] - player.pos[2]) < 3) lamp.charge = Math.min(100, lamp.charge + dt * 20);
    if (lampPlaced) {
      writeYaw(lampPart.matrix, lampPlaced, 0.4, 0.14, 0.3, 0.14);
      lampPart.material.emission = lampOn() ? 3 : 0.02;
      lampPart.material.emissiveColor = lamp.mode === 2 ? [0.55, 0.3, 1] : [1, 0.95, 0.85];
    } else hide(lampPart);
  }

  // The survey map: drawn from the cells you have stood in and what you could see in straight lines from them.
  const keepsSurvey = !state.endless && !state.custom;
  const survey = createSurvey(W, H, [], keepsSurvey ? surveyMem(key, W, H, state.expedition) : []);
  let surveyDoubt = false;
  const surveyOpen = (() => {
    // Only cells you can actually walk to count toward a complete survey.
    const out = [], seen = new Set([`${dx0},${dz0}`]), q = [[dx0, dz0]];
    while (q.length) { const [x, z] = q.pop(); out.push([x, z]); for (const [ax, az] of DIRS) { const k = `${x + ax},${z + az}`; if (!seen.has(k) && at(x + ax, z + az) !== '#' && at(x + ax, z + az) !== 'o') { seen.add(k); q.push([x + ax, z + az]); } } }
    return out;
  })();
  if (cellP) surveyMark(survey, 'P', cellP[0], cellP[1]);
  surveyMark(survey, 'S', scx, scz);
  let surveyCell = '', surveyShown = false;
  function updateSurvey() {
    const [cx, cz] = cellOf(player.pos[0], player.pos[2]);
    const here = `${cx},${cz}`;
    let changed = false;
    if (here !== surveyCell) {
      surveyCell = here;
      changed = true;
      if (surveyVisit(survey, cx, cz, isWall) && !survey.done && surveyCoverage(survey, surveyOpen) >= 0.85) {
        survey.done = true;
        events.award('survey', 'DOCK SURVEYED');
        events.ledger('places', `${sector.name}: surveyed`);
        hud.toast('SURVEY COMPLETE · the map is the crew\'s own, and it is right');
      }
    }
    if (wasPressed('m')) { surveyShown = !surveyShown; changed = true; if (!surveyShown) hud.survey(null); }
    // The first time the open map shows a place the last crew walked that is a wall now, somebody says so.
    if (surveyShown && !surveyDoubt && disagreements(survey, isWall) > 0) {
      surveyDoubt = true;
      hud.caption('[the old survey has floor where this room has wall. It is marked with a question]');
      events.ledger?.('changes', `${sector.name}: last expedition's survey shows a place this room does not have`);
    }
    if (surveyShown && changed) {
      const f = forwardVec();
      const facing = Math.abs(f[0]) > Math.abs(f[2]) ? (f[0] > 0 ? 1 : 3) : f[2] < 0 ? 0 : 2;
      hud.survey(surveyRender(survey, at, isWall, { you: [cx, cz, facing], raft: [dx0, dz0] }), surveyCoverage(survey, surveyOpen));
    }
  }

  function takenState() {
    return {
      survey: seenList(survey), surveyDone: survey.done,
      finds: finds.map((x, i) => (x.taken ? i : -1)).filter((i) => i >= 0),
      circuitCache: !!circuit?.cacheTaken, blackout,
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

  // ---------- Pump control: overlapping jobs while the machine is loud ----------
  // Someone operates the diverter, someone watches the approach, someone checks the window. With AI crew,
  // let go of E and a crewmate keeps the diverter turning (slower) while you go and deal with what is coming.
  const holdT = rules.basin ? 12 : K.hold;
  const pumpBeats = { loud: false, handle: false, lamp: false, took: false };
  const panelFront = [panelPos[0] - sWall[0] * 1.3, 0, panelPos[2] - sWall[1] * 1.3];
  function crewOperator() {
    if (!rules.basin || !operating || powered() || isDown('e')) return null;
    const f = followers.find((x) => x.k === 0 && x.pos && Math.hypot(x.pos[0] - panelFront[0], x.pos[2] - panelFront[2]) < 2.5);
    if (!f) return null;
    // Nobody holds a lever with a Bloom on them.
    if (blooms.some((b) => b.active && !b.dying && !b.dormant && distance(b.pos, add(f.pos, [0, 1.2, 0])) < 2.6)) return null;
    return f;
  }
  function pumpRoomStep(dt, ask) {
    if (!rules.basin || !operating || powered()) { for (const f of followers) f.post = null; return; }
    const op = crewOperator();
    if (op) {
      operating += dt * 0.6;
      if (!pumpBeats.took) { pumpBeats.took = true; hud.say(op.id.toUpperCase(), 'Go. I\'ve got the wheel. Watch the door for me.', 'crew', true); }
      ask(3, `${op.id.toUpperCase()} IS HOLDING THE DIVERTER ${Math.round((operating / holdT) * 100)}% · cover them, or take it back (E)`);
      if (operating >= holdT) { operating = 0; restorePower(); return; }
    }
    // Posts: the operator at the machine, one watching the approach, one at the observation window.
    const toBasin = normalize([center(W / 2, H / 2)[0] - panelFront[0], 0, center(W / 2, H / 2)[2] - panelFront[2]]);
    const win = find('o')[0];
    for (const f of followers) {
      f.post = f.k === 0 ? panelFront : f.k === 1 ? add(panelFront, scale(toBasin, 4)) : win ? add(center(...win), [-1.4, 0, 0]) : null;
    }
    const prog = operating / holdT;
    if (prog > 0.15 && !pumpBeats.loud) {
      pumpBeats.loud = true;
      sound.pumpRoom?.(true);
      hud.caption('[the pump room is loud now. You can\'t hear the basin any more]');
    }
    if (prog > 0.35 && !pumpBeats.handle && door) {
      pumpBeats.handle = true;
      if (!fomen) startFomen('handle');
    }
    if (prog > 0.55 && !pumpBeats.lamp && lifeguard && !lifeguard.stopped && lifeguard.state === 'watching') {
      pumpBeats.lamp = true;
      const L = lifeguard;
      L.state = 'investigate'; L.pos = [...L.base]; L.target = [...panelFront]; L.searchT = 0; L.next = null;
      hud.caption('[through the observation window: the inspection lamp has left the tower. It is coming round]');
      const watcher = followers.find((f) => f.k === 1) || followers[0];
      hud.say(watcher ? watcher.id.toUpperCase() : 'MARS', 'It\'s off the chair. Coming this way. Finish it or move — your call.', 'crew', true);
      director.omen(0.5, 20);
    }
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
    if (rules.basin) {
      // The water physically changes, and stays changed all the way back to the dock.
      basin = state.routeMod?.[key] === 'drained' ? 'drained' : 'bypass';
      if (basin === 'drained') { hud.caption('[the basin drains with a long roar into the exit channel. The tiles come up wet and bare]'); undertow.alive = false; }
      else hud.caption('[the bypass opens. The basin starts to turn, slowly, the whole body of water moving]');
    }
    sound.door();
    events.score(300, 'CIRCUIT RESTORED');
    hud.objective({ repair: 'The compressor is running and the gate is live. Return to the raft.', water: 'The pool is up. The raft can reach the outlet. Return to it.', winch: 'The gate is up. Return to the raft.' }[dockKind] || 'Power restored. The service gate is open. Return to the raft.');
    hud.say('DEZ', 'Gate\'s live. Lights too. And the pumps. Get back to the raft.', 'crew');
    // Restoring power starts the pumps: something in the deep water wakes up.
    sound.pump();
    hud.caption('[pumps starting — everywhere]');
    undertow.agitated = 40;
    if (!undertow.alive && cellU && basin !== 'drained') Object.assign(undertow, { alive: true, pos: center(...cellU), hp: 4, holding: 0 });
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
      const on = !emergency && !blackout && !l.broken && !l.out && (!l.dark || powered());
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
      .map(({ l }) => ({ position: l.pos, color: lampColor, intensity: 10 * l.level, radius: 0.4, range: 9.5 })); // bleached under the fixture, dark between
    if (lifeguard && lifeguard.lampOn) out.push({ position: add(lifeguard.base, [0, 4.6, 0]), color: lifeguard.rule === 'swim' ? [1, 0.25, 0.12] : [1, 0.9, 0.7], intensity: 9, radius: 0.3, range: 16 });
    if (lifeguard?.spot) out.push({ position: add(lifeguard.spot, [0, 1.6, 0]), color: [1, 0.93, 0.8], intensity: 14, radius: 0.5, range: 5 });
    if (rules.uv) out.push({ position: [eye[0], 3.5, eye[2]], color: [0.5, 0.25, 1], intensity: 3, radius: 1, range: 12 });
    // Emergency strips: a few dim coral lights where the fixtures are. Enough to see shapes, not distances.
    if (emergency && !blackout) for (const l of lamps.map((l) => ({ l, d: distance(l.pos, eye) })).sort((a, b) => a.d - b.d).slice(0, 4)) out.push({ position: [l.l.pos[0], 2.2, l.l.pos[2]], color: [1, 0.3, 0.22], intensity: 2.6, radius: 0.3, range: 7.5 });
    if (lampOn()) out.push(state.lamp.mode === 2 ? { position: lampAt(), color: [0.5, 0.25, 1], intensity: 5, radius: 0.3, range: 9 } : { position: lampAt(), color: [1, 0.95, 0.85], intensity: 8, radius: 0.3, range: 11 });
    return out;
  }

  // Who may commit an attack (pressure.js): two melee slots, three in the deep sectors. The rest circle.
  const budget = createBudget({ extra: { melee: sector.index >= 5 ? 1 : 0 } });
  function updateBlooms(dt, eye) {
    budget.tick(dt);
    for (const b of blooms) if (b.commit && (!b.active || b.dying || b.dormant)) { b.commit = false; budget.release(b); }
    budget.sweep((b) => b.active && !b.dying && !b.dormant);
    const crowd = blooms.filter((b) => b.active && !b.dying && !b.dormant).length;
    for (const b of blooms) {
      if (!b.active) { hide(b.core); hide(b.spikes); hide(b.heart); hide(b.lobes[0]); hide(b.lobes[1]); continue; }
      const dd0 = Math.hypot(b.pos[0] - eye[0], b.pos[2] - eye[2]);
      if (b.dormant) {
        // Collapsed vinyl on the floor. Within a few metres it breathes, slowly, and you can see one side lift.
        const breath = dd0 < 9 ? Math.max(0, Math.sin(time * 0.9 + b.phase)) ** 3 : 0;
        writeYaw(b.core.matrix, b.pos, b.phase, 0.55, 0.06 + breath * 0.035, 0.42);
        const fy = Math.cos(b.phase), fx = Math.sin(b.phase);
        writeYaw(b.lobes[0].matrix, add(b.pos, [fx * 0.38, 0.01, fy * 0.38]), b.phase, 0.26, 0.045 + breath * 0.05, 0.22);
        writeYaw(b.lobes[1].matrix, add(b.pos, [-fy * 0.3, 0.0, fx * 0.3]), b.phase + 1, 0.22, 0.04, 0.2);
        hide(b.spikes); hide(b.heart);
        b.core.material.emission = uvNear(b.pos) ? 0.9 : 0.02; // under UV the heap on the floor shows what it is
        if (dd0 < 4.2 || b.woken) {
          b.dormant = false;
          b.waking = 0.001;
          sound.gurgle();
          if (!dormantTold) { dormantTold = true; hud.caption('[the heap of wet vinyl on the floor takes a breath — one side fills first]'); }
        }
        continue;
      }
      if (b.waking) {
        // One chamber fills, then the body, then the other: uneven, like something remembering its shape.
        b.waking += dt;
        const t = b.waking, c = (v) => Math.max(0, Math.min(1, v));
        const f0 = c(t / 0.45), fc = c((t - 0.3) / 0.6), f1 = c((t - 0.75) / 0.45);
        const y = b.floorY + (1.2 - b.floorY) * fc * fc;
        const p0 = [b.pos[0], y, b.pos[2]];
        writeYaw(b.core.matrix, p0, b.phase, 0.55 - 0.1 * fc, 0.06 + 0.39 * fc, 0.42 + 0.03 * fc);
        const side = [Math.cos(b.phase), 0, -Math.sin(b.phase)];
        writeYaw(b.lobes[0].matrix, add(p0, scale(side, 0.3 + 0.08 * f0)), b.phase, 0.12 + 0.14 * f0, 0.05 + 0.2 * f0, 0.12 + 0.12 * f0);
        writeYaw(b.lobes[1].matrix, add(p0, scale(side, -0.3 - 0.08 * f1)), b.phase, 0.12 + 0.12 * f1, 0.04 + 0.18 * f1, 0.12 + 0.1 * f1);
        if (fc > 0.02) writeYaw(b.heart.matrix, p0, 0, 0.18 * fc, 0.18 * fc, 0.18 * fc); else hide(b.heart);
        b.heart.material.emission = Math.max(0.02, 3 * fc);
        hide(b.spikes);
        if (t > 1.25) { b.waking = 0; b.pos = p0; b.lunge = 0.7; sound.burst(); }
        continue;
      }
      if (b.dying) {
        hide(b.lobes[0]); hide(b.lobes[1]);
        b.dying += dt;
        const k = 1 + b.dying * 6;
        writeYaw(b.core.matrix, b.pos, 0, 0.45 * k, 0.25 * k, 0.45 * k);
        writeYaw(b.heart.matrix, b.pos, 0, 0.2 * k, 0.2 * k, 0.2 * k);
        b.heart.material.emission = Math.max(0.02, 6 - b.dying * 30);
        hide(b.spikes);
        if (b.dying > 0.18) b.active = false;
        continue;
      }
      // A lamp left burning on the floor draws the ones that have not committed to you.
      const lure = lampPlaced && lampOn() && !b.commit && distance(lampPlaced, b.pos) < 10 && distance(lampPlaced, b.pos) < distance(eye, b.pos) * 1.3;
      const d = distance(add(eye, [0, -0.3, 0]), b.pos); // contact and slots are always about you
      // With the power out they find you by your light. One that has not committed, and is not already on top of
      // you, loses you while your lamp is off (or set down elsewhere) and drifts to where it last had you.
      const carrying = lampOn() && !lampPlaced;
      b.blind = blackout && !lure && !b.commit && !carrying && d > 3.8;
      if (!b.blind) b.lastSeen = [eye[0], eye[1] - 0.3, eye[2]];
      const to = lure ? sub(add(lampPlaced, [0, 0.9, 0]), b.pos) : b.blind ? sub(b.lastSeen || b.pos, b.pos) : sub(add(eye, [0, -0.3, 0]), b.pos);
      b.stagger = Math.max(0, (b.stagger || 0) - dt);
      b.flash = Math.max(0, (b.flash || 0) - dt);
      if (b.retreat) {
        // After the peak, survivors sink back into the grates.
        b.pos = add(b.pos, [0, -dt * 1.2, 0]);
        if (b.pos[1] < -0.5) b.active = false;
      } else if (!b.stagger) {
        // Swarm movement: close in, but spread around you instead of queueing in one line.
        // Freshly filled, it launches: a short fast lunge before it settles into the swarm's pace.
        b.lunge = Math.max(0, b.lunge - dt);
        const v = b.blind ? (Math.hypot(...to) > 0.6 ? 0.6 : 0) : (d < (blackout && carrying ? 26 : 18) || lure ? 1.5 + sector.index * 0.2 : 0.4) * (state.visible ? 1.3 : 1) * (b.lunge > 0 ? 4 : 1);
        const side = cross(normalize(Math.hypot(...to) > 1e-3 ? to : [1, 0, 0]), UP);
        const orbit = d > 3 ? Math.sin(b.phase * 0.4 + b.hp) * 0.6 : 0;
        // Attack slots: only a couple may commit at once. The rest circle just out of reach, readable and waiting,
        // so five Blooms around you are a threat you can see, not five unavoidable hits.
        if (!b.commit && d < 3.8 && budget.request(b, 'melee', crowd)) b.commit = true;
        if (b.commit && d > 6.5) { b.commit = false; budget.release(b); }
        const holdOff = !b.commit && d < 3.4 && b.lunge <= 0;
        const next = holdOff ? add(b.pos, add(scale(normalize(to), -0.4 * dt), scale(side, (b.hp % 2 ? 1 : -1) * 1.6 * dt))) : v === 0 ? b.pos : add(b.pos, add(scale(normalize(to), v * dt), scale(side, (b.blind ? 0 : orbit) * dt)));
        if (!isWall(...cellOf(next[0], next[2]))) b.pos = next;
        pushOutOfColumns(b.pos, columns, 0.4);
      }
      b.phase += dt * 3;
      const pulse = 0.45 + Math.sin(b.phase) * 0.05;
      const squash = b.stagger > 0 ? 0.75 : 1;
      writeYaw(b.core.matrix, [b.pos[0], b.pos[1] + Math.sin(b.phase * 0.7) * 0.12, b.pos[2]], b.phase * 0.4, pulse / squash, pulse * 0.92 * squash, pulse);
      writeYaw(b.spikes.matrix, b.pos, b.phase, pulse * 2.3, 0.07, 0.07);
      writeYaw(b.heart.matrix, [b.pos[0], b.pos[1] + Math.sin(b.phase * 0.7) * 0.12, b.pos[2]], 0, pulse * 0.42, pulse * 0.42, pulse * 0.42);
      b.heart.material.emission = b.flash > 0 ? 9 : 1.4 + Math.sin(b.phase * 2) * 0.6;
      // Chambers: full ones bulge out of the sides; a collapsed one hangs off it like a flap.
      const core = [b.pos[0], b.pos[1] + Math.sin(b.phase * 0.7) * 0.12, b.pos[2]];
      const sideV = [Math.cos(b.phase * 0.4), 0, -Math.sin(b.phase * 0.4)];
      b.lobes.forEach((lb, k) => {
        const f = b.ch[k];
        const sg = k ? -1 : 1;
        const at = add(core, add(scale(sideV, sg * (0.22 + 0.2 * f) * pulse / 0.45), [0, (k ? -0.08 : 0.06) - (1 - f) * 0.25, 0]));
        writeYaw(lb.matrix, at, b.phase * 0.4, (0.1 + 0.16 * f) * pulse / 0.45, (0.05 + 0.19 * f) * pulse / 0.45, (0.08 + 0.13 * f) * pulse / 0.45);
      });
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
    L.lampOn = !L.stopped && L.rule !== 'run' && (L.rule === 'inspect' || Math.floor(time / (L.rule === 'swim' ? 6 : 4)) % 2 === 0);
    // 'inspect': the lamp turns slowly round the basin like a lighthouse and lays a pool of light on the floor,
    // the gallery included. Standing in it is the violation. You time crossings between passes.
    if (L.rule === 'inspect' && L.lampOn && L.state === 'watching') {
      const a = time * 0.33, r = 7.5 + Math.sin(time * 0.47) * 3.2;
      const sp = [b[0] + Math.sin(a) * r, 0, b[2] + Math.cos(a) * r];
      const [sx, sz] = cellOf(sp[0], sp[2]);
      sp[1] = isWall(sx, sz) ? -9 : Math.max(floorTop(sx, sz), isWater(sx, sz) ? -0.05 : -9);
      L.spot = sp[1] > -5 && lineOfSight(add(b, [0, 4.6, 0]), sp) ? sp : null;
      if (L.spot) writeYaw(L.beam.matrix, add(L.spot, [0, 0.03, 0]), 0, 2.3, 0.01, 2.3); else hide(L.beam);
    } else { L.spot = null; hide(L.beam); }
    // The cycle lamp hangs on an arm beside the seat, so it never sits in front of the figure.
    writeYaw(L.lamp.matrix, add(b, [0.75, 3.35, 0]), 0, 0.16, 0.16, 0.16);
    L.lamp.material.emission = L.lampOn ? 5 : 0.05;
    const up = L.state === 'watching';
    const pos = up ? add(b, [0, 3.75, 0]) : L.pos;
    const head = add(pos, [0, up ? 1.55 : 2.1, 0]);
    // It does not watch you. It watches the pool. It turns only when you give it a reason:
    // the lamp first, then the head, then the hand to the whistle.
    const toEye = Math.atan2(eye[0] - head[0], eye[2] - head[2]);
    const idle = L.rule === 'inspect' ? time * 0.33 : (L.idleYaw ??= Math.atan2(center(W / 2, H / 2)[0] - b[0], center(W / 2, H / 2)[2] - b[2]));
    const sweep = L.state === 'search' && L.searchT > 0 ? Math.sin(time * 1.3) * 1.1 : 0;
    const wantLook = up ? (L.warn > 0.8 || L.cooldown > 0 ? toEye : idle) : L.state === 'search' || L.state === 'investigate' || L.state === 'rounds' ? (L.heading ?? toEye) + sweep : toEye;
    L.look ??= idle;
    L.look += Math.atan2(Math.sin(wantLook - L.look), Math.cos(wantLook - L.look)) * Math.min(1, dt * (up ? 2.6 : 5));
    L.bodyYaw ??= idle;
    L.bodyYaw += Math.atan2(Math.sin(L.look - L.bodyYaw), Math.cos(L.look - L.bodyYaw)) * Math.min(1, dt * 1.2);
    const watch = L.look, bodyW = L.bodyYaw;
    L.handUp = damp(L.handUp || 0, (up && L.warn > 1.6) || L.cooldown > 1.2 || (L.state === 'noticed' && L.noticeT > 0.7) ? 1 : 0, 5, dt);
    // On its rounds: both hands to the rails, a foot to the first rung, its weight onto it, then the clipboard.
    const ph = L.state === 'rounds' && L.act > 0 ? (L.act < 1.5 ? 'rails' : L.act < 3 ? 'rung' : L.act < 4.2 ? 'weight' : 'write') : null;
    const dip = ph === 'weight' ? 0.1 : 0;
    L.flare = up && L.warn > 0 ? Math.min(1, L.warn * 3) : Math.max(0, (L.flare || 0) - dt);
    if (L.flare > 0) L.lamp.material.emission = 5 + L.flare * 6;
    // Torso only; legs below it. Too tall standing, and the arms too long either way.
    writeYaw(L.body.matrix, add(pos, [0, up ? 0.95 : 1.55, 0]), bodyW, 0.17, up ? 0.8 : 0.85, 0.13);
    writeYaw(L.head.matrix, head, watch, 0.17, 0.24, 0.17);
    // Unnaturally rigid: arms straight down, pale hands, one whistle cord. The posture reads before the face.
    const sideV = [Math.cos(bodyW), 0, -Math.sin(bodyW)];
    const fwdV = [Math.sin(bodyW), 0, Math.cos(bodyW)];
    const grabbing = L.state === 'grab';
    const handAt = (k) => {
      const down = add(pos, add(scale(sideV, (k ? 1 : -1) * 0.24), [0, up ? 0.25 : 0.55, 0]));
      if (grabbing) return add(pos, add(scale(sideV, (k ? 1 : -1) * 0.16), add(scale(fwdV, 0.55), [0, 1.3, 0])));
      if (ph && ph !== 'write') return add(pos, add(scale(sideV, (k ? 1 : -1) * 0.28), add(scale(fwdV, 0.62), [0, 0.92 - dip, 0])));
      if (ph === 'write') return add(pos, add(scale(sideV, k ? 0.02 : -0.14), add(scale(fwdV, k ? 0.3 : 0.34), [0, k ? 1.42 + Math.sin(time * 9) * 0.015 : 1.34, 0])));
      if (k !== 1 || L.handUp < 0.01) return down;
      const mouth = add(head, [Math.sin(watch) * 0.16, -0.14, Math.cos(watch) * 0.16]);
      return add(down, scale(sub(mouth, down), L.handUp));
    };
    L.hands.forEach((h, k) => writeYaw(h.matrix, handAt(k), watch, 0.06, 0.09, 0.06));
    const shY = up ? 1.33 : 1.95;
    writeYaw(L.shoulders.matrix, add(pos, [0, shY, 0]), bodyW, 0.48, 0.1, 0.2);
    L.arms.forEach((a, k) => {
      const sgn = k ? 1 : -1;
      const sh = add(pos, add(scale(sideV, sgn * 0.24), [0, shY - 0.03, 0]));
      const hand = handAt(k);
      writeSegment(a.matrix, sh, add(hand, [0, 0.08 * (1 - (k === 1 ? L.handUp : 0)), 0]), 0.045);
    });
    L.stride = (L.stride || 0) + dt * (L.moving ? 7 : 0);
    L.legs2.forEach((g, k) => {
      const sgn = k ? 1 : -1;
      const hip = add(pos, add(scale(sideV, sgn * 0.09), [0, up ? 0.58 : 1.15, 0]));
      // Seated on the tower, the legs hang off the front of the seat; standing, they are straight and long.
      const swing = L.moving ? Math.sin(L.stride + k * Math.PI) * 0.28 : (ph === 'rung' || ph === 'weight') && k === 0 ? 0.55 : 0;
      const foot = up ? add(add(hip, scale(fwdV, 0.42)), [0, -0.75, 0]) : add(pos, add(add(scale(sideV, sgn * 0.1), scale(fwdV, swing)), [0, 0.05, 0]));
      writeSegment(g.matrix, hip, foot, 0.07);
    });
    if (ph === 'write' || L.state === 'rounds' || L.state === 'noticed') writeYaw(L.clip.matrix, add(handAt(0), [0, 0.04, 0]), bodyW, 0.2, 0.28, 0.02); else hide(L.clip);
    writeYaw(L.cord.matrix, add(head, [Math.sin(watch) * 0.12, -0.42, Math.cos(watch) * 0.12]), watch, 0.012, 0.5, 0.012);
    writeYaw(L.glasses.matrix, add(head, [Math.sin(watch) * 0.13, 0.03, Math.cos(watch) * 0.13]), watch, 0.3, 0.06, 0.04);
    const sees = distance(b, player.pos) < 20 && lineOfSight(b, player.pos) && L.blind <= 0;
    L.calm += dt;
    if (L.calm > 30 && L.violations > 0 && L.state === 'watching') { L.violations -= 1; L.calm = 0; }
    // A violation is: being exposed while breaking the posted rule, after a warning. Getting out of the water,
    // stopping, or breaking line of sight during the warning ends it.
    const inBeam = !!L.spot && Math.hypot(player.pos[0] - L.spot[0], player.pos[2] - L.spot[2]) < 2.3;
    const breaking = sees && L.state === 'watching' && ((L.rule === 'swim' && water && L.lampOn) || (L.rule === 'run' && running) || (L.rule === 'inspect' && inBeam));
    L.warn = breaking ? (L.warn || 0) + dt : Math.max(0, (L.warn || 0) - dt * 2);
    if (breaking && L.warn > 0 && !L.warned) {
      L.warned = true;
      sound.chair(soundDir(player.pos, forwardVec(), L.base).pan * 0.5);
      hud.caption('[the lamp on the tower brightens. The chair creaks. Its head is turning]');
    }
    if (breaking && L.warn > 1.6 && !L.handSaid) { L.handSaid = true; hud.caption('[its hand comes up to the whistle]'); }
    if (!breaking && L.warn <= 0) { L.warned = false; L.handSaid = false; }
    if (L.warn > 2.5) {
      L.warn = 0;
      violate(L.rule === 'swim' ? 'Swimming during the maintenance cycle.' : L.rule === 'inspect' ? 'Standing in the inspection lamp.' : 'Running on deck.');
    }
    if (L.state === 'watching' && L.ladders.length && L.violations === 0 && L.warn <= 0 && !L.stopped) {
      L.roundsT -= dt;
      if (L.roundsT <= 0) {
        L.state = 'rounds'; L.pos = [...b]; L.idx = 0; L.act = 0; L.next = null; L.roundsT = 70 + random() * 30;
        hud.caption('[the Lifeguard climbs down from its chair. It has a clipboard. It is checking the ladders]');
        hud.say(followers[0] ? followers[0].id.toUpperCase() : 'DEZ', 'It\'s doing rounds. It only looks where it\'s going. Stay behind it.', 'crew');
      }
    }
    huntStep(dt);
  }

  // ---------- The Lifeguard hunting on foot ----------
  // pursuit (it sees you) → search (where it last saw you, looking round) → it may come through the
  // service door ahead of you → it gives up and goes back. If it reaches you it grabs and drags you
  // toward the water under its tower: kick free (SPACE), burst it, or a crewmate pulls you loose.
  /** The next point on a shortest walkable path from `from` toward `to`, by cells. */
  function stepToward(from, to) {
    const [sx, sz] = cellOf(from[0], from[2]);
    const [tx, tz] = cellOf(to[0], to[2]);
    if (sx === tx && sz === tz) return to;
    const prev = new Map([[`${tx},${tz}`, null]]);
    const q = [[tx, tz]];
    for (let i = 0; i < q.length; i++) {
      const [x, z] = q[i];
      if (x === sx && z === sz) break;
      for (const [dx, dz] of DIRS) {
        const nx = x + dx, nz = z + dz, k = `${nx},${nz}`;
        if (nx < 0 || nz < 0 || nx >= W || nz >= H || prev.has(k)) continue;
        if (blocked(nx, nz) && !(nx === sx && nz === sz)) continue;
        prev.set(k, [x, z]);
        q.push([nx, nz]);
      }
    }
    const n = prev.get(`${sx},${sz}`);
    if (!n) return to;
    return n[0] === tx && n[1] === tz ? to : center(n[0], n[1]);
  }
  function walkLG(L, target, speed, dt) {
    L.pathT = (L.pathT || 0) - dt;
    if (L.pathT <= 0 || !L.next) { L.next = stepToward(L.pos, target); L.pathT = 0.3; }
    const to = [L.next[0] - L.pos[0], 0, L.next[2] - L.pos[2]];
    const dd = Math.hypot(to[0], to[2]);
    if (dd < 0.05) { L.pathT = 0; L.moving = false; return Math.hypot(target[0] - L.pos[0], target[2] - L.pos[2]); }
    L.pos = add(L.pos, scale(normalize(to), Math.min(dd, speed * dt)));
    L.heading = Math.atan2(to[0], to[2]);
    L.moving = true;
    return Math.hypot(target[0] - L.pos[0], target[2] - L.pos[2]);
  }
  /** Gunfire it can't see, after it has already whistled once: it climbs down and comes to look. */
  function noise(at) {
    const L = lifeguard;
    if (!L || L.state !== 'watching' || L.violations < 1 || L.blind > 0 || L.stopped) return;
    if (distance(at, L.base) > 26 || lineOfSight(L.base, at)) return;
    L.state = 'investigate'; L.pos = [...L.base]; L.target = [...at]; L.searchT = 0; L.next = null;
    hud.caption('[behind you, somewhere: the tower ladder, one rung at a time]');
    sound.chair(soundDir(player.pos, forwardVec(), L.base).pan * 0.5);
  }
  function huntStep(dt) {
    const L = lifeguard;
    L.moving = false;
    if (L.state === 'watching') return;
    const eyeL = add(L.pos, [0, 1.9, 0]);
    const dd = Math.hypot(player.pos[0] - L.pos[0], player.pos[2] - L.pos[2]);
    const facingYou = Math.abs(Math.atan2(Math.sin(Math.atan2(player.pos[0] - L.pos[0], player.pos[2] - L.pos[2]) - L.look), Math.cos(Math.atan2(player.pos[0] - L.pos[0], player.pos[2] - L.pos[2]) - L.look))) < 1.2;
    const sight = 18 + (lampOn() && !lampPlaced ? 6 : 0) - (!lastLit ? 7 : 0);
    const seesYou = L.blind <= 0 && (dd < 2.5 || (dd < sight && facingYou && lineOfSight(eyeL, add(player.pos, [0, 1.2, 0]))));
    const spd = 2.4 + sector.index * 0.1;
    if (L.state === 'rounds') {
      if (seesYou && dd < 9) {
        L.state = 'noticed'; L.noticeT = 0;
        sound.chair(soundDir(player.pos, forwardVec(), L.pos).pan * 0.5);
        hud.caption('[it stops. Its head comes round. Get out of its sight]');
        return;
      }
      const lad = L.ladders[L.idx];
      if (!lad) { L.state = 'returning'; L.fromRounds = true; L.next = null; return; }
      const left = L.act > 0 ? 0 : walkLG(L, lad.stand, 1.25, dt);
      if (left < 0.45) {
        L.moving = false; L.heading = lad.yaw;
        const before = L.act;
        L.act += dt;
        // At the ladder that was taken out, it does all of it anyway: hands closing on nothing, a foot on no rung.
        if (lad.missing && before < 3.1 && L.act >= 3.1 && dd < 20 && lineOfSight(eyeL, add(player.pos, [0, 1.4, 0]))) {
          hud.caption('[there is no ladder there. It grips the rails anyway, tests a rung, puts its weight on it. Then it writes that down]');
          director.omen(0.5, 16); hud.hush(12);
          events.ledger?.('behaviours', `${sector.name}: the Lifeguard inspected a ladder that was removed, and passed it`);
        }
        if (L.act > 6) { L.act = 0; L.idx += 1; L.next = null; }
      }
    } else if (L.state === 'noticed') {
      L.noticeT += dt;
      if (L.noticeT > 1.9) {
        if (seesYou) { L.state = 'pursuit'; L.lostSight = 0; L.next = null; L.act = 0; L.violations = Math.max(1, L.violations); sound.whistle(soundDir(player.pos, forwardVec(), L.pos).pan); hud.say('MARS', 'It saw you. Move!', 'crew'); }
        else { L.state = 'rounds'; hud.caption('[it looks at where you were. It writes something. It goes on]'); }
      }
    } else if (L.state === 'pursuit') {
      if (seesYou) { L.lastSeen = [...player.pos]; L.lostSight = 0; } else L.lostSight += dt;
      walkLG(L, player.pos, spd, dt);
      if (dd < 1.1 && !state.downed) {
        L.state = 'grab'; L.grabT = 0; L.kicks = 0; L.next = null;
        sound.whistle(0); sound.hurt(); rumble('grab');
        hud.caption('[its hand closes on your vest strap]');
        hud.say('THE LIFEGUARD', '— three short whistles —', 'attendant', true);
      } else if (L.blind > 0) { L.state = 'returning'; L.next = null; }
      else if (L.lostSight > 1.5) {
        L.state = 'search'; L.target = L.lastSeen || [...player.pos]; L.searchT = 0; L.next = null;
        hud.toast('IT LOST SIGHT OF YOU · it is coming to where you were');
      }
    } else if (L.state === 'investigate' || L.state === 'search') {
      if (seesYou && L.blind <= 0) {
        L.state = 'pursuit'; L.lostSight = 0; L.next = null;
        sound.whistle(soundDir(player.pos, forwardVec(), L.pos).pan);
        hud.caption('[a whistle — it has seen you]');
        return;
      }
      const left = walkLG(L, L.target, spd * 0.7, dt);
      if (left < 0.6) {
        L.searchT += dt;
        L.moving = false;
        // Standing where you were, turning its head. Then, sometimes, it goes round to meet you.
        if (L.searchT > 5) {
          const dAhead = doorDist();
          if (door && !L.doorUsed && door.angle < 0.3 && dAhead > 5 && dAhead < 16 && distance(L.pos, player.pos) > 7) {
            L.doorUsed = true;
            L.pos = [door.hinge[0] + door.t[0] * 0.45 + door.n[0] * 0.7, 0, door.hinge[2] + door.t[2] * 0.45 + door.n[2] * 0.7];
            door.angle = 1.5; door.printsOn = true;
            sound.door(); sound.chains(soundDir(player.pos, forwardVec(), L.pos).pan);
            hud.caption('[the service door slams open. It came round the other way]');
            events.ledger?.('changes', `${sector.name}: the Lifeguard came through the service door to cut us off`);
            L.state = 'search'; L.target = [...player.pos]; L.searchT = 0; L.next = null;
          } else {
            L.state = 'returning'; L.next = null;
            hud.toast('IT LOST YOU');
            hud.caption('[footsteps, going away. The tower ladder]');
          }
        }
      }
    } else if (L.state === 'grab') {
      L.grabT += dt;
      // It drags you toward the water under its tower, without hurry.
      const pull = stepToward(player.pos, L.base);
      const to = [pull[0] - player.pos[0], 0, pull[2] - player.pos[2]];
      const m = Math.hypot(to[0], to[2]);
      if (m > 0.05) player.pos = add(player.pos, scale(to, Math.min(1, (1.1 * dt) / m)));
      const back = normalize([player.pos[0] - L.pos[0], 0, player.pos[2] - L.pos[2]]);
      L.pos = [player.pos[0] - back[0] * 0.7, L.pos[1], player.pos[2] - back[2] * 0.7];
      L.look = Math.atan2(back[0], back[2]);
      events.damage(dt * 7, 'The Lifeguard dragged you to the water.', true);
      state.drift = Math.min(100, state.drift + dt * 5);
      if (wasPressed(' ')) { L.kicks += 1; sound.splash(); }
      const helper = followers.find((f) => f.pos && Math.hypot(f.pos[0] - player.pos[0], f.pos[2] - player.pos[2]) < 9 && !(f.id === 'june' && (juneEvent.state === 'sitting' || juneEvent.state === 'left')));
      const freedBy = L.kicks >= 6 ? 'you' : helper && L.grabT > 1.8 ? helper.id : L.blind > 0 ? 'burst' : null;
      if (freedBy) {
        L.state = 'stunned'; L.stunT = 4; L.next = null;
        player.pos = add(player.pos, scale(back, 1.2));
        collide(player.pos);
    pushOutOfColumns(player.pos, columns, RADIUS);
        if (freedBy === 'you') hud.caption('[you twist out of the strap]');
        else if (freedBy !== 'burst') hud.say(freedBy.toUpperCase(), pick(['Got you — pull! PULL!', 'Let go of them. Let GO.', 'I have your vest. Kick!']), 'crew', true);
        sound.shove();
      } else if (L.grabT > 2.5 && Math.hypot(player.pos[0] - L.base[0], player.pos[2] - L.base[2]) < 1.4) {
        events.damage(30, 'The Lifeguard held you under at its tower.');
        state.drift = Math.min(100, state.drift + 20);
        L.state = 'returning'; L.next = null; L.violations = 1;
      }
    } else if (L.state === 'stunned') {
      L.stunT -= dt;
      if (L.stunT <= 0) { L.state = 'returning'; L.next = null; }
    } else if (L.state === 'returning') {
      const left = walkLG(L, L.base, 3, dt);
      if (left < 0.25) { L.state = 'watching'; if (!L.fromRounds) L.violations = 1; L.fromRounds = false; L.doorUsed = false; L.pos = null; }
    }
  }

  function updateOccupant(dt, eye, ask) {
    const o = occupant;
    if (o.state !== 'shown' && o.state !== 'closed') { hide(o.torso); hide(o.head); hide(o.knees); return; }
    const lk = o.locker;
    const d = Math.hypot(lk.pos[0] - eye[0], lk.pos[2] - eye[2]);
    o.t += dt;
    if (o.state === 'closed') {
      // Closed, it stays closed while you are near. Come back later and the locker stands open and empty.
      hide(o.torso); hide(o.head); hide(o.knees);
      o.away = d > 10 ? o.away + dt : 0;
      if (o.away > 40) { o.state = 'gone'; o.gone = true; }
      return;
    }
    const inhale = 1 + Math.max(0, Math.sin(o.t * 0.8)) * 0.07;
    writeYaw(o.torso.matrix, add(lk.pos, [0, -0.15, 0]), 0, 0.24 * inhale, 0.34 * inhale, 0.2 * inhale);
    writeYaw(o.knees.matrix, add(lk.pos, [0, 0.22, 0]), 0, 0.22, 0.14, 0.14);
    writeYaw(o.head.matrix, add(lk.pos, [0, 0.42, 0]), 0, 0.13, 0.15, 0.13);
    if (d < 2.4 && o.t > 1.2) {
      ask(2, 'E · Close the locker');
      if (wasPressed('e')) { o.state = 'closed'; o.away = 0; lk.part.material.emission = 0.02; sound.lever(); hud.caption('[you close it. The breathing goes on behind the door, the same pace]'); }
    }
  }

  let floatAsk = '';
  let stillHere = 0, lastStill = null;
  function nearestFeature(p) {
    const opts = [['the pool edge', find('~')], ['the beach', find('x')], ['the generator', find('P')], ['the dock', find('D')], ['the locker', find('h')]];
    let best = 'the pool edge', bd = 1e9;
    for (const [name, cells] of opts) for (const [x, z] of cells) { const c = center(x, z); const dd = Math.hypot(c[0] - p[0], c[2] - p[2]); if (dd < bd) { bd = dd; best = name; } }
    return best;
  }
  function updateFloaters(dt, eye) {
    floatAsk = '';
    for (const f of floaters) {
      if (f.state === 'gone') { hideCrewFigure(f.fig); hide(f.eyes); continue; }
      const p = [f.pos[0], surface(...f.cell) + 0.08 + Math.sin(time + f.cell[0]) * 0.02, f.pos[2]];
      poseProne(f.fig, { at: add(p, [0, -0.04, -0.3]), dir: [0, 0, -1], drift: time + f.cell[0] });
      if (f.state === 'revealed' || f.state === 'holding') {
        writeYaw(f.eyes.matrix, add(p, [0, 0.08, -0.74]), 0, 0.12, 0.02, 0.04); // at the face, turned up out of the water
        f.eyes.material.emission = 3;
      } else hide(f.eyes);
      const d = Math.hypot(p[0] - eye[0], p[2] - eye[2]);
      if (f.state === 'floating' && d < 2 && f.survivor) {
        // Lucid, and calm about it. Pull them out slowly: hold E. Let go and they ask again.
        if (!f.spoke) { f.spoke = true; hud.say('???', 'It doesn\'t hurt. Please don\'t pull that quickly.', 'marco', true); }
        floatAsk = 'HOLD E · pull them out slowly';
        f.pull = isDown('e') ? (f.pull || 0) + dt : Math.max(0, (f.pull || 0) - dt * 0.5);
        if (f.pull > 0 && !f.pullSaid && f.pull > 1.2) { f.pullSaid = true; hud.say('???', 'Slower. Thank you. My feet were part of the floor for a while.', 'marco', true); }
      }
      if (f.state === 'floating' && d < 2 && (!f.survivor || f.pull >= 2.6)) {
        if (f.survivor) {
          f.state = 'gone';
          state.towelAsk = state.towelAsk || 'the one from the water';
          const item = random() < 0.5 ? 'cell' : 'filter';
          if (item === 'cell') state.cells = Math.min(3, state.cells + 1);
          else state.filters = Math.min(3, state.filters + 1);
          sound.pickup();
          state.rescued += 1;
          hud.say('???', 'You came back. You came back for me. Is it far? I\'d like a towel.', 'marco');
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

  // Borrowed behaviour: a gesture each crewmate makes on the raft or at work, performed accurately by something
  // that has no reason to make it. One inconsistency per figure. arms are [forward, up, outward] from the shoulder.
  const HABITS = {
    TUBS: { cap: 'braces a hand on the edge of a raft that is not there, the way Tubs does before he stands', arms: (t) => ({ R: [0.34, -0.92 + Math.sin(Math.min(1, t) * Math.PI / 2) * 0.05, 0.1], L: [0.05, -0.56, 0.05] }), drop: 0.25 },
    JUNE: { cap: 'lifts a wrist and reads a band that is not on it, the way June does before she answers', arms: (t) => ({ L: [0.28, -0.22 - Math.sin(t * 1.5) * 0.02, -0.12], R: [0.06, -0.56, 0.05] }), drop: 0 },
    DEZ: { cap: 'wipes a tool it is not holding, twice, the way Dez does before he puts one away', arms: (t) => ({ R: [0.3 + Math.sin(t * 5) * 0.06, -0.38, -0.14], L: [0.3, -0.4, -0.12] }), drop: 0 },
    MARS: { cap: 'turns to count the last person in a group that is not behind it, the way Mars does before moving on', arms: () => null, turn: 2.4, drop: 0 },
  };
  let marcoAct = null;
  function updateMarcoAct(dt) {
    const a = marcoAct;
    if (!a) return;
    a.t += dt;
    const h = HABITS[a.who];
    const toYou = Math.atan2(player.pos[0] - a.at[0], player.pos[2] - a.at[2]);
    // The same small corrections and the same pause, every time: it loops on a two-second clock exactly.
    const loop = a.t % 2;
    poseStanding(omenFigure, { feet: a.at, yaw: toYou + (h.turn ? Math.min(1, loop) * h.turn : 0), walk: 0, pace: 0, drop: h.drop, arms: h.arms(loop) });
    const d = Math.hypot(a.at[0] - player.pos[0], a.at[2] - player.pos[2]);
    if (!a.said && a.t > 1.2 && lineOfSight(add(player.pos, [0, 1.5, 0]), add(a.at, [0, 1.5, 0]))) {
      a.said = true;
      const name = a.who[0] + a.who.slice(1).toLowerCase();
      const here = followers.some((f) => f.id === a.who.toLowerCase());
      hud.caption(`[someone by the far wall ${h.cap}. ${here ? `${name} is standing next to you` : `${name} is on the radio, somewhere else`}]`);
      director.omen(0.4, 14);
      hud.hush(10);
    }
    // Recognition, inconsistency, confrontation: walk up to it and it is gone. It was never authenticated.
    if (d < 5 || a.t > 14) {
      hideCrewFigure(omenFigure);
      if (d < 5) { hud.caption('[it stops in the middle of the gesture, and is not there]'); events.ledger?.('behaviours', `${sector.name}: something used ${a.who[0] + a.who.slice(1).toLowerCase()}'s habit where it made no sense`); }
      marcoAct = null;
    }
  }

  function updateMarco(dt, eye) {
    updateMarcoAct(dt);
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
        // Sometimes the voice has a body, and the body has one of your crew's habits, used in the wrong place.
        if (!marcoAct && !fomen?.figAt && who !== 'MARCO' && HABITS[who] && random() < 0.6) {
          const [mx, mz] = cellOf(m.pos[0], m.pos[2]);
          marcoAct = { t: 0, who, at: [m.pos[0], floorTop(mx, mz), m.pos[2]], said: false };
        }
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
    for (const i of r.finds || []) if (finds[i]) finds[i].taken = true;
    for (const i of r.survey || []) survey.seen[i] = 1;
    survey.done = !!r.surveyDone;
    if (circuit && r.circuitCache) circuit.cacheTaken = true;
    if (circuit && r.blackout) { circuit.tripped = true; setBlackout(true); }
    if (r.container && container) container.taken = true;
    if (r.cache && deathCache) { deathCache.taken = true; hide(deathCache.part); }
    if (r.june && r.june !== 'waiting') juneEvent.state = r.june === 'sitting' ? 'waiting' : r.june;
    for (let i = 0; i < (r.valves || 0); i++) { const v = pumpValves.find((x) => x.id === valveOrder[i]); if (v) v.open = true; }
    valveStep = r.valves || 0;
  }
  if (import.meta.env.DEV) window.__explore = { budget, wave: (n, f) => wave(n, f), lineOfSight, get remembered() { return remembered; }, get chain() { return lastChain; }, get eyeExposure() { return eyeExposure; }, renderer, get driftSigns() { return driftSigns; }, get wedges() { return lastWedges; }, survey, get surveyCoverage() { return surveyCoverage(survey, surveyOpen); }, surveyOpen, omen: (k) => startFomen(k), circuit, setEmergency, setBlackout, get blackout() { return blackout; }, signParts, get resetT() { return resetT; }, get emergency() { return emergency; }, blocked, isWall, finds, found, get lampPlaced() { return lampPlaced; }, lights: () => gatherLights(add(player.pos, [0, 1.6, 0])), get hesitation() { return hesitation; }, get lastOmen() { return lastFomen; }, get marcoAct() { return marcoAct; }, set marcoAct(v) { marcoAct = v; }, marcos, columns, wavePool, get basin() { return basin; }, isWater, floorTop, get operating() { return operating; }, set operating(v) { operating = v; }, panelFront, holdT, shoot, spawnBloom, occupant, lockers, noise, violate, get omenState() { return fomen; }, door, blooms, lamps, director, followers, get dockKind() { return dockKind; }, get valves() { return { order: valveOrder, step: valveStep, list: pumpValves }; }, june: juneEvent, thread, get clock() { return clock; }, stagnant, player, center, undertow, lifeguard, cellPos, panelPos, raftPos, code, find, floaters, restorePower };

  /** ?show=: put the dock into a fixed, readable state for screenshots and visual review. */
  function showcase(name) {
    blooms.forEach((b) => { b.active = false; });
    state.health = 100; state.drift = 0;
    if (name === 'blackout' && circuit) setBlackout(true);
    if (name === 'emergency' && circuit) setEmergency(true);
    if (name === 'signs') state.drift = 80;
    if (name === 'lamp') { state.lamp = { ...(state.lamp || {}), mode: 1, charge: 100 }; if (circuit) setBlackout(true); }
    if (name === 'survey') { for (const [x, z] of surveyOpen.slice(0, 30)) surveyVisit(survey, x, z, isWall); surveyShown = true; surveyCell = ''; }
    return true;
  }

  return {
    update,
    showcase,
    resize: () => renderer.resize(),
    /** Render scale relative to the quality tier's own pixel ratio (automatic resolution). */
    setScale: (k) => { renderer.pixelRatio = quality.renderer.pixelRatio * k; renderer.resize(); },
    dispose: () => renderer.dispose(),
    /** Where the player is right now, for an immediate resume save. */
    snapshot: () => ({ mode: 'explore', pos: [...player.pos], yaw: player.yaw, hasCell, taken: takenState() }),
  };
}
