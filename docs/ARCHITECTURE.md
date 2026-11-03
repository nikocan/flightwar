# Architecture

- **Simulation (`packages/shared/src/sim`)** — `GameWorld` advances in fixed 1/60 s steps (`FixedStepLoop`), uses a seeded RNG (deterministic), object-pooled projectiles, a spatial hash broad phase and swept sphere collision. It emits typed `GameEvent`s and never touches the DOM or Three.js, so the Phase 5 authoritative server can run the same code.
- **Config (`packages/shared/src/config`)** — aircraft, weapons (1–10 upgrade ladder), enemies, boss rules, power-ups, missions, difficulty. All tunable numbers live here.
- **Progression (`packages/shared/src/progression.ts`)** — stars, rewards, XP/levels.
- **Client (`apps/client`)** — `GameController` runs the loop, samples input (keyboard/mouse/touch), turns events into VFX/audio/HUD and drives the camera. Renderers are imperative Three.js classes (instanced projectiles & particles, pooled enemy meshes) hosted inside React Three Fiber. HUD reads a throttled Zustand snapshot (~12 Hz).
- **Assets (`apps/client/src/game/assets`)** — GLB/GLTF manifest + loader with procedural fallbacks (see `docs/VISUAL_AUDIT.md`).
- **Persistence** — guest profile in `localStorage` (Phase 6 moves rewards to the server; the client is not trusted).
