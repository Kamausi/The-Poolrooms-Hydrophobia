// On foot: off the raft at a maintenance dock. Find the power cell, reach the Safe Room door.
// Quiet and exposed, with pressure from roaming Blooms, the Undertow and the Lifeguard.
import { Renderer67, box, sphere, cylinder, torus } from '67js';
import { writeYaw, writeBasis, hide, add, sub, scale, normalize, clamp, damp, rng, raySphere, rayPlaneY, linear, distance, cross, display } from './math.js';
import { tileTexture } from './textures.js';
import { createBlaster } from './blaster.js';
import { input, wasPressed, isDown, requestLock } from './input.js';
import { hud } from './hud.js';
import { sound } from './audio.js';
import { quality } from './quality.js';
import { AMBIENT } from './sectors.js';

const CELL = 4;
const HEIGHT = 5;
const FOV = 74;
const EYE = 1.65;
const POOL = -0.65; // pool floor
const SURFACE = -0.05; // water surface
const RADIUS = 0.45;

export function createExplore(canvas, state, sector, events) {
  const random = rng(2000 + sector.index * 17 + state.attempt);
  const rows = sector.map;
  const H = rows.length, W = rows[0].length;
  const at = (cx, cz) => (cz < 0 || cz >= H || cx < 0 || cx >= W ? '#' : rows[cz][cx]);
  const isWall = (cx, cz) => at(cx, cz) === '#';
  const cellOf = (x, z) => [Math.floor(x / CELL), Math.floor(z / CELL)];
  const center = (cx, cz) => [cx * CELL + CELL / 2, 0, cz * CELL + CELL / 2];
  // 'd' cells are drainable: water unless the drain valve was shot from the raft.
  const drained = !!state.drained?.[sector.index];
  const isWaterCell = (ch) => ch === '~' || ch === 'L' || ch === 'u' || (ch === 'd' && !drained);
  const isPoolCell = (ch) => isWaterCell(ch) || ch === 'd';
  const inPool = (x, z) => isPoolCell(at(...cellOf(x, z)));
  const inWater = (x, z) => isWaterCell(at(...cellOf(x, z)));
  const find = (ch) => {
    const out = [];
    rows.forEach((row, z) => [...row].forEach((c, x) => c === ch && out.push([x, z])));
    return out;
  };

  const map = tileTexture(sector);
  const tileMat = { color: [1, 1, 1], metallic: 0, roughness: 0.22, map, boxMapScale: 0.5 };
  const lampColor = linear(sector.lamp);
  const slab = box(0, 1);
  const ball = sphere(28, 18);
  const parts = [];
  const push = (p) => (parts.push(p), p);
  const part = (name, geometry, material) => push({ name, geometry, matrix: new Float32Array(16), material });

  // Static level geometry.
  const lampCells = [];
  for (let z = 0; z < H; z++) {
    for (let x = 0; x < W; x++) {
      const c = center(x, z);
      if (isWall(x, z)) {
        const exposed = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => !isWall(x + dx, z + dz));
        if (exposed) writeYaw(part(`Wall ${x},${z}`, slab, tileMat).matrix, [c[0], HEIGHT / 2, c[2]], 0, CELL, HEIGHT, CELL);
        continue;
      }
      const water = isWaterCell(at(x, z));
      const top = isPoolCell(at(x, z)) ? POOL : 0;
      if (at(x, z) === 'd' && drained) {
        // Exposed maintenance paint on the drained floor.
        writeYaw(part(`Marking ${x},${z}`, slab, { color: [0.9, 0.75, 0.15], metallic: 0, roughness: 0.6, emission: 0.3, emissiveColor: [1, 0.8, 0.2] }).matrix, [c[0], POOL + 0.01, c[2]], 0, 0.35, 0.02, CELL * 0.8);
      }
      writeYaw(part(`Floor ${x},${z}`, slab, tileMat).matrix, [c[0], top - 0.25, c[2]], 0, CELL, 0.5, CELL);
      if (water) writeYaw(part(`Water ${x},${z}`, slab, { tag: 'water', color: linear(sector.water), metallic: 0.55, roughness: 0.08 }).matrix, [c[0], SURFACE - 0.01, c[2]], 0, CELL, 0.02, CELL);
      if ((x + z) % 2 === 0) {
        const lamp = part(`Lamp ${x},${z}`, slab, { color: lampColor, metallic: 0, roughness: 1, emission: 9, emissiveColor: lampColor });
        writeYaw(lamp.matrix, [c[0], HEIGHT - 0.03, c[2]], 0, 1.4, 0.06, 0.5);
        lampCells.push({ pos: [c[0], HEIGHT - 0.4, c[2]], part: lamp, flicker: random() });
      }
    }
  }
  writeYaw(part('Ceiling', slab, tileMat).matrix, [(W * CELL) / 2, HEIGHT + 0.25, (H * CELL) / 2], 0, W * CELL, 0.5, H * CELL);

  // Pool ledges: a lip of tile where dry floor meets water, so the step down reads.
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
    if (!isPoolCell(at(x, z))) continue;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = at(x + dx, z + dz);
      if (n === '#' || isPoolCell(n)) continue;
      const c = center(x, z);
      const p = [c[0] + dx * (CELL / 2 - 0.12), POOL / 2, c[2] + dz * (CELL / 2 - 0.12)];
      writeYaw(part(`Ledge ${x},${z},${dx},${dz}`, slab, tileMat).matrix, p, 0, dx ? 0.24 : CELL, -POOL, dz ? 0.24 : CELL);
    }
  }

  // Power cell
  const [pcx, pcz] = find('P')[0];
  const cellPos = add(center(pcx, pcz), [0, 0.9, 0]);
  const powerCell = part('Power cell', cylinder(24, 0.1, 2), { color: [0.9, 1, 0.4], metallic: 0, roughness: 0.3, emission: 4, emissiveColor: [0.85, 1, 0.35] });
  const cellStand = part('Cell stand', slab, { color: [0.2, 0.22, 0.2], metallic: 0.6, roughness: 0.4 });
  writeYaw(cellStand.matrix, add(center(pcx, pcz), [0, 0.3, 0]), 0, 0.8, 0.6, 0.8);
  let hasCell = false;

  // Safe Room door: on the wall next to S that faces it.
  const [scx, scz] = find('S')[0];
  const doorDir = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([dx, dz]) => isWall(scx + dx, scz + dz)) || [1, 0];
  const sc = center(scx, scz);
  const doorPos = [sc[0] + doorDir[0] * (CELL / 2 - 0.05), 1.4, sc[2] + doorDir[1] * (CELL / 2 - 0.05)];
  const door = part('Safe Room door', slab, { color: [0.4, 0.06, 0.05], metallic: 0.5, roughness: 0.35, emission: 1.2, emissiveColor: [1, 0.15, 0.1] });
  writeYaw(door.matrix, doorPos, 0, doorDir[0] ? 0.12 : 1.8, 2.8, doorDir[1] ? 0.12 : 1.8);
  const doorFrame = part('Door frame', slab, { color: [0.15, 0.16, 0.15], metallic: 0.7, roughness: 0.4 });
  writeYaw(doorFrame.matrix, add(doorPos, [doorDir[0] * 0.02, 0.1, doorDir[1] * 0.02]), 0, doorDir[0] ? 0.1 : 2.3, 3.2, doorDir[1] ? 0.1 : 2.3);

  // Scrap: parts for crafting in the Safe Room.
  const scrap = find('s').map(([x, z], i) => {
    const p = part(`Scrap ${i}`, box(0.1, 2), { color: [0.55, 0.6, 0.58], metallic: 0.9, roughness: 0.3, emission: 0.4, emissiveColor: [0.6, 1, 0.8] });
    return { part: p, pos: add(center(x, z), [(random() - 0.5) * 1.5, 0.25, (random() - 0.5) * 1.5]), taken: false };
  });

  // Signals on walls next to open floor.
  const signalSpots = [];
  for (let z = 1; z < H - 1; z++) for (let x = 1; x < W - 1; x++) {
    if (isWall(x, z)) continue;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (isWall(x + dx, z + dz)) signalSpots.push({ x, z, dx, dz });
  }
  const ring = torus(0.16, 40, 12);
  const signals = Array.from({ length: 3 }, (_, i) => {
    const spot = signalSpots.splice(Math.floor(random() * signalSpots.length), 1)[0];
    const c = center(spot.x, spot.z);
    const pos = [c[0] + spot.dx * (CELL / 2 - 0.1), 2.2, c[2] + spot.dz * (CELL / 2 - 0.1)];
    const p = part(`Signal ${i}`, ring, { color: [0.5, 1, 0.55], metallic: 0, roughness: 0.4, emission: 3, emissiveColor: [0.55, 1, 0.5] });
    writeYaw(p.matrix, pos, spot.dx ? Math.PI / 2 : 0, 0.5, 0.5, 0.5);
    return { part: p, pos, used: 0 };
  });

  // Blooms
  const blooms = Array.from({ length: 14 }, (_, i) => ({
    core: part(`Bloom ${i}`, ball, { color: [0.35, 0.03, 0.03], metallic: 0, roughness: 0.55, emission: 2, emissiveColor: [1, 0.22, 0.08] }),
    spikes: part(`Bloom spikes ${i}`, slab, { color: [0.12, 0.02, 0.02], metallic: 0.2, roughness: 0.5 }),
    active: false, pos: [0, 0, 0], hp: 2, phase: 0, dying: 0,
  }));

  // Undertow
  const undertowStart = find('u')[0];
  const undertow = {
    patch: part('Undertow', cylinder(48, 0, 1), { color: [0.004, 0.01, 0.012], metallic: 0.9, roughness: 0.02 }),
    eye: part('Undertow glint', ball, { color: [0.2, 0, 0], metallic: 0, roughness: 1, emission: 0, emissiveColor: [1, 0.1, 0.05] }),
    pos: undertowStart ? center(...undertowStart) : null, hp: 5 + sector.index * 2, holding: 0, alive: !!undertowStart, cooldown: 0,
  };

  // Lifeguard tower
  const towerCell = find('L')[0];
  const lifeguard = towerCell && {
    base: center(...towerCell),
    legs: [part('Tower leg A', cylinder(12, 0, 1), { color: [0.92, 0.92, 0.9], metallic: 0, roughness: 0.4 }), part('Tower leg B', cylinder(12, 0, 1), { color: [0.92, 0.92, 0.9], metallic: 0, roughness: 0.4 })],
    seat: part('Tower seat', slab, { color: [0.92, 0.92, 0.9], metallic: 0, roughness: 0.4 }),
    body: part('Lifeguard', cylinder(20, 0.3, 3), { color: [0.82, 0.7, 0.62], metallic: 0, roughness: 0.75 }),
    head: part('Lifeguard head', ball, { color: [0.8, 0.68, 0.6], metallic: 0, roughness: 0.7 }),
    glasses: part('Lifeguard glasses', slab, { color: [0.01, 0.01, 0.01], metallic: 1, roughness: 0.05 }),
    lamp: part('Lifeguard lamp', ball, { color: [1, 0.95, 0.8], metallic: 0, roughness: 1, emission: 10, emissiveColor: [1, 0.95, 0.8] }),
    blind: 0, notice: 0, cooldown: 0,
  };

  const blaster = createBlaster(state);
  parts.push(...blaster.parts);
  for (const b of blooms) { hide(b.core); hide(b.spikes); }
  if (!undertow.alive) { hide(undertow.patch); hide(undertow.eye); }

  // Parts that have not been placed yet would be a zero (singular) matrix, which 67js rejects.
  for (const p of parts) if (p.matrix[15] === 0) hide(p);
  const renderer = new Renderer67(canvas, parts, {
    ground: false, world: true, hdr: true, ...quality.renderer,
    environment: { keyIntensity: 0.04, fillIntensity: 0.1, ambientIntensity: 0.3, fogColor: linear(sector.fog), fogDensity: 0.05 + sector.index * 0.012, skyTop: display(sector.fog), skyBottom: display(sector.fog) },
  });
  renderer.resize();

  // Player
  const [dx0, dz0] = find('D')[0];
  const player = { pos: center(dx0, dz0), yaw: 0, pitch: 0, floor: 0 };
  // Face the most open direction.
  player.yaw = [[0, -1, 0], [1, 0, -Math.PI / 2], [0, 1, Math.PI], [-1, 0, Math.PI / 2]].find(([dx, dz]) => !isWall(dx0 + dx, dz0 + dz))?.[2] ?? 0;
  let time = 0;
  let ripple = [0, -100, 0], rippleTime = -10;
  let waveTimer = 22;
  let elapsed = 0;
  let nextLine = 6;
  let bob = 0;
  let wasWater = false;
  hud.objective('Find the power cell. Reach the Safe Room door.');
  if (find('d').length) hud.say('DEZ', drained ? `Valve worked. ${sector.valve[0].toUpperCase()}${sector.valve.slice(1)} is drained. Walk it dry.` : `You missed the valve, so ${sector.valve} is still flooded. Watch the water.`, 'crew');
  if (import.meta.env.DEV) window.__explore = { player, cellPos, doorPos, undertow, lifeguard, center };

  const spawnBloom = (pos) => {
    const b = blooms.find((x) => !x.active);
    if (!b) return;
    Object.assign(b, { active: true, pos: [...pos], hp: 2 + (sector.index > 1 ? 1 : 0), phase: random() * 6, dying: 0 });
  };
  for (const [x, z] of find('b')) spawnBloom(add(center(x, z), [0, 1.4, 0]));

  /** A wave spawns out of sight: an open cell at least 14 m away. */
  function wave(count) {
    const options = [];
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (!isWall(x, z) && distance(center(x, z), player.pos) > 14) options.push(center(x, z));
    for (let k = 0; k < count && options.length; k++) spawnBloom(add(options[Math.floor(random() * options.length)], [0, 1.2 + random(), 0]));
  }

  function collide(pos) {
    const [cx, cz] = cellOf(pos[0], pos[2]);
    for (let z = cz - 1; z <= cz + 1; z++) for (let x = cx - 1; x <= cx + 1; x++) {
      if (!isWall(x, z)) continue;
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

  /** March the ray through the grid to find the first wall, floor or ceiling. */
  function rayWorld(eye, dir) {
    for (let t = 0.2; t < 50; t += 0.15) {
      const p = add(eye, scale(dir, t));
      if (p[1] > HEIGHT || isWall(...cellOf(p[0], p[2]))) return t;
      const floor = inWater(p[0], p[2]) ? SURFACE : inPool(p[0], p[2]) ? POOL : 0;
      if (p[1] < floor) return t;
    }
    return 50;
  }

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
      if (b.hp <= 0) {
        b.dying = 0.001;
        sound.burst();
        events.score(100, 'ENTITY DISPERSED');
        events.cleared();
      }
    });
    for (const g of signals) if (!g.used) test(g.pos, 0.8, () => {
      g.used = 0.001;
      sound.heal();
      events.heal(20);
      events.score(50, 'SIGNAL · VITALS RESTORED');
      state.drift = Math.max(0, state.drift - 25);
    });
    if (lifeguard && lifeguard.blind <= 0) test(add(lifeguard.base, [0, 5.4, 0]), 0.6, () => {
      lifeguard.blind = 12;
      sound.burst();
      events.score(200, 'LIFEGUARD BLINDED');
    });
    if (undertow.alive) {
      const t = rayPlaneY(eye, dir, SURFACE);
      if (t < best + 0.2) {
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
              hide(undertow.patch); hide(undertow.eye);
              sound.splash();
              events.score(250, 'UNDERTOW BROKEN');
              events.cleared();
            }
          };
        }
      }
    }
    const end = add(eye, scale(dir, best));
    if (!hit && end[1] < 0.2) { ripple = end; rippleTime = time; }
    hit?.();
    return end;
  }

  function update(dt) {
    time += dt;
    elapsed += dt;
    // One prompt per frame; the most urgent one wins.
    const prompts = [];
    const ask = (priority, text) => prompts.push([priority, text]);
    hud.update(dt);

    // Look
    const sens = 0.0022;
    player.yaw -= input.look[0] * sens + ((isDown('arrowright') ? 1 : 0) - (isDown('arrowleft') ? 1 : 0)) * dt * 2.2;
    player.pitch = clamp(player.pitch - input.look[1] * sens + ((isDown('arrowup') ? 1 : 0) - (isDown('arrowdown') ? 1 : 0)) * dt * 1.6, -1.35, 1.35);
    const forward = [-Math.sin(player.yaw), 0, -Math.cos(player.yaw)];
    const right = [Math.cos(player.yaw), 0, -Math.sin(player.yaw)];

    // Move, unless the Undertow has you.
    const water = inWater(player.pos[0], player.pos[2]);
    let mx = (isDown('d') ? 1 : 0) - (isDown('a') ? 1 : 0) + input.move[0];
    let mz = (isDown('w') ? 1 : 0) - (isDown('s') ? 1 : 0) + input.move[1];
    const len = Math.hypot(mx, mz);
    if (len > 1) { mx /= len; mz /= len; }
    const speed = (water ? 2.3 : 4.2) * (isDown('shift') && !water ? 1.45 : 1);
    if (undertow.holding <= 0) {
      player.pos = add(player.pos, add(scale(forward, mz * speed * dt), scale(right, mx * speed * dt)));
      collide(player.pos);
    }
    if (len > 0.1) bob += dt * (water ? 5 : 8);
    if (water && !wasWater) { sound.splash(); ripple = [...player.pos]; rippleTime = time; }
    wasWater = water;
    player.floor = damp(player.floor, inPool(player.pos[0], player.pos[2]) ? POOL : 0, 10, dt);

    const bobY = Math.sin(bob) * 0.045;
    const eye = [player.pos[0], player.floor + EYE + bobY, player.pos[2]];
    const dir = [-Math.sin(player.yaw) * Math.cos(player.pitch), Math.sin(player.pitch), -Math.cos(player.yaw) * Math.cos(player.pitch)];
    const target = add(eye, dir);
    hud.crosshair(0, 0, true);

    // Drift: water is warm.
    state.drift = clamp(state.drift + dt * (water ? 2.2 : 0.35) * (1 + sector.index * 0.3), 0, 100);
    // Chlorine fumes after two minutes: they push you on.
    if (elapsed > 120) {
      if (elapsed - dt <= 120) hud.say('DEZ', 'Chlorine is rising. Your lungs will not like this. Move.', 'crew');
      events.damage(dt * 1.2, 'The chlorine fumes got you.', true);
    }

    // Pickups
    if (!hasCell) {
      writeYaw(powerCell.matrix, add(cellPos, [0, Math.sin(time * 2) * 0.08, 0]), time, 0.18, 0.55, 0.18);
      if (distance(cellPos, eye) < 2.3) {
        ask(2, 'E · Take the power cell');
        if (wasPressed('e')) {
          hasCell = true;
          hide(powerCell);
          sound.pickup();
          events.score(250, 'POWER CELL RECOVERED');
          hud.objective('Bring the power cell to the Safe Room door.');
          hud.say('DEZ', 'That cell fits the bulkhead. Find the door and get inside.', 'crew');
          wave(3 + sector.index * 2);
        }
      }
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
    const nearDoor = Math.hypot(doorPos[0] - eye[0], doorPos[2] - eye[2]) < 2.6;
    door.material.color = hasCell ? [0.08, 0.35, 0.12] : [0.4, 0.06, 0.05];
    door.material.emissiveColor = hasCell ? [0.35, 1, 0.45] : [1, 0.15, 0.1];
    door.material.emission = 1 + Math.sin(time * 3) * 0.4;
    if (nearDoor) {
      if (!hasCell) ask(1, 'POWER REQUIRED · Find the power cell');
      else {
        ask(2, 'E · Enter the Safe Room');
        if (wasPressed('e')) { sound.door(); events.safeRoom(); return; }
      }
    }

    // Waves on a timer: the Attendant calls them rush hour.
    waveTimer -= dt;
    if (waveTimer <= 0) {
      waveTimer = 26 - sector.index * 4 + random() * 8;
      hud.say('THE ATTENDANT', 'Attention riders: rush hour.', 'attendant');
      wave(2 + sector.index * 2);
    }

    // Blooms home in on you.
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
      const to = sub(add(eye, [0, -0.3, 0]), b.pos);
      const d = Math.hypot(...to);
      const v = d < 18 ? 1.5 + sector.index * 0.45 : 0.4;
      const next = add(b.pos, scale(normalize(to), v * dt));
      if (!isWall(...cellOf(next[0], next[2]))) b.pos = next;
      b.phase += dt * 3;
      const pulse = 0.45 + Math.sin(b.phase) * 0.05;
      writeYaw(b.core.matrix, [b.pos[0], b.pos[1] + Math.sin(b.phase * 0.7) * 0.12, b.pos[2]], b.phase * 0.4, pulse, pulse * 0.92, pulse);
      writeYaw(b.spikes.matrix, b.pos, b.phase, pulse * 2.3, 0.07, 0.07);
      b.core.material.emission = 1.6 + Math.sin(b.phase * 2) * 0.8;
      if (d < 1) {
        b.active = false;
        hide(b.core); hide(b.spikes);
        sound.burst();
        events.damage(14, 'A Bloom burst against you.');
      }
    }

    for (const g of signals) {
      if (g.used) {
        g.used += dt;
        g.part.material.emission = Math.max(0.2, 8 - g.used * 20);
      } else g.part.material.emission = 2.4 + Math.sin(time * 4) * 0.7;
    }

    // The Undertow follows you through the water and drags you down.
    if (undertow.alive) {
      const toP = sub(player.pos, undertow.pos);
      const d = Math.hypot(toP[0], toP[2]);
      undertow.cooldown -= dt;
      if (undertow.holding > 0) {
        undertow.holding -= dt;
        events.damage(dt * 9, 'The Undertow pulled you under.', true);
        state.drift = Math.min(100, state.drift + dt * 10);
        player.pos = add(player.pos, scale(sub(undertow.pos, player.pos), dt * 0.8));
        ask(5, 'THE UNDERTOW HAS YOU · Shoot the still water');
        if (undertow.holding <= 0) undertow.cooldown = 4;
      } else if (water) {
        const step = scale(normalize([toP[0], 0, toP[2]]), Math.min(d, (1.3 + sector.index * 0.3) * dt));
        const next = add(undertow.pos, step);
        if (inWater(next[0], next[2])) undertow.pos = next;
        if (d < 0.9 && undertow.cooldown <= 0) {
          undertow.holding = 3.5;
          sound.gurgle();
          hud.say('JUNE', 'It has you! Shoot the water under you!', 'crew');
        }
      }
      const r = 1.3 + Math.sin(time * 0.8) * 0.1;
      writeYaw(undertow.patch.matrix, [undertow.pos[0], SURFACE + 0.012, undertow.pos[2]], 0, r, 0.01, r);
      undertow.eye.material.emission = d < 8 ? 3 + Math.sin(time * 9) * 2 : 0.02;
      writeYaw(undertow.eye.matrix, [undertow.pos[0], SURFACE + 0.02, undertow.pos[2]], 0, 0.12, 0.03, 0.12);
    }

    // The Lifeguard: do not let it see you in the water.
    if (lifeguard) {
      const b = lifeguard.base;
      writeYaw(lifeguard.legs[0].matrix, add(b, [-0.4, 1.6, 0]), 0, 0.08, 4.2, 0.08);
      writeYaw(lifeguard.legs[1].matrix, add(b, [0.4, 1.6, 0]), 0, 0.08, 4.2, 0.08);
      writeYaw(lifeguard.seat.matrix, add(b, [0, 3.7, 0]), 0, 1, 0.08, 0.7);
      writeYaw(lifeguard.body.matrix, add(b, [0, 4.4, 0]), 0, 0.17, 1.4, 0.13);
      const head = add(b, [0, 5.25, 0]);
      const watch = Math.atan2(eye[0] - head[0], eye[2] - head[2]);
      writeYaw(lifeguard.head.matrix, head, watch, 0.17, 0.24, 0.17);
      writeYaw(lifeguard.glasses.matrix, add(head, [Math.sin(watch) * 0.13, 0.03, Math.cos(watch) * 0.13]), watch, 0.3, 0.06, 0.04);
      lifeguard.blind -= dt;
      lifeguard.cooldown -= dt;
      if (lifeguard.blind > 0) hide(lifeguard.lamp);
      else writeYaw(lifeguard.lamp.matrix, add(b, [0, HEIGHT - 0.35, 0]), 0, 0.3, 0.3, 0.3);
      const sees = lifeguard.blind <= 0 && water && distance(b, player.pos) < 18;
      lifeguard.notice = clamp(lifeguard.notice + (sees ? dt : -dt * 0.5), 0, 1.4);
      if (sees && lifeguard.notice > 0.2) ask(4, 'THE LIFEGUARD IS WATCHING · Get out of the water or shoot its lamp');
      if (lifeguard.notice >= 1.4 && lifeguard.cooldown <= 0) {
        lifeguard.cooldown = 10;
        lifeguard.notice = 0;
        sound.whistle();
        hud.say('THE LIFEGUARD', '— a long whistle —', 'attendant');
        state.drift = Math.min(100, state.drift + 15);
        wave(4 + sector.index * 2);
      }
    }

    // Radio and PA
    nextLine -= dt;
    if (nextLine <= 0) {
      nextLine = 14 + random() * 10;
      if (state.drift > 55) hud.say('THE ATTENDANT', AMBIENT.drift[Math.floor(random() * AMBIENT.drift.length)], 'drift');
      else if (sector.index > 0 && random() < 0.5) {
        hud.say('???', AMBIENT.marco[Math.floor(random() * AMBIENT.marco.length)], 'marco');
        state.drift = Math.min(100, state.drift + 5);
      } else hud.say('THE ATTENDANT', sector.attendant.explore, 'attendant');
    }

    // Blaster
    if (wasPressed('r')) blaster.recharge();
    if (!input.locked && !input.touch && input.firing) requestLock();
    if (blaster.trigger(dt, input.firing && (input.locked || input.touch))) {
      const to = shoot(eye, dir);
      blaster.showBeam(blaster.muzzle(eye, target, dir), to);
    }
    blaster.place(eye, target, dir, bobY * 0.4);

    // Nearest lamps drive the point lights.
    const lights = lampCells
      .map((l) => ({ l, d: distance(l.pos, eye) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, quality.lights)
      .map(({ l }) => {
        const flick = l.flicker > 0.85 ? (Math.sin(time * 41 + l.flicker * 50) > 0.5 ? 0.12 : 1) : 1;
        l.part.material.emission = 9 * flick;
        return { position: l.pos, color: lampColor, intensity: 6 * flick, radius: 0.4, range: 14 };
      });
    if (lifeguard && lifeguard.blind <= 0) lights.push({ position: add(lifeguard.base, [0, HEIGHT - 0.6, 0]), color: [1, 0.95, 0.8], intensity: 10, radius: 0.3, range: 14 });

    if (!input.locked && !input.touch) ask(0, 'CLICK to look around');
    prompts.sort((a, b) => b[0] - a[0]);
    hud.prompt(prompts[0]?.[1] || '');

    hud.depth(`${sector.depth.toFixed(1)} M · ON FOOT${water ? ' · IN WATER' : ''}`);
    events.tick(dt);

    if (quality.skipRender) return;
    renderer.updateParts(parts);
    renderer.render({
      eye, target, fov: FOV, time,
      waterRipple: ripple, rippleTime: time - rippleTime,
      environment: { pointLights: lights, fogDensity: (0.05 + sector.index * 0.012) * (elapsed > 120 ? 1.8 : 1) },
      exposure: 1.05 - state.drift * 0.002,
      effects: {
        bloom: { strength: quality.bloom, threshold: 1, radius: 1.3 },
        vignette: 0.35 + state.drift * 0.004 + (undertow.holding > 0 ? 0.3 : 0),
        grain: 0.04,
        saturation: 1 - state.drift * 0.006,
        temperature: sector.index === 0 ? 0.08 : -0.06,
      },
    });
  }

  return {
    update,
    resize: () => renderer.resize(),
    dispose: () => renderer.dispose(),
  };
}
