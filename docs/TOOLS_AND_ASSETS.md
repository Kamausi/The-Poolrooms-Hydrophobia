# The Poolrooms: Hydrophobia · Tools and assets considered

An assessment of the tools, models and asset libraries passed along for this project: what each could do for the game, and whether to use it now. None has been added as a dependency. Only the `untangle-codebase` skill was read at its source; the Hugging Face dataset could not be reached from the build environment. The rest is judged from the descriptions that came with the links.

**Licensing:** the project owner has confirmed that all the linked assets are free to use for this project. The one restriction stated in the material itself: the post about PartField says its NVIDIA licence limits it to non-commercial research and education.

**What blocks using them from the build environment:** the Hugging Face dataset (`codepawl/abo-glb`) cannot be downloaded because the environment's network does not allow huggingface.co. Megascans needs a signed-in Fab account. The generators (TRELLIS, Hunyuan3D, TripoSR, the motion models) need a GPU. Any of them can be brought in from a machine that has these, then committed as GLB, BVH or texture files and loaded through 67js's glTF support.

The question for each: does it close a gap listed under "Not built" in `PRODUCTION.md` (finished characters and animation, a modelled architectural kit, authored textures, recorded sound, online play, human playtests), and can it do that without breaking the build's constraints (one browser build, 67js, no server)?

## Free asset sources reachable from the build environment

Checked from the build container: GitHub (raw files and read-only clones of public repositories) and the npm and PyPI registries are reachable. Poly Haven, ambientCG, Kenney.nl, OpenGameArt, Freesound, Hugging Face, jsDelivr and unpkg are not.

| Source | Licence | What it gave the game |
|---|---|---|
| Meta Open Sound (github.com/facebookincubator/meta-open-sound), Oculus Audio Pack 01 | CC BY 4.0 (credit given) | 26 recorded sounds: water, machinery, vent, underwater and Drift beds; oars, footsteps, valves, levers, hatches, metal, creature voices, whispers, scrapes, chains (`public/audio/`, `src/audio/samples.js`) |
| `@pmndrs/assets` on npm | CC0 1.0 | Two normal maps: glaze wear on the tiles and diamond plate on the Safe Room floor (`src/assets/`, `src/render/textures.js`) |
| Meta Open Sound instruments (piano, nylon and steel guitar) | CC0 1.0 | Not used yet. A detuned upright piano is a candidate for the Safe Room radio |
| `@pmndrs/assets` HDRIs (hall, lobby, warehouse…) | CC0 1.0 | Not used: 67js's environment lighting is set from parameters here, and the facility's light is meant to be its own fixtures |
| Kenney's CC0 packs mirrored on GitHub (for example shorepine/kenney) | CC0 | Not fetched: the session could not attach those repositories. Kenney's furniture and prop kits would fit the Safe Room |
| three.js example assets (github.com/mrdoob/three.js `examples/`) | Per file | Checked, not used yet: `pool.glb` ("The Night Pool" by syntheticplants, CC BY 4.0, 786 KB); Mixamo characters `Xbot.glb` (idle, walk, run, sneak), `Soldier.glb`, `Michelle.glb` (2–3 MB, Mixamo terms: free for use in games). These are candidates for animated crew once 67js's glTF skinning is wired in |

Assets that need a download by hand (blocked hosts or sign-in) are listed, with checked licences, links and sizes, in `docs/ASSET_REQUESTS.md`.

See `docs/CREDITS.md` for exact credits and what was changed.

## Adopted

| Item | Use here |
|---|---|
| Repository structure for Claude Code (CLAUDE.md, skills, hooks, layered docs, local notes) | Built: `CLAUDE.md`, `src/CLAUDE.md`, `.claude/skills/`, `.claude/hooks/`, `docs/ARCHITECTURE.md`, `docs/decisions/` |
| `untangle-codebase` skill (caldoai/skills, MIT) | Adapted as `.claude/skills/untangle/`, which runs only when asked. `ride.js` (3,400 lines) is the obvious candidate |

## Worth trying when the asset work starts

These target the biggest gap: there are no finished characters, creatures or architecture.

| Item | What it is said to do | Fit | Caveat |
|---|---|---|---|
| **Kimodo** (NVIDIA) | Text-to-motion for a skeleton, with keyframe, hand/foot and path constraints. Exports BVH (77-joint skeleton) and NPZ | Crew motion drafts: ducking, bracing, paddling, the stand-and-step-out at the dock. These are procedural now | Motion only. It still needs a rigged crew mesh and retargeting to that skeleton |
| **UniMate** | Text-to-motion across arbitrary skeletons (quadrupeds, snakes, articulated objects). MIT code. Takes rigged GLB/glTF/FBX | The entities: Grout moving through seams, the Undertow, a Bloom folding. These don't fit a human skeleton | Needs a rigged mesh first; contacts aren't physically exact. Some research assets carry their own licences |
| **Möbius** | Motion captioning, text-to-motion, completion and instruction editing | Same role as Kimodo; compare outputs on the same crew actions | Needs a GPU |
| **TailorRig** dataset (Tencent) | 39,073 rigged humanoids with skinning weights | Reference for auto-rigging the crew | A dataset for training auto-rigging, not finished game assets |
| **blender-kiln** (Claude Code plugin) | Description or photo → editable Blender model at real size, CC0 scan textures, GLB export with Draco/WebP | The architectural kit (pool ladders, drains, lifeguard chairs, pumps, lockers) and props, exported as GLB for 67js | Every model needs a pass against `ART_DIRECTION.md` and a draw-call and memory budget |
| **Blender MCP**, BlendRelay | An agent drives Blender | The same kit work, from a script | Needs a machine with Blender; not in this container |
| **TRELLIS.2**, **Hunyuan3D**, **TripoSR** | Image → textured 3D | Quick blockouts of props from concept images | Generated topology needs cleanup; needs a GPU |
| **Quixel Megascans** | 23,000+ scanned materials and assets; the post says free and usable in any engine | Tile, grout, concrete and rust textures for the authored-texture gap | Needs a Fab account to download. Scans are large: budget texture memory per sector |
| **codepawl/abo-glb** | Amazon Berkeley Objects as GLB (from the 67js author's account) | A test corpus for glTF loading and the asset budget in 67js | Blocked from the build environment (huggingface.co not allowed). Furniture and household objects: chairs, shelves, lamps for the Safe Room and pool halls |
| **PartField** (NVIDIA) | Part segmentation of meshes | Splitting generated props into parts that can break or animate | NVIDIA licence limits it to non-commercial research and education. Not for shipped assets |
| **Sand3D** | 100K+ objects written as code (CAD, articulated mechanisms) | Parametric machinery (valves, pumps, winches) is close to how the game already builds geometry from code | Output format to be checked against 67js |
| **Scenario Skills** | Agent skills that coordinate Blender, Maya, Unity and others, and estimate generation cost | An asset pipeline for whoever owns technical art | A hosted service with credits |
| **ShaderAgent**, Nerfstudio | Procedural materials; neural reconstruction from photos | Reference for the tile and water materials. Nerfstudio only if a real pool is photographed | Output must be ported to 67js materials by hand |

## Algorithms, libraries, APIs and languages (survey, nothing adopted)

A survey of methods and code that could serve the game. None of it is in the build. Licences and versions are from the npm registry as of this survey; check them again before anything is added, and record it in `THIRD_PARTY_CODE.md` and `assets/registry.json`. The constraints still hold: one offline browser file, 67js 0.16 (no three.js), no server, and post passes limited to 4 passes, 4096 bytes and 16 uniforms.

**Look in 67js first.** The pinned engine already ships addons the game does not use yet: `navmesh` (`createNavmesh`), `cloth` (`createCloth`, `bakeCloth`), `heightfield`, `spume` (pre-baked spray and water frames), `water-reflection`, `physics` (Rapier baked into a timeline, not live), `light-bake`, `crowd-skinning` and `vehicle`. Each would need a test that it runs in Renderer67, as the material hooks did not.

### Algorithms and formulas

| Method | What it would do here | Notes |
|---|---|---|
| Heightfield wave equation (a small grid, `h += c²∇²h·dt²` with damping) | Real ripples that cross, reflect off the channel walls and fade, in place of the six torus rings | CPU on a 32×32 to 64×64 grid per nearby water area; drawn through the `heightfield` addon or as part vertices. Needs a check that vertex updates are cheap enough |
| Gerstner (trochoidal) waves | The wave pool's swell, the raft's bob and roll sampled from the same sum, so what you see is what you ride | A few waves; pure and unit-testable like `waterfx.js` |
| Archimedes buoyancy on the raft's chambers | Each chamber's submerged volume pushes it up; a punctured chamber lists the raft by physics instead of a table | Fits the existing springs and chamber model |
| Schlick's Fresnel, Beer-Lambert, Snell | Already used (`waterlook.js`, `waterfx.js`) | — |
| Verlet integration with distance constraints | The Lane Rope sagging and swinging when hit; the Ariadne thread on foot | Or the engine's `cloth` addon |
| A* on a navmesh, or flow fields | Followers and the Lifeguard route round obstacles instead of steering at a point; one flow field serves a whole Bloom swarm | Engine `navmesh` addon first |
| Reynolds steering (seek, arrive, separation, wander, path following) | Smoother swarm and follower motion; separation already exists for Marco | Pure; small |
| Utility AI (scored considerations with response curves) | Choosing what an entity does next from many inputs; fits `perception.js` and `pursuit.js` | Fits the existing scoring style (`spawnscore.js`) |
| Poisson-disc sampling (Bridson) | Even but natural placement of debris, stains, caustic patches and pickups | Pure, seeded |
| Seeded PRNG and simplex/value noise | One seed reproduces a run's tile ageing, clutter and omens; noise for flicker and drift | `math.js` already has a seeded `rng`; `ride.js` (3 calls) and `explore.js` (1) still use `Math.random`, so those moments do not replay from a seed |
| Wave function collapse, or graph grammars | Generated dock layouts from authored tiles, still sent through `playable()` | Authored maps stay the default; generated ones must pass `tests/maps.mjs` |
| Inverse-distance attenuation, Doppler, Sabine reverb time (RT60 = 0.161·V/A) | Reverb that follows the room's size and tile surfaces; pitch shift on things passing the raft | Web Audio `ConvolverNode` with generated impulse responses |
| Left 4 Dead-style intensity director | Already the model for `ai/director.js` | — |
| Critically damped springs, PID | Springs are used (`feel/spring.js`); PID only for things that must track a target with steady load, like the raft's autopilot | — |
| AgX or ACES tonemapping, temporal anti-aliasing | Better highlight roll-off on the bright tile and water; TAA would fix shimmer on thin cables | Tonemapping fits the grade pass if the byte budget allows; TAA needs history buffers the user-pass system may not give |

### Libraries (JavaScript, permissive licences)

| Library | Version, licence | Use | Fit |
|---|---|---|---|
| recast-navigation (recast-navigation-js) | 0.44.0, MIT | Navmesh build and crowd agents | WASM, inlined in the single file. Compare with the engine `navmesh` addon first |
| navcat | 0.4.1, MIT | Pure-JS navmesh pathfinding | Lighter than WASM; young |
| yuka | 0.7.8, MIT | Steering, state machines, goal-driven AI, perception, navmesh | Pure JS, renderer-free, so it works with 67js; unmaintained for some years |
| mistreevous | 4.3.1, MIT | Behaviour trees from a small text format | Could describe entity routines as data |
| @dimforge/rapier3d-compat | 0.21.0, Apache-2.0 | Live rigid bodies: debris, floating crates, the raft hitting things | The engine's `physics` addon bakes with it; live use adds about 1–2 MB of WASM |
| cannon-es | 0.20.0, MIT | Pure-JS rigid bodies | Smaller than Rapier, slower |
| simplex-noise | 4.0.3, MIT | 2D–4D noise, seedable | Tiny |
| @gltf-transform/core and cli, meshoptimizer | 4.5.1 MIT; 1.3.0 MIT | Compress the inlined GLB props at build time (quantise, meshopt, texture resize) | The single file is about 19.6 MB; 67js decodes `EXT_meshopt_compression` and `KHR_mesh_quantization` itself, so no runtime decoder is needed |
| fflate | 0.8.3, MIT | Compress saves, play logs and inlined data | Small |
| idb-keyval | 6.3.0, Apache-2.0 | IndexedDB saves if `localStorage` (about 5 MB) gets tight | Storage keys could stay `underflow-*` |
| comlink | 4.4.2, Apache-2.0 | Move the director, perception or a wave grid into a Web Worker | Workers must be inlined for the single file |
| fast-check | 4.10.2, MIT | Property tests for the pure modules (score, memory, placement rules) | Dev dependency only; works with Vitest |
| spectorjs | 0.9.33, MIT | Capture a WebGL frame and list its draw calls | Dev only; would show the batch counts the models test checks |
| lil-gui, stats-gl | 0.21.0 MIT; 4.2.3 MIT | Live tuning panel and GPU timing in the dev build | Dev only |
| Omnitone, Resonance Audio | 2.0.0 Apache-2.0; 1.0.0 Apache-2.0 | Ambisonic and room-modelled spatial sound (HRTF), for headphones | Both from Google and no longer maintained; Web Audio's `PannerNode` with `HRTF` already gives basic binaural sound |
| Tone.js, Howler.js | 15.1.22 MIT; 2.2.4 MIT | Scheduling and playback | The game has its own audio layer and voice cap; not needed |

### Browser APIs

| API | Use |
|---|---|
| Gamepad API with `vibrationActuator` (`dual-rumble`, `trigger-rumble`) | Already used for controller haptics (`feel/haptics.js`); trigger rumble is Chromium only |
| Web Audio: `ConvolverNode`, `PannerNode` (`HRTF`), `AudioWorklet` | Room reverb, binaural position, synthesis off the main thread |
| Pointer Lock with `unadjustedMovement: true` | Raw mouse input without OS acceleration |
| Screen Wake Lock, Fullscreen, Page Visibility | Keep the screen on during long rides; pause when the tab is hidden |
| Web Workers and OffscreenCanvas | Simulation off the main thread |
| IndexedDB, `navigator.storage.persist()` | Saves and the facility's memory that the browser will not clear |
| File System Access, or a download link | Export and import saves and play logs |
| `EXT_disjoint_timer_query_webgl2` | GPU time per pass for the `?bench` report, where the browser exposes it |
| WebXR | A seated VR ride; a large change, only if wanted |
| WebGPU and WGSL | A future renderer; 67js is WebGL2 |

### Asset APIs (free, for the asset scripts, not the game)

Poly Haven API (CC0 models, textures, HDRIs; already the source of 38 props), ambientCG (CC0 PBR materials, has an API), Freesound API (CC0 and CC BY sounds; needs a free key and per-file credits), OpenGameArt (mixed licences, check each).

### Languages

| Language | Use |
|---|---|
| JavaScript with JSDoc types checked by `tsc` | What the game is written in; no change needed |
| TypeScript | Only if the JSDoc grows unwieldy; the checks already run |
| GLSL ES 3.00 | The post passes (used) |
| Rust or AssemblyScript compiled to WebAssembly | A heavy simulation (a large wave grid, many agents) if JavaScript proves too slow; measure first |
| Python, or Node scripts | Offline asset tools (Blender scripting for props, batch texture work). The project's scripts are Node now |

## Possibly later

| Item | Why not now |
|---|---|
| Game-playing MCP (Claude controlling a game with keyboard, mouse and gamepad) | The headless tests already drive the game through its DEV hooks, and the bot measures balance. A controller-level agent could be the first test through real input, but it is Windows desktop software and the repository was suspended at the time of the post |
| **threejs-skills**, **awesome-gamedev-agent-skills** | The game runs on 67js, not three.js. Read them for general WebGL and game-design advice only |
| **GSAP**, **LottieFiles**, **emilkowalski/skills**, **claude-motion**, **Hallmark**, **Stageshow** | UI motion and design taste. Most relevant to menus and the HUD, which follow `ART_DIRECTION.md`. Worth reading for easing and choreography; no dependency |
| **Remotion skills** | Trailers and capture videos made from code |
| **Meta Astryx** design system (MIT, beta) | The interface is a small set of hand-made panels in the game's own visual language. A general component library would fight it |
| **devvm** | Sandboxed VMs for agents. This work already runs in a sandboxed cloud container |
| **Jane Street tutor skill** | Teaching, not building. Could help a new contributor learn the codebase |

## Not applicable

| Item | Why |
|---|---|
| LangGraph, Mastra, Temporal, Pydantic AI, Trigger.dev, Hatchet, Cloudflare Agents, Absurd, Workflow DevKit, DBOS, n8n, Activepieces, Kestra, Windmill, Inngest, Airflow, Oxylabs MCP | Durable workflows and automation run on a server. The game has no server, and its resume is a local snapshot. One of these would matter only for the reviewed content pipeline in `decisions/0003-rule-based-authoring.md`, between expeditions, never during play |
| Paperclip | Orchestrates many agent sessions as a company; outside the game |
| Ruff | A Python linter. The project has no Python |
| Obscura | A browser for scraping that randomises fingerprints to evade detection. The tests need real WebGL in Chromium, which Playwright provides; evasion has no place here |
