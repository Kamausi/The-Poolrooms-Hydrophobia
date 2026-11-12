// Generated 3D props are GLB files imported with ?inline (src/props.js). The build is one script: the glTF addon's
// lazy chunks are folded in, so the single-file build (scripts/single-html.mjs) carries everything it needs.
export default {
  assetsInclude: ['**/*.glb'],
  build: { rollupOptions: { output: { inlineDynamicImports: true } } },
};
