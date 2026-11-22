// Ripples that behave like water: a height grid stepped with the 2D wave equation, ∂²h/∂t² = c²∇²h, by the usual
// explicit finite difference (h' = 2h − h_prev + (c·dt/dx)²·∇²h), with light damping. Disturbances spread as rings,
// pass through each other, and bounce off whatever is not water (a cell outside the mask is held at rest, which
// reflects a wave the way a pool wall does). Time steps are split so the Courant number c·dt/dx stays under 0.5,
// well inside the 1/√2 the 2D scheme needs to stay stable.
//
// The grid is local: x and z from 0 to `size` metres. `writeMesh` fills a sheet's vertex positions (heights scaled
// for show) and normals from the slopes. Pure and unit-tested: no DOM, no renderer.

export function createWaveGrid({ n = 48, size = 12, speed = 1.4, damping = 0.35 } = {}) {
  const N = n * n, dx = size / (n - 1);
  let h = new Float32Array(N), prev = new Float32Array(N), next = new Float32Array(N);
  const mask = new Uint8Array(N).fill(1);
  const idx = (i, j) => j * n + i;

  function step(dt) {
    if (!(dt > 0)) return;
    const sub = Math.max(1, Math.ceil((speed * dt) / (0.5 * dx)));
    const d = dt / sub, k = (speed * d / dx) ** 2, keep = Math.exp(-damping * d);
    for (let s = 0; s < sub; s++) {
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const c = idx(i, j);
        if (!mask[c]) { next[c] = 0; continue; }
        // Neighbours past the grid's edge read as this cell (open water continuing, no reflection from the edge).
        const l = i > 0 ? h[c - 1] : h[c], r = i < n - 1 ? h[c + 1] : h[c], u = j > 0 ? h[c - n] : h[c], w = j < n - 1 ? h[c + n] : h[c];
        next[c] = (2 * h[c] - prev[c] + k * (l + r + u + w - 4 * h[c])) * keep;
      }
      const t = prev; prev = h; h = next; next = t;
    }
  }

  return {
    n, size, dx,
    get heights() { return h; },
    mask,
    /** Mark which grid points are water (`isWater(x, z)` in local metres). Points outside hold still. */
    setMask(isWater) {
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const c = idx(i, j); mask[c] = isWater(i * dx, j * dx) ? 1 : 0; if (!mask[c]) { h[c] = 0; prev[c] = 0; } }
    },
    /** Push the surface down by `amount` metres in a smooth dip of `radius` around local (x, z). */
    disturb(x, z, amount = 0.05, radius = 0.4) {
      const r = Math.max(dx, radius), ri = Math.ceil(r / dx);
      const ci = Math.round(x / dx), cj = Math.round(z / dx);
      for (let j = cj - ri; j <= cj + ri; j++) for (let i = ci - ri; i <= ci + ri; i++) {
        if (i < 0 || j < 0 || i >= n || j >= n) continue;
        const c = idx(i, j), q = Math.hypot(i * dx - x, j * dx - z) / r;
        if (q >= 1 || !mask[c]) continue;
        const f = 0.5 * (1 + Math.cos(Math.PI * q)); // a raised-cosine dip: smooth, no spike
        h[c] -= amount * f; prev[c] -= amount * f;
      }
    },
    step,
    /** Height at local (x, z), bilinear. */
    heightAt(x, z) {
      const fi = Math.max(0, Math.min(n - 1, x / dx)), fj = Math.max(0, Math.min(n - 1, z / dx));
      const i = Math.min(n - 2, Math.floor(fi)), j = Math.min(n - 2, Math.floor(fj)), a = fi - i, b = fj - j;
      return h[idx(i, j)] * (1 - a) * (1 - b) + h[idx(i + 1, j)] * a * (1 - b) + h[idx(i, j + 1)] * (1 - a) * b + h[idx(i + 1, j + 1)] * a * b;
    },
    /** Sum of squared heights: how much is still moving. */
    energy() { let e = 0; for (let c = 0; c < N; c++) e += h[c] * h[c]; return e; },
    clear() { h.fill(0); prev.fill(0); next.fill(0); },
    /**
     * Fill `positions` (n·n·3, local x/z, y the height × `lift`) and `normals` from the grid. The sheet's layout
     * matches `sheetGeometry`.
     */
    writeMesh(positions, normals, lift = 1) {
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const c = idx(i, j), v = c * 3;
        positions[v] = i * dx; positions[v + 1] = h[c] * lift; positions[v + 2] = j * dx;
        const hl = h[idx(Math.max(0, i - 1), j)], hr = h[idx(Math.min(n - 1, i + 1), j)];
        const hu = h[idx(i, Math.max(0, j - 1))], hd = h[idx(i, Math.min(n - 1, j + 1))];
        const sx = ((hr - hl) * lift) / (2 * dx), sz = ((hd - hu) * lift) / (2 * dx), L = Math.hypot(sx, 1, sz);
        normals[v] = -sx / L; normals[v + 1] = 1 / L; normals[v + 2] = -sz / L;
      }
    },
  };
}

/** A flat n × n sheet `size` metres across (x and z from 0), facing up: the geometry the grid writes into. */
export function sheetGeometry(n, size) {
  const positions = new Float32Array(n * n * 3), normals = new Float32Array(n * n * 3), uvs = new Float32Array(n * n * 2);
  const indices = new Uint32Array((n - 1) * (n - 1) * 6), d = size / (n - 1);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const c = j * n + i;
    positions[c * 3] = i * d; positions[c * 3 + 2] = j * d; normals[c * 3 + 1] = 1;
    uvs[c * 2] = i / (n - 1); uvs[c * 2 + 1] = j / (n - 1);
  }
  let o = 0;
  for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
    const a = j * n + i, b = a + 1, c = a + n, e = c + 1;
    indices.set([a, c, b, b, c, e], o); o += 6; // counter-clockwise seen from above
  }
  return { positions, normals, uvs, indices };
}
