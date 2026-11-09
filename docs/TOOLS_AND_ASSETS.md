# UNDERFLOW · Tools and assets considered

An assessment of the tools, models and asset libraries passed along for this project: what each could do for the game, and whether to use it now. None has been added as a dependency. Only the `untangle-codebase` skill was read at its source; the Hugging Face dataset could not be reached from the build environment. The rest is judged from the descriptions that came with the links, so **check each licence at the source before using anything**.

The question for each: does it close a gap listed under "Not built" in `PRODUCTION.md` (finished characters and animation, a modelled architectural kit, authored textures, recorded sound, online play, human playtests), and can it do that without breaking the build's constraints (one browser build, 67js, no server)?

## Adopted

| Item | Use here |
|---|---|
| Repository structure for Claude Code (CLAUDE.md, skills, hooks, layered docs, local notes) | Built: `CLAUDE.md`, `src/CLAUDE.md`, `.claude/skills/`, `.claude/hooks/`, `docs/ARCHITECTURE.md`, `docs/decisions/` |
| `untangle-codebase` skill (caldoai/skills, MIT) | Adapted as `.claude/skills/untangle/`, which runs only when asked. `ride.js` (3,400 lines) is the obvious candidate |

## Worth trying when the asset work starts

These target the biggest gap: there are no finished characters, creatures or architecture.

| Item | What it is said to do | Fit | Caveat |
|---|---|---|---|
| **Kimodo** (NVIDIA) | Text-to-motion for a skeleton, with keyframe, hand/foot and path constraints. Exports BVH (77-joint skeleton) and NPZ | Crew motion drafts: ducking, bracing, paddling, the stand-and-step-out at the dock. These are procedural now | Motion only. It still needs a rigged crew mesh and retargeting to that skeleton. Check the weights' licence |
| **UniMate** | Text-to-motion across arbitrary skeletons (quadrupeds, snakes, articulated objects). MIT code. Takes rigged GLB/glTF/FBX | The entities: Grout moving through seams, the Undertow, a Bloom folding. These don't fit a human skeleton | Needs a rigged mesh first; contacts aren't physically exact. Some research assets carry their own licences |
| **Möbius** | Motion captioning, text-to-motion, completion and instruction editing | Same role as Kimodo; compare outputs on the same crew actions | Licence unchecked |
| **TailorRig** dataset (Tencent) | 39,073 rigged humanoids with skinning weights | Reference for auto-rigging the crew | A dataset for training, not game assets. Check redistribution terms |
| **blender-kiln** (Claude Code plugin) | Description or photo → editable Blender model at real size, CC0 scan textures, GLB export with Draco/WebP | The architectural kit (pool ladders, drains, lifeguard chairs, pumps, lockers) and props, exported as GLB for 67js | Every model needs a pass against `ART_DIRECTION.md` and a draw-call and memory budget |
| **Blender MCP**, BlendRelay | An agent drives Blender | The same kit work, from a script | Needs a machine with Blender; not in this container |
| **TRELLIS.2**, **Hunyuan3D**, **TripoSR** | Image → textured 3D | Quick blockouts of props from concept images | Generated topology needs cleanup; check each model's licence for commercial use |
| **Quixel Megascans** | 23,000+ scanned materials and assets; the post says free and usable in any engine | Tile, grout, concrete and rust textures for the authored-texture gap | Read the current licence on Fab before use. Scans are large: budget texture memory per sector |
| **codepawl/abo-glb** | Amazon Berkeley Objects as GLB (from the 67js author's account) | A test corpus for glTF loading and the asset budget in 67js | Could not be opened from here. The upstream ABO licence may be non-commercial; use it for testing only until checked |
| **PartField** (NVIDIA) | Part segmentation of meshes | Splitting generated props into parts that can break or animate | NVIDIA licence limits it to non-commercial research and education. Not for shipped assets |
| **Sand3D** | 100K+ objects written as code (CAD, articulated mechanisms) | Parametric machinery (valves, pumps, winches) is close to how the game already builds geometry from code | Check the licence and the output format |
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
