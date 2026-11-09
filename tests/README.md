# Tests

Headless Chromium (software GL, `?quality=low`) driving the game through its DEV hooks. They check state, not feel: aim, readability, tension and comfort need people (see the playtesting protocol in `docs/PRODUCTION.md`).

| File | Checks | Time |
|---|---|---|
| `unit/*.test.js` | Vitest, no browser: director phases, omen holds, busy delays spawns, rng determinism, hull chambers, facility memory authoring | instant |
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
