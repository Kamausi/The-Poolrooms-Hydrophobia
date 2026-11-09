---
name: balance
description: Measure UNDERFLOW difficulty with the competent-player bot and tune it. Use when changing damage, spawns, encounters, hull or crew help, or when asked whether an attraction is too hard.
---

# Balance with the bot

The DEV bot (`window.__ride.bot = true`) aims at the nearest Bloom, fires, patches, swims back, shoves climbers, shoots Ballast and uses dressings. It does not brace, look back or dodge on purpose. It replaces guessing, not playtesting.

1. Run `npm run test:balance`. Note each attraction's lowest health and raft condition.
2. Compare with the table under "Balance, measured with a competent-player bot" in `docs/PRODUCTION.md`.
3. When an attraction is out of range, find what hurt: `tests/balance.cjs` reports the cause on failure; for a breakdown by source, play the attraction in the dev build and copy the playtest log from the pause menu (COPY PLAYTEST LOG): its summary lists total damage per source.
4. Tune one cause at a time in `src/ride.js` or `src/plans.js`, re-run, keep the change only if it moves the number for the stated reason.
5. Update the table and the "Tuning that got there" list in `docs/PRODUCTION.md` with measured numbers, before and after.
