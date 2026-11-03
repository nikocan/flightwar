import { describe, expect, it } from 'vitest';
import { GameWorld } from '../src/sim/world';
import { POWERUPS, POWERUP_IDS } from '../src/config/powerups';
import { ENEMIES } from '../src/config/enemies';
import { idleMission, input, run, testMission } from './helpers';

const emptyMission = idleMission;

describe('bonus collection', () => {
  it('collects a power-up on contact and emits a pickup event', () => {
    const w = new GameWorld(emptyMission());
    w.player.hp = 50;
    w.spawnPowerUp('health', 0, 0, -1);
    w.step(1 / 60, input());
    expect(w.powerUps).toHaveLength(0);
    expect(w.player.hp).toBeGreaterThan(50);
    expect(w.stats.powerUpsCollected).toBe(1);
    expect(w.drainEvents().some((e) => e.type === 'pickup' && e.powerUp === 'health')).toBe(true);
  });

  it('magnet pulls nearby bonuses toward the player', () => {
    const w = new GameWorld(emptyMission());
    w.spawnPowerUp('energy', 3, 2, -4);
    run(w, 0.5, input());
    expect(w.stats.powerUpsCollected).toBe(1);
  });

  it('timed effects expire', () => {
    const w = new GameWorld(emptyMission());
    w.applyPowerUp('doubleDamage');
    expect(w.player.effects.doubleDamage).toBeCloseTo(POWERUPS.doubleDamage.duration);
    run(w, POWERUPS.doubleDamage.duration + 0.1, input());
    expect(w.player.effects.doubleDamage).toBe(0);
  });

  it('shield absorbs damage and ends with its timer', () => {
    const w = new GameWorld(emptyMission());
    w.applyPowerUp('shield');
    expect(w.player.shield).toBeGreaterThan(0);
    run(w, POWERUPS.shield.duration + 0.1, input());
    expect(w.player.shield).toBe(0);
  });

  it('triple fire adds projectiles to each volley', () => {
    const w = new GameWorld(emptyMission());
    w.applyPowerUp('tripleFire');
    w.step(1 / 60, input({ fire: true }));
    expect(w.activeProjectileCount).toBe(3);
  });

  it('missile, energy and special charge bonuses refill resources', () => {
    const w = new GameWorld(emptyMission());
    w.player.missiles = 0;
    w.player.energy = 0;
    w.player.specialCooldown = 10;
    w.applyPowerUp('homingMissiles');
    w.applyPowerUp('energy');
    w.applyPowerUp('specialCharge');
    expect(w.player.missiles).toBe(POWERUPS.homingMissiles.amount);
    expect(w.player.energy).toBe(w.player.maxEnergy);
    expect(w.player.specialCooldown).toBe(0);
  });

  it('lightning bonus strikes enemies ahead', () => {
    const w = new GameWorld(emptyMission());
    const e = w.spawnEnemy(ENEMIES.heavyBomber, 0, 0, -50, true);
    const hp = e.hp;
    w.applyPowerUp('lightning');
    expect(e.hp).toBeLessThan(hp);
  });

  it('every power-up type can be applied without errors', () => {
    const w = new GameWorld(emptyMission());
    for (const id of POWERUP_IDS) expect(() => w.applyPowerUp(id)).not.toThrow();
    expect(POWERUP_IDS).toHaveLength(11);
  });
});
