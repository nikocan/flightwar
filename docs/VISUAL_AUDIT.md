# Visual Asset Audit & Asset Acquisition List

_Last updated: v0.2.0 (2026-11-03). Screenshots compared at 1280×720, iPhone 15 Pro landscape (852×393) and iPhone SE landscape (667×375)._

## 1. Audit — current state

| Asset / system | Implementation | Classification |
|---|---|---|
| Player aircraft (Falcon X1) | Procedural geometry (`aircraftModel.ts`) | **Must be replaced** → `player_falcon_x1.glb` |
| Boss mothership | Procedural geometry (`enemyModels.ts`) | **Must be replaced** → `boss_mothership.glb` |
| Enemy drone / fighter / bomber | Procedural geometry | **Must be replaced** (lower priority) |
| Terrain | Procedural shader heightfield, no textures | **Requires improvement** (needs PBR rock/grass texture sets + cliff meshes) |
| Sky / fog | Gradient sky shader + fog, sunset & day themes | Requires improvement (HDRI supported once supplied) |
| Waterfalls / clouds / islands | Procedural shader planes / sprites | Requires improvement |
| Lighting | Hemisphere + sun + rim, **IBL from baked sky (new)**, ACES | Production-ready foundation |
| Post-processing | **Bloom + colour grade + ACES output + adaptive DPR (new)** | Production-ready foundation |
| Projectiles / particles | Instanced, pooled, additive | Production-ready foundation; needs texture flipbooks for AAA explosions |
| HUD / menus | React + CSS, Turkish, safe-area aware, touch HUD (new) | Production-ready (iterating) |
| Asset loading pipeline | **GLTFLoader + Draco + Meshopt + KTX2 + RGBE, manifest, LOD, fallbacks (new)** | Production-ready |

**Repository contents:** no 3D model, HDR or texture files exist. The sandbox could not download CC0 assets
(`api.polyhaven.com` and `kenney.nl` are blocked by the environment's network policy).
Procedural models remain only as **fallbacks** so the game is always playable; they are not the final art.

## 2. How to add a model

1. Put the file in `apps/client/public/models/` with the filename from `src/game/assets/manifest.ts`.
2. Follow the node naming conventions in `apps/client/public/models/README.md` (`engine_*`, `turret_*`, `reactor`, …).
3. Reload — the console prints an `[assets]` report showing `loaded` / `missing` for each entry.

## 3. Asset acquisition list

All assets: **original commission, CC0, or a commercial licence that allows use in a distributed game (web + iOS/Android)**, including modification. No "editorial only" or non-commercial licences. Keep the licence file next to each asset.

| # | File | Asset | Visual characteristics | Format | Textures (PBR, metal/rough workflow) | Polygon budget (triangles) | Animation | Priority |
|---|---|---|---|---|---|---|---|---|
| 1 | `player_falcon_x1.glb` (+ `_lod1`) | Player futuristic fighter | White body, metallic blue panels, red accents & wingtip lights, 3 engine nozzles (`engine_0..2`), cockpit glass, panel lines, under-wing weapon mounts (`muzzle_*`) | GLB, Draco or Meshopt compressed | 2048² baseColor, normal, ORM (occlusion/roughness/metallic), emissive; KTX2 (UASTC normal, ETC1S colour) | LOD0 25–40k, LOD1 8–12k | Optional: landing-gear retract, flaps/ailerons (`aileron_L/R`), canopy | **1** |
| 2 | `boss_mothership.glb` | Academy Guardian battleship | Massive layered armoured hull, multiple wing structures, red central reactor (`reactor`), 6–10 turrets (`turret_*`), thrusters (`engine_*`), drone launch bays, red emissive strips | GLB compressed | 4096² or 2× 2048² sets: baseColor, normal, ORM, emissive | 60–120k (single LOD; always distant) | Turret yaw (code-driven via names), bay doors open/close clip, damage-state clip optional | **2** |
| 3 | `sky_sunset_2k.hdr` | Sunset HDRI | Warm sunset, purple/blue zenith, clouds | Radiance .hdr, 2k | — | — | — | **3** |
| 4 | `textures/rock_*`, `grass_*` | Cliff & ground materials | Layered sedimentary rock, mossy grass | 2048² JPG/KTX2 (albedo, normal, roughness, AO) | — | — | — | 4 |
| 5 | `env_cliff_set.glb` | Canyon cliff kit (6–10 modular pieces) | Vertical rock cliffs, ledges for waterfalls, vegetation clumps | GLB | 2048² trim-sheet | 5–15k per piece, instanced | — | 4 |
| 6 | `env_base_set.glb` | Military installations | Towers, bridges, landing pads, radar dishes, banners | GLB | 2048² trim-sheet + emissive | 3–10k per piece | Radar dish spin (`spin_*`) | 5 |
| 7 | `enemy_fighter.glb`, `enemy_scout_drone.glb`, `enemy_bomber.glb` | Enemy craft | Dark gunmetal + red emissive, aggressive silhouettes | GLB | 1024² sets | 4–10k each | Rotors (`rotor_*`) for drones | 5 |
| 8 | `fx/explosion_flipbook.ktx2`, `fx/smoke_flipbook.ktx2` | VFX flipbooks | Stylised (non-graphic) fire/smoke, 8×8 frames | KTX2 / PNG | — | — | Flipbook | 6 |
| 9 | Final level: `space_station.glb`, `asteroid_set.glb`, `planet_*.png`, `nebula_skybox` | Space environment (Phase 9 of the brief) | — | GLB / KTX2 cubemap | 2048² | 10–30k per station, instanced asteroids 0.5–2k | Station ring spin | 7 |

Mobile budget (iPhone, 60 FPS target): total on-screen ≤ 300k triangles, ≤ 150 draw calls, texture memory ≤ 256 MB (KTX2 compressed).

## 4. Completed vs missing

**Completed (verified with screenshots):** asset pipeline with fallbacks (verified end-to-end with temporary test GLBs, then removed), IBL reflections, bloom/colour grade/ACES, adaptive resolution, mobile touch HUD with safe areas.

**Missing (blocked on assets above):** detailed aircraft, detailed mothership, realistic terrain materials and cliff geometry, HDRI sky, AAA explosion flipbooks, space level art.
