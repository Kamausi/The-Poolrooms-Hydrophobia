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

## Technical architecture

```
[ RENDERING ]   67js (WebGL2), github.com/codepawl/67.js
                - scene = plain list of parts: geometry + matrix + material
                - box-mapped tile textures, `water` material tag, point lights,
                  HDR bloom, fog, vignette and grain
            |
[ GAME ]        plain ES modules (src/), bundled by Vite
                - main.js: game flow and state; ride.js / explore.js: scenes
                - state is a plain object, separate from rendering
            |
[ CONTENT ]     procedural for now: tile textures drawn on a canvas,
                levels as ASCII grids in sectors.js, synthesized audio
                - later: Blender -> GLB through 67js/addons/gltf
```

- **Rendering: 67js.** A 67js scene is a list of parts, each with a geometry, a column-major matrix and a PBR material. A renderer keeps the part list it was built with, so the game builds a fixed pool of parts per scene (channel segments, Blooms, Signals and so on), moves them with `updateParts`, and hides unused ones by collapsing them out of view. The ride recycles 26 channel segments ahead of the camera, so a slide of any length uses the same parts.
- **Why 67js instead of Three.js:** scenes are plain data, which suits procedural geometry and tooling; it has a water shader, HDR bloom and up to 16 point lights per frame built in; and its MCP server lets an agent build and preview scenes, which we can use later for level blockouts and trailer renders. The production bundle is 264 KB, half the size of the old single-file Three.js build.
- **Quality:** if the browser reports a software renderer (no GPU), the game uses 67js's `light` shading, a lower resolution, four lamps and no bloom. `?quality=low` or `?quality=high` in the URL overrides this.
- **Still planned:** Rust/WASM for physics and AI if JavaScript becomes the bottleneck; GLB models from Blender via `67js/addons/gltf`; online co-op with one player hosting the simulation.

## Current build

The game runs on 67js (`index.html` + `src/`). The old Three.js prototype is kept at `public/legacy/combat-build-02.html` and linked from the menu.

**Campaign 1, "Overflow":** three sectors (The Yellow Channel 12 m, The Blue Reservoir 28 m, The Last Drain 46 m). Each one is raft → dock → on foot → Safe Room.

**On the raft**
- an endless, gently curving tiled channel with flickering lamps
- aim with the cursor; hold click to fire; `R` recharge; `A`/`D` dodge; `Shift` boost
- **Blooms** drift at you and burst on contact; **Signals** heal and lower Drift
- **Lane Ropes** cross the channel: pop all five floats or take damage
- **Undertow** patches of still water: shoot them before you pass, or the raft is held and Blooms swarm
- **the Lifeguard** (sectors 2 and 3): shoot the lamp on its chair before you pass, or it whistles and calls Blooms
- a blue **drain valve** on the wall: three hits drain a key stretch of the level you'll walk at the dock; miss it and that stretch stays flooded

**On foot**
- a hand-built grid level per sector with dry walkways and knee-deep pools (slower, more Drift)
- find the power cell, then bring it to the Safe Room door; pick up scrap parts on the way
- Blooms roam toward you, and "rush hour" waves arrive on a timer
- the Undertow follows you through the water and holds you until you shoot it
- the Lifeguard spots you if you stand in the water near its tower
- chlorine fumes start after two minutes and slowly hurt you

**Systems**
- **Drift** rises in warm water and from Marco's calls; it fades the decorative HUD (vitals, charge and prompts stay readable), washes out the picture and makes the Attendant talk to you. At 100 you sit down in the water and take damage until you snap out of it (Space or fire).
- **Safe Rooms:** full heal and Drift reset, graffiti from earlier crews, a workbench (three blaster upgrades paid for with scrap), a dispatch board (Lazy River or Rapids for the next sector), a saved checkpoint, and a terminal whose guest count keeps rising
- the Attendant's PA, crew radio (Dez, Tubs, June, Mars) and Marco as subtitles; all sound is synthesized
- the ending is "The Loop" from the story bible

**Not built yet:** AI crewmates and online co-op, Marco/Grout/Floater as physical entities, Lost & Found items, track branching from target hits, Campaigns 2 to 4 and the other two endings, Drift showing on the player's hands, GLB models.

## Systems

See [SYSTEMS_DESIGN.md](SYSTEMS_DESIGN.md): the park as one machine, raft features, blaster functions, target language, optional docks, water puzzles, sector themes, entity rules and the roadmap.

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
