# 3D models

Drop production GLB files here using the exact filenames listed in
`apps/client/src/game/assets/manifest.ts` (e.g. `player_falcon_x1.glb`, `boss_mothership.glb`).
The game loads them automatically; if a file is missing it falls back to the procedural placeholder.

Node naming conventions the game understands (case-insensitive prefixes):

| Prefix | Used for |
|---|---|
| `engine_` / `nozzle_` | Exhaust position: flames, glow and trails are attached here (the node's -Z/+Z axis is ignored; exhaust points +Z = backwards) |
| `light_` | Wingtip / navigation lights (kept emissive, pulse) |
| `turret_` | Rotates around its local Y axis (boss turrets) |
| `rotor_` / `spin_` | Spins around its local Z axis |
| `reactor` / `core` / `weakpoint` | Pulses; flashes when damaged |
| `muzzle_` | Weapon mount positions |

Orientation: model forward along -Z, up +Y, 1 unit = 1 metre. Any animation clips in the file are played in a loop.
See `docs/VISUAL_AUDIT.md` for the full asset specification.
