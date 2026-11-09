# Underflow
A first-person, psychological horror rail-shooter and exploration game. Strapped into an infinite waterslide raft, you are propelled through the endless, moist labyrinth of the Poolrooms—a watery sub-layer of the Backrooms.

Rendered with [67js](https://github.com/codepawl/67.js), a WebGL2 engine where a scene is plain data.

## Play

```sh
npm install
npm run dev       # http://localhost:5173
npm run build     # static site in dist/, host anywhere
```

The game needs a browser with WebGL2. On a machine without a GPU it switches to a lighter render mode automatically; add `?quality=low` or `?quality=high` to the URL to choose yourself.

### Controls
| | Keyboard and mouse | Controller |
| --- | --- | --- |
| Steer (raft) / move (foot) | A / D · WASD | Left stick |
| Aim / look | Mouse | Right stick |
| Fire | Left click | Right trigger |
| Lock-on volley (raft) | Hold right click, sweep, release | Left trigger |
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
| Recharge · dressing · Ride Control | R · H · T | D-pad up · Select · — |
| Holding pools | Shoot an arrow · Space depart · E moor | |
| Pause and settings | Esc | Start |

Touch: left half of the screen moves, right half aims or looks, with buttons for fire, scan, burst, use and boost. Aim assist snaps to targets near your finger.

## Modes
- **Campaign 1, "Overflow":** choose Mars, Dez, Tubs or June, then ride eight attractions, from the Welcome Pools to the Rooftop Lagoon. Each is a branching ride ending at a holding pool with an optional dock: restore power, run a compressor, raise the pool, winch a gate, or fetch supplies.
- **Endless:** seeded attractions with rising threat and a score. Enter a seed on the menu or open `?seed=1234`; your best depth per seed is kept.
- The game saves your exact position every few seconds; closing the tab and choosing **Resume** puts you back where you were. Safe Rooms are the checkpoints you return to after dying.

## Code
| File | What it does |
| --- | --- |
| `src/main.js` | Game flow: campaign, endless, intro, docks, Safe Rooms, death, ending, saving and resuming |
| `src/track.js` | The slide as data: channel types, holding pools with gated exits, branches |
| `src/plans.js` | Builds each sector's ride and fills it with encounters |
| `src/ride.js` | The raft: geometry along the track, targets, entities, the Passenger, gates, paddling, overboard |
| `src/hull.js` | Four air chambers: punctures and their causes, field patches, the compressor, marks that stay |
| `src/explore.js` | On foot: grid levels and each attraction's rules |
| `src/blaster.js` | Pulse, inspection beam and disruption burst |
| `src/sectors.js` | The eight attractions: palettes, rides, maps, rules, voices, graffiti |
| `src/documents.js` | Found documents for the logbook |
| `src/crew.js` | The four Drainers, the roll call, and what survives a loop |
| `src/director.js` | Pacing: relax, warning, build-up, peak, fade, recovery |
| `src/saferoom.js` | The Safe Room scene behind its panel |
| `src/ui.js` | Safe Room, workbench, route terminal, logbook, keypad, settings |
| `src/hud.js`, `src/style.css` | The overlay |
| `src/audio.js` | Synthesized, stereo-panned sound |
| `src/input.js`, `src/settings.js`, `src/quality.js`, `src/labels.js`, `src/textures.js`, `src/math.js` | Input, options, render quality, sign textures, tile textures, maths |

The first prototype (a single minified Three.js file) is kept at `public/legacy/combat-build-02.html` and is linked from the menu.

## Design
- [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md): concept, mechanics, architecture and what's built so far
- [docs/SYSTEMS_DESIGN.md](docs/SYSTEMS_DESIGN.md): how raft, water, exploration and Safe Rooms connect; roadmap
- [docs/STORY_AND_LORE.md](docs/STORY_AND_LORE.md): setting, characters, entities, endings and story decisions
