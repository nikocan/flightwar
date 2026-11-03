import { useEffect, useRef } from 'react';
import { getActiveController } from '../game/GameController';

/** Top-down radar drawn on a 2D canvas at ~15 Hz (cheap, no React re-renders). */
export function Radar() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let raf = 0;
    let last = 0;
    let sweep = 0;
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (now - last < 66) return;
      const dt = (now - last) / 1000;
      last = now;
      const canvas = ref.current;
      const c = getActiveController();
      if (!canvas || !c) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const size = canvas.clientWidth;
      if (canvas.width !== size * dpr) {
        canvas.width = canvas.height = size * dpr;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const s = canvas.width;
      const r = s / 2;
      ctx.clearRect(0, 0, s, s);
      ctx.save();
      ctx.beginPath();
      ctx.arc(r, r, r - 1, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = 'rgba(6, 14, 34, 0.78)';
      ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = 'rgba(127, 232, 255, 0.25)';
      ctx.lineWidth = dpr;
      for (const k of [0.33, 0.66, 1]) {
        ctx.beginPath();
        ctx.arc(r, r * 1.55, r * 1.5 * k, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(r, 0);
      ctx.lineTo(r, s);
      ctx.stroke();
      sweep += dt * 2.2;
      const grad = ctx.createLinearGradient(0, 0, s, 0);
      grad.addColorStop(0, 'rgba(0,229,255,0)');
      grad.addColorStop(1, 'rgba(0,229,255,0.18)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(r, r * 1.55);
      ctx.arc(r, r * 1.55, s, -Math.PI / 2 + Math.sin(sweep) * 0.9 - 0.25, -Math.PI / 2 + Math.sin(sweep) * 0.9 + 0.25);
      ctx.fill();

      const w = c.world;
      const p = w.player;
      // World → radar: x ±40 across, z from +10 (bottom) to -180 (top).
      const toX = (x: number) => r + ((x - p.x) / 40) * r;
      const toY = (z: number) => r * 1.55 + (z / 180) * r * 1.5;
      for (const e of w.enemies) {
        if (!e.alive) continue;
        const boss = e.def.behavior === 'boss';
        ctx.fillStyle = boss ? '#ff3b8d' : e.id === p.lockTargetId ? '#ffffff' : '#ff6a6a';
        ctx.beginPath();
        ctx.arc(toX(e.x), toY(e.z), (boss ? 5 : 2.6) * dpr, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const u of w.powerUps) {
        ctx.fillStyle = '#3dff8b';
        ctx.fillRect(toX(u.x) - 2 * dpr, toY(u.z) - 2 * dpr, 4 * dpr, 4 * dpr);
      }
      ctx.fillStyle = '#7fe8ff';
      ctx.beginPath();
      const px = toX(p.x);
      const py = toY(p.z);
      ctx.moveTo(px, py - 6 * dpr);
      ctx.lineTo(px + 4.5 * dpr, py + 4 * dpr);
      ctx.lineTo(px - 4.5 * dpr, py + 4 * dpr);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = 'rgba(127, 232, 255, 0.5)';
      ctx.lineWidth = 1.5 * dpr;
      ctx.beginPath();
      ctx.arc(r, r, r - 1, 0, Math.PI * 2);
      ctx.stroke();
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} className="radar" data-testid="radar" />;
}
