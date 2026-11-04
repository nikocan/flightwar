# Mobile 2.5D Art — Visual Acceptance Checklist

This checklist is for the live game, not for static mockups. The artwork reference is a design target, not an automatically available production sprite atlas.

## Camera and placement
- [ ] Falcon X1 is fully visible in flight at the intended camera pitch and remains visible while banking and dashing.
- [ ] Boss is visible in its entirety at spawn, attack and retreat positions.
- [ ] Scout Drone is visible in all wave positions.
- [ ] Sprite facing is validated from the **actual camera**. Avoid assuming that a PlaneGeometry rotated into XZ faces the camera.
- [ ] The nose points in the gameplay travel direction. Never flip the whole sprite to compensate for reversed UVs without checking.
- [ ] Shadows, shields and engine trails align with the visible aircraft.
- [ ] Boss hitbox and visual bounds are checked independently; visual scale must not silently change collision behavior.

## Rendering
- [ ] Transparent edges are clean, with no dark/white halos.
- [ ] Textures retain saturated white/red/blue/purple colors under the actual renderer.
- [ ] SVG loading is verified on Safari iOS. Use pre-rasterized WebP/PNG atlas if device compatibility or performance is poor.
- [ ] No missing asset silently falls back to the old geometric model.
- [ ] No sprites are obscured by terrain or river depth sorting.

## Touch and performance
- [ ] Test iPhone landscape safe areas, both notch orientations and home indicator.
- [ ] Left thumb movement and right thumb fire/missile work simultaneously.
- [ ] Gameplay never scrolls or zooms the web page.
- [ ] Test pause/resume, tab backgrounding and audio unlock.
- [ ] Measure actual device frame time, texture memory and draw calls.
- [ ] Record target 60 FPS and fallback behavior; do not claim achieved FPS without measurement.

## Gameplay
- [ ] Shooting, projectile impact, damage, shield, pickups, enemy spawn, boss phases, win/loss and restart are verified.
- [ ] All visible power-ups have actual gameplay effects.
- [ ] Unfinished multiplayer modes are clearly marked and do not appear playable.

## Release gate
Run typecheck, tests and production build; capture and review iPhone screenshots. Record failures and attach screenshots to the PR. Do not merge unverified rendering changes.
