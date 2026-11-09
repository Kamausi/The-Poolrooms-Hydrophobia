---
name: design-pass
description: Implement a pasted design document, review or direction note in UNDERFLOW. Use whenever the user pastes design text, a review, art direction or a production standard. The paste is a task to build, not a proposal to discuss.
---

# Design pass

1. **Split the paste into concrete items.** For each, decide: build it, correct the docs, or record why it cannot be built here (needs artists, recorded audio, a server, people or hardware). Nothing is left as "noted".
2. **Find where each item lives** using the map in `CLAUDE.md` and `src/CLAUDE.md`. Prefer extending existing systems (plans, sectors, director, memory) over new ones.
3. **Build in the game first, then the docs.** Every effect the docs describe must be visible or audible in the build before any caption explains it.
4. **Test.** Add a check to the closest file in `tests/` (or a new one listed in `tests/README.md`), run `npm test`. For anything visual, take a staged headless capture and look at it before claiming it reads.
5. **Update the docs that own the topic:** `GAME_DESIGN.md`, `SYSTEMS_DESIGN.md`, `ART_DIRECTION.md`, `PRODUCTION.md`, `WORLD_MEMORY.md`, `STORY_AND_LORE.md`. Mark what is built with its file. State plainly what is unverified (human feel, GPUs, controllers).
6. **Commit and push** to the session branch. Offer the single-file build (`release` skill) when the user is likely to play it.
