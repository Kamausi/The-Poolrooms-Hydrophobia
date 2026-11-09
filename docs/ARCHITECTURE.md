# UNDERFLOW · Architecture

How the code is put together. For what the game is, read `GAME_DESIGN.md`; for the rules of a module, `src/CLAUDE.md`.

## One state, one scene at a time

`main.js` owns a single `state` object: the crew, health, hull, Drift, supplies, sector, route choices, pending rescues and the accepted world for this expedition. `freshState()` builds it.

At any moment there is exactly one **scene**: the menu corridor, a ride, an on-foot dock or a Safe Room. Each is a factory: `createRide` and `createExplore` take `(canvas, state, sector, events, opts)`; `createSafeRoom(canvas, sector, opts)` and `createMenuScene(canvas)` take less because they change nothing. Every scene has `update(dt)` and `dispose()`; the ride and the dock also have `snapshot()` for resume. `swap(next)` disposes the old scene and builds the new one. Scenes read and write `state` directly and report anything the rest of the game must know through `events`: damage, moor, board, death, rescue, position, interest and so on.

```
menu ──start──▶ beginSector ─▶ startRide ──moor──▶ startExplore ──board──▶ startRide ─▶ … bay ─▶ enterSafeRoom ─▶ nextSector
                    ▲                                                                                   │
                    └──────────────────────────────────────── retry (same accepted world) ◀── die ◀──────┘
```

## The frame

`frame()` in `main.js` runs on `requestAnimationFrame` and does these steps in order:

1. Frame-time statistics, the performance overlay, and a sample in the playtest log every minute.
2. Polling the gamepad.
3. Pause.
4. `scene.update(dt)`, with dt capped at 50 ms and an optional 30 FPS cap.
5. Music, from the director's phase and Drift.

Rendering happens inside each scene's update, through 67js.

## Content as data

- `sectors.js`: the eight attractions and the reference chapter. Each sets its palette, dock kind, map and Attendant lines.
- `plans.js`: turns a sector into a track plan, a list of sections (channel, hall, reservoir, wave pool, flume, bay) with encounters and exits.
- `track.js`: turns a plan into geometry along a distance `s`.
- `director.js`: paces threats during play from the crew's condition. It is a busy budget, not a script.

## Persistence

| Key | Holds | Written by |
|---|---|---|
| campaign checkpoint | the state at the last Safe Room | `saveCheckpoint` |
| resume | position inside a sector, every ~3 s and on pause/quit/hide/context loss | `saveResume` from `scene.snapshot()` |
| `underflow-facility` | the facility's memory and the crew's ledger across expeditions | `memory.js` |
| `underflow-playlog` | the local playtest log | `playlog.js` |
| settings | bindings and options | `settings.js` |
| endless records | best depth, score and discoveries per endless seed | `recordEndless` in `main.js` |
| crew loop memory | what the crew remembers of earlier loops | `crew.js` |
| tips | first-time tips already shown | `ride.js` |

Everything stays in the browser. There is no server.

## Where the cost is

The CPU cost is measured in `PRODUCTION.md`: about 1.1 ms median on the raft and 0.1–0.2 ms on foot. Almost all of it is `ride.js`'s per-frame placement along the track and its entity updates. GPU cost has not been measured on real hardware.
