# 0006 · Engineering foundation before engine changes

## Context

A repository audit found CI failing: the browser tests require `playwright`, which was not declared, and CI never installed a browser. It also recommended TypeScript, unit tests, splitting `ride.js` and `explore.js`, deterministic replay, IndexedDB, a simulation worker, WASM where profiling justifies it, an asset pipeline (glTF, KTX2, meshopt), and an authoritative server for four-player co-op.

## Decision

Keep 67js and Vite. Strengthen what surrounds them, in this order, each pass measured before the next:

1. **Foundation (done in this pass).** Playwright pinned and declared; CI installs Chromium and runs typecheck, unit tests, build and the browser tests on Node 20 and 22 (Node 18 dropped: Playwright and Vitest need 20). Vitest unit tests for pure modules (`tests/unit/`). `tsc` checks JavaScript file by file through `tsconfig.json`, starting with director, maths, hull, memory, track, plans and sectors; files join the list as they are typed. TypeScript source files can follow once shared state types exist.
2. **Code architecture.** Shared state and event types; split `ride.js` and `explore.js` into simulation and presentation modules; one seeded random stream per system; record seed and input for replays.
3. **Assets and rendering.** glTF/GLB with validation, meshopt, KTX2; screenshot baselines for canonical scenes; per-tier budgets in CI.
4. **Parallel simulation.** Move the director, entity AI and navigation into a worker once a profile shows the main thread is the limit. Rapier or a small Rust core only for measured hot spots or for code the server must share.
5. **Online.** Authoritative server over WebSocket, snapshots and interpolation, WebRTC voice.
6. **Persistent world service.** Facility memory moves server-side behind the same validation (`playable()` today).

## Not done, and why

- No WASM yet: the last profile measured about 1.1 ms median CPU per frame on the raft (`docs/PRODUCTION.md`); nothing is waiting on it.
- Persistence is still `localStorage`; IndexedDB comes with the save-schema work in pass 2.
- No server: single-player with an AI crew is the shipped mode.
