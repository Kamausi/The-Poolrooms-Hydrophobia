// Procedural tile textures, drawn once per sector on a 2D canvas.
import { rng } from './math.js';
import dripDetailUrl from './assets/normal-0000.webp?inline';
import plateUrl from './assets/normal-0008.webp?inline';

const cache = new Map();

/** Square ceramic tiles with grout lines and water stains. Shared descriptor per sector so parts batch together. */
export function tileTexture(sector) {
  if (cache.has(sector.id)) return cache.get(sector.id);
  const size = 512, tiles = 8, step = size / tiles;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d');
  const random = rng(sector.depth * 97 + 13);

  g.fillStyle = sector.grout;
  g.fillRect(0, 0, size, size);
  for (let y = 0; y < tiles; y++) {
    for (let x = 0; x < tiles; x++) {
      g.fillStyle = sector.tile;
      g.globalAlpha = 1;
      g.fillRect(x * step + 3, y * step + 3, step - 6, step - 6);
      // A slight per-tile shade so the wall does not read as a flat grid.
      g.globalAlpha = 0.04 + random() * 0.08;
      g.fillStyle = random() < 0.5 ? '#000' : '#fff';
      g.fillRect(x * step + 3, y * step + 3, step - 6, step - 6);
      // Glaze highlight along the top edge.
      g.globalAlpha = 0.18;
      g.fillStyle = '#fff';
      g.fillRect(x * step + 5, y * step + 5, step - 10, 3);
    }
  }
  // Batch variation: a few tiles from a different firing, slightly greener or yellower.
  for (let i = 0; i < 7; i++) {
    const x = Math.floor(random() * tiles), y = Math.floor(random() * tiles);
    g.globalAlpha = 0.1 + random() * 0.08;
    g.fillStyle = random() < 0.5 ? '#9a9a6a' : '#6f8a7c';
    g.fillRect(x * step + 3, y * step + 3, step - 6, step - 6);
  }
  // Grout darkened where the moisture never leaves, in patches.
  for (let i = 0; i < 4; i++) {
    const cx = random() * size, cy = random() * size, r = 40 + random() * 70;
    const grad = g.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, sector.stain);
    grad.addColorStop(1, 'transparent');
    g.globalAlpha = 0.18;
    g.fillStyle = grad;
    g.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  // Hairline cracks.
  g.strokeStyle = sector.stain;
  g.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    g.globalAlpha = 0.35;
    g.beginPath();
    let x = random() * size, y = random() * size;
    g.moveTo(x, y);
    for (let k = 0; k < 4; k++) { x += (random() - 0.5) * 40; y += random() * 30; g.lineTo(x, y); }
    g.stroke();
  }
  // Drip stains running down from the top.
  g.fillStyle = sector.stain;
  for (let i = 0; i < 9; i++) {
    const x = random() * size, w = 4 + random() * 18, h = size * (0.2 + random() * 0.7);
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, sector.stain);
    grad.addColorStop(1, 'transparent');
    g.globalAlpha = 0.12 + random() * 0.2;
    g.fillStyle = grad;
    g.fillRect(x, 0, w, h);
  }
  g.globalAlpha = 1;
  const texture = { image: canvas, colorSpace: 'srgb' };
  cache.set(sector.id, texture);
  return texture;
}

// ---------- Normal maps ----------
// The CC0 detail normals come from @pmndrs/assets (normals 0000 and 0008), resized to 256 px and inlined so the
// single-file build carries them. They load in the background; a map built before they arrive is rebuilt with
// them the next time a scene asks.

const images = {};
/** Resolves once both CC0 detail images have decoded (or failed); scenes built earlier use what is ready. */
export const texturesReady = typeof Image === 'undefined' ? Promise.resolve() : Promise.all([['drip', dripDetailUrl], ['plate', plateUrl]].map(([k, url]) => new Promise((done) => {
  const im = new Image();
  im.onload = () => { images[k] = im; done(); };
  im.onerror = () => done();
  im.src = url;
})));
const pixelsOf = (im, size) => {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  // Tile the source across the canvas (the detail repeats several times per tile sheet).
  const n = Math.max(1, Math.round(size / im.width));
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) g.drawImage(im, x * size / n, y * size / n, size / n, size / n);
  return g.getImageData(0, 0, size, size).data;
};

let tileNormalCache = null;
/**
 * The tile sheet's relief, aligned with tileTexture's grid (8 × 8 tiles, 3 px of grout each side): recessed
 * grout, bevelled tile edges, each tile set very slightly off true, and a fine CC0 surface detail for wear.
 */
export function tileNormal() {
  const withDetail = !!images.drip;
  if (tileNormalCache && (tileNormalCache.detail || !withDetail)) return tileNormalCache.texture;
  const size = 512, tiles = 8, step = size / tiles;
  const random = rng(4242);
  const tilt = Array.from({ length: tiles * tiles }, () => [(random() - 0.5) * 0.16, (random() - 0.5) * 0.16]);
  const h = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tx = Math.floor(x / step), ty = Math.floor(y / step);
      const lx = x - tx * step, ly = y - ty * step;
      const edge = Math.min(lx, ly, step - 1 - lx, step - 1 - ly) - 3; // distance inside the tile face
      let v = edge < 0 ? 0 : Math.min(1, 0.35 + edge / 5);
      if (edge >= 0) {
        const [ax, ay] = tilt[ty * tiles + tx];
        v += ax * (lx / step - 0.5) + ay * (ly / step - 0.5);
      }
      h[y * size + x] = v;
    }
  }
  const detail = withDetail ? pixelsOf(images.drip, size) : null;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d');
  const out = g.createImageData(size, size);
  const k = 2.2; // relief strength
  const at = (x, y) => h[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let nx = (at(x - 1, y) - at(x + 1, y)) * k, ny = (at(x, y - 1) - at(x, y + 1)) * k, nz = 1;
      if (detail) {
        // Whiteout blend: add the detail's slopes, multiply the up components. Kept faint: glaze, not stone.
        const i = (y * size + x) * 4;
        const dx = detail[i] / 127.5 - 1, dy = detail[i + 1] / 127.5 - 1, dz = detail[i + 2] / 127.5 - 1;
        nx += dx * 0.35; ny += dy * 0.35; nz *= Math.max(0.2, dz);
      }
      const l = Math.hypot(nx, ny, nz) || 1;
      const o = (y * size + x) * 4;
      out.data[o] = (nx / l * 0.5 + 0.5) * 255;
      out.data[o + 1] = (ny / l * 0.5 + 0.5) * 255;
      out.data[o + 2] = (nz / l * 0.5 + 0.5) * 255;
      out.data[o + 3] = 255;
    }
  }
  g.putImageData(out, 0, 0);
  tileNormalCache = { detail: withDetail, texture: { image: canvas, colorSpace: 'linear' } };
  return tileNormalCache.texture;
}

let plateCache = null;
/** Diamond plate (CC0) for floor grating and machine housings; null until the image has loaded. */
export function plateNormal() {
  if (plateCache) return plateCache;
  if (!images.plate) return null;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  c.getContext('2d').drawImage(images.plate, 0, 0);
  plateCache = { image: c, colorSpace: 'linear' };
  return plateCache;
}
