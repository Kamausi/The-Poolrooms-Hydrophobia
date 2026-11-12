# Third-party code and references

Assets (sound, textures, fonts) are tracked in `assets/registry.json` and credited in `docs/CREDITS.md`. This file is the same record for code: what came from where, under what terms, and what was only used as a reference.

## Code in the repository from elsewhere

| What | Source | Licence | Where |
|---|---|---|---|
| 67js | npm package `67js` | see `node_modules/67js/LICENSE` | dependency, not copied into `src/` |
| Playwright, Vitest, TypeScript, Vite | npm | their own licences | development only |

No other code in `src/` or `tests/` is copied from another project. Three.js is not used.

## References used without copying code

**Saltline**, a single-file browser shooter, was described to us in prose (a breakdown of its systems, its post-processing chain and its tuning values). No Saltline source has been opened, pasted or copied into this repository. The following were written for UNDERFLOW from those descriptions and from general, published techniques:

| UNDERFLOW module | Idea taken | What we wrote |
|---|---|---|
| `src/autores.js`, `src/tiers.js` | Frame-time driven render scale; drop a quality tier when the lowest scale is still too slow | Our own thresholds, windows and tier table |
| `src/exposure.js` | Eye adaptation between bright and dark spaces | Light estimated from the frame's light list, not from pixels |
| `src/postchain.js` | A post chain: lens effects, grade, FXAA, sharpen, dither | Our own GLSL, written for the 67js user-pass rules; FXAA follows the widely published FXAA 3.11 "console" structure |
| `src/pressure.js` | Attack tokens: only so many enemies may commit at once | Our own kinds, slot counts and cool-downs |
| `src/spawnscore.js` | Prefer concealed spawn points; avoid recently used ones | Our own scoring |
| `src/spring.js` | Spring-driven viewmodel motion | A standard damped spring with substeps |
| `src/bench.js`, `?show=` | Benchmark and showcase modes | Our own report and scenes |

If Saltline source is ever brought in, record here which file it came from, who generated it, and the terms it is used under, before any of it is copied.
