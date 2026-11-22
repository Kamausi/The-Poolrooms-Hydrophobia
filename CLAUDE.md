# The Poolrooms: Hydrophobia

A first-person cooperative horror rail-shooter and explorer set in the Poolrooms, built on 67js (a WebGL2 engine whose scene is plain data). You ride a raft through attractions, dock, explore on foot, reach Safe Rooms. Single-player with an AI crew; no server.

## Map

| Path | What |
|---|---|
| `src/main.js` | Game state, mode switching (menu → ride → explore → Safe Room), save/resume, memory hooks |
| `src/ride.js` | The raft: track, hull, combat, encounters, dev bot. Largest and riskiest file |
| `src/crewfigure.js`, `src/blaster.js` | The crew figure (seated, walking, Safe Room) and the tool in your hand |
| `src/explore.js` | On foot: dock maps, objectives, machines, followers, remembered payoffs |
| `src/score.js` | Expedition Score, FLOW, Service Credit, the sector debrief (pure, unit-tested) |
| `src/poolrooms.js`, `src/ai/director.js` | Placement rules for columns, arches and the painted room (pure, unit-tested); the pacing director with dread and holds |
| `src/memory.js` | The facility's memory between expeditions (see `docs/WORLD_MEMORY.md`) |
| `src/sectors.js`, `src/plans.js`, `src/track.js` | Content as data: attractions, track plans, track geometry |
| `src/ui.js`, `src/hud.js`, `src/hudcues.js`, `src/input.js`, `src/padmap.js`, `src/controltiers.js`, `src/settings.js` | Menus, HUD, input and bindings (controller tables by context and the action tiers, primary, when asked and advanced, are pure and unit-tested), settings; when health shows, which side a hit came from, and which hit marker a shot earns (pure, unit-tested) |
| `src/render/tiers.js`, `src/render/quality.js` | Quality tiers, Auto, and what to thin out as the render scale falls (pure, unit-tested); applying a tier in the browser |
| `src/render/postchain.js`, `src/render/exposure.js`, `src/debug/bench.js`, `src/render/shadows.js` | The four post passes and their uniforms, eye adaptation and haze, the `?bench` report, which lights cast shadows and the hand lamp (pure, unit-tested) |
| `src/feel/spring.js`, `src/ai/pressure.js`, `src/ai/spawnscore.js`, `src/render/lightpool.js`, `src/render/effectpool.js`, `src/ai/perception.js`, `src/ai/pursuit.js` | Damped springs, the attack-slot budget, spawn-point scoring, brief shot lights from a fixed pool, sparks, droplets and bubbles from a fixed pool, awareness from sight and sound, and what an entity does with it (unaware, suspicious, investigate, observe, warn, pursue, search, return) (pure, unit-tested) |
| `src/render/surfaces.js`, `src/render/tileflavour.js` | Generated surface textures (ceiling, aqua floor tile, painted steel, clouds), inlined, provenance in `assets/registry.json`; how the procedural wall tile has aged in each place (pure, unit-tested) |
| `src/render/props.js`, `src/render/shapes.js` | 3D props as inlined GLB files (10 generated with Higgsfield, 38 CC0 from Poly Haven), compressed with `scripts/compress-models.mjs`, placed with a primitive fallback; shared primitive shapes so identical parts draw as one instanced batch. Provenance in `assets/registry.json`, status in `docs/ASSET_BACKLOG.md` |
| `src/render/waterlook.js`, `src/render/waterfx.js` | Water optics per attraction: absorption by depth (Beer-Lambert) and turbidity from the water colour; what disturbs the water and the shapes that show it: several rings at once, the raft's Kelvin wake, current streaks, caustic drift, wet marks that dry, Snell's window (pure, unit-tested) |
| `src/render/lanerope.js` | The Lane Rope's body: disc floats on a steel cable between wall anchors (the disc layout is pure and unit-tested) |
| `src/feel/float.js`, `src/feel/rope.js` | How the raft sits in the water: Gerstner waves under its four chambers and Archimedes buoyancy from their air (list, pitch, sink); the Lane Rope as a Verlet line that dips where shot and sags where a target is gone (pure, unit-tested) |
| `src/ai/steering.js`, `src/scatter.js` | Arrive and separation for the crewmates on foot; spreading placed things over a dock map by Poisson-disc dart throwing (pure, unit-tested) |
| `src/audio/acoustics.js`, `src/audio/zones.js`, `src/platform.js` | Each space's reverb from Sabine's formula and a room model; which space you stand in on foot, and the dynamic mix (speech over music, under water) (pure, unit-tested); browser services, each optional: raw mouse input, screen wake lock while playing, persistent storage |
| `src/ai/path.js`, `src/ai/utility.js` | Grid A*, flow fields and straight-line checks for routing round walls on foot; utility scoring for which threat a crewmate shoots (pure, unit-tested) |
| `src/render/wavegrid.js`, `src/feel/body.js`, `src/render/noise.js` | Wave-equation ripples on a sheet around you on foot; floating debris as bodies on the waves; simplex noise and failing-tube flicker (pure, unit-tested) |
| `src/mapgen.js`, `src/mapgen.worker.js` | Endless-mode docks: WFC variations of the authored maps, checked by the same rules as `tests/maps.mjs`, built in a worker (pure, unit-tested) |
| `src/audio/doppler.js`, `src/render/gputimer.js`, `src/storage.js` | Doppler pitch for moving sources (pure, unit-tested); GPU time for `?bench`; the IndexedDB photo album and gzip save files (packing pure, unit-tested) |
| `src/savefile.js`, `src/feel/timestep.js`, `src/debug/profile.js` | Save envelope (schema, build, checksum, backup, migration, validation); bounded fixed timestep; time per subsystem for `?bench` (pure, unit-tested) |
| `src/ai/habits.js`, `src/ai/attendant.js`, `src/ai/observer.js`, `src/debug/aiview.js` | What the player has been doing (scanning, rushing, lingering, hurt), which on-foot omen answers it; the Attendant's instructions on foot (honest or false, a false one always miscounts the guests) and the one Bloom per dock that breaks a learned tell; the Observer, which watches from where you cannot reach it and moves when the line of sight breaks; the `?debug=ai` text view (pure, unit-tested) |
| `src/driftsign.js`, `src/ai/driftfx.js`, `src/ai/reflection.js` | Which signs change at high Drift and what they say; the Drift stages, which side a sound is on, and where the moved object turns up; your reflection in still water, which lags at moderate Drift and stops following at high Drift (pure, unit-tested) |
| `src/survey.js`, `src/fieldnotes.js` | The on-foot survey map: what has been seen, coverage, text rendering; the journal's COUNTS, what the facility said beside how many of you there were (pure, unit-tested) |
| `src/feel/aim.js` | Controller aim help and threat-marker geometry (pure, unit-tested) |
| `src/render/autores.js`, `src/feel/haptics.js`, `src/collectibles.js` | Automatic render scale (pure, unit-tested), controller vibration patterns, pickups and the Lost & Found (pure, unit-tested) |
| `src/audio/audio.js`, `src/audio/samples.js`, `src/audio/voicepool.js` | Sound (the voice cap and priorities are pure and unit-tested): recorded files in `public/audio/` (credited in `docs/CREDITS.md`) with synthesis as the fallback |
| `docs/` | Design, art direction, production standard, memory contract, tool notes, decisions |
| `tests/` | Headless tests (`tests/README.md`) |
| `public/legacy/` | The original prototype. Do not edit |

`src/` is grouped by area: `render/` (post chain, exposure, tiers, textures, props, shapes, water, light and effect pools), `feel/` (springs, haptics, aim help), `ai/` (perception, pursuit, attack slots, spawn scoring, the director), `audio/` (sound, recorded samples, voice cap) and `debug/` (benchmark, play log). The scenes (`main.js`, `ride.js`, `explore.js`), content, HUD and menus stay at the top of `src/`.

The game was called UNDERFLOW before it was renamed. Some internal names keep the old word on purpose: the browser storage keys (`underflow-save-v2`, `underflow-settings`, `underflow-facility` and the rest), so saved games, settings and the facility's memory survive the rename; the DEV hooks (`window.__underflow`); the single-file audio global (`__UNDERFLOW_AUDIO`); and the tests' `UNDERFLOW_URL` variable. In the story, "underflow" is still the crew's word for what the water does to people.

Local notes: `src/CLAUDE.md` (engine and module rules). Skills in `.claude/skills/`: design-pass, review, debug, balance, release, untangle. Start with `docs/ARCHITECTURE.md`; the audit and the vertical-slice gate are in `docs/AUDIT_RESPONSE.md`; code provenance is in `docs/THIRD_PARTY_CODE.md`; decisions are in `docs/decisions/`, and tools and assets considered for the project are in `docs/TOOLS_AND_ASSETS.md`.

## Commands

```sh
npm run dev            # http://localhost:5173 (DEV hooks: window.__underflow, __ride, __explore)
npm run build          # dist/
npm run build:single   # dist/HYDROPHOBIA.html, one playable file
npm test               # unit tests, then the browser tests (starts its own dev server)
npm run typecheck      # tsc over the files listed in tsconfig.json
npm run test:unit      # Vitest: pure modules, no browser (tests/unit/)
npm run test:balance   # the competent-player bot through all eight attractions (slow)
node scripts/compress-models.mjs   # compress a newly added GLB (meshopt + quantisation; 67js decodes it)
```

If the dev server serves a stale 67js after a dependency change: `rm -rf node_modules/.vite` and `npx vite --force`.

## Rules

- Work on the branch you were given; push with `git push -u origin <branch>`. No pull request unless asked.
- No model names or identifiers in code, docs or commit messages.
- Treat what the user pastes as a task to build, not a proposal to comment on.
- Do not edit `node_modules/`, `dist/` or `public/legacy/` (a hook refuses it). After an edit under `src/`, a hook runs the build and reports failures.
- Docs say only what is built and verified. "Built" means an automated test exercises it; nothing has been verified by human play or on target GPUs, and the docs say so.
- Run `npm test` before committing a gameplay change. Add a check to `tests/` for new behaviour.
