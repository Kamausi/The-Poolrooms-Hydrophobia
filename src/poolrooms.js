// The Poolrooms grammar: grid, circle, arch. Round tiled columns rising straight out of floor and water, arches
// over the mouths of corridors, and, rarely, a painted children's room. Structurally simple at first glance,
// wrong on inspection. Pure placement logic here; explore.js builds the parts.

/**
 * Columns stand on grid corners where all four surrounding cells are open, away from anything the player has to
 * reach. Deterministic per map (hash), so the same room keeps the same columns.
 * @param {{ W: number, H: number, at: (x: number, z: number) => string, hash: (a: number, b: number) => number, cell: number, avoid: number[][], density?: number }} o
 * @returns {{ x: number, z: number, r: number }[]}
 */
export function planColumns({ W, H, at, hash, cell, avoid, density = 0.32 }) {
  const OPEN = new Set(['.', '~', 'u', 'k']);
  const out = [];
  for (let z = 1; z < H; z++) {
    for (let x = 1; x < W; x++) {
      const four = [at(x - 1, z - 1), at(x, z - 1), at(x - 1, z), at(x, z)];
      if (!four.every((c) => OPEN.has(c))) continue;
      if (hash(x * 1.7 + 0.31, z * 2.3 + 0.77) > density) continue;
      const p = [x * cell, 0, z * cell];
      if (avoid.some((a) => Math.hypot(a[0] - p[0], a[2] - p[2]) < 3)) continue;
      // Never two side by side: the grid should read as a colonnade, not a wall.
      if (out.some((c) => Math.abs(c.x - p[0]) + Math.abs(c.z - p[2]) <= cell)) continue;
      out.push({ x: p[0], z: p[2], r: 0.55 + hash(x, z) * 0.25 });
    }
  }
  return out;
}

/** Push a point out of any column it overlaps (the player, a follower, a creature). Mutates and returns pos. */
export function pushOutOfColumns(pos, columns, radius) {
  for (const c of columns) {
    const dx = pos[0] - c.x, dz = pos[2] - c.z;
    const d = Math.hypot(dx, dz), min = c.r + radius;
    if (d < min) {
      const k = d > 1e-4 ? min / d : 0;
      if (k) { pos[0] = c.x + dx * k; pos[2] = c.z + dz * k; } else pos[0] = c.x + min;
    }
  }
  return pos;
}

/** True if a segment from a to b (xz) passes through a column: columns block sight and shots. */
export function columnBlocks(a, b, columns) {
  const dx = b[0] - a[0], dz = b[2] - a[2];
  const L2 = dx * dx + dz * dz || 1;
  for (const c of columns) {
    const t = Math.max(0, Math.min(1, ((c.x - a[0]) * dx + (c.z - a[2]) * dz) / L2));
    const px = a[0] + dx * t - c.x, pz = a[2] + dz * t - c.z;
    if (px * px + pz * pz < c.r * c.r * 0.8) return true;
  }
  return false;
}

/**
 * Arches: where a one-cell corridor opens into something wider, the boundary between them gets an arch.
 * Returns boundaries { x, z, dx, dz } meaning "between cell (x, z) and (x + dx, z + dz)".
 */
export function planArches({ W, H, at, isWall, limit = 10 }) {
  const open = (x, z) => !isWall(x, z);
  const out = [];
  for (let z = 1; z < H - 1; z++) {
    for (let x = 1; x < W - 1; x++) {
      if (!open(x, z) || at(x, z) === 'o') continue;
      for (const [dx, dz] of [[1, 0], [0, 1]]) {
        const nx = x + dx, nz = z + dz;
        if (!open(nx, nz) || at(nx, nz) === 'o') continue;
        // The perpendicular neighbours of each side.
        const px = dz, pz = dx;
        const narrowA = isWall(x + px, z + pz) && isWall(x - px, z - pz);
        const narrowB = isWall(nx + px, nz + pz) && isWall(nx - px, nz - pz);
        if (narrowA !== narrowB) out.push({ x, z, dx, dz });
      }
    }
  }
  return out.slice(0, limit);
}

/** A sky-blue tile wall with painted clouds: the children's room. The tile grid shows through the paint. */
export function cloudTexture() {
  const size = 512, tiles = 8, step = size / tiles;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d');
  g.fillStyle = '#3f8fbf';
  g.fillRect(0, 0, size, size);
  const blobs = [[120, 140, 1], [360, 110, 0.8], [250, 330, 1.1], [70, 420, 0.7], [440, 400, 0.9]];
  g.fillStyle = '#f2f4f2';
  for (const [cx, cy, s] of blobs) {
    for (const [ox, oy, r] of [[-38, 8, 30], [-10, -14, 38], [26, -6, 34], [50, 12, 26], [0, 16, 36]]) {
      g.beginPath();
      g.arc(cx + ox * s, cy + oy * s, r * s, 0, Math.PI * 2);
      g.fill();
    }
  }
  // Grout lines over the paint: it was painted on tile.
  g.strokeStyle = 'rgba(30, 60, 80, 0.45)';
  g.lineWidth = 3;
  for (let i = 0; i <= tiles; i++) {
    g.beginPath(); g.moveTo(i * step, 0); g.lineTo(i * step, size); g.stroke();
    g.beginPath(); g.moveTo(0, i * step); g.lineTo(size, i * step); g.stroke();
  }
  return { image: canvas, colorSpace: 'srgb' };
}
