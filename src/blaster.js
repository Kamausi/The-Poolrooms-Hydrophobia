// The Arc Blaster: a park maintenance instrument repurposed as a ride blaster.
// Three functions:
//   signal pulse     (hold click)  operates targets, switches and mechanisms; recharges; builds heat and noise
//   inspection beam  (hold right click or Q)  reveals hidden markings and reads targets; makes you visible
//   disruption burst (F)  interrupts entities or forces an emergency mechanism; costs a charge cell; very loud
import { rumble, PATTERNS } from './haptics.js';
import { createRig } from './spring.js';
import { box, cylinder, sphere } from './shapes.js';
import { add, scale, cross, normalize, sub, length, writeBasis, hide, cameraBasis } from './math.js';
import { sound } from './audio.js';
import { settings } from './settings.js';
import { modelPart, placeModelBasis } from './props.js';

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
// How each profile feels in the hand. The tool moves; the reticle does not, so aim stays dependable.
// kick: how far it comes back · rec: how fast it settles · rise: how much the muzzle lifts · walk: sideways
// wander while firing (the Repeater rattles in the grip as it heats).
export const FEEL = {
  pulse: { kick: 0.8, rec: 13, rise: 0.25, walk: 0 }, // tap, tap: sharp and clean
  repeater: { kick: 0.45, rec: 18, rise: 0.08, walk: 0.012 }, // a rattle that grows with heat
  scatter: { kick: 3.2, rec: 4.5, rise: 1.4, walk: 0 }, // a shove, then a long recovery
  disruptor: { kick: 2.4, rec: 3.6, rise: 0.7, walk: 0 }, // tension, release, a slow settle
  hook: { kick: 1.3, rec: 6, rise: 0.3, walk: 0 }, // the spool pulls the hand after the throw
};
const BEAM_COLOR = [0.85, 1, 0.45];
const profileOf = (state) => PROFILES[state.profile] || PROFILES.pulse;
const SCAN_COLOR = [0.45, 0.85, 1];

export function createBlaster(state) {
  // The tool itself is a generated model (props.js) where it has loaded; the primitive receiver, shroud, handle,
  // grip and barrel stand in otherwise. The charge window, lens, flash, beams and the gloved hand stay as they are.
  const tool = modelPart('blaster', 'Blaster');
  const mat = (color, emission = 0, emissiveColor = color) => ({ color, metallic: 0, roughness: 1, emission, emissiveColor });
  // A maintenance instrument, not a toy: matte painted steel, a vented heat shroud, a worn safety-yellow carry
  // handle, a charge window set into the side, an inspection lens in its own housing. Small bevels so edges read.
  const paint = { color: [0.1, 0.135, 0.135], metallic: 0.25, roughness: 0.68 };
  const part = (name, geometry, material) => ({ name, geometry, matrix: new Float32Array(16), material });
  const body = part('Blaster receiver', box(0.06, 2), paint);
  const shroud = part('Heat shroud', box(0.04, 2), { color: [0.16, 0.21, 0.2], metallic: 0.3, roughness: 0.6 });
  const vents = [0, 1, 2, 3].map((i) => part(`Shroud vent ${i}`, box(0, 1), { color: [0.02, 0.03, 0.035], metallic: 0, roughness: 1 }));
  const handle = part('Carry handle', box(0.2, 3), { color: [0.3, 0.26, 0.14], metallic: 0.1, roughness: 0.85 });
  const grip = part('Grip', box(0.18, 3), { color: [0.06, 0.07, 0.07], metallic: 0, roughness: 0.9 });
  const tube = part('Charge window', cylinder(16, 0.2, 2), { color: [0.5, 0.7, 0.5], metallic: 0, roughness: 0.4, emission: 1.2, emissiveColor: [0.6, 1, 0.55] });
  const barrel = part('Blaster barrel', cylinder(20, 0.1, 2), { color: [0.05, 0.06, 0.06], metallic: 0.7, roughness: 0.45 });
  const collar = part('Muzzle collar', cylinder(20, 0.15, 2), { color: [0.09, 0.1, 0.1], metallic: 0.6, roughness: 0.5 });
  const housing = part('Lens housing', cylinder(16, 0.15, 2), { color: [0.07, 0.08, 0.08], metallic: 0.4, roughness: 0.6 });
  const lens = part('Inspection lens', sphere(12, 8), mat([0.08, 0.14, 0.17], 0.05, SCAN_COLOR));
  const flash = part('Muzzle flash', sphere(16, 10), mat(BEAM_COLOR, 4.5)); // restrained: bloom makes it big
  const beam = part('Arc beam', box(0, 1), mat(BEAM_COLOR, 8));
  const scanBeam = part('Inspection beam', box(0, 1), mat(SCAN_COLOR, 3));
  const burstShell = part('Disruption burst', sphere(24, 16), { ...mat([0.7, 0.9, 1], 6, [0.7, 0.9, 1]), alphaMode: 'blend', opacity: 0.35, doubleSided: true });
  // The hand you see all game: a worn work glove closed on the grip, a navy waterproof sleeve with a reflective
  // band. Drift shows here first: the glove swells and pales toward skin, the sleeve rides up. Aim is never affected.
  const gloveMat = { color: [0.13, 0.13, 0.11], metallic: 0, roughness: 0.95 };
  const palm = part('Glove palm', box(0.32, 3), gloveMat);
  const fingers = part('Glove fingers', box(0.42, 3), gloveMat);
  const thumb = part('Glove thumb', box(0.45, 3), gloveMat);
  const cuff = part('Sleeve', cylinder(16, 0.25, 2), { color: [0.07, 0.09, 0.13], metallic: 0, roughness: 0.85 });
  const band = part('Sleeve reflective band', cylinder(16, 0.2, 2), { color: [0.62, 0.6, 0.48], metallic: 0, roughness: 0.45 });
  const chassis = tool ? tool.group : [body, shroud, ...vents, handle, grip, barrel, collar, housing];
  const parts = [...chassis, tube, lens, flash, beam, scanBeam, burstShell, palm, fingers, thumb, cuff, band];
  for (const p of parts) hide(p);

  let cooldown = 0;
  let rechargeTimer = 0;
  let overheat = 0;
  let beamTimer = 0;
  let burstTimer = 0;
  let burstAt = [0, 0, 0];
  let kick = 0, kickRise = 0, walk = 0, walkT = 0;
  // The viewmodel's response is springs: a shot kicks them and they settle with the profile's own character.
  // push: back toward you · lift: the muzzle rising · roll: the wrist turning. Recoil of the aim is separate (none
  // for now: the shot goes where the reticle is), and the camera has its own shake.
  const rig = createRig({ push: { stiffness: 170, damping: 0.62 }, lift: { stiffness: 120, damping: 0.55 }, roll: { stiffness: 90, damping: 0.45 } });
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
    /** The viewmodel springs (tests, tuning). */
    get springs() { return { push: rig.get('push'), lift: rig.get('lift'), roll: rig.get('roll') }; },
    /**
     * Advance timers and decide whether a pulse leaves the gun this frame.
     * mounted: seated on the raft, where the mount trickles charge back in.
     */
    trigger(dt, wantsFire, mounted = false) {
      cooldown -= dt;
      beamTimer -= dt;
      burstTimer -= dt;
      rig.step(dt);
      kick = Math.max(0, rig.get('push'));
      walkT += dt;
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
      {
        const F = FEEL[state.profile] || FEEL.pulse;
        // rec is how fast it settles: a high rec is a stiff, quick spring; a low one a long recovery.
        rig.tune('push', { stiffness: F.rec * F.rec * 1.1, damping: 0.6 + Math.min(0.3, F.rec / 60) });
        rig.tune('lift', { stiffness: F.rec * F.rec * 0.8 });
        if (rig.get('push') < F.kick * 1.6) rig.kick('push', F.kick * F.rec * 0.9);
        rig.kick('lift', F.rise * F.rec * 0.9);
        rig.kick('roll', (Math.random() - 0.5) * F.kick * 1.2);
        kickRise = 1; walk = F.walk * (1 + state.heat / 60);
        if (state.tally) state.tally.shots += 1;
        rumble(PATTERNS[state.profile] ? state.profile : 'pulse');
      }
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
      const rollK = rig.get('roll') * 0.04;
      const z = normalize(aim);
      const x = normalize(cross(normalize([Math.sin(rollK), 1, 0]), z));
      const y = cross(z, x);
      const G = 0.6;
      // As Drift rises your grip relaxes and the blaster sags out of view.
      const sag = Math.max(0, state.drift - 40) * 0.0025;
      const base = add(add(add(add(eye, scale(cam.right, 0.24 + sag * 0.3)), scale(cam.up, -0.2 + bob - sag + rig.get('lift') * kickRise * 0.012)), scale(cam.forward, 0.5 - kick * 0.04)), scale(cam.right, kick > 0.05 ? Math.sin(walkT * 61) * walk : 0));
      const at = (o) => add(add(add(base, scale(x, o[0] * G)), scale(y, o[1] * G)), scale(z, o[2] * G));
      writeBasis(body.matrix, at([0, 0, 0]), x, y, z, 0.12 * G, 0.11 * G, 0.42 * G);
      writeBasis(shroud.matrix, at([0, 0.035, 0.2]), x, y, z, 0.15 * G, 0.075 * G, 0.26 * G);
      vents.forEach((v, i) => writeBasis(v.matrix, at([0, 0.074, 0.11 + i * 0.055]), x, y, z, 0.152 * G, 0.012 * G, 0.022 * G));
      writeBasis(handle.matrix, at([0, 0.083, -0.05]), x, y, z, 0.026 * G, 0.022 * G, 0.2 * G);
      // The grip rakes back like a tool handle.
      const gy = normalize(sub(y, scale(z, 0.38)));
      const gz = cross(x, gy);
      writeBasis(grip.matrix, at([0, -0.115, -0.1]), x, gy, gz, 0.06 * G, 0.17 * G, 0.075 * G);
      writeBasis(tube.matrix, at([-0.061, 0.005, 0.02]), y, z, x, 0.02 * G, 0.26 * G, 0.02 * G);
      writeBasis(barrel.matrix, at([0, -0.005, 0.29]), x, z, y, 0.05 * G, 0.17 * G, 0.05 * G);
      writeBasis(collar.matrix, at([0, -0.005, 0.37]), x, z, y, 0.07 * G, 0.045 * G, 0.07 * G);
      writeBasis(housing.matrix, at([0.078, 0.035, 0.17]), x, z, y, 0.05 * G, 0.06 * G, 0.05 * G);
      writeBasis(lens.matrix, at([0.078, 0.035, 0.2]), x, y, z, 0.034 * G, 0.034 * G, 0.012 * G);
      if (tool) {
        // The model: muzzle where the primitive barrel ended, grip under the hand; the charge window and the
        // inspection lens sit on its flanks so heat, charge and scanning still read.
        placeModelBasis(tool, at([0, -0.13, 0.057]), x, y, z, 0.66 * G);
        writeBasis(tube.matrix, at([-0.092, 0.03, 0.05]), y, z, x, 0.016 * G, 0.16 * G, 0.016 * G);
        writeBasis(lens.matrix, at([0.092, 0.03, 0.12]), x, y, z, 0.03 * G, 0.03 * G, 0.012 * G);
      }
      lens.material.emission = scanning ? 6 : 0.05;
      // Drift in stages: the strap bites into a glove that is filling (30+), the knuckles round off (50+),
      // and past 55 the hand breathes on its own: slow, even, content, not in time with you.
      const swell = Math.max(0, state.drift - 30) * 0.007;
      const breathe = state.drift > 55 ? 1 + Math.sin(performance.now() / 1000 * 0.75) * Math.min(0.035, (state.drift - 55) * 0.0012) : 1;
      const sw = (k) => (1 + swell * k) * breathe;
      writeBasis(palm.matrix, at([0.012, -0.1, -0.13]), x, gy, gz, 0.085 * G * sw(1), 0.1 * G * sw(0.6), 0.1 * G * sw(0.8));
      writeBasis(fingers.matrix, at([0.004, -0.118, -0.055]), x, gy, gz, 0.088 * G * sw(1), 0.125 * G * sw(0.5), 0.048 * G * sw(1.2));
      writeBasis(thumb.matrix, at([-0.05, -0.045, -0.07]), x, y, z, 0.03 * G * sw(1), 0.03 * G * sw(1), 0.085 * G * sw(0.6));
      const pale = Math.min(1, swell * 1.6);
      const gc = [0.13 + pale * 0.45, 0.13 + pale * 0.42, 0.11 + pale * 0.38]; // the glove pales and softens toward skin
      palm.material.color = gc; fingers.material.color = gc; thumb.material.color = gc;
      writeBasis(cuff.matrix, at([0.02, -0.15, -0.27 + swell * 0.05]), x, gz, gy, 0.12 * G * sw(0.4), 0.2 * G, 0.12 * G * sw(0.4));
      writeBasis(band.matrix, at([0.02, -0.142, -0.2 + swell * 0.05]), x, gz, gy, 0.126 * G * (1 + swell * 0.15), 0.028 * G, 0.126 * G * (1 + swell * 0.15)); // the strap doesn't give: an indentation
      const charge = state.charge / state.maxCharge;
      const hot = state.heat / 100;
      tube.material.emissiveColor = [0.6 + hot * 0.4, 1 - hot * 0.7, 0.55 - hot * 0.45];
      tube.material.emission = overheat > 0 ? 0.3 + Math.random() : state.recharging ? 0.4 + Math.random() * 0.6 : 0.25 + charge * 1.3;
      if (beamTimer > 0) {
        flash.material.emission = settings.flashReduce ? 1.8 : 4.5;
        beam.material.emission = settings.flashReduce ? 3.5 : 8;
        writeBasis(flash.matrix, at([0, 0, 0.38]), x, y, z, 0.03, 0.03, 0.03);
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
