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
| `src/lightpool.js` | Reuse a small pool of dynamic lights for flashes | Our own slot rule and fade |
| `src/voicepool.js` | Priority-based voice stealing | Our own priorities and limits |
| `src/bench.js`, `?show=` | Benchmark and showcase modes | Our own report and scenes |

If Saltline source is ever brought in, record here which file it came from, who generated it, and the terms it is used under, before any of it is copied.

### The Saltline HTML (13 November 2026)

A copy of the built Saltline page (`Saltline_Copy.html`, one bundled file) was provided. It bundles Three.js r180 (MIT, © the three.js authors) alongside game code whose author has not been confirmed, so it is treated as a **behavioural reference only**: its enemies' perception behaviour was read to see what it does (modes patrol, investigate, search and engage; after about 1.5 s unseen an engaged enemy heads for the last-known point; investigating and searching enemies circle that point; mode timers hand them back). No code, shader, value table or text from the file is copied into UNDERFLOW; Three.js is not used.

| UNDERFLOW module | Behaviour observed | What we wrote |
|---|---|---|
| `src/pursuit.js` | Losing a target sends an enemy to its last-known point and then to a search around it | Our own eight-mode cycle (unaware, suspicious, investigate, observe, warn, pursue, search, return), per-entity timing, and the rule that an entity never reads your real position after losing you |

If any Saltline code is ever reused directly, first establish who generated it and under what terms, separate the Three.js parts (MIT, keep its notice), and record each copied block here.
