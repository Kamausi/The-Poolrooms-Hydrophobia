---
name: release
description: Produce a playable UNDERFLOW build for the user (the single HTML file and the source). Use when the user asks for the updated file, the HTML, a build, or the source files.
---

# Release build

1. `npm test` must pass. Fix failures first; do not ship around them.
2. `npm run build:single` writes `dist/UNDERFLOW.html` (script and styles inlined; fonts still load from Google Fonts).
3. `node tests/single.cjs` confirms the file opens from disk and starts a ride.
4. Copy `dist/UNDERFLOW.html` to the scratchpad and send it with SendUserFile (`display: attach`). If the user asked for source files, send the changed files under `src/`, `docs/`, `index.html` and `package.json`.
5. Say what changed since the last build, and what is still unverified.
