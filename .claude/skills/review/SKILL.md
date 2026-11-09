---
name: review
description: Review an UNDERFLOW change before committing it, against the project's own rules. Use before a commit that touches gameplay, memory, resume, visuals or docs.
---

# Review checklist

Read the diff (`git diff`), then check each point and fix what fails.

- **Docs match the build.** Every "built" claim names its file and is exercised by a test. Nothing is described that the player cannot see or hear. Unverified things (human feel, GPUs, physical controllers, refraction in motion) are called unverified.
- **Memory contract** (`docs/WORLD_MEMORY.md`): one accepted world per expedition; authoring reads current state; maps go through `playable()` and the fallback; rescues commit only at Safe Rooms; the ledger records only what the crew witnessed; deaths never raise difficulty.
- **Resume:** anything new that is taken, opened or triggered on foot is in `takenState()`; anything new on the raft respects `resumeS`. `tests/resume.cjs` passes.
- **Fairness:** every threat keeps a warning (presence → commitment → resolution, each with a sound and a caption) and counterplay. Crew status, controls and prompts never lie.
- **Look:** palette tokens only; coral only for danger, green only for recovery; no new emission brighter than the Bloom hearts; emission never 0.
- **Accessibility:** new actions are rebindable on keyboard and controller, have a caption, and do not rely on colour alone.
- **Tests:** `npm test` passes; new behaviour has a check.
- **Hygiene:** no model identifiers; no edits in `node_modules/`, `dist/`, `public/legacy/`.
