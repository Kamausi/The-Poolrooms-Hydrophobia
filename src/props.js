// 3D props as inlined GLB files, so the single-file build carries them. Two families, provenance in
// assets/registry.json: models generated for UNDERFLOW (Higgsfield: a generated reference image turned into a mesh),
// and CC0 models from Poly Haven, shrunk (gltfpack, 256 px colour maps). Every model decodes once at load; a scene
// built before a model is ready keeps its primitive stand-in, so nothing waits on them.
import { loadGltf } from '67js/addons/gltf';
import { writeBasis } from './math.js';
import lockerUrl from './assets/models/gen-locker.glb?inline';
import ladderUrl from './assets/models/gen-ladder.glb?inline';
import duckUrl from './assets/models/gen-duck.glb?inline';
import valveUrl from './assets/models/gen-valve.glb?inline';
import towerUrl from './assets/models/gen-lifeguard-chair.glb?inline';
import blasterUrl from './assets/models/gen-blaster.glb?inline';
import workLampUrl from './assets/models/gen-work-lamp.glb?inline';
import buoyUrl from './assets/models/gen-ring-buoy.glb?inline';
import wallLampUrl from './assets/models/cc0/industrial_wall_lamp.glb?inline';
import extinguisherUrl from './assets/models/cc0/korean_fire_extinguisher_01.glb?inline';
import toolChestUrl from './assets/models/cc0/metal_tool_chest.glb?inline';
import binUrl from './assets/models/cc0/metal_trash_can.glb?inline';
import fluorescentUrl from './assets/models/cc0/mounted_fluorescent_lights.glb?inline';
import benchUrl from './assets/models/cc0/painted_wooden_bench.glb?inline';
import chairUrl from './assets/models/cc0/plastic_monobloc_chair_01.glb?inline';
import powerBoxUrl from './assets/models/cc0/power_box_01.glb?inline';
import toolCartUrl from './assets/models/cc0/tool_cart.glb?inline';
import utilityBoxUrl from './assets/models/cc0/utility_box_02.glb?inline';
import kettleUrl from './assets/models/cc0/vintage_electric_kettle.glb?inline';
import rackUrl from './assets/models/cc0/worn_metal_rack.glb?inline';
import crateUrl from './assets/models/cc0/plastic_crate_02.glb?inline';
import pipesUrl from './assets/models/cc0/modular_industrial_pipes_01.glb?inline';
import shutterUrl from './assets/models/cc0/rollershutter_door.glb?inline';

/**
 * Each model: its source; for generated models a surface finish (those files carry only a colour texture, and glTF's
 * default of fully metallic reads as dark paint); `turn`, a yaw that makes the model's front face +Z, found by
 * looking at the imported mesh. CC0 models keep their own materials and their real size in metres.
 */
export const MODELS = {
  locker: { url: lockerUrl, turn: 0, finish: { metallic: 0.35, roughness: 0.45 } },
  ladder: { url: ladderUrl, turn: 0, finish: { metallic: 0.95, roughness: 0.2 } },
  duck: { url: duckUrl, turn: 0, finish: { metallic: 0, roughness: 0.45 } },
  valve: { url: valveUrl, turn: 0, finish: { metallic: 0.4, roughness: 0.5 } },
  // The chair's ladder faces +X in the file.
  tower: { url: towerUrl, turn: -Math.PI / 2 },
  blaster: { url: blasterUrl, turn: 0 },
  workLamp: { url: workLampUrl, turn: 0, finish: { metallic: 0.1, roughness: 0.55 } },
  buoy: { url: buoyUrl, turn: 0, finish: { metallic: 0, roughness: 0.6 } },
  wallLamp: { url: wallLampUrl, turn: 0 },
  extinguisher: { url: extinguisherUrl, turn: 0 },
  toolChest: { url: toolChestUrl, turn: 0 },
  bin: { url: binUrl, turn: 0 },
  fluorescent: { url: fluorescentUrl, turn: 0 },
  bench: { url: benchUrl, turn: 0 },
  chair: { url: chairUrl, turn: 0 },
  powerBox: { url: powerBoxUrl, turn: 0 },
  toolCart: { url: toolCartUrl, turn: 0 },
  utilityBox: { url: utilityBoxUrl, turn: 0 },
  kettle: { url: kettleUrl, turn: 0 },
  rack: { url: rackUrl, turn: 0 },
  crate: { url: crateUrl, turn: 0 },
  pipes: { url: pipesUrl, turn: 0 },
  shutter: { url: shutterUrl, turn: 0 },
};

const ready = {};
const failed = {};

/** Bounds of a position array: min and max per axis. */
export function bounds(positions, lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity]) {
  for (let i = 0; i < positions.length; i += 3) for (let a = 0; a < 3; a++) {
    const v = positions[i + a];
    if (v < lo[a]) lo[a] = v;
    if (v > hi[a]) hi[a] = v;
  }
  return { lo, hi };
}

/** A geometry with a part's world matrix baked in, so every piece of a model shares one placement matrix. */
export function bake(geometry, m) {
  const p = geometry.positions, n = geometry.normals;
  const P = new Float32Array(p.length), N = new Float32Array(n.length);
  for (let i = 0; i < p.length; i += 3) {
    const x = p[i], y = p[i + 1], z = p[i + 2];
    P[i] = m[0] * x + m[4] * y + m[8] * z + m[12];
    P[i + 1] = m[1] * x + m[5] * y + m[9] * z + m[13];
    P[i + 2] = m[2] * x + m[6] * y + m[10] * z + m[14];
    const a = n[i], b = n[i + 1], c = n[i + 2];
    const u = m[0] * a + m[4] * b + m[8] * c, v = m[1] * a + m[5] * b + m[9] * c, w = m[2] * a + m[6] * b + m[10] * c;
    const l = Math.hypot(u, v, w) || 1;
    N[i] = u / l; N[i + 1] = v / l; N[i + 2] = w / l;
  }
  return { ...geometry, positions: P, normals: N };
}

/** One geometry from several with the same attributes: positions, normals, uvs and colours appended, indices offset. */
export function merge(list) {
  const cat = (key, Type) => {
    if (!list[0][key]) return undefined;
    const out = new Type(list.reduce((n, g) => n + g[key].length, 0));
    let o = 0;
    for (const g of list) { out.set(g[key], o); o += g[key].length; }
    return out;
  };
  const indices = new Uint32Array(list.reduce((n, g) => n + g.indices.length, 0));
  let o = 0, base = 0;
  for (const g of list) {
    for (let i = 0; i < g.indices.length; i++) indices[o + i] = g.indices[i] + base;
    o += g.indices.length; base += g.positions.length / 3;
  }
  const out = { positions: cat('positions', Float32Array), normals: cat('normals', Float32Array), indices };
  const uvs = cat('uvs', Float32Array), colors = cat('colors', Float32Array);
  if (uvs) out.uvs = uvs;
  if (colors) out.colors = colors;
  return out;
}

const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const isIdentity = (m) => IDENTITY.every((v, i) => Math.abs(m[i] - v) < 1e-6);

async function load(name) {
  const asset = await loadGltf(MODELS[name].url, { maxTexturePixels: 1024 * 1024 });
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  // Pieces that share a material (and the same vertex attributes) are merged into one, so a fixture made of many
  // small meshes costs as many parts as it has materials.
  const groups = new Map();
  for (const part of asset.parts) {
    const geometry = isIdentity(part.matrix) ? part.geometry : bake(part.geometry, part.matrix);
    bounds(geometry.positions, lo, hi);
    const key = [part.material, !!geometry.uvs, !!geometry.colors];
    const g = [...groups.keys()].find((k) => k[0] === key[0] && k[1] === key[1] && k[2] === key[2]);
    if (g) groups.get(g).push(geometry); else groups.set(key, [geometry]);
  }
  const pieces = [...groups].map(([[material], list]) => ({ geometry: list.length > 1 ? merge(list) : list[0], material: { ...material, tag: undefined, ...MODELS[name].finish } }));
  ready[name] = {
    pieces,
    // The base sits on the floor, centred on its footprint.
    offset: [-(lo[0] + hi[0]) / 2, -lo[1], -(lo[2] + hi[2]) / 2],
    mid: [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2],
    size: [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]],
  };
}

/** Resolves when every model has loaded or failed; never rejects. */
export const modelsReady = typeof document === 'undefined' ? Promise.resolve() : Promise.all(Object.keys(MODELS).map((n) => load(n).catch((e) => { failed[n] = String(e && e.message || e); })));

/** A loaded model, or null while it is loading (or if it failed). */
export const model = (name) => ready[name] || null;

/** Which models loaded, which failed (tests). */
export const modelState = () => ({ ready: Object.keys(ready), failed: { ...failed } });

/**
 * New parts for a model, each with its own copy of its material so a scene can tint or light it. The first part is
 * the handle: it carries `group` (every part, itself included), and placeModel moves them together. `extra` is merged
 * into every material (emission, emissiveColor ...). Returns null while the model loads.
 */
export function modelPart(name, label, extra = {}) {
  const m = ready[name];
  if (!m) return null;
  const group = m.pieces.map((piece, i) => ({ name: i ? `${label} ${i}` : label, geometry: piece.geometry, matrix: new Float32Array(16), material: { ...piece.material, ...extra }, model: name }));
  group[0].group = group;
  return group[0];
}

/**
 * Place a model: base on `pos`, turned by `yaw` (front along +Z at yaw 0), scaled uniformly so it stands `height`
 * tall, or at its own size when `height` is omitted. Returns the handle part.
 */
export function placeModel(part, pos, yaw, height, aspect = 1) {
  const m = ready[part.model];
  const k = height ? height / m.size[1] : 1, kw = k * aspect;
  const t = yaw + MODELS[part.model].turn;
  const c = Math.cos(t), s = Math.sin(t);
  const x = [c, 0, -s], z = [s, 0, c];
  const o = m.offset;
  const p = [pos[0] + kw * (x[0] * o[0] + z[0] * o[2]), pos[1] + k * o[1], pos[2] + kw * (x[2] * o[0] + z[2] * o[2])];
  for (const q of part.group || [part]) writeBasis(q.matrix, p, x, [0, 1, 0], z, kw, k, kw);
  return part;
}

/**
 * Place a model by its centre in an arbitrary frame (x right, y up, z forward, unit vectors), scaled uniformly so
 * its length along z is `length`. Used for the first-person blaster, which follows the camera.
 */
export function placeModelBasis(part, centre, x, y, z, length) {
  const m = ready[part.model];
  const k = length / m.size[2], c = m.mid;
  const p = [0, 1, 2].map((i) => centre[i] - k * (x[i] * c[0] + y[i] * c[1] + z[i] * c[2]));
  for (const q of part.group || [part]) writeBasis(q.matrix, p, x, y, z, k, k, k);
  return part;
}
