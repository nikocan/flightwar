import * as THREE from 'three';

/** Procedurally generated textures (no external image assets). Cached per page. */
const cache = new Map<string, THREE.Texture>();

function canvasTexture(key: string, size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void): THREE.Texture {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, tex);
  return tex;
}

/** Soft radial glow — used for engine glows, particles and fake bloom halos. */
export const glowTexture = () =>
  canvasTexture('glow', 128, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.2, 'rgba(255,255,255,0.75)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.18)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });

/** Fluffy cloud puff built from overlapping soft circles. */
export const cloudTexture = () =>
  canvasTexture('cloud', 256, (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 26; i++) {
      const x = s * (0.22 + rnd() * 0.56);
      const y = s * (0.38 + rnd() * 0.3);
      const r = s * (0.1 + rnd() * 0.17);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const shade = 235 + Math.floor(rnd() * 20);
      g.addColorStop(0, `rgba(${shade},${shade},255,0.55)`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  });

/** Crosshair reticle. */
export const reticleTexture = () =>
  canvasTexture('reticle', 128, (ctx, s) => {
    ctx.strokeStyle = 'rgba(120,230,255,0.95)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s * 0.32, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 6;
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      ctx.beginPath();
      ctx.moveTo(s / 2 + Math.cos(a) * s * 0.38, s / 2 + Math.sin(a) * s * 0.38);
      ctx.lineTo(s / 2 + Math.cos(a) * s * 0.48, s / 2 + Math.sin(a) * s * 0.48);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, 4, 0, Math.PI * 2);
    ctx.fill();
  });

/** Target-lock brackets. */
export const lockTexture = () =>
  canvasTexture('lock', 128, (ctx, s) => {
    ctx.strokeStyle = 'rgba(255,80,110,1)';
    ctx.lineWidth = 7;
    const m = s * 0.12;
    const l = s * 0.24;
    const corners: [number, number, number, number][] = [
      [m, m, 1, 1], [s - m, m, -1, 1], [m, s - m, 1, -1], [s - m, s - m, -1, -1],
    ];
    for (const [x, y, dx, dy] of corners) {
      ctx.beginPath();
      ctx.moveTo(x + dx * l, y);
      ctx.lineTo(x, y);
      ctx.lineTo(x, y + dy * l);
      ctx.stroke();
    }
  });

/** Ring used for shockwaves and the boss safe-gap marker. */
export const ringTexture = () =>
  canvasTexture('ring', 128, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, s * 0.3, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.7, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.85, 'rgba(255,255,255,0.5)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });

/** Ringed gas-giant planet for the dusk sky. */
export const planetTexture = () =>
  canvasTexture('planet', 256, (ctx, s) => {
    const r = s * 0.3;
    const g = ctx.createRadialGradient(s * 0.42, s * 0.4, r * 0.1, s / 2, s / 2, r);
    g.addColorStop(0, '#d9c8ff');
    g.addColorStop(0.6, '#7d6bc9');
    g.addColorStop(1, '#2a2160');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.25;
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 ? '#ffffff' : '#3a2a80';
      ctx.fillRect(s / 2 - r, s / 2 - r * 0.6 + i * r * 0.22, r * 2, r * 0.08);
    }
    ctx.globalAlpha = 0.8;
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = '#cfc3ff';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(s / 2, s / 2, r * 1.6, r * 0.32, -0.35, 0, Math.PI * 2);
    ctx.stroke();
  });

/**
 * Laser bolt (sheet "Lazer Atışı"): white-hot rounded head, coloured glow, tapering comet tail.
 * Drawn white so per-instance colour tints it (cyan for player, red/orange for enemies).
 */
export const boltTexture = () =>
  canvasTexture('bolt', 128, (ctx, s) => {
    const w = s;
    const h = s;
    ctx.clearRect(0, 0, w, h);
    // Soft outer glow along the whole bolt
    for (let i = 0; i < 3; i++) {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.15, `rgba(255,255,255,${0.18 + i * 0.1})`);
      g.addColorStop(0.35, `rgba(255,255,255,${0.12 + i * 0.08})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      const bw = w * (0.62 - i * 0.18);
      ctx.beginPath();
      ctx.ellipse(w / 2, h * 0.42, bw / 2, h * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Bright core with tapering tail
    const core = ctx.createLinearGradient(0, h * 0.08, 0, h * 0.95);
    core.addColorStop(0, 'rgba(255,255,255,1)');
    core.addColorStop(0.3, 'rgba(255,255,255,0.95)');
    core.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.moveTo(w / 2, h * 0.06);
    ctx.quadraticCurveTo(w * 0.66, h * 0.12, w * 0.6, h * 0.3);
    ctx.lineTo(w / 2, h * 0.96);
    ctx.lineTo(w * 0.4, h * 0.3);
    ctx.quadraticCurveTo(w * 0.34, h * 0.12, w / 2, h * 0.06);
    ctx.fill();
  });

/** Fluffy cartoon puff (sheet "Patlama Efektleri"): several overlapping soft circles. White, tinted per particle. */
export const puffTexture = () =>
  canvasTexture('puff', 128, (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    const blobs: [number, number, number][] = [[0.5, 0.5, 0.3], [0.33, 0.42, 0.2], [0.66, 0.4, 0.21], [0.4, 0.66, 0.19], [0.64, 0.64, 0.2], [0.5, 0.3, 0.18]];
    for (const [x, y, r] of blobs) {
      const g = ctx.createRadialGradient(x * s - r * s * 0.3, y * s - r * s * 0.3, 0, x * s, y * s, r * s);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.75, 'rgba(235,235,235,1)');
      g.addColorStop(1, 'rgba(210,210,210,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x * s, y * s, r * s, 0, Math.PI * 2);
      ctx.fill();
    }
  });
