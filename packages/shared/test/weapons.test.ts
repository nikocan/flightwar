import { describe, expect, it } from 'vitest';
import { MAX_WEAPON_LEVEL, WEAPONS, resolveWeaponStats, weaponUpgradeCost } from '../src/config/weapons';
import { GameWorld } from '../src/sim/world';
import { ENEMIES } from '../src/config/enemies';
import { idleMission, input, run, testMission } from './helpers';

describe('weapon upgrades', () => {
  const gun = WEAPONS.machineGun;
  it('follows the 1..10 upgrade ladder', () => {
    expect(resolveWeaponStats(gun, 1).projectiles).toBe(1);
    expect(resolveWeaponStats(gun, 2).projectiles).toBe(2);
    expect(resolveWeaponStats(gun, 3).projectiles).toBe(3);
    expect(resolveWeaponStats(gun, 4).damage).toBeGreaterThan(resolveWeaponStats(gun, 3).damage);
    expect(resolveWeaponStats(gun, 5).pierce).toBe(1);
    expect(resolveWeaponStats(gun, 6).sideGuns).toBe(2);
    expect(resolveWeaponStats(gun, 7).fireRate).toBeGreaterThan(resolveWeaponStats(gun, 6).fireRate);
    expect(resolveWeaponStats(gun, 9).secondaryEvery).toBeGreaterThan(0);
    expect(resolveWeaponStats(gun, 10).evolved).toBe(true);
  });

  it('clamps out-of-range levels', () => {
    expect(resolveWeaponStats(gun, 0).level).toBe(1);
    expect(resolveWeaponStats(gun, 99).level).toBe(MAX_WEAPON_LEVEL);
  });

  it('has increasing upgrade costs and no cost past max level', () => {
    for (let l = 1; l < MAX_WEAPON_LEVEL - 1; l++) expect(weaponUpgradeCost(l + 1)).toBeGreaterThan(weaponUpgradeCost(l));
    expect(weaponUpgradeCost(MAX_WEAPON_LEVEL)).toBe(Infinity);
  });

  it('every weapon defines distinct visuals and positive stats', () => {
    for (const w of Object.values(WEAPONS)) {
      expect(w.damage).toBeGreaterThan(0);
      expect(w.fireRate).toBeGreaterThan(0);
      expect(w.projectileSpeed).toBeGreaterThan(0);
      expect(w.color).toMatch(/^#/);
    }
    expect(Object.keys(WEAPONS)).toHaveLength(10);
  });
});

describe('weapon firing', () => {
  it('respects the fire rate while the trigger is held', () => {
    const w = new GameWorld(idleMission());
    run(w, 1, input({ fire: true }));
    const expected = WEAPONS.machineGun.fireRate;
    // One projectile per volley at level 1, so projectiles fired == volleys.
    expect(w.stats.shotsFired).toBeGreaterThanOrEqual(expected - 1);
    expect(w.stats.shotsFired).toBeLessThanOrEqual(expected + 1);
    expect(w.activeProjectileCount).toBeGreaterThan(0);
  });

  it('does not fire without trigger input (auto-fire disabled)', () => {
    const w = new GameWorld(testMission(), { autoFire: false });
    run(w, 1, input());
    expect(w.stats.shotsFired).toBe(0);
  });

  it('higher weapon levels emit more projectiles per volley', () => {
    const count = (level: number) => {
      const w = new GameWorld(idleMission(), { weaponLevel: level });
      w.step(1 / 60, input({ fire: true }));
      return w.activeProjectileCount;
    };
    expect(count(3)).toBe(3);
    expect(count(6)).toBe(5); // 3 main + 2 side guns
  });

  it('projectiles fly forward and expire after their range', () => {
    const w = new GameWorld(idleMission());
    w.step(1 / 60, input({ fire: true }));
    const p = w.projectiles.find((x) => x.active)!;
    const z0 = p.z;
    run(w, 0.2, input());
    expect(p.z).toBeLessThan(z0);
    run(w, 3, input());
    expect(w.activeProjectileCount).toBe(0);
  });

  it('homing missiles track and hit a target', () => {
    const w = new GameWorld(idleMission(), { seed: 3 });
    const e = w.spawnEnemy(ENEMIES.heavyBomber, 8, 3, -60, true);
    e.state = 'engage';
    const hp = e.hp;
    const missiles = w.player.missiles;
    run(w, 0.05, input({ missile: true }));
    expect(w.player.missiles).toBe(missiles - 1);
    run(w, 3, input());
    expect(e.hp).toBeLessThan(hp);
  });
});
