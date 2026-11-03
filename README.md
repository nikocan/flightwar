# SKY FORCE EVOLUTION

Futuristic 3D arcade aircraft combat game (browser first, later Android/iOS). All player-facing text is Turkish.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # simulation unit tests (Vitest)
npm run test:e2e   # browser tests (Playwright)
```

Add `?debug=1` to the URL to expose `window.__SFE__` (test/debug hooks).

## Monorepo

| Path | Purpose |
|---|---|
| `packages/shared` | Deterministic, framework-free game simulation + all balance data (reused by the future multiplayer server) |
| `apps/client` | React + Vite + Three.js / React Three Fiber client (rendering, HUD, menus, audio) |
| `docs/` | Architecture, roadmap, visual audit |

See `docs/ARCHITECTURE.md`, `docs/ROADMAP.md` and `docs/VISUAL_AUDIT.md`.
