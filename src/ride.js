// The raft: an on-rails ride down a tiled channel. The channel is a fixed pool of segments that are
// recycled ahead of the camera, because a 67js renderer keeps the part list it was built with.
import { Renderer67, box, sphere, cylinder, torus } from '67js';
import { matrix, writeYaw, writeBasis, hide, add, sub, scale, distance, normalize, clamp, damp, rng, screenRay, raySphere, rayPlaneY, linear, cross, display } from './math.js';
import { tileTexture } from './textures.js';
import { createBlaster } from './blaster.js';
import { input, wasPressed, isDown } from './input.js';
import { hud } from './hud.js';
import { sound } from './audio.js';
import { quality } from './quality.js';
import { AMBIENT } from './sectors.js';

const SEG = 6; // segment length along the track
const SEGMENTS = 26;
const HALF = 3.2; // half width of the channel
const HEIGHT = 5;
const FOV = 72;
const LIGHTS = 10;

/** Centre line of the slide: gentle S-bends. */
function trackPoint(s, seed) {
  const x = Math.sin(s * 0.018 + seed) * 7 + Math.sin(s * 0.041 + seed * 2) * 2.5;
  return [x, 0, -s];
}
function trackYaw(s, seed) {
  const a = trackPoint(s - 1, seed), b = trackPoint(s + 1, seed);
  return Math.atan2(-(b[0] - a[0]), -(b[2] - a[2])) + Math.PI;
}
/** Right-hand side vector at s. */
function trackRight(s, seed) {
  const yaw = trackYaw(s, seed);
  return [-Math.cos(yaw), 0, Math.sin(yaw)];
}
const lateral = (s, seed, offset, y) => {
  const p = trackPoint(s, seed);
  const r = trackRight(s, seed);
  return [p[0] + r[0] * offset, y, p[2] + r[2] * offset];
};

export function createRide(canvas, state, sector, events) {
  const seed = sector.index * 1.7 + 0.4;
  const random = rng(1000 + sector.index * 31 + state.attempt);
  const map = tileTexture(sector);
  const tileMat = { color: [1, 1, 1], metallic: 0, roughness: 0.22, map, boxMapScale: 0.5 };
  const lampColor = linear(sector.lamp);
  const slab = box(0, 1);
  const ball = sphere(28, 18);
  const ring = torus(0.16, 40, 12);
  const post = cylinder(16, 0.05, 1);
  const parts = [];
  const add2 = (p) => (parts.push(p), p);

  // Channel segments: walls, ceiling, a ledge each side and a ceiling lamp every other segment.
  const segments = [];
  for (let i = 0; i < SEGMENTS; i++) {
    const seg = {
      s: i * SEG,
      left: add2({ name: `Wall L${i}`, geometry: slab, matrix: new Float32Array(16), material: tileMat }),
      right: add2({ name: `Wall R${i}`, geometry: slab, matrix: new Float32Array(16), material: tileMat }),
      ceiling: add2({ name: `Ceiling ${i}`, geometry: slab, matrix: new Float32Array(16), material: tileMat }),
      floor: add2({ name: `Floor ${i}`, geometry: slab, matrix: new Float32Array(16), material: tileMat }),
      water: add2({ name: `Water ${i}`, geometry: slab, matrix: new Float32Array(16), material: { tag: 'water', color: linear(sector.water), metallic: 0.55, roughness: 0.08 } }),
      lamp: add2({ name: `Lamp ${i}`, geometry: slab, matrix: new Float32Array(16), material: { color: lampColor, metallic: 0, roughness: 1, emission: 9, emissiveColor: lampColor } }),
      pillar: add2({ name: `Pillar ${i}`, geometry: slab, matrix: new Float32Array(16), material: tileMat }),
      flicker: random(),
      pillarSide: random() < 0.5 ? -1 : 1,
      hasPillar: random() < 0.35,
    };
    segments.push(seg);
  }

  // The raft's front lip, visible at the bottom of the view.
  const raft = add2({ name: 'Raft', geometry: torus(0.32, 48, 16), matrix: new Float32Array(16), material: { color: [0.75, 0.32, 0.12], metallic: 0, roughness: 0.6 } });

  // Entities, pooled.
  const bloomMat = () => ({ color: [0.35, 0.03, 0.03], metallic: 0, roughness: 0.55, emission: 2.2, emissiveColor: [1, 0.22, 0.08] });
  const blooms = Array.from({ length: 18 }, (_, i) => ({
    core: add2({ name: `Bloom ${i}`, geometry: ball, matrix: new Float32Array(16), material: bloomMat() }),
    spikes: add2({ name: `Bloom spikes ${i}`, geometry: slab, matrix: new Float32Array(16), material: { color: [0.12, 0.02, 0.02], metallic: 0.2, roughness: 0.5 } }),
    active: false, pos: [0, 0, 0], hp: 2, phase: 0, dying: 0,
  }));
  const signals = Array.from({ length: 6 }, (_, i) => ({
    ring: add2({ name: `Signal ${i}`, geometry: ring, matrix: new Float32Array(16), material: { color: [0.5, 1, 0.55], metallic: 0, roughness: 0.4, emission: 3.2, emissiveColor: [0.55, 1, 0.5] } }),
    active: false, pos: [0, 0, 0], yaw: 0, used: 0,
  }));
  const ropes = Array.from({ length: 2 }, (_, i) => ({
    line: add2({ name: `Lane rope ${i}`, geometry: slab, matrix: new Float32Array(16), material: { color: [0.85, 0.85, 0.8], metallic: 0, roughness: 0.6 } }),
    floats: Array.from({ length: 5 }, (_, j) => ({ part: add2({ name: `Rope float ${i}.${j}`, geometry: ball, matrix: new Float32Array(16), material: { color: j % 2 ? [0.9, 0.9, 0.85] : [0.9, 0.25, 0.08], metallic: 0, roughness: 0.4, emission: 0.6, emissiveColor: [1, 0.4, 0.1] } }), alive: true, pos: [0, 0, 0] })),
    active: false, s: 0,
  }));
  const undertows = Array.from({ length: 2 }, (_, i) => ({
    patch: add2({ name: `Undertow ${i}`, geometry: cylinder(48, 0, 1), matrix: new Float32Array(16), material: { color: [0.004, 0.01, 0.012], metallic: 0.9, roughness: 0.02 } }),
    eye: add2({ name: `Undertow glint ${i}`, geometry: ball, matrix: new Float32Array(16), material: { color: [0.2, 0, 0], metallic: 0, roughness: 1, emission: 0.02, emissiveColor: [1, 0.1, 0.05] } }),
    active: false, s: 0, offset: 0, hp: 4,
  }));
  const lifeguards = Array.from({ length: 1 }, (_, i) => ({
    chairL: add2({ name: `Chair leg L${i}`, geometry: post, matrix: new Float32Array(16), material: { color: [0.92, 0.92, 0.9], metallic: 0, roughness: 0.4 } }),
    chairR: add2({ name: `Chair leg R${i}`, geometry: post, matrix: new Float32Array(16), material: { color: [0.92, 0.92, 0.9], metallic: 0, roughness: 0.4 } }),
    seat: add2({ name: `Chair seat ${i}`, geometry: slab, matrix: new Float32Array(16), material: { color: [0.92, 0.92, 0.9], metallic: 0, roughness: 0.4 } }),
    body: add2({ name: `Lifeguard ${i}`, geometry: cylinder(20, 0.3, 3), matrix: new Float32Array(16), material: { color: [0.82, 0.7, 0.62], metallic: 0, roughness: 0.75 } }),
    head: add2({ name: `Lifeguard head ${i}`, geometry: ball, matrix: new Float32Array(16), material: { color: [0.8, 0.68, 0.6], metallic: 0, roughness: 0.7 } }),
    glasses: add2({ name: `Lifeguard glasses ${i}`, geometry: slab, matrix: new Float32Array(16), material: { color: [0.01, 0.01, 0.01], metallic: 1, roughness: 0.05 } }),
    lamp: add2({ name: `Lifeguard lamp ${i}`, geometry: ball, matrix: new Float32Array(16), material: { color: [1, 0.95, 0.8], metallic: 0, roughness: 1, emission: 10, emissiveColor: [1, 0.95, 0.8] } }),
    active: false, s: 0, side: 1, blinded: false, whistled: false,
  }));
  // The dock at the end of the ride.
  const dock = add2({ name: 'Dock', geometry: slab, matrix: new Float32Array(16), material: { color: [0.55, 0.57, 0.52], metallic: 0, roughness: 0.8 } });
  const dockDoor = add2({ name: 'Dock door', geometry: slab, matrix: new Float32Array(16), material: { color: [0.2, 0.35, 0.25], metallic: 0.4, roughness: 0.4, emission: 0.8, emissiveColor: [0.4, 1, 0.5] } });
  const endWall = add2({ name: 'End wall', geometry: slab, matrix: new Float32Array(16), material: tileMat });

  const blaster = createBlaster(state);
  parts.push(...blaster.parts);

  for (const p of [...blooms.flatMap((b) => [b.core, b.spikes]), ...signals.map((g) => g.ring), ...ropes.flatMap((r) => [r.line, ...r.floats.map((f) => f.part)]), ...undertows.flatMap((u) => [u.patch, u.eye]), ...lifeguards.flatMap((l) => [l.chairL, l.chairR, l.seat, l.body, l.head, l.glasses, l.lamp])]) hide(p);

  // Parts that have not been placed yet would be a zero (singular) matrix, which 67js rejects.
  for (const p of parts) if (p.matrix[15] === 0) hide(p);
  const fogColor = linear(sector.fog);
  const renderer = new Renderer67(canvas, parts, {
    ground: false, world: true, hdr: true, ...quality.renderer,
    environment: { keyIntensity: 0.05, fillIntensity: 0.12, ambientIntensity: 0.28, fogColor, fogDensity: 0.035 + sector.index * 0.01, skyTop: display(sector.fog), skyBottom: display(sector.fog) },
  });
  renderer.resize();

  // Ride state.
  const end = sector.rideLength;
  let s = 4;
  let offset = 0; // dodge
  let speed = sector.speed;
  let finished = false;
  let time = 0;
  let ripple = [0, -100, 0];
  let rippleTime = -10;
  let shake = 0;
  let nextAmbient = 9;
  let crewLine = 0;
  let undertowSlow = 0;

  // Encounter schedule along the track.
  const encounters = [];
  const T = sector.threats;
  for (let at = 40; at < end - 50; at += 18 + random() * 22) {
    const roll = random();
    if (roll < 0.55 * T.blooms) encounters.push({ at, kind: 'blooms', count: 1 + Math.floor(random() * (2 + sector.index * 1.5)) });
    else if (roll < 0.7) encounters.push({ at, kind: 'signal' });
    else if (roll < 0.8 * (T.ropes > 0 ? 1 : 0) + 0.7) encounters.push({ at, kind: 'rope' });
    else if (T.undertows) encounters.push({ at, kind: 'undertow' });
  }
  if (T.lifeguards) for (let k = 0; k < T.lifeguards; k++) encounters.push({ at: end * (0.45 + k * 0.25), kind: 'lifeguard' });
  encounters.sort((a, b) => a.at - b.at);
  let nextEncounter = 0;

  function spawnBloom(atS, off, y) {
    const b = blooms.find((x) => !x.active);
    if (!b) return;
    b.active = true;
    b.hp = 2 + (sector.index > 1 ? 1 : 0);
    b.dying = 0;
    b.phase = random() * 6;
    b.pos = lateral(atS, seed, off, y);
    b.drift = [(random() - 0.5) * 0.8, 0, 0];
  }

  function spawn(e) {
    const ahead = e.at + 70;
    if (e.kind === 'blooms') {
      for (let k = 0; k < e.count; k++) spawnBloom(ahead + k * 4, (random() - 0.5) * HALF * 1.5, 0.7 + random() * 2.6);
    } else if (e.kind === 'signal') {
      const g = signals.find((x) => !x.active);
      if (!g) return;
      const side = random() < 0.5 ? -1 : 1;
      g.active = true;
      g.used = 0;
      g.pos = lateral(ahead, seed, side * (HALF - 0.25), 2 + random() * 1.6);
      g.yaw = trackYaw(ahead, seed) + Math.PI / 2;
    } else if (e.kind === 'rope') {
      const r = ropes.find((x) => !x.active);
      if (!r) return;
      r.active = true;
      r.s = ahead;
      r.floats.forEach((f, j) => {
        f.alive = true;
        f.pos = lateral(ahead, seed, (j - 2) * 1.25, 1.25);
      });
      hud.say('DEZ', 'Rope across the channel. Pop the floats!', 'crew');
    } else if (e.kind === 'undertow') {
      const u = undertows.find((x) => !x.active);
      if (!u) return;
      u.active = true;
      u.s = ahead;
      u.offset = (random() - 0.5) * 2.4;
      u.hp = 4 + sector.index;
      u.grabbed = false;
    } else if (e.kind === 'lifeguard') {
      const l = lifeguards[0];
      l.active = true;
      l.s = ahead + 20;
      l.side = random() < 0.5 ? -1 : 1;
      l.blinded = false;
      l.whistled = false;
      hud.say('MARS', 'Lifeguard chair ahead. Shoot its lamp before it sees us.', 'crew');
    }
  }

  function damage(n, reason) {
    events.damage(n, reason);
    shake = 0.5;
  }

  /** Resolve one shot along the ray. Returns the hit point for the beam. */
  function shoot(eye, dir) {
    let best = Infinity, hit = null;
    const test = (center, radius, onHit) => {
      const t = raySphere(eye, dir, center, radius);
      if (t < best) { best = t; hit = onHit; }
    };
    for (const b of blooms) if (b.active && !b.dying) test(b.pos, 0.75, () => {
      b.hp -= state.damage;
      sound.hit();
      hud.hitmarker();
      if (b.hp <= 0) {
        b.dying = 0.001;
        sound.burst();
        events.score(100, 'ENTITY DISPERSED');
        events.cleared();
        ripple = [b.pos[0], 0, b.pos[2]];
        rippleTime = time;
      }
    });
    for (const g of signals) if (g.active && !g.used) test(g.pos, 0.85, () => {
      g.used = 0.001;
      sound.heal();
      events.heal(18);
      events.score(50, 'SIGNAL · VITALS RESTORED');
      state.drift = Math.max(0, state.drift - 20);
    });
    for (const r of ropes) if (r.active) for (const f of r.floats) if (f.alive) test(f.pos, 0.45, () => {
      f.alive = false;
      sound.burst();
      hud.hitmarker();
      events.score(40, 'FLOAT POPPED');
      if (r.floats.every((x) => !x.alive)) {
        events.score(150, 'LANE ROPE CUT');
        r.active = false;
        events.cleared();
        hide(r.line);
      }
    });
    for (const l of lifeguards) if (l.active && !l.blinded) test(l.lampPos || [0, -999, 0], 0.6, () => {
      l.blinded = true;
      sound.burst();
      events.score(200, 'LIFEGUARD BLINDED');
      hud.say('MARS', 'It can\'t see. Go, go.', 'crew');
    });
    // The Undertow patch is on the water surface.
    for (const u of undertows) if (u.active) {
      const t = rayPlaneY(eye, dir, 0.02);
      if (t < best) {
        const p = add(eye, scale(dir, t));
        const c = lateral(u.s, seed, u.offset, 0);
        if (Math.hypot(p[0] - c[0], p[2] - c[2]) < 1.6) {
          best = t;
          hit = () => {
            u.hp -= state.damage;
            hud.hitmarker();
            sound.hit();
            ripple = [c[0], 0, c[2]];
            rippleTime = time;
            if (u.hp <= 0) {
              u.active = false;
              hide(u.patch); hide(u.eye);
              sound.splash();
              events.score(180, 'UNDERTOW BROKEN');
              events.cleared();
              if (u.grabbed) undertowSlow = 0;
            }
          };
        }
      }
    }
    // Walls and water stop the beam.
    const tw = rayPlaneY(eye, dir, 0);
    if (tw < best) { best = tw; hit = () => { ripple = add(eye, scale(dir, tw)); rippleTime = time; }; }
    if (best === Infinity) best = 40;
    hit?.();
    return add(eye, scale(dir, Math.min(best, 60)));
  }

  function update(dt) {
    time += dt;
    hud.update(dt);

    // Speed: boost with Shift, slowed while the Undertow holds the raft.
    const boosting = isDown('shift') && !finished;
    const target = finished ? 0 : (boosting ? sector.speed * 1.7 : sector.speed) * (undertowSlow > 0 ? 0.35 : 1);
    speed = damp(speed, target, finished ? 2.5 : 3, dt);
    undertowSlow = Math.max(0, undertowSlow - dt);
    s = Math.min(end, s + speed * dt);
    if (boosting) state.drift = Math.max(0, state.drift - dt * 2);

    // Dodge
    const dodgeIn = (isDown('a') || isDown('arrowleft') ? -1 : 0) + (isDown('d') || isDown('arrowright') ? 1 : 0) + input.move[0];
    offset = damp(offset, clamp(dodgeIn, -1, 1) * 1.8, 6, dt);

    // Drift creeps up while riding warm water; faster deeper down.
    state.drift = Math.min(100, state.drift + dt * (0.5 + sector.index * 0.35));

    while (nextEncounter < encounters.length && encounters[nextEncounter].at <= s) spawn(encounters[nextEncounter++]);

    // Camera on the rail.
    const bob = Math.sin(time * 2.1) * 0.05 + Math.sin(time * 1.3) * 0.03;
    shake = Math.max(0, shake - dt);
    const jitter = shake > 0 ? [(Math.random() - 0.5) * shake * 0.3, (Math.random() - 0.5) * shake * 0.3, 0] : [0, 0, 0];
    const eye = add(lateral(s, seed, offset, 1.35 + bob), jitter);
    const look = lateral(s + 10, seed, offset * 0.6, 1.2 + bob * 0.5);
    const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    const aimNdc = input.touch && !input.firing ? [0, 0] : input.aim;
    const aimDir = screenRay(eye, look, FOV, aspect, aimNdc[0], aimNdc[1]);
    hud.crosshair(aimNdc[0], aimNdc[1], false);

    // Recycle segments behind the camera to the front.
    for (const seg of segments) {
      while (seg.s + SEG < s - SEG) seg.s += SEGMENTS * SEG;
      const mid = seg.s + SEG / 2;
      const p = trackPoint(mid, seed);
      const yaw = trackYaw(mid, seed);
      const r = trackRight(mid, seed);
      const past = seg.s > end + 4;
      if (past) {
        for (const k of ['left', 'right', 'ceiling', 'floor', 'water', 'lamp', 'pillar']) hide(seg[k]);
        continue;
      }
      writeYaw(seg.left.matrix, [p[0] - r[0] * (HALF + 0.3), HEIGHT / 2 - 0.6, p[2] - r[2] * (HALF + 0.3)], yaw, 0.6, HEIGHT + 1.2, SEG + 0.9);
      writeYaw(seg.right.matrix, [p[0] + r[0] * (HALF + 0.3), HEIGHT / 2 - 0.6, p[2] + r[2] * (HALF + 0.3)], yaw, 0.6, HEIGHT + 1.2, SEG + 0.9);
      writeYaw(seg.ceiling.matrix, [p[0], HEIGHT + 0.3, p[2]], yaw, HALF * 2 + 1.8, 0.6, SEG + 0.9);
      writeYaw(seg.floor.matrix, [p[0], -0.9, p[2]], yaw, HALF * 2 + 1.2, 0.6, SEG + 0.9);
      writeYaw(seg.water.matrix, [p[0], -0.01, p[2]], yaw, HALF * 2 + 0.2, 0.02, SEG + 0.9);
      const lit = Math.floor(seg.s / SEG) % 2 === 0;
      if (lit) writeYaw(seg.lamp.matrix, [p[0], HEIGHT - 0.02, p[2]], yaw, 1.5, 0.06, 0.5);
      else hide(seg.lamp);
      // Some lamps buzz and flicker.
      const flick = seg.flicker > 0.82 ? (Math.sin(time * 37 + seg.flicker * 90) > 0.6 ? 0.15 : 1) : 1;
      seg.lamp.material.emission = 9 * flick;
      if (seg.hasPillar) writeYaw(seg.pillar.matrix, [p[0] + r[0] * seg.pillarSide * (HALF - 0.35), HEIGHT / 2, p[2] + r[2] * seg.pillarSide * (HALF - 0.35)], yaw, 0.7, HEIGHT, 0.7);
      else hide(seg.pillar);
    }

    // The ten nearest lit lamps in front of the camera drive the point lights.
    const lamps = segments
      .filter((seg) => Math.floor(seg.s / SEG) % 2 === 0 && seg.s > s - 8 && seg.s < end)
      .sort((a, b) => a.s - b.s)
      .slice(0, quality.lights)
      .map((seg) => {
        const p = trackPoint(seg.s + SEG / 2, seed);
        return { position: [p[0], HEIGHT - 0.4, p[2]], color: lampColor, intensity: 7 * (seg.lamp.material.emission / 9), radius: 0.4, range: 16 };
      });

    // Raft lip
    const fwd = normalize(sub(look, eye));
    const rgt = normalize(cross(fwd, [0, 1, 0]));
    const raftPos = add(lateral(s + 0.1, seed, offset, 0.18), [0, bob * 0.5, 0]);
    writeBasis(raft.matrix, raftPos, rgt, fwd, cross(rgt, fwd), 0.95, 0.95, 1.3);

    // Blooms drift toward the raft and burst on contact.
    for (const b of blooms) {
      if (!b.active) continue;
      if (b.dying) {
        b.dying += dt;
        const k = 1 + b.dying * 6;
        writeYaw(b.core.matrix, b.pos, 0, 0.45 * k, 0.45 * k, 0.45 * k);
        b.core.material.emission = Math.max(0.02, 6 - b.dying * 30);
        hide(b.spikes);
        if (b.dying > 0.18) { b.active = false; hide(b.core); }
        continue;
      }
      const toCam = sub(eye, b.pos);
      const d = Math.hypot(toCam[0], toCam[1], toCam[2]);
      const closing = d < 22 ? 2.2 + sector.index * 0.6 : 0;
      b.pos = add(b.pos, add(scale(normalize(toCam), closing * dt), scale(b.drift, dt)));
      b.phase += dt * 3;
      const pulse = 0.45 + Math.sin(b.phase) * 0.05;
      writeYaw(b.core.matrix, [b.pos[0], b.pos[1] + Math.sin(b.phase * 0.7) * 0.15, b.pos[2]], b.phase * 0.4, pulse, pulse * 0.92, pulse);
      writeYaw(b.spikes.matrix, b.pos, b.phase, pulse * 2.3, 0.07, 0.07);
      b.core.material.emission = 1.6 + Math.sin(b.phase * 2) * 0.8;
      if (d < 1.1) {
        b.active = false;
        hide(b.core); hide(b.spikes);
        sound.burst();
        damage(12, 'A Bloom burst against you.');
      } else if (trackPointBehind(b.pos)) {
        b.active = false;
        hide(b.core); hide(b.spikes);
      }
    }

    for (const g of signals) {
      if (!g.active) continue;
      if (g.used) {
        g.used += dt;
        g.ring.material.emission = Math.max(0.02, 8 - g.used * 20);
        if (g.used > 0.4) { g.active = false; hide(g.ring); }
      } else {
        g.ring.material.emission = 2.6 + Math.sin(time * 4) * 0.8;
      }
      writeYaw(g.ring.matrix, g.pos, g.yaw, 0.55, 0.55, 0.55);
      if (trackPointBehind(g.pos)) { g.active = false; hide(g.ring); }
    }

    for (const r of ropes) {
      if (!r.active) continue;
      const p = lateral(r.s, seed, 0, 1.25);
      writeYaw(r.line.matrix, p, trackYaw(r.s, seed), HALF * 2, 0.04, 0.04);
      r.floats.forEach((f, j) => {
        if (f.alive) {
          const wob = Math.sin(time * 3 + j) * 0.08;
          writeYaw(f.part.matrix, add(f.pos, [0, wob, 0]), 0, 0.32, 0.26, 0.32);
        } else hide(f.part);
      });
      if (r.s < s + 0.5) {
        r.active = false;
        hide(r.line);
        r.floats.forEach((f) => hide(f.part));
        sound.splash();
        damage(18, 'The Lane Rope dragged you through the water.');
        state.drift = Math.min(100, state.drift + 12);
      }
    }

    for (const u of undertows) {
      if (!u.active) continue;
      const c = lateral(u.s, seed, u.offset, 0.012);
      const breathe = 1.5 + Math.sin(time * 0.8) * 0.1;
      writeYaw(u.patch.matrix, c, 0, breathe, 0.01, breathe);
      const near = u.s - s;
      u.eye.material.emission = near < 18 ? 3 + Math.sin(time * 10) * 2 : 0.02;
      writeYaw(u.eye.matrix, add(c, [0, 0.02, 0]), 0, 0.12, 0.03, 0.12);
      if (near < 14 && !u.warned) {
        u.warned = true;
        hud.say('JUNE', 'Still water. Shoot the still water!', 'crew');
      }
      if (near < 0.5 && !u.grabbed) {
        u.grabbed = true;
        undertowSlow = 3.5;
        sound.gurgle();
        damage(10, 'The Undertow took hold of the raft.');
        state.drift = Math.min(100, state.drift + 15);
        for (let k = 0; k < 3; k++) spawnBloom(s + 14 + k * 3, (random() - 0.5) * 4, 0.6 + random() * 2);
      }
      if (near < -6) { u.active = false; hide(u.patch); hide(u.eye); }
    }

    for (const l of lifeguards) {
      if (!l.active) continue;
      const base = lateral(l.s, seed, l.side * (HALF - 0.6), 0);
      const yaw = trackYaw(l.s, seed);
      const r = trackRight(l.s, seed);
      writeYaw(l.chairL.matrix, add(base, [r[0] * -0.35, 1.6, r[2] * -0.35]), yaw, 0.08, 3.2, 0.08);
      writeYaw(l.chairR.matrix, add(base, [r[0] * 0.35, 1.6, r[2] * 0.35]), yaw, 0.08, 3.2, 0.08);
      writeYaw(l.seat.matrix, add(base, [0, 3.2, 0]), yaw, 0.9, 0.08, 0.6);
      // Too tall, too thin. The head turns to follow you.
      writeYaw(l.body.matrix, add(base, [0, 3.95, 0]), yaw, 0.17, 1.5, 0.13);
      const headPos = add(base, [0, 4.85, 0]);
      const watch = Math.atan2(eye[0] - headPos[0], eye[2] - headPos[2]);
      writeYaw(l.head.matrix, headPos, watch, 0.17, 0.24, 0.17);
      writeYaw(l.glasses.matrix, add(headPos, [Math.sin(watch) * 0.13, 0.03, Math.cos(watch) * 0.13]), watch, 0.3, 0.06, 0.04);
      l.lampPos = add(base, [-l.side * r[0] * 1.1, 4.6, -l.side * r[2] * 1.1]);
      if (!l.blinded) writeYaw(l.lamp.matrix, l.lampPos, 0, 0.3, 0.3, 0.3);
      else hide(l.lamp);
      const near = l.s - s;
      if (near < 9 && !l.blinded && !l.whistled) {
        l.whistled = true;
        sound.whistle();
        hud.say('THE LIFEGUARD', '— a long whistle —', 'attendant');
        damage(8, 'The Lifeguard saw you.');
        for (let k = 0; k < 6; k++) spawnBloom(s + 12 + k * 2.5, (random() - 0.5) * 5, 0.6 + random() * 2.4);
      }
      if (near < -10) {
        l.active = false;
        for (const p of [l.chairL, l.chairR, l.seat, l.body, l.head, l.glasses, l.lamp]) hide(p);
      }
    }

    // End of the line: the dock.
    const dockS = end + 2;
    const dp = lateral(dockS, seed, 0, 0);
    const dyaw = trackYaw(dockS, seed);
    writeYaw(dock.matrix, add(dp, [0, 0.15, 0]), dyaw, HALF * 2 + 1, 0.5, 6);
    writeYaw(endWall.matrix, lateral(dockS + 4, seed, 0, HEIGHT / 2), dyaw, HALF * 2 + 1.5, HEIGHT + 1, 0.6);
    writeYaw(dockDoor.matrix, lateral(dockS + 3.65, seed, 0, 1.4), dyaw, 1.6, 2.6, 0.12);
    dockDoor.material.emission = 0.6 + Math.sin(time * 3) * 0.3;

    if (!finished && s >= end - 0.5) {
      finished = true;
      hud.say('THE ATTENDANT', sector.attendant.dock, 'attendant');
      sound.chime();
    }
    if (finished) {
      hud.prompt('E · Leave the raft');
      if (wasPressed('e')) {
        events.disembark(); // this scene is disposed now
        return;
      }
    }

    // Crew and PA lines.
    nextAmbient -= dt;
    if (nextAmbient <= 0) {
      nextAmbient = 10 + random() * 10;
      if (crewLine < sector.crew.length) {
        const [who, line] = sector.crew[crewLine++];
        hud.say(who, line, 'crew');
      } else if (state.drift > 55) {
        hud.say('THE ATTENDANT', AMBIENT.drift[Math.floor(random() * AMBIENT.drift.length)], 'drift');
      } else if (sector.index > 0 && random() < 0.4) {
        hud.say('???', AMBIENT.marco[Math.floor(random() * AMBIENT.marco.length)], 'marco');
        state.drift = Math.min(100, state.drift + 4);
      } else {
        hud.say('THE ATTENDANT', AMBIENT.attendant[Math.floor(random() * AMBIENT.attendant.length)], 'attendant');
      }
    }

    // Blaster
    if (wasPressed('r')) blaster.recharge();
    if (blaster.trigger(dt, input.firing)) {
      const to = shoot(eye, aimDir);
      blaster.showBeam(blaster.muzzle(eye, look, aimDir), to);
    }
    blaster.place(eye, look, aimDir, bob * 0.3);

    hud.depth(`${(sector.depth + (s / end) * 6).toFixed(1)} M · ${Math.round(speed * 3.6)} KM/H`);
    events.tick(dt);

    if (quality.skipRender) return;
    renderer.updateParts(parts);
    renderer.render({
      eye, target: look, fov: FOV, time,
      waterRipple: ripple, rippleTime: time - rippleTime,
      environment: { pointLights: lamps },
      exposure: 1.05 - state.drift * 0.002,
      effects: {
        bloom: { strength: quality.bloom, threshold: 1, radius: 1.3 },
        vignette: 0.32 + state.drift * 0.004,
        grain: 0.035,
        saturation: 1 - state.drift * 0.006,
        temperature: sector.index === 0 ? 0.08 : -0.06,
      },
    });

    function trackPointBehind(p) {
      const here = trackPoint(s, seed);
      return p[2] > here[2] + 3; // the track runs toward -Z
    }
  }

  return {
    update,
    resize: () => renderer.resize(),
    dispose: () => renderer.dispose(),
    get progress() {
      return s / end;
    },
  };
}
