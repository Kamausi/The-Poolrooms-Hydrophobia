# UNDERFLOW — Game Design Overview

A first-person psychological horror rail-shooter and exploration game built for the web.

Strapped into an endless waterslide raft, you are carried through the Poolrooms, a waterlogged sub-layer of the Backrooms. You carry a high-frequency tracking blaster and shoot anomalous neon targets to change the slide's track, trigger machinery and fend off entities. The slide won't save you forever: to survive, you have to step off the raft into the unknown to scavenge for resources, solve surreal puzzles and find the Safe Rooms before the chlorine fumes, or the things in the water, catch up with you.

## Core gameplay

### The Raft (on-rails blaster)
Movement on the raft is smooth and automatic. You wield a neon-light tracking gun. Shooting hidden targets built into the architecture changes your slide path, opens shortcuts, starts ambient machinery or shocks entities that get too close.

### The Disembark (off-rails exploration)
At dry-docks or broken pipe junctions you can eject from the raft. The game switches to tense, free-roaming survival horror: wade through knee-deep water, collect system parts and escape entities in a non-linear layout.

### The Safe Room
Heavily reinforced, brightly lit chambers that act as hard checkpoints between pool sectors. Entering one:
- seals the bulkhead doors behind you
- fully resets your Drift (the sanity meter; see the story bible)
- lets you craft ammo and upgrades
- lets you pick your next waterslide route

## Key features
- **Rail-to-free-roam gameplay:** switch between fast shooting-gallery chaos and quiet, terrifying exploration on foot.
- **Interactive target geometry:** blacklight-responsive targets hidden across the tile walls. Hitting them unlocks secret slides, triggers animations or flashes bright light to blind stalker entities.
- **The Poolrooms look:** sterile white-and-blue tiled halls, buzzing recessed fluorescents, endless still warm water.
- **Procedural slide geometry:** WebGL chunk streaming generates endless waterslide pipelines and tile mazes, so every run plays differently.

## Target technical architecture

```
[ FRONTEND / RENDERING ]   Three.js (WebGL 2)
                           - post-processing (CRT / VHS filters)
                           - blacklight & neon emissive shaders
            |
[ ENGINE CORE ]            Rust or C++ compiled to WASM
                           - track splines, physics, entity AI
                           - chunk streaming, spatial partitioning
            |
[ CONTENT PIPELINE ]       Blender / CAD -> glTF / GLB
                           - low-poly tile meshes, modular pipes
                           - baked ambient occlusion
```

- **Rendering:** Three.js on WebGL 2 for the porcelain corridors, water ripples and neon emissive target materials, all in one canvas.
- **Core systems:** Rust (Cargo) or C++ compiled to WebAssembly for water physics, raft splines, collision and entity AI state machines at 60 fps.
- **UI:** TypeScript/React layered over the WebGL canvas for score, blaster calibration and inventory.
- **Assets:** low-poly modular tiles, spiral slides and anomalous geometry built in Blender, with baked AO, shipped as `.gltf`/`.glb`.

## Current build vs. target

The playable prototype (`index.html`, "Combat Build 02") is a single self-contained file: Three.js and the game code are bundled inline, with no WASM core and no external glTF assets yet. Geometry is built in code. Implemented so far:
- three sectors in order: **The Yellow Channel** (12 m), **The Blue Reservoir** (28 m), **The Last Drain** (46 m)
- each sector loops raft ride → maintenance dock → on-foot exploration (WASD + mouse look) → find the power cell → enter the green saferoom
- Arc Blaster Mk.II: hold-to-fire, 24-round charge, `R` to recharge
- red entities to destroy and green signals that restore health; score, vitals and speed HUD
- safe room checkpoint saved to local storage; ending screen after the third sector
- dodge (`A`/`D`), boost (`Shift`), exit raft / interact (`E`), pause, sound toggle and touch controls

Not yet built: the entity roster and Drift system from the story bible, crafting and route choice in Safe Rooms, track branching from target hits, co-op, procedural chunk streaming, the WASM core and the glTF pipeline.

## Story

See [STORY_AND_LORE.md](STORY_AND_LORE.md) for the setting, the Drainer crew, the entities, Safe Rooms and the campaign.

## Inspirations
- **Left 4 Dead:** the on-foot exploration and Safe Room structure (four-person crew, special entities with counters, pacing director, sealed safe rooms).
- **Six Flags' Boo Blasters on Boo Hill:** the rail-shooter feel (a ride vehicle, targets built into the set, a running score).

## References
- Boo Blasters on Boo Hill (dark-ride shooter): https://www.sixflags.com/canadaswonderland/attractions/boo-blasters-on-boo-hill
- Backrooms Cycle (Steam): https://store.steampowered.com/app/2294280/Backrooms_Cycle/
- Backrooms (Steam): https://store.steampowered.com/app/5496060/Backrooms/
- dirien/backrooms (web Backrooms project): https://github.com/dirien/backrooms
- r/threejs procedural Backrooms game: https://www.reddit.com/r/threejs/comments/1sm0hhx/backrooms_inspired_procedural_game/
- r/poolrooms reference imagery: https://www.reddit.com/r/poolrooms/comments/1vj6dep/this_is_what_the_pool_rooms_really_look_like/
