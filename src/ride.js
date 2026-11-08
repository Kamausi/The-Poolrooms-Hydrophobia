// The raft. Movement is automatic; decisions are not. The ride is a Track built from the sector's plan:
// channel sections recycle a fixed pool of segment parts ahead of the camera, and rooms (holding pools,
// the arrival bay) have their own parts. A 67js renderer keeps the part list it was built with, so every
// entity here is a pool of parts that are moved, recoloured or hidden.
import { Renderer67, box, sphere, cylinder, torus } from '67js';
import { writeYaw, writeBasis, hide, add, sub, scale, normalize, clamp, damp, rng, screenRay, raySphere, rayPlaneY, linear, cross, display, project, angleTo, soundDir, distance } from './math.js';
import { tileTexture } from './textures.js';
import { signMaterial, quad } from './labels.js';
import { createBlaster } from './blaster.js';
import { input, wasPressed, isDown } from './input.js';
import { hud } from './hud.js';
import { sound } from './audio.js';
import { quality } from './quality.js';
import { settings } from './settings.js';
import { AMBIENT } from './sectors.js';
import { Track, EXIT_OFFSET, section } from './track.js';

const SEG = 6;
const SEGMENTS = 28;
const FOV = 72;
const UP = [0, 1, 0];
const FLAT_X = [1, 0, 0], FLAT_Y = [0, 0, -1];

export function createRide(canvas, state, sector, events, opts = {}) {
  const plan = state.ride;
  const track = new Track(plan.items, plan.choices);
  const random = rng(1000 + sector.index * 31 + state.attempt * 7 + (state.seed || 0));
  const map = tileTexture(sector);
  const tileMat = { color: [1, 1, 1], metallic: 0, roughness: 0.22, map, boxMapScale: 0.5 };
  const lampColor = linear(sector.lamp);
  const waterMat = () => ({ tag: 'water', color: linear(sector.water), metallic: 0.55, roughness: 0.08 });
  const slab = box(0, 1);
  const ball = sphere(28, 18);
  const lumpy = sphere(7, 5);
  const ring = torus(0.16, 40, 12);
  const thinRing = torus(0.06, 48, 10);
  const post = cylinder(16, 0.05, 1);
  const plane = quad();
  const parts = [];
  const P = (name, geometry, material) => {
    const p = { name, geometry, matrix: new Float32Array(16), material };
    parts.push(p);
    return p;
  };
  const glow = (color, emission, extra = {}) => ({ color, metallic: 0, roughness: 1, emission, emissiveColor: color, ...extra });
  const dark = (c = [0.02, 0.02, 0.02]) => ({ color: c, metallic: 0.2, roughness: 0.6 });
  const flat = (part, pos, sx, sy, thickness) => writeBasis(part.matrix, pos, FLAT_X, FLAT_Y, UP, sx, sy, thickness);
  /** A quad at pos facing along normal (horizontal), readable by someone looking at it. */
  const facing = (part, pos, normal, w, h) => writeBasis(part.matrix, pos, normalize(cross(scale(normal, -1), UP)), UP, normal, w, h, 1);

  // ---------- Channel segments ----------
  const segments = [];
  for (let i = 0; i < SEGMENTS; i++) {
    segments.push({
      s: i * SEG,
      left: P(`Wall L${i}`, slab, tileMat), right: P(`Wall R${i}`, slab, tileMat),
      ceiling: P(`Ceiling ${i}`, slab, tileMat), floor: P(`Floor ${i}`, slab, tileMat),
      water: P(`Water ${i}`, slab, waterMat()),
      belt: P(`Lift belt ${i}`, slab, { color: [0.12, 0.13, 0.12], metallic: 0.5, roughness: 0.5 }),
      lamp: P(`Lamp ${i}`, slab, glow(lampColor, 9)),
      rib: P(`Tube rib ${i}`, ring, { color: [0.35, 0.38, 0.36], metallic: 0.8, roughness: 0.35 }),
      winL: P(`Window L${i}`, slab, glow([0.5, 0.42, 0.25], 1.4)), winR: P(`Window R${i}`, slab, glow([0.5, 0.42, 0.25], 1.4)),
      figure: P(`Window figure ${i}`, slab, dark()),
      debris: P(`Debris ${i}`, slab, { color: [0.4, 0.38, 0.33], metallic: 0, roughness: 0.9 }),
    });
  }

  // ---------- Rooms: one set of parts placed at the nearest pool or bay ----------
  const room = {
    floor: P('Room floor', slab, tileMat), water: P('Room water', slab, waterMat()), ceiling: P('Room ceiling', slab, tileMat),
    wallL: P('Room wall L', slab, tileMat), wallR: P('Room wall R', slab, tileMat),
    back1: P('Room back 1', slab, tileMat), back2: P('Room back 2', slab, tileMat),
    front1: P('Room front 1', slab, tileMat), front2: P('Room front 2', slab, tileMat), front3: P('Room front 3', slab, tileMat),
    lamps: [0, 1, 2, 3].map((i) => P(`Room lamp ${i}`, slab, glow(lampColor, 9))),
    gates: [0, 1].map((i) => P(`Gate ${i}`, slab, { color: [0.3, 0.32, 0.3], metallic: 0.8, roughness: 0.35 })),
    arrows: [0, 1].map((i) => ({
      shaft: P(`Arrow shaft ${i}`, slab, glow([1, 0.7, 0.2], 3)),
      headA: P(`Arrow head A${i}`, slab, glow([1, 0.7, 0.2], 3)),
      headB: P(`Arrow head B${i}`, slab, glow([1, 0.7, 0.2], 3)),
    })),
    stub: Array.from({ length: 4 }, (_, i) => ({
      left: P(`Stub L${i}`, slab, tileMat), right: P(`Stub R${i}`, slab, tileMat), ceiling: P(`Stub C${i}`, slab, tileMat), water: P(`Stub W${i}`, slab, waterMat()),
    })),
    platform: P('Dock platform', slab, { color: [0.55, 0.57, 0.52], metallic: 0, roughness: 0.8 }),
    tether: P('Mooring post', post, { color: [0.75, 0.6, 0.15], metallic: 0.6, roughness: 0.4 }),
    beacon: P('Safe Room beacon', ball, glow([0.35, 1, 0.5], 6)),
    lampPost: P('Inspection lamp', ball, glow([1, 0.95, 0.8], 7)),
    figure: P('Platform figure', cylinder(12, 0.2, 2), dark([0.05, 0.05, 0.06])),
    door: P('Pressure door', slab, { color: [0.12, 0.3, 0.18], metallic: 0.8, roughness: 0.3 }),
    doorFrame: P('Pressure door frame', slab, { color: [0.15, 0.16, 0.15], metallic: 0.8, roughness: 0.4 }),
  };
  // Signs are textured per room, so each room in the plan gets its own sign parts.
  const roomSigns = new Map();
  for (const r of collectRooms(plan.items)) {
    const set = {};
    if (r.type === 'pool') {
      set.exits = r.exits.map((ex, i) => P(`Exit sign ${r.id}.${i}`, plane, { ...signMaterial(`${ex.label}\n${ex.note}`, ex.locked ? 'amber' : 'sign', 0.9, 512, 160), doubleSided: true }));
      if (r.dock) set.info = P(`Dock info ${r.id}`, plane, { ...signMaterial(`DOCK\n${r.dock.beacon}\n${r.dock.sight}`, 'safe', 0.8, 640, 240), doubleSided: true });
    } else if (r.type === 'bay') {
      set.info = P(`Bay sign ${r.id}`, plane, { ...signMaterial('SAFE ROOM\nARRIVAL BAY · PRESSURE SEALED', 'safe', 1.2, 512, 200), doubleSided: true });
    }
    roomSigns.set(r.id, set);
  }
  const voidWall = P('Spillway void', slab, { color: [0, 0, 0], metallic: 0, roughness: 1 });

  // ---------- The raft ----------
  const raft = {
    lip: P('Raft', torus(0.26, 48, 16), { color: [0.55, 0.2, 0.08], metallic: 0, roughness: 0.45 }),
    seat: P('Opposite seat', box(0.2, 3), { color: [0.07, 0.12, 0.2], metallic: 0, roughness: 0.8 }),
    strap: P('Seat restraint', slab, { color: [0.12, 0.12, 0.13], metallic: 0.3, roughness: 0.6 }),
    panel: P('Maintenance panel', slab, { color: [0.2, 0.22, 0.2], metallic: 0.6, roughness: 0.4, emission: 0.6, emissiveColor: [0.4, 1, 0.6] }),
    patches: [0, 1, 2].map((i) => P(`Raft patch ${i}`, slab, { color: [0.45, 0.45, 0.42], metallic: 0.2, roughness: 0.8 })),
    headlamp: P('Raft headlamp', slab, glow([1, 0.95, 0.85], 8)),
  };
  const passenger = {
    drips: [0, 1, 2].map((i) => P(`Drip ${i}`, sphere(8, 6), { color: [0.6, 0.8, 0.85], metallic: 0, roughness: 0.1 })),
    reflection: P('Reflection', slab, dark([0.01, 0.015, 0.02])),
    body: P('Passenger', cylinder(14, 0.4, 2), { color: [0.78, 0.8, 0.76], metallic: 0, roughness: 0.4 }),
    head: P('Passenger head', sphere(14, 10), { color: [0.8, 0.82, 0.78], metallic: 0, roughness: 0.3 }),
  };

  // ---------- Entities ----------
  const blooms = Array.from({ length: 20 }, (_, i) => ({
    core: P(`Bloom ${i}`, ball, glow([1, 0.22, 0.08], 2.2, { color: [0.35, 0.03, 0.03], roughness: 0.55 })),
    spikes: P(`Bloom spikes ${i}`, slab, dark([0.12, 0.02, 0.02])),
    active: false, pos: [0, 0, 0], hp: 2, phase: 0, dying: 0, drift: [0, 0, 0],
  }));
  const signals = Array.from({ length: 8 }, (_, i) => ({ ring: P(`Signal ${i}`, ring, glow([0.55, 1, 0.5], 3.2, { color: [0.5, 1, 0.55], roughness: 0.4 })), active: false, pos: [0, 0, 0], yaw: 0, used: 0 }));
  const ropes = Array.from({ length: 2 }, (_, i) => ({
    line: P(`Lane rope ${i}`, slab, { color: [0.85, 0.85, 0.8], metallic: 0, roughness: 0.6 }),
    floats: Array.from({ length: 5 }, (_, j) => ({ part: P(`Rope float ${i}.${j}`, ball, glow([1, 0.4, 0.1], 0.6, { color: j % 2 ? [0.9, 0.9, 0.85] : [0.9, 0.25, 0.08], roughness: 0.4 })), alive: true, pos: [0, 0, 0] })),
    active: false, s: 0,
  }));
  const patches = Array.from({ length: 3 }, (_, i) => ({
    patch: P(`Undertow ${i}`, cylinder(48, 0, 1), { color: [0.004, 0.01, 0.012], metallic: 0.9, roughness: 0.02 }),
    eye: P(`Undertow glint ${i}`, ball, glow([1, 0.1, 0.05], 0.02, { color: [0.2, 0, 0] })),
    active: false, s: 0, offset: 0, hp: 4,
  }));
  const wake = {
    a: P('Wake A', slab, dark([0.01, 0.02, 0.03])), b: P('Wake B', slab, dark([0.01, 0.02, 0.03])), shape: P('Wake shape', lumpy, dark([0.005, 0.008, 0.01])),
    active: false, phase: 'idle', ws: 0, dist: 30, thumpTimer: 0, stun: 0,
  };
  const valve = {
    wheel: P('Drain valve', torus(0.12, 40, 12), glow([0.3, 0.65, 1], 2.5, { color: [0.2, 0.55, 1], roughness: 0.3 })),
    bar: P('Drain valve spoke', slab, glow([0.3, 0.65, 1], 2.5, { color: [0.2, 0.55, 1], roughness: 0.3 })),
    plate: P('Drain valve plate', slab, dark([0.06, 0.08, 0.1])),
    grout: P('Grout over valve', sphere(16, 8), dark([0.03, 0.03, 0.025])),
    active: false, pos: [0, 0, 0], yaw: 0, turned: 0, hits: 0, covered: 0, side: 1,
  };
  const breaker = {
    bar: P('Breaker bar', slab, glow([1, 0.75, 0.2], 2.5)), plate: P('Breaker plate', slab, dark([0.06, 0.06, 0.05])),
    active: false, pos: [0, 0, 0], yaw: 0, sec: null,
  };
  const linked = {
    rings: [0, 1, 2].map((i) => ({
      part: P(`Linked target ${i}`, thinRing, glow([1, 0.85, 0.3], 2.5)),
      digit: P(`Linked digit ${i + 1}`, plane, { ...signMaterial(String(i + 1), 'amber', 1.5, 128, 128), doubleSided: true }),
      unknown: P(`Linked unknown ${i}`, plane, { ...signMaterial('?', 'amber', 1, 128, 128), doubleSided: true }),
      pos: [0, 0, 0], hit: false, number: 0,
    })),
    sensor: P('Maintenance sensor', slab, glow([0.4, 0.85, 1], 1.5, { color: [0.1, 0.2, 0.25] })),
    active: false, s: 0, next: 1, read: 0, sensorPos: [0, 0, 0], yaw: 0, flash: 0,
  };
  const anomalies = Array.from({ length: 3 }, (_, i) => ({ part: P(`Anomaly ${i}`, lumpy, glow([0.85, 0.8, 1], 1.6, { color: [0.85, 0.85, 0.9], roughness: 0.2 })), active: false, pos: [0, 0, 0], outcome: 'cache', visible: false }));
  const caches = Array.from({ length: 3 }, (_, i) => ({ part: P(`Supply crate ${i}`, box(0.06, 2), { color: [0.75, 0.62, 0.2], metallic: 0.2, roughness: 0.6, emission: 0.5, emissiveColor: [1, 0.8, 0.3] }), active: false, pos: [0, 0, 0], falling: 0, item: 'cell' }));
  const spill = { grate: P('Spillway grate', slab, dark([0.05, 0.05, 0.05])), sheet: P('Spillway water', slab, glow([0.75, 0.9, 1], 1.4)), active: false, s: 0, side: 1, passed: false };
  const lifeguard = {
    legs: [P('Chair leg L', post, { color: [0.92, 0.92, 0.9], metallic: 0, roughness: 0.4 }), P('Chair leg R', post, { color: [0.92, 0.92, 0.9], metallic: 0, roughness: 0.4 })],
    seat: P('Chair seat', slab, { color: [0.92, 0.92, 0.9], metallic: 0, roughness: 0.4 }),
    body: P('Lifeguard', cylinder(20, 0.3, 3), { color: [0.82, 0.55, 0.45], metallic: 0, roughness: 0.75 }),
    head: P('Lifeguard head', ball, { color: [0.8, 0.55, 0.45], metallic: 0, roughness: 0.7 }),
    glasses: P('Lifeguard glasses', slab, { color: [0.01, 0.01, 0.01], metallic: 1, roughness: 0.05 }),
    lamp: P('Warning lamp', ball, glow([1, 0.2, 0.1], 8)),
    breaker: P('Lamp breaker', slab, glow([1, 0.75, 0.2], 2)),
    sign: P('Lifeguard rule', plane, { ...signMaterial('NO BLASTER DISCHARGE\nWHILE THE LAMP IS LIT', 'rule', 0.7, 512, 200), doubleSided: true }),
    active: false, s: 0, side: 1, violations: 0, stopped: false, gone: false, lampOn: false,
  };
  const unloading = {
    platform: P('Unloading platform', slab, { color: [0.6, 0.6, 0.55], metallic: 0, roughness: 0.8 }),
    sign: P('Unloading sign', plane, { ...signMaterial('UNLOADING STATION\nPLEASE REMAIN SEATED', 'sign', 0.8, 512, 160), doubleSided: true }),
    active: false, s: 0, said: false,
  };
  const distant = {
    lip: P('Distant raft', torus(0.3, 32, 12), { color: [0.75, 0.32, 0.12], metallic: 0, roughness: 0.6 }),
    figure: P('Distant rider', cylinder(12, 0.3, 2), dark([0.04, 0.04, 0.05])),
    vests: [0, 1, 2, 3].map((i) => P(`Folded vest ${i}`, box(0.2, 2), { color: [1, 0.45, 0.1], metallic: 0, roughness: 0.6 })),
    active: false, parked: false,
  };
  const locker = {
    frame: P('Locker window', slab, dark([0.08, 0.07, 0.06])), light: P('Locker light', slab, glow([1, 0.85, 0.6], 2)),
    items: [P('Locker towels', box(0.1, 2), { color: [0.9, 0.9, 0.88], metallic: 0, roughness: 0.9 }), P('Locker armband', torus(0.3, 24, 10), { color: [1, 0.5, 0.1], metallic: 0, roughness: 0.5 }), P('Locker wristband', torus(0.2, 24, 10), { color: [0.9, 0.9, 0.9], metallic: 0, roughness: 0.4 }), P('Locker folded guest', box(0.3, 2), { color: [0.85, 0.83, 0.78], metallic: 0, roughness: 0.4 })],
    pump: P('Locker pump ring', torus(0.12, 40, 12), glow([1, 0.6, 0.2], 2.2)),
    active: false, sec: null, s: 0, lightOn: false,
  };
  const clouds = Array.from({ length: 14 }, (_, i) => ({ part: P(`Cloud ${i}`, box(0.4, 3), { tag: 'unlit', color: [0.97, 0.98, 1], metallic: 0, roughness: 1 }), base: [0, 0, 0] }));
  const towers = Array.from({ length: 7 }, (_, i) => P(`Tower ${i}`, slab, tileMat));
  const ghost = P('Distant figure', cylinder(12, 0.3, 2), dark([0.02, 0.02, 0.03]));

  const blaster = createBlaster(state);
  parts.push(...blaster.parts);
  for (const p of parts) if (p.matrix[15] === 0) hide(p);

  const sky = sector.sky;
  const renderer = new Renderer67(canvas, parts, {
    ground: false, world: true, hdr: true, ...quality.renderer,
    environment: {
      keyIntensity: sky ? 1 : 0.05, fillIntensity: sky ? 0.6 : 0.12, ambientIntensity: sky ? 0.7 : 0.28,
      fogColor: linear(sector.fog), fogDensity: sky ? 0.004 : 0.03 + sector.index * 0.004,
      skyTop: display(sky ? sky.top : sector.fog), skyBottom: display(sky ? sky.bottom : sector.fog),
      lightDirection: [0.4, 1, 0.3],
    },
  });
  renderer.resize();

  // ---------- Ride state ----------
  let s = opts.resumeS ?? 3;
  for (const enc of track.encounters) if (enc.s < s - 1) enc.e.done = true;
  let speed = opts.resumeS ? 0 : 6;
  let offset = 0;
  let viewYaw = 0;
  let time = 0;
  let frameDt = 1 / 60;
  let ripple = [0, -100, 0];
  let rippleTime = -10;
  let shake = 0;
  let nextLine = 6;
  let crewLine = state.crewLine || 0;
  let held = 0; // seconds the raft is held (Undertow / wake)
  let holding = null; // the holding pool the raft waits in
  const departed = new Set(opts.departed || []);
  let finished = false;
  let saveTimer = 0;
  let silence = 0;
  let nextSilence = 40 + random() * 30;
  let ghostTimer = 0;
  let ghostShow = 0;
  let ghostPos = [0, -500, 0];
  let cloudCycle = 0;
  let skyAnchor = null;
  let lastSec = null;
  let revealTimer = 0;
  let scanTarget = null;
  let raftSeat = null;
  const fx = { eye: [0, 0, 0], look: [0, 0, 0], fwd: [0, 0, -1] };
  const pick = (list) => list[Math.floor(random() * list.length)];
  const powered = () => !!(state.power || {})[state.sectorKey];

  const roomFrame = (r) => {
    const dir = [Math.sin(r.yaw), 0, Math.cos(r.yaw)];
    const right = [-Math.cos(r.yaw), 0, Math.sin(r.yaw)];
    const at = (u, v, h) => [r.origin[0] + dir[0] * u + right[0] * v, r.origin[1] + h, r.origin[2] + dir[2] * u + right[2] * v];
    return { dir, right, at };
  };
  const stopOf = (r) => r.s0 + r.sec.length * 0.42;

  function spawnBloom(atS, off, y) {
    const b = blooms.find((x) => !x.active);
    if (!b) return;
    Object.assign(b, { active: true, hp: 2 + (sector.index > 3 ? 1 : 0), dying: 0, phase: random() * 6, pos: track.lateral(atS, off, y), drift: [(random() - 0.5) * 0.8, 0, 0] });
  }

  /** Yaw for a wall-mounted target, angled 45 degrees toward the oncoming raft. */
  function facingYaw(at, side) {
    const yaw = track.at(at).yaw;
    const r = track.right(at);
    const back = [-Math.sin(yaw), 0, -Math.cos(yaw)];
    return Math.atan2(back[0] - side * r[0], back[2] - side * r[2]);
  }

  function give(item) {
    if (item === 'cell') {
      state.cells = Math.min(3, state.cells + 1);
      hud.toast('+1 CHARGE CELL');
    } else if (item === 'filter') {
      state.filters = Math.min(3, state.filters + 1);
      if (state.filter <= 0) state.filter = 100;
      hud.toast('+1 FILTER');
    } else {
      state.scrap += 2;
      hud.toast('+2 PARTS');
    }
    sound.pickup();
  }

  // ---------- Encounters ----------
  function spawn(enc) {
    const e = enc.e;
    e.done = true;
    const at = enc.s;
    const sec = enc.sec;
    const half = sec.half;
    if (e.kind === 'blooms') {
      for (let k = 0; k < e.count; k++) spawnBloom(at + k * 4, (random() - 0.5) * half * 1.4, 0.7 + random() * Math.min(2.6, sec.height - 1.5));
    } else if (e.kind === 'signal') {
      const g = signals.find((x) => !x.active);
      if (!g) return;
      const side = random() < 0.5 ? -1 : 1;
      Object.assign(g, { active: true, used: 0, pos: track.lateral(at, side * (half - 0.25), Math.min(2 + random() * 1.4, sec.height - 0.8)), yaw: facingYaw(at, side) });
    } else if (e.kind === 'rope') {
      const r = ropes.find((x) => !x.active);
      if (!r) return;
      r.active = true;
      r.s = at;
      r.floats.forEach((f, j) => Object.assign(f, { alive: true, pos: track.lateral(at, (j - 2) * (half * 0.38), 1.25) }));
      hud.say('DEZ', 'Rope across the channel. Pop the floats!', 'crew');
    } else if (e.kind === 'undertow') {
      const u = patches.find((x) => !x.active);
      if (!u) return;
      Object.assign(u, { active: true, s: at, offset: (random() - 0.5) * half, hp: 4 + Math.floor(sector.index / 2), grabbed: false, warned: false });
    } else if (e.kind === 'valve') {
      const side = random() < 0.5 ? -1 : 1;
      Object.assign(valve, { active: true, side, pos: track.lateral(at, side * (half - 0.2), 2.4), yaw: facingYaw(at, side), turned: 0, hits: 0, covered: e.covered ? 2 : 0 });
      hud.say('DEZ', `Blue valve on the ${side < 0 ? 'left' : 'right'} wall. Three hits drains ${sector.valve}.${e.covered ? ' Grout has grown over it. Clear that first.' : ''}`, 'crew');
    } else if (e.kind === 'bar') {
      const side = random() < 0.5 ? -1 : 1;
      Object.assign(breaker, { active: true, sec, pos: track.lateral(at + 8, side * (half - 0.15), 1.8), yaw: facingYaw(at + 8, side) });
      hud.say('DEZ', 'Tube\'s dark. Breaker bar on the wall. Shoot it for lights.', 'crew');
    } else if (e.kind === 'linked') {
      linked.active = true;
      linked.s = at + 22;
      linked.next = 1;
      linked.read = state.upgrades.includes('recorder') ? 1 : 0;
      const side = random() < 0.5 ? -1 : 1;
      linked.sensorPos = track.lateral(at, side * (half - 0.12), 2.2);
      linked.yaw = facingYaw(at, side);
      linked.rings.forEach((r, i) => Object.assign(r, { pos: track.lateral(linked.s + i * 3, (i - 1) * half * 0.55, 2.1 + (i % 2) * 0.5), hit: false, number: e.order[i] }));
      hud.say('MARS', state.upgrades.includes('recorder') ? 'Recorder has the order. Hit them one, two, three.' : 'Numbered targets. Scan the sensor on the wall to read the order.', 'crew');
    } else if (e.kind === 'anomaly') {
      const a = anomalies.find((x) => !x.active);
      if (!a) return;
      const side = random() < 0.5 ? -1 : 1;
      Object.assign(a, { active: true, pos: track.lateral(at, side * (half - 0.6), 1.2 + random() * 2), outcome: ['cache', 'passenger', 'blooms'][Math.floor(random() * 3)] });
    } else if (e.kind === 'cache') {
      const c = caches.find((x) => !x.active);
      if (!c) return;
      const side = random() < 0.5 ? -1 : 1;
      Object.assign(c, { active: true, pos: track.lateral(at, side * (half - 0.4), 2.6), falling: 0, item: e.item });
    } else if (e.kind === 'wake') {
      Object.assign(wake, { active: true, phase: 'approach', ws: at + 40, dist: 30, thumpTimer: 0, stun: 0 });
      hud.say('JUNE', 'There\'s a wake ahead. Moving against the current. Toward us.', 'crew');
    } else if (e.kind === 'spillway') {
      Object.assign(spill, { active: true, s: at, side: random() < 0.5 ? -1 : 1, passed: false });
    } else if (e.kind === 'lifeguard') {
      Object.assign(lifeguard, { active: true, s: at + 25, side: random() < 0.5 ? -1 : 1, violations: 0, stopped: false, gone: false });
      hud.say('MARS', 'Lifeguard chair. Read the sign. Don\'t fire while its lamp is lit.', 'crew');
      // A tempting supply crate right beside the chair.
      const c = caches.find((x) => !x.active);
      if (c) Object.assign(c, { active: true, pos: track.lateral(at + 21, lifeguard.side * (half - 0.4), 2.2), falling: 0, item: 'cell' });
    } else if (e.kind === 'unloading') {
      Object.assign(unloading, { active: true, s: at + 20, said: false });
    } else if (e.kind === 'distantRaft') {
      Object.assign(distant, { active: true, parked: false });
    } else if (e.kind === 'lockerRoom') {
      Object.assign(locker, { active: true, sec, s: at + 30 });
      sec.pass = sec.pass || 1;
    }
  }

  function damage(n, reason, raftHit = 0) {
    events.damage(n, reason);
    if (raftHit) {
      state.raft = Math.max(0, state.raft - raftHit);
      if (state.raft <= 0) events.damage(999, 'The raft came apart under you.');
    }
    shake = 0.5;
  }

  // ---------- Shooting ----------
  function targets() {
    const list = [];
    const T = (pos, r, fn) => list.push({ pos, r, fn });
    for (const b of blooms) if (b.active && !b.dying) T(b.pos, 0.75, () => {
      b.hp -= state.damage;
      sound.hit();
      hud.hitmarker();
      if (b.hp <= 0) {
        b.dying = 0.001;
        sound.burst();
        events.score(100, 'ENTITY DISPERSED');
        events.cleared();
        ripple = [...b.pos];
        rippleTime = time;
      }
    });
    for (const g of signals) if (g.active && !g.used) T(g.pos, 0.85, () => {
      g.used = 0.001;
      sound.heal();
      events.heal(16);
      events.score(50, 'SIGNAL · VITALS RESTORED');
      state.drift = Math.max(0, state.drift - 20);
    });
    for (const r of ropes) if (r.active) for (const f of r.floats) if (f.alive) T(f.pos, 0.45, () => {
      f.alive = false;
      sound.burst();
      hud.hitmarker();
      if (r.floats.every((x) => !x.alive)) {
        events.score(150, 'LANE ROPE CUT');
        r.active = false;
        events.cleared();
      }
    });
    if (valve.active && !valve.turned) {
      if (valve.covered > 0) T(valve.pos, 0.8, () => {
        valve.covered -= 1;
        hud.hitmarker();
        sound.splash();
        if (!valve.covered) hud.toast('GROUT CLEARED');
      });
      else T(valve.pos, 0.75, () => {
        valve.hits += 1;
        hud.hitmarker();
        sound.hit();
        if (valve.hits >= 3) {
          valve.turned = 0.001;
          (state.drained ||= {})[state.sectorKey] = true;
          sound.gurgle();
          events.score(150, 'VALVE OPENED · PASSAGE DRAINING');
          hud.caption('[water draining somewhere below — ahead]');
        }
      });
    }
    if (breaker.active && !breaker.sec.lit) T(breaker.pos, 0.6, () => {
      breaker.sec.lit = true;
      sound.gate();
      hud.toast('BREAKER THROWN · TUBE LIGHTS ON');
      // Lights need pumps. Pumps move water. Something moves with the water.
      sound.pump();
      hud.caption('[pumps starting up — ahead]');
      const u = patches.find((x) => !x.active);
      if (u) Object.assign(u, { active: true, s: s + 45, offset: 0, hp: 5, grabbed: false, warned: false });
    });
    if (linked.active) for (const r of linked.rings) if (!r.hit) T(r.pos, 0.55, () => {
      if (r.number === linked.next) {
        r.hit = true;
        linked.next += 1;
        sound.hit();
        hud.hitmarker();
        if (linked.next > 3) {
          linked.active = false;
          sound.gate();
          give('cell');
          hud.toast('SEQUENCE ACCEPTED · MAINTENANCE SHORTCUT OPEN');
          for (const enc of track.encounters) if (!enc.e.done && enc.s > s && enc.s < s + 160 && ['rope', 'undertow', 'blooms'].includes(enc.e.kind)) enc.e.done = true;
        }
      } else {
        linked.next = 1;
        linked.rings.forEach((x) => (x.hit = false));
        linked.flash = 0.5;
        sound.wrong();
        hud.toast('WRONG ORDER · SEQUENCE RESET');
      }
    });
    for (const a of anomalies) if (a.active && a.visible) T(a.pos, 0.6, () => {
      a.active = false;
      hud.hitmarker();
      if (a.outcome === 'cache') give(random() < 0.5 ? 'cell' : 'parts');
      else if (a.outcome === 'passenger') {
        passengerStep(1);
        state.drift = Math.min(100, state.drift + 10);
        hud.caption('[something climbs aboard — behind you]');
      } else {
        sound.burst();
        for (let k = 0; k < 3; k++) spawnBloom(s + 10 + k * 2, (random() - 0.5) * 3, 1 + random() * 2);
        hud.caption('[it splits open — ahead]');
      }
    });
    for (const c of caches) if (c.active && !c.falling) T(c.pos, 0.6, () => {
      c.falling = 0.001;
      sound.splash();
      hud.toast('SUPPLIES DRIFTING TOWARD THE RAFT');
    });
    if (lifeguard.active && !lifeguard.stopped && lifeguard.breakerPos) T(lifeguard.breakerPos, 0.5, () => {
      if (lifeguard.lampOn) return; // the shot itself already broke the rule (see shoot)
      lifeguard.stopped = true;
      sound.gate();
      hud.toast('LAMP BREAKER CUT · CYCLE STOPPED');
    });
    if (locker.active && locker.pumpPos) T(locker.pumpPos, 0.6, () => {
      if (locker.lightOn) {
        locker.sec.solved = true;
        locker.active = false;
        sound.gate();
        hud.toast('THE LOOP BREAKS');
        hud.caption('[the pump coughs and stops — left]');
      } else {
        sound.wrong();
        hud.caption('[the pump stutters — nothing changes]');
      }
    });
    const r = track.nextRoom(s - 2);
    if (r && r.sec.type === 'pool' && s > r.s0 - 70) {
      const F = roomFrame(r);
      r.sec.exits.forEach((ex, i) => T(F.at(r.sec.length - 0.4, ex.side * EXIT_OFFSET, r.sec.height - 1.4), 0.75, () => switchGate(r, i)));
    }
    return list;
  }

  function switchGate(r, i) {
    const ex = r.sec.exits[i];
    if (s > r.s0 + r.sec.length * 0.5) {
      sound.wrong();
      hud.toast('GATE MECHANISM COMMITTED');
      return;
    }
    if (ex.locked && !powered()) {
      sound.wrong();
      hud.toast('SERVICE GATE LOCKED · NO POWER');
      return;
    }
    if (track.choose(r.sec.id, i)) {
      sound.gate();
      hud.toast(`GATE OPEN · ${ex.label}`);
    }
  }

  function shoot(eye, dir) {
    let best = 60, hit = null;
    for (const t of targets()) {
      const d = raySphere(eye, dir, t.pos, t.r);
      if (d < best) { best = d; hit = t.fn; }
    }
    for (const u of patches) if (u.active) {
      const t = rayPlaneY(eye, dir, track.at(u.s).p[1] + 0.02);
      if (t < best) {
        const p = add(eye, scale(dir, t));
        const c = track.lateral(u.s, u.offset, 0);
        if (Math.hypot(p[0] - c[0], p[2] - c[2]) < 1.6) {
          best = t;
          hit = () => {
            u.hp -= state.damage;
            hud.hitmarker();
            sound.hit();
            ripple = c;
            rippleTime = time;
            if (u.hp <= 0) {
              u.active = false;
              sound.splash();
              events.score(180, 'UNDERTOW DISPERSED');
              events.cleared();
              held = 0;
            }
          };
        }
      }
    }
    const tw = rayPlaneY(eye, dir, track.at(s).p[1]);
    if (tw < best) { best = tw; hit = () => { ripple = add(eye, scale(dir, tw)); rippleTime = time; }; }
    hit?.();
    if (lifeguard.active && lifeguard.lampOn && !lifeguard.gone && Math.abs(lifeguard.s - s) < 55) violate();
    return add(eye, scale(dir, best));
  }

  function violate() {
    lifeguard.violations += 1;
    const info = soundDir(fx.eye, fx.fwd, track.lateral(lifeguard.s, lifeguard.side * 2, 4));
    sound.whistle(info.pan);
    hud.caption(`[whistle — ${info.label}]`);
    if (lifeguard.violations === 1) {
      hud.say('THE LIFEGUARD', '— one long whistle —', 'attendant');
      state.drift = Math.min(100, state.drift + 10);
      for (let k = 0; k < 4; k++) spawnBloom(s + 14 + k * 2.5, (random() - 0.5) * 4, 0.8 + random() * 2);
    } else if (!lifeguard.gone) {
      lifeguard.gone = true;
      hud.say('JUNE', 'It got down off the chair. It\'s in the water. It\'s in the water!', 'crew');
      state.drift = Math.min(100, state.drift + 15);
      Object.assign(wake, { active: true, phase: 'pursue', dist: 22, thumpTimer: 0, stun: 0 });
    }
  }

  // ---------- The Passenger ----------
  const passengerOn = sector.index >= 2;
  state.passenger ||= { stage: 0, t: 0 };
  function passengerStep(n) {
    const p = state.passenger;
    const before = p.stage;
    p.stage = clamp(p.stage + n, 0, 5);
    p.t = 0;
    if (p.stage > before) {
      const lines = ['', '[the opposite cushion dips]', '[water dripping onto the empty seat]', '[the restraint clicks shut]', '[a reflection in the water — someone sitting with you]', '[the raft lists to one side]'];
      hud.caption(lines[p.stage]);
      if (p.stage === 5) hud.say('MARS', 'The raft\'s heavy on one side. There\'s nobody there. There\'s nobody there.', 'crew');
    } else if (p.stage < before) hud.caption('[the seat rises again]');
  }

  // ---------- Frame ----------
  function update(dt) {
    time += dt;
    frameDt = dt;
    hud.update(dt);
    state.mounted = true;

    const sec = track.sectionAt(s).sec;
    const curRoom = track.roomAt(s);
    if (sec !== lastSec) {
      lastSec = sec;
      sound.setMuffle(!!sec.muffle);
      if (sec.type === 'lift') hud.say('TUBS', 'Lift. We can\'t get off. Don\'t look in the windows.', 'crew');
      if (sec.type === 'tube' && sec.muffle) hud.caption('[pressure tube — sound goes dull]');
    }

    // Speed
    let target = sec.type === 'pool' ? 3.2 : sec.speed;
    const boosting = isDown('shift') && !['lift', 'pool', 'bay'].includes(sec.type);
    const braking = (isDown('s') || isDown('arrowdown')) && !!sec.brake;
    if (boosting) target *= 1.6;
    if (braking) target *= 0.38;
    if (state.raft < 40) target *= 0.85;
    if (held > 0) target *= 0.3;
    held = Math.max(0, held - dt);
    holding = null;
    if (curRoom && curRoom.sec.type === 'pool' && (curRoom.sec.holding || state.upgrades.includes('tether')) && !departed.has(curRoom.sec.id)) {
      const left = stopOf(curRoom) - s;
      target = Math.max(0, Math.min(target || 3, left * 0.8));
      if (left < 0.25) holding = curRoom;
    }
    if (curRoom && curRoom.sec.type === 'bay') {
      const left = curRoom.s1 - 5 - s;
      target = Math.max(0, Math.min(3, left * 0.8));
      if (left < 0.25) finished = true;
    }
    speed = damp(speed, target, 2.5, dt);
    s = Math.min(track.length - 0.5, s + speed * dt);

    // Dodge, or look around while held in a pool.
    const steer = (isDown('a') || isDown('arrowleft') ? -1 : 0) + (isDown('d') || isDown('arrowright') ? 1 : 0) + input.move[0];
    if (holding) {
      viewYaw = clamp(viewYaw - steer * dt * 1.6, -1.2, 1.2);
      offset = damp(offset, 0, 3, dt);
    } else {
      viewYaw = damp(viewYaw, 0, 3, dt);
      const list = state.passenger.stage >= 5 ? 0.6 : 0;
      offset = damp(offset, clamp(steer, -1, 1) * sec.half * 0.5 + list, 6, dt);
    }

    // Drift: warm water, calm channels, isolation.
    const driftRate = (0.45 + sector.index * 0.12) * (sec.calm ? 1.3 : 1) * (sec.sky ? 0.5 : 1);
    state.drift = Math.min(100, state.drift + dt * driftRate);
    if (boosting) state.drift = Math.max(0, state.drift - dt * 2);

    // Filters: hazardous channels use them up.
    if (sec.filter || sec.type === 'drop') useFilter(dt);

    // Encounters ahead
    for (const enc of track.encounters) {
      if (enc.e.done) continue;
      const lead = enc.e.kind === 'wake' || enc.e.kind === 'distantRaft' ? 0 : 70;
      if (enc.s <= s + lead) spawn(enc);
      else break;
    }

    // Camera on the rail
    const swayOn = settings.sway ? 1 : 0;
    const bob = (Math.sin(time * 2.1) * 0.05 + Math.sin(time * 1.3) * 0.03) * swayOn;
    shake = Math.max(0, shake - dt);
    const jitter = shake > 0 ? [(Math.random() - 0.5) * shake * 0.3, (Math.random() - 0.5) * shake * 0.3, 0] : [0, 0, 0];
    const eye = add(track.lateral(s, offset, 1.35 + bob), jitter);
    const ahead = track.lateral(s + 10, offset * 0.6, 1.2 + bob * 0.5);
    let look = ahead;
    if (Math.abs(viewYaw) > 0.001) {
      const d = sub(ahead, eye);
      const c = Math.cos(viewYaw), sn = Math.sin(viewYaw);
      look = add(eye, [d[0] * c + d[2] * sn, d[1], -d[0] * sn + d[2] * c]);
    }
    const roll = settings.distortion ? (state.passenger.stage >= 5 ? 0.1 : 0) + (state.raft < 40 ? 0.05 : 0) : 0;
    const fwd = normalize(sub(look, eye));
    const rgt = normalize(cross(fwd, UP));
    const up = normalize(add(UP, scale(rgt, roll)));
    state.cameraUp = up;
    fx.eye = eye; fx.look = look; fx.fwd = fwd;
    const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    let aimNdc = input.touch && !input.firing ? [0, 0] : [...input.aim];
    if (input.touch && input.firing && settings.aimAssist) {
      let bestD = 0.16;
      for (const t of targets()) {
        const p = project(eye, look, FOV, aspect, t.pos, up);
        if (!p) continue;
        const d = Math.hypot(p[0] - aimNdc[0], p[1] - aimNdc[1]);
        if (d < bestD) { bestD = d; aimNdc = [p[0], p[1]]; }
      }
    }
    const aimDir = screenRay(eye, look, FOV, aspect, aimNdc[0], aimNdc[1], up);
    hud.crosshair(aimNdc[0], aimNdc[1], false);

    placeSegments();
    placeRoom(curRoom || track.nextRoom(s - 2));
    placeRaft(dt, fwd, rgt, bob);
    updateEntities(dt, eye, fwd, aimDir);

    // Holding pool decisions
    let prompt = '';
    if (holding) {
      const p = holding.sec;
      const chosen = p.exits[track.choices[p.id] ?? p.defaultExit ?? 0];
      const lines = [];
      if (p.dock) lines.push('E · Moor and explore the dock');
      lines.push(`SPACE · Depart through ${chosen.label.split('·')[0].trim()}`);
      lines.push('Shoot an arrow to switch gates · A/D look');
      prompt = lines.join('   ');
      if (p.dock && !holding.inspected) {
        holding.inspected = true;
        if (state.passenger.stage > 0) {
          hud.say('INSPECTION LAMP', 'RAFT OCCUPANCY: 2. CLEANSING AVAILABLE IN THE SAFE ROOM.', 'attendant');
          revealTimer = 2.5;
        } else hud.caption('[the inspection lamp sweeps the raft — clear]');
      }
      if (p.dock && wasPressed('e')) {
        events.moor({ s, departed: [...departed] });
        return;
      }
      if (wasPressed(' ')) {
        if (chosen.locked && !powered()) {
          sound.wrong();
          hud.toast('THAT GATE IS LOCKED · NO POWER');
        } else {
          departed.add(p.id);
          sound.gate();
          if (chosen.route === 'bypass') hud.say('DEZ', 'Bypass. No Safe Room this time. Hope you\'ve got filters.', 'crew');
        }
      }
    }
    if (finished && curRoom?.sec.type === 'bay') {
      prompt = 'E · Enter the Safe Room';
      if (!curRoom.vent) {
        curRoom.vent = true;
        sound.vent();
        hud.caption('[a steady ventilation tone — ahead. The door is real.]');
      }
      if (wasPressed('e')) {
        state.passenger.stage = 0;
        events.safeRoom();
        return;
      }
    }
    if (sec.type === 'drop' && s >= track.length - 1) {
      events.drop();
      return;
    }
    if (state.filters === 0 && state.filter <= 0 && (sec.filter || sec.type === 'drop')) prompt ||= 'NO FILTER · the chlorine is getting in';

    // Inspection beam
    let scanText = '';
    if (input.scanning) {
      blaster.showScan(true, blaster.muzzle(eye, look, aimDir), add(eye, scale(aimDir, 30)));
      scanText = scanTick(dt, eye, aimDir);
      state.visible = true;
    } else {
      blaster.showScan(false);
      state.visible = false;
      scanTarget = null;
    }
    hud.scan(scanText);

    // Blaster
    if (wasPressed('r')) blaster.recharge();
    if (blaster.trigger(dt, input.firing, true)) {
      const to = shoot(eye, aimDir);
      blaster.showBeam(blaster.muzzle(eye, look, aimDir), to);
    }
    if (wasPressed('f')) burst(eye, aimDir);
    blaster.place(eye, look, aimDir, bob * 0.3);

    voices(dt, sec, curRoom);

    hud.route(routeLines(sec));
    hud.depth(`${(sector.depth + (s / track.length) * 4).toFixed(1)} M · ${Math.round(speed * 3.6)} KM/H${braking ? ' · BRAKING' : ''}`);
    hud.prompt(prompt);

    saveTimer -= dt;
    if (saveTimer <= 0) {
      saveTimer = 3;
      events.position({ mode: 'ride', s: holding ? stopOf(holding) : s, departed: [...departed] });
    }
    events.tick(dt);

    if (quality.skipRender) return;
    renderer.updateParts(parts);
    renderer.render({
      eye, target: look, up, fov: FOV, time,
      waterRipple: ripple, rippleTime: time - rippleTime,
      environment: { pointLights: gatherLights(eye) },
      exposure: (sec.sky ? 0.95 : 1.05) - state.drift * 0.002,
      effects: {
        bloom: { strength: quality.bloom, threshold: 1, radius: 1.3 },
        vignette: settings.distortion ? 0.32 + state.drift * 0.004 : 0.25,
        grain: settings.grain ? 0.035 : 0,
        saturation: 1 - state.drift * 0.006,
        temperature: sector.index === 0 ? 0.08 : -0.04,
      },
    });
  }

  function useFilter(dt) {
    state.filter -= dt * 2.4;
    if (state.filter > 0) return;
    if (state.filters > 1) {
      state.filters -= 1;
      state.filter = 100;
      hud.toast('FILTER SPENT · SWAPPED');
    } else {
      state.filters = 0;
      state.filter = 0;
      events.damage(dt * 2, 'Chlorine fumes. No filter left.', true);
      state.drift = Math.min(100, state.drift + dt);
    }
  }

  function voices(dt, sec, curRoom) {
    nextLine -= dt;
    if (nextLine <= 0) {
      nextLine = 11 + random() * 9;
      if (crewLine < sector.crew.length) {
        const [who, line] = sector.crew[crewLine++];
        state.crewLine = crewLine;
        hud.say(who, line, 'crew');
      } else if (state.drift > 60) hud.say('THE ATTENDANT', pick(AMBIENT.drift), 'drift');
      else if (state.drift > 40) hud.say('THE ATTENDANT', pick(AMBIENT.personal).replace('{name}', state.name).replace('{band}', state.band), 'attendant');
      else if (sector.index > 0 && random() < 0.3) {
        hud.say('???', pick(AMBIENT.marco), 'marco');
        hud.caption(`[a voice calling — ${random() < 0.5 ? 'left' : 'right'} side passage]`);
        state.drift = Math.min(100, state.drift + 4);
      } else hud.say('THE ATTENDANT', pick(AMBIENT.attendant), 'attendant');
    }
    // Brief near-silences in calm water.
    nextSilence -= dt;
    if (nextSilence <= 0 && sec.calm && silence <= 0) {
      silence = 6;
      nextSilence = 50 + random() * 40;
      hud.caption('[the hum stops]');
    }
    silence -= dt;
    sound.setHum(state.drift / 100, silence > 0);
    // Low composure: a figure where there should not be one.
    ghostTimer -= dt;
    if (state.drift > 60 && ghostTimer <= 0 && !curRoom) {
      ghostTimer = 14 + random() * 10;
      ghostShow = 1.3;
      ghostPos = track.lateral(s + 40, (random() - 0.5) * sec.half, 0.9);
    }
  }

  function routeLines(sec) {
    const lines = [`▸ ${sec.label}${sec.brake ? ' · S TO BRAKE' : ''}${sec.filter ? ' · USES FILTER' : ''}`];
    const next = track.nextRoom(s - 1);
    if (next && next.s1 > s) {
      const d = Math.max(0, Math.round(next.s0 - s));
      if (next.sec.type === 'pool') {
        const chosen = track.choices[next.sec.id] ?? next.sec.defaultExit ?? 0;
        lines.push(`${next.sec.dock ? 'HOLDING POOL · DOCK' : 'JUNCTION'} ${d ? `IN ${d} M` : 'HERE'}`);
        next.sec.exits.forEach((ex, i) => lines.push(`${i === chosen ? '●' : '○'} ${ex.side < 0 ? '◀' : '▶'} ${ex.label}${ex.locked && !powered() ? ' · LOCKED' : ''}`));
        if (state.upgrades.includes('headlamp')) lines.push(`  ${next.sec.exits[chosen].note}`);
      } else if (next.sec.type === 'bay') lines.push(`SAFE ROOM ARRIVAL BAY ${d ? `IN ${d} M` : 'HERE'}`);
      else if (next.sec.type === 'drop') lines.push(`SPILLWAY DROP IN ${d} M · NO CHECKPOINT`);
    }
    if (state.upgrades.includes('depth')) lines.push(`DEPTH SENSOR: ${sec.shallow ? 'SHALLOW · SAFE' : sec.type === 'tube' || sec.type === 'overflow' ? 'DEEP · CONNECTED · DANGER' : 'DEEP'}`);
    return lines;
  }

  function scanTick(dt, eye, dir) {
    const lens = state.upgrades.includes('lens');
    const cone = lens ? 0.14 : 0.08;
    const range = lens ? 90 : 45;
    const cands = [];
    for (const a of anomalies) if (a.active) cands.push({ obj: a, pos: a.pos, need: 0.8, done: (o) => `ANOMALY · READING: ${o.outcome === 'cache' ? 'INERT' : 'WARM'}`, label: 'UNIDENTIFIED OBJECT' });
    if (linked.active) cands.push({ obj: linked, pos: linked.sensorPos, need: 1.2, done: () => { linked.read = 1; return 'SENSOR READ · SEQUENCE SHOWN'; }, label: 'MAINTENANCE SENSOR' });
    if (valve.active) cands.push({ obj: valve, pos: valve.pos, need: 0.3, done: () => (valve.covered ? 'GROUT · CLEAR IT FIRST' : `DRAIN VALVE · ${Math.max(0, 3 - valve.hits)} HITS`), label: 'VALVE' });
    if (lifeguard.active && !lifeguard.gone) cands.push({ obj: lifeguard, pos: lifeguard.breakerPos || [0, -999, 0], need: 0.4, done: () => 'LAMP BREAKER · SHOOT WHILE THE LAMP IS DARK', label: 'LIFEGUARD CHAIR' });
    if (locker.active && locker.pumpPos) cands.push({ obj: locker, pos: locker.pumpPos, need: 0.5, done: () => 'PUMP RING · THE SAME ON EVERY PASS', label: 'PUMP' });
    if (raftSeat) cands.push({ obj: state.passenger, pos: raftSeat, need: 1, done: (o) => { revealTimer = 2; return o.stage > 0 ? `SEAT OCCUPIED · STAGE ${o.stage}` : 'SEAT EMPTY'; }, label: 'OPPOSITE SEAT' });
    let best = null, bestA = cone;
    for (const c of cands) {
      if (distance(eye, c.pos) > range) continue;
      const a = angleTo(eye, dir, c.pos);
      if (a < bestA) { bestA = a; best = c; }
    }
    if (!best) { scanTarget = null; return 'SCANNING…'; }
    if (!scanTarget || scanTarget.obj !== best.obj) scanTarget = { obj: best.obj, t: 0 };
    scanTarget.t += dt;
    if (scanTarget.t >= best.need) return best.done(best.obj);
    return `${best.label} · ${Math.round((scanTarget.t / best.need) * 100)}%`;
  }

  function burst(eye, dir) {
    if (!blaster.burst(eye)) {
      hud.toast('NO CHARGE CELLS');
      return;
    }
    hud.caption('[disruption burst]');
    if (lifeguard.active && Math.abs(lifeguard.s - s) < 55) {
      if (lifeguard.lampOn && !lifeguard.stopped) violate();
      lifeguard.stopped = true;
    }
    for (const b of blooms) if (b.active && !b.dying && distance(b.pos, eye) < 14) { b.dying = 0.001; events.cleared(); }
    for (const u of patches) if (u.active && Math.abs(u.s - s) < 18) { u.active = false; held = 0; }
    if (wake.active) { wake.phase = 'pursue'; wake.dist = 45; wake.stun = 6; hud.caption('[the wake falls back — behind]'); }
    if (state.passenger.stage > 0) passengerStep(-2);
    if (valve.covered) valve.covered = 0;
    // Emergency override: a burst at a locked gate forces it open.
    if (holding) {
      const p = holding.sec;
      const F = roomFrame(holding);
      p.exits.forEach((ex, i) => {
        if (!ex.locked || powered()) return;
        if (raySphere(eye, dir, F.at(p.length, ex.side * EXIT_OFFSET, 2), 2.4) < 60) {
          (state.power ||= {})[state.sectorKey] = 'forced';
          track.choose(p.id, i);
          sound.gate();
          hud.toast('EMERGENCY OVERRIDE · SERVICE GATE FORCED');
          hud.say('DEZ', 'That\'ll do it. Loud, though. Everything heard that.', 'crew');
        }
      });
    }
  }

  function placeRaft(dt, fwd, rgt, bob) {
    const base = add(track.lateral(s + 0.85, offset, 0.08), [0, bob * 0.5, 0]);
    const upV = cross(rgt, fwd);
    const list = state.passenger.stage >= 5 ? 0.12 : 0;
    const tiltUp = normalize(add(upV, scale(rgt, list)));
    writeBasis(raft.lip.matrix, base, rgt, fwd, tiltUp, 1.05, 1.05, 1);
    const seatPos = add(add(base, scale(fwd, 0.82)), scale(tiltUp, 0.1));
    raftSeat = add(seatPos, [0, 0.2, 0]);
    const dip = state.passenger.stage >= 1 ? 0.62 : 1;
    writeBasis(raft.seat.matrix, add(seatPos, scale(tiltUp, 0.12 - 0.08 * (1 - dip))), rgt, tiltUp, fwd, 0.7, 0.3 * dip, 0.28);
    if (state.passenger.stage >= 3) writeBasis(raft.strap.matrix, add(seatPos, scale(tiltUp, 0.22 * dip)), rgt, tiltUp, fwd, 0.95, 0.04, 0.06);
    else writeBasis(raft.strap.matrix, add(add(seatPos, scale(rgt, 0.5)), scale(tiltUp, 0.3)), rgt, tiltUp, fwd, 0.05, 0.5, 0.06);
    writeBasis(raft.panel.matrix, add(add(base, scale(rgt, -0.8)), scale(fwd, 0.35)), rgt, tiltUp, fwd, 0.22, 0.12, 0.3);
    raft.panel.material.emission = 0.4 + state.upgrades.length * 0.25;
    raft.patches.forEach((p, i) => {
      if (i < (state.patches || 0)) writeBasis(p.matrix, add(add(base, scale(rgt, (i - 1) * 0.6)), add(scale(fwd, 0.9 - Math.abs(i - 1) * 0.25), scale(tiltUp, 0.3))), rgt, tiltUp, fwd, 0.22, 0.05, 0.16);
      else hide(p);
    });
    if (state.upgrades.includes('headlamp')) writeBasis(raft.headlamp.matrix, add(add(base, scale(fwd, 1.15)), scale(tiltUp, 0.35)), rgt, tiltUp, fwd, 0.18, 0.08, 0.06);
    else hide(raft.headlamp);
    const st = state.passenger.stage;
    passenger.drips.forEach((d, i) => {
      if (st >= 2) {
        const t = (time * 0.9 + i / 3) % 1;
        writeYaw(d.matrix, add(seatPos, [Math.sin(i * 2.1) * 0.2, 1.1 - t * 0.9, Math.cos(i * 1.7) * 0.05]), 0, 0.025, 0.035, 0.025);
      } else hide(d);
    });
    if (st >= 4 && Math.sin(time * 0.9) > 0.75) writeBasis(passenger.reflection.matrix, track.lateral(s + 3.2, offset, 0.015), rgt, UP, fwd, 0.5, 0.01, 1.3);
    else hide(passenger.reflection);
    revealTimer -= dt;
    if (st > 0 && revealTimer > 0) {
      writeBasis(passenger.body.matrix, add(seatPos, scale(tiltUp, 0.55)), rgt, tiltUp, fwd, 0.22, 0.75, 0.16);
      writeBasis(passenger.head.matrix, add(seatPos, scale(tiltUp, 1.05)), rgt, tiltUp, fwd, 0.13, 0.16, 0.13);
    } else {
      hide(passenger.body);
      hide(passenger.head);
    }
  }

  // ---------- Geometry placement ----------
  const hash = (n) => {
    const x = Math.sin(n * 127.1 + sector.index * 311.7) * 43758.5453;
    return x - Math.floor(x);
  };

  function segBasis(at) {
    const a = track.at(at);
    const cp = Math.cos(a.pitch);
    const z = [Math.sin(a.yaw) * cp, Math.sin(a.pitch), Math.cos(a.yaw) * cp];
    const xL = [Math.cos(a.yaw), 0, -Math.sin(a.yaw)];
    const y = normalize(cross(z, xL));
    return { a, z, xL, y, right: [-xL[0], 0, -xL[2]] };
  }

  const SEG_KEYS = ['left', 'right', 'ceiling', 'floor', 'water', 'belt', 'lamp', 'rib', 'winL', 'winR', 'figure', 'debris'];
  function placeSegments() {
    for (const seg of segments) {
      while (seg.s + SEG < s - SEG) seg.s += SEGMENTS * SEG;
      const mid = seg.s + SEG / 2;
      const r = track.roomAt(mid, 1);
      seg.lampPos = null;
      seg.flickerDark = false;
      if (mid > track.length + 2 || (r && r.sec.type !== 'drop')) {
        for (const k of SEG_KEYS) hide(seg[k]);
        continue;
      }
      const sec = track.sectionAt(mid).sec;
      const B = segBasis(mid);
      const put = (part, right, up, sx, sy, sz) => writeBasis(part.matrix, add(add(B.a.p, scale(B.right, right)), scale(B.y, up)), B.xL, B.y, B.z, sx, sy, sz);
      const half = sec.half, H = sec.sky ? 1.6 : sec.height;
      const n = Math.floor(seg.s / SEG);
      const L = SEG + 0.9;
      put(seg.left, -(half + 0.3), H / 2 - 0.6, 0.6, H + 1.2, L);
      put(seg.right, half + 0.3, H / 2 - 0.6, 0.6, H + 1.2, L);
      if (sec.sky) hide(seg.ceiling);
      else put(seg.ceiling, 0, H + 0.3, half * 2 + 1.8, 0.6, L);
      put(seg.floor, 0, sec.shallow ? -0.75 : -0.9, half * 2 + 1.2, 0.6, L);
      if (sec.belt) {
        hide(seg.water);
        put(seg.belt, 0, -0.06, half * 2 - 0.3, 0.1, L);
      } else {
        hide(seg.belt);
        put(seg.water, 0, sec.shallow ? -0.32 : -0.01, half * 2 + 0.2, 0.02, L);
      }
      const lampOn = sec.sky ? false : sec.lamps === 'bright' ? true : sec.lamps === 'normal' || sec.lamps === 'flicker' ? n % 2 === 0 : sec.lamps === 'sparse' ? n % 3 === 0 : !!sec.lit && n % 2 === 0;
      if (lampOn) {
        put(seg.lamp, 0, H - 0.02, 1.5, 0.06, 0.5);
        const f = hash(n);
        const flick = sec.lamps === 'flicker' ? (Math.sin(time * 23 + f * 70) > 0.2 ? 0.1 : 1) : f > 0.85 ? (Math.sin(time * 37 + f * 90) > 0.6 ? 0.15 : 1) : 1;
        seg.lamp.material.emission = 9 * flick;
        seg.flickerDark = flick < 0.5;
        seg.lampPos = add(B.a.p, scale(B.y, H - 0.4));
      } else {
        hide(seg.lamp);
        seg.flickerDark = !sec.sky;
      }
      if (sec.ribs) writeBasis(seg.rib.matrix, add(B.a.p, scale(B.y, H / 2 - 0.4)), B.xL, B.y, B.z, half + 0.15, H / 2 + 0.55, 1);
      else hide(seg.rib);
      if (sec.windows && n % 2 === 0) {
        put(seg.winL, -(half - 0.02), 1.9, 0.05, 1.5, 2.4);
        put(seg.winR, half - 0.02, 1.9, 0.05, 1.5, 2.4);
        // Someone is standing in most of them.
        if (hash(n + 0.5) < 0.7) put(seg.figure, (hash(n + 0.2) < 0.5 ? -1 : 1) * (half - 0.07), 1.75, 0.04, 1.15, 0.38);
        else hide(seg.figure);
      } else {
        hide(seg.winL); hide(seg.winR); hide(seg.figure);
      }
      if (sec.debris && hash(n + 0.7) < 0.5) put(seg.debris, (hash(n + 0.9) - 0.5) * half * 1.4, -0.2, 0.8 + hash(n) * 0.8, 0.5, 1.2);
      else hide(seg.debris);
    }
    // The spillway drop ends in nothing.
    const last = track.ranges[track.ranges.length - 1];
    if (last.sec.type === 'drop' && s > last.s0 - 80) {
      const B = segBasis(track.length - 1);
      writeBasis(voidWall.matrix, add(B.a.p, scale(B.y, 1.5)), B.xL, B.y, B.z, last.sec.half * 2 + 1, 5, 0.3);
    } else hide(voidWall);
  }

  const roomParts = () => [room.floor, room.water, room.ceiling, room.wallL, room.wallR, room.back1, room.back2, room.front1, room.front2, room.front3, ...room.lamps, ...room.gates, ...room.arrows.flatMap((a) => [a.shaft, a.headA, a.headB]), ...room.stub.flatMap((x) => [x.left, x.right, x.ceiling, x.water]), room.platform, room.tether, room.beacon, room.lampPost, room.figure, room.door, room.doorFrame];
  function placeRoom(r) {
    for (const set of roomSigns.values()) {
      for (const ex of set.exits || []) hide(ex);
      if (set.info) hide(set.info);
    }
    if (!r || r.sec.type === 'drop' || s < r.s0 - 140) {
      for (const p of roomParts()) hide(p);
      return;
    }
    const p = r.sec;
    const F = roomFrame(r);
    const L = p.length, Hf = p.half, Ht = p.sky ? 1.8 : p.height;
    const put = (part, u, v, h, sx, sy, sz) => writeYaw(part.matrix, F.at(u, v, h), r.yaw, sx, sy, sz);
    put(room.floor, L / 2, 0, -0.9, Hf * 2 + 1.2, 0.6, L + 6);
    put(room.water, L / 2, 0, -0.01, Hf * 2, 0.02, L + 6);
    if (p.sky) hide(room.ceiling);
    else put(room.ceiling, L / 2, 0, Ht + 0.3, Hf * 2 + 1.8, 0.6, L + 6);
    put(room.wallL, L / 2, -(Hf + 0.3), Ht / 2 - 0.6, 0.6, Ht + 1.2, L + 6);
    put(room.wallR, L / 2, Hf + 0.3, Ht / 2 - 0.6, 0.6, Ht + 1.2, L + 6);
    const inHalf = track.sectionAt(r.s0 - 1).sec.half;
    const backW = Math.max(0.1, Hf - inHalf - 0.6);
    put(room.back1, -0.3, -(inHalf + 0.6 + backW / 2), Ht / 2 - 0.6, backW, Ht + 1.2, 0.6);
    put(room.back2, -0.3, inHalf + 0.6 + backW / 2, Ht / 2 - 0.6, backW, Ht + 1.2, 0.6);
    room.lamps.forEach((lamp, i) => (p.sky ? hide(lamp) : put(lamp, L * (0.2 + i * 0.2), (i % 2 ? 1 : -1) * Hf * 0.4, Ht - 0.02, 1.6, 0.06, 0.6)));
    const signs = roomSigns.get(p.id) || {};
    const toRaft = scale(F.dir, -1);
    if (p.type === 'pool') {
      const chosen = track.choices[p.id] ?? p.defaultExit ?? 0;
      const exitHalf = p.exits.map((ex) => Math.min(ex.sections[0]?.half ?? 2.6, 2.6));
      const hl = exitHalf[p.exits.findIndex((ex) => ex.side < 0)], hr = exitHalf[p.exits.findIndex((ex) => ex.side > 0)];
      const outerL = Hf - EXIT_OFFSET - hl - 0.6, outerR = Hf - EXIT_OFFSET - hr - 0.6;
      const midL = -EXIT_OFFSET + hl + 0.6, midR = EXIT_OFFSET - hr - 0.6;
      if (outerL > 0.05) put(room.front1, L + 0.3, -(Hf - outerL / 2), Ht / 2 - 0.6, outerL, Ht + 1.2, 0.6); else hide(room.front1);
      if (midR - midL > 0.05) put(room.front2, L + 0.3, (midL + midR) / 2, Ht / 2 - 0.6, midR - midL, Ht + 1.2, 0.6); else hide(room.front2);
      if (outerR > 0.05) put(room.front3, L + 0.3, Hf - outerR / 2, Ht / 2 - 0.6, outerR, Ht + 1.2, 0.6); else hide(room.front3);
      p.exits.forEach((ex, i) => {
        ex.gate = damp(ex.gate ?? 0, i === chosen ? 1 : 0, 2.5, frameDt);
        put(room.gates[i], L + 0.1, ex.side * EXIT_OFFSET, Ht / 2 + ex.gate * (Ht - 0.4), exitHalf[i] * 2 + 0.4, Ht, 0.25);
        const a = room.arrows[i];
        const center = F.at(L - 0.4, ex.side * EXIT_OFFSET, Ht - 1.4);
        const locked = ex.locked && !powered();
        const col = locked ? [1, 0.15, 0.08] : i === chosen ? [0.4, 1, 0.5] : [1, 0.7, 0.2];
        for (const part of [a.shaft, a.headA, a.headB]) {
          part.material.color = col;
          part.material.emissiveColor = col;
          part.material.emission = 2.5 + Math.sin(time * 4) * 0.6;
        }
        const side = F.right;
        writeBasis(a.shaft.matrix, add(center, [0, 0.25, 0]), side, UP, toRaft, 0.14, 0.7, 0.08);
        const diagA = normalize(add(side, UP)), diagB = normalize(sub(UP, side));
        writeBasis(a.headA.matrix, add(center, add(scale(side, 0.14), [0, -0.18, 0])), cross(diagA, toRaft), diagA, toRaft, 0.12, 0.5, 0.08);
        writeBasis(a.headB.matrix, add(center, add(scale(side, -0.14), [0, -0.18, 0])), cross(diagB, toRaft), diagB, toRaft, 0.12, 0.5, 0.08);
        if (signs.exits?.[i]) facing(signs.exits[i], F.at(L - 0.05, ex.side * EXIT_OFFSET, Ht - 2.7), toRaft, 3.2, 1);
      });
      const other = p.exits.find((_, i) => i !== chosen);
      room.stub.forEach((st, k) => {
        if (!other) { hide(st.left); hide(st.right); hide(st.ceiling); hide(st.water); return; }
        const u = L + 3 + k * 6, v = other.side * EXIT_OFFSET, h2 = 2.6;
        put(st.left, u, v - h2 - 0.3, Ht / 2 - 0.6, 0.6, Ht + 1.2, 6.4);
        put(st.right, u, v + h2 + 0.3, Ht / 2 - 0.6, 0.6, Ht + 1.2, 6.4);
        if (p.sky) hide(st.ceiling); else put(st.ceiling, u, v, Ht + 0.3, h2 * 2 + 1.2, 0.6, 6.4);
        put(st.water, u, v, -0.01, h2 * 2, 0.02, 6.4);
      });
      hide(room.door); hide(room.doorFrame);
      if (p.dock) {
        put(room.platform, L * 0.45, -(Hf - 1.3), 0.25, 2.4, 0.5, 12);
        writeYaw(room.tether.matrix, F.at(L * 0.42, -(Hf - 2.3), 0.9), r.yaw, 0.08, 1.2, 0.08);
        put(room.beacon, L * 0.7, -(Hf - 0.6), Ht - 1.2, 0.35, 0.35, 0.35);
        room.beacon.material.emission = 4 + Math.sin(time * 5) * 3;
        put(room.lampPost, L * 0.3, -(Hf - 0.6), 3.2, 0.25, 0.25, 0.25);
        if (p.dock.figure) put(room.figure, L * 0.55, -(Hf - 1.0), 1.3, 0.18, 1.1, 0.14); else hide(room.figure);
        if (signs.info) facing(signs.info, F.at(L * 0.45, -(Hf - 0.02), 3.3), F.right, 4, 1.5);
      } else for (const x of [room.platform, room.tether, room.beacon, room.lampPost, room.figure]) hide(x);
    } else {
      // Arrival bay: a pressure door, a beacon, a terminal. The real thing.
      put(room.front1, L + 0.3, -(Hf / 2 + 0.8), Ht / 2 - 0.6, Hf - 1.6, Ht + 1.2, 0.6);
      put(room.front3, L + 0.3, Hf / 2 + 0.8, Ht / 2 - 0.6, Hf - 1.6, Ht + 1.2, 0.6);
      put(room.front2, L + 0.3, 0, Ht - 0.6, 3.2, 2.4, 0.6);
      put(room.door, L + 0.1, 0, 1.4, 2.8, 3.2, 0.35);
      put(room.doorFrame, L + 0.2, 0, 1.5, 3.3, 3.6, 0.3);
      put(room.beacon, L - 0.2, 0, 3.6, 0.35, 0.35, 0.35);
      room.beacon.material.emission = 5 + Math.sin(time * 3) * 2;
      put(room.platform, L - 2.5, 0, 0.2, 4, 0.4, 4);
      if (signs.info) facing(signs.info, F.at(L - 0.1, -(Hf / 2 + 0.8), 2.6), toRaft, 3.4, 1.3);
      for (const x of [...room.gates, ...room.arrows.flatMap((a) => [a.shaft, a.headA, a.headB]), ...room.stub.flatMap((x) => [x.left, x.right, x.ceiling, x.water]), room.tether, room.lampPost, room.figure]) hide(x);
    }
  }

  function gatherLights(eye) {
    const lights = [];
    for (const seg of segments) if (seg.lampPos) lights.push({ position: seg.lampPos, color: lampColor, intensity: 7 * (seg.lamp.material.emission / 9), radius: 0.4, range: 16, d: distance(seg.lampPos, eye) });
    const r = track.nextRoom(s - 2);
    if (r && r.sec.type !== 'drop' && !r.sec.sky && s > r.s0 - 60) {
      const F = roomFrame(r);
      for (let i = 0; i < 2; i++) {
        const pos = F.at(r.sec.length * (0.3 + i * 0.4), 0, r.sec.height - 0.6);
        lights.push({ position: pos, color: lampColor, intensity: 12, radius: 0.5, range: 26, d: distance(pos, eye) });
      }
    }
    if (lifeguard.active && lifeguard.lampOn) {
      const pos = track.lateral(lifeguard.s, lifeguard.side * 2, 5);
      lights.push({ position: pos, color: [1, 0.25, 0.12], intensity: 8, radius: 0.3, range: 18, d: distance(pos, eye) - 50 });
    }
    lights.sort((a, b) => a.d - b.d);
    const out = lights.slice(0, quality.lights).map(({ d, ...l }) => l);
    if (state.upgrades.includes('headlamp')) out.push({ position: track.lateral(s + 3, offset, 1.2), color: [1, 0.95, 0.85], intensity: 6, radius: 0.3, range: 22 });
    return out;
  }

  // ---------- Entities per frame ----------
  function updateEntities(dt, eye, fwd, aimDir) {
    const behind = (p) => {
      const d = sub(p, eye);
      return d[0] * fwd[0] + d[2] * fwd[2] < -3;
    };
    const closeRate = state.visible ? 1.35 : 1;
    for (const b of blooms) {
      if (!b.active) { hide(b.core); hide(b.spikes); continue; }
      if (b.dying) {
        b.dying += dt;
        const k = 1 + b.dying * 6;
        writeYaw(b.core.matrix, b.pos, 0, 0.45 * k, 0.45 * k, 0.45 * k);
        b.core.material.emission = Math.max(0.02, 6 - b.dying * 30);
        hide(b.spikes);
        if (b.dying > 0.18) b.active = false;
        continue;
      }
      const toCam = sub(eye, b.pos);
      const d = Math.hypot(...toCam);
      const closing = d < 22 ? (2.2 + sector.index * 0.3) * closeRate : 0;
      b.pos = add(b.pos, add(scale(normalize(toCam), closing * dt), scale(b.drift, dt)));
      b.phase += dt * 3;
      const pulse = 0.45 + Math.sin(b.phase) * 0.05;
      writeYaw(b.core.matrix, [b.pos[0], b.pos[1] + Math.sin(b.phase * 0.7) * 0.15, b.pos[2]], b.phase * 0.4, pulse, pulse * 0.92, pulse);
      writeYaw(b.spikes.matrix, b.pos, b.phase, pulse * 2.3, 0.07, 0.07);
      b.core.material.emission = 1.6 + Math.sin(b.phase * 2) * 0.8;
      if (d < 1.1) {
        b.active = false;
        sound.burst();
        damage(12, 'A Bloom burst against you.', 3);
      } else if (behind(b.pos)) b.active = false;
    }
    for (const g of signals) {
      if (!g.active) { hide(g.ring); continue; }
      if (g.used) {
        g.used += dt;
        g.ring.material.emission = Math.max(0.02, 8 - g.used * 20);
        if (g.used > 0.4) g.active = false;
      } else g.ring.material.emission = 2.6 + Math.sin(time * 4) * 0.8;
      writeYaw(g.ring.matrix, g.pos, g.yaw, 0.55, 0.55, 0.55);
      if (behind(g.pos)) g.active = false;
    }
    for (const r of ropes) {
      if (!r.active) { hide(r.line); r.floats.forEach((f) => hide(f.part)); continue; }
      writeYaw(r.line.matrix, track.lateral(r.s, 0, 1.25), track.at(r.s).yaw + Math.PI / 2, 0.04, 0.04, track.sectionAt(r.s).sec.half * 2);
      r.floats.forEach((f, j) => (f.alive ? writeYaw(f.part.matrix, add(f.pos, [0, Math.sin(time * 3 + j) * 0.08, 0]), 0, 0.32, 0.26, 0.32) : hide(f.part)));
      if (r.s < s + 0.5) {
        r.active = false;
        sound.splash();
        damage(18, 'The Lane Rope dragged you through the water.', 12);
        state.drift = Math.min(100, state.drift + 12);
      }
    }
    for (const u of patches) {
      if (!u.active) { hide(u.patch); hide(u.eye); continue; }
      const c = track.lateral(u.s, u.offset, 0.012);
      const br = 1.5 + Math.sin(time * 0.8) * 0.1;
      writeYaw(u.patch.matrix, c, 0, br, 0.01, br);
      const near = u.s - s;
      u.eye.material.emission = near < 18 ? 3 + Math.sin(time * 10) * 2 : 0.02;
      writeYaw(u.eye.matrix, add(c, [0, 0.01, 0]), 0, 0.12, 0.03, 0.12);
      if (near < 14 && !u.warned) { u.warned = true; hud.say('JUNE', 'Still water. Shoot the still water!', 'crew'); }
      if (near < 0.5 && !u.grabbed) {
        u.grabbed = true;
        held = 3.5;
        sound.gurgle();
        damage(10, 'The Undertow took hold of the raft.', 8);
        state.drift = Math.min(100, state.drift + 15);
        for (let k = 0; k < 3; k++) spawnBloom(s + 14 + k * 3, (random() - 0.5) * 4, 0.6 + random() * 2);
      }
      if (near < -6) u.active = false;
    }
    updateWake(dt);
    if (valve.active) {
      if (valve.turned) valve.turned += dt;
      const spin = valve.turned ? valve.turned * 6 : 0;
      const n = [Math.sin(valve.yaw), 0, Math.cos(valve.yaw)];
      const tx = [Math.cos(valve.yaw), 0, -Math.sin(valve.yaw)];
      const ax = add(scale(tx, Math.cos(spin)), [0, Math.sin(spin), 0]);
      const ay = add(scale(tx, -Math.sin(spin)), [0, Math.cos(spin), 0]);
      writeBasis(valve.wheel.matrix, valve.pos, ax, ay, n, 0.5, 0.5, 0.5);
      writeBasis(valve.bar.matrix, valve.pos, ax, ay, n, 0.95, 0.07, 0.07);
      writeYaw(valve.plate.matrix, add(valve.pos, scale(n, -0.1)), valve.yaw, 1.3, 1.3, 0.06);
      if (valve.covered) writeYaw(valve.grout.matrix, add(valve.pos, scale(n, 0.08)), valve.yaw, 0.7, 0.7, 0.15 * valve.covered);
      else hide(valve.grout);
      valve.wheel.material.emission = valve.bar.material.emission = valve.turned ? 0.4 : 2 + Math.sin(time * 5) * 0.8 + valve.hits;
      if (behind(valve.pos)) {
        if (!valve.turned) hud.say('DEZ', 'Missed the valve. That passage stays flooded.', 'crew');
        valve.active = false;
      }
    } else for (const p of [valve.wheel, valve.bar, valve.plate, valve.grout]) hide(p);
    if (breaker.active) {
      const n = [Math.sin(breaker.yaw), 0, Math.cos(breaker.yaw)];
      writeYaw(breaker.plate.matrix, add(breaker.pos, scale(n, -0.06)), breaker.yaw, 1, 0.6, 0.06);
      writeYaw(breaker.bar.matrix, breaker.pos, breaker.yaw, 0.8, 0.14, 0.12);
      breaker.bar.material.emission = breaker.sec.lit ? 0.3 : 2.5 + Math.sin(time * 6);
      if (behind(breaker.pos)) breaker.active = false;
    } else { hide(breaker.bar); hide(breaker.plate); }
    updateLinked(dt);
    // Anomalies: only visible to the inspection beam, or in the dark of a flicker.
    const flickerDark = segments.some((g) => g.flickerDark && Math.abs(g.s + SEG / 2 - s - 8) < 10);
    for (const a of anomalies) {
      if (!a.active) { hide(a.part); continue; }
      a.visible = (input.scanning && angleTo(eye, aimDir, a.pos) < 0.3) || flickerDark;
      if (a.visible) writeYaw(a.part.matrix, a.pos, time * 0.7, 0.42 + Math.sin(time * 3) * 0.05, 0.5, 0.38);
      else hide(a.part);
      if (behind(a.pos)) a.active = false;
    }
    for (const c of caches) {
      if (!c.active) { hide(c.part); continue; }
      if (c.falling) {
        c.falling += dt;
        const target = track.lateral(s + 1.4, offset, 0.15);
        c.pos = c.pos[1] > target[1] + 0.05 ? [c.pos[0], c.pos[1] - dt * 4, c.pos[2]] : add(c.pos, scale(sub(target, c.pos), Math.min(1, dt * 1.5)));
        if (distance(c.pos, target) < 0.8) { c.active = false; give(c.item); hide(c.part); continue; }
      }
      writeYaw(c.part.matrix, c.pos, time * (c.falling ? 1 : 0), 0.45, 0.35, 0.35);
      if (!c.falling && behind(c.pos)) c.active = false;
    }
    if (spill.active) {
      const half = track.sectionAt(spill.s).sec.half;
      writeYaw(spill.grate.matrix, track.lateral(spill.s, spill.side * (half - 0.1), 2), track.at(spill.s).yaw, 0.15, 1.6, 3);
      writeYaw(spill.sheet.matrix, track.lateral(spill.s, spill.side * (half - 0.35), 1.2), track.at(spill.s).yaw, 0.05, 2.4 + Math.sin(time * 9) * 0.05, 2.6);
      if (spill.s < s && !spill.passed) {
        spill.passed = true;
        sound.splash();
        if (wake.active) {
          wake.active = false;
          hud.caption('[the spillway roars — the wake is gone, behind]');
          hud.toast('PURSUIT BROKEN AT THE SPILLWAY');
        }
      }
      if (spill.s < s - 10) spill.active = false;
    } else { hide(spill.grate); hide(spill.sheet); }
    updateLifeguard(eye);
    updateUnloading();
    updateDistant();
    updateLocker();
    updateSky(dt, eye);
    ghostShow -= dt;
    if (ghostShow > 0) writeYaw(ghost.matrix, ghostPos, 0, 0.22, 0.9, 0.18);
    else hide(ghost);
    if (passengerOn) {
      const p = state.passenger;
      p.t += dt * (1 + state.drift / 80);
      if (p.t > 70 && p.stage < 5) passengerStep(1);
      if (p.stage >= 5) {
        events.damage(dt, 'Something heavy sat with you until the raft went under.', true);
        state.drift = Math.min(100, state.drift + dt);
      }
    }
  }

  function updateLinked(dt) {
    if (!linked.active) {
      hide(linked.sensor);
      for (const r of linked.rings) { hide(r.part); hide(r.unknown); hide(r.digit); }
      return;
    }
    linked.flash = Math.max(0, linked.flash - dt);
    writeYaw(linked.sensor.matrix, linked.sensorPos, linked.yaw, 0.5, 0.3, 0.12);
    linked.sensor.material.emission = linked.read ? 0.6 : 1.5 + Math.sin(time * 8);
    const yaw = track.at(linked.s).yaw;
    const toRaft = [-Math.sin(yaw), 0, -Math.cos(yaw)];
    for (const r of linked.rings) hide(r.digit);
    for (const r of linked.rings) {
      const col = linked.flash > 0 ? [1, 0.1, 0.05] : r.hit ? [0.3, 1, 0.4] : [1, 0.85, 0.3];
      r.part.material.color = col;
      r.part.material.emissiveColor = col;
      writeYaw(r.part.matrix, r.pos, yaw, 0.45, 0.45, 0.45);
      const lab = add(r.pos, [0, 0.72, 0]);
      // The digit quad whose texture matches this ring's number.
      if (linked.read) { facing(linked.rings[r.number - 1].digit, lab, toRaft, 0.45, 0.45); hide(r.unknown); }
      else facing(r.unknown, lab, toRaft, 0.45, 0.45);
    }
    if (linked.s + 10 < s) linked.active = false;
  }

  function updateWake(dt) {
    if (!wake.active) { hide(wake.a); hide(wake.b); hide(wake.shape); return; }
    if (track.roomAt(s)) wake.dist = Math.max(wake.dist, 20);
    if (wake.phase === 'approach') {
      wake.ws -= dt * 3;
      if (wake.ws <= s + 0.5) {
        wake.phase = 'pursue';
        wake.dist = 26;
        sound.thump();
        shake = 0.6;
        hud.caption('[something passes under the raft]');
      }
    } else {
      wake.stun = Math.max(0, wake.stun - dt);
      if (!wake.stun) wake.dist -= dt * (0.9 + state.noise * 0.05 + (state.visible ? 0.6 : 0));
      wake.ws = s - wake.dist;
      if (wake.dist < 8) {
        wake.thumpTimer -= dt;
        if (wake.thumpTimer <= 0) {
          wake.thumpTimer = 1.7;
          sound.thump();
          shake = 0.45;
          hud.caption('[impact beneath the raft]');
        }
      }
      if (wake.dist < 1.5) {
        held = 4;
        sound.gurgle();
        damage(12, 'The Undertow surfaced under the raft.', 15);
        state.drift = Math.min(100, state.drift + 12);
        wake.dist = 28;
      }
    }
    const c = track.lateral(wake.ws, 0, 0.015);
    const yaw = track.at(wake.ws).yaw;
    writeYaw(wake.a.matrix, add(c, [Math.sin(yaw + 0.5) * 1.2, 0, Math.cos(yaw + 0.5) * 1.2]), yaw + 0.35, 0.12, 0.02, 2.6);
    writeYaw(wake.b.matrix, add(c, [Math.sin(yaw - 0.5) * 1.2, 0, Math.cos(yaw - 0.5) * 1.2]), yaw - 0.35, 0.12, 0.02, 2.6);
    writeYaw(wake.shape.matrix, add(c, [0, -0.05, 0]), yaw, 0.8, 0.06, 1.8);
  }

  function updateLifeguard(eye) {
    const L = lifeguard;
    if (!L.active) { for (const p of [...L.legs, L.seat, L.body, L.head, L.glasses, L.lamp, L.sign, L.breaker]) hide(p); return; }
    const half = track.sectionAt(L.s).sec.half;
    const base = track.lateral(L.s, L.side * (half - 0.7), 0);
    const yaw = track.at(L.s).yaw;
    const r = track.right(L.s);
    writeYaw(L.legs[0].matrix, add(base, [r[0] * -0.35, 1.6, r[2] * -0.35]), yaw, 0.08, 3.2, 0.08);
    writeYaw(L.legs[1].matrix, add(base, [r[0] * 0.35, 1.6, r[2] * 0.35]), yaw, 0.08, 3.2, 0.08);
    writeYaw(L.seat.matrix, add(base, [0, 3.2, 0]), yaw, 0.9, 0.08, 0.6);
    L.breakerPos = add(base, [r[0] * -0.35 * L.side, 1.3, r[2] * -0.35 * L.side]);
    writeYaw(L.breaker.matrix, L.breakerPos, yaw, 0.3, 0.12, 0.3);
    L.breaker.material.emission = L.stopped ? 0.1 : 1.5 + Math.sin(time * 6);
    if (!L.gone) {
      writeYaw(L.body.matrix, add(base, [0, 3.95, 0]), yaw, 0.17, 1.5, 0.13);
      const head = add(base, [0, 4.85, 0]);
      const watch = Math.atan2(eye[0] - head[0], eye[2] - head[2]);
      writeYaw(L.head.matrix, head, watch, 0.17, 0.24, 0.17);
      writeYaw(L.glasses.matrix, add(head, [Math.sin(watch) * 0.13, 0.03, Math.cos(watch) * 0.13]), watch, 0.3, 0.06, 0.04);
    } else { hide(L.body); hide(L.head); hide(L.glasses); }
    // The warning lamp cycles: 4 s lit, 4 s dark, until its breaker is cut.
    L.lampOn = !L.stopped && Math.floor(time / 4) % 2 === 0;
    writeYaw(L.lamp.matrix, add(base, [0, 5.4, 0]), 0, 0.28, 0.28, 0.28);
    L.lamp.material.emission = L.lampOn ? 9 : 0.05;
    facing(L.sign, track.lateral(L.s - 9, L.side * (half - 0.03), 2.7), scale(r, -L.side), 2.6, 1);
    if (Math.abs(L.s - s) < 50 && !L.gone && !L.stopped) hud.objective(L.lampOn ? 'LIFEGUARD: LAMP LIT · HOLD YOUR FIRE' : 'LIFEGUARD: LAMP DARK · cut the breaker on its chair');
    if (L.s < s - 20) {
      L.active = false;
      hud.objective('Shoot what moves. Scan what hides. Watch the route.');
    }
  }

  function updateUnloading() {
    if (!unloading.active) { hide(unloading.platform); hide(unloading.sign); return; }
    const half = track.sectionAt(unloading.s).sec.half;
    writeYaw(unloading.platform.matrix, track.lateral(unloading.s, -(half - 0.9), -0.45), track.at(unloading.s).yaw, 1.8, 0.5, 12);
    facing(unloading.sign, track.lateral(unloading.s, -(half - 0.03), 2.8), track.right(unloading.s), 3, 0.95);
    if (!unloading.said && unloading.s - s < 30) {
      unloading.said = true;
      hud.say('THE ATTENDANT', 'This raft is now passing the unloading station. Unloading is unavailable. Please remain seated.', 'attendant');
      hud.caption('[the platform is under the water — left]');
      hud.say('JUNE', 'That\'s the fourth time we\'ve passed it. It was dry the first time.', 'crew');
    }
    if (unloading.s < s - 14) unloading.active = false;
  }

  function updateDistant() {
    if (!distant.active) { hide(distant.lip); hide(distant.figure); distant.vests.forEach(hide); return; }
    const pool = track.nextRoom(s, 'pool');
    const at = s + 55;
    if (pool && at > pool.s0 + 8) {
      // Waiting in the pool by the gate you did not take. Empty. Vests folded on the seat.
      const F = roomFrame(pool);
      const other = pool.sec.exits.find((_, i) => i !== (track.choices[pool.sec.id] ?? 0));
      const pos = F.at(pool.sec.length - 5, (other?.side ?? 1) * EXIT_OFFSET, 0.15);
      flat(distant.lip, pos, 0.9, 0.9, 1.1);
      hide(distant.figure);
      distant.vests.forEach((v, i) => writeYaw(v.matrix, add(pos, [(i % 2 - 0.5) * 0.4, 0.3 + Math.floor(i / 2) * 0.12, 0]), pool.yaw, 0.35, 0.1, 0.3));
      if (!distant.parked) { distant.parked = true; hud.say('JUNE', 'That\'s the raft. It\'s empty. The vests are folded on the seat.', 'crew'); }
      if (s > pool.s1) distant.active = false;
    } else {
      flat(distant.lip, track.lateral(at, 0, 0.15), 0.9, 0.9, 1.1);
      writeYaw(distant.figure.matrix, track.lateral(at, 0, 0.9), 0, 0.2, 0.75, 0.16);
      distant.vests.forEach(hide);
    }
  }

  function updateLocker() {
    const k = locker;
    if (!k.active) { for (const p of [k.frame, k.light, ...k.items, k.pump]) hide(p); return; }
    const half = k.sec.half;
    const yaw = track.at(k.s).yaw;
    const pass = k.sec.pass || 1;
    k.lightOn = pass % 2 === 0;
    writeYaw(k.frame.matrix, track.lateral(k.s, half - 0.02, 1.9), yaw, 0.08, 2, 4.2);
    writeYaw(k.light.matrix, track.lateral(k.s, half - 0.05, 1.9), yaw, 0.04, 1.7, 3.8);
    k.light.material.emission = k.lightOn ? 3 : 0.05;
    k.items.forEach((item, i) => (i === (pass - 1) % k.items.length ? writeYaw(item.matrix, track.lateral(k.s, half - 0.25, 1.5), yaw, 0.35, 0.35, 0.5) : hide(item)));
    k.pumpPos = track.lateral(k.s - 4, -(half - 0.15), 2.3);
    writeBasis(k.pump.matrix, k.pumpPos, [Math.sin(yaw), 0, Math.cos(yaw)], UP, track.right(k.s), 0.5, 0.5, 0.5);
    k.pump.material.emission = 2 + Math.sin(time * 4);
    const range = track.ranges.find((r) => r.sec === k.sec);
    if (range && s > range.s1 - 1) {
      k.active = false;
      if (!k.sec.solved) {
        if (pass < 5) {
          hud.say('TUBS', 'Same locker room. Again.', 'crew');
          hud.caption('[the same room — ahead]');
          const again = section('loop', { pass: pass + 1 });
          again.encounters = [{ at: again.length * 0.5, kind: 'lockerRoom' }];
          track.insertAfter(k.sec, [again]);
        } else hud.say('THE ATTENDANT', 'We apologise for the delay.', 'attendant');
      }
    }
  }

  function updateSky(dt, eye) {
    const sec = track.sectionAt(s).sec;
    if (!sec.sky) {
      clouds.forEach((c) => hide(c.part));
      towers.forEach(hide);
      return;
    }
    if (!skyAnchor) {
      skyAnchor = [...eye];
      clouds.forEach((c, i) => (c.base = [eye[0] + (hash(i) - 0.5) * 400, eye[1] + 55 + hash(i + 3) * 30, eye[2] - 60 - hash(i + 7) * 300]));
    }
    towers.forEach((t, i) => {
      const a = (i / towers.length) * Math.PI * 2 + 0.3;
      writeYaw(t.matrix, [skyAnchor[0] + Math.cos(a) * 260, skyAnchor[1] + 40, skyAnchor[2] - 200 + Math.sin(a) * 260], a, 30, 140 + hash(i) * 80, 30);
    });
    // The clouds drift for forty seconds, then jump back to where they started.
    cloudCycle += dt;
    if (cloudCycle > 40) {
      cloudCycle = 0;
      hud.caption('[the clouds jump back]');
      hud.say('THE ATTENDANT', 'The air has been changed.', 'attendant');
    }
    clouds.forEach((c, i) => writeYaw(c.part.matrix, [c.base[0] + cloudCycle * 3, c.base[1], c.base[2]], 0, 30 + hash(i + 1) * 30, 4 + hash(i + 2) * 4, 14 + hash(i + 4) * 14));
  }

  if (import.meta.env.DEV) window.__ride = { track, valve, linked, lifeguard, locker, wake, passengerStep, burst: () => burst(fx.eye, fx.fwd), get s() { return s; }, set s(v) { s = v; } };

  return {
    update,
    resize: () => renderer.resize(),
    dispose: () => {
      sound.setMuffle(false);
      renderer.dispose();
    },
    get position() {
      return s;
    },
  };
}

/** Every pool and bay in a plan, including those inside route exits. */
function collectRooms(items, out = []) {
  for (const it of items) {
    if (it.type === 'pool' || it.type === 'bay') out.push(it);
    if (it.exits) for (const ex of it.exits) collectRooms(ex.sections, out);
  }
  return out;
}
