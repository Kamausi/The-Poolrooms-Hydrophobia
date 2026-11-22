# Tests

Headless Chromium (software GL, `?quality=low`) driving the game through its DEV hooks. They check state, not feel: aim, readability, tension and comfort need people (see the playtesting protocol in `docs/PRODUCTION.md`).

| File | Checks | Time |
|---|---|---|
| `unit/*.test.js` | Vitest, no browser: director phases, omen holds, busy delays spawns, rng determinism, hull chambers, facility memory authoring, score and FLOW rules, column and arch placement, every map solvable, plans deterministic, the asset registry | instant |
| `maps.mjs` | Every dock map is solvable (node only, no browser) | instant |
| `smoke.cjs` | Normal maps build; the HUD hides the menu and fades the controls; all eight attractions ride to the dock, explore, restore and board | ~1 min |
| `chapter.cjs` | The Closed Wave Pool end to end | ~1 min |
| `memory.cjs` | Rescues commit at Safe Rooms; the next expedition is authored from memory; false records; the ledger stays clean | ~1 min |
| `resume.cjs` | Nothing handed out twice on foot; nothing behind the resume point fires on the raft | <1 min |
| `hud.cjs` | A grabbed teammate gets a roster entry, banner and edge marker that clear when safe; prompts name the current binding; the reticle opens into brackets at something usable; held Ping opens six callouts; the Safe Room is a three-part sheet with transactions and a premature arrival line; settings come in six categories with a preview; the journal has three tabs | ~1 min |
| `omens.cjs` | Omens on the raft: lights dying in banks, the platform, footsteps above, something beneath that can be shot | <1 min |
| `doors.cjs` | The service door held shut stops pushing and is open later; left alone, it gives; lights go out toward you and return | <1 min |
| `hunt.cjs` | Dormant Blooms fill then lunge; a hit collapses a chamber; the locker occupant; the Lifeguard wakes lamp, head, hand, pursues, grabs, is escaped by you or a crewmate, searches, comes through the service door, gives up | ~1 min |
| `dread.cjs` | Drift noticed in stages; Locker 0417 "returned"; the lucid survivor and the towel; the Wave Pool chair, display and crossing; the window aftermath | ~2 min |
| `level.cjs` | The Closed Wave Pool as a level: raised gallery, the inspection lamp, the tower moving between expeditions, drain vs bypass on foot and on the exit, a crewmate holding the diverter while the lamp leaves the tower | ~1 min |
| `uncanny.cjs` | A crewmate takes the helm and gives it back; round columns push you out; the Lifeguard's ladder rounds including the missing ladder, and being noticed; a figure performing a crewmate's habit | ~1 min |
| `score.cjs` | A kill pays, raises FLOW and shows in the feed; credit and the signal rating are unmultiplied; damage knocks FLOW down; FLOW is frozen on foot; the debrief, grade and verdict; the cabinet sells for credit; per-profile kick; a clean landing is scored | <1 min |
| `feel.cjs` | Walking ramps up and stops short; only two Blooms commit at once; hesitation rises when still and falls when moving; omens never repeat a kind twice running | ~1 min |
| `finds.cjs` | Collectibles and a power-up per dock; picking up scores and enters the ledger and is not offered again; dry pack and canister effects; the work lamp cycles, lights, drains, shows a dormant Bloom under UV, stays where it is set down, and draws uncommitted Blooms | ~1 min |
| `arcade.cjs` | A token line and FULL LINE; each facility drop does what it says when shot; one Attendant assessment a sector, paid when passed | ~1 min |
| `circuit.cjs` | The lighting relay switches main and emergency light; under emergency one wall is a doorway with a cache; it will not switch back while you stand in it; crossing it is a route found; at high Drift the signs that may change do so only while you are not looking at them, and change back the same way | <1 min |
| `render.cjs` | A tier with depth (`?quality=high`): ambient occlusion and haze with no renderer diagnostics; eye adaptation; the four post passes on high and two on medium, following Drift, health, damage and water; `?bench` reports; raft lamps in the style of their section | ~3 min |
| `systems.cjs` | The sprung viewmodel (Scatter shoves further and settles slower than Pulse); at most two spitters wind up at once; on foot only the budgeted Blooms commit; waves come in out of sight | ~2 min |
| `shows.cjs` | Every `?show=` scene sets up on the high tier and draws without errors; screenshots to `SHOW_DIR` | ~5 min |
| `audio.cjs` | Every recorded sound in `public/audio/manifest.json` loads and decodes | <1 min |
| `balance.cjs` | The competent-player bot reaches every dock; reports lowest health and raft condition | several min |
| `platform.cjs` | Browser services; save files; the save envelope and backup restore with the menu notice; time per subsystem and 1–3 steps per frame; the AgX tone curve | ~1 min |
| `mapgen.cjs` | Endless docks generated in a worker and checked as solvable | <1 min |
| `horror.cjs` | Scanning is noticed by the omens; the silence omen stops the machinery (and the wave machine), brings nothing and ends; sounds behind a wall are muffled; `?debug=ai` shows the director, habits, Attendant and entities; the Attendant's honest and false instructions and what following or ignoring each does; the Bloom that keeps coming once the burst tell has been learned | ~2 min |
| `gate.cjs` | The journal's FIELD NOTES by attraction (route first, then counts) (each instruction's guest count beside the real one, unmarked); the Attendant locks a door you opened (an honest lock shuts it, the prompt says so, it opens by itself or when you are hurt; a false one leaves it open and walking through is noticed), and holds the boarding gate: an honest closure blocks boarding and the prompt says so, being hurt opens it, a false one miscounts the guests and is not closed (you can board) | <1 min |
| `drift.cjs` | The Observer (takes a place out of view, moves when lost or approached, leaves, never hurts); footsteps that stop when you look; the sign on a spot you passed and the voice from the wrong side; the false doorway at high Drift; beam readings entering the field notes, with a sign read before and after Drift changed it; your reflection at the edge of still water (upside down, late from moderate Drift, stopping to look up at you at high Drift, gone when you look away); each fixture's light by the kind of space it hangs in; acoustic zones (each kind of space in the dock sets its own reverb), the mix stepping back for a line, and the muffle when held under; in the Filtration Works, a sound behind a wall carried to you through the ceiling vents, and a corridor you walked tiled over at high Drift (a real wall, nothing cut off) and opened again | ~3 min |
| `gamepad.cjs` | A whole session on an emulated controller and nothing else: settings (the controls listed in tiers with the controller's labels, D-pad to a slider, left/right to change it, B out), a new expedition from the menu, the raft (trigger, steering, hop, aim, stick back to brake), the Select chords (Ride Control, the helm, the maintenance override label) and dressing on Select alone, pause with Start and B, on foot with no pointer lock (walk, turn, fire, scan, lamp, Select+B to set it down, R3 map), a Safe Room left with A, and rebinding | ~4 min |
| `single.cjs` | `dist/HYDROPHOBIA.html` opens from disk, starts and carries its recorded sound (run `npm run build:single` first) | <1 min |

```sh
npm test                    # unit tests, then the quick browser set
npm run test:unit           # unit tests only
npm run typecheck           # type check (tsconfig.json lists the files)
node tests/run.mjs balance  # one test by name
UNDERFLOW_URL=http://localhost:5173 node tests/smoke.cjs   # against a server you already run
```

Long simulation-only tests advance the game with `__underflow.sim(n)`, which renders nothing: frames rendered by `step(n)` are never presented, and headless software GL keeps about 1 MB for each, enough to crash a long run. Ordinary real-time play does not grow (measured flat over 80 s).

Each test prints `ok` / `FAIL` lines and exits non-zero on a failure or any page error. Shared helpers are in `lib.cjs`.

CI (`.github/workflows/node.js.yml`) runs on Node 20 and 22: `npm ci`, `npx playwright install --with-deps chromium`, typecheck, unit tests, build, browser tests. Playwright is pinned to the version whose Chromium the cloud sessions have preinstalled.
