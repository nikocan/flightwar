import { describe, expect, it } from 'vitest';
import { Rng } from '../src/rng';
import { absorbWithShield, armorFactor, computeDamage } from '../src/sim/damage';
import { segmentSphereHit, spheresOverlap } from '../src/sim/collision';
import { SpatialHash } from '../src/sim/spatialHash';
import { GameWorld } from '../src/sim/world';
import { ENEMIES } from '../src/config/enemies';
import { idleMission, input, run, testMission } from './helpers';

describe('damage calculations', () => {
  const rng = new Rng(1);
  it('armor mitigates but never fully blocks', () => {
    expect(armorFactor(0)).toBe(1);
    expect(armorFactor(100)).toBe(0.5);
    expect(computeDamage({ baseDamage: 10, firepower: 100, critChance: 0, critMultiplier: 2, targetArmor: 10000 }, rng).amount).toBeGreaterThanOrEqual(1);
  });

  it('applies firepower, multipliers and crits', () => {
    const base = { baseDamage: 10, firepower: 150, critMultiplier: 2, targetArmor: 0 };
    expect(computeDamage({ ...base, critChance: 0 }, rng)).toEqual({ amount: 15, crit: false });
    expect(computeDamage({ ...base, critChance: 1 }, rng)).toEqual({ amount: 30, crit: true });
    expect(computeDamage({ ...base, critChance: 0, multiplier: 2 }, rng).amount).toBe(30);
  });

  it('shields absorb damage before health', () => {
    expect(absorbWithShield(10, 0)).toEqual({ toHealth: 10, shieldLeft: 0 });
    expect(absorbWithShield(10, 25)).toEqual({ toHealth: 0, shieldLeft: 15 });
    expect(absorbWithShield(10, 4)).toEqual({ toHealth: 6, shieldLeft: 0 });
  });
});

describe('collision detection', () => {
  it('detects overlapping spheres', () => {
    expect(spheresOverlap(0, 0, 0, 1, 1.5, 0, 0, 1)).toBe(true);
    expect(spheresOverlap(0, 0, 0, 1, 2.5, 0, 0, 1)).toBe(false);
  });

  it('swept test catches fast projectiles that would tunnel through', () => {
    // Moves 10 units in one step straight through a radius-1 target.
    const t = segmentSphereHit(0, 0, 5, 0, 0, -5, 0.2, 0, 0, 0, 1);
    expect(t).toBeGreaterThan(0);
    expect(t).toBeLessThan(1);
    expect(segmentSphereHit(5, 0, 5, 5, 0, -5, 0.2, 0, 0, 0, 1)).toBe(-1);
  });

  it('spatial hash returns unique nearby candidates only', () => {
    const h = new SpatialHash(10, 16);
    h.insert(0, 0, 0, 1);
    h.insert(1, 4, 4, 8); // spans several cells
    h.insert(2, 100, 100, 1);
    const out: number[] = [];
    h.query(-5, -5, 5, 5, out);
    expect(out.sort()).toEqual([0, 1]);
    h.clear();
    expect(h.query(-5, -5, 5, 5, out)).toEqual([]);
  });

  it('player projectiles damage and destroy enemies', () => {
    const w = new GameWorld(idleMission(), { seed: 9 });
    const e = w.spawnEnemy(ENEMIES.scoutDrone, 0, 0, -40, true);
    // Freeze the drone in place for a deterministic shot.
    e.def = { ...e.def, speed: 0 };
    run(w, 2, input({ fire: true }));
    expect(e.alive).toBe(false);
    expect(w.stats.kills).toBe(1);
    expect(w.stats.score).toBeGreaterThan(0);
    expect(w.stats.shotsHit).toBeGreaterThan(0);
  });

  it('enemy projectiles damage the player, shields absorb first', () => {
    const w = new GameWorld(idleMission(), { seed: 2 });
    w.player.invulnerable = 0;
    const e = w.spawnEnemy(ENEMIES.fighterJet, 0, 0, -50, true);
    e.state = 'engage';
    e.engageZ = -50;
    e.fireTimer = 0;
    const hp = w.player.hp;
    run(w, 3, input());
    expect(w.player.hp).toBeLessThan(hp);
    expect(w.stats.damageTaken).toBeGreaterThan(0);
  });

  it('ramming an enemy hurts both', () => {
    const w = new GameWorld(idleMission());
    w.player.invulnerable = 0;
    const e = w.spawnEnemy(ENEMIES.heavyBomber, 0, 0, -1, true);
    const hp = w.player.hp;
    const enemyHp = e.hp;
    w.step(1 / 60, input());
    expect(w.player.hp).toBeLessThan(hp);
    expect(e.hp).toBeLessThan(enemyHp);
  });
});
