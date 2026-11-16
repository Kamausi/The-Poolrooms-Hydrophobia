// Smooth noise: 2D simplex noise (Perlin's simplex noise as described by Stefan Gustavson, "Simplex noise demystified",
// 2005), written here from the published algorithm, seeded by a permutation built from our own PRNG, plus fractal
// sums of it and a failing-tube flicker built on top. Pure and unit-tested.
import { rng } from '../math.js';

const GRAD = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;

/** A seeded 2D simplex noise function, returning values in about −1..1. */
export function createNoise(seed = 1) {
  const r = rng(seed), p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  return function noise2(x, y) {
    const s = (x + y) * F2, i = Math.floor(x + s), j = Math.floor(y + s);
    const t = (i + j) * G2, x0 = x - (i - t), y0 = y - (j - t);
    const [i1, j1] = x0 > y0 ? [1, 0] : [0, 1];
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255;
    const corner = (gi, cx, cy) => { let k = 0.5 - cx * cx - cy * cy; if (k < 0) return 0; k *= k; const g = GRAD[gi & 7]; return k * k * (g[0] * cx + g[1] * cy); };
    const n = corner(perm[ii + perm[jj]], x0, y0) + corner(perm[ii + i1 + perm[jj + j1]], x1, y1) + corner(perm[ii + 1 + perm[jj + 1]], x2, y2);
    return 70 * n;
  };
}

/** Fractal sum of `octaves` of noise, each twice the frequency and half the amplitude; normalised to about −1..1. */
export function fbm(noise, x, y, octaves = 3) {
  let sum = 0, amp = 1, freq = 1, norm = 0;
  for (let o = 0; o < octaves; o++) { sum += amp * noise(x * freq, y * freq); norm += amp; amp *= 0.5; freq *= 2; }
  return sum / norm;
}

const shared = createNoise(7);

/**
 * How bright a failing fluorescent tube is at time t (0.1 out, 1 lit), for a tube identified by `id`. Most of the
 * time it is lit; slow noise opens stretches where it stutters, and fast noise inside those makes the stutter.
 * `bad` (0..1) is how far gone the tube is.
 */
export function tubeFlicker(t, id, bad = 0.5) {
  const slow = shared(t * 0.35, id * 13.7); // when it is having trouble
  const trouble = slow > 0.55 - bad * 0.6;
  if (!trouble) return 1;
  const fast = shared(t * 9, id * 13.7 + 50);
  return fast > 0.1 ? 0.1 : 1;
}
