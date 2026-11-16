# Response to the forensic audit

An outside audit of the release build listed technical and design risks. This file maps each recommendation to what is in the game now. "Built" means an automated test exercises it. Nothing below has been checked by human play or on a real GPU.

The audit read the single-file release (`dist/HYDROPHOBIA.html`), which is one bundle. The source is split into modules; see `docs/ARCHITECTURE.md`.

## Engineering

| Recommendation | Status | Where | Test |
|---|---|---|---|
| Modular source | Already true. The release is bundled; the source is 78 modules grouped by area | `src/` | `npm run typecheck`, `tests/unit/` |
| Versioned saves with migration and validation | **Built.** A save is an envelope: schema version, build, time, checksum, state. Unversioned saves from older builds are migrated. A save from a newer schema, a bad checksum, or a state the game can't use (attraction out of range, a number that isn't one) is refused with a reason | `src/savefile.js`, `src/main.js` | `savefile.test.js`, `platform.cjs` |
| Recovery from a damaged save | **Built.** The previous good save is kept as a backup. A damaged save falls back one checkpoint, and the menu says why. A damaged save is never copied over the backup | `src/savefile.js` | `savefile.test.js`, `platform.cjs` |
| Deterministic randomness | Already true for gameplay: the run seed is saved, and scene decoration has its own seeded stream. The remaining `Math.random` calls are cosmetic, or pick a fresh seed that is then saved | `src/math.js` (`rng`) | `systems.cjs` |
| Fixed timestep with bounded catch-up | **Built.** A long frame is split into steps of at most 1/30 s, at most three per frame. Time beyond that is dropped, so the game slows down rather than skipping through walls. Only the last step renders | `src/feel/timestep.js`, `src/main.js` | `timestep.test.js`, `platform.cjs` |
| Profiling per subsystem | **Built.** `?bench` reports time spent in scene update, rendering and audio, plus GPU time where the browser exposes it | `src/debug/profile.js`, `src/debug/bench.js` | `timestep.test.js`, `platform.cjs` |
| Source maps | **Built** for `npm run build`. They are stripped from the single-file build, which has to stay one file | `vite.config.js`, `scripts/single-html.mjs` | build |
| Performance targets | Already set: 60 FPS primary, a deliberate 30 FPS profile, measured on the slow tail. CPU cost per frame is measured. GPU cost on real hardware is **not measured** | `docs/PRODUCTION.md` | `platform.cjs`, `?bench` |

## Horror

| Recommendation | Status | Where | Test |
|---|---|---|---|
| A director that reacts to the player | **Built on foot.** The omens track four habits: scanning with the beam, rushing, lingering, getting hurt. Each omen answers a habit. A scanner gets things that happen outside the beam; a rusher gets misdirection; someone who lingers gets the slow omens. After a hard fight the omens hold off for up to 2.5 times as long. A habit only changes which omen comes, never difficulty: no habit brings an enemy. The raft keeps its existing director (dread, holds, attack slots) | `src/ai/habits.js`, `src/explore.js` | `habits.test.js`, `horror.cjs` |
| Authored silence | **Built.** A new omen on foot (not in the first attraction): the pumps and the water stop for about 22 seconds, and nothing else happens. The silence follows game time, so pausing holds it. It lifts when the omen ends or you leave the dock | `src/audio/audio.js` (`silence`, `release`), `src/explore.js` | `horror.cjs` |
| Sound occlusion | **Built** for the sounds that matter for tracking things on foot: the Lifeguard's whistle, chair and chains, the grind, the Bloom wind-up breath. A source with no line of sight to you plays through a low-pass filter and is quieter. This is a line-of-sight check on the dock grid, not acoustic simulation | `src/audio/audio.js` (`occluded`), `src/explore.js` | `horror.cjs` |
| AI debug view | **Built.** `?debug=ai` shows, live, the director phase, the player's habits, and what each Bloom, the Lifeguard and each crewmate believes and is doing | `src/debug/aiview.js` | `aiview.test.js`, `horror.cjs` |
| Drift in stages | Already built: the crew notices Drift in three stages, and signs and the Floater change with it | `src/driftsign.js`, `src/explore.js` | `dread.cjs` |
| The Attendant as antagonist | Partly built. The Attendant is the in-world voice of the director: it speaks, assesses, and lies about the facility. It has no body and does not act against you directly. Making it an active antagonist is **not built**; it is a story decision (see `docs/STORY_AND_LORE.md`) | `src/ride.js`, `src/explore.js` | `dread.cjs`, `arcade.cjs` |
| HUD layers | Already built: health shows only when hurt; three HUD modes (immersive, standard, arcade); an urgent line, edge markers and damage arcs | `src/hud.js`, `src/hudcues.js` | `hudcues.test.js`, `score.cjs` |

## Vertical-slice gate

A list of what the Closed Wave Pool should pass before it counts as a finished slice. Each line says how it is checked today. **None is verified.** That takes human play and real hardware, and neither has happened.

| Gate | How it is checked now | Verified |
|---|---|---|
| Completable start to finish by a new player without help | The bot reaches every dock (`npm run test:balance`, last run 16 November 2026) | No (needs playtests) |
| No unfair death: every damage source is telegraphed and avoidable | Burst tell and damage scaled by depth are tested (`systems.cjs`). One human player died after the power cell; this led to the burst tell | No |
| 60 FPS on the primary tier, 30 FPS on the constrained profile, p99 under 1.5× budget | CPU cost measured; software rendering only | No (needs real GPUs) |
| A damaged or old save never loses the campaign | `savefile.test.js`, `platform.cjs` | Automated only |
| Every scare has a cause the player can learn | Omens are tied to habits and the door; tested in `horror.cjs`, `dread.cjs` | No |
| Sound tells you where things are | Panning, Doppler, occlusion, reverb tested for presence, not by ear | No |
| Readable at 1080p on a TV and on a laptop | Staged screenshots only | No |
| Accessibility options work with a controller only | Controller tables tested (`padmap.test.js`) | No |

## Not built, and why

- **Acoustic simulation** (ray-traced or portal sound): occlusion is a line-of-sight check, which covers whether something is behind a wall. Anything finer needs a level geometry model the dock grid doesn't have.
- **A reactive director on the raft:** the raft already paces itself by dread, holds and attack slots. Player habits are only used on foot, where the omens are.
- **GPU budgets on target hardware:** the only renderer here is headless software rendering.
