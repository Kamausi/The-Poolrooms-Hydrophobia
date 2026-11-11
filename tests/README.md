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
| `circuit.cjs` | The lighting relay switches main and emergency light; under emergency one wall is a doorway with a cache; it will not switch back while you stand in it; crossing it is a route found | <1 min |
| `audio.cjs` | Every recorded sound in `public/audio/manifest.json` loads and decodes | <1 min |
| `balance.cjs` | The competent-player bot reaches every dock; reports lowest health and raft condition | several min |
| `single.cjs` | `dist/UNDERFLOW.html` opens from disk, starts and carries its recorded sound (run `npm run build:single` first) | <1 min |

```sh
npm test                    # unit tests, then the quick browser set
npm run test:unit           # unit tests only
npm run typecheck           # type check (tsconfig.json lists the files)
node tests/run.mjs balance  # one test by name
UNDERFLOW_URL=http://localhost:5173 node tests/smoke.cjs   # against a server you already run
```

Each test prints `ok` / `FAIL` lines and exits non-zero on a failure or any page error. Shared helpers are in `lib.cjs`.

CI (`.github/workflows/node.js.yml`) runs on Node 20 and 22: `npm ci`, `npx playwright install --with-deps chromium`, typecheck, unit tests, build, browser tests. Playwright is pinned to the version whose Chromium the cloud sessions have preinstalled.
