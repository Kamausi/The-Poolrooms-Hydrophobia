# 0003 · Between-expedition authoring is deterministic and rule-based

**Decision.** `authorExpedition` in `memory.js` proposes each expedition's variations from the facility's memory with fixed rules, validates every map with `playable()`, falls back to the last accepted map and then to the base map, and stores the result with the expedition.

**Why.** A retry must see the same world, and every variation must be playable before anyone enters it. A model that proposes rooms between expeditions fits behind this code, not instead of it: the pipeline would feed accepted variations in, and the validation and fallback stay the same. See `WORLD_MEMORY.md`.

**What would change it.** A reviewed content pipeline (proposals, automated playability tests, human review of batches, a cache served ahead of play). Live generation during a session is ruled out by the memory contract.
