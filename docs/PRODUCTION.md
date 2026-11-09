# UNDERFLOW · Production standard

The goal: a focused cooperative campaign held to AAA presentation, responsiveness and production quality. The method: one fully finished **reference chapter** that sets the bar for everything else, measured standards, and a process that reproduces the result.

This document separates what the build does now from what still needs people, assets and hardware. "Built" means implemented and exercised by an automated headless test. Nothing here has been verified by human play or on target GPUs.

## The reference chapter: The Closed Wave Pool (implemented, awaiting quality validation)

Menu → REFERENCE CHAPTER. Target playtime 12–18 minutes (an evaluation target, not an estimate). Files: `src/sectors.js` (REFERENCE_CHAPTER), `src/plans.js` (wavepool, diverter, divert dock), `src/ride.js`, `src/explore.js`, `src/main.js`, `src/saferoom.js`.

1. **Arrival:** a deserted wave pool. The display reads `WAVES BEGIN IN 00:00`; the water is still; below the surface, a lit exit sign.
2. **Navigation choice:** a diverter relay on the left wall. Shoot it and the current bends toward the maintenance landing (equipment crates: patch kits and a cell); leave it and take the plain dock.
3. **Exploration with a visible purpose:** find the pressure key; the wave generator's pressure is what keeps the exit underwater. A side basin holds a Floater who may be a survivor (a detour). The crew walks your trail behind you.
4. **Commitment:** at the generator the crew decides where the pressure goes, then holds it for six loud seconds while the swarm comes. The Undertow lives in the pool.
5. **A transformed return:** the raft rides out through the result: either the exposed exit (shallow, supplies on the ledges) or the waves finally starting (rough, deep, things in it).
6. **Relief:** the Safe Room overlooks the pool. If you drained it, the lit exit sign stands in an empty basin. On the wall, a maintenance photograph of the room taken from beneath its floor. Then the expedition record.

Verified headlessly end to end: arrival, diverter, landing bonus, docking sequence, followers on foot, the generator choice, the rewritten exit, bay, Safe Room, ending text, no page errors.

## Rafting and exploration change each other (built)

- Shooting a diverter on the raft changes where you land and what you start the dock with.
- At water-control and divert machines, the crew chooses what the water does next (raise/flood or drain/expose). The service exit is rewritten from that choice when you board: a flooded outlet (overflow, wake, Undertow) or an exposed one (shallow, caches). Stored per sector as `state.routeMod`.

## Eight quality standards

| Area | Standard | Evidence needed | Status |
|---|---|---|---|
| Player feel | Aiming, firing, steering, bracing, wading and docking feel precise and consistent | New players control it with either input and understand their mistakes | Systems built (profiles, focus, shove, brace, docking sequence, trajectory foam, rebinding); **feel unverified by people** |
| World design | Memorable spaces, believable construction, deliberate impossibilities | Players navigate by landmarks | Palette, tile kit, waterline bands, signage system; architectural kit is primitives, **not finished art** |
| Characters and creatures | Complete models, animation, reactions, voice | Convincing in chaos | One procedural crew figure (headwear silhouettes, arms, legs, a stride from real movement) seated, walking and in the Safe Room; folded Blooms with strands; a climber that hauls itself aboard (all procedural). **No authored skeletal animation, finished models or voice yet** |
| Cooperation | Players and AI reliably help, travel, fight, finish objectives | Works with 1 human + 3 bots, mixed, 4 humans | AI crew covers, revives (abstracted), follows your trail, rides with you. **No online play** |
| Campaign design | Distinct objectives, route choices, escalation, payoffs | Players distinguish sectors by what they did | Eight sectors + reference chapter, dock kinds, route consequences |
| Sound and presentation | Water, architecture, machinery, voices, music, UI as one identity | Players understand events without prompts | Synthesised audio language, per-space reverb, ducking under warnings; **no recorded audio or voice** |
| Technical reliability | Stable frame delivery, controlled loading, dependable saves, consistent state | Measurements on representative hardware | Frame-time overlay, 30 FPS profile, graphics-reset recovery, periodic position resume. **No hardware measurements yet; resume not interruption-tested around pickups, docking, machinery or incapacitation** |
| Usability | Onboarding, full controller support, settings, accessibility, recovery from interruptions | Someone new can start, learn, leave and resume unaided | First-time tips, keyboard and controller rebinding, controller menu navigation, toggles, text size, damage assist, high contrast, camera motion, captions, resume. **Controller support is implemented but untested with a physical controller** |

## Feel systems in this pass (built)

- **Docking:** the line goes over the post, the raft settles, you stand and step out; the raft's distance stays on the HUD and the thread leads back to it.
- **Water as one system:** when a pump reverses or a diverter swings, the surface ripples, foam and floating debris change direction, the raft starts pulling, the sound shifts and the crew braces, in the same moment.
- **Crew presence:** they lean into turns, jolt on impacts, brace with you and when the water turns. On foot they walk your own trail (never a route you couldn't take), cover you, kneel beside you when you are down, and are at the raft when you board.
- **First-person hand:** a work glove and wet cuff; Drift shows there first (the glove swells and pales, the cuff rides up). Aim is never affected.
- **A finished Bloom performance:** rest (slow breathing far off), notice (an intake as it turns toward you), approach, warning (swell, coral heart brightening), commitment (a lunge in the last few metres), localized reaction (stagger, sac rupture), interruption (a shove makes it back off before it comes again), defeat (collapses into folds) and retreat (sinks).
- **Shot readback:** muzzle, beam, a spark in the profile's colour where it landed, the target's reaction, and the world's response (relays arc, ropes drop, currents turn).
- **Raft readability:** a faint foam line ahead shows where momentum, current and a soft chamber are taking you, only when something is moving you.
- **Room acoustics:** tiled corridors ring, halls and reservoirs are long, tubes are dull, the Safe Room is dry.

## Presentation pass, checked by staged captures

Each part of the game was captured headlessly at 1280×720 (high quality, software rendering). The weakest things on screen were fixed one at a time and captured again:

| Found | Changed |
|---|---|
| Up to four text layers stacked in the middle of the frame; a 13-item control list always on screen | Prompts below the reticle, announcements in the upper third, speech and captions at the bottom; the controls fade after a few seconds |
| The tool in hand was a glossy, heavily rounded blob with a pale ball and an orange sleeve | A built maintenance tool and a gloved hand (see `ART_DIRECTION.md`) |
| The crew were a cylinder, a slab and a ball; on foot they slid without legs; the Safe Room said they were there and it was empty | One crew figure with headwear, arms and legs, used seated, walking and in the Safe Room |
| Blooms were a smooth ball with a bar through it; the climber was an upright white cylinder with a spinning ball | Folded faceted masses with strands; a climber that hauls itself over the tube |
| A gate marker bloomed into a glowing egg beside the raft; signal targets were 1.1 m hoops floating in the air | Channel buoys with a lamp; lit rings on wall plates (hit areas unchanged) |
| The foam line ahead read as road markings; the guide thread on foot ran into the lens | Fainter foam flecks further ahead; the thread stops short of your feet |
| Subtitles landed mid-screen on short landscape screens | Short-screen layout |
| Figures in the water were a white cylinder and a ball | The shared figure, face down in a vest with arms spread |
| Raft straps stood up from the tube as black square loops | Flat bands wrapped around the tube |

The DEV `step()` hook now also advances the Safe Room and the menu, so captures show what a player sees. These are software renders of single frames. Motion, GPU rendering and how any of it feels to a person are still unchecked.

## Balance, measured with a competent-player bot

A DEV-only bot (`window.__ride.bot = true`) stands in for a competent player: it aims at the nearest Bloom, fires, patches when nothing is close, swims back after going overboard, leans away from climbers and shoves them off, keeps a line taut, shoots Ballast's anchors and core, and uses dressings when hurt. It does not brace, look back or dodge on purpose. Each attraction is ridden from a fresh, full-health crew to the dock.

| Measurement | Before tuning | After |
|---|---|---|
| Attractions reached at the dock | 5 of 8 (deaths: overboard in the first channel of the Welcome Pools, Ballast, Blooms from behind) | 8 of 8 |
| Lowest health on the way | 1–18 | 33–62, except Filtration Works (1) |
| Raft at the dock | 67–94% | 66–94% |

Tuning that got there:
- No climbers or crewmate grabs in the first attraction; a climber only takes you overboard if that side is already soft.
- The crew's covering fire takes what is chasing the raft first.
- Rear Bloom hits do 7 damage (was 12) and front hits 10 (was 12).
- Ballast surges for 8 (was 12) and lets go after 75 s (was 110); Ride Control steers out of its lane before it surges.
- The crew patches a long-running leak in the quiet, with a kit.

Filtration Works stays the hardest. A bot is not a person: this replaces guessing, not playtesting.

## Resume, interruption-tested

Verified by automated test:

| Interrupted | After resume |
|---|---|
| Mid-docking | Back in the holding pool |
| Mid-machine | Still carrying the item; the hold completes |
| Incapacitated | Still down; the crew revives you |
| After pickups on foot | Nothing is handed out twice (parts, lockers, containers, caches, valve progress, the June event) |
| On the raft | Nothing behind the resume point fires |

Two fixes came out of it:
- A fall always incapacitates first, even while you sit in the water.
- A survived fatal hit can no longer turn the next fall into instant death.

## Performance targets and measurement

- Primary tier: stable 60 FPS (16.7 ms). Constrained tier: a deliberate 30 FPS profile (33.3 ms), selectable in Settings.
- Measure the slow tail, not averages: the overlay (Settings → Performance overlay) shows average, 95th and 99th percentile frame time, the count of frames over 1.5× budget, and JS heap where the browser reports it. The playtest log stores a sample every minute.
- Reliability: the scene saves its position every ~3 seconds; pausing, quitting, hiding the tab and a graphics-device reset each capture the position immediately before saving, then offer a reload-and-resume. Resume rebuilds the scene from a limited set of values (raft distance and departed pools, or position, facing and whether you carry the item). It is a periodic position resume, not an exact restoration of everything in flight.
- **Measured: CPU simulation cost per frame**, with rendering excluded, on the build machine's CPU:

  | Attraction | Raft median / p95 | On foot median / p95 |
  |---|---|---|
  | Welcome Pools | 1.10 / 1.90 ms | 0.14 / 0.31 ms |
  | Wave Hall | 1.15 / 1.73 ms | 0.20 / 0.50 ms |
  | Filtration Works | 1.17 / 2.08 ms | 0.10 / 0.36 ms |
  | Rooftop Lagoon | 1.13 / 1.73 ms | 0.11 / 0.47 ms |

  That is under 15% of a 16.7 ms frame even on a CPU several times slower. Profiling shows the cost concentrated in the raft's per-frame update (geometry placement along the track, entity updates), with no single hot spot worth optimizing yet.
- **Not yet measured:** GPU cost on representative hardware. Headless software rendering (the only thing available to automated tests here) says nothing about a GPU or phone.
- Engine: 67js `@codepawlhq/67js@0.16.0` (package.json). Its documented glTF skeletal animation, morph targets, animation layers and IK are the route to finished characters; none is used yet because there are no character assets. Evaluate them with a representative scene (animated crew, enemies, water, lights, effects, sound, UI) before any engine decision. Engine or language changes should answer a measured bottleneck.
- Budgets to track separately as content arrives: program code, downloaded assets, assets in memory, GPU memory, CPU simulation, rendering, network.

## Accessibility (built, review against the Xbox Accessibility Guidelines)

Full rebinding; hold/toggle for paddle and brace; look and steering sensitivity; camera motion slider; text size; high contrast; incoming-damage assist; captions for every warning (and warnings that read without music); shapes and words alongside colour in crew status; first-time tips (can be turned off); gameplay controller mapping with rebindable buttons; menus, pause, settings and Safe Rooms navigable by controller (D-pad or stick, A to choose, B to go back, left/right on sliders); pause, resume and graphics-reset recovery. Not yet verified on physical controllers.

## Playtesting protocol

Designs are hypotheses; playtests are experiments. Observe unfamiliar players finishing the reference chapter without coaching. Record where they lose their bearings, which warnings they understand, when steering and shooting compete, whether they notice a teammate in trouble, which supplies they value, whether quiet passages hold them, whether they understand how their actions changed the water, and what they remember.

The game keeps a local **playtest log** (pause → COPY PLAYTEST LOG): deaths and causes, damage by source, rescues made and missed, routes taken, time per sector, and frame-time samples. Nothing is sent anywhere. Automated checks (headless) cover state integrity; human sessions cover aim, readability, tension, comfort and cooperation.

## Production standards to agree

World scale and proportions (channel half-width 1.9–9 m, tile 0.25 m, eye height 1.35 m seated / 1.65 m standing); material and texture density; lighting and exposure per sector (see ART_DIRECTION.md); character skeletons and transitions; collision and interaction placement; enemy warnings (presence → commitment → resolution, each with a sound and a caption); combat feedback (fired → travel → struck → effect → next action); sound levels and dialogue priority (rescue > attack commitment > objective change > discovery > banter/music); asset naming, import validation, performance budgets.

## Ownership

Each area needs a named quality owner, even when one person covers several: gameplay/movement/combat/AI; cooperative and online systems; environment art and lighting; character art and animation; technical art and tools; sound, music and performance direction; interface and accessibility; QA and production.

## Not built, and why

- **Finished art:** skinned, animated crew and creatures, a modelled architectural kit, authored textures. Needs artists and assets; the code is ready to host them (67js glTF).
- **Recorded sound and voice performances.** Needs a sound team and actors; the game uses synthesised audio and text.
- **Online four-player play** and its state agreement (who has the cell, who sees the grab, pilot handoff on disconnect). Needs a server and netcode; the single-player AI crew stands in.
- **Water refraction in the channels, surface foam simulation, condensation.** 67js's `liquid` material refracts and is used once (the wave pool's exit); it is not used for channel water, where its cost and look are unmeasured.
- **Human playtests and hardware measurements.** Need people and devices; the log and overlay are there for them.
