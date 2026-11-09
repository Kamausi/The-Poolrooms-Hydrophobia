---
name: debug
description: Find and fix an UNDERFLOW bug (a crash, a page error, a stuck state, something invisible or wrong in a scene). Use when something in the game misbehaves or a test fails.
---

# Debugging

1. **Reproduce headlessly first.** Write a short script on `tests/lib.cjs` (`open`, `newCampaign`, `check`) that reaches the state through the DEV hooks (`beginSector`, `startRide`/`startExplore`, `setState`, `step`, `press`). Collect page errors. A bug that isn't reproduced isn't fixed.
2. **Check the usual suspects** (`src/CLAUDE.md`):
   - a stale 67js in the Vite cache: `rm -rf node_modules/.vite`, then `npx vite --force`;
   - a singular transform from a flat sign (use `writeBasis`);
   - emission set to exactly 0;
   - something under the opaque water plane, or a `liquid` material without its addon import;
   - a part list changed during play instead of hidden.
3. **For state bugs, find who wrote it.** Grep for the field across `main.js`, `ride.js` and `explore.js`, and check `freshState()`, resume (`takenState`, `resumeS`) and the retry path in `die()`.
4. **For visual bugs, look.** Take a staged screenshot (`page.screenshot`) at the moment and read it. Software GL is slow: give screenshots a long timeout, and note that `step(n)` renders only its last frame.
5. **Fix the cause, not the symptom.** Keep the reproduction as a check in the closest test file and run `npm test`. Add the cause to `src/CLAUDE.md` if it could happen again.
