import * as THREE from 'three';
import type { AircraftDef, PlayerState } from '@sfe/shared';
import type { AircraftModel } from './aircraftModel';
import { createAircraftModel } from '../assets/modelAdapter';
import type { Particles } from './Particles';

/** Player aircraft: banking/pitching animation, engine flames, trails and shield bubble. */
export class PlayerRenderer {
  readonly model: AircraftModel;
  private readonly root = new THREE.Group();
  private readonly shield: THREE.Mesh;
  private readonly shieldMat: THREE.MeshBasicMaterial;
  private readonly tmp = new THREE.Vector3();
  private trailTimer = 0;
  private roll = 0;

  constructor(scene: THREE.Scene, private readonly def: AircraftDef, glow: boolean) {
    this.model = createAircraftModel(def, { glow });
    this.root.add(this.model.group);
    this.shieldMat = new THREE.MeshBasicMaterial({
      color: '#4dd2ff', transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, wireframe: false, toneMapped: false,
    });
    this.shield = new THREE.Mesh(new THREE.SphereGeometry(3.4, 24, 16), this.shieldMat);
    this.shield.scale.set(1.25, 0.7, 1.2);
    this.shield.visible = false;
    this.root.add(this.shield);
    scene.add(this.root);
  }

  get object(): THREE.Object3D {
    return this.root;
  }

  update(p: PlayerState, alpha: number, dt: number, time: number, particles: Particles, boosting: boolean): void {
    const x = p.prevX + (p.x - p.prevX) * alpha;
    const y = p.prevY + (p.y - p.prevY) * alpha;
    const z = p.prevZ + (p.z - p.prevZ) * alpha;
    this.root.position.set(x, y, z);
    this.root.visible = p.alive;

    // Smooth bank and pitch; a full barrel roll while dashing.
    const dashing = p.dashTimer > 0;
    if (dashing) this.roll += dt * 26 * Math.sign(p.dashDirX || 1);
    else this.roll = THREE.MathUtils.damp(this.roll, Math.round(this.roll / (Math.PI * 2)) * Math.PI * 2, 10, dt);
    const g = this.model.group;
    g.rotation.z = THREE.MathUtils.damp(g.rotation.z, p.bank * 0.75, 8, dt) + (dashing ? 0 : 0);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, p.pitch * 0.35, 8, dt);
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, -p.bank * 0.12, 8, dt);
    this.root.rotation.z = this.roll % (Math.PI * 2);

    this.model.update?.(dt);

    // Invulnerability blink after a hit.
    this.model.group.visible = !(p.invulnerable > 0 && p.invulnerable < 0.6 && Math.sin(time * 40) > 0.3);

    // Engine flames flicker and stretch with thrust.
    const thrust = boosting ? 1.6 : 1 + Math.max(0, -p.pitch) * 0.2;
    for (const f of this.model.flames) {
      const flick = 0.85 + Math.random() * 0.3;
      f.scale.set(flick, flick, thrust * (0.9 + Math.random() * 0.25));
    }
    for (const gl of this.model.glows) gl.material.opacity = 0.75 + Math.random() * 0.25;

    // Shield bubble.
    const shieldOn = p.shield > 0 || p.effects.invincibility > 0;
    this.shield.visible = shieldOn;
    if (shieldOn) {
      this.shieldMat.color.set(p.effects.invincibility > 0 ? '#fff6a8' : '#4dd2ff');
      this.shieldMat.opacity = 0.16 + Math.sin(time * 6) * 0.06;
      this.shield.rotation.y = time;
    }

    // Engine trails.
    if (!p.alive) return;
    this.trailTimer -= dt;
    if (this.trailTimer <= 0) {
      this.trailTimer = 0.016;
      for (const e of this.model.engines) {
        this.tmp.copy(e);
        this.model.group.localToWorld(this.tmp);
        particles.emit(this.tmp.x, this.tmp.y, this.tmp.z, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, 55, this.def.model.engine, 0.9 * thrust, 0.28, -1.5, 0.5);
      }
    }
  }

  dispose(): void {
    this.root.removeFromParent();
    this.model.dispose();
    this.shield.geometry.dispose();
    this.shieldMat.dispose();
  }
}
