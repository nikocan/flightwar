import * as THREE from 'three';
import { glowTexture, ringTexture } from './textures';

/**
 * Pooled, GPU-instanced particle system (one draw call for all sparks, embers, trails).
 * Additive blending gives a cheap "bloom" look on every quality tier.
 */
export class Particles {
  readonly mesh: THREE.InstancedMesh;
  private readonly cap: number;
  private readonly pos: Float32Array;
  private readonly vel: Float32Array;
  private readonly col: Float32Array;
  private readonly life: Float32Array;
  private readonly maxLife: Float32Array;
  private readonly size: Float32Array;
  private readonly grow: Float32Array;
  private readonly drag: Float32Array;
  private cursor = 0;
  private readonly dummy = new THREE.Object3D();
  private readonly color = new THREE.Color();
  private readonly tmpColor = new THREE.Color();

  private rings: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; life: number; max: number; size: number }[] = [];

  constructor(scene: THREE.Scene, capacity: number) {
    this.cap = capacity;
    this.pos = new Float32Array(capacity * 3);
    this.vel = new Float32Array(capacity * 3);
    this.col = new Float32Array(capacity * 3);
    this.life = new Float32Array(capacity);
    this.maxLife = new Float32Array(capacity);
    this.size = new Float32Array(capacity);
    this.grow = new Float32Array(capacity);
    this.drag = new Float32Array(capacity);
    const geo = new THREE.PlaneGeometry(1, 1);
    const mat = new THREE.MeshBasicMaterial({
      map: glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false,
    });
    this.mesh = new THREE.InstancedMesh(geo, mat, capacity);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
    this.mesh.frustumCulled = false;
    this.mesh.count = capacity;
    // Hide all instances initially.
    this.dummy.scale.setScalar(0);
    this.dummy.updateMatrix();
    for (let i = 0; i < capacity; i++) this.mesh.setMatrixAt(i, this.dummy.matrix);
    scene.add(this.mesh);

    const ringGeo = new THREE.PlaneGeometry(1, 1);
    for (let i = 0; i < 10; i++) {
      const rm = new THREE.MeshBasicMaterial({ map: ringTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
      const m = new THREE.Mesh(ringGeo, rm);
      m.visible = false;
      scene.add(m);
      this.rings.push({ mesh: m, mat: rm, life: 0, max: 1, size: 1 });
    }
  }

  emit(
    x: number, y: number, z: number,
    vx: number, vy: number, vz: number,
    color: THREE.ColorRepresentation, size: number, life: number, grow = 0, drag = 1.5,
  ): void {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.cap;
    const i3 = i * 3;
    this.pos[i3] = x; this.pos[i3 + 1] = y; this.pos[i3 + 2] = z;
    this.vel[i3] = vx; this.vel[i3 + 1] = vy; this.vel[i3 + 2] = vz;
    this.color.set(color);
    this.col[i3] = this.color.r; this.col[i3 + 1] = this.color.g; this.col[i3 + 2] = this.color.b;
    this.life[i] = life;
    this.maxLife[i] = life;
    this.size[i] = size;
    this.grow[i] = grow;
    this.drag[i] = drag;
  }

  /** Stylized, non-graphic explosion: bright flash, sparks, embers and a shockwave ring. */
  explosion(x: number, y: number, z: number, size: number, color: string, intensity = 1): void {
    const n = Math.round((18 + size * 10) * intensity);
    this.emit(x, y, z, 0, 0, 0, '#ffffff', size * 4.5, 0.18, size * 6, 0);
    this.emit(x, y, z, 0, 0, 0, color, size * 6, 0.35, size * 5, 0);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const b = Math.acos(2 * Math.random() - 1);
      const sp = (8 + Math.random() * 22) * (0.6 + size * 0.25);
      const vx = Math.sin(b) * Math.cos(a) * sp;
      const vy = Math.sin(b) * Math.sin(a) * sp;
      const vz = Math.cos(b) * sp + 12;
      const c = i % 3 === 0 ? color : i % 3 === 1 ? '#ffb347' : '#fff1a8';
      this.emit(x, y, z, vx, vy, vz, c, 0.6 + Math.random() * size * 0.45, 0.4 + Math.random() * 0.6, -0.4, 2.2);
    }
    this.ring(x, y, z, size * 3.5, color, 0.45);
  }

  ring(x: number, y: number, z: number, size: number, color: string, life: number): void {
    const r = this.rings.find((q) => q.life <= 0) ?? this.rings[0];
    r.life = r.max = life;
    r.size = size;
    r.mat.color.set(color);
    r.mesh.position.set(x, y, z);
    r.mesh.visible = true;
  }

  hitSpark(x: number, y: number, z: number, crit: boolean, color: string, scale = 1): void {
    const n = crit ? 9 : 5;
    this.emit(x, y, z, 0, 0, 6, crit ? '#fff38a' : color, (crit ? 2.6 : 1.6) * scale, 0.12, 4, 0);
    for (let i = 0; i < n; i++) {
      this.emit(x, y, z, (Math.random() - 0.5) * 26, (Math.random() - 0.5) * 26, 6 + Math.random() * 18, crit ? '#fff38a' : color, 0.35 * scale, 0.22 + Math.random() * 0.2, 0, 3);
    }
  }

  burst(x: number, y: number, z: number, color: string, count: number, speed: number): void {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      this.emit(x, y, z, Math.cos(a) * speed, Math.sin(a) * speed, (Math.random() - 0.5) * 4, color, 0.8, 0.5, -0.5, 2.5);
    }
    this.ring(x, y, z, 6, color, 0.4);
  }

  update(dt: number, camera: THREE.Camera): void {
    const d = this.dummy;
    d.quaternion.copy(camera.quaternion);
    const m = this.mesh;
    const colorAttr = m.instanceColor!;
    for (let i = 0; i < this.cap; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      const i3 = i * 3;
      if (this.life[i] <= 0) {
        d.scale.setScalar(0);
        d.position.set(0, -9999, 0);
        d.updateMatrix();
        m.setMatrixAt(i, d.matrix);
        continue;
      }
      const k = Math.exp(-this.drag[i] * dt);
      this.vel[i3] *= k; this.vel[i3 + 1] *= k; this.vel[i3 + 2] *= k;
      this.pos[i3] += this.vel[i3] * dt;
      this.pos[i3 + 1] += this.vel[i3 + 1] * dt;
      this.pos[i3 + 2] += this.vel[i3 + 2] * dt;
      this.size[i] = Math.max(0.01, this.size[i] + this.grow[i] * dt);
      const t = this.life[i] / this.maxLife[i];
      d.position.set(this.pos[i3], this.pos[i3 + 1], this.pos[i3 + 2]);
      d.scale.setScalar(this.size[i]);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
      const fade = t * t * (3 - 2 * t);
      this.tmpColor.setRGB(this.col[i3] * fade, this.col[i3 + 1] * fade, this.col[i3 + 2] * fade);
      colorAttr.setXYZ(i, this.tmpColor.r, this.tmpColor.g, this.tmpColor.b);
    }
    m.instanceMatrix.needsUpdate = true;
    colorAttr.needsUpdate = true;

    for (const r of this.rings) {
      if (r.life <= 0) continue;
      r.life -= dt;
      if (r.life <= 0) { r.mesh.visible = false; continue; }
      const t = 1 - r.life / r.max;
      r.mesh.quaternion.copy(camera.quaternion);
      r.mesh.scale.setScalar(r.size * (0.3 + t * 1.4));
      r.mat.opacity = 1 - t;
    }
  }

  clear(): void {
    this.life.fill(0);
    this.dummy.scale.setScalar(0);
    this.dummy.updateMatrix();
    for (let i = 0; i < this.cap; i++) this.mesh.setMatrixAt(i, this.dummy.matrix);
    this.mesh.instanceMatrix.needsUpdate = true;
    for (const r of this.rings) { r.life = 0; r.mesh.visible = false; }
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.mesh.dispose();
    for (const r of this.rings) { r.mesh.removeFromParent(); r.mat.dispose(); }
    this.rings[0]?.mesh.geometry.dispose();
  }
}
