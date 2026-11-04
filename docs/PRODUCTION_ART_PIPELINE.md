# Sky Force Evolution — Production Art Pipeline (iPhone landscape)

## Visual target
The approved art direction is a vibrant, soft-edged, richly detailed 2.5D cartoon shooter. **Do not use a single composite image as gameplay scenery** and do not claim that SVG placeholder aircraft match the target.

## Asset delivery contract
- Player aircraft: 8 independently exported RGBA sprites, consistent rear/top 3-quarter view, nose pointing up, 1024×1024 source; in-game LOD 256–512 px. Preserve separate engine glow and shadow layers.
- Enemies: scout, fighter, bomber, shield drone, elite fighter, kamikaze, each 512–1024 px transparent.
- Boss: separate fuselage, wings, engine glow, reactor core, shield and damage-state layers; 2048 px source, 1024 px runtime; three visible phases.
- Environment: separately authored seamless sky, distant mountains, cliffs, river surface, waterfalls, trees, bridge, towers, and foreground foliage; 2–4 parallax speeds. Tile boundaries must match.
- Effects: separate transparent atlases for laser, triple laser, charged laser, missile, plasma, lightning, explosions (8–12 frames), shields, pickups, and thrusters.
- HUD: native responsive UI, not text baked into the scenery. Turkish localization and landscape safe-area insets.

## Rendering acceptance
1. Keep the reference art as visual specification, not runtime texture.
2. Use pre-exported transparent PNG/WebP atlases with proper premultiplied alpha handling; verify iOS Safari support.
3. Size assets in screen pixels at 852×393 and 1179×2556 equivalent landscape resolutions; use consistent orthographic/frustum scale.
4. Avoid bloom overexposure and desaturation. Verify SRGBColorSpace, tone mapping and texture filtering.
5. Keep art assets independent from hitboxes, gameplay AI and projectile collision.
6. Pool effects and enemies. Avoid loading new textures during combat.
7. Provide screenshots of actual gameplay for each acceptance milestone; compare to reference side-by-side.

## First milestone: Waterfall Canyon boss scene
- [ ] Player Falcon X1 has authored high-detail sprite, distinct engines, bank animation and muzzle positions.
- [ ] Purple Shadow Commander has high-detail multi-layer art, core glow and damage states.
- [ ] River and waterfall layers scroll seamlessly with visible foam.
- [ ] Laser and missile effects originate from correct world coordinates.
- [ ] Pickups have animation and actual effects.
- [ ] HUD remains readable and touch targets accessible on iPhone landscape.
- [ ] Build, tests and browser screenshots pass; device FPS is measured.

## Workstream separation
Claude Code owns engine integration, optimization and verification. Art assets must be individually exported and reviewed before integration. A generated mockup or composite illustration is **not** a finished sprite pack.

## Release discipline
Do not merge until screenshots and automated checks pass. Keep all development isolated in a feature branch; deploy preview first, public production only after approval.
