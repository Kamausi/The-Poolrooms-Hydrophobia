// Small vector and matrix helpers. 67js parts take column-major 4x4 matrices.

export const v3 = (x = 0, y = 0, z = 0) => [x, y, z];
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const length = (a) => Math.hypot(a[0], a[1], a[2]);
export const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
export const normalize = (a) => {
  const l = length(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
export const damp = (current, target, rate, dt) => lerp(current, target, 1 - Math.exp(-rate * dt));

/** Seeded PRNG so a sector plays the same way on retry. */
export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

/** Write a transform into an existing Float32Array(16): axes are unit vectors, sizes scale them. */
export function writeBasis(out, position, xAxis, yAxis, zAxis, sx = 1, sy = 1, sz = 1) {
  out[0] = xAxis[0] * sx; out[1] = xAxis[1] * sx; out[2] = xAxis[2] * sx; out[3] = 0;
  out[4] = yAxis[0] * sy; out[5] = yAxis[1] * sy; out[6] = yAxis[2] * sy; out[7] = 0;
  out[8] = zAxis[0] * sz; out[9] = zAxis[1] * sz; out[10] = zAxis[2] * sz; out[11] = 0;
  out[12] = position[0]; out[13] = position[1]; out[14] = position[2]; out[15] = 1;
  return out;
}

/** Yaw-only placement (rotation about +Y), the common case for corridor pieces. */
export function writeYaw(out, position, yaw, sx = 1, sy = 1, sz = 1) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  return writeBasis(out, position, [c, 0, -s], [0, 1, 0], [s, 0, c], sx, sy, sz);
}

export function matrix(position = [0, 0, 0], size = [1, 1, 1], yaw = 0) {
  return writeYaw(new Float32Array(16), position, yaw, size[0], size[1], size[2]);
}

const HIDDEN = [0, -500, 0];
/** Parts cannot be removed from a 67js renderer, so pooled parts are hidden by collapsing them far below the world. */
export function hide(part) {
  writeYaw(part.matrix, HIDDEN, 0, 0.0001, 0.0001, 0.0001);
}

/** Camera basis for a look-at camera. up defaults to world +Y; a tilted up rolls the camera. */
export function cameraBasis(eye, target, up = [0, 1, 0]) {
  const forward = normalize(sub(target, eye));
  const right = normalize(cross(forward, up || [0, 1, 0]));
  const camUp = cross(right, forward);
  return { forward, right, up: camUp };
}

/** World-space ray through a point on screen (ndc in -1..1, y up). fov is vertical, in degrees. */
export function screenRay(eye, target, fov, aspect, ndcX, ndcY, upVec) {
  const { forward, right, up } = cameraBasis(eye, target, upVec);
  const t = Math.tan((fov * Math.PI) / 360);
  return normalize(add(forward, add(scale(right, ndcX * t * aspect), scale(up, ndcY * t))));
}

/** Project a world point to ndc. Returns null when it is behind the camera. */
export function project(eye, target, fov, aspect, point, upVec) {
  const { forward, right, up } = cameraBasis(eye, target, upVec);
  const d = sub(point, eye);
  const z = dot(d, forward);
  if (z <= 0.1) return null;
  const t = Math.tan((fov * Math.PI) / 360);
  return [dot(d, right) / (z * t * aspect), dot(d, up) / (z * t), z];
}

/** Angle in radians between a ray direction and the direction to a point. */
export function angleTo(origin, dir, point) {
  const d = normalize(sub(point, origin));
  return Math.acos(Math.max(-1, Math.min(1, dot(d, dir))));
}

/** Distance along the ray to a sphere, or Infinity. */
export function raySphere(origin, dir, center, radius) {
  const oc = sub(origin, center);
  const b = dot(oc, dir);
  const c = dot(oc, oc) - radius * radius;
  const h = b * b - c;
  if (h < 0) return Infinity;
  const t = -b - Math.sqrt(h);
  return t > 0 ? t : Infinity;
}

/** Distance along the ray to the horizontal plane y = h, or Infinity. */
export function rayPlaneY(origin, dir, h) {
  if (Math.abs(dir[1]) < 1e-5) return Infinity;
  const t = (h - origin[1]) / dir[1];
  return t > 0 ? t : Infinity;
}

/** sRGB hex to the linear RGB that 67js materials expect. */
export function linear(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
}

/** sRGB hex to display RGB in 0..1, for sky colours. */
export function display(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
}

/** Stereo pan and a caption word for a sound at point, heard from eye facing forward. */
export function soundDir(eye, forward, point) {
  const d = sub(point, eye);
  const f = normalize([forward[0], 0, forward[2]]);
  const r = [-f[2], 0, f[0]];
  const len = Math.hypot(d[0], d[2]) || 1;
  const x = (d[0] * r[0] + d[2] * r[2]) / len;
  const z = (d[0] * f[0] + d[2] * f[2]) / len;
  const label = z > 0.7 ? 'ahead' : z < -0.7 ? 'behind' : x > 0 ? 'right' : 'left';
  return { pan: x * 0.9, label, distance: len };
}

/** Place a 67js cylinder (radius 1, height 1, axis along local Y) between two points, with the given radius. */
export function writeSegment(out, a, b, radius) {
  const d = sub(b, a);
  const len = Math.max(0.001, length(d));
  const y = scale(d, 1 / len);
  const x = normalize(cross(Math.abs(y[1]) > 0.95 ? [1, 0, 0] : [0, 1, 0], y));
  const z = cross(x, y);
  return writeBasis(out, add(a, scale(d, 0.5)), x, y, z, radius, len, radius);
}
