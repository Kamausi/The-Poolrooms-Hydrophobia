// The raft. Movement is automatic; decisions are not. The ride is a Track built from the sector's plan:
// channel sections recycle a fixed pool of segment parts ahead of the camera, and rooms (holding pools,
// the arrival bay) have their own parts. A 67js renderer keeps the part list it was built with, so every
// entity here is a pool of parts that are moved, recoloured or hidden.
import { Renderer67, box, sphere, cylinder, torus } from '67js';
import { writeYaw, writeBasis, hide, add, sub, scale, normalize, clamp, damp, rng, screenRay, raySphere, rayPlaneY, linear, cross, display, project, angleTo, soundDir, distance } from './math.js';
import { tileTexture } from './textures.js';
import { signMaterial, quad } from './labels.js';
import { createBlaster, PROFILES, PROFILE_ORDER } from './blaster.js';
import { input, wasPressed, isDown } from './input.js';
import { hud } from './hud.js';
import { sound } from './audio.js';
import { quality } from './quality.js';
import { settings } from './settings.js';
import { AMBIENT } from './sectors.js';
import { Track, EXIT_OFFSET, section } from './track.js';
import { createDirector, AFTERMATH, BANTER } from './director.js';
import { createHull, CHAMBERS, CHAMBER_NAME } from './hull.js';

const SEG = 6;
const SEGMENTS = 28;
const FOV = 72;
const FOCUS_FOV = 30;
const UP = [0, 1, 0];
const FLAT_X = [1, 0, 0], FLAT_Y = [0, 0, -1];

export function createRide(canvas, state, sector, events, opts = {}) {
  const plan = state.ride;
  const track = new Track(plan.items, plan.choices);
  const random = rng(1000 + sector.index * 31 + state.attempt * 7 + (state.seed || 0));
  const map = tileTexture(sector);
  const tileMat = { color: [1, 1, 1], metallic: 0, roughness: 0.22, map, boxMapScale: 0.5 };
  const lampColor = linear(sector.lamp);
  const bandMat = { color: linear(sector.band || '#4d7472'), metallic: 0, roughness: 0.35 };
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
      // Pool hall dressing: decks, plastic chairs, a high window, a slide that goes into the wall.
      deckL: P(`Deck L${i}`, slab, tileMat), deckR: P(`Deck R${i}`, slab, tileMat),
      chairL: P(`Chair L${i}`, box(0.08, 2), { color: [0.93, 0.93, 0.9], metallic: 0, roughness: 0.4 }), chairR: P(`Chair R${i}`, box(0.08, 2), { color: [0.93, 0.93, 0.9], metallic: 0, roughness: 0.4 }),
      backL: P(`Chair back L${i}`, box(0.08, 2), { color: [0.93, 0.93, 0.9], metallic: 0, roughness: 0.4 }), backR: P(`Chair back R${i}`, box(0.08, 2), { color: [0.93, 0.93, 0.9], metallic: 0, roughness: 0.4 }),
      upperWin: P(`Upper window ${i}`, slab, glow([0.55, 0.62, 0.66], 0.9)),
      stairs: [0, 1, 2, 3].map((k) => P(`Stair ${i}.${k}`, slab, dark([0.05, 0.06, 0.07]))),
      slide: P(`Slide ${i}`, torus(0.12, 40, 12, Math.PI * 0.7), { color: [0.95, 0.5, 0.18], metallic: 0, roughness: 0.25 }),
      bigWin: P(`Pool window ${i}`, slab, glow([0.5, 0.75, 0.85], 1.1)),
      farRaft: P(`Far raft ${i}`, slab, dark([0.08, 0.05, 0.04])),
      marker: P(`Depth marker ${i}`, plane, { ...signMaterial('1.2 M', 'depth', 0.3, 256, 128), doubleSided: true }),
      glass: P(`Partition glass ${i}`, slab, { color: [0.6, 0.8, 0.85], metallic: 0.2, roughness: 0.05, alphaMode: 'blend', opacity: 0.25 }),
      farWater: P(`Twin water ${i}`, slab, waterMat()), farWall: P(`Twin wall ${i}`, slab, tileMat),
      post: P(`Aqueduct post ${i}`, cylinder(12, 0, 1), { color: [0.3, 0.32, 0.3], metallic: 0.7, roughness: 0.4 }),
      rules: P(`Pool rules ${i}`, plane, { ...signMaterial('POOL RULES\nNO RUNNING · NO DIVING\nNO GUESTS AFTER CLOSING', 'rule', 0.5, 512, 220), doubleSided: true }),
      // The faded waterline band every pool has. Sometimes it runs at the wrong height.
      bandL: P(`Band L${i}`, slab, bandMat), bandR: P(`Band R${i}`, slab, bandMat),
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
      // The lettering is ordinary. The information is wrong.
      set.count = P(`Bay count ${r.id}`, plane, { ...signMaterial('GUESTS ADMITTED: 04\nGUESTS RETURNED: 03\nDISCREPANCY: NONE', 'count', 1.1, 512, 220), doubleSided: true });
    }
    roomSigns.set(r.id, set);
  }
  const voidWall = P('Spillway void', slab, { color: [0, 0, 0], metallic: 0, roughness: 1 });

  // ---------- The raft ----------
  const raft = {
    lip: P('Raft', torus(0.26, 48, 16), { color: linear('#b19a50'), metallic: 0, roughness: 0.55 }), // worn safety yellow, damp, patched
    rope: P('Raft rope', torus(0.025, 64, 6), { color: [0.42, 0.33, 0.2], metallic: 0, roughness: 0.9 }),
    straps: [0, 1, 2, 3, 4, 5].map((i) => P(`Raft strap ${i}`, slab, { color: [0.06, 0.07, 0.07], metallic: 0.1, roughness: 0.7 })),
    case: P('Supply case', box(0.04, 2), { color: [0.62, 0.63, 0.6], metallic: 0.5, roughness: 0.45 }),
    caseStrap: P('Supply case strap', slab, { color: [0.06, 0.07, 0.07], metallic: 0.1, roughness: 0.7 }),
    seat: P('Opposite seat', box(0.2, 3), { color: [0.07, 0.12, 0.2], metallic: 0, roughness: 0.8 }),
    strap: P('Seat restraint', slab, { color: [0.12, 0.12, 0.13], metallic: 0.3, roughness: 0.6 }),
    panel: P('Maintenance panel', slab, { color: [0.2, 0.22, 0.2], metallic: 0.6, roughness: 0.4, emission: 0.6, emissiveColor: [0.4, 1, 0.6] }),
    patches: [0, 1, 2].map((i) => P(`Raft patch ${i}`, slab, { color: [0.45, 0.45, 0.42], metallic: 0.2, roughness: 0.8 })),
    headlamp: P('Raft headlamp', slab, glow([1, 0.95, 0.85], 8)),
    // Every scuff and patch the raft has ever had. They stay.
    marks: Array.from({ length: 9 }, (_, i) => P(`Hull mark ${i}`, slab, { color: [0.45, 0.45, 0.42], metallic: 0.2, roughness: 0.8 })),
    bubbles: Array.from({ length: 6 }, (_, i) => P(`Leak bubble ${i}`, sphere(8, 6), { color: [0.8, 0.92, 0.95], metallic: 0, roughness: 0.05 })),
    paddleShaft: P('Paddle shaft', post, { color: [0.55, 0.5, 0.42], metallic: 0.3, roughness: 0.6 }),
    paddleBlade: P('Paddle blade', slab, { color: [0.9, 0.5, 0.12], metallic: 0, roughness: 0.5 }),
    line: P('Safety line', slab, { color: [0.95, 0.8, 0.2], metallic: 0, roughness: 0.6 }),
    handle: P('Grab handle', torus(0.1, 24, 8), glow([1, 0.75, 0.2], 1.2, { color: [1, 0.7, 0.2] })),
    grip: P('Undertow grip', lumpy, dark([0.004, 0.01, 0.012])),
  };
  const passenger = {
    drips: [0, 1, 2].map((i) => P(`Drip ${i}`, sphere(8, 6), { color: [0.6, 0.8, 0.85], metallic: 0, roughness: 0.1 })),
    reflection: P('Reflection', slab, dark([0.01, 0.015, 0.02])),
    body: P('Passenger', cylinder(14, 0.4, 2), { color: [0.78, 0.8, 0.76], metallic: 0, roughness: 0.4 }),
    head: P('Passenger head', sphere(14, 10), { color: [0.8, 0.82, 0.78], metallic: 0, roughness: 0.3 }),
  };

  // ---------- The reference chapter: the closed wave pool ----------
  const wave = {
    sign: P('Wave display', plane, { ...signMaterial('WAVES BEGIN IN\n00:00', 'count', 1.2, 512, 220), doubleSided: true }),
    exit: P('Submerged exit glow', slab, glow([0.45, 0.8, 0.55], 1.4)),
    exitSign: P('Submerged exit sign', plane, { ...signMaterial('EXIT', 'safe', 0.7, 256, 96), doubleSided: true }),
    diverter: P('Diverter relay', box(0.04, 2), { color: linear('#c45a50'), metallic: 0.4, roughness: 0.5, emission: 1.2, emissiveColor: linear('#c45a50') }),
    arc: P('Relay arc', slab, glow([0.8, 0.9, 1], 10)),
    s: 0, active: false, divS: 0, divSide: 1, divActive: false, divDone: false, arcT: 0,
  };
  const spark = P('Impact spark', sphere(10, 8), glow([1, 0.9, 0.6], 10));
  // Where the raft is going: a faint line of foam, so momentum, currents and a soft side can be read before they bite.
  const traj = Array.from({ length: 7 }, (_, i) => P(`Trajectory ${i}`, slab, glow([0.85, 0.85, 0.78], 0.35)));
  let sparkT = 0, sparkAt = null;

  // ---------- Co-op and arcade parts ----------
  const pingMark = P('Ping marker', torus(0.06, 32, 8), glow([0.4, 1, 0.9], 6));
  const crewBeam = P('Crew cover fire', slab, glow([0.6, 1, 0.8], 10));
  const hookRope = P('Hook line', slab, { color: [0.95, 0.8, 0.2], metallic: 0, roughness: 0.6 });
  const hookHead = P('Hook', torus(0.05, 18, 6), { color: [0.6, 0.6, 0.6], metallic: 0.9, roughness: 0.3 });
  // The crew in the raft (after they regroup at the first Safe Room). Distinct silhouettes, the only warm colours.
  const CREW_LOOK = {
    mars: { jacket: '#3a4a5c', vest: '#b19a50', tall: 1, broad: 1 },
    dez: { jacket: '#22324a', vest: '#9a8445', tall: 1.02, broad: 0.95 },
    tubs: { jacket: '#8a8278', vest: '#a8823a', tall: 1.05, broad: 1.3 },
    june: { jacket: '#c9c6b8', vest: '#b46a3c', tall: 1.08, broad: 0.85, coat: true },
  };
  const crewFigs = ['mars', 'dez', 'tubs', 'june'].map((id) => ({
    id,
    body: P(`Crew ${id}`, cylinder(14, 0.4, 2), { color: linear(CREW_LOOK[id].jacket), metallic: 0, roughness: 0.75 }),
    vest: P(`Crew vest ${id}`, box(0.08, 2), { color: linear(CREW_LOOK[id].vest), metallic: 0, roughness: 0.6 }),
    head: P(`Crew head ${id}`, sphere(14, 10), { color: [0.62, 0.48, 0.38], metallic: 0, roughness: 0.6 }),
  }));
  const SEATS = [[-1.0, 1.55], [1.02, 1.35], [-1.08, 0.25]]; // on the gunwales, out of the line of fire
  function placeCrew(base, rgt, fwd, up) {
    const aboard = (state.regrouped || state.sectorIndex > 0) && !state.endless ? Object.keys(state.crewState).filter((c) => !(state.forgotten || []).includes(c) && state.crewState[c] !== 'grabbed') : [];
    let seat = 0;
    for (const f of crewFigs) {
      const on = aboard.includes(f.id) && seat < SEATS.length && !(capsize && capsize.t > 0.6 && capsize.t < 4.4);
      if (!on) { hide(f.body); hide(f.vest); hide(f.head); continue; }
      const L = CREW_LOOK[f.id];
      const [x, z] = SEATS[seat++];
      const hurt = state.crewState[f.id] === 'hurt';
      const duckC = braced || hurt || flowT > 0 || shake > 0.45 ? 0.25 : 0; // they brace with you, and when the water turns
      const sway = Math.sin(time * 1.3 + seat) * 0.03 + (paddleT > 0.5 ? Math.sin(strokePhase * Math.PI * 2) * 0.06 : 0);
      const p = add(add(add(base, scale(rgt, x + sway)), scale(fwd, z)), scale(up, 0.12));
      const h = 0.5 * L.tall - duckC; // seated low on the tube
      // They lean into turns (against the slide), and jolt on impacts.
      const upL = normalize(add(up, scale(rgt, clamp(-velX * 0.05, -0.22, 0.22) + (shake > 0.3 ? Math.sin(time * 40 + seat) * 0.05 : 0))));
      writeBasis(f.body.matrix, add(p, scale(upL, h / 2)), rgt, upL, fwd, 0.2 * L.broad, h * (L.coat ? 1.05 : 1), 0.17 * L.broad);
      writeBasis(f.vest.matrix, add(p, scale(upL, h * 0.62)), rgt, upL, fwd, 0.44 * L.broad, 0.3, 0.38 * L.broad);
      writeBasis(f.head.matrix, add(p, scale(upL, h + 0.11)), rgt, upL, fwd, 0.1, 0.12, 0.1);
    }
  }
  const climberPart = { body: P('Climber', cylinder(12, 0.3, 2), { color: [0.82, 0.84, 0.8], metallic: 0, roughness: 0.35 }), head: P('Climber head', sphere(12, 8), { color: [0.85, 0.86, 0.82], metallic: 0, roughness: 0.3 }) };
  const tug = { line: P('Tug line', slab, { color: [0.95, 0.8, 0.2], metallic: 0, roughness: 0.6 }), hand: P('Hand in the water', sphere(10, 8), { color: [0.85, 0.75, 0.68], metallic: 0, roughness: 0.4 }), grip: P('Grip on the crewmate', lumpy, dark([0.004, 0.01, 0.012])) };
  const restrainedPart = { body: P('Restrained figure', cylinder(12, 0.3, 2), { color: [0.75, 0.7, 0.62], metallic: 0, roughness: 0.6 }), strap: P('Restraint', torus(0.08, 24, 8), glow([1, 0.4, 0.2], 2.5)), window: P('Observation window', slab, glow([0.8, 0.9, 1], 1.4)) };
  const ballastParts = {
    body: P('Ballast', lumpy, { color: [0.12, 0.13, 0.1], metallic: 0.2, roughness: 0.7 }),
    core: P('Ballast core', ball, glow([1, 0.3, 0.15], 0.02, { color: [0.3, 0.05, 0.03] })),
    anchors: [0, 1, 2].map((i) => P(`Ballast anchor ${i}`, slab, { color: [0.22, 0.18, 0.15], metallic: 0, roughness: 0.8 })),
    knots: [0, 1, 2].map((i) => P(`Ballast growth ${i}`, lumpy, glow([1, 0.5, 0.2], 1.2, { color: [0.4, 0.15, 0.08] }))),
    vests: [0, 1, 2, 3].map((i) => P(`Ballast vest ${i}`, box(0.05, 2), { color: [0.95, 0.45, 0.08], metallic: 0, roughness: 0.6 })),
  };

  // ---------- Entities ----------
  const blooms = Array.from({ length: 20 }, (_, i) => ({
    core: P(`Bloom ${i}`, ball, { color: [0.62, 0.66, 0.6], metallic: 0, roughness: 0.15, emission: 0.02, emissiveColor: [0.77, 0.35, 0.31], alphaMode: 'blend', opacity: 0.62 }),
    heart: P(`Bloom heart ${i}`, sphere(12, 8), glow(linear('#c45a50'), 2.2, { color: [0.35, 0.06, 0.05] })),
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
  const floaters = Array.from({ length: 2 }, (_, i) => ({
    body: P(`River floater ${i}`, cylinder(14, 0.45, 2), { color: [0.82, 0.84, 0.8], metallic: 0, roughness: 0.25 }),
    head: P(`River floater head ${i}`, sphere(14, 10), { color: [0.85, 0.86, 0.82], metallic: 0, roughness: 0.2 }),
    active: false, s: 0, offset: 0, survivor: true, state: 'floating', hp: 2,
  }));
  // ---------- Raft movement content ----------
  const buoy = () => P('Gate marker', sphere(14, 10), glow([1, 0.45, 0.1], 1.5, { color: [1, 0.5, 0.12], roughness: 0.4 }));
  const gateSets = Array.from({ length: 3 }, () => ({ a: buoy(), b: buoy(), active: false, s: 0, lane: 0, done: false }));
  let gateStreak = 0;
  const debrisPool = Array.from({ length: 3 }, (_, i) => ({ a: P(`Floating debris ${i}`, box(0.15, 2), { color: [0.6, 0.55, 0.45], metallic: 0, roughness: 0.8 }), b: P(`Floating chair ${i}`, box(0.08, 2), { color: [0.93, 0.93, 0.9], metallic: 0, roughness: 0.4 }), active: false, s: 0, lane: 0, done: false }));
  const pickups = Array.from({ length: 3 }, (_, i) => ({ part: P(`Air pickup ${i}`, box(0.12, 2), glow([0.6, 1, 0.8], 2.5, { color: [0.4, 0.7, 0.5] })), active: false, s: 0, lane: 0, item: 'parts', done: false }));
  const ramp = {
    lip: P('Ramp lip', slab, tileMat), foam: P('Ramp foam', slab, glow([0.9, 0.97, 1], 2.2)),
    chev: [0, 1, 2].map((i) => P(`Ramp chevron ${i}`, slab, glow([1, 0.8, 0.2], 2.5))),
    active: false, s: 0, lane: 0, fork: null, decided: false,
  };
  const sluice = {
    wheel: P('Sluice control', torus(0.12, 40, 12), glow([0.2, 1, 0.9], 2.5)),
    sign: P('Sluice sign', plane, { ...signMaterial('SLUICE\nMAINTENANCE BYPASS', 'sign', 0.8, 384, 160), doubleSided: true }),
    active: false, pos: [0, 0, 0], yaw: 0, hits: 0, fork: null, side: 1,
  };
  const stranded = {
    body: P('Stranded Drainer', cylinder(12, 0.3, 2), { color: [0.95, 0.55, 0.15], metallic: 0, roughness: 0.6 }),
    head: P('Stranded Drainer head', sphere(12, 8), { color: [0.75, 0.6, 0.5], metallic: 0, roughness: 0.6 }),
    ledge: P('Ledge', slab, tileMat),
    active: false, s: 0, side: 1, hp: 4, window: 0, spawnT: 0, fork: null, resolved: false, pos: [0, 0, 0],
  };
  const bulkhead = { door: P('Bulkhead', slab, { color: [0.35, 0.36, 0.33], metallic: 0.8, roughness: 0.35 }), active: false, fork: null, forkS: 0, t: 0, total: 0, decided: false };
  const crewRaft = {
    lip: P('Crew raft', torus(0.3, 32, 12), { color: [0.75, 0.32, 0.12], metallic: 0, roughness: 0.6 }),
    riders: [0, 1, 2].map((i) => P(`Crew rider ${i}`, cylinder(12, 0.3, 2), { color: [0.95, 0.5, 0.15], metallic: 0, roughness: 0.6 })),
    active: false, sec: null, hits: 0, spawnT: 0, pos: [0, 0, 0],
  };
  const lockMarks = Array.from({ length: 6 }, (_, i) => P(`Lock ${i}`, torus(0.05, 32, 8), glow([1, 0.3, 0.3], 4)));
  const volleyBeams = Array.from({ length: 6 }, (_, i) => P(`Volley beam ${i}`, box(0, 1), glow([1, 0.5, 0.4], 12)));
  const shots = Array.from({ length: 8 }, (_, i) => ({ part: P(`Spitter shot ${i}`, sphere(14, 10), glow([0.8, 0.3, 1], 5)), active: false, pos: [0, 0, 0], from: null, reflect: false, t: 0 }));
  const abyss = P('Abyss water', slab, waterMat());
  const foam = Array.from({ length: 8 }, (_, i) => P(`Current foam ${i}`, slab, glow([0.85, 0.95, 1], 0.6)));
  const ghost = P('Distant figure', cylinder(12, 0.3, 2), dark([0.02, 0.02, 0.03]));

  const blaster = createBlaster(state);
  parts.push(...blaster.parts);
  for (const p of parts) if (p.matrix[15] === 0) hide(p);

  const sky = sector.sky;
  const renderer = new Renderer67(canvas, parts, {
    ground: false, world: true, hdr: true, ...quality.renderer,
    environment: {
      keyIntensity: sky ? 1 : 0.05, fillIntensity: sky ? 0.6 : 0.12, ambientIntensity: sky ? 0.7 : 0.16,
      fogColor: linear(sector.fog), fogDensity: sky ? 0.004 : 0.036 + sector.index * 0.004,
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
  let sink = 0;
  let dressing = 0;
  let velX = 0; // lateral velocity: the raft has weight
  let jumpY = 0, jumpV = 0, lastHop = -10;
  let braced = false, braceStart = -10;
  const locks = [];
  let lockTimer = 0, volleyT = 0;
  let volleyLines = [];
  let photoPending = null;
  let attendantCall = 0;
  const director = createDirector(random, { relax: [26, 42], level: sector.index });
  let lastHealth = state.health;
  const setpiece = { active: false, t: 0, step: 0 };
  // The hull, the paddle, and the water outside the raft.
  const hull = createHull(state, { hud, sound, random });
  let hullFx = hull.effects();
  let paddleT = 0, strokeTimer = 0, strokePhase = 0, bladeHeld = 0;
  let repairing = false, hullPrompt = '';
  let lastHullHealth = state.health;
  let overboard = null; // { t, back, x, line, lineT, onLine, tug, solo }
  let capsize = null; // { t, said }
  let trailGrab = null; // the Undertow on the trailing edge: { t, hp, lean }
  let turnDrift = 0, tautLine = 0, crewStopped = 0;
  const pendingPaddle = []; // paddle-feedback events waiting for the player to be paddling
  const saidHull = new Set();
  let underFloorUsed = false;
  // Arcade and co-op state.
  let fov = FOV, focusing = false;
  let shoveCool = 0, shoveFatigue = 0;
  let hookLine = null; // { t, to, hit }
  let lastHitPoint = null, shotProfile = 'pulse';
  let protect = 0; // seconds of grace after a rescue: no instant recapture
  let climber = null; // { side, t, lean, hp }
  let crewGrab = null; // { who, t, tension, hp, low }
  let ballast = null; // { s, offset, anchors: [hp], core, surge, t }
  let restrained = null; // { s, side, freed }
  let coverT = 2, coverBeam = 0, coverFrom = null, coverTo = null;
  let pingT = 0, pingPos = null, pinged = null;
  let callerAt = -100, callerWho = null;
  let reservoirUsed = false;
  let lampSag = 1, lampSagT = 0; // machinery loading pulls the lights down for a moment
  state.profile ||= 'pulse';
  state.special ??= 60;
  state.stats ||= { freed: 0, revives: 0, repairs: 0, pressureRepairs: 0, survivors: 0, routes: [], shared: 0, shoves: 0 };
  state.crewState ||= {};
  for (const c of ['mars', 'dez', 'tubs', 'june']) if (c !== state.character) state.crewState[c] ||= 'ok';
  const crewAvailable = () => Object.keys(state.crewState).filter((c) => !(state.forgotten || []).includes(c) && state.crewState[c] !== 'hurt');
  const gear = (g) => (state.gear || []).includes(g);
  const crewName = () => pick(['DEZ', 'TUBS', 'JUNE', 'MARS'].filter((n) => n !== state.name.toUpperCase()));
  const isSolo = () => (state.forgotten || []).length >= 3;
  const stretch = (part, a, b, w) => {
    const d = sub(b, a);
    const L = Math.hypot(d[0], d[1], d[2]) || 1e-3;
    const y = scale(d, 1 / L);
    const c = cross(y, UP);
    const x = Math.hypot(c[0], c[1], c[2]) < 0.05 ? [1, 0, 0] : normalize(c);
    writeBasis(part.matrix, scale(add(a, b), 0.5), x, y, cross(x, y), w, L, w);
  };

  /** Over the side. A crewmate throws a line; alone, you swim for the grab handle. Too long in the water is a checkpoint failure. */
  function goOverboard(cause) {
    if (overboard || capsize || track.roomAt(s, 4) || state.sitting) return;
    const solo = isSolo();
    const side = random() < 0.5 ? -1 : 1;
    overboard = { t: 0, back: 2.4, x: offset + side * 1.7, line: null, lineT: solo ? Infinity : 2 + random(), onLine: false, tug: 0, tugged: false, solo };
    sound.splash();
    shake = 0.9;
    trailGrab = null;
    hud.caption(cause === 'dragged' ? '[the trailing edge goes under and takes you with it]' : cause === 'knocked' ? '[it hits you square — you go over the side]' : '[the raft bucks — you go over the side]');
    if (solo) hud.say(state.name.toUpperCase(), 'Nobody\'s going to throw a line. Swim. The handle. Get the handle.', 'crew');
    else hud.say(crewName(), 'Overboard! Swim for the handle — line coming!', 'crew');
    hud.toast('OVERBOARD · W swim · A/D · E grab the handle or the line · SPACE kick free');
  }

  function updateOverboard(dt, steerIn, lim) {
    const ob = overboard;
    ob.t += dt;
    const swim = clamp(input.move[1] + (isDown('w') || isDown('arrowup') ? 1 : 0), 0, 1);
    ob.x = clamp(ob.x + steerIn * dt * 2, -lim - 0.4, lim + 0.4);
    // The raft keeps going; your crew back-paddles to hold it for you.
    ob.back = Math.max(0.6, ob.back + (speed - swim * 2.5 - 0.3) * dt); // you can reach the stern, not swim through the raft
    if (ob.onLine) {
      ob.back -= dt * 3.4;
      ob.x = damp(ob.x, offset, 2.5, dt);
    }
    // Something under the water takes an ankle. Kick.
    if (!ob.tugged && ob.t > 2.5 && random() < dt * 0.3) {
      ob.tugged = true;
      ob.tug = 2.6;
      sound.gurgle();
      hud.caption('[something has your ankle — SPACE, kick]');
    }
    if (ob.tug > 0) {
      ob.tug -= dt;
      ob.back += dt * 1.4;
      ob.onLine = false;
      if (wasPressed(' ')) { ob.tug -= 0.7; sound.splash(); }
    }
    if (!ob.line && ob.t > ob.lineT) {
      ob.line = { t: 0, x: ob.x + (random() - 0.5) * 1.4, back: Math.max(1.5, ob.back - 0.5) };
      sound.splash();
      hud.say(crewName(), 'LINE! Grab it!', 'crew');
    }
    let prompt = ob.tug > 0 ? 'SPACE · KICK FREE' : '';
    if (ob.line && !ob.onLine) {
      ob.line.t += dt;
      const near = Math.abs(ob.x - ob.line.x) < 1.5 && Math.abs(ob.back - ob.line.back) < 2.2;
      if (near && ob.line.t > 0.4) prompt ||= 'E · GRAB THE LINE';
      if (near && wasPressed('e') && ob.line.t > 0.4 && ob.tug <= 0) {
        ob.onLine = true;
        hud.caption('[the line goes tight — they are pulling you in]');
      } else if (ob.line.t > 5) {
        ob.line = null;
        ob.lineT = ob.t + 2.2;
        hud.say(crewName(), 'Missed — coiling it — again!', 'crew');
      }
    }
    // Close behind the raft, swimming pulls you in toward the handle's side.
    if (ob.back < 2) ob.x = damp(ob.x, offset, swim * 1.5, dt);
    if (ob.back < 1.5 && Math.abs(ob.x - offset) < 1.8) {
      prompt = 'E · GRAB THE HANDLE';
      if (wasPressed('e')) {
        overboard = null;
        shake = 0.5;
        sound.splash();
        hud.caption(ob.solo ? '[you drag yourself over the side by the handle — alone, shaking]' : '[hands on your vest — you are hauled back in]');
        protect = 3;
        events.log?.('rescue', { what: ob.solo ? 'self-recovery from the water' : 'hauled back aboard' });
        if (!ob.solo) { state.stats.freed += 1; setTimeout(() => hud.say('THE ATTENDANT', 'Thank you for returning your passenger to the designated seating area.', 'attendant'), 3200); }
        if (!ob.solo) setTimeout(() => hud.say('MARS', 'Count off. Four? Four. Good. Don\'t do that again.', 'crew'), 1200);
        return '';
      }
    }
    // A swimmer is exactly what the Lifeguard watches for. Its chair creaks before the whistle.
    if (lifeguard.active && lifeguard.lampOn && !lifeguard.gone && Math.abs(lifeguard.s - s) < 55 && !ob.lg) {
      ob.lg = true;
      sound.chair(0);
      hud.caption('[a chair creaks somewhere above. The lamp swings toward the swimmer — you]');
      setTimeout(() => { if (overboard === ob) violate(); }, 2500);
    }
    // The water wants you to stay in it.
    state.drift = Math.min(100, state.drift + dt * 4);
    if (ob.back > 15 || ob.t > 24 || state.drift >= 100) {
      overboard = null;
      events.damage(999, ob.solo ? 'You went over the side, and there was nobody left to throw you a line.' : 'You went over the side, and the water kept you.');
    }
    return prompt;
  }

  /** The rare one: the raft turns over. Under the hull the light is wrong; then the crew rights it. Things are lost. */
  function startCapsize() {
    if (capsize || hull.state.capsized || track.roomAt(s, 4)) return;
    hull.state.capsized = true;
    overboard = null;
    trailGrab = null;
    capsize = { t: 0, said: 0 };
    sound.splash();
    shake = 1.2;
    hud.caption('[the soft side folds under — the raft turns over]');
  }

  function updateCapsize(dt) {
    const c = capsize;
    c.t += dt;
    if (c.t > 0.8 && c.said === 0) { c.said = 1; sound.setMuffle(true); }
    if (c.t > 1.6 && c.said === 1) { c.said = 2; hud.caption('[under the raft. The light through the hull is the wrong colour.]'); }
    if (c.t > 2.8 && c.said === 2) { c.said = 3; sound.knock(3); hud.caption('[something pats the hull from below. It is below you, too.]'); }
    if (c.t > 4.4) {
      capsize = null;
      sound.setMuffle(!!track.sectionAt(s).sec.muffle);
      for (const k of CHAMBERS) state.chambers[k] = Math.max(state.chambers[k], 30);
      state.charge = 0;
      const lost = [];
      if (state.cells > 0) { state.cells -= 1; lost.push('a power cell'); }
      if (state.filters > 0) { state.filters -= 1; lost.push('a filter'); }
      if (state.dressings > 0) { state.dressings -= 1; lost.push('a dressing'); }
      hud.toast(`THE CREW RIGHTED THE RAFT · LOST: ${lost.join(', ') || 'nothing you can name'}`);
      sound.splash();
      setTimeout(() => hud.say('MARS', 'Count off! One. Two. Three. Four. … Say it again. Four. We\'re four.', 'crew'), 900);
      state.drift = Math.min(100, state.drift + 10);
    }
  }

  function knockUnderPatch() {
    hull.state.knockAt = -1;
    sound.knock(3);
    shake = Math.max(shake, 0.2);
    hud.caption('[knock. knock. knock. From underneath — right under the new patch.]');
    setTimeout(() => hud.say('MARS', 'Nobody answer it.', 'crew'), 1400);
  }

  function selectProfile(id) {
    if (state.profile === id) return;
    state.profile = id;
    sound.tick?.(2);
    hud.toast(`${PROFILES[id].label} · ${PROFILES[id].job}`);
  }

  /** First-time tips: each one shown once ever, at the moment it is useful. Off in Settings. */
  const taught = (() => { try { return new Set(JSON.parse(localStorage.getItem('underflow-tips') || '[]')); } catch { return new Set(); } })();
  function teach(key, text) {
    if (!settings.tips || taught.has(key)) return;
    taught.add(key);
    try { localStorage.setItem('underflow-tips', JSON.stringify([...taught])); } catch {}
    hud.toast(text);
  }
  function tips(sec) {
    if (time > 2.5) teach('steer', 'A/D STEER · THE RAFT HAS WEIGHT · THE FOAM LINE SHOWS WHERE IT IS GOING');
    if (blooms.some((b) => b.active && !b.dying && distance(b.pos, fx.eye) < 22)) teach('fire', 'CLICK TO FIRE · AIM LOW TO BURST THE SAC · Z SHOVES WHAT GETS CLOSE');
    if (ropes.some((r) => r.active && r.s - s < 30)) teach('hop', 'SPACE HOPS THE ROPE · OR SPLIT IT AT A WALL ANCHOR');
    if (state.leaks.length) teach('patch', 'HOLD G TO PATCH: FIND THE HISS, PRESS, PUMP');
    if (track.nextRoom(s, 'pool')?.sec.junction && track.nextRoom(s, 'pool').s0 - s < 40) teach('gate', 'SHOOT AN ARROW TO CHOOSE A GATE');
    if (holding?.sec.dock) teach('moor', 'E MOORS AT THE DOCK · SPACE DEPARTS · G PATCHES WHILE THE WATER IS STILL');
    if (sec.paddle) teach('paddle', 'HOLD V TO PADDLE · THE CREW PADDLES IF YOU SHOOT');
    if (time > 40) teach('profiles', '1–5 OR TAB: BLASTER PROFILES · B PINGS A TARGET OR CHECKS THE RADIO');
  }

  /** Fire the selected profile. Pulse and Repeater shoot a ray; Scatter a short cone; Disruptor a heavy shot; Hook a line. */
  function fireProfile(eye, look, aimDir) {
    const P = PROFILES[state.profile] || PROFILES.pulse;
    shotProfile = state.profile;
    const muzzle = blaster.muzzle(eye, look, aimDir);
    if (state.profile === 'hook') return throwHook(eye, aimDir);
    const base = state.damage;
    state.damage = base * P.damage * (state.downed ? 0.6 : 1);
    if (state.profile === 'scatter') {
      const rgt = normalize(cross(aimDir, UP));
      const upv = cross(rgt, aimDir);
      let to = null;
      for (let k = 0; k < P.pellets; k++) {
        const a = (k / P.pellets) * Math.PI * 2, r = k ? P.spread : 0;
        const d = normalize(add(aimDir, add(scale(rgt, Math.cos(a) * r), scale(upv, Math.sin(a) * r))));
        const hitAt = shoot(eye, d, P.range);
        to ||= hitAt;
      }
      blaster.showBeam(muzzle, to);
      shake = Math.max(shake, 0.18 * settings.camera);
    } else {
      blaster.showBeam(muzzle, shoot(eye, aimDir));
      if (state.profile === 'disruptor') shake = Math.max(shake, 0.25 * settings.camera);
    }
    state.damage = base;
    sound.accent?.('shot');
  }

  /** The hook line: equipped deliberately, thrown at what you aim at. While the line is loaded you are not shooting. */
  function throwHook(eye, dir) {
    const range = gear('hookgear') ? 24 : 16;
    const hooks = [];
    const H = (pos, r, fn, label) => hooks.push({ pos, r, fn, label });
    for (const c of caches) if (c.active) H(c.pos, 0.9, () => { c.active = false; give(c.item); }, 'supplies');
    for (const k of pickups) if (k.active && !k.done) H(track.lateral(k.s, k.lane, 1.9), 0.8, () => { k.done = true; k.active = false; give(k.item === 'tag' ? 'parts' : k.item); }, 'pickup');
    for (const f of floaters) if (f.active && f.state === 'floating') H(track.lateral(f.s, f.offset, 0.1), 1, () => { f.state = 'gone'; if (f.survivor) { state.rescued += 1; state.stats.survivors += 1; give('cell'); hud.say('VOICE · IN THE WATER', 'You came back. You came back for me.', 'voice'); hud.toast(`SURVIVOR HAULED IN ON THE LINE · ${state.rescued} RESCUED`); } else { held = 1.5; sound.gurgle(); hud.caption('[it was never breathing. It holds the line — then lets go]'); } }, 'floater');
    if (trailGrab?.pos) H(trailGrab.pos, 0.9, () => { trailGrab.lean += 1.6; hud.caption('[you haul on the line against the grip]'); }, 'grip');
    if (crewGrab) H(crewGrab.handPos || [0, -500, 0], 0.9, () => { crewGrab.tension = Math.min(100, crewGrab.tension + 25); crewGrab.hooked = true; hud.caption('[the hook catches the vest — now you can pull]'); }, 'crew');
    if (room.tether && holding) H(room.tether.matrix ? [room.tether.matrix[12], room.tether.matrix[13], room.tether.matrix[14]] : [0, -500, 0], 1, () => hud.toast('LINE ON THE MOORING POST · E to moor'), 'post');
    let best = range, pick = null;
    for (const h of hooks) { const d = raySphere(eye, dir, h.pos, h.r); if (d < best) { best = d; pick = h; } }
    const to = pick ? pick.pos : add(eye, scale(dir, Math.min(range, rayPlaneY(eye, dir, track.at(s).p[1]) || range)));
    hookLine = { t: 0, to, pick };
  }

  function updateHook(dt, base) {
    if (!hookLine) { hide(hookRope); hide(hookHead); return; }
    hookLine.t += dt;
    const out = Math.min(1, hookLine.t / 0.35);
    const back = hookLine.t > 0.35 ? Math.min(1, (hookLine.t - 0.35) / (gear('hookgear') ? 0.4 : 0.7)) : 0;
    const from = add(base, [0, 0.9, 0]);
    const tip = add(from, scale(sub(hookLine.to, from), out * (1 - back)));
    stretch(hookRope, from, tip, 0.02);
    writeYaw(hookHead.matrix, tip, time * 3, 1, 1, 1);
    if (hookLine.t > 0.35 && !hookLine.done) {
      hookLine.done = true;
      if (hookLine.pick) { hookLine.pick.fn(); sound.pickup(); state.stats.shared += hookLine.pick.label === 'supplies' ? 1 : 0; }
      else sound.splash();
    }
    if (back >= 1) hookLine = null;
  }

  /** Shove: dependable the first time, weaker if you keep spamming it. Knocks off climbers, staggers what is close. */
  function shove(eye, fwd) {
    if (shoveCool > 0) return;
    shoveCool = 0.35;
    const power = shoveFatigue < 2 ? 1 : shoveFatigue < 4 ? 0.5 : 0.2;
    shoveFatigue += 1;
    state.stats.shoves += 1;
    sound.shove();
    if (climber) {
      climber.hp -= power * (climber.lean > 1 ? 3 : 1.2);
      if (climber.hp <= 0) knockClimber('shove');
      else hud.caption(power < 0.5 ? '[your arms are spent — the shove barely moves it]' : '[it slips — but holds on. Lean away and shove again]');
      return;
    }
    let any = false;
    for (const b of blooms) if (b.active && !b.dying && distance(b.pos, eye) < 3.4) {
      b.stagger = 0.9 * power;
      b.flinch = power; // interrupted: it backs off before it comes again
      b.pos = add(b.pos, scale(normalize(sub(b.pos, eye)), 2.5 * power));
      any = true;
    }
    for (const sh of shots) if (sh.active && distance(sh.pos, eye) < 2.5) { sh.reflect = true; any = true; }
    if (any && power < 0.5) hud.caption('[tired arms — the shove is weak]');
  }

  function knockClimber(how) {
    sound.splash();
    hud.caption(how === 'shove' ? '[you shove it off the side — it goes under without a splash]' : '[it lets go of the raft]');
    events.score(120, 'CLIMBER REPELLED');
    climber = null;
    protect = Math.max(protect, 1.5);
  }

  /** Ping: mark what you are aiming at. With nothing to mark, it is a radio check — the only dependable way to verify a voice. */
  function ping(eye, dir) {
    sound.ping();
    let best = 60, mark = null;
    for (const t of targets()) { const d = raySphere(eye, dir, t.pos, t.r * 1.8); if (d < best) { best = d; mark = t; } }
    pingPos = mark ? [...mark.pos] : add(eye, scale(dir, Math.min(40, rayPlaneY(eye, dir, track.at(s).p[1]) || 20)));
    pingT = 4;
    pinged = mark?.key && mark.key.core ? mark.key : null;
    const who = crewAvailable()[0]?.toUpperCase();
    if (time - callerAt < 25 && callerWho) {
      sound.radio();
      const real = crewAvailable().map((c) => c.toUpperCase());
      if (real.includes(callerWho)) hud.say(callerWho, 'That wasn\'t me. I haven\'t said a word since the junction. Where did you hear it?', 'crew');
      else hud.say(who || state.name.toUpperCase(), `Nobody on the radio said that. ${callerWho} hasn't answered in a while.`, 'crew');
      hud.caption('[radio check: the voice you heard was not on the radio]');
      callerAt = -100;
      return;
    }
    if (!who) { hud.caption('[radio check: static. Nobody answers. You are alone on this channel.]'); return; }
    if (pinged) hud.say(who, pick(['On it.', 'Got the Bloom. Covering.', 'Marked. Watching it.']), 'crew');
    else if (mark?.key === 'strap') hud.say(who, 'A person. Hanging on the window. Shoot the restraint — carefully.', 'crew');
    else if (mark) hud.say(who, pick(['Seen.', 'Got it marked.', 'Yep. I see it.']), 'crew');
    else {
      // A radio check: everyone counts off.
      const all = crewAvailable();
      hud.say(state.name.toUpperCase(), 'Radio check. Count off.', 'crew');
      all.forEach((c, i) => setTimeout(() => hud.say(c.toUpperCase(), pick(['Here.', 'Here. Still here.', 'Here — keep going.']), 'crew'), 700 + i * 650));
    }
  }

  /** The crew covers whoever can't shoot: a paddler, a patcher, someone in the water. Alone, nobody does. */
  function crewCover(dt, eye, busy) {
    coverBeam -= dt;
    const crew = crewAvailable().length;
    if (!crew) return;
    coverT -= dt * (busy ? 1 : 0.4) * (0.5 + crew / 6);
    if (coverT > 0) return;
    coverT = 1.4;
    const live = blooms.filter((b) => b.active && !b.dying && distance(b.pos, eye) < 24);
    const target = (pinged && live.includes(pinged) ? pinged : null) || live.sort((a, b) => distance(a.pos, eye) - distance(b.pos, eye))[0];
    if (!target) return;
    target.hp -= 1;
    target.flash = 0.12;
    target.stagger = 0.3;
    if (target.hp <= 0) { target.dying = 0.001; sound.burst(); events.cleared(); }
    if (!((state.regrouped || state.sectorIndex > 0) && !state.endless) && !state.endless) return; // still on the other channel
    coverFrom = track.lateral(s + 1.6, offset - 0.7, 1.15);
    coverTo = [...target.pos];
    coverBeam = 0.08;
    sound.fire();
  }

  function freeRestrained() {
    restrained.freed = true;
    sound.gate();
    state.rescued += 1;
    state.stats.survivors += 1;
    events.score(400, 'SURVIVOR CUT DOWN');
    events.log?.('rescue', { what: 'restrained survivor' });
    hud.say('VOICE · AT THE WINDOW', 'I\'m down — I\'m down. I know the service spillway. I\'ll open it for you. Supplies on the ledge. Go.', 'voice');
    // The rescue changes the route: the dock's service gate opens without the circuit, and supplies come down.
    (state.power ||= {})[state.sectorKey] ||= 'survivor';
    const c = caches.find((x) => !x.active);
    if (c) Object.assign(c, { active: true, pos: track.lateral(restrained.s + 6, 0, 2.4), falling: 0.001, item: 'cell' });
    setTimeout(() => hud.toast('SERVICE GATE OPENED BY THE SURVIVOR · THE SAFE ROOM ROUTE IS OPEN'), 2500);
  }

  function hitAnchor(i) {
    ballast.anchors[i] -= state.damage;
    sound.hit();
    hud.hitmarker();
    if (ballast.anchors[i] <= 0) {
      sound.burst();
      hud.caption(`[an anchoring growth tears free — ${ballast.anchors.filter((a) => a > 0).length} left]`);
      if (ballast.anchors.every((a) => a <= 0)) {
        ballast.exposed = true;
        sound.duck(1.5);
        hud.say('DEZ', 'It\'s loose! There — the middle, the red bit. Everything into it!', 'crew');
      }
    }
  }

  /**
   * The water as one system: a pump reverses or a diverter swings, and every layer agrees at once — the
   * surface ripples, foam and debris change direction, the raft starts pulling, the sound shifts, the crew braces.
   */
  let flowT = 0;
  let dockSeq = null;
  function reverseFlow(dir, caption) {
    const sec = track.sectionAt(s).sec;
    sec.bias = dir * 1.1;
    for (const d of debrisPool) if (d.active) d.drift = dir;
    flowT = 2.4;
    ripple = track.lateral(s + 6, 0, 0);
    rippleTime = time;
    sound.release(dir * 0.6);
    sound.duck(1.5);
    shake = Math.max(shake, 0.25 * settings.camera);
    hud.caption(`[${caption}]`);
  }

  /** Things the paddle finds. Only ever while you are paddling, in still water. */
  function paddleEvent(kind) {
    if (kind === 'deep') hud.caption('[the paddle goes in up to your shoulder. It doesn\'t find the bottom. The chart says one metre twenty.]');
    else if (kind === 'held') {
      bladeHeld = 1.4;
      velX += 2.2;
      sound.gurgle();
      hud.caption('[something holds the blade — then lets go]');
    } else if (kind === 'struck') {
      sound.thump(0.6);
      hud.caption('[the blade hits something soft. It moves away from the raft.]');
    }
  }

  function hop(power) {
    jumpV = (state.fit === 'handling' ? 5.2 : 4.3) * power;
    lastHop = time;
    sound.splash();
  }

  /** Ride control: the park steers. It reads the water well and it is very smooth. */
  function autopilotSteer(lim) {
    let target = 0;
    const near = (list) => list.filter((x) => x.active && x.s > s && x.s - s < 40).sort((a, b) => a.s - b.s)[0];
    const g = near(gateSets), d = near(debrisPool), k = near(pickups);
    if (ramp.active && ramp.s > s && ramp.s - s < 60) target = ramp.lane;
    else if (g) target = g.lane;
    else if (k) target = k.lane;
    if (d && Math.abs(target - d.lane) < 1.4) target = d.lane + (d.lane > 0 ? -2.2 : 2.2);
    for (const u of patches) if (u.active && u.s > s && u.s - s < 30 && Math.abs(target - u.offset) < 1.6) target = u.offset + (u.offset > 0 ? -2.4 : 2.4);
    target = clamp(target, -lim, lim);
    // It also calls the jumps.
    const jumpables = [ramp.active ? ramp.s : null, d?.s, ...ropes.filter((r) => r.active).map((r) => r.s), k?.s].filter((x) => x != null && x - s > 0);
    const next = Math.min(...jumpables, Infinity);
    if (next - s < speed * 0.45 && next - s > 0 && jumpY === 0 && time - attendantCall > 1.5) {
      attendantCall = time;
      hud.say('RIDE CONTROL', 'Please brace for the splash.', 'attendant');
      hop(1);
    }
    return clamp((target - offset) * 0.9 - velX * 0.35, -1, 1);
  }

  /** Mark and release: hold right mouse, sweep across targets, release for a linked volley. Each lock costs charge. */
  function updateLocks(dt, eye, look, aimDir) {
    const list = targets().filter((t) => t.key);
    if (input.locking && !braced) {
      if (locks.length < 6 && state.charge > 0) {
        let best = null, bestA = 0.14;
        for (const t of list) {
          if (locks.includes(t.key) || distance(eye, t.pos) > 45) continue;
          const a = angleTo(eye, aimDir, t.pos);
          if (a < bestA) { bestA = a; best = t; }
        }
        if (best) {
          lockTimer += dt;
          if (lockTimer > 0.12) {
            lockTimer = 0;
            locks.push(best.key);
            state.charge -= 1;
            sound.tick?.(locks.length);
          }
        } else lockTimer = 0;
      }
    } else if (locks.length) {
      // Release: the volley.
      volleyLines = [];
      const from = blaster.muzzle(eye, look, aimDir);
      for (const key of locks) {
        const t = list.find((x) => x.key === key);
        if (!t) continue;
        t.fn();
        const again = targets().find((x) => x.key === key);
        again?.fn();
        volleyLines.push([from, t.pos]);
        sound.accent?.('hit');
      }
      volleyT = 0.18;
      locks.length = 0;
      sound.fire();
    }
    volleyT -= dt;
    lockMarks.forEach((m, i) => {
      const t = locks[i] && list.find((x) => x.key === locks[i]);
      if (t) writeBasis(m.matrix, t.pos, cameraRight(eye, look), UP, normalize(sub(eye, t.pos)), 0.6, 0.6, 0.6);
      else hide(m);
    });
    volleyBeams.forEach((bm, i) => {
      const ln = volleyT > 0 && volleyLines[i];
      if (!ln) return hide(bm);
      const d = sub(ln[1], ln[0]);
      const z = normalize(d);
      const x = normalize(cross(Math.abs(z[1]) > 0.95 ? [1, 0, 0] : UP, z));
      writeBasis(bm.matrix, add(ln[0], scale(d, 0.5)), x, cross(z, x), z, 0.025, 0.025, Math.hypot(...d));
    });
  }
  const cameraRight = (eye, look) => normalize(cross(sub(look, eye), UP));

  function runDirector(dt, sec, curRoom) {
    const hurt = Math.max(0, lastHealth - state.health);
    lastHealth = state.health;
    const live = blooms.filter((b) => b.active && !b.dying && !b.retreat);
    const nearby = live.filter((b) => distance(b.pos, fx.eye) < 12).length;
    state.directorPhase = director.phase;
    // Everything demanding attention counts against the pressure budget: no extra swarm on top of a rescue.
    const busy = (overboard ? 1 : 0) + (crewGrab ? 0.8 : 0) + (trailGrab ? 0.8 : 0) + (ballast ? 1 : 0) + (climber ? 0.5 : 0) + (repairing ? 0.5 : 0) + (state.downed ? 1 : 0) + (sec.brake ? 0.25 : 0) + (hullFx.awash ? 0.3 : 0);
    for (const a of director.update(dt, { hurt, enemies: live.length, nearby, busy })) {
      if (a.type === 'unease' || a.type === 'warn') {
        hud.caption(a.caption);
        if (a.type === 'warn') {
          sound.pump(0);
          lampSagT = 0.9;
          if (!curRoom && !sec.paddle && random() < 0.3) setTimeout(() => reverseFlow(random() < 0.5 ? -1 : 1, 'a pump reverses somewhere — the current turns under the raft'), 1200);
        }
        else if (random() < 0.5) sound.splash();
      } else if (a.type === 'spawn' && !curRoom && sec.type !== 'lift') {
        // Groups arrive from more than one direction: ahead, from the wall grates, and behind the raft.
        for (let k = 0; k < a.count; k++) {
          const from = a.flank ? k % 3 : 0;
          if (from === 2) spawnBloom(s - 14 - random() * 8, (random() - 0.5) * sec.half, 0.8 + random() * 1.6);
          else if (from === 1) spawnBloom(s + 18 + random() * 14, (random() < 0.5 ? -1 : 1) * (Math.min(sec.half, 6) - 0.3), 0.3 + random() * 0.4);
          else spawnBloom(s + 35 + random() * 25, (random() - 0.5) * Math.min(sec.half, 6) * 1.4, 0.8 + random() * 2);
        }
        if (a.flank) hud.caption('[movement in the overflow grates — both walls]');
      } else if (a.type === 'recover') {
        // The swarm disperses; something useful drifts into reach; the crew breathes.
        for (const b of live) b.retreat = true;
        const c = caches.find((x) => !x.active);
        if (c && !curRoom) Object.assign(c, { active: true, pos: track.lateral(s + 30, (random() < 0.5 ? -1 : 1) * (Math.min(sec.half, 6) - 0.4), 2.4), falling: 0, item: ['cell', 'filter', 'parts'][Math.floor(random() * 3)] });
        const [who, line] = AFTERMATH[Math.floor(random() * AFTERMATH.length)];
        hud.say(who, line, 'crew');
        // The Attendant speaks in the quiet after danger, never during it.
        if (random() < 0.3) setTimeout(() => hud.say('THE ATTENDANT', 'Your party has qualified for the lower attractions.', 'attendant'), 5000);
      }
    }
    updateSetpiece(dt);
  }

  /** The pool hall scene: an impossible stairway, then a rope, the grates, and the Undertow. */
  function updateSetpiece(dt) {
    if (!setpiece.active) return;
    setpiece.t += dt;
    const sec = track.sectionAt(s).sec;
    const half = Math.min(sec.half, 6);
    if (setpiece.step === 0) {
      setpiece.step = 1;
      (state.sawStairway ||= {})[state.sectorKey] = true;
      hud.say('JUNE', 'Look up. That stairway behind the window. On my map it\'s below us. It\'s supposed to be below us.', 'crew');
    } else if (setpiece.step === 1 && setpiece.t > 9) {
      setpiece.step = 2;
      const r = ropes.find((x) => !x.active);
      if (r) {
        r.active = true;
        r.s = s + 28;
        r.floats.forEach((f, j) => Object.assign(f, { alive: true, pos: track.lateral(r.s, (j - 2) * 1.2, 1.25) }));
      }
      sound.thump();
      hud.caption('[a lane rope snaps taut across the channel — ahead]');
      hud.say('TUBS', 'Rope! Rope across the channel, pop the floats!', 'crew');
    } else if (setpiece.step === 2 && setpiece.t > 11) {
      setpiece.step = 3;
      for (let k = 0; k < 6; k++) spawnBloom(s + 12 + k * 3, (k % 2 ? -1 : 1) * (half - 0.3), 0.3);
      for (let k = 0; k < 2; k++) spawnBloom(s - 12 - k * 4, (random() - 0.5) * 3, 1.2);
      director.crescendo();
      hud.caption('[overflow grates bursting — both walls, and behind]');
      hud.say('DEZ', 'They\'re coming out of the grates! Both walls! Mars, far bank!', 'crew');
    } else if (setpiece.step === 3 && setpiece.t > 15) {
      setpiece.step = 4;
      const u = patches.find((x) => !x.active);
      if (u) Object.assign(u, { active: true, s: s + 9, offset, hp: 5, grabbed: false, warned: true });
      hud.say('MARS', 'Undertow, right under us! It\'s got the edge of the raft!', 'crew');
    } else if (setpiece.step === 4) setpiece.active = false;
  }
  const pick = (list) => list[Math.floor(random() * list.length)];
  const powered = () => !!(state.power || {})[state.sectorKey];

  const roomFrame = (r) => {
    const dir = [Math.sin(r.yaw), 0, Math.cos(r.yaw)];
    const right = [-Math.cos(r.yaw), 0, Math.sin(r.yaw)];
    const at = (u, v, h) => [r.origin[0] + dir[0] * u + right[0] * v, r.origin[1] + h, r.origin[2] + dir[2] * u + right[2] * v];
    return { dir, right, at };
  };
  const stopOf = (r) => r.s0 + r.sec.length * 0.42;

  let lastForkLow = false;
  const findItem = (id, list = plan.items) => {
    for (const it of list) {
      if (it.id === id) return it;
      if (it.exits) for (const ex of it.exits) { const f = findItem(id, ex.sections); if (f) return f; }
    }
    return null;
  };
  function decideFork(id, success, why) {
    if (!state.stats.routes.includes(why)) state.stats.routes.push(why);
    events.log?.('route', { label: why });
    if (id == null) return;
    track.choose(id, success ? 1 : 0);
    lastForkLow = !success;
    hud.toast(why);
    sound.accent?.(success ? 'gate' : 'low');
  }

  function spawnBloom(atS, off, y) {
    const b = blooms.find((x) => !x.active);
    if (!b) return;
    const spitter = sector.index >= 1 && atS > s && random() < 0.2;
    Object.assign(b, { active: true, hp: 2 + (sector.index > 3 ? 1 : 0) + (spitter ? 1 : 0), dying: 0, phase: random() * 6, pos: track.lateral(atS, off, y), drift: [(random() - 0.5) * 0.8, 0, 0], rear: atS < s, stagger: 0, flash: 0, retreat: false, spitter, spit: 2 + random() * 2, goal: null });
    b.heart.material.emissiveColor = spitter ? linear('#a78cde') : linear('#c45a50');
    return b;
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
      r.anchors = [2, 2];
      r.tight = false;
      sound.floatKnock(0);
      hud.say('DEZ', 'Rope across the channel. Pop the floats — or split it at the wall anchor!', 'crew');
    } else if (e.kind === 'hullScrape') {
      // A ladder rail under the surface: it opens the left chamber.
      sound.scrape(-0.8);
      shake = 0.4;
      hull.puncture(e.side || 'left', 'ladder');
      setTimeout(() => hud.say('JUNE', 'Left side! There\'s a ladder under the water. There shouldn\'t be a ladder in a reservoir.', 'crew'), 600);
    } else if (e.kind === 'grate') {
      hud.caption('[the overflow grate on the wall Blooms]');
      sound.gurgle();
      const side = random() < 0.5 ? -1 : 1;
      for (let k = 0; k < (e.count || 4); k++) spawnBloom(at + 6 + k * 2.5, side * (half - 0.6 - random()), 0.5 + random() * 1.2);
    } else if (e.kind === 'trailGrab') {
      if (overboard || capsize) return;
      trailGrab = { t: 0, hp: 4, lean: 0, pos: null };
      held = 5;
      sound.gurgle();
      hull.hit('stern', 12, 'entity', 0.6);
      hud.caption('[the Undertow has the trailing edge — the rear of the raft is going under]');
      hud.say('MARS', 'Weight forward and to a side! Everybody! Shoot the thing on the back!', 'crew');
    } else if (e.kind === 'crewStop') {
      if (isSolo()) return;
      crewStopped = 6;
      hud.caption('[everyone stopped paddling at once]');
      setTimeout(() => { hud.say('MARS', 'Don\'t. Listen.', 'crew'); sound.knock(2, -0.3); }, 1800);
      setTimeout(() => hud.caption('[under the raft — something keeping pace with you]'), 3800);
    } else if (e.kind === 'turnDrift') {
      turnDrift = 7;
      hud.caption('[the raft is turning. Nobody is steering it. The paddles are all straight.]');
    } else if (e.kind === 'tautLine') {
      tautLine = 7;
      hud.caption('[the safety line at the back is pulled tight into the water. Everyone is in the raft. One. Two. Three. Four.]');
    } else if (e.kind === 'wavesign') {
      Object.assign(wave, { active: true, s: at + 40 });
      sound.duck(2);
    } else if (e.kind === 'diverter') {
      Object.assign(wave, { divActive: true, divS: at, divSide: -1, divDone: false });
      hud.say(crewName(), 'Diverter relay on the left wall. Shoot it and the current takes us to the maintenance landing. Or don\'t, and we take the dock.', 'crew');
    } else if (e.kind === 'climber') {
      if (climber || overboard || capsize) return;
      climber = { side: random() < 0.5 ? -1 : 1, t: 0, lean: 0, hp: 2.5, pos: null };
      sound.splash();
      sound.duck(1);
      hud.caption(`[something has the ${climber.side < 0 ? 'left' : 'right'} side of the raft — it is climbing on]`);
      hud.say('MARS', `${climber.side < 0 ? 'Left' : 'Right'} side! Weight to the ${climber.side < 0 ? 'right' : 'left'} and shove it off!`, 'crew');
    } else if (e.kind === 'crewGrab') {
      const who = crewAvailable().filter((c) => state.crewState[c] === 'ok')[0];
      if (!who || crewGrab || overboard || capsize) return;
      crewGrab = { who, t: 0, tension: 50, hp: 4, low: 0, side: random() < 0.5 ? -1 : 1 };
      state.crewState[who] = 'grabbed';
      sound.intake(crewGrab.side * 0.7);
      sound.duck(1.5);
      hud.say(who.toUpperCase(), 'It\'s got my leg — it\'s got — PULL!', 'crew');
      hud.caption(`[the Undertow has ${who.toUpperCase()} over the ${crewGrab.side < 0 ? 'left' : 'right'} side. Hold E to keep the line tight — not too tight — and shoot the grip]`);
    } else if (e.kind === 'restrained') {
      if (restrained) return;
      restrained = { s: at + 45, side: random() < 0.5 ? -1 : 1, freed: false };
      hud.caption('[across the water, something hangs beside a maintenance window]');
    } else if (e.kind === 'ballast') {
      if (ballast) return;
      ballast = { s: at + 34, offset: (random() - 0.5) * 2, anchors: [6, 6, 6], core: 18 + sector.index * 2, exposed: false, surge: 6, warn: 0, t: 0, done: false };
      sound.intake(0);
      hud.caption('[the current turns. Everything floating in the room is drifting toward one spot.]');
      setTimeout(() => hud.say('JUNE', 'There\'s something in the middle of the room. Holding on to the walls. Holding the water.', 'crew'), 1800);
    } else if (e.kind === 'paddleHorror') {
      pendingPaddle.push(e.what);
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
    } else if (e.kind === 'floater') {
      const f = floaters.find((x) => !x.active);
      if (!f) return;
      Object.assign(f, { active: true, s: at, offset: (random() < 0.5 ? -1 : 1) * half * 0.45, survivor: e.survivor, state: 'floating', hp: 2 });
      hud.say('JUNE', 'Someone in the water ahead. Steer to them, or don\'t. I can\'t tell if they\'re breathing.', 'crew');
    } else if (e.kind === 'gates') {
      const lim = Math.min(half, 6) - 1;
      e.lanes.forEach((lane, k) => {
        const g = gateSets.find((x) => !x.active);
        if (g) Object.assign(g, { active: true, s: at + k * 11, lane: lane * lim, done: false });
      });
    } else if (e.kind === 'debris') {
      const d = debrisPool.find((x) => !x.active);
      if (d) Object.assign(d, { active: true, s: at, lane: e.lane * (Math.min(half, 6) - 1), done: false });
    } else if (e.kind === 'airPickup') {
      const k = pickups.find((x) => !x.active);
      if (k) Object.assign(k, { active: true, s: at, lane: e.lane * (half - 0.9), item: e.item, done: false });
    } else if (e.kind === 'ramp') {
      Object.assign(ramp, { active: true, s: at, lane: e.side * (Math.min(half, 6) - 1.3), fork: e.fork, decided: false });
      hud.say('TUBS', `Water's piling up on the ${e.side < 0 ? 'left' : 'right'} wall. That's a launch. Get in its lane and hop, or boost into it.`, 'crew');
    } else if (e.kind === 'sluice') {
      const side = random() < 0.5 ? -1 : 1;
      Object.assign(sluice, { active: true, side, pos: track.lateral(at, side * (half - 0.2), 2.3), yaw: facingYaw(at, side), hits: 0, fork: e.fork });
      hud.say('DEZ', 'Sluice control on the wall. Two hits opens the maintenance bypass. Miss it and we take the overflow.', 'crew');
    } else if (e.kind === 'stranded' || e.kind === 'rescue') {
      if (e.kind === 'rescue' && state.strandedSaved?.[state.sectorKey]) {
        decideFork(e.fork, true, 'THE DRAINER YOU PROTECTED OPENED THIS GATE');
        hud.say('???', 'Told you I\'d get it open. Go. I\'ll find my own way.', 'marco');
        return;
      }
      const side = random() < 0.5 ? -1 : 1;
      Object.assign(stranded, { active: true, s: at + 45, side, hp: 4, window: 12, spawnT: 1, fork: e.kind === 'rescue' ? e.fork : null, resolved: false });
      stranded.pos = track.lateral(stranded.s, side * (half + 0.2), 1.4);
      hud.say('JUNE', 'There\'s someone on the ledge ahead! A Drainer! They\'re working a door and the Blooms are going for them. Cover them!', 'crew');
    } else if (e.kind === 'bulkhead') {
      const f = findItem(e.fork);
      const forkS = f?.at ?? at + 120;
      const total = (forkS - at) / (sec.speed * 1.35);
      Object.assign(bulkhead, { active: true, fork: e.fork, forkS, t: total, total, decided: false });
      hud.say('MARS', 'Bulkhead\'s closing ahead! Boost! Shift, now!', 'crew');
    } else if (e.kind === 'crewRaft') {
      Object.assign(crewRaft, { active: true, sec, hits: 0, spawnT: 2 });
      hud.say('JUNE', 'That\'s us! The other raft, on the other side of the glass! There are Blooms behind them. Cover us through the gaps!', 'crew');
    } else if (e.kind === 'setpiece') {
      Object.assign(setpiece, { active: true, t: 0, step: 0 });
      photoPending = 'THE POOL HALL';
    } else if (e.kind === 'lockerRoom') {
      Object.assign(locker, { active: true, sec, s: at + 30, sameBox: !!e.sameBox });
      sec.pass = sec.pass || 1;
      if (e.sameBox) hud.caption('[the hum stops. Even the water is quiet]');
    }
  }

  /** chamber and cause say where the raft was hit and what did it: it can open a leak, or put you over the side. */
  function damage(n, reason, raftHit = 0, chamber = null, cause = null) {
    if (protect > 0) return; // just rescued: a moment to get your hands back
    events.damage(n, reason);
    if (raftHit) {
      const k = chamber || CHAMBERS[Math.floor(random() * 4)];
      const housed = k === 'bow' && gear('bow');
      hull.hit(k, raftHit * (housed ? 0.6 : 1.2), cause, cause ? (housed ? 0.08 : 0.22) : 0);
      const soft = CHAMBERS.filter((c) => state.chambers[c] < 20).length;
      if (state.raft <= 3) events.damage(999, 'The raft came apart under you.');
      else if (soft >= 2 && !hull.state.capsized) startCapsize();
      else if (!braced && cause && state.chambers[k] < 35 && random() < 0.3) goOverboard(cause === 'entity' ? 'knocked' : 'thrown');
    }
    shake = 0.5;
  }

  // ---------- Shooting ----------
  function targets() {
    const list = [];
    const T = (pos, r, fn, key = null) => list.push({ pos, r, fn, key });
    if (trailGrab?.pos) T(trailGrab.pos, 0.6, () => { trailGrab.hp -= shotProfile === 'scatter' ? 2 : 1; sound.hit(); }, 'grip');
    if (wave.divActive && !wave.divDone && wave.divPos) T(wave.divPos, 0.5, () => {
      // One shot, three layers that agree: the relay arcs, the water turns, the crew braces, the sound shifts.
      wave.divDone = true;
      wave.arcT = 0.6;
      state.landing = state.sectorKey;
      sound.disrupt();
      sound.pump(-0.6);
      reverseFlow(-1, 'the diverter swings — the current bends toward the maintenance landing');
      events.score(150, 'DIVERTER THROWN · MAINTENANCE LANDING');
    }, 'diverter');
    if (crewGrab?.gripPos) T(crewGrab.gripPos, 0.6, () => { crewGrab.hp -= shotProfile === 'scatter' ? 2 : shotProfile === 'disruptor' ? 2 : 1; sound.hit(); hud.hitmarker(); }, 'crewgrip');
    if (climber?.pos) T(climber.pos, 0.5, () => { climber.hp -= shotProfile === 'scatter' ? 2 : 0.5; sound.hit(); hud.hitmarker(); if (climber.hp <= 0) knockClimber('shot'); }, 'climber');
    if (restrained && !restrained.freed && restrained.strapPos) T(restrained.strapPos, 0.28, () => freeRestrained(), 'strap');
    if (ballast && !ballast.done) {
      ballast.anchorPos?.forEach((pos, i) => { if (ballast.anchors[i] > 0) T(pos, 0.7, () => hitAnchor(i), `anchor${i}`); });
      if (ballast.exposed) T(ballast.corePos, 1.1, () => { ballast.core -= state.damage; sound.hit(); hud.hitmarker(); ballastParts.core.material.emission = 12; }, 'ballast');
    }
    for (const b of blooms) if (b.active && !b.dying) T(b.pos, 0.75, () => {
      b.hp -= state.damage;
      sound.hit();
      hud.hitmarker();
      // Every hit reads: a flash, a stagger, a shove backwards.
      b.flash = 0.12;
      b.stagger = shotProfile === 'scatter' ? 0.7 : 0.3;
      b.pos = add(b.pos, scale(normalize(sub(b.pos, fx.eye)), shotProfile === 'scatter' ? 1.6 : 0.6));
      // Shoot low: the buoyant sac. Rupture it and the Bloom goes under.
      if (lastHitPoint && lastHitPoint[1] < b.pos[1] - 0.2 && b.hp > 0) {
        b.hp = 0;
        if (!saidHull.has('sac')) { saidHull.add('sac'); hud.caption('[the sac under it ruptures — it goes under like a stone]'); }
        events.score(40, 'SAC RUPTURED');
      }
      if (b.hp <= 0) {
        b.dying = 0.001;
        sound.burst();
        events.score(100, 'ENTITY DISPERSED');
        events.cleared();
        ripple = [...b.pos];
        rippleTime = time;
        sound.accent?.('hit');
      }
    }, b);
    for (const g of signals) if (g.active && !g.used) T(g.pos, 0.85, () => {
      g.used = 0.001;
      sound.heal();
      events.heal(16);
      events.score(50, 'SIGNAL · VITALS RESTORED');
      state.drift = Math.max(0, state.drift - 20);
    });
    // Split a Lane Rope at an anchor and the whole line drops. The Disruptor does it in one.
    for (const r of ropes) if (r.active) [-1, 1].forEach((side, i) => {
      const half = Math.min(track.sectionAt(r.s).sec.half, 6);
      T(track.lateral(r.s, side * (half - 0.15), 1.25), 0.4, () => {
        r.anchors = r.anchors || [2, 2];
        r.anchors[i] -= shotProfile === 'disruptor' ? 2 : 1;
        sound.hit();
        hud.hitmarker();
        if (r.anchors[i] <= 0) {
          r.floats.forEach((f) => (f.alive = false));
          r.active = false;
          sound.splash();
          events.score(200, 'ROPE ANCHOR SPLIT');
          events.cleared();
          hud.caption('[the anchor tears out of the tile — the whole rope drops into the water]');
        }
      }, `ropeanchor${i}`);
    });
    for (const r of ropes) if (r.active) for (const f of r.floats) if (f.alive) T(f.pos, 0.45, () => {
      f.alive = false;
      sound.burst();
      hud.hitmarker();
      sound.accent?.('snap');
      if (r.floats.every((x) => !x.alive)) {
        events.score(150, 'LANE ROPE CUT');
        r.active = false;
        events.cleared();
      }
    }, f);
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
    for (const f of floaters) if (f.active && f.state !== 'gone') T(track.lateral(f.s, f.offset, 0.1), 0.7, () => {
      hud.hitmarker();
      if (f.survivor) {
        f.state = 'gone';
        hud.say('JUNE', 'They flinched. They were alive. They went under.', 'crew');
        state.drift = Math.min(100, state.drift + 8);
      } else if (--f.hp <= 0) {
        f.state = 'gone';
        sound.burst();
        events.cleared();
      }
    });
    if (sluice.active) T(sluice.pos, 0.75, () => {
      sluice.hits += 1;
      hud.hitmarker();
      sound.accent?.('valve');
      if (sluice.hits >= 2) {
        sluice.active = false;
        decideFork(sluice.fork, true, 'SLUICE OPEN · YOU SHOT THE CONTROL, SO THE BYPASS IS OPEN');
      }
    }, sluice);
    for (const sh of shots) if (sh.active && !sh.reflect) T(sh.pos, 0.45, () => { sh.active = false; sound.hit(); hud.hitmarker(); }, sh);
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

  function shoot(eye, dir, range = 60) {
    let best = range, hit = null;
    for (const t of targets()) {
      const d = raySphere(eye, dir, t.pos, t.r);
      if (d < best) { best = d; hit = t.fn; }
    }
    lastHitPoint = add(eye, scale(dir, best));
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
    lastHitPoint = add(eye, scale(dir, best));
    if (hit) { sparkAt = lastHitPoint; sparkT = 0.09; spark.material.emissiveColor = (PROFILES[shotProfile] || PROFILES.pulse).color; }
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
      sound.setSpace(sec.reservoir ? 'reservoir' : sec.hall || sec.type === 'pool' ? 'hall' : sec.type === 'tube' ? 'tube' : sec.open || sec.sky ? 'dry' : 'tile');
      if (sec.type === 'lift') hud.say('TUBS', 'Lift. We can\'t get off. Don\'t look in the windows.', 'crew');
      if (sec.aqueduct) setTimeout(() => hud.say('JUNE', 'This isn\'t on any floor of the map. We\'re above the building. There is no above the building.', 'crew'), 6000);
      if (sec.type === 'overflow' && lastForkLow) hud.caption('[the lower channel is dark and loud]');
      if (sec.type === 'tube' && sec.muffle) hud.caption('[pressure tube — sound goes dull]');
    }

    // Speed
    let target = sec.type === 'pool' ? 3.2 : sec.speed;
    // Paddling: hold V. The blaster goes down; one steady stroke rhythm, never mashing. S while paddling backstrokes.
    const wantPaddle = input.paddling && !overboard && !capsize && !state.sitting && sec.type !== 'lift';
    paddleT = damp(paddleT, wantPaddle ? 1 : 0, 8, dt);
    const paddling = wantPaddle && paddleT > 0.6;
    const backstroke = paddling && (isDown('s') || isDown('arrowdown'));
    const boosting = isDown('shift') && !['lift', 'pool', 'bay'].includes(sec.type) && !sec.paddle;
    const braking = (isDown('s') || isDown('arrowdown')) && !!sec.brake && !paddling;
    if (boosting) target *= 1.6;
    if (braking) target *= 0.38;
    if (paddling && !backstroke) target += sec.paddle ? 3.4 : 1;
    if (backstroke) target = Math.max(0, target - (sec.paddle ? 1.5 : 2.6));
    // In still water the crew paddles too, so you can shoot. Alone, nobody does. If they all stop at once, listen.
    if (sec.paddle && !paddling && !isSolo() && crewStopped <= 0) target += 1.6;
    if (paddling) {
      strokeTimer -= dt;
      if (strokeTimer <= 0) {
        strokeTimer = 1.05;
        sound.stroke(0.55);
        if (pendingPaddle.length && sec.paddle && random() < 0.35) paddleEvent(pendingPaddle.shift());
      }
      strokePhase = 1 - strokeTimer / 1.05;
    } else strokeTimer = 0.2;
    if (bladeHeld > 0) { bladeHeld -= dt; target *= 0.4; }
    crewStopped = Math.max(0, crewStopped - dt);
    if (overboard) target = Math.min(target, 1.4);
    if (capsize) target = Math.min(target, 0.6);
    target *= hullFx.speedScale;
    if (state.raft < 40) target *= 0.85;
    if (held > 0) target *= 0.3;
    held = Math.max(0, held - dt);
    if (trailGrab) target *= 0.25;
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
    const steerIn = clamp((isDown('a') || isDown('arrowleft') ? -1 : 0) + (isDown('d') || isDown('arrowright') ? 1 : 0) + input.move[0], -1, 1);
    if (wasPressed('t')) {
      state.autopilot = !state.autopilot;
      hud.toast(state.autopilot ? 'RIDE CONTROL IS STEERING · it is very smooth · Drift rises while you let it' : 'YOU HAVE THE RAFT');
    }
    const lim = Math.max(0.5, Math.min(sec.half, 6) - 0.95);
    // The hull: leaks drain, a soft side lists and pulls, low chambers let the water in.
    hullFx = hull.update(dt, { silence: silence > 0, onWash: () => { state.drift = Math.min(100, state.drift + 3); shake = Math.max(shake, 0.25); } });
    const hurtNow = state.health < lastHullHealth - 0.5;
    lastHullHealth = state.health;
    const rep = overboard || capsize ? { active: false, prompt: '' } : hull.updateRepair(dt, input.patching && !paddling, hurtNow, ['buildup', 'peak'].includes(director.phase));
    repairing = rep.active;
    hullPrompt = rep.prompt;
    if (hull.state.knockAt > 0) {
      hull.state.knockAt += dt;
      if (hull.state.knockAt > 9 && !holding) knockUnderPatch();
    }
    hullLines(sec);
    tips(sec);
    let swimPrompt = '';
    if (overboard) {
      swimPrompt = updateOverboard(dt, steerIn, lim);
      offset = damp(offset, 0, 0.6, dt);
      velX = damp(velX, 0, 2, dt);
    } else if (capsize) {
      updateCapsize(dt);
      velX = damp(velX, 0, 2, dt);
    } else if (trailGrab) {
      // The Undertow has the trailing edge. Throw your weight to a side (A or D) and shoot the grip (hold X to look back).
      trailGrab.t += dt;
      if (Math.abs(steerIn) > 0.5) trailGrab.lean += dt;
      else trailGrab.lean = Math.max(0, trailGrab.lean - dt * 0.5);
      hull.hit('stern', dt * (trailGrab.lean > 0.3 ? 1 : 5), null);
      if (trailGrab.lean > 2.6 || trailGrab.hp <= 0) {
        hud.toast(trailGrab.hp <= 0 ? 'SHOT THE GRIP · THE TRAILING EDGE COMES UP' : 'COUNTERWEIGHT · THE TRAILING EDGE COMES UP');
        trailGrab = null;
        held = 0;
      } else if (trailGrab.t > 6) {
        trailGrab = null;
        goOverboard('dragged');
      }
    }
    if (holding) {
      viewYaw = clamp(viewYaw - steerIn * dt * 1.6, -1.2, 1.2);
      offset = damp(offset, 0, 3, dt);
      velX = 0;
    } else {
      viewYaw = damp(viewYaw, 0, 3, dt);
      // The raft has weight: steering accelerates it sideways, water drag slows it, currents push it.
      let steer = steerIn;
      if (state.autopilot && Math.abs(steerIn) < 0.1) steer = autopilotSteer(lim);
      if (state.downed) steer = autopilotSteer(lim); // you're on the floor of the raft; the crew steers
      if (state.autopilot) state.drift = Math.min(100, state.drift + dt * 0.35);
      if (overboard || capsize) steer = 0;
      const accel = (state.fit === 'handling' ? 15 : 10) * (paddling ? 1.4 : 1) * settings.steer;
      const current = (sec.current || 0) * Math.sin(s * 0.035 + sec.id);
      // A soft side pulls the raft toward its wall. So does the water sometimes, with nobody steering.
      if (turnDrift > 0) turnDrift -= dt;
      velX += (steer * accel - velX * 2.6 + current * 2.4 + (sec.bias || 0) * 2.4 + (state.passenger.stage >= 5 ? 1.2 : 0) + hullFx.pull + (turnDrift > 0 ? 1.6 : 0)) * dt;
      // Push off: paddling near a wall, the blade shoves the raft away instead of letting it scrape.
      if (paddling && Math.abs(offset) > lim - 0.45) velX -= Math.sign(offset) * 14 * dt;
      offset += velX * dt;
      if (Math.abs(offset) > lim) {
        if (Math.abs(velX) > 2.4 && jumpY < 0.1) {
          if (paddling) {
            sound.stroke(Math.sign(offset) * 0.8);
            if (!saidHull.has('pushoff')) { saidHull.add('pushoff'); hud.caption('[you push off the tile with the blade]'); }
          } else {
            sound.scrape(Math.sign(offset) * 0.7);
            hull.hit(offset < 0 ? 'left' : 'right', 4, 'scrape', 0.25);
            hud.caption('[the raft scrapes the tile]');
            // The same scrape, at the same point, on a different slide.
            if (state.scrapeMark == null) state.scrapeMark = { f: s / track.length, sector: state.sectorKey };
          }
        }
        offset = clamp(offset, -lim, lim);
        velX *= -0.25;
      }
      if (state.scrapeMark && state.scrapeMark.sector !== state.sectorKey && !saidHull.has('echo') && Math.abs(s / track.length - state.scrapeMark.f) < 0.003) {
        saidHull.add('echo');
        sound.scrape(-0.6);
        hud.caption('[that scrape again. The same scrape, at the same point, on a different slide.]');
      }
      // Hop: Space. Clears low ropes, floating debris and still water; the launch on a ramp.
      if (wasPressed(' ') && !state.sitting && !overboard && !capsize && jumpY <= 0.001 && sec.type !== 'lift' && !curRoom) hop(hullFx.hopScale);
    }
    if (jumpY > 0 || jumpV > 0) {
      jumpV -= 12 * dt;
      jumpY = Math.max(0, jumpY + jumpV * dt);
      if (jumpY === 0) {
        jumpV = 0;
        shake = Math.max(shake, 0.3);
        sound.splash();
        sound.accent?.('land');
        state.noise = Math.min(100, state.noise + 12);
        ripple = track.lateral(s + 1, offset, 0);
        rippleTime = time;
        // Coming down on debris, or coming down soft, tears the rear chamber.
        // Brace before you land and the hull takes it.
        if (braced) hud.toast('BRACED FOR THE LANDING');
        else if (debrisPool.some((d) => d.active && Math.abs(d.s - s) < 3 && Math.abs(d.lane - offset) < 1.4)) hull.hit('stern', 8, 'landing', 0.7);
        else if (state.chambers.stern < 40 && random() < 0.4) hull.hit('stern', 5, 'landing', 0.5);
      }
    }
    // Brace: duck behind the hull. Safer, faster recharge, no firing.
    const nowBraced = input.bracing && !state.sitting && !overboard && !capsize && !paddling;
    if (nowBraced && !braced) braceStart = time;
    braced = nowBraced;
    state.braced = braced;

    // Drift: warm water, calm channels, isolation.
    // Beautiful, calm spaces are where people stop wanting to leave.
    const driftRate = (0.3 + sector.index * 0.1) * (sec.hall ? 2 : sec.calm ? 1.3 : 1) * (sec.sky ? 0.5 : 1);
    state.drift = Math.min(100, state.drift + dt * driftRate);
    if (boosting) state.drift = Math.max(0, state.drift - dt * 2);

    // Filters: hazardous channels use them up.
    if (sec.filter || sec.type === 'drop') useFilter(dt);

    // The director: quiet, warning, build-up, peak, fade, recovery.
    runDirector(dt, sec, curRoom);

    // Encounters ahead. During the director's rest, scheduled swarms stay away: quiet is part of the ride.
    for (const enc of track.encounters) {
      if (enc.e.done) continue;
      if (enc.e.kind === 'blooms' && director.phase === 'relax' && enc.s <= s + 70) { enc.e.done = true; continue; }
      const lead = enc.e.kind === 'wake' || enc.e.kind === 'distantRaft' ? 0 : 70;
      if (enc.s <= s + lead) spawn(enc);
      else break;
    }

    // Camera on the rail
    const swayOn = settings.sway ? 1 : 0;
    const bob = (Math.sin(time * 2.1) * 0.05 + Math.sin(time * 1.3) * 0.03) * swayOn;
    shake = Math.max(0, shake - dt);
    const jitter = shake > 0 ? [(Math.random() - 0.5) * shake * 0.3 * settings.camera, (Math.random() - 0.5) * shake * 0.3 * settings.camera, 0] : [0, 0, 0];
    // Sitting down in the water: the camera sinks toward the surface.
    sink = damp(sink, state.sitting ? 0.7 : 0, 1.5, dt);
    const duck = (braced ? 0.5 : 0) + (state.downed ? 0.75 : 0);
    let eye = add(track.lateral(s, offset, 1.35 + bob - sink - duck + jumpY - hullFx.sag), jitter);
    if (dockSeq) eye = add(eye, [0, Math.min(1, dockSeq.t / 1.2) * 0.45, 0]); // standing up to step out
    const ahead = track.lateral(s + 10, offset * 0.6, 1.2 + bob * 0.5 - sink * 1.6 - duck + jumpY * 0.6);
    let look = ahead;
    // Hold X to look back over the raft at whatever is chasing it.
    if (isDown('x')) look = add(eye, sub(eye, ahead));
    if (Math.abs(viewYaw) > 0.001) {
      const d = sub(ahead, eye);
      const c = Math.cos(viewYaw), sn = Math.sin(viewYaw);
      look = add(eye, [d[0] * c + d[2] * sn, d[1], -d[0] * sn + d[2] * c]);
    }
    let roll = (settings.distortion ? (state.passenger.stage >= 5 ? 0.1 : 0) + (state.raft < 40 ? 0.05 : 0) : 0) + hullFx.list * (settings.sway ? 1 : 0.4) * settings.camera;
    if (overboard) {
      // In the water, behind the raft, looking at it.
      eye = track.lateral(s - overboard.back, overboard.x, 0.25 + bob * 0.6);
      look = track.lateral(s + 3, offset, 0.5);
      roll = Math.sin(time * 1.7) * 0.06;
    }
    if (capsize) {
      const c = capsize.t;
      const under = c > 0.8 && c < 4.4;
      if (under) {
        eye = track.lateral(s, offset, -0.7);
        look = track.lateral(s + 3, offset * 0.8, 0.4);
      }
      roll = c < 0.8 ? (c / 0.8) * Math.PI * 0.9 : under ? 0.3 * Math.sin(c * 2) : 0;
    }
    const fwd = normalize(sub(look, eye));
    const rgt = normalize(cross(fwd, UP));
    const up = normalize(add(scale(UP, Math.cos(roll)), scale(rgt, Math.sin(roll))));
    state.cameraUp = up;
    fx.eye = eye; fx.look = look; fx.fwd = fwd;
    const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    let aimNdc = input.touch && !input.firing ? [0, 0] : [...input.aim];
    if (input.touch && input.firing && settings.aimAssist) {
      let bestD = 0.16;
      for (const t of targets()) {
        const p = project(eye, look, fov, aspect, t.pos, up);
        if (!p) continue;
        const d = Math.hypot(p[0] - aimNdc[0], p[1] - aimNdc[1]);
        if (d < bestD) { bestD = d; aimNdc = [p[0], p[1]]; }
      }
    }
    fov = damp(fov, focusing ? FOCUS_FOV : FOV, 9, dt);
    const aimDir = screenRay(eye, look, fov, aspect, aimNdc[0], aimNdc[1], up);
    hud.crosshair(aimNdc[0], aimNdc[1], false);

    placeSegments();
    placeRoom(curRoom || track.nextRoom(s - 2));
    placeRaft(dt, fwd, rgt, bob);
    updateEntities(dt, eye, fwd, aimDir);
    const coopPrompt = updateCoop(dt, eye, fwd, aimDir, steerIn, sec);

    // Holding pool decisions
    let prompt = '';
    if (holding) {
      const p = holding.sec;
      const chosen = p.exits[track.choices[p.id] ?? p.defaultExit ?? 0];
      const lines = [];
      if (p.dock) lines.push('E · Moor and explore the dock');
      lines.push(`SPACE · Depart through ${chosen.label.split('·')[0].trim()}`);
      lines.push('Shoot an arrow to switch gates · A/D look');
      if (state.leaks.length) lines.push('G · Patch now, while the water is still');
      const lockedEx = p.exits.findIndex((ex) => ex.locked && !powered());
      if (lockedEx >= 0 && state.overrides > 0) {
        lines.push(`O · Use a maintenance override (${state.overrides})`);
        if (wasPressed('o')) {
          state.overrides -= 1;
          (state.power ||= {})[state.sectorKey] = 'override';
          track.choose(p.id, lockedEx);
          sound.gate();
          hud.toast('MAINTENANCE OVERRIDE ACCEPTED · SERVICE GATE OPEN');
        }
      }
      prompt = lines.join('   ');
      if (p.dock && !holding.inspected) {
        holding.inspected = true;
        if (state.passenger.stage > 0) {
          hud.say('INSPECTION LAMP', 'RAFT OCCUPANCY: 2. CLEANSING AVAILABLE IN THE SAFE ROOM.', 'attendant');
          revealTimer = 2.5;
        } else hud.caption('[the inspection lamp sweeps the raft — clear]');
      }
      // Docking is a sequence, not a cut: the line goes over the post, the raft settles, you stand and step out.
      if (p.dock && wasPressed('e') && !dockSeq) {
        dockSeq = { t: 0 };
        sound.hookThrow();
        hud.caption('[the line goes over the mooring post — the raft settles against the landing]');
      }
      if (dockSeq) {
        dockSeq.t += dt;
        const post = [room.tether.matrix[12], room.tether.matrix[13] + 0.4, room.tether.matrix[14]];
        stretch(raft.line, add(raftSeat || eye, [0, -0.1, 0]), post, 0.025);
        if (dockSeq.t > 0.7 && !dockSeq.splash) { dockSeq.splash = true; sound.splash(); sound.footstep?.(0, true); }
        if (dockSeq.t > 1.7) {
          events.moor({ s, departed: [...departed] });
          return;
        }
        prompt = 'DOCKING · stepping out onto the landing';
      }
      if (wasPressed(' ')) {
        if (chosen.locked && !powered()) {
          sound.wrong();
          hud.toast('THAT GATE IS LOCKED · NO POWER');
        } else {
          departed.add(p.id);
          sound.gate();
          if (hull.state.knockAt > 0) hull.state.knockAt = 8.4; // pushing off: whatever is under the patch knocks
          if (chosen.route === 'bypass') hud.say('DEZ', 'Bypass. No Safe Room this time. Hope you\'ve got filters.', 'crew');
        }
      }
    }
    if (finished && curRoom?.sec.type === 'bay' && state.drift > 85) {
      // The door does not register you. Say your name until it does.
      prompt = `NO GUEST DETECTED · the door does not notice you · E · say your name out loud`;
      if (wasPressed('e')) {
        state.drift -= 6;
        hud.say(state.name.toUpperCase(), `${state.name}. ${state.name} ${state.band}. I'm here.`, 'crew');
      }
    } else if (finished && curRoom?.sec.type === 'bay') {
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
    if (coopPrompt) prompt = coopPrompt;
    if (swimPrompt) prompt = swimPrompt;
    else if (capsize) prompt = 'UNDER THE RAFT · HOLD YOUR BREATH';
    else if (trailGrab) prompt = 'THE UNDERTOW HAS THE TRAILING EDGE · HOLD A or D · counterweight · X look back and shoot the grip';
    else if (hullPrompt && (repairing || !prompt)) prompt = hullPrompt + (holding && !repairing ? '' : '');
    else if (paddling) prompt ||= sec.paddle ? 'PADDLING · A/D stroke a side · S backstroke · release to shoot' : 'PADDLING · blaster down';
    const rearCount = blooms.filter((b) => b.active && !b.dying && b.rear && distance(b.pos, eye) < 20).length;
    if (rearCount && !isDown('x')) prompt ||= `BEHIND THE RAFT · ${rearCount} · hold X to turn and shoot`;

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
    if (!focusing || input.scanning) hud.scan(scanText);

    // Blaster
    if (wasPressed('r')) blaster.recharge();
    if (state.downed && state.profile !== 'pulse') state.profile = 'pulse';
    const canFire = !braced && !(input.locking && state.profile === 'disruptor') && !paddling && !repairing && !overboard && !capsize;
    if (braced && !state.recharging) state.charge = Math.min(state.maxCharge, state.charge + dt * (state.fit === 'capacity' ? 14 : 10));
    // Profiles: 1–5, Tab or the wheel. The equipped one is always on the HUD.
    for (const id of PROFILE_ORDER) if (wasPressed(PROFILES[id].key)) selectProfile(id);
    if (wasPressed('tab') || wasPressed('cycle-')) selectProfile(PROFILE_ORDER[(PROFILE_ORDER.indexOf(state.profile) + (wasPressed('tab') ? 1 : PROFILE_ORDER.length - 1)) % PROFILE_ORDER.length]);
    if (blaster.trigger(dt, input.firing && canFire && !hookLine, true)) fireProfile(eye, look, aimDir);
    // Right mouse: the Disruptor acquires a volley; everything else focuses (magnifies) for a precise shot.
    focusing = input.locking && state.profile !== 'disruptor' && !overboard && !capsize;
    if (canFire && state.profile === 'disruptor') updateLocks(dt, eye, look, aimDir);
    else if (locks.length) locks.length = 0;
    if (wasPressed('z')) shove(eye, fwd);
    if (wasPressed('b')) ping(eye, aimDir);
    if (wasPressed('f')) burst(eye, aimDir);
    if (wasPressed('h') && state.dressings > 0 && state.health < 100 && !dressing) { dressing = 2.5; state.dressings -= 1; hud.toast('APPLYING A FIELD DRESSING'); }
    if (dressing > 0) { dressing -= dt; events.heal(dt * 16); }
    blaster.place(eye, look, aimDir, bob * 0.3 - Math.max(paddleT, repairing ? 1 : 0, overboard || capsize ? 1.4 : 0) * 0.45);

    voices(dt, sec, curRoom);

    // The Caller gives route advice in a crewmate's voice. It is not to be trusted.
    const nj = track.nextRoom(s, 'pool');
    if (nj && nj.sec.junction && nj.s0 - s < 110 && nj.s0 - s > 60 && !nj.sec.called && sector.index > 0) {
      nj.sec.called = true;
      if (random() < 0.5) {
        const ex = nj.sec.exits[Math.floor(random() * 2)];
        const who = pick(['DEZ', 'TUBS', 'JUNE', 'MARS'].filter((n) => n !== state.name.toUpperCase()));
        // The Caller borrows a crewmate's words, not their radio. Ping (B) for a radio check to verify.
        hud.say(`VOICE · ${random() < 0.5 ? 'LEFT' : 'RIGHT'} PASSAGE`, `${who[0] + who.slice(1).toLowerCase()} here. Take the ${ex.side < 0 ? 'left' : 'right'} gate. ${ex.side < 0 ? 'Left' : 'Right'} is safe. Trust me.`, 'voice');
        callerAt = time;
        callerWho = who;
      }
    }
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
      eye, target: look, up, fov, time,
      waterRipple: ripple, rippleTime: time - rippleTime,
      environment: { pointLights: gatherLights(eye), ambientIntensity: (sec.hall ? 0.5 : sec.sky ? 0.7 : 0.16) * (0.6 + lampSag * 0.4) },
      exposure: (sec.sky ? 0.95 : 1.05) - state.drift * 0.002,
      effects: {
        bloom: { strength: quality.bloom, threshold: 1, radius: 1.3 },
        vignette: settings.distortion ? Math.min(1, 0.32 + state.drift * 0.004) : 0.25,
        grain: settings.grain ? 0.035 : 0,
        saturation: 1 - state.drift * 0.006,
        temperature: sector.index === 0 ? 0.08 : -0.04,
      },
    });
    // The ride photo: taken by the park, at the top of a launch or a set piece.
    if (photoPending && (jumpV < 0.5 || setpiece.active)) {
      try {
        (state.photos ||= []).push({ sector: state.sectorKey, label: photoPending, url: canvas.toDataURL('image/jpeg', 0.5) });
        if (state.photos.length > 4) state.photos.shift();
      } catch {}
      photoPending = null;
    }
  }

  function useFilter(dt) {
    state.filter -= dt * (gear('filtration') ? 1.4 : 2.4);
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
      nextLine = 16 + random() * 14;
      // Leave silence: a third of the time, nobody says anything.
      if (random() < 0.33 && crewLine >= sector.crew.length) return;
      if (crewLine < sector.crew.length) {
        const [who, line] = sector.crew[crewLine++];
        state.crewLine = crewLine;
        hud.say(who, line, 'crew');
      } else if (state.drift > 60) hud.say('THE ATTENDANT', pick(AMBIENT.drift), 'drift');
      else if (state.drift > 40) hud.say('THE ATTENDANT', pick(AMBIENT.personal).replace('{name}', state.name).replace('{band}', state.band), 'attendant');
      else if (sector.index > 0 && random() < 0.3) {
        hud.say(`VOICE · ${random() < 0.5 ? 'LEFT' : 'RIGHT'} SIDE PASSAGE`, pick(AMBIENT.marco), 'voice');
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
        if (state.upgrades.includes('headlamp') || state.memory?.route) lines.push(`  ${state.memory?.route && !state.upgrades.includes('headlamp') ? 'JUNE\'S OLD ROUTE: ' : ''}${next.sec.exits[chosen].note}`);
      } else if (next.sec.type === 'bay') lines.push(`SAFE ROOM ARRIVAL BAY ${d ? `IN ${d} M` : 'HERE'}`);
      else if (next.sec.type === 'drop') lines.push(`SPILLWAY DROP IN ${d} M · NO CHECKPOINT`);
    }
    lines.push(`RAFT FIT: ${(state.fit || 'standard').toUpperCase()} · PILOT: ${state.autopilot ? 'RIDE CONTROL (T)' : 'YOU (T)'}${locks.length ? ` · LOCKS ${locks.length}` : ''}${braced ? ' · BRACED' : ''}`);
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
    for (const f of floaters) if (f.active && f.state === 'floating') cands.push({ obj: f, pos: track.lateral(f.s, f.offset, 0.1), need: 1, label: 'FIGURE IN THE WATER', done: (o) => `PULSE: ${(o.survivor === (hash(o.s) < 0.7)) ? 'FAINT' : 'NONE'} · READING UNRELIABLE` });
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
    const base = add(track.lateral(s + 0.85, offset, 0.08 + jumpY - hullFx.sag), [0, bob * 0.5, 0]);
    const upV = capsize && capsize.t > 0.6 && capsize.t < 4.4 ? scale(cross(rgt, fwd), -1) : cross(rgt, fwd);
    const list = (state.passenger.stage >= 5 ? 0.12 : 0) + hullFx.list * 1.4;
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
    raft.patches.forEach((p) => hide(p));
    writeBasis(raft.rope.matrix, add(base, scale(tiltUp, 0.08)), rgt, fwd, tiltUp, 1.06, 1.06, 1);
    raft.straps.forEach((st, i) => {
      const a = (i / raft.straps.length) * Math.PI * 2 + 0.3;
      const tangent = normalize(add(scale(rgt, -Math.sin(a)), scale(fwd, Math.cos(a))));
      writeBasis(st.matrix, add(add(add(base, scale(rgt, Math.cos(a) * 1.05)), scale(fwd, Math.sin(a) * 1.05)), scale(tiltUp, 0.05)), tangent, tiltUp, cross(tiltUp, tangent), 0.08, 0.56, 0.56);
    });
    const caseAt = add(add(add(base, scale(rgt, -0.25)), scale(fwd, 0.25)), scale(tiltUp, 0.12));
    writeBasis(raft.case.matrix, caseAt, rgt, tiltUp, fwd, 0.55, 0.22, 0.32);
    writeBasis(raft.caseStrap.matrix, add(caseAt, scale(tiltUp, 0.01)), rgt, tiltUp, fwd, 0.08, 0.235, 0.33);
    placeCrew(base, rgt, fwd, tiltUp);
    placeHull(dt, base, rgt, fwd, tiltUp);
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

  /** Climbers, the tug-of-war, the restrained survivor, Ballast, crew cover, pings, the hook. Returns a prompt. */
  function updateCoop(dt, eye, fwd, aimDir, steerIn, sec) {
    let prompt = '';
    protect = Math.max(0, protect - dt);
    lampSagT = Math.max(0, lampSagT - dt);
    flowT = Math.max(0, flowT - dt);
    for (const d of debrisPool) if (d.active && d.drift) d.lane = clamp(d.lane + d.drift * dt * 0.5, -2.2, 2.2);
    lampSag = lampSagT > 0 ? 0.45 + Math.abs(Math.sin(time * 31)) * 0.2 : damp(lampSag, 1, 3, dt);
    if (protect > 0) state.protectT = Math.max(state.protectT || 0, protect);
    shoveCool -= dt;
    shoveFatigue = Math.max(0, shoveFatigue - dt * 0.6);
    const base = track.lateral(s + 0.85, offset, 0.1);
    updateHook(dt, base);
    // Ping marker
    pingT -= dt;
    if (pingT > 0 && pingPos) writeYaw(pingMark.matrix, pinged?.active ? pinged.pos : pingPos, time * 2, 0.6 + Math.sin(time * 8) * 0.05, 0.6, 0.6);
    else hide(pingMark);
    // Crew cover fire
    const busy = paddleT > 0.5 || repairing || !!overboard || !!crewGrab || !!state.downed;
    crewCover(dt, eye, busy);
    if (coverBeam > 0 && coverFrom) stretch(crewBeam, coverFrom, coverTo, 0.03);
    else hide(crewBeam);
    // A climber: the raft lists toward it. Lean away (hold the other direction), then shove it off.
    if (climber) {
      climber.t += dt;
      if (Math.sign(steerIn) === -climber.side && Math.abs(steerIn) > 0.5) climber.lean += dt;
      else climber.lean = Math.max(0, climber.lean - dt * 0.4);
      velX += climber.side * (climber.lean > 1 ? 0.6 : 2.4) * dt;
      climber.pos = track.lateral(s + 1.1, offset + climber.side * 1.05, 0.55);
      writeBasis(climberPart.body.matrix, climber.pos, [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.22, 0.6, 0.18);
      writeYaw(climberPart.head.matrix, add(climber.pos, [0, 0.5, 0]), time, 0.15, 0.17, 0.15);
      prompt = climber.lean > 1 ? 'IT IS SLIPPING · Z / tap B · SHOVE IT OFF' : `SOMETHING ON THE ${climber.side < 0 ? 'LEFT' : 'RIGHT'} · hold ${climber.side < 0 ? 'D' : 'A'} to counterbalance · Z shove · Scatter`;
      if (climber.t > 7) {
        hull.hit(climber.side < 0 ? 'left' : 'right', 10, 'entity', 0.7);
        damage(10, 'Something climbed into the raft.');
        hud.caption('[it bites into the side chamber and drops back into the water]');
        if (climber.lean < 0.5 && random() < 0.4) goOverboard('knocked');
        climber = null;
      }
    } else { hide(climberPart.body); hide(climberPart.head); }
    // Tug-of-war: hold E to keep the line in the band; shoot the grip; don't pull so hard the line slips.
    if (crewGrab) {
      const g = crewGrab;
      g.t += dt;
      const pulling = isDown('e');
      g.tension += (pulling ? 34 : -22) * dt - 6 * dt;
      if (g.tension > 90) { g.tension = 35; sound.splash(); hud.caption('[too hard — the line slips through your hands]'); }
      g.tension = clamp(g.tension, 0, 100);
      if (g.tension < 28) g.low += dt; else g.low = Math.max(0, g.low - dt * 0.5);
      g.handPos = track.lateral(s + 1.4, offset + g.side * 2.2, 0.05);
      g.gripPos = add(g.handPos, [0, -0.1, 0]);
      stretch(tug.line, track.lateral(s + 1.2, offset + g.side * 0.9, 0.5), g.handPos, 0.025);
      writeYaw(tug.hand.matrix, g.handPos, 0, 0.12, 0.08, 0.16);
      writeYaw(tug.grip.matrix, add(g.handPos, [g.side * 0.4, -0.05, 0]), time, 0.5, 0.2, 0.45);
      const band = g.tension >= 28 && g.tension <= 78;
      prompt = `HOLD E · LINE TENSION ${Math.round(g.tension)} ${band ? '· GOOD' : g.tension < 28 ? '· SLACK — PULL' : '· TOO TIGHT — EASE OFF'} · shoot the grip beside ${g.who.toUpperCase()}`;
      if (g.hp <= 0) {
        sound.release(g.side * 0.7);
        state.crewState[g.who] = 'ok';
        state.stats.freed += 1;
        events.log?.('rescue', { what: `${g.who} from the Undertow` });
        events.score(300, `${g.who.toUpperCase()} PULLED FREE`);
        hud.say(g.who.toUpperCase(), pick(['Thank you. Thank you. Don\'t let go of that line again, I\'m keeping it.', 'You had me. You actually had me.', 'Okay. Okay. Nobody look at my leg.']), 'crew');
        setTimeout(() => hud.say('THE ATTENDANT', 'Thank you for returning your passenger to the designated seating area.', 'attendant'), 2200);
        protect = 3;
        crewGrab = null;
      } else if (g.low > 2.6 || g.t > 16) {
        sound.gurgle();
        state.crewState[g.who] = 'hurt';
        events.log?.('missed', { what: `${g.who} went under` });
        state.drift = Math.min(100, state.drift + 15);
        hud.caption(`[${g.who.toUpperCase()} goes under. The line comes back empty.]`);
        setTimeout(() => hud.say(g.who.toUpperCase(), 'I\'m — I came up in the other channel. I don\'t know how. I\'m cold. I\'m going to be quiet for a while.', 'crew'), 4000);
        crewGrab = null;
      }
    } else { hide(tug.line); hide(tug.hand); hide(tug.grip); }
    // The restrained survivor: far away, beside a window. Focus to see it; shoot the restraint.
    if (restrained) {
      const r = restrained;
      const half = Math.min(track.sectionAt(r.s).sec.half, 9);
      const wall = track.lateral(r.s, r.side * (half - 0.1), 3.6);
      writeYaw(restrainedPart.window.matrix, add(wall, [0, 0.3, 0]), track.at(r.s).yaw, 1.8, 1.2, 0.05);
      const body = track.lateral(r.s, r.side * (half - 0.5), r.freed ? -3 : 2.6);
      writeBasis(restrainedPart.body.matrix, body, [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.22, 0.75, 0.18);
      r.strapPos = add(body, [0, 0.95, 0]);
      if (!r.freed) writeYaw(restrainedPart.strap.matrix, r.strapPos, time, 0.6, 0.6, 0.6);
      else hide(restrainedPart.strap);
      if (!r.freed && focusing && Math.abs(r.s - s) < 60 && !r.seen) { r.seen = true; hud.caption('[through the focus: a person. Breathing. A strap at the wrist, tied to the window frame.]'); }
      if (r.s < s - 8) { if (!r.freed) { hud.caption('[the window falls behind. Nobody cut the strap.]'); events.log?.('missed', { what: 'restrained survivor' }); } restrained = null; hide(restrainedPart.body); hide(restrainedPart.strap); hide(restrainedPart.window); }
    } else { hide(restrainedPart.body); hide(restrainedPart.strap); hide(restrainedPart.window); }
    if (focusing && !input.scanning) {
      // Focus reads what is in the middle of the view: the Silent Scope moment.
      let best = 0.06, read = '';
      for (const f of floaters) if (f.active && f.state === 'floating') {
        const a = angleTo(eye, aimDir, track.lateral(f.s, f.offset, 0.1));
        if (a < best) { best = a; read = f.survivor ? 'FOCUS · FLOATER · BREATHING · chest moving · a survivor' : 'FOCUS · FLOATER · NOT BREATHING · it turned toward the light'; }
      }
      if (restrained && !restrained.freed && restrained.strapPos && angleTo(eye, aimDir, restrained.strapPos) < 0.05) read = 'FOCUS · RESTRAINT · one shot at the strap';
      if (ballast && !ballast.done) ballast.anchorPos?.forEach((pos, i) => { if (ballast.anchors[i] > 0 && angleTo(eye, aimDir, pos) < 0.05) read = 'FOCUS · ANCHOR GROWTH · tear it loose (Disruptor)'; });
      hud.scan(read);
    }
    if (wave.active) {
      const half = Math.min(track.sectionAt(wave.s).sec.half, 9);
      facing(wave.sign, track.lateral(wave.s, -(half - 0.1), 4.2), track.right(wave.s), 3.2, 1.4);
      writeYaw(wave.exit.matrix, track.lateral(wave.s + 30, 0, -0.05), track.at(wave.s + 30).yaw, 2.2, 0.02, 1.2);
      writeBasis(wave.exitSign.matrix, track.lateral(wave.s + 30, 0, 0.012), [1, 0, 0], [0, 0, 1], [0, 1, 0], 0.9, 0.34, 1);
      if (!wave.said && wave.s - s < 25) { wave.said = true; hud.caption('[the wave display reads 00:00. The water is perfectly still. Below the surface: a lit exit sign]'); }
      if (wave.s < s - 60) { wave.active = false; hide(wave.sign); hide(wave.exit); hide(wave.exitSign); }
    } else { hide(wave.sign); hide(wave.exit); hide(wave.exitSign); }
    if (wave.divActive) {
      const half = Math.min(track.sectionAt(wave.divS).sec.half, 9);
      wave.divPos = track.lateral(wave.divS, wave.divSide * (half - 0.25), 2);
      writeYaw(wave.diverter.matrix, wave.divPos, track.at(wave.divS).yaw, 0.5, 0.7, 0.4);
      wave.diverter.material.emission = wave.divDone ? 0.3 : 1.2 + Math.sin(time * 5) * 0.5;
      wave.arcT -= dt;
      if (wave.arcT > 0) stretch(wave.arc, wave.divPos, add(wave.divPos, [Math.sin(time * 70) * 0.5, 0.6, Math.cos(time * 53) * 0.5]), 0.02);
      else hide(wave.arc);
      if (wave.divS < s - 20) { wave.divActive = false; hide(wave.diverter); hide(wave.arc); }
    } else { hide(wave.diverter); hide(wave.arc); }
    // Trajectory preview: only when momentum, a current or a soft chamber is actually moving you.
    const sec0 = track.sectionAt(s).sec;
    const drive = Math.abs(velX) > 0.6 || Math.abs(hullFx.pull) > 0.3 || Math.abs(sec0.bias || 0) > 0.1;
    if (drive && !track.roomAt(s, 6) && !overboard && !capsize && !dockSeq) {
      let x = offset, v = velX;
      const lim = Math.max(0.5, Math.min(sec0.half, 6) - 0.95);
      traj.forEach((t, i) => {
        for (let k = 0; k < 4; k++) { v += (-v * 2.6 + (sec0.bias || 0) * 2.4 + hullFx.pull) * 0.06; x = clamp(x + v * 0.06, -lim, lim); }
        const at = s + 2 + speed * 0.24 * (i + 1);
        writeYaw(t.matrix, track.lateral(at, x, 0.02), track.at(at).yaw, 0.09, 0.01, 0.5);
      });
    } else traj.forEach(hide);
    // Impact sparks: where the shot landed, in the profile's colour.
    sparkT -= dt;
    if (sparkT > 0 && sparkAt) writeYaw(spark.matrix, sparkAt, 0, 0.08 + sparkT, 0.08 + sparkT, 0.08 + sparkT);
    else hide(spark);
    // Ballast: a heavy, defeatable mass anchored across the room. It holds the raft and the water.
    if (ballast) prompt = updateBallast(dt, eye) || prompt;
    else { hide(ballastParts.body); hide(ballastParts.core); ballastParts.anchors.forEach(hide); ballastParts.knots.forEach(hide); ballastParts.vests.forEach(hide); }
    // Gear: the emergency pressure reservoir, once per ride.
    if (gear('reservoir') && !reservoirUsed && hullFx.lowest < 25) {
      reservoirUsed = true;
      const k = CHAMBERS.reduce((a, b) => (state.chambers[a] <= state.chambers[b] ? a : b));
      state.chambers[k] = Math.min(100, state.chambers[k] + 45);
      hud.toast(`EMERGENCY RESERVOIR · ${CHAMBER_NAME[k]} +45`);
      sound.patch();
    }
    return prompt;
  }

  function updateBallast(dt, eye) {
    const b = ballast;
    if (b.done) return '';
    b.t += dt;
    const c = track.lateral(b.s, b.offset, -0.2);
    const yaw = track.at(b.s).yaw;
    const half = Math.min(track.sectionAt(b.s).sec.half, 8);
    const ends = [track.lateral(b.s - 4, -half, 2.2), track.lateral(b.s + 3, half, 3), track.lateral(b.s + 6, b.offset * 0.5, 0.2)];
    b.anchorPos = ends.map((e) => add(c, scale(sub(e, c), 0.62)));
    writeYaw(ballastParts.body.matrix, c, yaw + b.t * 0.1, 2.4, 1.2 + Math.sin(b.t * 1.3) * 0.1, 2.1);
    b.corePos = add(c, [0, 0.9, 0]);
    ballastParts.core.material.emission = b.exposed ? Math.max(3 + Math.sin(b.t * 6) * 2, ballastParts.core.material.emission * 0.9) : 0.02;
    writeYaw(ballastParts.core.matrix, b.corePos, 0, b.exposed ? 0.8 : 0.5, b.exposed ? 0.8 : 0.5, b.exposed ? 0.8 : 0.5);
    ends.forEach((e, i) => {
      if (b.anchors[i] > 0) { stretch(ballastParts.anchors[i], c, e, 0.22); writeYaw(ballastParts.knots[i].matrix, b.anchorPos[i], b.t, 0.55, 0.45, 0.5); }
      else { hide(ballastParts.anchors[i]); hide(ballastParts.knots[i]); }
    });
    ballastParts.vests.forEach((v, i) => writeYaw(v.matrix, add(c, [Math.cos(i * 1.7 + b.t * 0.2) * 2.2, 0.4 + (i % 2) * 0.3, Math.sin(i * 1.7 + b.t * 0.2) * 2.2]), i + b.t * 0.3, 0.4, 0.15, 0.3));
    // It holds the raft in the room and pulls it toward itself.
    const near = b.s - s;
    if (near < 18) {
      held = Math.max(held, 0.2);
      if (near < 14) s -= (14 - near) * dt * 2;
      velX += Math.sign(b.offset - offset) * 1.6 * dt;
      b.surge -= dt;
      if (b.surge < 1.6 && !b.warn) { b.warn = 1; sound.intake(Math.sign(b.offset - offset) * 0.4); sound.duck(1.6); hud.caption('[the water bulges toward the mass — get out of its lane]'); }
      if (b.surge <= 0) {
        b.surge = 6.5 + random() * 2;
        b.warn = 0;
        if (Math.abs(offset - b.offset) < 2.2) { damage(12, 'Ballast surged into the raft.', 8, 'bow', 'entity'); shake = 0.9 * settings.camera; }
        else hud.toast('CLEAR OF THE SURGE');
        if (random() < 0.6) spawnBloom(b.s - 4, (random() - 0.5) * 6, 0.8);
      }
    }
    if (b.core <= 0) {
      b.done = true;
      sound.burstBig();
      events.score(1000, 'BALLAST SUNK');
      events.cleared();
      hud.caption('[it lets go of the walls. The water goes slack. The vests come up one by one.]');
      setTimeout(() => hud.say('THE ATTENDANT', 'Your party has qualified for the lower attractions.', 'attendant'), 2500);
      for (const p of [ballastParts.body, ballastParts.core, ...ballastParts.anchors, ...ballastParts.knots, ...ballastParts.vests]) hide(p);
      give('cell');
      ballast = null;
      return '';
    }
    if (b.t > 110) {
      b.done = true;
      hud.caption('[it lets go, all at once, and sinks out of sight. It isn\'t dead. It is somewhere else now.]');
      for (const p of [ballastParts.body, ballastParts.core, ...ballastParts.anchors, ...ballastParts.knots, ...ballastParts.vests]) hide(p);
      ballast = null;
      return '';
    }
    return near < 22 ? (b.exposed ? 'BALLAST IS LOOSE · SHOOT THE CORE' : `BALLAST · tear the anchoring growths loose (${b.anchors.filter((a) => a > 0).length}) · stay out of its lane when the water bulges`) : '';
  }

  /** Scuffs, patches, leak bubbles, the paddle, and the safety line. */
  const CHAMBER_ANGLE = { right: 0, bow: Math.PI / 2, left: Math.PI, stern: -Math.PI / 2 };
  function onLip(base, rgt, fwd, up, chamber, u, r = 1.05, y = 0.24) {
    const a = CHAMBER_ANGLE[chamber] + (u - 0.5) * 1.1;
    return add(add(add(base, scale(rgt, Math.cos(a) * r)), scale(fwd, Math.sin(a) * r)), scale(up, y));
  }
  function placeHull(dt, base, rgt, fwd, up) {
    const marks = state.hullMarks || [];
    raft.marks.forEach((m, i) => {
      const mk = marks[i];
      if (!mk) return hide(m);
      const pos = onLip(base, rgt, fwd, up, mk.chamber, mk.u);
      const a = CHAMBER_ANGLE[mk.chamber] + (mk.u - 0.5) * 1.1;
      const tangent = normalize(add(scale(rgt, -Math.sin(a)), scale(fwd, Math.cos(a))));
      const outward = normalize(cross(up, tangent));
      if (mk.kind === 'patch') {
        m.material.color = mk.bench ? [0.62, 0.62, 0.56] : [0.42, 0.44, 0.4];
        // A patch that is lifting shows its corner.
        const lifting = state.leaks.some((l) => l.cause === 'lifting' && l.chamber === mk.chamber);
        writeBasis(m.matrix, pos, tangent, up, outward, 0.26, 0.05 + (lifting ? 0.04 * (1 + Math.sin(time * 6)) : 0), 0.18);
      } else {
        m.material.color = [0.12, 0.1, 0.08];
        writeBasis(m.matrix, pos, tangent, up, outward, 0.34, 0.03, 0.05);
      }
    });
    // Bubbles at each open leak, rising from the waterline. That's where the hiss is.
    const open = state.leaks.filter((l) => state.chambers[l.chamber] > 1).slice(0, 2);
    raft.bubbles.forEach((b, i) => {
      const l = open[Math.floor(i / 3)];
      if (!l) return hide(b);
      const t = (time * (0.8 + l.rate) + (i % 3) / 3) % 1;
      const p = onLip(base, rgt, fwd, up, l.chamber, l.u, 1.2 + (i % 3) * 0.04, -0.05 + t * 0.35);
      const r = 0.03 + (i % 3) * 0.012;
      writeYaw(b.matrix, p, 0, r, r, r);
    });
    // The paddle: blade dips at the right side, pulls back, lifts. One rhythm.
    if (paddleT > 0.05 && !overboard && !capsize) {
      const ph = strokePhase;
      const inWater = ph < 0.65;
      const fz = inWater ? 0.9 - (ph / 0.65) * 1.5 : -0.6 + ((ph - 0.65) / 0.35) * 1.5;
      const blade = add(add(add(base, scale(rgt, 1.3)), scale(fwd, fz - 0.85)), scale(up, (inWater ? -0.02 : 0.4) - (1 - paddleT) * 0.8 - (bladeHeld > 0 ? 0.25 : 0)));
      const hand = add(add(add(base, scale(rgt, 0.45)), scale(fwd, -0.35)), scale(up, 0.95 - (1 - paddleT) * 0.6));
      stretch(raft.paddleShaft, blade, hand, 0.045);
      const dir = normalize(sub(hand, blade));
      const bx = normalize(cross(dir, fwd));
      writeBasis(raft.paddleBlade.matrix, add(blade, scale(dir, -0.15)), Math.hypot(...bx) > 0.1 ? bx : rgt, dir, fwd, 0.2, 0.45, 0.035);
    } else {
      hide(raft.paddleShaft);
      hide(raft.paddleBlade);
    }
    // The handle, the line: thrown to you, or pulled tight into the water with nobody on it.
    const handlePos = onLip(base, rgt, fwd, up, 'stern', 0.5, 1.1, 0.3);
    if (overboard) {
      writeYaw(raft.handle.matrix, handlePos, track.at(s).yaw, 0.22, 0.22, 0.22);
      const ob = overboard;
      if (ob.onLine) stretch(raft.line, handlePos, track.lateral(s - ob.back, ob.x, 0.3), 0.025);
      else if (ob.line) stretch(raft.line, handlePos, track.lateral(s - ob.line.back, ob.line.x, 0.02), 0.025);
      else hide(raft.line);
    } else if (tautLine > 0) {
      tautLine -= dt;
      hide(raft.handle);
      stretch(raft.line, handlePos, track.lateral(s - 3.4, offset + 0.6, -1.2), 0.025);
    } else {
      hide(raft.handle);
      hide(raft.line);
    }
    if (trailGrab) {
      const g = onLip(base, rgt, fwd, up, 'stern', 0.5, 1.25, -0.05);
      trailGrab.pos = g;
      writeYaw(raft.grip.matrix, g, time * 0.7, 0.55, 0.3 + Math.sin(time * 5) * 0.05, 0.45);
    } else hide(raft.grip);
  }

  /** What the crew says about the hull: practical, and about choices. */
  function hullLines(sec) {
    const once = (k, who, line) => { if (!saidHull.has(k)) { saidHull.add(k); hud.say(who, line, 'crew'); } };
    if (state.leaks.length && !repairing) once('firstleak', 'TUBS', 'We\'re losing air. Hold G — find the hiss, press the patch, pump it up. Somebody cover us.');
    const c = state.chambers;
    if (Math.min(c.left, c.right) < 45 && Math.max(c.left, c.right) > 70) once('stabilise', 'MARS', `${c.left < c.right ? 'Left' : 'Right'}'s soft and it's dragging us into the wall. Everybody shift ${c.left < c.right ? 'right' : 'left'} — hold against the pull.`);
    if (ramp.active && ramp.s - s < 55 && ramp.s > s && hullFx.hopScale < 0.8) once('softbow', 'JUNE', 'Front\'s soft. We won\'t clear that lip like this. Patch it now or we take the low channel.');
    const nd = track.nextRoom(s, 'pool');
    if (nd?.sec.dock && nd.s0 - s < 60 && nd.s0 > s && (state.raft < 65 || state.leaks.length)) once(`dock${nd.sec.id}`, 'DEZ', nd.sec.dock.kind === 'repair' ? 'Maintenance platform. There\'s a compressor up there. We dock, we come back firm.' : 'We should dock early. Get off the water and get this thing pumped up.');
    // Banter, only when nothing is happening. It stops the moment someone is grabbed.
    if (director.phase === 'relax' && !overboard && !crewGrab && !climber && !trailGrab && !state.downed && !saidHull.has('banter') && random() < frameDt * 0.01) {
      saidHull.add('banter');
      const lines = BANTER[(sector.index + state.attempt) % BANTER.length].filter(([who]) => who === state.name.toUpperCase() || crewAvailable().includes(who.toLowerCase()));
      lines.forEach(([who, line], i) => setTimeout(() => { if (!overboard && !crewGrab && !climber && !trailGrab && director.phase === 'relax') hud.say(who, line, 'crew'); }, i * 2600));
    }
    // Under the flexible floor, during the quiet.
    if (!underFloorUsed && director.phase === 'relax' && sector.index > 0 && random() < frameDt * 0.004) {
      underFloorUsed = true;
      shake = Math.max(shake, 0.15);
      sound.knock(1);
      hud.caption('[something moves under the floor of the raft — right under your knees — and is gone]');
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

  const TWIN_KEYS = ['glass', 'farWater', 'farWall', 'post'];
  const HALL_KEYS = ['deckL', 'deckR', 'chairL', 'chairR', 'backL', 'backR', 'upperWin', 'slide', 'bigWin', 'farRaft', 'marker', 'rules'];
  const SEG_KEYS = ['bandL', 'bandR', 'left', 'right', 'ceiling', 'floor', 'water', 'belt', 'lamp', 'rib', 'winL', 'winR', 'figure', 'debris', ...HALL_KEYS, ...TWIN_KEYS];
  function placeSegments() {
    for (const seg of segments) {
      while (seg.s + SEG < s - SEG) seg.s += SEGMENTS * SEG;
      const mid = seg.s + SEG / 2;
      const r = track.roomAt(mid, 1);
      seg.lampPos = null;
      seg.flickerDark = false;
      if (mid > track.length + 2 || (r && r.sec.type !== 'drop')) {
        for (const k of SEG_KEYS) hide(seg[k]);
        seg.stairs.forEach(hide);
        continue;
      }
      const sec = track.sectionAt(mid).sec;
      const B = segBasis(mid);
      const put = (part, right, up, sx, sy, sz) => writeBasis(part.matrix, add(add(B.a.p, scale(B.right, right)), scale(B.y, up)), B.xL, B.y, B.z, sx, sy, sz);
      const open = sec.sky || sec.open;
      const half = sec.half, H = open ? 1.1 : sec.height;
      const n = Math.floor(seg.s / SEG);
      const L = SEG + 0.9;
      put(seg.left, -(half + 0.3), H / 2 - 0.6, 0.6, H + 1.2, L);
      if (sec.parallel) {
        // A glass partition (with gaps to shoot through) and the crew's channel beyond it.
        hide(seg.right);
        if (n % 3 !== 0) put(seg.glass, half + 0.1, H / 2 - 0.6, 0.12, H + 1.2, L); else hide(seg.glass);
        put(seg.farWater, half + 4.4, -0.01, 8, 0.02, L);
        put(seg.farWall, half + 8.7, H / 2 - 0.6, 0.6, H + 1.2, L);
      } else {
        put(seg.right, half + 0.3, H / 2 - 0.6, 0.6, H + 1.2, L);
        hide(seg.glass); hide(seg.farWater); hide(seg.farWall);
      }
      if (!open && !sec.hall) {
        const wrong = hash(n + 0.5) > 0.94 ? 0.7 : 0; // a band continuing at the wrong height
        put(seg.bandL, -(half + 0.005), 0.95 + wrong, 0.02, 0.16, L);
        if (sec.parallel) hide(seg.bandR); else put(seg.bandR, half + 0.005, 0.95, 0.02, 0.16, L);
      } else { hide(seg.bandL); hide(seg.bandR); }
      if (sec.aqueduct && n % 2 === 0) put(seg.post, -(half + 0.3), -6, 0.3, 12, 0.3); else hide(seg.post);
      if (open) hide(seg.ceiling);
      else put(seg.ceiling, 0, H + 0.3, half * 2 + 1.8, 0.6, L);
      put(seg.floor, 0, sec.shallow ? -0.75 : -0.9, half * 2 + 1.2, 0.6, L);
      if (sec.belt) {
        hide(seg.water);
        put(seg.belt, 0, -0.06, half * 2 - 0.3, 0.1, L);
      } else {
        hide(seg.belt);
        put(seg.water, 0, sec.shallow ? -0.32 : -0.01, half * 2 + 0.2, 0.02, L);
      }
      const lampOn = sec.sky ? false : sec.lamps === 'posts' ? n % 2 === 0 : sec.lamps === 'none' ? false : sec.lamps === 'bright' ? true : sec.lamps === 'normal' || sec.lamps === 'flicker' ? n % 2 === 0 : sec.lamps === 'sparse' ? n % 3 === 0 : !!sec.lit && n % 2 === 0;
      if (lampOn && sec.lamps === 'posts') {
        put(seg.lamp, -(half + 0.3), 1.6, 0.25, 0.25, 0.25);
        seg.lamp.material.emission = 9;
        seg.flickerDark = false;
        seg.lampPos = add(add(B.a.p, scale(B.right, -(half + 0.3))), scale(B.y, 1.6));
      } else if (lampOn) {
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
      if (sec.lockers) {
        // Locker banks that go on further than the building should allow.
        for (const [part, side] of [[seg.winL, -1], [seg.winR, 1]]) {
          part.material.color = [0.16, 0.26, 0.36];
          part.material.emissiveColor = [0.3, 0.45, 0.6];
          part.material.emission = 0.08;
          put(part, side * (half - 0.25), 1.2, 0.5, 2.4, SEG - 0.1);
        }
        hide(seg.figure);
      } else if (sec.windows && n % 2 === 0) {
        for (const part of [seg.winL, seg.winR]) { part.material.color = [0.5, 0.42, 0.25]; part.material.emissiveColor = [0.5, 0.42, 0.25]; part.material.emission = 1.4; }
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
      if (sec.hall) placeHall(seg, sec, B, put, n, half, H);
      else { for (const k of HALL_KEYS) hide(seg[k]); seg.stairs.forEach(hide); }
    }
    // The spillway drop ends in nothing.
    const last = track.ranges[track.ranges.length - 1];
    if (last.sec.type === 'drop' && s > last.s0 - 80) {
      const B = segBasis(track.length - 1);
      writeBasis(voidWall.matrix, add(B.a.p, scale(B.y, 1.5)), B.xL, B.y, B.z, last.sec.half * 2 + 1, 5, 0.3);
    } else hide(voidWall);
  }

  /** A vast, clean, empty pool hall: decks, rows of plastic chairs, depth markings, rules, high windows. */
  function placeHall(seg, sec, B, put, n, half, H) {
    const at = (along, right, up) => add(add(add(B.a.p, scale(B.z, along)), scale(B.right, right)), scale(B.y, up));
    put(seg.deckL, -(half - 1.5), 0.2, 3, 0.5, SEG + 0.9);
    put(seg.deckR, half - 1.5, 0.2, 3, 0.5, SEG + 0.9);
    // One chair per side per segment, facing the water. Nobody in any of them.
    put(seg.chairL, -(half - 1.6), 0.7, 0.55, 0.12, 0.55);
    put(seg.backL, -(half - 1.3), 1.0, 0.08, 0.55, 0.55);
    put(seg.chairR, half - 1.6, 0.7, 0.55, 0.12, 0.55);
    put(seg.backR, half - 1.3, 1.0, 0.08, 0.55, 0.55);
    // Depth marking on the deck edge, readable from the water.
    writeBasis(seg.marker.matrix, at(0, -(half - 3.02), 0.25), scale(B.z, -1), B.y, B.right, 0.7, 0.32, 1);
    if (n % 4 === 1) writeBasis(seg.rules.matrix, at(0, half - 0.04, 3.2), B.z, B.y, scale(B.right, -1), 2.6, 1.1, 1);
    else hide(seg.rules);
    // High observation windows. In a stairway hall, some show stairs at an impossible height.
    if (n % 3 === 0) {
      put(seg.upperWin, half - 0.02, H - 3.2, 0.05, 2.2, 3.4);
      if (sec.stairway) seg.stairs.forEach((st, k) => writeBasis(st.matrix, at((k - 1.5) * 0.75, half - 0.06, H - 4 + k * 0.45), B.xL, B.y, B.z, 0.03, 0.16, 0.7));
      else seg.stairs.forEach(hide);
    } else { hide(seg.upperWin); seg.stairs.forEach(hide); }
    // A slide that disappears into the wall with no room behind it.
    if (n % 4 === 2) writeBasis(seg.slide.matrix, at(0, half + 2.2, H - 2.5), B.z, B.xL, B.y, 3.2, 3.2, 3.2);
    else hide(seg.slide);
    // Through a big window: another pool, enormous, with another raft crossing it.
    if (n % 7 === 3) {
      put(seg.bigWin, -(half - 0.02), 4, 0.05, 4.5, SEG - 0.4);
      const slideX = Math.sin(time * 0.15 + n) * (SEG / 2 - 0.8);
      writeBasis(seg.farRaft.matrix, at(slideX, -(half - 0.05), 2.6), B.xL, B.y, B.z, 0.02, 0.18, 0.7);
    } else { hide(seg.bigWin); hide(seg.farRaft); }
  }

  const roomParts = () => [room.floor, room.water, room.ceiling, room.wallL, room.wallR, room.back1, room.back2, room.front1, room.front2, room.front3, ...room.lamps, ...room.gates, ...room.arrows.flatMap((a) => [a.shaft, a.headA, a.headB]), ...room.stub.flatMap((x) => [x.left, x.right, x.ceiling, x.water]), room.platform, room.tether, room.beacon, room.lampPost, room.figure, room.door, room.doorFrame];
  function placeRoom(r) {
    for (const set of roomSigns.values()) {
      for (const ex of set.exits || []) hide(ex);
      if (set.info) hide(set.info);
      if (set.count) hide(set.count);
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
      if (signs.count) facing(signs.count, F.at(L - 0.1, Hf / 2 + 0.8, 2.6), toRaft, 2.6, 1.1);
      for (const x of [...room.gates, ...room.arrows.flatMap((a) => [a.shaft, a.headA, a.headB]), ...room.stub.flatMap((x) => [x.left, x.right, x.ceiling, x.water]), room.tether, room.lampPost, room.figure]) hide(x);
    }
  }

  function gatherLights(eye) {
    const lights = [];
    for (const seg of segments) if (seg.lampPos) {
      const tall = seg.lampPos[1] - track.at(seg.s).p[1] > 7;
      const sec2 = track.sectionAt(seg.s).sec;
      const col = sec2.reservoir ? [0.85, 0.95, 1] : lampColor; // the reservoir's cold white
      lights.push({ position: seg.lampPos, color: col, intensity: (tall ? 18 : 9.5) * (seg.lamp.material.emission / 9) * lampSag, radius: 0.4, range: tall ? 22 : 10.5, d: distance(seg.lampPos, eye) });
    }
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
      if (!b.active) { hide(b.core); hide(b.spikes); hide(b.heart); continue; }
      if (b.dying) {
        b.dying += dt;
        const k = 1 + b.dying * 6;
        writeYaw(b.core.matrix, b.pos, 0, 0.45 * k, 0.25 * k, 0.45 * k); // collapsing into folds
        writeYaw(b.heart.matrix, b.pos, 0, 0.2 * k, 0.2 * k, 0.2 * k);
        b.heart.material.emission = Math.max(0.02, 6 - b.dying * 30);
        hide(b.spikes);
        if (b.dying > 0.18) b.active = false;
        continue;
      }
      const toCam = sub(eye, b.pos);
      const d = Math.hypot(...toCam);
      b.stagger = Math.max(0, b.stagger - dt);
      b.flash = Math.max(0, b.flash - dt);
      // Rear swarms chase the raft, so they have to be faster than it.
      let closing = d < 22 ? (2.2 + sector.index * 0.3) * closeRate : 0;
      // A full performance: rest far off, notice (a turn and an intake), approach, swell, then commit with a lunge.
      if (d < 22 && !b.noticed && !b.rear) { b.noticed = true; sound.breath(soundDir(fx.eye, fx.fwd, b.pos).pan * 0.6); }
      if (d < 2.6 && !b.goal && !b.spitter) { closing *= 2.2; if (!b.lunged) { b.lunged = true; b.flash = 0.15; } }
      if (b.flinch > 0) { b.flinch -= dt; closing = -2.2; }
      if (b.rear) closing = speed + 2.4;
      // Spitters hold their distance and throw.
      if (b.spitter && !b.goal) {
        if (d < 16) closing = -speed * 0.0 + (d < 13 ? -1.5 : 0);
        b.spit -= dt;
        if (b.spit < 0.7 && b.spit + dt >= 0.7) { sound.tick?.(8); b.flash = 0.7; }
        if (b.spit <= 0 && d < 30) {
          b.spit = 3.2 + random() * 1.5;
          const sh = shots.find((x) => !x.active);
          if (sh) Object.assign(sh, { active: true, pos: [...b.pos], from: b, reflect: false, t: 0 });
        }
      }
      // Some Blooms go for someone else: a stranded Drainer, or the crew's raft.
      if (b.goal) {
        const g = sub(b.goal(), b.pos);
        const gd = Math.hypot(...g);
        if (gd < 1) { b.active = false; b.onGoal?.(); continue; }
        b.pos = add(b.pos, scale(normalize(g), (3.5 + (crewRaft.active ? speed : 0)) * dt));
        closing = 0;
      }
      if (b.stagger > 0) closing = 0;
      if (b.retreat) {
        b.pos = add(b.pos, [0, -dt * 1.5, 0]);
        if (b.pos[1] < track.at(s).p[1] - 1) b.active = false;
      } else b.pos = add(b.pos, add(scale(normalize(toCam), closing * dt), scale(b.drift, dt)));
      b.phase += dt * 3;
      // Wind-up: a Bloom about to burst swells and brightens. Readable, so you can answer it.
      const windup = !b.goal && !b.spitter ? clamp((4.5 - d) / 3.4, 0, 1) : 0;
      if (windup > 0 && !b.warned) { b.warned = true; sound.breath(soundDir(fx.eye, fx.fwd, b.pos).pan); }
      const pulse = (0.45 + Math.sin(b.phase * (1 + windup * 3)) * 0.05) * (1 + windup * 0.45);
      const squash = (b.stagger > 0 ? 0.75 : 1) * (d > 22 ? 1 + Math.sin(b.phase * 0.5) * 0.04 : 1); // resting: slow breathing
      writeYaw(b.core.matrix, [b.pos[0], b.pos[1] + Math.sin(b.phase * 0.7) * 0.15, b.pos[2]], b.phase * 0.4, pulse / squash, pulse * 0.92 * squash, pulse);
      writeYaw(b.spikes.matrix, b.pos, b.phase, pulse * 2.3, 0.07, 0.07);
      writeYaw(b.heart.matrix, [b.pos[0], b.pos[1] + Math.sin(b.phase * 0.7) * 0.15, b.pos[2]], 0, pulse * 0.42, pulse * 0.42, pulse * 0.42);
      b.heart.material.emission = b.flash > 0 ? 9 : (1.4 + Math.sin(b.phase * 2) * 0.6) * (1 + windup * 2.5);
      if (d < 1.1 && !b.goal) {
        b.active = false;
        sound.burst();
        const front = !b.rear;
        damage(braced && front ? (state.fit === 'protection' ? 2 : 4) : 12, b.rear ? 'A Bloom caught the raft from behind.' : 'A Bloom burst against you.', braced && front ? 0 : 3, b.rear ? 'stern' : pick(['bow', 'left', 'right']), 'entity');
      } else if (behind(b.pos) && !b.rear) b.active = false;
      else if (b.rear && d > 45) b.active = false;
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
        if (jumpY > 0.35) {
          hud.toast('HOPPED THE ROPE');
          sound.accent?.('gate');
        } else {
          sound.splash();
          damage(18, 'The Lane Rope dragged you through the water.', 12, random() < 0.5 ? 'left' : 'right', 'rope');
          state.drift = Math.min(100, state.drift + 12);
        }
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
      if (near < 0.5 && !u.grabbed && jumpY > 0.3) { u.grabbed = true; hud.toast('HOPPED THE STILL WATER'); }
      if (near < 0.5 && !u.grabbed) {
        u.grabbed = true;
        held = 3.5;
        sound.gurgle();
        damage(10, 'The Undertow took hold of the raft.', 8, 'stern', 'entity');
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
    for (const f of floaters) {
      if (!f.active || f.state === 'gone') { hide(f.body); hide(f.head); if (f.active && f.s < s - 5) f.active = false; continue; }
      const p = track.lateral(f.s, f.offset, 0.08 + Math.sin(time + f.s) * 0.02);
      const yaw = track.at(f.s).yaw;
      writeBasis(f.body.matrix, p, [Math.cos(yaw), 0, -Math.sin(yaw)], [Math.sin(yaw), 0, Math.cos(yaw)], UP, 0.24, 0.75, 0.16);
      writeYaw(f.head.matrix, add(p, [Math.sin(yaw) * 0.85, 0.02, Math.cos(yaw) * 0.85]), yaw, 0.17, 0.12, 0.2);
      // Steering the raft over them is the rescue (or the mistake).
      if (Math.abs(f.s - s - 1) < 1.2 && Math.abs(f.offset - offset) < 1.3 && f.state === 'floating') {
        f.state = 'gone';
        if (f.survivor) {
          state.rescued += 1;
          give(random() < 0.5 ? 'cell' : 'filter');
          hud.say('???', 'You came back. You came back for me.', 'marco');
          hud.toast(`SURVIVOR PULLED ABOARD · ${state.rescued} RESCUED · they swim for the next dock`);
        } else {
          held = 2.5;
          sound.gurgle();
          damage(10, 'A Floater rolled over and held the raft.', 8, random() < 0.5 ? 'left' : 'right', 'entity');
          hud.caption('[it rolls over — beside the raft]');
        }
      }
      if (f.s < s - 5) f.active = false;
    }
    updateRaftContent(dt, eye);
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

  function updateRaftContent(dt, eye) {
    const half = track.sectionAt(s).sec.half;
    // Gate markers: thread the pair.
    for (const g of gateSets) {
      if (!g.active) { hide(g.a); hide(g.b); continue; }
      const bob2 = Math.sin(time * 2 + g.s) * 0.06;
      writeYaw(g.a.matrix, track.lateral(g.s, g.lane - 1.05, 0.15 + bob2), 0, 0.22, 0.3, 0.22);
      writeYaw(g.b.matrix, track.lateral(g.s, g.lane + 1.05, 0.15 + bob2), 0, 0.22, 0.3, 0.22);
      if (!g.done && g.s < s) {
        g.done = true;
        if (Math.abs(offset - g.lane) < 0.95) {
          gateStreak += 1;
          events.score(40 * gateStreak, `GATE ×${gateStreak}`);
          sound.accent?.('gate');
          if (gateStreak === 3) { hud.toast('CLEAN LINE · +1 PART'); state.scrap += 1; }
        } else gateStreak = 0;
      }
      if (g.s < s - 6) g.active = false;
    }
    // Floating debris: steer around it or hop it.
    for (const d of debrisPool) {
      if (!d.active) { hide(d.a); hide(d.b); continue; }
      const p = track.lateral(d.s, d.lane, 0.12);
      const yaw = track.at(d.s).yaw + d.s;
      writeYaw(d.a.matrix, p, yaw, 1.1, 0.25, 0.7);
      writeYaw(d.b.matrix, add(p, [0.3, 0.35, 0]), yaw * 1.7, 0.5, 0.45, 0.5);
      if (!d.done && Math.abs(d.s - s - 1.2) < 0.8) {
        d.done = true;
        if (Math.abs(offset - d.lane) < 1.15 && jumpY < 0.3) {
          sound.thump();
          shake = 0.5;
          held = Math.max(held, 0.6);
          damage(6, 'The raft hit floating debris.', 8, 'bow', 'scrape');
        } else if (jumpY >= 0.3) hud.toast('HOPPED THE DEBRIS');
      }
      if (d.s < s - 6) d.active = false;
    }
    // Things caught in the air: only reachable mid-jump.
    for (const k of pickups) {
      if (!k.active) { hide(k.part); continue; }
      const p = track.lateral(k.s, k.lane, 1.9 + Math.sin(time * 2 + k.s) * 0.08);
      writeYaw(k.part.matrix, p, time, k.item === 'tag' ? 0.3 : 0.45, k.item === 'tag' ? 0.05 : 0.35, k.item === 'tag' ? 0.2 : 0.35);
      if (!k.done && Math.abs(k.s - s - 0.8) < 1) {
        k.done = true;
        if (Math.abs(offset - k.lane) < 1.1 && jumpY > 0.4) {
          if (k.item === 'tag') {
            const names = ['Caleb Teague', 'Priya Natarajan', 'Rosa Imbert', 'Okon Bassey'];
            const name = names[(state.tags || []).length % names.length];
            (state.tags ||= []).push(name);
            state.logbook.push({ id: `tag-${name}`, title: `CREW SEVEN ID TAG · ${name.toUpperCase()}`, text: `A Pumphouse ID tag on a broken lanyard, caught in the air above an aqueduct that has no source. ${name}. Crew Seven. Still warm.` });
            hud.toast(`CREW SEVEN ID TAG · ${name.toUpperCase()}`);
            sound.pickup();
          } else give(k.item);
        }
      }
      if (k.s < s - 6) k.active = false;
    }
    // The ramp: piled water against a lip, foam, chevrons. Line up, then hop or boost.
    if (ramp.active) {
      const yaw = track.at(ramp.s).yaw;
      const p = track.lateral(ramp.s, ramp.lane, 0);
      const z = [Math.sin(yaw), 0, Math.cos(yaw)];
      const pitch = 0.32;
      const fz = normalize([z[0] * Math.cos(pitch), Math.sin(pitch), z[2] * Math.cos(pitch)]);
      const fx = [Math.cos(yaw), 0, -Math.sin(yaw)];
      writeBasis(ramp.lip.matrix, add(p, [0, 0.15, 0]), fx, normalize(cross(fz, fx)), fz, 2.2, 0.3, 4);
      writeBasis(ramp.foam.matrix, add(p, [0, 0.33, 0]), fx, normalize(cross(fz, fx)), fz, 2.1, 0.04, 3.8);
      ramp.chev.forEach((c, i) => writeYaw(c.matrix, track.lateral(ramp.s - 8 - i * 6, ramp.lane, 0.02), yaw, 0.9, 0.02, 0.25));
      if (!ramp.decided && ramp.s - s < 1.5) {
        ramp.decided = true;
        const inLane = Math.abs(offset - ramp.lane) < 1.25;
        const committed = time - lastHop < 0.6 || jumpY > 0.05 || speed > track.sectionAt(s).sec.speed * 1.25;
        if (inLane && committed && hullFx.hopScale < 0.75) {
          decideFork(ramp.fork, false, 'SOFT BOW · THE RAFT FOLDS ON THE LIP · LOWER CHANNEL');
          hull.hit('bow', 6, 'scrape', 0.4);
        } else if (inLane && committed) {
          decideFork(ramp.fork, true, 'LAUNCH · THE UPPER CHANNEL');
          jumpV = 6.8;
          photoPending = 'THE LAUNCH';
          setTimeout(() => hud.say('TUBS', 'Where is this water coming from? There\'s nothing up here feeding it.', 'crew'), 2500);
        } else {
          decideFork(ramp.fork, false, inLane ? 'NOT ENOUGH SPEED · LOWER CHANNEL' : 'MISSED THE LAUNCH · LOWER CHANNEL');
          state.noise = Math.min(100, state.noise + 30);
          hud.caption('[the raft slams down into the lower channel — everything heard that]');
        }
      }
      if (ramp.s < s - 10) ramp.active = false;
    } else { hide(ramp.lip); hide(ramp.foam); ramp.chev.forEach(hide); }
    // Aqueduct: a vast pool far below.
    if (track.sectionAt(s).sec.aqueduct) writeYaw(abyss.matrix, add(track.at(s).p, [0, -24, -40]), track.at(s).yaw, 160, 0.02, 200);
    else hide(abyss);
    // Currents: foam streaks drift with the push, so the water can be read.
    const cur = (track.sectionAt(s).sec.current || 0) * Math.sin(s * 0.035 + track.sectionAt(s).sec.id) + (track.sectionAt(s).sec.bias || 0);
    foam.forEach((f, i) => {
      if (Math.abs(cur) < 0.15 || track.roomAt(s)) return hide(f);
      const at = s + 6 + i * 5;
      const lane = ((time * cur * 0.6 + i * 0.37) % 1) * 2 - 1;
      writeYaw(f.matrix, track.lateral(at, lane * (Math.min(half, 6) - 1), 0.015), track.at(at).yaw + cur * 0.4, 0.12, 0.01, 1.6);
    });
    // Sluice control.
    if (sluice.active) {
      writeBasis(sluice.wheel.matrix, sluice.pos, [Math.cos(sluice.yaw), 0, -Math.sin(sluice.yaw)], UP, [Math.sin(sluice.yaw), 0, Math.cos(sluice.yaw)], 0.5, 0.5, 0.5);
      facing(sluice.sign, add(sluice.pos, [0, 0.9, 0]), [Math.sin(sluice.yaw), 0, Math.cos(sluice.yaw)], 1.6, 0.65);
      const f = findItem(sluice.fork);
      if (f && s > f.at - 15) {
        sluice.active = false;
        decideFork(sluice.fork, false, 'SLUICE MISSED · OVERFLOW CHANNEL');
      }
    } else { hide(sluice.wheel); hide(sluice.sign); }
    // A stranded Drainer on a ledge: protect them while they work the door.
    if (stranded.active) {
      const yaw = track.at(stranded.s).yaw;
      writeYaw(stranded.ledge.matrix, track.lateral(stranded.s, stranded.side * (half + 0.4), 0.7), yaw, 1.6, 0.3, 5);
      writeYaw(stranded.body.matrix, stranded.pos, yaw, 0.2, 0.75, 0.16);
      writeYaw(stranded.head.matrix, add(stranded.pos, [0, 0.95, 0]), yaw, 0.15, 0.18, 0.15);
      if (!stranded.resolved && stranded.s - s < 70) {
        stranded.window -= dt;
        stranded.spawnT -= dt;
        if (stranded.spawnT <= 0 && stranded.window > 2) {
          stranded.spawnT = 1.8;
          const b = spawnBloom(stranded.s + 10 + random() * 8, stranded.side * (half - 0.3), 0.4);
          if (b) {
            b.goal = () => stranded.pos;
            b.onGoal = () => {
              stranded.hp -= 1;
              hud.caption(`[the Drainer cries out — ${stranded.side < 0 ? 'left' : 'right'}]`);
            };
          }
        }
        if (stranded.hp <= 0 || stranded.window <= 0 || stranded.s < s + 2) {
          stranded.resolved = true;
          if (stranded.hp > 0) {
            state.rescued += 1;
            (state.strandedSaved ||= {})[state.sectorKey] = true;
            hud.say('???', 'Got it! Door\'s open. I\'ll release the gate up ahead for you. Go!', 'marco');
            hud.toast(`DRAINER PROTECTED · ${state.rescued} RESCUED`);
            give('cell');
            if (stranded.fork != null) decideFork(stranded.fork, true, 'YOU PROTECTED THE DRAINER, SO THE GATE IS OPEN');
          } else {
            hud.say('JUNE', 'They went under. They went under and we watched.', 'crew');
            state.drift = Math.min(100, state.drift + 12);
            if (stranded.fork != null) decideFork(stranded.fork, false, 'NOBODY OPENED THE GATE · OVERFLOW CHANNEL');
          }
        }
      }
      if (stranded.s < s - 15) stranded.active = false;
    } else { hide(stranded.body); hide(stranded.head); hide(stranded.ledge); }
    // A closing bulkhead: beat it or take the detour.
    if (bulkhead.active) {
      bulkhead.t -= dt;
      const frac = clamp(bulkhead.t / bulkhead.total, 0, 1);
      const sec2 = track.sectionAt(Math.max(0, bulkhead.forkS - 1)).sec;
      writeYaw(bulkhead.door.matrix, track.lateral(bulkhead.forkS, 0, 0.1 + (sec2.height - 0.2) * (0.5 + frac * 0.9)), track.at(bulkhead.forkS).yaw, sec2.half * 2 + 0.6, sec2.height, 0.4);
      if (!bulkhead.decided) {
        hud.objective(`BULKHEAD CLOSING · ${Math.max(0, bulkhead.t).toFixed(1)} s · BOOST (Shift)`);
        if (bulkhead.forkS - s < 14) {
          bulkhead.decided = true;
          const made = bulkhead.t > (bulkhead.forkS - s) / Math.max(1, speed);
          decideFork(bulkhead.fork, made, made ? 'THROUGH THE BULKHEAD · SHORTCUT' : 'THE BULKHEAD SEALED · DETOUR');
          hud.objective('Shoot what moves. Scan what hides. Watch the route.');
          if (!made) bulkhead.t = -1;
        }
      }
      if (bulkhead.forkS < s - 8) bulkhead.active = false;
    } else hide(bulkhead.door);
    // The crew's raft beyond the glass: cover them.
    if (crewRaft.active) {
      const sec2 = crewRaft.sec;
      crewRaft.pos = track.lateral(s + 10, sec2.half + 4.4, 0.12);
      flat(crewRaft.lip, crewRaft.pos, 0.95, 0.95, 1.1);
      crewRaft.riders.forEach((r, i) => writeYaw(r.matrix, add(crewRaft.pos, [Math.cos(i * 2.1) * 0.5, 0.75, Math.sin(i * 2.1) * 0.5]), 0, 0.2, 0.7, 0.16));
      crewRaft.spawnT -= dt;
      if (crewRaft.spawnT <= 0) {
        crewRaft.spawnT = 2.6;
        const b = spawnBloom(s - 10, sec2.half + 4.4, 1.2);
        if (b) {
          b.rear = false;
          b.goal = () => crewRaft.pos;
          b.onGoal = () => {
            crewRaft.hits += 1;
            hud.say(pick(['DEZ', 'TUBS', 'JUNE', 'MARS'].filter((n) => n !== state.name.toUpperCase())), pick(['We\'re hit!', 'Behind us! Behind us!', 'Cover us!']), 'crew');
          };
        }
      }
      const range = track.ranges.find((r) => r.sec === sec2);
      if (range && s > range.s1 - 2) {
        crewRaft.active = false;
        if (crewRaft.hits < 3) {
          state.overrides += 1;
          hud.say('DEZ', 'Thanks for the cover. I patched your next gate into our board: you have an override.', 'crew');
          hud.toast('THE CREW HAD YOUR BACK · +1 OVERRIDE');
        } else hud.say('MARS', 'We made it. Barely. We\'ll see you at the drain.', 'crew');
      }
    } else { hide(crewRaft.lip); crewRaft.riders.forEach(hide); }
    // Spitter projectiles: shoot them, dodge them, brace for them, or time the brace and send them back.
    for (const sh of shots) {
      if (!sh.active) { hide(sh.part); continue; }
      sh.t += dt;
      const goal = sh.reflect ? (sh.from?.active ? sh.from.pos : null) : eye;
      if (!goal) { sh.active = false; continue; }
      const dvec = sub(goal, sh.pos);
      const dd = Math.hypot(...dvec);
      sh.pos = add(sh.pos, scale(normalize(dvec), Math.min(dd, (sh.reflect ? 20 : 10) * dt)));
      writeYaw(sh.part.matrix, sh.pos, time * 4, 0.22, 0.22, 0.22);
      if (dd < 0.9) {
        if (sh.reflect) {
          sh.active = false;
          if (sh.from?.active && !sh.from.dying) { sh.from.dying = 0.001; events.cleared(); sound.burst(); events.score(150, 'RETURNED TO SENDER'); }
        } else if (braced && time - braceStart < 0.4) {
          sh.reflect = true;
          sound.accent?.('parry');
          hud.toast('ARC PULSE · RETURNED');
        } else if (braced) {
          sh.active = false;
          sound.thump();
          hud.caption('[it splashes against the hull]');
        } else {
          sh.active = false;
          damage(9, 'A Spitter\'s glob hit you.', 0);
        }
      }
      if (sh.t > 8) sh.active = false;
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

  if (import.meta.env.DEV) window.__rideTest = {
    shotAhead(dist = 8) { const sh = shots.find((x) => !x.active); const b = spawnBloom(s + dist + 4, offset, 1.3); Object.assign(sh, { active: true, pos: track.lateral(s + dist, offset, 1.3), from: b, reflect: false, t: 0 }); return { sh, b }; },
    bloomAhead() { return spawnBloom(s + 10, offset * 0.6, 1.2); },
    get locks() { return locks.length; },
  };
  if (import.meta.env.DEV) window.__ride = { track, hull, puncture: (c, cause = 'scrape') => hull.puncture(c, cause), overboard: () => goOverboard('test'), free: () => restrained && !restrained.freed && freeRestrained(), shove: () => shove(fx.eye, fx.fwd), ping: () => ping(fx.eye, fx.fwd), fireAt: (dir) => { fireProfile(fx.eye, fx.look, dir || fx.fwd); return state.profile; }, hitTarget: (key) => { const t = targets().find((x) => x.key === key); if (t) { shotProfile = state.profile; t.fn(); } return !!t; }, get wave() { return wave; }, spawnEnc: (kind, extra = {}) => spawn({ e: { kind, ...extra }, s: s + 10, sec: track.sectionAt(s).sec }), get coop() { return { climber, crewGrab, ballast, restrained, protect, focusing, fov, profile: state.profile, special: state.special }; }, reset: () => { overboard = null; capsize = null; trailGrab = null; hull.state.capsized = false; }, capsize: () => startCapsize(), get swimming() { return overboard; }, get capsized() { return capsize; }, get grab() { return trailGrab; }, valve, linked, lifeguard, locker, wake, passengerStep, burst: () => burst(fx.eye, fx.fwd), get s() { return s; }, set s(v) { s = v; } };

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
