import * as THREE from 'three';
import type { Enemy, EnemyDef } from '@sfe/shared';
import { setHitFlash, type EnemyModel } from './enemyModels';
import { createEnemyModel } from '../assets/modelAdapter';

/** Pools enemy meshes per model type and syncs them with the simulation every frame. */
export class EnemyRenderer {
  private pools = new Map<string, EnemyModel[]>();
  private active = new Map<number, EnemyModel>();
  private seen = new Set<number>();
  private all: EnemyModel[] = [];

  constructor(private readonly scene: THREE.Scene) {}

  /** Pre-builds meshes so the first wave does not stutter. */
  warm(def: EnemyDef, count: number): void {
    const key = def.model + def.color;
    const pool = this.pools.get(key) ?? [];
    for (let i = 0; i < count; i++) pool.push(this.create(def));
    this.pools.set(key, pool);
  }

  private create(def: EnemyDef): EnemyModel {
    const m = createEnemyModel(def);
    m.group.visible = false;
    this.scene.add(m.group);
    this.all.push(m);
    return m;
  }

  private acquire(def: EnemyDef): EnemyModel {
    const pool = this.pools.get(def.model + def.color);
    return pool?.pop() ?? this.create(def);
  }

  private release(id: number, m: EnemyModel, def: EnemyDef | null): void {
    m.group.visible = false;
    this.active.delete(id);
    const key = def ? def.model + def.color : (m.group.userData.key as string);
    const pool = this.pools.get(key) ?? [];
    pool.push(m);
    this.pools.set(key, pool);
  }

  update(enemies: readonly Enemy[], alpha: number, time: number, dt: number): void {
    this.seen.clear();
    for (const e of enemies) {
      if (!e.alive) continue;
      this.seen.add(e.id);
      let m = this.active.get(e.id);
      if (!m) {
        m = this.acquire(e.def);
        m.group.userData.key = e.def.model + e.def.color;
        this.active.set(e.id, m);
        m.group.visible = true;
      }
      const g = m.group;
      g.position.set(
        e.prevX + (e.x - e.prevX) * alpha,
        e.prevY + (e.y - e.prevY) * alpha,
        e.prevZ + (e.z - e.prevZ) * alpha,
      );
      const bank = THREE.MathUtils.clamp(-e.vx * 0.06, -0.8, 0.8);
      const pitch = THREE.MathUtils.clamp(e.vy * 0.04, -0.4, 0.4);
      if (e.def.behavior === 'boss') {
        g.rotation.set(Math.sin(time * 0.7) * 0.05, 0, bank * 0.3);
        // Telegraph: core glows hotter right before a heavy attack.
        const tele = e.telegraph > 0 ? 1 + Math.sin(time * 30) * 0.5 : 0;
        for (const p of m.pulse) p.scale.setScalar(1 + Math.sin(time * 4) * 0.06 + tele * 0.2);
        m.setPhase?.(e.bossPhase);
      } else {
        g.rotation.set(-pitch, e.state === 'retreat' ? Math.PI : 0, bank);
        for (const p of m.pulse) p.scale.setScalar(1 + Math.sin(time * 6 + e.id) * 0.1);
      }
      for (const s of m.spinners) s.obj.rotation[s.axis] += s.speed * dt;
      m.update?.(dt);
      setHitFlash(m, e.hitFlash > 0 ? e.hitFlash / 0.12 : 0);
    }
    for (const [id, m] of this.active) {
      if (!this.seen.has(id)) this.release(id, m, null);
    }
  }

  clear(): void {
    for (const [id, m] of [...this.active]) this.release(id, m, null);
  }

  dispose(): void {
    for (const m of this.all) {
      m.group.removeFromParent();
      m.dispose();
    }
    this.all = [];
    this.pools.clear();
    this.active.clear();
  }
}
