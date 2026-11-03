import * as THREE from 'three';
import { POWERUPS, type PowerUp } from '@sfe/shared';
import { glowTexture } from './textures';

interface Capsule {
  group: THREE.Group;
  core: THREE.Mesh;
  shell: THREE.Mesh;
  glow: THREE.Sprite;
  coreMat: THREE.MeshStandardMaterial;
  shellMat: THREE.MeshBasicMaterial;
  glowMat: THREE.SpriteMaterial;
}

/** Glowing, spinning 3D bonus capsules. */
export class PowerUpRenderer {
  private pool: Capsule[] = [];
  private active = new Map<number, Capsule>();
  private seen = new Set<number>();
  private readonly coreGeo = new THREE.IcosahedronGeometry(0.6, 0);
  private readonly shellGeo = new THREE.OctahedronGeometry(1.15, 0);

  constructor(private readonly scene: THREE.Scene) {}

  private acquire(): Capsule {
    const c = this.pool.pop();
    if (c) return c;
    const group = new THREE.Group();
    const coreMat = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 1.5, metalness: 0.3, roughness: 0.2, toneMapped: false });
    const shellMat = new THREE.MeshBasicMaterial({ color: '#ffffff', wireframe: true, transparent: true, opacity: 0.8, toneMapped: false });
    const glowMat = new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false });
    const core = new THREE.Mesh(this.coreGeo, coreMat);
    const shell = new THREE.Mesh(this.shellGeo, shellMat);
    const glow = new THREE.Sprite(glowMat);
    glow.scale.setScalar(5);
    group.add(core, shell, glow);
    this.scene.add(group);
    return { group, core, shell, glow, coreMat, shellMat, glowMat };
  }

  update(items: readonly PowerUp[], alpha: number, time: number): void {
    this.seen.clear();
    for (const u of items) {
      if (!u.alive) continue;
      this.seen.add(u.id);
      let c = this.active.get(u.id);
      if (!c) {
        c = this.acquire();
        const color = POWERUPS[u.type].color;
        c.coreMat.color.set(color);
        c.coreMat.emissive.set(color);
        c.shellMat.color.set(color);
        c.glowMat.color.set(color);
        c.group.visible = true;
        this.active.set(u.id, c);
      }
      c.group.position.set(
        u.prevX + (u.x - u.prevX) * alpha,
        u.prevY + (u.y - u.prevY) * alpha + Math.sin(time * 3 + u.id) * 0.3,
        u.prevZ + (u.z - u.prevZ) * alpha,
      );
      c.core.rotation.set(time * 1.5, time * 2, 0);
      c.shell.rotation.set(-time, time * 0.7, time * 0.4);
      const blink = u.age > 11 ? (Math.sin(time * 20) > 0 ? 1 : 0.3) : 1;
      c.glow.scale.setScalar((4.5 + Math.sin(time * 5) * 0.6) * blink);
    }
    for (const [id, c] of this.active) {
      if (!this.seen.has(id)) {
        c.group.visible = false;
        this.active.delete(id);
        this.pool.push(c);
      }
    }
  }

  clear(): void {
    for (const [id, c] of this.active) {
      c.group.visible = false;
      this.pool.push(c);
      this.active.delete(id);
    }
  }

  dispose(): void {
    const all = [...this.pool, ...this.active.values()];
    for (const c of all) {
      c.group.removeFromParent();
      c.coreMat.dispose();
      c.shellMat.dispose();
      c.glowMat.dispose();
    }
    this.coreGeo.dispose();
    this.shellGeo.dispose();
  }
}
