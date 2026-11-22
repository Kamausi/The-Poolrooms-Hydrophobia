# Response to the forensic audit

An outside audit of the release build ("HYDROPHOBIA — AAA Game Director's Forensic Audit") made recommendations in thirteen sections. This file goes through all of them and says, for each, whether it is **built**, **partly built**, **already there**, or **not built**.

"Built" means an automated test exercises it. Nothing here has been checked by human play or on a real GPU. One person has played an earlier build once, and died on foot after picking up the power cell. That death led to the Bloom burst tell.

The audit read the single-file release (`dist/HYDROPHOBIA.html`). That file is one bundle, but the source is split into modules (see `docs/ARCHITECTURE.md`).

## Section 1 and 9: engineering

| Recommendation | Status | Where | Test |
|---|---|---|---|
| Modular source, with the single file as an optional target | Already there. The source is 81 modules grouped by area. | `src/` | `npm run typecheck`, `tests/unit/` |
| Deterministic simulation | Already there for gameplay. The run seed is saved, and scene decoration has its own seeded stream. The remaining `Math.random` calls are cosmetic, or pick a fresh seed that is then saved. | `src/math.js` (`rng`) | `systems.cjs` |
| Save integrity | **Built.** A save is an envelope holding the schema, build, time, checksum and state. Unversioned saves from older builds are migrated. A save is refused, with a reason, if it comes from a newer schema, its checksum fails, or the game can't use its state. The previous good save is kept as a backup and the menu says when it was used. | `src/savefile.js`, `src/main.js` | `savefile.test.js`, `platform.cjs` |
| Performance attribution | **Built.** `?bench` reports time in scene update, rendering and audio, plus GPU time where the browser exposes it. | `src/debug/profile.js`, `src/debug/bench.js` | `timestep.test.js`, `platform.cjs` |
| Fixed timestep with bounded catch-up | **Built.** The simulation runs in steps of at most 1/30 s, at most three per frame. Time beyond that is dropped, so the game slows down rather than skipping through walls. | `src/feel/timestep.js` | `timestep.test.js`, `platform.cjs` |
| Source maps | **Built** for `npm run build`. They are stripped from the single file. | `vite.config.js` | build |
| Performance targets | Partly there. Targets are set: 60 FPS primary, a 30 FPS profile, and p95/p99 frame times. CPU cost is measured. GPU cost on real hardware is **not measured**: only headless software rendering is available here. | `docs/PRODUCTION.md` | `platform.cjs` |

## Section 2: creative direction and the Attendant

| Recommendation | Status | Where | Test |
|---|---|---|---|
| The facility, as the Attendant, as an active antagonist | **Partly built.** On foot, the Attendant now gives instructions over the public address ("remain where you are", "proceed to the north gallery"), and the facility acts on them. Following an honest instruction is safe. Following a false one costs you: the lights in your hall go out, or something is waiting where it sent you. Ignoring any instruction costs nothing. Near the raft it also **holds the boarding gate**: an honest closure really blocks boarding for twenty seconds (and opens at once if you are hurt), a false one miscounts the guests and is not closed at all, and the boarding prompt always says what the gate is doing. Near a door you have already opened (the code door, the lagoon gate) it can **lock that door** the same way: an honest lock really shuts it for twenty seconds (opening at once if you are hurt, and never while you stand in or next to the doorway), a false one miscounts the guests and leaves the door standing open, and walking through it is noticed. **Not built:** the Attendant running other procedures; anything on the raft. | `src/ai/attendant.js`, `src/explore.js` | `attendant.test.js`, `horror.cjs`, `gate.cjs` |
| Narrative redesign (Crew Seven, the facility expecting you) | Not built. The story is as `docs/STORY_AND_LORE.md` describes it. | | |

## Section 3: core loop and controls

| Recommendation | Status |
|---|---|
| Water flow as the one mechanic joining the raft and on foot | Partly there. Before this audit, the raft shot diverters and took gates, and on foot the player worked pumps, valves and the wave pool's drain-or-circulate choice, which rewrites the exit. The loop was **not** restructured around flow. |
| An explicit consequence stage | Partly there: the water decision and facility memory (`docs/WORLD_MEMORY.md`). Not made a stage of every dock. |
| Actions in tiers: primary, contextual, advanced | **Built.** `src/controltiers.js` puts every action in a tier: primary (aim, fire, move, hop, use, the inspection beam), when asked (brace, shove, patch, paddle, boost, recharge, dressing, map, look back, the override) and advanced (blaster profiles, the burst, ping, Ride Control, the helm, the work lamp). The controls reference in Settings and pause and both binding lists are grouped by tier, with the labels of the device in use, and the first-time tip for an advanced action waits until the player has fired five shots and spent forty seconds on the raft. Unit tests cover the tiers and the tip rule; `tests/gamepad.cjs` checks the grouped reference with the controller's labels and that shots are counted. Whether the order helps a new player has not been judged by anyone. |

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
| Drift as unreliable information, in three stages | **Partly built.** The crew notices Drift in three stages, the Floater becomes lucid, and the Attendant speaks to you by name. From the low stage: **footsteps behind you that stop the moment you turn to look** (from Drift 30, not in the first attraction; nothing is there and nothing comes), at the moderate stage (from Drift 50) **a crewmate's voice from the opposite side to where they stand**, with the caption naming both, and **a wet floor sign standing on a spot you walked past a minute ago**, placed and put away only while you are looking elsewhere; and at high Drift **signs that change only while you are not looking at them** (puzzle signs never change) and **a false route**: once per dock, while you look elsewhere, a dark doorway appears in a wall; it is still a wall, and walking up to it you find tile, and the doorway is gone (collision, routing and the survey map are never changed). At the edge of still water **you see yourself in it**: a figure in your crew colours under the surface, upside down and leaning away from you to fit the pool's depth (a dark figure, not a true mirror image). From Drift 50 **it follows you late**, by 0.6 s, so a quick step shows; at high Drift, once per dock and not in the first attraction, **it stops following**: it stays where it was and turns to look up at where you are now, a caption says so, and it is gone when you look away. It never leaves the water and never hurts you. **Not built:** corridors that change. | `src/driftsign.js`, `src/ai/driftfx.js`, `src/ai/reflection.js`, `src/explore.js` | `dread.cjs`, `circuit.cjs`, `horror.cjs`, `drift.cjs` |

## Section 5: enemy AI and encounters

| Recommendation | Status | Where | Test |
|---|---|---|---|
| Perception memory, investigation, routing, recovery states | Already there: unaware, suspicious, investigate, observe, warn, pursue, search, return. | `src/ai/perception.js`, `src/ai/pursuit.js`, `src/ai/path.js` | `perception`/`pursuit`/`path` unit tests, `hunt.cjs` |
| Utility scoring | Already there for which threat a crewmate shoots. Not for enemy actions. | `src/ai/utility.js` | `utility.test.js` |
| A debug view of what each entity believes | **Built:** `?debug=ai`. It now includes the Attendant (trust, the current instruction and whether it is false), the Observer (where, how many moves, how long out of sight) and how often the burst tell has been dodged. | `src/debug/aiview.js` | `aiview.test.js`, `horror.cjs` |
| Three threat types: Observer, Pursuer, Attendant | **Built, all three on foot.** The Blooms and the Lifeguard pursue; the Attendant acts (above). **The Observer**, from the third attraction on, once per dock: a still figure in staff colours that takes a place only where you are not looking and that can see you, stays while you watch it, and moves when it has been out of your sight for 1.5 s, when you come within 10 m, or after 40 s unnoticed. Each place is a little closer (never under 9 m). After four places it leaves. It never attacks and cannot be shot. | `src/ai/observer.js`, `src/explore.js` | `observer.test.js`, `horror.cjs` |
| Not every threat vulnerable to the blaster | Already there in part. The Lifeguard is escaped by breaking its line of sight, not by shooting it. The Undertow is beaten through the water (shoot the still water, kick free). | `src/explore.js` | `hunt.cjs`, `systems.cjs` |

## Section 6: visuals

| Recommendation | Status |
|---|---|
| Water: surface, optics, contact, light | Already there in large part: Gerstner waves, Beer-Lambert absorption, turbidity, Fresnel, wake, rings, caustics, wet marks (see the README). Not checked on a GPU. **Not built:** water that subtly breaks the facility's physical rules. |
| Architectural credibility; no visible repetition | Partly there: the tile ages by place, and props are spread by Poisson-disc. **No pass** on how public spaces, plant rooms and drainage relate. |
| A different lighting style for each kind of space | **Built on foot.** `src/render/lightstyle.js` gives each fixture the style of the space it hangs in, read from the same zones as the reverb (`audio/zones.js`), so what you see and hear agree: corridors are cold, close and a quarter of their tubes are failing; pool halls are bright and warm with a long throw; side rooms are dim and yellow; the open roof has no fixtures. The sector's lamp colour stays the base. Across the eight authored docks the zones are mostly halls and rooms, with real corridors in the Filtration Works (26 cells), the Splash Zone (8) and a few elsewhere. The facility light states and emergency lighting work as before. Not judged by eye: the screenshots taken were of the dark Blacklight Pavilion, where the difference is hard to see. **Not built:** a style on the raft. | `src/render/lightstyle.js`, `src/explore.js` | `lightstyle.test.js`, `drift.cjs` |

## Section 7: audio

| Recommendation | Status | Where | Test |
|---|---|---|---|
| Silence as an authored event | **Built** (on foot, not in the first attraction). The pumps and the water stop for about 22 seconds and nothing happens. In the Wave Hall the wave machine stops too and sends nothing in. Pausing holds the silence; it lifts when the omen ends or you leave. | `src/audio/audio.js`, `src/explore.js` | `horror.cjs` |
| Occlusion | **Built** for the threat sounds on foot: the Lifeguard's whistle, chair and chains, the grind, and the Bloom wind-up breath. It is a line-of-sight check on the dock grid, with a low-pass filter and a lower volume. Not acoustic simulation. | `src/audio/audio.js` | `horror.cjs` |
| Reverb per space | Already there (Sabine's formula per kind of space). | `src/audio/acoustics.js` | `acoustics.test.js` |
| Acoustic zones, filtering for submerged spaces, dynamic mixing | **Built on foot.** `src/audio/zones.js` reads the zone from the map where you stand: a narrow run between walls is a tiled corridor, a wide floor or a pool hall is a hall, a smaller enclosed space is a room, the roof is dry; the reverb follows once the zone has held for 0.8 s (the rooms are acoustics.js's, by Sabine). With your head under the water (held by a Floater, the Undertow, a rope) everything goes through the low-pass and the music and ambience nearly go. A line on screen pulls the music to 45% and the ambience to 60%; a fight thins the ambience. On the raft each section already had its own space and muffle. The corridor zone is unit-tested only: the Wave Hall used by the browser check has rooms and a hall but no corridor. Not judged by ear. **Not built:** sound through vents. | `src/audio/zones.js`, `src/audio/audio.js`, `src/explore.js`, `src/main.js` | `zones.test.js`, `drift.cjs` |
| Threats audible through walls and vents | Partly: occluded sounds still play. No vent paths. | | |

## Section 8: interface

| Recommendation | Status |
|---|---|
| Essential layer (health, aim, urgent, threat feedback) | Already there: health shows only when hurt, damage arcs, hit markers, one urgent line. |
| Contextual layer (raft, tools, objectives, crew) | Partly there: three HUD modes, crew roster, raft gauge. |
| Investigative layer (records, counts, routes, reached through inspection) | **Partly built.** The pause journal holds the crew's observations, the facility's records, the route map and now **FIELD NOTES** (`src/fieldnotes.js`), which holds two things. **Readings**, reached through inspection: when the beam has read something (a depth marking, a figure in the water, a shelter, the Lifeguard's rule, grout, the reflected sensor, and now every sign), the reading enters the notes once; reading it again adds a line only if it says something different, so a sign read before and after high Drift changed it keeps both versions. **Counts**: every time the Attendant addresses you by number, what it said beside how many of you there were. Both newest first, nothing marked. The Headcount and the survey map exist alongside. **Not built:** one view that ties records, counts and routes together. | `src/fieldnotes.js`, `src/ui.js` | `fieldnotes.test.js`, `gate.cjs` |
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

- The Attendant running procedures other than waits, directions and locks; the Attendant on the raft.
- The two newest director signals, and the habit weighting, on the raft.
- The last of the audit's Drift effects: corridors that change.
- A controller-first usability pass judged by a person on real controllers (the tests use an emulated pad).
- The loop restructured around water flow, with a consequence stage at every dock.
- A lighting style on the raft; the architectural credibility pass; water that breaks the facility's rules.
- Sound through vents.
- The rest of the investigative layer: one view over records, counts and routes.
- The 12–18 minute reference chapter sequence.
- Narrative changes (Crew Seven, the facility anticipating you).
- GPU budgets on reference hardware; every item of the vertical-slice gate.
