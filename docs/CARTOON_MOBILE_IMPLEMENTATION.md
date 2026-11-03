# Sky Force Evolution — 2.5D mobile art integration

## Current implementation (experimental)
- Falcon X1 original transparent SVG art at `apps/client/public/game-assets/aircraft/falcon-x1.svg`.
- Shadow Commander original transparent SVG art at `apps/client/public/game-assets/bosses/shadow-commander.svg`.
- Three.js world-space planes for these sprites, preserving the existing simulation, weapons, movement and HUD code.
- Changes are isolated in `feature/cartoon-25d-art-foundation`.

## Important: not a finished game
The supplied image is a **composite art direction sheet**, not an animation atlas or individually licensed sprite package. The two newly authored SVGs are **first-pass prototypes**, not a faithful reproduction of the detailed supplied image. No gameplay build, iPhone device test, frame-rate test, or visual screenshot verification has been performed for this branch.

## Remaining work before a mobile release
1. Produce production-quality separate aircraft sprites for all eight aircraft, plus enemies and three boss phases; confirm consistent view angle, transparent edges, resolution, and animation frames.
2. Build independent, seamless parallax sky, mountains, waterfalls, river, bridge and trees; do not stretch the composite reference sheet.
3. Integrate weapon and explosion atlases with actual simulation state, including muzzle positions, hit effects, shields and power-ups.
4. Review boss size and rotation against the actual camera, as well as enemy collisions and effects.
5. Verify hangar display and player in-game sprite placement; add explicit asset-load failure handling.
6. Audit landscape touch controls, safe areas, multitouch, pause/resume, orientation and accessibility.
7. Add unit/integration tests, run production build, capture representative iPhone screenshots and profile on real devices.
8. Add iOS packaging/signing and App Store privacy/age-rating requirements only after web gameplay is stable.

## Testing checklist
- `npm install` (or repository package manager)
- `npm run build` / repo-specific checks
- Start game in iPhone landscape emulation and inspect Falcon X1 and boss.
- Check shooting, damage, collision, power-up collection, pause and mission completion.
- Test both low and high DPI devices, with reduced motion and audio muted.
- Do not merge to main until screenshots and functional tests pass.
