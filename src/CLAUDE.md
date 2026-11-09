# src/ · engine and module rules

## 67js (0.16.0, pinned in package.json)

- Part lists are fixed when a scene is built. To remove something, `hide()` it (it collapses to nothing); to move it, update its transform and call `updateParts`. Do not grow or shrink the list during play.
- Material emission must never be exactly 0; use 0.02. Zero emission breaks the shader path.
- The `liquid` material needs `import '67js/addons/liquid-shader'`, and it refracts only what is opaque and drawn before it. Anything under the channel's opaque `water` plane is invisible.
- Signs: `signMaterial` / `quad()` from `labels.js`. A sign lying flat on a floor needs `writeBasis`; the `facing()` helper is singular for a floor normal and crashes the transform.
- Colours come from the palette in `labels.js` and `sectors.js` (see `docs/ART_DIRECTION.md`). Coral only for danger, green only for recovery.

## Risky modules

- **`ride.js`**: one per-frame `update` drives track placement, encounters, hull, crew and audio cues. Encounters behind the resume point must stay marked as done (`resumeS`). Balance numbers there were measured with the bot (`docs/PRODUCTION.md`); change them only with a new `npm run test:balance` run and update the table.
- **`main.js` save/resume**: `saveResume` stores `scene.snapshot()`; resume rebuilds from a few values. Anything taken on foot must be listed in `takenState()` (explore.js) or it is handed out twice. `tests/resume.cjs` covers it.
- **`memory.js`**: keep the contract in `docs/WORLD_MEMORY.md`. Authoring reads current state, not totals. Every authored map goes through `playable()` with the fallback chain. Nothing enters the ledger except when the crew witnesses it. Remembered deaths never raise difficulty.
- **`explore.js` maps**: a new or changed map must pass `node tests/maps.mjs`.

## DEV hooks

Only in the dev build: `window.__underflow` (step, setState, beginSector, startRide, startExplore, enterSafeRoom, events, press, hold), `window.__ride` (bot, hitTarget, track, s, coop, wave), `window.__explore` (player, cellPos, panelPos, restorePower, find, center, followers). `step(n)` renders only the last frame.
