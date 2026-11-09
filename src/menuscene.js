// The main menu, rendered behind the title: a low tiled corridor, shallow black-green water, one fluorescent
// fitting lighting only part of the floor, an empty raft just past the light. Far down the corridor a small
// green exit sign is reflected in the water. There is no sign above it.
import { Renderer67, box, torus } from '67js';
import { writeYaw, writeBasis, linear, display } from './math.js';
import { tileTexture } from './textures.js';
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
  const tile = { color: [0.85, 0.84, 0.78], metallic: 0, roughness: 0.3, map: tileTexture({ id: 'menu', tile: '#d6d2b6', grout: '#7c7a5c', stain: '#5e5a36', depth: 3 }), boxMapScale: 0.5 };
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
  // The empty raft, just past the light.
  writeBasis(P('Empty raft', torus(0.26, 48, 16), { color: linear('#b19a50'), metallic: 0, roughness: 0.6 }).matrix, [0.2, 0.08, -12.5], [1, 0, 0], [0, 0, -1], [0, 1, 0], 1.05, 1.05, 1);
  put('Folded vests', { color: linear('#b46a3c'), metallic: 0, roughness: 0.7 }, [0.2, 0.22, -12.5], [0.5, 0.14, 0.4]);
  // The reflection: lying on the water, upside down, rippling. Nothing above it.
  const reflection = P('Exit reflection', quad(), { ...signMaterial('EXIT', 'safe', 0.9, 256, 96), doubleSided: true });
  let time = 0;

  for (const p of parts) if (p.matrix[15] === 0) writeYaw(p.matrix, [0, -500, 0], 0, 1e-4, 1e-4, 1e-4);
  const renderer = new Renderer67(canvas, parts, {
    ground: false, world: true, hdr: true, ...quality.renderer,
    environment: { keyIntensity: 0.02, fillIntensity: 0.05, ambientIntensity: 0.08, fogColor: linear('#080d10'), fogDensity: 0.06, skyTop: display('#080d10'), skyBottom: display('#080d10') },
  });
  renderer.resize();
  sound.setSpace('tile');

  return {
    update(dt) {
      time += dt;
      const wob = 1 + Math.sin(time * 1.7) * 0.04;
      writeBasis(reflection.matrix, [0.6, 0.012, -26], [1, 0, 0], [0, 0, 1], [0, 1, 0], 0.7 * wob, 0.26, 1);
      reflection.material.emission = 0.5 + Math.sin(time * 0.9) * 0.08;
      // The fitting buzzes and, now and then, dips.
      lamp.material.emission = Math.sin(time * 0.37) > 0.97 ? 3 : 10;
      if (quality.skipRender) return;
      renderer.updateParts(parts);
      renderer.render({
        eye: [-0.35, 1.15, 3.5], target: [0.4, 0.45, -24], fov: 58, time,
        waterRipple: [0.2, 0, -12.5], rippleTime: time % 6,
        environment: { pointLights: [{ position: [0, H - 0.3, -5], color: linear('#d8d6a6'), intensity: 9, radius: 0.4, range: 7 }, { position: [0.6, 0.3, -26], color: [0.45, 0.7, 0.5], intensity: 0.6, radius: 0.2, range: 3 }] },
        exposure: 1,
        effects: { bloom: { strength: quality.bloom * 0.8, threshold: 1, radius: 1.2 }, vignette: 0.45, grain: settings.grain ? 0.04 : 0, contrast: 1.06, saturation: 0.75 },
      });
    },
    resize: () => renderer.resize(),
    dispose: () => renderer.dispose(),
  };
}
