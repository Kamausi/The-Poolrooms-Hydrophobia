# UNDERFLOW

A first-person cooperative horror rail-shooter and explorer set in the Poolrooms, built on 67js (a WebGL2 engine whose scene is plain data). You ride a raft through attractions, dock, explore on foot, reach Safe Rooms. Single-player with an AI crew; no server.

## Map

| Path | What |
|---|---|
| `src/main.js` | Game state, mode switching (menu → ride → explore → Safe Room), save/resume, memory hooks |
| `src/ride.js` | The raft: track, hull, combat, encounters, dev bot. Largest and riskiest file |
| `src/crewfigure.js`, `src/blaster.js` | The crew figure (seated, walking, Safe Room) and the tool in your hand |
| `src/explore.js` | On foot: dock maps, objectives, machines, followers, remembered payoffs |
| `src/poolrooms.js`, `src/director.js` | Placement rules for columns, arches and the painted room (pure, unit-tested); the pacing director with dread and holds |
| `src/memory.js` | The facility's memory between expeditions (see `docs/WORLD_MEMORY.md`) |
| `src/sectors.js`, `src/plans.js`, `src/track.js` | Content as data: attractions, track plans, track geometry |
| `src/ui.js`, `src/hud.js`, `src/input.js`, `src/settings.js` | Menus, HUD, input and bindings, settings |
| `src/audio.js`, `src/samples.js` | Sound: recorded files in `public/audio/` (credited in `docs/CREDITS.md`) with synthesis as the fallback |
| `docs/` | Design, art direction, production standard, memory contract, tool notes, decisions |
| `tests/` | Headless tests (`tests/README.md`) |
| `public/legacy/` | The original prototype. Do not edit |

Local notes: `src/CLAUDE.md` (engine and module rules). Skills in `.claude/skills/`: design-pass, review, debug, balance, release, untangle. Start with `docs/ARCHITECTURE.md`; decisions are in `docs/decisions/`, and tools and assets considered for the project are in `docs/TOOLS_AND_ASSETS.md`.

## Commands

```sh
npm run dev            # http://localhost:5173 (DEV hooks: window.__underflow, __ride, __explore)
npm run build          # dist/
npm run build:single   # dist/UNDERFLOW.html, one playable file
npm test               # unit tests, then the browser tests (starts its own dev server)
npm run typecheck      # tsc over the files listed in tsconfig.json
npm run test:unit      # Vitest: pure modules, no browser (tests/unit/)
npm run test:balance   # the competent-player bot through all eight attractions (slow)
```

If the dev server serves a stale 67js after a dependency change: `rm -rf node_modules/.vite` and `npx vite --force`.

## Rules

- Work on the branch you were given; push with `git push -u origin <branch>`. No pull request unless asked.
- No model names or identifiers in code, docs or commit messages.
- Treat what the user pastes as a task to build, not a proposal to comment on.
- Do not edit `node_modules/`, `dist/` or `public/legacy/` (a hook refuses it). After an edit under `src/`, a hook runs the build and reports failures.
- Docs say only what is built and verified. "Built" means an automated test exercises it; nothing has been verified by human play or on target GPUs, and the docs say so.
- Run `npm test` before committing a gameplay change. Add a check to `tests/` for new behaviour.
