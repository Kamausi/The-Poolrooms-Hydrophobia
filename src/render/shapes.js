// Shared primitive shapes. 67js draws parts that share one geometry object (and the same texture maps) as one
// instanced batch; the material's colour, emission and roughness travel per instance. Each call to 67js's box(),
// cylinder(), sphere() or torus() builds a new geometry, so a hundred identical slabs were a hundred batches.
// These return one geometry per distinct set of arguments. Nothing in the game edits geometry after creation;
// placement, size and deformation are all part matrices.
import { box as box67, cylinder as cylinder67, sphere as sphere67, torus as torus67 } from '67js';

const cache = new Map();
const shared = (name, make) => (...args) => {
  const key = name + args.join(',');
  let g = cache.get(key);
  if (!g) cache.set(key, (g = make(...args)));
  return g;
};

export const box = shared('box', box67);
export const cylinder = shared('cylinder', cylinder67);
export const sphere = shared('sphere', sphere67);
export const torus = shared('torus', torus67);

/** How many distinct shapes have been built (tests). */
export const shapeCount = () => cache.size;
