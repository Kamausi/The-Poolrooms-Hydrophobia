// Generated surface textures (assets/registry.json, "generated"): inlined as small WebP files so the single-file
// build carries them. Each one is drawn onto a canvas that is handed to materials at once; the picture appears as
// soon as the image decodes, which is a few milliseconds after the page loads, long before any scene is built.
import ceilingUrl from './assets/gen-ceiling-stained.webp?inline';
import cloudsUrl from './assets/gen-tile-clouds.webp?inline';
import metalUrl from './assets/gen-metal-painted.webp?inline';
import aquaUrl from './assets/gen-tile-aqua.webp?inline';
import pvcUrl from './assets/gen-raft-pvc.webp?inline';
import concreteUrl from './assets/gen-concrete-wet.webp?inline';

const SOURCES = { ceiling: [ceilingUrl, '#cfccbf'], clouds: [cloudsUrl, '#8fb7d6'], metal: [metalUrl, '#5f8f86'], aqua: [aquaUrl, '#3fa6a6'], pvc: [pvcUrl, '#d9d9d9'], concrete: [concreteUrl, '#8f918c'] };
const cache = {};
const loaded = {};

/**
 * A texture descriptor for a named surface: ceiling, clouds, metal, aqua, concrete (wet), or pvc (a grey detail map
 * of raft fabric seams that keeps the material's own colour).
 */
export function surface(name) {
  if (cache[name]) return cache[name];
  const [url, fallback] = SOURCES[name];
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const g = canvas.getContext('2d');
  g.fillStyle = fallback;
  g.fillRect(0, 0, 256, 256);
  const im = new Image();
  im.onload = () => { g.drawImage(im, 0, 0, 256, 256); loaded[name] = true; };
  im.src = url;
  cache[name] = { image: canvas, colorSpace: 'srgb' };
  return cache[name];
}

/** Which surfaces have finished decoding (tests). */
export const surfacesLoaded = () => ({ ...loaded });
// Start decoding at once, so the canvases are ready before the first scene is built.
if (typeof document !== 'undefined') for (const k of Object.keys(SOURCES)) surface(k);
