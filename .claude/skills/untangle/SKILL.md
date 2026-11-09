---
name: untangle
description: A whole-codebase refactor so changes land in one place and break less silently. Run only when the user asks for it, optionally naming an area (for example ride.js).
disable-model-invocation: true
---

# Untangle

Adapted from the `untangle-codebase` skill in caldoai/skills (MIT licence), fitted to this repo.

1. **Ask** which extras to include: removing comments that only restate code; removing tests that could not catch a real bug and fixing tests that fail without one. Do only the chosen extras.
2. **List every problem, changing nothing yet.** For each pair of pieces ask "should these change together?" Classify: hidden links (two places that must agree but nothing says so, e.g. a sector index used as a key in three files), needless links (a module reaching into another's state), surplus (dead code, duplicate helpers). Record every special case: an `if` for one sector or value, a parameter for one caller, a swallowed exception, a retry or timer, a disabled check.
3. **Redesign from first principles.** Look for the one change behind several problems; do not fix special cases one by one. Write each decision above the problems it solves, in a decision log under `docs/decisions/`.
4. **Fix everything on the list.** In this repo the likely seams are `ride.js` (track placement, encounters, hull, crew) and `explore.js` (dock kinds, remembered payoffs). Keep behaviour identical apart from bugs the refactor fixes.
5. **Check and repeat.** `npm test` and `npm run test:balance` must give the same results as before; then search again for problems worth fixing. Stop when a typical change lands in one place, nothing imports anything more volatile than itself, and as few special cases remain as possible.
