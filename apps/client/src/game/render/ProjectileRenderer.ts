import * as THREE from 'three';
import type { Projectile } from '@sfe/shared';

const UP = new THREE.Vector3(0, 0, 1);

interface Layer {
  mesh: THREE.InstancedMesh;
  filter: (p: Projectile) => boolean;
  scale: (p: Projectile, out: THREE.Vector3) => void;
}

/**
 * Draws every projectile with a handful of instanced meshes (core + halo per family),
 * keeping draw calls constant no matter how many bullets are on screen.
 */
export class ProjectileRenderer {
  private layers: Layer[] = [];
  private readonly dummy = new THREE.Object3D();
  private readonly dir = new THREE.Vector3();
  private readonly s = new THREE.Vector3();
  private readonly disposables: { dispose: () => void }[] = [];

  constructor(scene: THREE.Scene, capacity: number, playerColor: string) {
    const additive = (color: string, opacity = 1) => {
      const m = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false,
      });
      this.disposables.push(m);
      return m;
    };
    const boltGeo = new THREE.CapsuleGeometry(0.5, 1, 4, 8);
    boltGeo.rotateX(Math.PI / 2);
    const sphereGeo = new THREE.SphereGeometry(1, 12, 10);
    const missileGeo = new THREE.ConeGeometry(0.3, 1.6, 8);
    missileGeo.rotateX(Math.PI / 2);
    this.disposables.push(boltGeo, sphereGeo, missileGeo);

    const make = (geo: THREE.BufferGeometry, mat: THREE.Material, filter: Layer['filter'], scale: Layer['scale']) => {
      const mesh = new THREE.InstancedMesh(geo, mat, capacity);
      mesh.frustumCulled = false;
      mesh.count = 0;
      scene.add(mesh);
      this.layers.push({ mesh, filter, scale });
    };

    const isPlayerBolt = (p: Projectile) => p.owner === 'player' && p.kind !== 'missile';
    // Player bolts: white-hot core + coloured halo.
    make(boltGeo, additive('#ffffff'), isPlayerBolt, (p, o) => o.set(p.radius * 0.45, p.radius * 0.45, p.kind === 'playerSecondary' ? 2.5 : 3.2));
    make(boltGeo, additive(playerColor, 0.55), isPlayerBolt, (p, o) => o.set(p.radius * 1.4, p.radius * 1.4, p.kind === 'playerSecondary' ? 3.2 : 4.2));
    // Missiles.
    make(missileGeo, new THREE.MeshStandardMaterial({ color: '#dfe6f0', metalness: 0.6, roughness: 0.3, emissive: '#ffb02e', emissiveIntensity: 0.4 }), (p) => p.kind === 'missile', (_p, o) => o.set(1, 1, 1));
    // Enemy orbs: hot core + magenta/orange halo.
    const isEnemy = (p: Projectile) => p.owner === 'enemy';
    make(sphereGeo, additive('#fff3f8'), isEnemy, (p, o) => o.setScalar(p.radius * 0.55));
    make(sphereGeo, additive('#ff3b8d', 0.6), (p) => p.kind === 'enemy', (p, o) => o.setScalar(p.radius * 1.35));
    make(sphereGeo, additive('#ff7a1a', 0.6), (p) => p.kind === 'enemyHeavy', (p, o) => o.setScalar(p.radius * 1.4));
    make(sphereGeo, additive('#ff2a4d', 0.55), (p) => p.kind === 'enemyWall', (p, o) => o.setScalar(p.radius * 1.5));
  }

  update(projectiles: readonly Projectile[], alpha: number): void {
    const d = this.dummy;
    for (const layer of this.layers) {
      let n = 0;
      for (const p of projectiles) {
        if (!p.active || !layer.filter(p)) continue;
        d.position.set(
          p.prevX + (p.x - p.prevX) * alpha,
          p.prevY + (p.y - p.prevY) * alpha,
          p.prevZ + (p.z - p.prevZ) * alpha,
        );
        this.dir.set(p.vx, p.vy, p.vz).normalize();
        d.quaternion.setFromUnitVectors(UP, this.dir);
        layer.scale(p, this.s);
        d.scale.copy(this.s);
        d.updateMatrix();
        layer.mesh.setMatrixAt(n++, d.matrix);
      }
      layer.mesh.count = n;
      layer.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  dispose(): void {
    for (const l of this.layers) {
      l.mesh.removeFromParent();
      (l.mesh.material as THREE.Material).dispose();
      l.mesh.dispose();
    }
    this.disposables.forEach((x) => x.dispose());
  }
}
