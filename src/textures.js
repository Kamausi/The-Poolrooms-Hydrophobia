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
