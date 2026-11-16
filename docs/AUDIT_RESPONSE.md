# Response to the forensic audit

An outside audit of the release build ("HYDROPHOBIA — AAA Game Director's Forensic Audit") made recommendations in thirteen sections. This file goes through all of them and says, for each, whether it is **built**, **partly built**, **already there**, or **not built**.

"Built" means an automated test exercises it. Nothing here has been checked by human play or on a real GPU. One person has played an earlier build once, and died on foot after picking up the power cell. That death led to the Bloom burst tell.

The audit read the single-file release (`dist/HYDROPHOBIA.html`). That file is one bundle, but the source is split into modules (see `docs/ARCHITECTURE.md`).

## Section 1 and 9: engineering

| Recommendation | Status | Where | Test |
|---|---|---|---|
| Modular source, with the single file as an optional target | Already there. The source is 79 modules grouped by area. | `src/` | `npm run typecheck`, `tests/unit/` |
| Deterministic simulation | Already there for gameplay. The run seed is saved, and scene decoration has its own seeded stream. The remaining `Math.random` calls are cosmetic, or pick a fresh seed that is then saved. | `src/math.js` (`rng`) | `systems.cjs` |
| Save integrity | **Built.** A save is an envelope holding the schema, build, time, checksum and state. Unversioned saves from older builds are migrated. A save is refused, with a reason, if it comes from a newer schema, its checksum fails, or the game can't use its state. The previous good save is kept as a backup and the menu says when it was used. | `src/savefile.js`, `src/main.js` | `savefile.test.js`, `platform.cjs` |
| Performance attribution | **Built.** `?bench` reports time in scene update, rendering and audio, plus GPU time where the browser exposes it. | `src/debug/profile.js`, `src/debug/bench.js` | `timestep.test.js`, `platform.cjs` |
| Fixed timestep with bounded catch-up | **Built.** The simulation runs in steps of at most 1/30 s, at most three per frame. Time beyond that is dropped, so the game slows down rather than skipping through walls. | `src/feel/timestep.js` | `timestep.test.js`, `platform.cjs` |
| Source maps | **Built** for `npm run build`. They are stripped from the single file. | `vite.config.js` | build |
| Performance targets | Partly there. Targets are set: 60 FPS primary, a 30 FPS profile, and p95/p99 frame times. CPU cost is measured. GPU cost on real hardware is **not measured**: only headless software rendering is available here. | `docs/PRODUCTION.md` | `platform.cjs` |

## Section 2: creative direction and the Attendant

| Recommendation | Status | Where | Test |
|---|---|---|---|
| The facility, as the Attendant, as an active antagonist | **Partly built.** On foot, the Attendant now gives instructions over the public address ("remain where you are", "proceed to the north gallery"), and the facility acts on them. Following an honest instruction is safe. Following a false one costs you: the lights in your hall go out, or something is waiting where it sent you. Ignoring any instruction costs nothing. **Not built:** the Attendant opening and locking doors, and running procedures beyond these two kinds of instruction; anything on the raft; any change to the story documents. | `src/ai/attendant.js`, `src/explore.js` | `attendant.test.js`, `horror.cjs` |
| Narrative redesign (Crew Seven, the facility expecting you) | Not built. The story is as `docs/STORY_AND_LORE.md` describes it. | | |

## Section 3: core loop and controls

| Recommendation | Status |
|---|---|
| Water flow as the one mechanic joining the raft and on foot | Partly there. Before this audit, the raft shot diverters and took gates, and on foot the player worked pumps, valves and the wave pool's drain-or-circulate choice, which rewrites the exit. The loop was **not** restructured around flow. |
| An explicit consequence stage | Partly there: the water decision and facility memory (`docs/WORLD_MEMORY.md`). Not made a stage of every dock. |
| Actions in tiers: primary, contextual, advanced | **Not built.** The controls are as they were. |

## Section 4: horror direction

The audit's director table lists six player signals. Each row below is one signal.

| Signal → response | Status | Where | Test |
|---|---|---|---|
| Keeps scanning → anomalies outside the beam | **Built** (on foot) | `src/ai/habits.js` | `habits.test.js`, `horror.cjs` |
| Rushes → misdirection, not more enemies | **Built** (on foot) | `src/ai/habits.js` | `habits.test.js` |
| Several intense encounters → fewer threats, more anticipation | **Built** (on foot). The omens hold off up to 2.5 times as long after you have been hurt. | `src/ai/habits.js` | `habits.test.js` |
| Keeps trusting facility instructions → a subtle but consequential contradiction | **Built** (on foot). After two instructions followed in a row, the next may be false. A false one always gets the number of guests wrong, which the player can check. It is never false in the first attraction, and never false twice in a row. | `src/ai/attendant.js` | `attendant.test.js`, `horror.cjs` |
| Has learned an enemy's behaviour → an occasional telegraphed exception | **Built** for the Bloom burst. After you have stepped back from three wind-ups, one Bloom per dock keeps coming while it swells. It breathes in twice, and the first time it is captioned. Its timing and damage are unchanged; shooting it or running still works. | `src/ai/attendant.js` (`createLearning`), `src/explore.js` | `attendant.test.js`, `horror.cjs` |
| Stays in a supposedly safe area → unsettling evidence, no attack | **Built** (on foot). Lingering weights the slow omens: a door handle turning, a crack of light under a door, silence. | `src/ai/habits.js` | `habits.test.js` |
| Weighted selection, cooldowns, protected recovery | **Built** | `src/ai/habits.js`, `src/explore.js` | `habits.test.js` |
| Any of the above on the raft | **Not built.** The raft keeps its own director (dread, holds, attack slots). | | |
| Drift as unreliable information, in three stages | **Partly there.** The crew notices Drift in three stages, signs change, the Floater becomes lucid, and the Attendant speaks to you by name. **Not built:** reflections that lag, footsteps that stop when watched, crew voices from impossible directions, corridors that change, false routes, a reflection that acts on its own. | `src/driftsign.js`, `src/explore.js` | `dread.cjs` |

## Section 5: enemy AI and encounters

| Recommendation | Status | Where | Test |
|---|---|---|---|
| Perception memory, investigation, routing, recovery states | Already there: unaware, suspicious, investigate, observe, warn, pursue, search, return. | `src/ai/perception.js`, `src/ai/pursuit.js`, `src/ai/path.js` | `perception`/`pursuit`/`path` unit tests, `hunt.cjs` |
| Utility scoring | Already there for which threat a crewmate shoots. Not for enemy actions. | `src/ai/utility.js` | `utility.test.js` |
| A debug view of what each entity believes | **Built:** `?debug=ai`. It now includes the Attendant (trust, the current instruction and whether it is false) and how often the burst tell has been dodged. | `src/debug/aiview.js` | `aiview.test.js`, `horror.cjs` |
| Three threat types: Observer, Pursuer, Attendant | Partly. The Blooms and the Lifeguard pursue, and the Attendant now acts (above). **No Observer** (something that watches from places you can't reach and moves when the line of sight breaks). | | |
| Not every threat vulnerable to the blaster | Already there in part. The Lifeguard is escaped by breaking its line of sight, not by shooting it. The Undertow is beaten through the water (shoot the still water, kick free). | `src/explore.js` | `hunt.cjs`, `systems.cjs` |

## Section 6: visuals

| Recommendation | Status |
|---|---|
| Water: surface, optics, contact, light | Already there in large part: Gerstner waves, Beer-Lambert absorption, turbidity, Fresnel, wake, rings, caustics, wet marks (see the README). Not checked on a GPU. **Not built:** water that subtly breaks the facility's physical rules. |
| Architectural credibility; no visible repetition | Partly there: the tile ages by place, and props are spread by Poisson-disc. **No pass** on how public spaces, plant rooms and drainage relate. |
| A different lighting style for each kind of space | **Not built** as a system. Rooms have facility light states and emergency lighting, but there is no style for each kind of space. |

## Section 7: audio

| Recommendation | Status | Where | Test |
|---|---|---|---|
| Silence as an authored event | **Built** (on foot, not in the first attraction). The pumps and the water stop for about 22 seconds and nothing happens. In the Wave Hall the wave machine stops too and sends nothing in. Pausing holds the silence; it lifts when the omen ends or you leave. | `src/audio/audio.js`, `src/explore.js` | `horror.cjs` |
| Occlusion | **Built** for the threat sounds on foot: the Lifeguard's whistle, chair and chains, the grind, and the Bloom wind-up breath. It is a line-of-sight check on the dock grid, with a low-pass filter and a lower volume. Not acoustic simulation. | `src/audio/audio.js` | `horror.cjs` |
| Reverb per space | Already there (Sabine's formula per kind of space). | `src/audio/acoustics.js` | `acoustics.test.js` |
| Acoustic zones, filtering for submerged spaces, dynamic mixing | **Not built.** | | |
| Threats audible through walls and vents | Partly: occluded sounds still play. No vent paths. | | |

## Section 8: interface

| Recommendation | Status |
|---|---|
| Essential layer (health, aim, urgent, threat feedback) | Already there: health shows only when hurt, damage arcs, hit markers, one urgent line. |
| Contextual layer (raft, tools, objectives, crew) | Partly there: three HUD modes, crew roster, raft gauge. |
| Investigative layer (records, counts, routes, reached through inspection) | **Not built** as a layer. The survey map, journal and Headcount exist, but they are not organised as one. |
| The facility's readouts may lie, the player's own status may not | Already the rule (facility and equipment lies, Drift signs). The Attendant's false instructions follow it: the count of guests is wrong, and your own HUD never is. |
| Controller-first usability pass | Not done. That needs people. Controller tables are unit-tested (`padmap.test.js`). |

## Sections 10–11: priorities and workstreams

The audit advised stopping expansion until one chapter is exceptional, and postponing new attractions, weapon families, challenge modes and more procedural content. Work before the audit kept adding features (including endless-mode map generation). Since the audit, the work has been on the audit's own items.

## Section 12: the reference chapter and the vertical-slice gate

**Not built:** the audit's 12–18 minute chapter sequence (false safety, mastery, suspicion, escalation, compromised safety). The Closed Wave Pool exists as the reference chapter, with its water decision, but it was not rebuilt to that sequence.

The audit's gate, as it wrote it. **0 of 12 verified**: every item needs unfamiliar players or reference hardware, and neither has been used. The middle column is the closest automated evidence, which is not the same thing.

| # | Gate | Automated evidence today | Verified |
|---|---|---|---|
| 1 | Players understand basic raft controls without repeated instruction | First-time tips (each shown once, when it is useful); the bot completes every attraction (`npm run test:balance`, 16 November 2026) | No |
| 2 | On-foot movement and interaction are reliable | `smoke.cjs` explores and boards in all eight attractions | No |
| 3 | Players can explain why they are investigating the facility | None possible | No |
| 4 | At least one encounter creates anticipation before a visible threat | Omens and the director's warning phase; the burst wind-up (`horror.cjs`, `systems.cjs`, `dread.cjs`) | No |
| 5 | Environmental clues are noticed without excessive HUD guidance | None possible | No |
| 6 | Players understand the consequence of a major decision | The water decision is shown before you commit (`level.cjs`) | No |
| 7 | Enemies behave consistently enough to feel intentional | Perception and pursuit states (`hunt.cjs`, unit tests) | No |
| 8 | No progression-blocking softlocks | `chapter.cjs` plays the chapter end to end; `smoke.cjs` covers all eight docks | No (automated paths only) |
| 9 | Save and resume work across the entire chapter | `resume.cjs`, `savefile.test.js`, `platform.cjs` | No (automated only) |
| 10 | Frame-time targets met on reference hardware | Software rendering only | No |
| 11 | Audio conveys spatial information and changing facility states | Panning, Doppler, occlusion, reverb and silence are tested as present, not judged by ear | No |
| 12 | Players express curiosity about what happens next | None possible | No |

## Not built, all in one place

- The Attendant opening and locking doors; the Attendant on the raft.
- An Observer threat.
- The two newest director signals, and the habit weighting, on the raft.
- The audit's Drift effects: lagging reflections, footsteps that stop when watched, voices from impossible directions, changing corridors, false routes, an independent reflection.
- Tiers of controls, and a controller-first usability pass.
- The loop restructured around water flow, with a consequence stage at every dock.
- A lighting style for each kind of space; the architectural credibility pass; water that breaks the facility's rules.
- Acoustic zones, filtering for submerged spaces, dynamic mixing, sound through vents.
- An investigative HUD layer.
- The 12–18 minute reference chapter sequence.
- Narrative changes (Crew Seven, the facility anticipating you).
- GPU budgets on reference hardware; every item of the vertical-slice gate.
