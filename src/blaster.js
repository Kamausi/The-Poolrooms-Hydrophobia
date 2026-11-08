// The Arc Blaster: charge, recharge and fire timing, plus its first-person model and beam.
import { box, cylinder, sphere } from '67js';
import { add, scale, cross, normalize, sub, length, writeBasis, hide, cameraBasis } from './math.js';
import { sound } from './audio.js';

const FIRE_INTERVAL = 0.11;
const BEAM_TIME = 0.06;
const BEAM_COLOR = [0.85, 1, 0.45];

export function createBlaster(state) {
  const body = { name: 'Blaster body', geometry: box(0.25, 3), matrix: new Float32Array(16), material: { color: [0.08, 0.16, 0.12], metallic: 0.3, roughness: 0.35 } };
  const shroud = { name: 'Blaster shroud', geometry: box(0.35, 3), matrix: new Float32Array(16), material: { color: [0.22, 0.36, 0.3], metallic: 0.1, roughness: 0.3 } };
  const tube = { name: 'Blaster tube', geometry: cylinder(24, 0.1, 2), matrix: new Float32Array(16), material: { color: [0.8, 1, 0.8], metallic: 0, roughness: 0.2, emission: 2.5, emissiveColor: [0.6, 1, 0.55] } };
  const barrel = { name: 'Blaster barrel', geometry: cylinder(24, 0.05, 2), matrix: new Float32Array(16), material: { color: [0.05, 0.06, 0.06], metallic: 0.8, roughness: 0.3 } };
  const flash = { name: 'Muzzle flash', geometry: sphere(16, 10), matrix: new Float32Array(16), material: { color: BEAM_COLOR, metallic: 0, roughness: 1, emission: 12, emissiveColor: BEAM_COLOR } };
  const beam = { name: 'Arc beam', geometry: box(0, 1), matrix: new Float32Array(16), material: { color: BEAM_COLOR, metallic: 0, roughness: 1, emission: 14, emissiveColor: BEAM_COLOR } };
  const parts = [body, shroud, tube, barrel, flash, beam];
  for (const p of parts) hide(p);

  let cooldown = 0;
  let rechargeTimer = 0;
  let beamTimer = 0;
  let kick = 0;
  let beamFrom = [0, 0, 0];
  let beamTo = [0, 0, 0];

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
     * Advance timers and decide whether a shot leaves the gun this frame.
     * Returns true when a shot fires; the caller resolves what it hits and calls showBeam.
     */
    trigger(dt, wantsFire) {
      cooldown -= dt;
      beamTimer -= dt;
      kick = Math.max(0, kick - dt * 8);
      if (state.recharging) {
        rechargeTimer -= dt;
        if (rechargeTimer <= 0) {
          state.recharging = false;
          state.charge = state.maxCharge;
        }
        return false;
      }
      if (!wantsFire || cooldown > 0) return false;
      if (state.charge <= 0) {
        cooldown = 0.3;
        sound.empty();
        return false;
      }
      state.charge -= 1;
      cooldown = FIRE_INTERVAL;
      kick = 1;
      sound.fire();
      // Noise and light pull you back: every shot lowers Drift a little.
      state.drift = Math.max(0, state.drift - 0.6);
      if (state.charge === 0) recharge();
      return true;
    },
    showBeam(from, to) {
      beamFrom = from;
      beamTo = to;
      beamTimer = BEAM_TIME;
    },
    /** Muzzle position for the current camera, used as the start of the beam. */
    muzzle(eye, target, aim) {
      const { right, up } = cameraBasis(eye, target);
      return add(add(add(eye, scale(right, 0.24)), scale(up, -0.2)), scale(aim, 0.75));
    },
    /** Place the gun in front of the camera, pointing along aim. */
    place(eye, target, aim, bob = 0) {
      const cam = cameraBasis(eye, target);
      const z = normalize(aim);
      const x = normalize(cross([0, 1, 0], z));
      const y = cross(z, x);
      const G = 0.6; // overall model scale
      const base = add(add(add(eye, scale(cam.right, 0.24)), scale(cam.up, -0.2 + bob)), scale(cam.forward, 0.5 - kick * 0.04));
      const at = (o) => add(add(add(base, scale(x, o[0] * G)), scale(y, o[1] * G)), scale(z, o[2] * G));
      writeBasis(body.matrix, at([0, 0, 0]), x, y, z, 0.13 * G, 0.12 * G, 0.46 * G);
      writeBasis(shroud.matrix, at([0, 0.085, -0.02]), x, y, z, 0.1 * G, 0.06 * G, 0.34 * G);
      // Cylinders run along their local Y, so map Y to the aim direction.
      writeBasis(tube.matrix, at([-0.072, 0.02, 0.02]), y, z, x, 0.022 * G, 0.36 * G, 0.022 * G);
      writeBasis(barrel.matrix, at([0, 0, 0.29]), x, z, y, 0.035 * G, 0.14 * G, 0.035 * G);
      const charge = state.charge / state.maxCharge;
      tube.material.emission = state.recharging ? 0.6 + Math.random() * 0.8 : 0.4 + charge * 2.6;
      if (beamTimer > 0) {
        writeBasis(flash.matrix, at([0, 0, 0.38]), x, y, z, 0.045, 0.045, 0.045);
        const d = sub(beamTo, beamFrom);
        const len = length(d);
        const bz = normalize(d);
        const bx = normalize(cross(Math.abs(bz[1]) > 0.95 ? [1, 0, 0] : [0, 1, 0], bz));
        const by = cross(bz, bx);
        writeBasis(beam.matrix, add(beamFrom, scale(d, 0.5)), bx, by, bz, 0.018, 0.018, len);
      } else {
        hide(flash);
        hide(beam);
      }
    },
  };
}
