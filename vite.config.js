// Generated 3D props are GLB files imported with ?inline (src/render/props.js). The build is one script: the glTF addon's
// lazy chunks are folded in, so the single-file build (scripts/single-html.mjs) carries everything it needs.
import { readFileSync } from 'node:fs';
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default {
  // The build stamps saves with its version (savefile.js), and ships source maps so a stack trace from a player points
  // at the real module and line.
  define: { __BUILD__: JSON.stringify(pkg.version) },
  assetsInclude: ['**/*.glb'],
  build: { sourcemap: true, rollupOptions: { output: { inlineDynamicImports: true } } },
};
