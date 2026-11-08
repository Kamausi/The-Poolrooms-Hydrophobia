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
| | On the raft | On foot |
| --- | --- | --- |
| Aim / look | Mouse cursor | Mouse (click to capture) |
| Fire | Hold left click | Hold left click |
| Recharge | `R` | `R` |
| Move | `A` / `D` dodge, `Shift` boost | `WASD`, `Shift` run |
| Use | `E` at the dock | `E` |
| Snap out of Drift | `Space` | `Space` |
| Pause | `Esc` | `Esc` |

Touch: left half of the screen moves, right half aims or looks, with on-screen fire and use buttons.

## Code
| File | What it does |
| --- | --- |
| `src/main.js` | Game flow: menu, sectors, Safe Rooms, death, ending, save |
| `src/ride.js` | The raft: recycled channel, encounters, rail camera |
| `src/explore.js` | On foot: grid levels, power cell, door, roaming entities |
| `src/blaster.js` | Arc Blaster charge, fire timing, first-person model and beam |
| `src/sectors.js` | Sector data: colours, speed, threats, level maps, dialogue, graffiti |
| `src/hud.js`, `src/style.css` | The overlay |
| `src/audio.js` | Synthesized sound |
| `src/input.js`, `src/quality.js`, `src/textures.js`, `src/math.js` | Input, render quality, tile textures, matrix helpers |

The first prototype (a single minified Three.js file) is kept at `public/legacy/combat-build-02.html` and is linked from the menu.

## Design
- [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md): concept, mechanics, architecture and what's built so far
- [docs/SYSTEMS_DESIGN.md](docs/SYSTEMS_DESIGN.md): how raft, water, exploration and Safe Rooms connect; roadmap
- [docs/STORY_AND_LORE.md](docs/STORY_AND_LORE.md): setting, characters, entities, endings and story decisions
