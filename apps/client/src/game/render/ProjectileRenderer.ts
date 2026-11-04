import * as THREE from 'three';
import type { Projectile } from '@sfe/shared';
import { boltTexture } from './textures';

const UP = new THREE.Vector3(0, 0, 1);

interface BoltLayer {
  mesh: THREE.InstancedMesh;
  filter: (p: Projectile) => boolean;
  /** [width, length] in world units. */
  size: (p: Projectile) => [number, number];
}

/**
 * Projectile rendering matching the approved sheet ("Lazer Atışı", red enemy bolts):
 * glowing bolts drawn as camera-facing quads stretched along the on-screen direction of travel,
 * so shots flying away from the chase camera read as long streaks instead of dots.
 * One instanced draw call per family; missiles stay 3D rockets.
 */
export class ProjectileRenderer {
  private bolts: BoltLayer[] = [];
  private missiles: THREE.InstancedMesh;
  private readonly dummy = new THREE.Object3D();
  private readonly m = new THREE.Matrix4();
  private readonly pos = new THREE.Vector3();
  private readonly dir = new THREE.Vector3();
  private readonly view = new THREE.Vector3();
  private readonly axis = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private readonly normal = new THREE.Vector3();
  private readonly disposables: { dispose: () => void }[] = [];

  constructor(scene: THREE.Scene, capacity: number, playerColor: string) {
    const quad = new THREE.PlaneGeometry(1, 1);
    quad.translate(0, -0.15, 0); // head slightly ahead of the simulated position
    this.disposables.push(quad);
    const boltMat = (color: string) => {
      const m = new THREE.MeshBasicMaterial({
        map: boltTexture(), color, transparent: true, blending: THREE.AdditiveBlending,
        depthWrite: false, toneMapped: false, fog: false, side: THREE.DoubleSide,
      });
      this.disposables.push(m);
      return m;
    };
    const layer = (color: string, filter: BoltLayer['filter'], size: BoltLayer['size']) => {
      const mesh = new THREE.InstancedMesh(quad, boltMat(color), capacity);
      mesh.frustumCulled = false;
      mesh.count = 0;
      scene.add(mesh);
      this.bolts.push({ mesh, filter, size });
    };
    const isPlayerBolt = (p: Projectile) => p.owner === 'player' && p.kind !== 'missile';
    // Glow pass (coloured) + core pass (white-hot) for the player laser.
    layer(playerColor, isPlayerBolt, (p) => (p.kind === 'playerSecondary' ? [3.4, 7] : [2.4, 6.4]));
    layer('#ffffff', isPlayerBolt, (p) => (p.kind === 'playerSecondary' ? [1.4, 4.6] : [0.9, 4.2]));
    // Enemy bolts: red / orange / pink-red walls (sheet: red enemy shots).
    layer('#ff3b2f', (p) => p.kind === 'enemy', (p) => [p.radius * 4.4, 4.2]);
    layer('#ff8a1f', (p) => p.kind === 'enemyHeavy', (p) => [p.radius * 3.6, 3.4]);
    layer('#ff2a6d', (p) => p.kind === 'enemyWall', (p) => [p.radius * 3.4, 2.6]);
    layer('#fff1e0', (p) => p.owner === 'enemy', (p) => [p.radius * 1.3, 1.8]);

    // Missiles (sheet "Füze"): white body with red nose, rendered as 3D rockets.
    const missileGeo = new THREE.CapsuleGeometry(0.22, 1.2, 4, 10);
    missileGeo.rotateX(Math.PI / 2);
    const missileMat = new THREE.MeshToonMaterial({ color: '#f4f6fb', emissive: '#ff4a3d', emissiveIntensity: 0.25 });
    this.disposables.push(missileGeo, missileMat);
    this.missiles = new THREE.InstancedMesh(missileGeo, missileMat, 64);
    this.missiles.frustumCulled = false;
    this.missiles.count = 0;
    scene.add(this.missiles);
  }

  update(projectiles: readonly Projectile[], alpha: number, camera: THREE.Camera): void {
    const camPos = camera.position;
    for (const layer of this.bolts) {
      let n = 0;
      for (const p of projectiles) {
        if (!p.active || !layer.filter(p)) continue;
        this.pos.set(
          p.prevX + (p.x - p.prevX) * alpha,
          p.prevY + (p.y - p.prevY) * alpha,
          p.prevZ + (p.z - p.prevZ) * alpha,
        );
        this.dir.set(p.vx, p.vy, p.vz).normalize();
        this.view.subVectors(this.pos, camPos).normalize();
        // On-screen travel direction = velocity minus its component along the view ray.
        this.axis.copy(this.dir).addScaledVector(this.view, -this.dir.dot(this.view));
        if (this.axis.lengthSq() < 1e-6) this.axis.set(0, 1, 0);
        this.axis.normalize();
        // Bolt texture points "up" (+Y); quad faces the camera.
        this.normal.copy(this.view).negate();
        this.right.crossVectors(this.axis, this.normal).normalize();
        const [w, l] = layer.size(p);
        this.m.makeBasis(this.right.multiplyScalar(w), this.axis.multiplyScalar(l), this.normal);
        this.m.setPosition(this.pos);
        layer.mesh.setMatrixAt(n++, this.m);
      }
      layer.mesh.count = n;
      layer.mesh.instanceMatrix.needsUpdate = true;
    }

    let k = 0;
    const d = this.dummy;
    for (const p of projectiles) {
      if (!p.active || p.kind !== 'missile' || k >= 64) continue;
      d.position.set(p.prevX + (p.x - p.prevX) * alpha, p.prevY + (p.y - p.prevY) * alpha, p.prevZ + (p.z - p.prevZ) * alpha);
      this.dir.set(p.vx, p.vy, p.vz).normalize();
      d.quaternion.setFromUnitVectors(UP, this.dir);
      d.scale.setScalar(1);
      d.updateMatrix();
      this.missiles.setMatrixAt(k++, d.matrix);
    }
    this.missiles.count = k;
    this.missiles.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    for (const l of this.bolts) {
      l.mesh.removeFromParent();
      l.mesh.dispose();
    }
    this.missiles.removeFromParent();
    this.missiles.dispose();
    this.disposables.forEach((x) => x.dispose());
  }
}
