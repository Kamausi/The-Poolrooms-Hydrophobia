# UNDERFLOW · Tools and assets considered

An assessment of the tools, models and asset libraries passed along for this project: what each could do for the game, and whether to use it now. None has been added as a dependency. Only the `untangle-codebase` skill was read at its source; the Hugging Face dataset could not be reached from the build environment. The rest is judged from the descriptions that came with the links.

**Licensing:** the project owner has confirmed that all the linked assets are free to use for this project. The one restriction stated in the material itself: the post about PartField says its NVIDIA licence limits it to non-commercial research and education.

**What blocks using them from the build environment:** the Hugging Face dataset (`codepawl/abo-glb`) cannot be downloaded because the environment's network does not allow huggingface.co. Megascans needs a signed-in Fab account. The generators (TRELLIS, Hunyuan3D, TripoSR, the motion models) need a GPU. Any of them can be brought in from a machine that has these, then committed as GLB, BVH or texture files and loaded through 67js's glTF support.

The question for each: does it close a gap listed under "Not built" in `PRODUCTION.md` (finished characters and animation, a modelled architectural kit, authored textures, recorded sound, online play, human playtests), and can it do that without breaking the build's constraints (one browser build, 67js, no server)?

## Free asset sources reachable from the build environment

Checked from the build container: GitHub (raw files and read-only clones of public repositories) and the npm and PyPI registries are reachable. Poly Haven, ambientCG, Kenney.nl, OpenGameArt, Freesound, Hugging Face, jsDelivr and unpkg are not.

| Source | Licence | What it gave the game |
|---|---|---|
| Meta Open Sound (github.com/facebookincubator/meta-open-sound), Oculus Audio Pack 01 | CC BY 4.0 (credit given) | 26 recorded sounds: water, machinery, vent, underwater and Drift beds; oars, footsteps, valves, levers, hatches, metal, creature voices, whispers, scrapes, chains (`public/audio/`, `src/samples.js`) |
| `@pmndrs/assets` on npm | CC0 1.0 | Two normal maps: glaze wear on the tiles and diamond plate on the Safe Room floor (`src/assets/`, `src/textures.js`) |
| Meta Open Sound instruments (piano, nylon and steel guitar) | CC0 1.0 | Not used yet. A detuned upright piano is a candidate for the Safe Room radio |
| `@pmndrs/assets` HDRIs (hall, lobby, warehouse…) | CC0 1.0 | Not used: 67js's environment lighting is set from parameters here, and the facility's light is meant to be its own fixtures |
| Kenney's CC0 packs mirrored on GitHub (for example shorepine/kenney) | CC0 | Not fetched: the session could not attach those repositories. Kenney's furniture and prop kits would fit the Safe Room |

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
