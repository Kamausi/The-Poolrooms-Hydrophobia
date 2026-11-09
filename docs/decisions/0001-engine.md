# 0001 · Stay on 67js until a measured bottleneck says otherwise

**Decision.** The game runs on 67js (`@codepawlhq/67js@0.16.0`, pinned). Fixed part lists, a scene made of plain data and the `water` / `liquid` / `unlit` materials cover everything the build does.

**Why.** The CPU cost per frame is about 1.1 ms on the raft (see `PRODUCTION.md`), well inside budget. 67js documents glTF skeletal animation, morph targets, animation layers and IK, which are the route to finished characters. No measurement so far points at the engine.

**What would change it.** A representative scene (animated crew, enemies, water, lights, effects, sound, UI), measured on target GPUs, that misses 16.7 ms because of the engine itself.
