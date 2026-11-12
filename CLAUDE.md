# UNDERFLOW

A first-person cooperative horror rail-shooter and explorer set in the Poolrooms, built on 67js (a WebGL2 engine whose scene is plain data). You ride a raft through attractions, dock, explore on foot, reach Safe Rooms. Single-player with an AI crew; no server.

## Map

| Path | What |
|---|---|
| `src/main.js` | Game state, mode switching (menu → ride → explore → Safe Room), save/resume, memory hooks |
| `src/ride.js` | The raft: track, hull, combat, encounters, dev bot. Largest and riskiest file |
| `src/crewfigure.js`, `src/blaster.js` | The crew figure (seated, walking, Safe Room) and the tool in your hand |
| `src/explore.js` | On foot: dock maps, objectives, machines, followers, remembered payoffs |
| `src/score.js` | Expedition Score, FLOW, Service Credit, the sector debrief (pure, unit-tested) |
| `src/poolrooms.js`, `src/director.js` | Placement rules for columns, arches and the painted room (pure, unit-tested); the pacing director with dread and holds |
| `src/memory.js` | The facility's memory between expeditions (see `docs/WORLD_MEMORY.md`) |
| `src/sectors.js`, `src/plans.js`, `src/track.js` | Content as data: attractions, track plans, track geometry |
| `src/ui.js`, `src/hud.js`, `src/input.js`, `src/padmap.js`, `src/settings.js` | Menus, HUD, input and bindings (controller tables by context are pure and unit-tested), settings |
| `src/tiers.js`, `src/quality.js` | Quality tiers and Auto (pure, unit-tested); applying a tier in the browser |
| `src/postchain.js`, `src/exposure.js`, `src/bench.js` | The four post passes and their uniforms, eye adaptation and haze, the `?bench` report (pure, unit-tested) |
| `src/spring.js`, `src/pressure.js`, `src/spawnscore.js` | Damped springs, the attack-slot budget, spawn-point scoring (pure, unit-tested) |
| `src/driftsign.js` | Which signs change at high Drift and what they say (pure, unit-tested) |
| `src/survey.js` | The on-foot survey map: what has been seen, coverage, text rendering (pure, unit-tested) |
| `src/aim.js` | Controller aim help and threat-marker geometry (pure, unit-tested) |
| `src/autores.js`, `src/haptics.js`, `src/collectibles.js` | Automatic render scale (pure, unit-tested), controller vibration patterns, pickups and the Lost & Found (pure, unit-tested) |
| `src/audio.js`, `src/samples.js` | Sound: recorded files in `public/audio/` (credited in `docs/CREDITS.md`) with synthesis as the fallback |
| `docs/` | Design, art direction, production standard, memory contract, tool notes, decisions |
| `tests/` | Headless tests (`tests/README.md`) |
| `public/legacy/` | The original prototype. Do not edit |

Local notes: `src/CLAUDE.md` (engine and module rules). Skills in `.claude/skills/`: design-pass, review, debug, balance, release, untangle. Start with `docs/ARCHITECTURE.md`; code provenance is in `docs/THIRD_PARTY_CODE.md`; decisions are in `docs/decisions/`, and tools and assets considered for the project are in `docs/TOOLS_AND_ASSETS.md`.

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
