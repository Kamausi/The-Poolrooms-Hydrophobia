// Compresses the game's GLB models in place: duplicate data merged, unused data dropped, vertex attributes
// quantised (KHR_mesh_quantization) and the buffers packed with meshoptimizer (EXT_meshopt_compression). 67js decodes
// both itself, so the game needs no decoder. Textures are left as they are. A compressed file is marked in
// asset.extras, so running this again leaves it alone.
//
//   node scripts/compress-models.mjs          compress every model under src/assets/models
//   node scripts/compress-models.mjs --check  report what would change, write nothing
//
// Tools: @gltf-transform (MIT) and meshoptimizer (MIT), dev dependencies only; nothing from them ships in the game.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, quantize, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dir = path.join(root, 'src/assets/models');
const check = process.argv.includes('--check');
const MARK = 'meshopt-quantized';

const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));

await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });

let before = 0, after = 0;
for (const file of walk(dir).filter((f) => f.endsWith('.glb')).sort()) {
  const size = fs.statSync(file).size;
  const doc = await io.read(file);
  const asset = doc.getRoot().getAsset();
  if (asset.extras?.compressed === MARK) { before += size; after += size; continue; }
  await doc.transform(
    dedup(),
    prune(),
    // Positions to 14 bits, normals 10, texture coordinates 12: well under a millimetre on props this size.
    quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12 }),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  );
  asset.extras = { ...(asset.extras || {}), compressed: MARK };
  const out = await io.writeBinary(doc);
  before += size; after += out.byteLength;
  console.log(`${path.relative(dir, file).padEnd(44)} ${String(size).padStart(9)} -> ${String(out.byteLength).padStart(9)}`);
  if (!check) fs.writeFileSync(file, out);
}
console.log(`total ${before} -> ${after} bytes (${Math.round((1 - after / before) * 100)}% smaller)${check ? ' · check only' : ''}`);
