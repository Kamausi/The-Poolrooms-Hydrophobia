// Procedural tile textures, drawn once per sector on a 2D canvas.
import { rng } from './math.js';

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
