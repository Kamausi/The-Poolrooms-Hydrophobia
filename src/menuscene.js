// The main menu, rendered behind the title: a low tiled corridor, shallow black-green water, one fluorescent
// fitting lighting only part of the floor, an empty raft just past the light. Far down the corridor a small
// green exit sign is reflected in the water. There is no sign above it.
import { installUserPasses } from '67js/addons/user-pass';
import { calmChain } from './postchain.js';
import { Renderer67 } from '67js';
import { box, torus, cylinder } from './shapes.js';
import { writeYaw, writeBasis, writeSegment, linear, display } from './math.js';
import { tileTexture, tileNormal } from './textures.js';
import { signMaterial, quad } from './labels.js';
import { quality } from './quality.js';
import { settings } from './settings.js';
import { sound } from './audio.js';

export function createMenuScene(canvas) {
  const parts = [];
  const P = (name, geometry, material) => {
    const p = { name, geometry, matrix: new Float32Array(16), material };
    parts.push(p);
    return p;
  };
  const slab = box(0, 1);
  const tile = { color: [0.85, 0.84, 0.78], metallic: 0, roughness: 0.3, map: tileTexture({ id: 'menu', tile: '#d6d2b6', grout: '#7c7a5c', stain: '#5e5a36', depth: 3 }), normalMap: tileNormal(), normalScale: [1, 1], boxMapScale: 0.5 };
  const put = (name, mat, pos, size) => writeYaw(P(name, slab, mat).matrix, pos, 0, size[0], size[1], size[2]);
  const W = 3.4, H = 2.5, LEN = 70;
  put('Floor', tile, [0, -0.45, -LEN / 2], [W, 0.2, LEN]);
  put('Ceiling', tile, [0, H + 0.1, -LEN / 2], [W, 0.2, LEN]);
  put('Wall L', tile, [-W / 2 - 0.1, H / 2, -LEN / 2], [0.2, H + 1, LEN]);
  put('Wall R', tile, [W / 2 + 0.1, H / 2, -LEN / 2], [0.2, H + 1, LEN]);
  put('End wall', tile, [0, H / 2, -LEN], [W, H + 1, 0.2]);
  const band = { color: linear('#557a86'), metallic: 0, roughness: 0.4 };
  put('Band L', band, [-W / 2 + 0.005, 0.7, -LEN / 2], [0.02, 0.14, LEN]);
  put('Band R', band, [W / 2 - 0.005, 0.7, -LEN / 2], [0.02, 0.14, LEN]);
  put('Water', { tag: 'water', color: linear('#14281f'), metallic: 0.6, roughness: 0.04 }, [0, 0, -LEN / 2], [W, 0.02, LEN]);
  // One fitting, lit; the rest of the fittings dead.
  const lamp = P('Fluorescent', slab, { color: [1, 1, 1], metallic: 0, roughness: 1, emission: 10, emissiveColor: linear('#d8d6a6') });
  writeYaw(lamp.matrix, [0, H - 0.02, -5], 0, 1.4, 0.05, 0.3);
  for (let i = 1; i < 6; i++) put(`Dead fitting ${i}`, { color: [0.3, 0.3, 0.28], metallic: 0, roughness: 0.8 }, [0, H - 0.02, -5 - i * 9], [1.4, 0.05, 0.3]);
  // A maintenance dock along the right wall, and the empty raft tied to it just past the light.
  const concrete = { color: [0.42, 0.42, 0.38], metallic: 0, roughness: 0.9 };
  put('Dock', concrete, [1.25, 0.05, -20], [0.9, 0.2, 34]);
  put('Dock edge', { color: linear('#b19a50'), metallic: 0, roughness: 0.8 }, [0.81, 0.16, -20], [0.04, 0.02, 34]);
  writeBasis(P('Empty raft', torus(0.26, 48, 16), { color: linear('#b19a50'), metallic: 0, roughness: 0.6 }).matrix, [-0.35, 0.08, -12.5], [1, 0, 0], [0, 0, -1], [0, 1, 0], 1.05, 1.05, 1);
  // Four life vests, folded, on the seat.
  [0, 1, 2, 3].forEach((i) => put(`Folded vest ${i}`, { color: linear(i % 2 ? '#a85e36' : '#b46a3c'), metallic: 0, roughness: 0.75 }, [-0.35 + (i - 1.5) * 0.03, 0.17 + i * 0.07, -12.5 + (i % 2) * 0.04], [0.48, 0.065, 0.38]));
  const post = P('Tether post', cylinder(12, 0.2, 2), { color: [0.18, 0.2, 0.2], metallic: 0.5, roughness: 0.6 });
  writeYaw(post.matrix, [1.2, 0.45, -12.2], 0, 0.07, 0.6, 0.07);
  const ropeA = P('Tether A', cylinder(6, 0, 1), { color: [0.42, 0.33, 0.2], metallic: 0, roughness: 0.9 });
  const ropeB = P('Tether B', cylinder(6, 0, 1), { color: [0.42, 0.33, 0.2], metallic: 0, roughness: 0.9 });
  // Wired glass in the left wall: something sometimes passes behind it.
  const glass = { color: [0.2, 0.26, 0.24], metallic: 0.2, roughness: 0.15, emission: 0.06, emissiveColor: [0.4, 0.5, 0.42] };
  put('Wired glass', glass, [-1.69, 1.35, -18], [0.04, 0.9, 1.3]);
  for (let i = 0; i < 4; i++) put(`Glass wire ${i}`, { color: [0.1, 0.1, 0.1], metallic: 0.5, roughness: 0.5 }, [-1.665, 1.35, -18.45 + i * 0.3], [0.01, 0.9, 0.012]);
  const passer = P('Behind the glass', box(0.3, 2), { color: [0.02, 0.025, 0.025], metallic: 0, roughness: 1 });
  // A service door far down on the right; its light comes on with nobody near it.
  put('Service door', { color: linear('#4d7472'), metallic: 0.3, roughness: 0.7 }, [1.68, 1.05, -38], [0.06, 1.9, 0.9]);
  const doorLamp = P('Service door lamp', slab, { color: [0.3, 0.32, 0.2], metallic: 0, roughness: 1, emission: 0.02, emissiveColor: linear('#d8d6a6') });
  writeYaw(doorLamp.matrix, [1.62, 2.12, -38], 0, 0.06, 0.08, 0.3);
  // The lifeguard chair at the far end: empty, until a later visit.
  const white = { color: [0.86, 0.86, 0.82], metallic: 0, roughness: 0.5 };
  put('Chair leg L', white, [-1.05, 0.7, -50], [0.06, 1.8, 0.06]);
  put('Chair leg R', white, [-0.45, 0.7, -50], [0.06, 1.8, 0.06]);
  put('Chair seat', white, [-0.75, 1.6, -50], [0.7, 0.06, 0.5]);
  put('Chair back', white, [-0.75, 2.0, -50.25], [0.7, 0.8, 0.05]);
  let visits = 0;
  try { visits = Number(localStorage.getItem('underflow-menu-visits') || 0) + 1; localStorage.setItem('underflow-menu-visits', String(visits)); } catch {}
  const occupied = visits >= 3 && visits % 3 === 0;
  const sitter = P('Someone in the chair', box(0.3, 2), { color: linear('#9a5a50'), metallic: 0, roughness: 0.85 });
  const sitterHead = P('Someone in the chair, head', slab, { color: [0.78, 0.76, 0.7], metallic: 0, roughness: 0.6 });
  if (occupied) { writeYaw(sitter.matrix, [-0.75, 2.05, -50], 0, 0.36, 0.8, 0.24); writeYaw(sitterHead.matrix, [-0.75, 2.6, -50], 0, 0.2, 0.26, 0.2); }
  // The reflection: lying on the water, upside down, rippling. Nothing above it.
  const reflection = P('Exit reflection', quad(), { ...signMaterial('EXIT', 'safe', 0.9, 256, 96), doubleSided: true });
  let time = 0;

  for (const p of parts) if (p.matrix[15] === 0) writeYaw(p.matrix, [0, -500, 0], 0, 1e-4, 1e-4, 1e-4);
  const renderer = new Renderer67(canvas, parts, {
    ground: false, world: true, hdr: true, ...quality.renderer,
    environment: { keyIntensity: 0.02, fillIntensity: 0.05, ambientIntensity: 0.08, fogColor: linear('#080d10'), fogDensity: 0.06, skyTop: display('#080d10'), skyBottom: display('#080d10') },
  });
  renderer.resize();
  // The same grade as the game on tiers with depth, so moving between scenes does not change the picture's look.
  if (quality.renderer.depth) installUserPasses(renderer);
  sound.setSpace('tile');

  return {
    update(dt) {
      time += dt;
      const wob = 1 + Math.sin(time * 1.7) * 0.04;
      writeBasis(reflection.matrix, [0.6, 0.012, -26], [1, 0, 0], [0, 0, 1], [0, 1, 0], 0.7 * wob, 0.26, 1);
      reflection.material.emission = 0.5 + Math.sin(time * 0.9) * 0.08;
      // The tether tightens now and then, though the raft never moves.
      const pull = Math.max(0, Math.sin(time * 0.21) - 0.92) * 12;
      const a = [0.68, 0.16, -12.45], b = [1.2, 0.7, -12.2];
      const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 0.18 * (1 - Math.min(1, pull)), (a[2] + b[2]) / 2];
      writeSegment(ropeA.matrix, a, mid, 0.012);
      writeSegment(ropeB.matrix, mid, b, 0.012);
      // Something passes behind the wired glass, slowly, every so often.
      const pass = (time % 37) / 6;
      if (pass < 1) writeYaw(passer.matrix, [-1.9, 1.15, -18.9 + pass * 1.8], 0, 0.1, 1.5, 0.45);
      else writeYaw(passer.matrix, [0, -500, 0], 0, 1e-4, 1e-4, 1e-4);
      // The service door light, on for a few seconds at a time.
      doorLamp.material.emission = (time % 23) > 17 ? 6 : 0.02;
      // The fitting buzzes and, now and then, dips.
      lamp.material.emission = Math.sin(time * 0.37) > 0.97 ? 3 : 10;
      if (quality.skipRender) return;
      renderer.updateParts(parts);
      if (quality.renderer.depth) renderer.userPasses.set(settings.postChain === false ? [] : calmChain(quality.tier));
      renderer.render({
        eye: [-0.35, 1.15, 3.5], target: [0.4, 0.45, -24], fov: 58, time,
        waterRipple: [-0.35, 0, -12.5], rippleTime: time % 6,
        environment: { pointLights: [{ position: [0, H - 0.3, -5], color: linear('#d8d6a6'), intensity: 9, radius: 0.4, range: 7 }, { position: [0.6, 0.3, -26], color: [0.45, 0.7, 0.5], intensity: 0.6, radius: 0.2, range: 3 }] },
        exposure: 1,
        effects: { bloom: { strength: quality.bloom * 0.8, threshold: 1, radius: 1.2 }, vignette: 0.45, grain: settings.grain ? 0.04 : 0, contrast: 1.06, saturation: 0.75 },
      });
    },
    resize: () => renderer.resize(),
    dispose: () => renderer.dispose(),
  };
}
