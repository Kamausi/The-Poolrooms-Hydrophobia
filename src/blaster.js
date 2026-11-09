// The Arc Blaster: a park maintenance instrument repurposed as a ride blaster.
// Three functions:
//   signal pulse     (hold click)  operates targets, switches and mechanisms; recharges; builds heat and noise
//   inspection beam  (hold right click or Q)  reveals hidden markings and reads targets; makes you visible
//   disruption burst (F)  interrupts entities or forces an emergency mechanism; costs a charge cell; very loud
import { box, cylinder, sphere } from '67js';
import { add, scale, cross, normalize, sub, length, writeBasis, hide, cameraBasis } from './math.js';
import { sound } from './audio.js';

const BEAM_TIME = 0.06;

/**
 * Four firing profiles and one tool, each with a job. Pulse spends ordinary charge (which always comes back);
 * the specialist profiles share one reserve, so a long Repeater burst leaves less for a Disruptor emergency.
 *   damage: multiplier on state.damage · special: reserve per shot · pellets/spread/range: the Scatter cone
 */
export const PROFILES = {
  pulse: { label: 'PULSE', key: '1', interval: 0.13, heat: 5, charge: 1, special: 0, damage: 1, color: [0.85, 1, 0.45], job: 'accurate · switches · weak points · focus magnifies' },
  repeater: { label: 'REPEATER', key: '2', interval: 0.065, heat: 3.4, charge: 0, special: 1.1, damage: 0.55, color: [1, 0.85, 0.35], job: 'sustained pressure · eats the reserve · heat' },
  scatter: { label: 'SCATTER', key: '3', interval: 0.8, heat: 16, charge: 0, special: 7, damage: 0.75, pellets: 7, spread: 0.07, range: 12, color: [1, 0.6, 0.3], job: 'close threats · knockback · clears a grip' },
  disruptor: { label: 'DISRUPTOR', key: '4', interval: 0.9, heat: 20, charge: 0, special: 12, damage: 3, color: [0.75, 0.55, 1], job: 'breaks anchors and linked nodes · interrupts machinery · focus locks a volley' },
  hook: { label: 'HOOK LINE', key: '5', interval: 1.1, heat: 0, charge: 0, special: 0, damage: 0, range: 16, color: [1, 0.8, 0.25], job: 'catch supplies · pull against a grip · reach · moor' },
};
export const PROFILE_ORDER = ['pulse', 'repeater', 'scatter', 'disruptor', 'hook'];
const BEAM_COLOR = [0.85, 1, 0.45];
const profileOf = (state) => PROFILES[state.profile] || PROFILES.pulse;
const SCAN_COLOR = [0.45, 0.85, 1];

export function createBlaster(state) {
  const mat = (color, emission = 0, emissiveColor = color) => ({ color, metallic: 0, roughness: 1, emission, emissiveColor });
  const body = { name: 'Blaster body', geometry: box(0.25, 3), matrix: new Float32Array(16), material: { color: [0.08, 0.16, 0.12], metallic: 0.3, roughness: 0.35 } };
  const shroud = { name: 'Blaster shroud', geometry: box(0.35, 3), matrix: new Float32Array(16), material: { color: [0.22, 0.36, 0.3], metallic: 0.1, roughness: 0.3 } };
  const tube = { name: 'Blaster tube', geometry: cylinder(24, 0.1, 2), matrix: new Float32Array(16), material: { color: [0.8, 1, 0.8], metallic: 0, roughness: 0.2, emission: 2.5, emissiveColor: [0.6, 1, 0.55] } };
  const barrel = { name: 'Blaster barrel', geometry: cylinder(24, 0.05, 2), matrix: new Float32Array(16), material: { color: [0.05, 0.06, 0.06], metallic: 0.8, roughness: 0.3 } };
  const lens = { name: 'Inspection lens', geometry: sphere(12, 8), matrix: new Float32Array(16), material: mat([0.3, 0.6, 0.8], 0.4, SCAN_COLOR) };
  const flash = { name: 'Muzzle flash', geometry: sphere(16, 10), matrix: new Float32Array(16), material: mat(BEAM_COLOR, 12) };
  const beam = { name: 'Arc beam', geometry: box(0, 1), matrix: new Float32Array(16), material: mat(BEAM_COLOR, 14) };
  const scanBeam = { name: 'Inspection beam', geometry: box(0, 1), matrix: new Float32Array(16), material: mat(SCAN_COLOR, 3) };
  const burstShell = { name: 'Disruption burst', geometry: sphere(24, 16), matrix: new Float32Array(16), material: { ...mat([0.7, 0.9, 1], 6, [0.7, 0.9, 1]), alphaMode: 'blend', opacity: 0.35, doubleSided: true } };
  // The hand you see all game: a work glove and a wet sleeve cuff. Drift shows here first: the glove swells,
  // the sleeve sits differently, the fingers lose their edges. Aim is never affected.
  const glove = { name: 'Glove', geometry: sphere(14, 10), matrix: new Float32Array(16), material: { color: [0.07, 0.075, 0.07], metallic: 0, roughness: 0.75 } };
  const cuff = { name: 'Sleeve cuff', geometry: cylinder(16, 0.2, 2), matrix: new Float32Array(16), material: { color: [0.55, 0.28, 0.16], metallic: 0, roughness: 0.85 } };
  const parts = [body, shroud, tube, barrel, lens, flash, beam, scanBeam, burstShell, glove, cuff];
  for (const p of parts) hide(p);

  let cooldown = 0;
  let rechargeTimer = 0;
  let overheat = 0;
  let beamTimer = 0;
  let burstTimer = 0;
  let burstAt = [0, 0, 0];
  let kick = 0;
  let beamFrom = [0, 0, 0];
  let beamTo = [0, 0, 0];
  let scanning = false;
  let scanFrom = [0, 0, 0];
  let scanTo = [0, 0, 0];
  let trickle = 0;

  function recharge() {
    if (state.recharging || state.charge === state.maxCharge) return;
    state.recharging = true;
    rechargeTimer = state.rechargeTime;
    sound.recharge();
  }

  return {
    parts,
    recharge,
    /**
     * Advance timers and decide whether a pulse leaves the gun this frame.
     * mounted: seated on the raft, where the mount trickles charge back in.
     */
    trigger(dt, wantsFire, mounted = false) {
      cooldown -= dt;
      beamTimer -= dt;
      burstTimer -= dt;
      kick = Math.max(0, kick - dt * 8);
      state.noise = Math.max(0, state.noise - dt * 9);
      if (overheat > 0) {
        overheat -= dt;
        state.heat = Math.max(0, state.heat - dt * 45);
        return false;
      }
      state.heat = Math.max(0, state.heat - dt * (wantsFire ? 10 : 34));
      // The specialist reserve creeps back on its own, slowly.
      state.special = Math.min(100, (state.special ?? 60) + dt * (mounted ? 0.7 : 0.4));
      if (mounted && !wantsFire && !state.recharging && state.charge < state.maxCharge) {
        trickle += dt * 5;
        while (trickle >= 1 && state.charge < state.maxCharge) { state.charge += 1; trickle -= 1; }
      }
      if (state.recharging) {
        rechargeTimer -= dt * (mounted ? 1.6 : 1);
        if (rechargeTimer <= 0) {
          state.recharging = false;
          state.charge = state.maxCharge;
        }
        return false;
      }
      if (!wantsFire || cooldown > 0) return false;
      const P = profileOf(state);
      if ((P.charge && state.charge <= 0) || (P.special && (state.special ?? 0) < P.special)) {
        cooldown = 0.3;
        sound.empty();
        return false;
      }
      state.charge -= P.charge;
      if (P.special) state.special -= P.special;
      state.heat += P.heat;
      state.noise = Math.min(100, state.noise + (P === PROFILES.hook ? 2 : 7));
      cooldown = P.interval;
      kick = P === PROFILES.scatter || P === PROFILES.disruptor ? 2.2 : 1;
      beam.material.emissiveColor = P.color;
      beam.material.color = P.color;
      if (P === PROFILES.scatter) sound.scatter?.();
      else if (P === PROFILES.disruptor) sound.disrupt?.();
      else if (P === PROFILES.hook) sound.hookThrow?.();
      else sound.fire();
      state.drift = Math.max(0, state.drift - 0.6);
      if (state.heat >= 100) {
        overheat = 1.6;
        sound.empty();
        state.overheated = true;
      } else state.overheated = false;
      if (state.charge === 0 && P.charge) recharge();
      return true;
    },
    get overheated() {
      return overheat > 0;
    },
    /** Disruption burst: spends a charge cell. Returns true if it went off. */
    burst(at) {
      if (state.cells <= 0) {
        sound.empty();
        return false;
      }
      state.cells -= 1;
      state.noise = 100;
      burstTimer = 0.45;
      burstAt = at;
      sound.burstBig();
      return true;
    },
    showBeam(from, to) {
      beamFrom = from;
      beamTo = to;
      beamTimer = BEAM_TIME;
    },
    showScan(on, from, to) {
      scanning = on;
      scanFrom = from;
      scanTo = to;
    },
    muzzle(eye, target, aim) {
      const { right, up } = cameraBasis(eye, target, state.cameraUp);
      return add(add(add(eye, scale(right, 0.24)), scale(up, -0.2)), scale(aim, 0.75));
    },
    place(eye, target, aim, bob = 0) {
      const cam = cameraBasis(eye, target, state.cameraUp);
      const z = normalize(aim);
      const x = normalize(cross([0, 1, 0], z));
      const y = cross(z, x);
      const G = 0.6;
      // As Drift rises your grip relaxes and the blaster sags out of view.
      const sag = Math.max(0, state.drift - 40) * 0.0025;
      const base = add(add(add(eye, scale(cam.right, 0.24 + sag * 0.3)), scale(cam.up, -0.2 + bob - sag)), scale(cam.forward, 0.5 - kick * 0.04));
      const at = (o) => add(add(add(base, scale(x, o[0] * G)), scale(y, o[1] * G)), scale(z, o[2] * G));
      writeBasis(body.matrix, at([0, 0, 0]), x, y, z, 0.13 * G, 0.12 * G, 0.46 * G);
      const swell = Math.max(0, state.drift - 30) * 0.007;
      writeBasis(glove.matrix, at([0.01, -0.09, 0.1]), x, y, z, 0.09 * G * (1 + swell), 0.11 * G * (1 + swell * 0.6), 0.13 * G * (1 + swell * 0.8));
      const pale = Math.min(1, swell * 1.6);
      glove.material.color = [0.07 + pale * 0.5, 0.075 + pale * 0.46, 0.07 + pale * 0.4]; // the glove pales and softens toward skin
      writeBasis(cuff.matrix, at([0.02, -0.12, 0.3 + swell * 0.1]), x, z, y, 0.11 * G * (1 + swell * 0.4), 0.16 * G, 0.11 * G * (1 + swell * 0.4));
      writeBasis(shroud.matrix, at([0, 0.085, -0.02]), x, y, z, 0.1 * G, 0.06 * G, 0.34 * G);
      writeBasis(tube.matrix, at([-0.072, 0.02, 0.02]), y, z, x, 0.022 * G, 0.36 * G, 0.022 * G);
      writeBasis(barrel.matrix, at([0, 0, 0.29]), x, z, y, 0.035 * G, 0.14 * G, 0.035 * G);
      writeBasis(lens.matrix, at([0.07, 0.07, 0.2]), x, y, z, 0.03 * G, 0.03 * G, 0.03 * G);
      lens.material.emission = scanning ? 6 : 0.4;
      const charge = state.charge / state.maxCharge;
      const hot = state.heat / 100;
      tube.material.emissiveColor = [0.6 + hot * 0.4, 1 - hot * 0.7, 0.55 - hot * 0.45];
      tube.material.emission = overheat > 0 ? 0.3 + Math.random() : state.recharging ? 0.6 + Math.random() * 0.8 : 0.4 + charge * 2.6;
      if (beamTimer > 0) {
        writeBasis(flash.matrix, at([0, 0, 0.38]), x, y, z, 0.045, 0.045, 0.045);
        stretch(beam, beamFrom, beamTo, 0.018);
      } else {
        hide(flash);
        hide(beam);
      }
      if (scanning) stretch(scanBeam, scanFrom, scanTo, 0.008);
      else hide(scanBeam);
      if (burstTimer > 0) {
        const r = (1 - burstTimer / 0.45) * 14;
        burstShell.matrix.set([r, 0, 0, 0, 0, r, 0, 0, 0, 0, r, 0, burstAt[0], burstAt[1], burstAt[2], 1]);
        burstShell.material.emission = burstTimer * 14;
      } else hide(burstShell);
    },
  };
}

function stretch(part, from, to, width) {
  const d = sub(to, from);
  const len = length(d);
  const bz = normalize(d);
  const bx = normalize(cross(Math.abs(bz[1]) > 0.95 ? [1, 0, 0] : [0, 1, 0], bz));
  const by = cross(bz, bx);
  writeBasis(part.matrix, add(from, scale(d, 0.5)), bx, by, bz, width, width, Math.max(0.01, len));
}
