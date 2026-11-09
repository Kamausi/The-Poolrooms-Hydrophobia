// The Safe Room, rendered behind its overlay: a loud pump room with dry, matte surfaces, neutral-warm task
// light, checkpoint-green strips and signs that people actually live here. Through reinforced glass, an
// enormous empty pool hall in deep water and stale light. Finite, dry, occupied, understandable — and the
// window is still wrong.
import { Renderer67, box, cylinder, sphere } from '67js';
import { writeYaw, writeBasis, linear, display } from './math.js';
import { createCrewFigure, poseStanding, poseSeated } from './crewfigure.js';
import { tileTexture, tileNormal, plateNormal } from './textures.js';
import { signMaterial, quad } from './labels.js';
import { quality } from './quality.js';
import { settings } from './settings.js';
import { sound } from './audio.js';

export function createSafeRoom(canvas, sector, opts = {}) {
  const parts = [];
  const P = (name, geometry, material, m) => {
    const p = { name, geometry, matrix: m || new Float32Array(16), material };
    parts.push(p);
    return p;
  };
  const slab = box(0, 1);
  // Dry and matte: higher roughness than anything out on the water.
  const white = { color: [0.86, 0.85, 0.8], metallic: 0, roughness: 0.75, map: tileTexture({ ...sector, id: 'safe-room', tile: '#d8d8ca', grout: '#8a8a7c', stain: '#6e6e62', depth: 99 }), normalMap: tileNormal(), normalScale: [0.8, 0.8], boxMapScale: 0.5 };
  const plate = plateNormal();
  const metal = { color: [0.16, 0.18, 0.18], metallic: 0.5, roughness: 0.7 }; // dark matte machinery
  const grating = plate ? { ...metal, normalMap: plate, normalScale: [1, 1], boxMapScale: 0.8 } : metal; // diamond plate underfoot
  const green = { color: [0.36, 0.5, 0.38], metallic: 0, roughness: 0.6, emission: 0.6, emissiveColor: [0.52, 0.67, 0.54] };
  const put = (name, mat, pos, size, yaw = 0) => {
    const p = P(name, slab, mat);
    writeYaw(p.matrix, pos, yaw, size[0], size[1], size[2]);
    return p;
  };
  // The pump room: 10 x 4 x 8, door behind the camera, window in front.
  put('Floor grating', grating, [0, -0.1, 0], [10, 0.2, 8]);
  put('Ceiling', white, [0, 4.1, 0], [10, 0.2, 8]);
  put('Wall L', white, [-5.1, 2, 0], [0.2, 4, 8]);
  put('Wall R', white, [5.1, 2, 0], [0.2, 4, 8]);
  put('Wall back', white, [0, 2, 4.1], [10, 4, 0.2]);
  // Front wall with a reinforced window: four pieces around an opening, plus bars.
  put('Front low', white, [0, 0.6, -4.1], [10, 1.2, 0.2]);
  put('Front high', white, [0, 3.6, -4.1], [10, 1, 0.2]);
  put('Front left', white, [-3.8, 2, -4.1], [2.6, 4, 0.2]);
  put('Front right', white, [3.8, 2, -4.1], [2.6, 4, 0.2]);
  for (let i = -2; i <= 2; i++) put(`Window bar ${i}`, metal, [i * 1.0, 2.15, -4.05], [0.06, 1.9, 0.08]);
  put('Window frame', metal, [0, 3.1, -4.05], [5.2, 0.1, 0.12]);
  // Pumps: big, loud, vibrating.
  const pumps = [-3.2, 3.2].map((x, i) => {
    const p = P(`Pump ${i}`, cylinder(32, 0.05, 2), { color: [0.13, 0.16, 0.16], metallic: 0.45, roughness: 0.7 });
    return { p, x };
  });
  // A pipe run along the ceiling: a cylinder laid on its side (local Y mapped to world X).
  P('Pipe run', cylinder(16, 0, 1), metal, writeBasis(new Float32Array(16), [0, 3.4, 2], [0, -1, 0], [1, 0, 0], [0, 0, 1], 0.15, 9.5, 0.15));
  put('Workbench', { color: [0.5, 0.38, 0.25], metallic: 0, roughness: 0.7 }, [-3.5, 0.9, 3], [2.4, 0.12, 1]);
  put('Terminal', { color: [0.05, 0.1, 0.06], metallic: 0, roughness: 0.4, emission: 1.6, emissiveColor: [0.4, 1, 0.5] }, [3.6, 1.6, 3.95], [1.2, 0.8, 0.06]);
  put('Bench', { color: [0.35, 0.37, 0.36], metallic: 0.5, roughness: 0.5 }, [0, 0.45, 3.2], [3, 0.1, 0.6]);
  put('Socks', { color: [0.9, 0.9, 0.88], metallic: 0, roughness: 0.9 }, [0.6, 0.53, 3.2], [0.35, 0.06, 0.2]);
  const lamps = [-3, 0, 3].map((x, i) => put(`Lamp ${i}`, { color: [1, 1, 1], metallic: 0, roughness: 1, emission: 12, emissiveColor: [1, 0.93, 0.82] }, [x, 3.98, 0], [1.8, 0.05, 0.5]));
  // Checkpoint-green identification strips at hand height, and the sign over the bulkhead.
  for (const [n, pos, size] of [['L', [-4.98, 1.1, 0], [0.04, 0.12, 8]], ['R', [4.98, 1.1, 0], [0.04, 0.12, 8]], ['Back', [0, 1.1, 3.98], [10, 0.12, 0.04]]]) put(`Green strip ${n}`, green, pos, size);
  const sign = P('Safe Room sign', quad(), { ...signMaterial('SAFE ROOM ▼', 'safe', 1.2, 512, 128), doubleSided: true });
  writeBasis(sign.matrix, [0, 3.5, -3.97], [1, 0, 0], [0, 1, 0], [0, 0, 1], 2.4, 0.6, 1);
  // Habitation: mugs on the bench, a radio, towels, a camp cot, a kettle on a pump housing.
  put('Shelf', metal, [-4.35, 1.0, -3.2], [1.3, 0.06, 0.45]);
  [0, 1, 2, 3].forEach((i) => put(`Mug ${i}`, { color: [[0.7, 0.62, 0.36], [0.62, 0.32, 0.26], [0.85, 0.84, 0.78], [0.3, 0.42, 0.5]][i], metallic: 0, roughness: 0.5 }, [-4.8 + i * 0.28, 1.1, -3.2], [0.12, 0.14, 0.12]));
  put('Radio', { color: [0.12, 0.12, 0.11], metallic: 0.3, roughness: 0.6, emission: 0.5, emissiveColor: [0.5, 0.7, 0.5] }, [-3.85, 1.15, -3.2], [0.4, 0.24, 0.18]);
  put('Towels', { color: [0.82, 0.8, 0.72], metallic: 0, roughness: 0.95 }, [0.6, 0.55, 3.2], [0.5, 0.12, 0.35]);
  put('Cot', { color: [0.3, 0.36, 0.28], metallic: 0, roughness: 0.9 }, [4.4, 0.4, -2.8], [0.8, 0.12, 1.8]);
  put('Kettle', { color: [0.55, 0.55, 0.52], metallic: 0.7, roughness: 0.4 }, [-3.2, 2.35, -1.5], [0.25, 0.25, 0.25]);
  const beacon = P('Beacon', sphere(16, 10), { color: [0.3, 1, 0.5], metallic: 0, roughness: 1, emission: 6, emissiveColor: [0.3, 1, 0.5] }, writeYaw(new Float32Array(16), [0, 3.6, 3.9], 0, 0.2, 0.2, 0.2));
  // Beyond the glass: an enormous empty pool hall, dim, perfectly still.
  const pool = { tag: 'water', color: linear(sector.water), metallic: 0.55, roughness: 0.05 };
  put('Hall floor', white, [0, -3.2, -60], [120, 0.4, 110]);
  // Drained (the reference chapter): the water is off the tiles; the lit exit sign stands in an empty basin.
  P('Hall water', slab, pool, writeYaw(new Float32Array(16), [0, opts.drained ? -2.95 : -1.0, -60], 0, 110, 0.02, 100));
  if (opts.drained) {
    const exitSign = P('Exit in the empty basin', quad(), { ...signMaterial('EXIT', 'safe', 1.4, 256, 96), doubleSided: true });
    writeBasis(exitSign.matrix, [6, -1.6, -34], [1, 0, 0], [0, 1, 0], [0, 0, 1], 3, 1.1, 1);
  }
  put('Hall far wall', white, [0, 6, -112], [120, 18, 1]);
  put('Hall left wall', white, [-58, 6, -60], [1, 18, 110]);
  put('Hall right wall', white, [58, 6, -60], [1, 18, 110]);
  for (let i = 0; i < 6; i++) put(`Hall lamp ${i}`, { color: [1, 1, 0.95], metallic: 0, roughness: 1, emission: 12, emissiveColor: linear(sector.lamp) }, [-40 + i * 16, 14.9, -40 - (i % 2) * 30], [4, 0.1, 1]);
  for (let i = 0; i < 10; i++) put(`Hall chair ${i}`, { color: [0.93, 0.93, 0.9], metallic: 0, roughness: 0.4 }, [-30 + i * 6, -0.4, -20], [0.6, 0.6, 0.6]);

  // The people the text says are here: Tubs at the kettle, Dez at the glass looking at the pool, June on the cot.
  const SPOTS = {
    tubs: { stand: [-2.35, 0, -0.75], yaw: -2.2 },
    dez: { stand: [1.0, 0, -3.35], yaw: Math.PI },
    mars: { stand: [-0.7, 0, -3.3], yaw: Math.PI + 0.25 },
    june: { sit: [4.35, 0.47, -2.6], fwd: [-1, 0, 0] },
  };
  const crew = (opts.crew || []).filter((id) => SPOTS[id]).map((id) => ({ id, fig: createCrewFigure(P, id, ' in the Safe Room'), spot: SPOTS[id] }));
  const UPV = [0, 1, 0];
  const poseCrew = (t) => {
    crew.forEach(({ fig, spot }, i) => {
      if (spot.sit) {
        const fwd = spot.fwd, rgt = [-fwd[2], 0, fwd[0]].map((c) => -c);
        const breathe = Math.sin(t * 1.1 + i) * 0.01;
        poseSeated(fig, { p: [spot.sit[0], spot.sit[1] + breathe, spot.sit[2]], rgt, fwd, up: UPV, upL: [0.12, 1, 0], side: 1, duck: 0.05 });
      } else poseStanding(fig, { feet: spot.stand, yaw: spot.yaw + Math.sin(t * 0.4 + i * 2) * 0.05, walk: t * 0.8, pace: 0 });
    });
  };
  poseCrew(0);

  for (const p of parts) if (p.matrix[15] === 0) writeYaw(p.matrix, [0, -500, 0], 0, 1e-4, 1e-4, 1e-4);
  const renderer = new Renderer67(canvas, parts, {
    ground: false, world: true, hdr: true, ...quality.renderer,
    environment: { keyIntensity: 0.05, fillIntensity: 0.3, ambientIntensity: 0.45, fogColor: linear('#080d10'), fogDensity: 0.014, skyTop: display('#080d10'), skyBottom: display('#080d10') },
  });
  renderer.resize();
  sound.pumpRoom(true);
  sound.setSpace('dry');

  let time = 0;
  let clockFlicker = 0;
  return {
    update(dt) {
      time += dt;
      // The pumps vibrate; you feel it in the camera. It is the opposite of the warm, still water.
      const hum = settings.sway ? Math.sin(time * 61) * 0.004 : 0;
      for (const { p, x } of pumps) writeYaw(p.matrix, [x + Math.sin(time * 47 + x) * 0.006, 1.1, -1.5], 0, 0.7, 2.2, 0.7);
      clockFlicker -= dt;
      if (clockFlicker <= 0) clockFlicker = 3 + Math.random() * 5;
      lamps.forEach((l, i) => (l.material.emission = clockFlicker < 0.08 && i === 1 ? 2 : 14));
      beacon.material.emission = 5 + Math.sin(time * 3) * 2;
      poseCrew(time);
      const pan = Math.sin(time * 0.08) * 0.35;
      const eye = [1.5 + hum, 1.6 + hum, 2.6];
      const target = [Math.sin(pan) * 6 - 0.5, 1.4, -6];
      if (quality.skipRender) return;
      renderer.updateParts(parts);
      renderer.render({
        eye, target, fov: 68, time,
        environment: { pointLights: [[-3, 3.6, 0], [0, 3.6, 0], [3, 3.6, 0]].map((position) => ({ position, color: [1, 0.92, 0.8], intensity: 9, radius: 0.5, range: 12 })).concat([{ position: [0, 12, -30], color: linear(sector.lamp), intensity: 420, radius: 3, range: 140 }, { position: [-25, 12, -70], color: linear(sector.lamp), intensity: 300, radius: 3, range: 140 }]) },
        exposure: 1.1,
        effects: { bloom: { strength: quality.bloom * 0.6, threshold: 1.2, radius: 1.2 }, vignette: 0.22, grain: settings.grain ? 0.02 : 0, contrast: 1.05, saturation: 0.82, temperature: 0.04 },
      });
    },
    resize: () => renderer.resize(),
    dispose: () => {
      sound.pumpRoom(false);
      renderer.dispose();
    },
  };
}
