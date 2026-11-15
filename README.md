# The Poolrooms: Hydrophobia
A first-person, psychological horror rail-shooter and exploration game. Strapped into an infinite waterslide raft, you are propelled through the endless, moist labyrinth of the Poolrooms—a watery sub-layer of the Backrooms.

Rendered with [67js](https://github.com/codepawl/67.js), a WebGL2 engine where a scene is plain data.

## Play

```sh
npm install
npm run dev       # http://localhost:5173
npm run build     # static site in dist/, host anywhere
npm run build:single  # dist/HYDROPHOBIA.html, one playable file
npm test          # unit tests, then the headless browser tests (see tests/README.md)
npm run test:unit     # pure modules only, no browser
npm run test:balance  # a competent-player bot rides all eight attractions (slow)
npm run typecheck
```

The game needs a browser with WebGL2. On a machine without a GPU it switches to a lighter render mode automatically; add `?quality=low` or `?quality=high` to the URL to choose yourself.

### Controls
| | Keyboard and mouse | Controller |
| --- | --- | --- |
| Steer (raft) / move (foot) | A / D · WASD | Left stick |
| Aim / look | Mouse | Right stick |
| Fire | Left click | Right trigger |
| Inspection beam | Q (right click on foot) | Y |
| Hop | Space | A |
| Brace behind the hull | Ctrl or C | B |
| Use / rescue | E | X |
| Disruption burst | F | LB |
| Boost / run | Shift | RB |
| Look back (raft) | Hold X | R3 |
| Brake (flumes, tubes) | S | — |
| Paddle (blaster down) · prod on foot | Hold V | L3 (toggle) |
| Find a leak, patch it, pump it up | Hold G | D-pad down |
| Blaster profile (Pulse, Repeater, Scatter, Disruptor, Hook) | 1–5, Tab, wheel | D-pad right |
| Focus / magnify (Disruptor: acquire a volley) | Hold right click | Left trigger |
| Shove | Z | Tap B |
| Ping / radio check | B or middle click | D-pad left |
| Recharge · dressing · Ride Control | R · H · T | D-pad up · Select · — |
| Holding pools | Shoot an arrow · Space depart · E moor | |
| Pause and settings | Esc | Start |

Every key can be rebound in Settings; paddle and brace can be toggles; steering sensitivity and camera motion are adjustable.

Touch: left half of the screen moves, right half aims or looks, with buttons for fire, scan, burst, use and boost. Aim assist snaps to targets near your finger.

## What the build does
- **Water you can read.** Pool and channel water refracts the floor and darkens with real depth. Shots, splashes, wading and paddle strokes send out several rings at once; the raft trails a wake; foam streaks ride the current and fast water throws up foam; caustics move on the floor of flooded pools and lit channels. Climbing out leaves a puddle and wet footprints that dry. Under water (capsized, overboard, held under) the world above shows only through a bright circle overhead.
- **Things that hunt by sense.** Blooms and the Lifeguard act on what they see and hear: they investigate a noise, chase, lose you, search where they last sensed you, and go back. Only so many may commit at once. The Undertow follows the raft's noise, circles after it strikes, and sinks away after three strikes.
- **Feedback that tells you what happened.** A hit shows as an arc on the side it came from; health stays off the screen until you are hurt; the reticle marks a weak point, a kill or a wasted shot; hits throw sparks, droplets and bubbles; the view dips and rolls on a spring when the raft is struck.
- **A picture that adapts.** Four quality tiers with an automatic mode that lowers the render scale, then thins mirrors, shadows, haze and particles before it drops a tier.

## Modes
- **Campaign 1, "Overflow":** choose Mars, Dez, Tubs or June, then ride eight attractions, from the Welcome Pools to the Rooftop Lagoon. Each is a branching ride ending at a holding pool with an optional dock: restore power, run a compressor, raise the pool, winch a gate, or fetch supplies.
- **Reference chapter, "The Closed Wave Pool":** one complete sequence held to the finished standard: arrival, a navigation choice, exploration with a visible purpose, a loud commitment, a return through the route you made, and a Safe Room that overlooks it.
- **Challenges:** Pump Defence, High Water, Last Departure, Shared Expedition. **Route builder:** write a ride as tokens, ride it, share it as a link.
- **Endless:** seeded attractions with rising threat and a score. Enter a seed on the menu or open `?seed=1234`; your best depth per seed is kept.
- **The facility remembers:** later expeditions meet the consequences of earlier ones (an extended corridor, water where you left it, a plaque crediting someone else, records that say the person you rescued was never there). Your field ledger, in the pause menu, keeps the true account.
- The game saves your exact position every few seconds; closing the tab and choosing **Resume** puts you back where you were. Safe Rooms are the checkpoints you return to after dying.

## Code
| File | What it does |
| --- | --- |
| `src/main.js` | Game flow: campaign, endless, intro, docks, Safe Rooms, death, ending, saving and resuming |
| `src/track.js` | The slide as data: channel types, holding pools with gated exits, branches |
| `src/plans.js` | Builds each sector's ride and fills it with encounters |
| `src/ride.js` | The raft: geometry along the track, targets, entities, the Passenger, gates, paddling, overboard |
| `src/hull.js` | Four air chambers: punctures and their causes, field patches, the compressor, marks that stay |
| `src/explore.js` | On foot: grid levels and each attraction's rules; where props stand (the dock dressing lines the wall, clear of the moored raft) |
| `src/blaster.js` | Pulse, inspection beam and disruption burst |
| `src/sectors.js` | The eight attractions: palettes, rides, maps, rules, voices, graffiti |
| `src/documents.js` | Found documents for the logbook |
| `src/crew.js` | The four Drainers, the roll call, and what survives a loop |
| `src/ai/director.js` | Pacing: relax, warning, build-up, peak, fade, recovery; a pressure budget that counts rescues and repairs |
| `src/saferoom.js` | The Safe Room scene behind its panel |
| `src/menuscene.js` | The main-menu corridor behind the title |
| `src/memory.js` | The facility's memory: expedition record, authored variations with validation, the field ledger |
| `src/debug/playlog.js` | Local playtest log and frame-time statistics |
| `src/ui.js` | Safe Room, workbench, route terminal, logbook, keypad, settings |
| `src/hud.js`, `src/hudcues.js`, `src/style.css` | The overlay; when health shows, which side a hit came from, which hit marker a shot earns |
| `src/audio/audio.js`, `src/audio/samples.js`, `src/audio/voicepool.js` | Stereo-panned sound: recorded files in `public/audio/`, synthesis as the fallback, a voice cap with priorities |
| `src/render/props.js`, `src/render/shapes.js` | 3D props as GLB models inlined into the build, each with a primitive stand-in; shared primitive shapes so identical parts draw as one instanced batch |
| `src/render/lanerope.js` | The Lane Rope: red and white disc floats on a steel cable between wall anchors |
| `src/render/waterlook.js`, `src/render/waterfx.js` | Water optics by depth and murk; rings, the raft's wake, current streaks, caustics, wet marks, the view from under water |
| `src/ai/` | Perception, the pursuit cycle (investigate, chase, search, return), attack slots, spawn scoring, the pacing director |
| `src/feel/` | Damped springs, controller vibration, aim help |
| `src/render/effectpool.js` | Sparks, droplets and bubbles from a fixed pool |
| `src/render/surfaces.js` | Generated surface textures (ceiling, floor tile, painted steel, PVC, wet concrete, clouds) |
| `src/input.js`, `src/settings.js`, `src/render/quality.js`, `src/labels.js`, `src/render/textures.js`, `src/math.js` | Input, options, render quality, sign textures, tile textures, maths |

The full module map, including the pure, unit-tested modules, is in [CLAUDE.md](CLAUDE.md) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

The first prototype (a single minified Three.js file) is kept at `public/legacy/combat-build-02.html` and is linked from the menu.

## Assets
- **3D props: 48 models.** 10 were generated for the game with Higgsfield image-to-3D (supply locker, pool ladder, gate valve, lifeguard tower, ring buoy, work lamp, blaster body, floor drain, starting block, rubber duck). 38 are CC0 models from [Poly Haven](https://polyhaven.com) (light fixtures, cabinets, extinguishers, tool cart and chest, crates, pipes, roller shutters, wet-floor signs, a security camera, a wheelchair and others). They dress the docks, rooms, pool decks and Safe Rooms; every one is placed with a primitive fallback, so a scene never waits on a model.
- **Sound:** recorded effects from the Oculus Audio Pack 01 (CC BY 4.0), with synthesis where there is no recording.
- **Textures:** generated surfaces and CC0 normal maps.
- Every shipped third-party or generated file is listed with its source and licence in [assets/registry.json](assets/registry.json); a unit test fails if one is missing. Credits are in [docs/CREDITS.md](docs/CREDITS.md), and the status of each item on the asset list is in [docs/ASSET_BACKLOG.md](docs/ASSET_BACKLOG.md).
- All of this is checked by headless tests (props load, stand where they should, stay clear of the moored raft, draw in under 150 batches on the raft and 125 on foot). None of it has been checked by human play or on real GPUs.

## Testing
- `npm test` runs the unit tests for the pure modules and then 22 headless browser test files that drive the game through its developer hooks (software rendering, no GPU).
- `npm run test:balance` sends a bot through all eight attractions. As last measured it reaches every dock with 33–50 health at its lowest and the raft at 75–100% ([docs/PRODUCTION.md](docs/PRODUCTION.md) has the table).
- These tests check state and rules, not feel. Nobody has played this build by hand, and it has not been run on a real GPU.

## Design
- [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md): concept, mechanics, architecture and what's built so far
- [docs/SYSTEMS_DESIGN.md](docs/SYSTEMS_DESIGN.md): how raft, water, exploration and Safe Rooms connect; roadmap
- [docs/WORLD_MEMORY.md](docs/WORLD_MEMORY.md): the facility remembers expeditions and reconstructs them wrongly; the field ledger
- [docs/PRODUCTION.md](docs/PRODUCTION.md): the quality standard, the reference chapter, measurement, accessibility, playtest protocol, and what is not built
- [docs/ART_DIRECTION.md](docs/ART_DIRECTION.md): palette, type, lighting, sectors, crew and entity look, interface, main menu
- [docs/STORY_AND_LORE.md](docs/STORY_AND_LORE.md): setting, characters, entities, endings and story decisions
- [docs/ASSET_BACKLOG.md](docs/ASSET_BACKLOG.md): every item on the asset list and its honest status
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): how the code fits together
