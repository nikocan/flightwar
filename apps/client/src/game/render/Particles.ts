import * as THREE from 'three';
import { glowTexture, puffTexture, ringTexture } from './textures';

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
  /** Cartoon fireball + smoke puffs (sheet "Patlama Efektleri"). */
  readonly puffs: Puffs;

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
      map: glowTexture(), transparent: true, opacity: 0.65, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false,
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

    this.puffs = new Puffs(scene, Math.max(160, Math.round(capacity / 6)));

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
    this.puffs.explosion(x, y, z, size * Math.sqrt(intensity));
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
    this.puffs.update(dt, camera);
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
    this.puffs.clear();
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.mesh.dispose();
    for (const r of this.rings) { r.mesh.removeFromParent(); r.mat.dispose(); }
    this.rings[0]?.mesh.geometry.dispose();
    this.puffs.dispose();
  }
}

/**
 * Soft cartoon puffs (normal alpha blending, not additive): a yellow → orange → red fireball that
 * swells and fades, followed by rising grey smoke — matching the sheet's explosion strip.
 * Per-instance colour and opacity in one instanced draw call.
 */
class Puffs {
  private readonly mesh: THREE.InstancedMesh;
  private readonly cap: number;
  private readonly data: { x: number; y: number; z: number; vx: number; vy: number; vz: number; size: number; grow: number; life: number; max: number; smoke: boolean; rot: number }[] = [];
  private readonly alpha: THREE.InstancedBufferAttribute;
  private cursor = 0;
  private readonly dummy = new THREE.Object3D();
  private readonly c = new THREE.Color();
  private static readonly FIRE = [new THREE.Color('#fff6b0'), new THREE.Color('#ffc23a'), new THREE.Color('#ff7a1a'), new THREE.Color('#d8361b')];
  private static readonly SMOKE = new THREE.Color('#8a8f9e');

  constructor(scene: THREE.Scene, capacity: number) {
    this.cap = capacity;
    const geo = new THREE.PlaneGeometry(1, 1);
    this.alpha = new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1);
    geo.setAttribute('aAlpha', this.alpha);
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uMap: { value: puffTexture() } },
      vertexShader: `
        attribute float aAlpha;
        varying vec2 vUv; varying float vA; varying vec3 vC;
        void main() {
          vUv = uv; vA = aAlpha;
          #ifdef USE_INSTANCING_COLOR
            vC = instanceColor;
          #else
            vC = vec3(1.0);
          #endif
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform sampler2D uMap; varying vec2 vUv; varying float vA; varying vec3 vC;
        void main() {
          vec4 t = texture2D(uMap, vUv);
          // Toon-ish shading: lighter top-left, darker bottom-right for a rounded cartoon look.
          float shade = mix(0.78, 1.12, clamp(vUv.y * 0.6 + (1.0 - vUv.x) * 0.4, 0.0, 1.0));
          gl_FragColor = vec4(vC * t.rgb * shade, t.a * vA);
          if (gl_FragColor.a < 0.01) discard;
          #include <colorspace_fragment>
        }`,
    });
    this.mesh = new THREE.InstancedMesh(geo, mat, capacity);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 8;
    for (let i = 0; i < capacity; i++) {
      this.data.push({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, size: 0, grow: 0, life: 0, max: 1, smoke: false, rot: 0 });
      this.alpha.setX(i, 0);
    }
    scene.add(this.mesh);
  }

  private spawn(x: number, y: number, z: number, vx: number, vy: number, vz: number, size: number, grow: number, life: number, smoke: boolean): void {
    const d = this.data[this.cursor];
    this.cursor = (this.cursor + 1) % this.cap;
    Object.assign(d, { x, y, z, vx, vy, vz, size, grow, life, max: life, smoke, rot: Math.random() * Math.PI * 2 });
  }

  explosion(x: number, y: number, z: number, size: number): void {
    const s = Math.max(1.4, size * 1.7); // explosions happen far ahead: draw them big enough to read
    const fire = Math.round(5 + s * 2);
    for (let i = 0; i < fire; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * s * 0.9;
      this.spawn(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.8, z + 0.5, Math.cos(a) * s * 2.5, Math.sin(a) * s * 2.5, 6, s * (1.1 + Math.random() * 0.7), s * 2.2, 0.38 + Math.random() * 0.22, false);
    }
    for (let i = 0; i < Math.round(3 + s); i++) {
      const a = Math.random() * Math.PI * 2;
      this.spawn(x + Math.cos(a) * s * 0.6, y + Math.sin(a) * s * 0.4, z, Math.cos(a) * s, 2 + Math.random() * 2, 9, s * (0.9 + Math.random() * 0.5), s * 1.6, 0.9 + Math.random() * 0.5, true);
    }
  }

  update(dt: number, camera: THREE.Camera): void {
    const dm = this.dummy;
    for (let i = 0; i < this.cap; i++) {
      const p = this.data[i];
      if (p.life <= 0) {
        if (this.alpha.getX(i) !== 0) {
          this.alpha.setX(i, 0);
          dm.scale.setScalar(0);
          dm.updateMatrix();
          this.mesh.setMatrixAt(i, dm.matrix);
        }
        continue;
      }
      p.life -= dt;
      const t = 1 - Math.max(0, p.life) / p.max; // 0 → 1
      const k = Math.exp(-2.5 * dt);
      p.vx *= k; p.vy *= k; p.vz *= k;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      p.size += p.grow * dt * (1 - t);
      dm.position.set(p.x, p.y, p.z);
      dm.quaternion.copy(camera.quaternion);
      dm.rotateZ(p.rot + t * 0.6);
      // Pop-in squash & stretch, then hold.
      const pop = t < 0.15 ? 0.6 + (t / 0.15) * 0.5 : 1.1 - (t - 0.15) * 0.15;
      dm.scale.setScalar(p.size * pop);
      dm.updateMatrix();
      this.mesh.setMatrixAt(i, dm.matrix);
      if (p.smoke) {
        this.c.copy(Puffs.SMOKE).multiplyScalar(1.05 - t * 0.25);
        this.alpha.setX(i, 0.75 * Math.min(1, t * 5) * (1 - t));
      } else {
        const f = Puffs.FIRE;
        const seg = Math.min(2.999, t * 3);
        this.c.copy(f[Math.floor(seg)]).lerp(f[Math.floor(seg) + 1], seg - Math.floor(seg));
        this.alpha.setX(i, t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3);
      }
      this.mesh.setColorAt(i, this.c);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.alpha.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  clear(): void {
    for (const p of this.data) p.life = 0;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.mesh.dispose();
  }
}
