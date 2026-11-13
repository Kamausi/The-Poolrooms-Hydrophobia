# UNDERFLOW asset backlog

This is the production asset list, with what exists today next to each entry. Anything that defines UNDERFLOW stays custom. Commodity assets come from CC0 and similarly permissive libraries and are reworked to fit. Every shipped third-party or generated file is listed in `assets/registry.json` and credited in `docs/CREDITS.md`.

Priority: **P0** is required for the Closed Wave Pool reference chapter, **P1** for Campaign 1, and **P2** is polish, variety and replayability. Source: **CUSTOM** is made for UNDERFLOW; **SOURCE** is a free or open asset we modify.

Status words used below:

- **Model**: a mesh file ships and `tests/models.cjs` checks that it loads and is placed. Generated models come from Higgsfield (a generated reference image turned into a mesh). CC0 models come from Poly Haven.
- **Generated texture**: a Higgsfield image used as a surface (`src/surfaces.js`).
- **Procedural**: drawn or computed in code at run time.
- **Primitive**: built in code from boxes, cylinders, spheres and tori. It works and is tested, but it is a stand-in for a real asset.
- **Recorded**: an audio file from the Oculus Audio Pack (CC BY 4.0). **Synth**: sound synthesised in `src/audio.js`.
- **Not built**: nothing yet.

Nothing here has been checked by human play or on target GPUs. Generated models are made with Tripo 3D H3.1 at a game triangle count (about 4,000 to 20,000) with PBR maps, and their geometry is used as generated: earlier SAM 3D meshes and heavily simplified ones were replaced because they looked rough. "Model" means it loads and stands in place in a headless browser.

## Reachable sources

From this environment: Poly Haven (models and textures, CC0), ambientCG (materials, CC0), Kenney (kenney.nl, CC0), GitHub, and Higgsfield (generation on the account's credits). Quaternius, OpenGameArt and Freesound are blocked by the network policy. Higgsfield's SAM 3D converter (1 credit) works for solid objects and fails on open frames (the lifeguard chair twice, a sun lounger once). Tripo (9 credits) handled the open-frame chair. Its output is about 1.4 million triangles, simplified with gltfpack to about 8,000.

## 1. Poolrooms architectural kit

| Asset | P | Source | Now |
|---|---|---|---|
| Ivory / cream / blue / teal / dark tile sets, grout | P0–P1 | SOURCE | Procedural tile per sector (`tileTexture`), CC0 normal map; generated aqua floor tile and painted cloud tile |
| Wet tile, mineral stain, hairline cracks | P0–P1 | procedural | Wet band and stains in the post grade from depth; tile stain in `tileTexture`; no cracks |
| Missing / broken tile decals | P1 | SOURCE/custom | Not built |
| Walls, floors, ceilings | P0 | CUSTOM | Primitive slabs on the cell grid with tile materials; generated stained ceiling tile |
| Round columns, nested arches | P0 | CUSTOM | Primitive (`src/poolrooms.js` placement, tested) |
| Square columns, curved walls, curved pool edges, circular tunnels | P1 | CUSTOM | Circular tunnels on the raft route are primitive; the rest not built |
| Stairs, ramps, ledges, raised galleries | P0 | CUSTOM | Primitive (gallery with parapet and rail; ramps on the raft route) |
| Balconies, bridges, impossible transitions, voids, Main Drain | P1–P2 | CUSTOM | Not built |

## 2. Pool components

| Asset | P | Now |
|---|---|---|
| Pool ladders | P0 | **Model** (generated, at the basin edge) |
| Drains, grates, overflow channels, skimmers, coping, handrails | P0 | Drains and overflow grates **Model** (generated); gallery rail primitive in brushed stainless; skimmers and coping not built. A generated skimmer lid was tried and rejected: its flange came out warped |
| Lane anchors, depth markers, starting platforms | P0 | Depth markers: procedural deck markings (1.2 M, NO DIVING) along the pool edges plus wall signs; starting blocks **Model** (generated, a row of three at one straight pool edge); a skimmer reference is made but not converted; lane anchors not built |
| Wave basin, filtration outlets, pump intakes, emergency shutoffs | P0 | Primitive (the Closed Wave Pool basin, outlet, pump control panel) |
| Diving boards, showers, foot-wash, cubicles, hooks, benches | P1 | Bench: **Model** (CC0); a vest hook vignette is primitive; the rest not built |
| Jacuzzi, splash pad, cannons, fountains, level rulers | P1 | Not built |
| Children's pool structures, mascots | P2 | The cloud-painted room only |

## 3. Water-slide kit (CUSTOM)

All P0–P2 pieces: **Primitive / procedural**. The raft rides a track built from data (`src/track.js`, `src/plans.js`) as channels, drops, ramps, branches and tubes. No dedicated flume, bowl, transparent tube or support meshes yet. This is the largest custom gap after the characters.

## 4. Raft (CUSTOM P0)

Four-chamber logic (bow, stern, left, right), punctures, patching, list, sag and squash all exist in code (`src/hull.js`, `src/ride.js`) and are tested. The mesh is **primitive** (tori and slabs). No modelled raft, no blend shapes, no modelled equipment (paddles, hook and compressor are primitive or HUD only).

## 5–7. Crew characters, first-person body, animation

| Asset | Now |
|---|---|
| Mars, Dez, Tubs, June: body, head, hair, clothing, vest, gear | **Primitive** figures (`src/crewfigure.js`): seated, walking, Safe Room poses; colour identity per crew member |
| Wet / soaked / injured / Drift variants | Drift and wetness are screen effects and HUD; no figure variants |
| LODs | Not built |
| First-person hands, gloves, sleeves, vest edge | **Primitive** hand and glove with Drift swelling (`src/blaster.js`) |
| Animation library (locomotion, raft, combat, interaction, horror) | **Procedural** poses and springs in code; no skeletal animation, no retargeted clips |

These need real modelling, rigging and animation, which Higgsfield's image-to-mesh cannot provide (it makes static, unrigged meshes; its rigging model takes a finished mesh). Candidates for the commodity part: retargeted CC0 animation sets once a rig exists.

## 8–15. Entities

| Entity | Now |
|---|---|
| Lifeguard | **Primitive** figure with uniform colours, glasses, whistle cord, clipboard, inspection lamp, sitting on a **Model** lifeguard chair; behaviour (rules, ladder inspection, hunt) is coded and tested |
| Blooms | **Primitive** chambered bodies with inflation and collapse in code |
| Undertow | Procedural ripple, pull and bubbles; no mesh |
| Marco | Uses crew figures and borrowed gestures (coded) |
| Grout | Screen and sound effects; no seam decals |
| Lane Rope | Not built as an asset |
| Floaters / survivors | **Primitive** |
| Ballast | **Primitive** |

## 16. Maintenance environment kit (SOURCE)

| Asset | Now |
|---|---|
| Valves | **Model** (generated gate valve, pump valves A–C) |
| Electrical cabinet, junction box | **Model** (CC0: utility box beside the service panel, power box above) |
| Lockers | **Model** (generated: supply lockers, locker 0417, Safe Room) |
| Tool chest, tool cart, shelving | **Model** (CC0: maintenance platform landing; Safe Room) |
| Fire extinguisher, bins | **Model** (CC0: every landing) |
| Wet-floor signs, cleaning supplies, clutter | **Model** (CC0: wet-floor signs on the pool deck; wall clock and security camera at the service panel; stool, broom, chemical jug, drain cleaner, toolbox, generator and a caged hanging lamp at a maintenance platform; megaphone, bin bags, cardboard boxes and a searchlight at other landings; an empty wheelchair at the pool edge). Dock dressing lines the side wall, clear of the moored raft |
| Pipes, pumps, compressors, tanks, catwalks, ducts, generators, crates, pallets | Primitive or not built. Pipe sections and plastic crates: **Model** (CC0: spare pipe sections at a maintenance platform, equipment crates at other landings) |

## 17. Safe Room kit

Kettle, rack, tool chest, two chairs, two lockers, extinguisher, wall lamp, radio, first aid kit, raft pump, jerrycan, wall clock, stool, bleach and cleaner bottles, cardboard box, bin bag, toolbox: **Model** (CC0 and generated). Pump housings, workbench, cot, mugs, towels, terminal: primitive. The Safe Room camera faces the glass, so props on the back wall are out of view; the newer ones stand where it looks. Bedding, drying rack, maps, charger: not built.

## 18. Doors and barriers

The tiled service door (handle, crack, keyhole, hold shut, forced), shelter doors, gates and the winch gate are **primitive** with coded states. No modelled doors, hatches or shutters. The fake shelters are closed roller shutters: **Model** (CC0, Poly Haven).

## 19. Children's aquatic area

Cloud mural: **generated texture**. Rubber ducks: **Model** (generated). The rest: not built.

## 20. Facility signage

Normal and wrong signs are **procedural** text materials (`src/labels.js`, `src/driftsign.js`). Wrong signs at high Drift, headcount and locker 0417 signs exist. No illustrated sign art.

## 21–22. Collectibles and power-ups

Ducks: **Model**. Wristbands, tokens, cards, photos, notes, cells, canisters, patch kits, dressings, filters, Dry Pack and the rest: **primitive** shapes with authored text (`src/collectibles.js`).

## 23–24. Blaster and work lamp (CUSTOM P0)

The blaster body is a **Model** (generated with Tripo from a GPT Image reference: orange-and-grey maintenance tool, green charge window, cable spool), moved by the same springs. The primitive charge window and inspection lens sit on its flanks so heat, charge and scanning still read. The five profiles share one body: no per-profile attachments yet. The work lamp is a **Model** when set down. Behaviour is unchanged: five profiles, charge and heat, Hook cable, springs; the lamp's white and UV modes, battery, set-down and recharge.

## 25. VFX

Splashes, wake, sparks, shot lights, beam, muzzle flash, bubbles, Undertow ripple, fog and haze, flicker, light dropout, UV reveal, chromatic aberration, wet lens, light shafts: **procedural** (parts, post passes in `src/postchain.js`). No particle sprites or flipbooks.

## 26. Water

Per-sector water colour, ripple, refraction trial, haze and underwater grade: **procedural**. The separate states (stagnant, filtration, turbulent, UV-reactive, Main Drain) and caustics, foam and flow maps are not built as distinct materials.

## 27. Lighting assets

Ceiling fixtures: **Model** (CC0 mounted fluorescent lights; the lit tube, flicker and dead lamps are coded). Wall lamps: **Model** (CC0) over the valves and in the Safe Room. Emergency lights, EXIT lights and UV fixtures: emissive primitives.

## 28–31. Audio and music

| Category | Now |
|---|---|
| Environment: water lap, underwater, bubbles, pump hum, machine room, vent, hydraulic, valve, levers, hatches, gears, chains, scrapes, tile and metal footsteps | **Recorded** |
| Fluorescent buzz, splashes, wading, doors, gates, raft rubber | **Synth** |
| Horror: whispers, stings, drone, distant creatures | **Recorded**; whistle, breath, radio, wrong-PA **synth** |
| Entity sound grammar (Bloom, Undertow, Lifeguard, Marco, Grout) | Mixed recorded and synth per entity |
| Crew and Attendant voices | Text captions only; no voice recordings |
| Music | Adaptive synth layers driven by the director; no composed stems |

## 32–33. UI art and diegetic interfaces

The HUD, reticle family, profile labels, raft chamber schematic, crew status, Drift indicator, debrief and grade screen, survey map, journal and Safe Room sheets are **procedural** HTML/CSS. Controller glyphs are text. Diegetic panels (service panel, pump control, gauges as text, occupancy counters) are primitive with text materials.

## 34. Decals

Not built as a decal system. Stains and wet bands come from the procedural tile and the post grade.

## 35. Reflections

The Marco reflection and Drift effects are coded. There are no reflection-specific meshes or mirror materials.

## 36. Closed Wave Pool P0 package (40 items)

| # | Item | Now |
|---|---|---|
| 1 | Ivory square-tile PBR | Procedural + CC0 normal map |
| 2 | Brushed stainless PBR | Factor material with an anisotropic lobe (rails, gallery rails, ladder fallbacks); no texture |
| 3 | Rubber / PVC | Generated PVC seam detail map on the raft hulls (keeps the raft's colour) |
| 4 | Painted metal PBR | Generated texture |
| 5 | Wet concrete | Generated texture on the landing slab where you dock |
| 6 | Frosted / wired glass | Transmissive glass (transmission, IOR 1.52, faint green absorption) in the observation windows; no wire pattern |
| 7 | Fluorescent fixtures | **Model** (CC0) |
| 8 | Pool ladders | **Model** (generated) |
| 9 | Handrails | Primitive |
| 10 | Drains / grates | **Model** (generated): the shower drain, main drains in the basin floor, overflow grates along every deck edge |
| 11 | Pipes / valves / pumps | Valves **Model**; pipes and pumps primitive |
| 12 | Electrical cabinet | **Model** (CC0) |
| 13 | Lockers | **Model** (generated) |
| 14 | Changing-room benches | **Model** (CC0) |
| 15 | Lifeguard chair | **Model** (generated with Tripo after SAM 3D failed twice) |
| 16 | Rescue equipment | Extinguisher and ring buoys **Model**; rescue hooks not built |
| 17 | Four crew models | Primitive |
| 18 | Lifeguard model | Primitive |
| 19 | Bloom model | Primitive |
| 20 | Raft with independent chambers | Primitive (chambers are logic) |
| 21 | Blaster | **Model** (generated body); charge window, lens and hand are primitive |
| 22 | Work lamp | **Model** (generated) when set down |
| 23–25 | Animation sets | Procedural poses; no clips |
| 26 | Pool / water ambience | Recorded |
| 27 | Tile footsteps | Recorded |
| 28 | Wet footsteps | Synth |
| 29 | Machinery / pump loops | Recorded |
| 30 | Doors / lockers / valves / hydraulics | Recorded + synth |
| 31 | Lifeguard whistle / chair / lamp | Synth |
| 32 | Bloom breathing / inflation | Recorded + synth |
| 33 | Undertow water | Recorded + synth |
| 34 | Fluorescent buzz | Synth |
| 35 | Stingers and drones | Recorded |
| 36 | Water VFX | Procedural |
| 37 | Electrical / spark VFX | Procedural |
| 38 | Wetness / mineral / stain decals | Not built |
| 39 | Facility signage | Procedural text |
| 40 | Wristband / token / photo / record collectibles | Primitive |

## Next, in order

1. Skimmer lid (a second attempt, from a cleaner reference image) and lane anchors.
2. ambientCG's downloads come from a host the network policy blocks; Poly Haven has no brushed-steel or rubber set, so those stay factor materials.
3. More Higgsfield image-to-mesh for rigid custom props: per-profile blaster attachments, a pump housing, rescue hooks, collectibles (wristband, token, photo).
4. The custom families (raft, blaster, work lamp, crew, Lifeguard, Blooms, slide kit) need a modelling and rigging pipeline outside this environment. The game is ready to load them: `src/props.js` takes any GLB, and the importer supports skinning and animation clips.
