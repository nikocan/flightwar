import * as THREE from 'three';
import type { Vec3 } from '@sfe/shared';
import { glowTexture, lockTexture, reticleTexture, ringTexture } from './textures';

/** HUD-in-world effects: crosshair, lock brackets, lightning arcs and the boss safe-gap marker. */
export class FxRenderer {
  readonly crosshair: THREE.Sprite;
  readonly lock: THREE.Sprite;
  private readonly gap: THREE.Mesh;
  private readonly gapMat: THREE.MeshBasicMaterial;
  private readonly gapGlow: THREE.Sprite;
  private gapTime = 0;
  private bolts: { line: THREE.Line; mat: THREE.LineBasicMaterial; life: number }[] = [];
  private readonly disposables: { dispose: () => void }[] = [];

  constructor(private readonly scene: THREE.Scene) {
    const crossMat = new THREE.SpriteMaterial({ map: reticleTexture(), depthTest: false, transparent: true, toneMapped: false });
    this.crosshair = new THREE.Sprite(crossMat);
    this.crosshair.scale.setScalar(2.4);
    this.crosshair.renderOrder = 20;
    scene.add(this.crosshair);

    const lockMat = new THREE.SpriteMaterial({ map: lockTexture(), depthTest: false, transparent: true, toneMapped: false });
    this.lock = new THREE.Sprite(lockMat);
    this.lock.visible = false;
    this.lock.renderOrder = 21;
    scene.add(this.lock);

    this.gapMat = new THREE.MeshBasicMaterial({ map: ringTexture(), color: '#3dff8b', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide });
    this.gap = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.gapMat);
    this.gap.visible = false;
    scene.add(this.gap);
    const gapGlowMat = new THREE.SpriteMaterial({ map: glowTexture(), color: '#3dff8b', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.4 });
    this.gapGlow = new THREE.Sprite(gapGlowMat);
    this.gapGlow.visible = false;
    scene.add(this.gapGlow);

    this.disposables.push(crossMat, lockMat, this.gapMat, this.gap.geometry, gapGlowMat);

    for (let i = 0; i < 4; i++) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3 * 64), 3));
      const mat = new THREE.LineBasicMaterial({ color: '#d8b8ff', transparent: true, blending: THREE.AdditiveBlending, toneMapped: false });
      const line = new THREE.Line(geo, mat);
      line.visible = false;
      line.frustumCulled = false;
      scene.add(line);
      this.bolts.push({ line, mat, life: 0 });
      this.disposables.push(geo, mat);
    }
  }

  setCrosshair(px: number, py: number, pz: number, ax: number, ay: number, az: number, visible: boolean): void {
    // Draw the reticle 40 units out along the aim line so it stays readable.
    const dx = ax - px, dy = ay - py, dz = az - pz;
    const len = Math.hypot(dx, dy, dz) || 1;
    const d = 42;
    this.crosshair.position.set(px + (dx / len) * d, py + (dy / len) * d, pz + (dz / len) * d);
    this.crosshair.visible = visible;
  }

  setLock(target: { x: number; y: number; z: number; radius: number } | null, time: number): void {
    if (!target) {
      this.lock.visible = false;
      return;
    }
    this.lock.visible = true;
    this.lock.position.set(target.x, target.y, target.z);
    this.lock.scale.setScalar(target.radius * 3.2 + Math.sin(time * 10) * 0.3);
    this.lock.material.rotation = time * 1.5;
  }

  showGap(x: number, y: number, duration: number): void {
    this.gapTime = duration;
    this.gap.position.set(x, y, -14);
    this.gapGlow.position.set(x, y, -14);
    this.gap.visible = true;
    this.gapGlow.visible = true;
  }

  lightning(from: Vec3, points: Vec3[]): void {
    let prev = from;
    points.forEach((p, idx) => {
      const b = this.bolts[idx % this.bolts.length];
      const attr = b.line.geometry.getAttribute('position') as THREE.BufferAttribute;
      const segs = attr.count;
      for (let i = 0; i < segs; i++) {
        const t = i / (segs - 1);
        const jitter = i === 0 || i === segs - 1 ? 0 : 1.4;
        attr.setXYZ(
          i,
          prev.x + (p.x - prev.x) * t + (Math.random() - 0.5) * jitter,
          prev.y + (p.y - prev.y) * t + (Math.random() - 0.5) * jitter,
          prev.z + (p.z - prev.z) * t + (Math.random() - 0.5) * jitter,
        );
      }
      attr.needsUpdate = true;
      b.life = 0.35;
      b.line.visible = true;
      prev = p;
    });
  }

  update(dt: number, time: number): void {
    if (this.gapTime > 0) {
      this.gapTime -= dt;
      const s = 7.6 + Math.sin(time * 8) * 0.4;
      this.gap.scale.setScalar(s);
      this.gapGlow.scale.setScalar(s * 1.2);
      this.gapMat.opacity = Math.min(1, this.gapTime * 2);
      if (this.gapTime <= 0) {
        this.gap.visible = false;
        this.gapGlow.visible = false;
      }
    }
    for (const b of this.bolts) {
      if (b.life <= 0) continue;
      b.life -= dt;
      b.mat.opacity = Math.max(0, b.life / 0.35);
      if (b.life <= 0) b.line.visible = false;
    }
  }

  clear(): void {
    this.gapTime = 0;
    this.gap.visible = false;
    this.gapGlow.visible = false;
    this.lock.visible = false;
    for (const b of this.bolts) { b.life = 0; b.line.visible = false; }
  }

  dispose(): void {
    for (const o of [this.crosshair, this.lock, this.gap, this.gapGlow, ...this.bolts.map((b) => b.line)]) this.scene.remove(o);
    this.disposables.forEach((d) => d.dispose());
  }
}
