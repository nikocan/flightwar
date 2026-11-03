import { describe, expect, it } from 'vitest';
import { GameWorld } from '../src/sim/world';
import { FixedStepLoop } from '../src/sim/loop';
import { ARENA, PLAYER_RULES } from '../src/config/balance';
import { idleMission, input, run, testMission } from './helpers';

describe('aircraft movement', () => {
  it('moves the aircraft in the input direction', () => {
    const w = new GameWorld(testMission());
    run(w, 0.5, input({ moveX: 1, moveY: 1 }));
    expect(w.player.x).toBeGreaterThan(2);
    expect(w.player.y).toBeGreaterThan(2);
    expect(w.player.bank).toBeLessThan(0); // banks into the turn
  });

  it('keeps the aircraft inside the arena bounds', () => {
    const w = new GameWorld(testMission());
    run(w, 5, input({ moveX: -1, moveY: -1 }));
    expect(w.player.x).toBe(ARENA.minX);
    expect(w.player.y).toBe(ARENA.minY);
  });

  it('is frame-rate independent thanks to the fixed timestep', () => {
    const simulate = (frameDt: number) => {
      const w = new GameWorld(testMission());
      const loop = new FixedStepLoop();
      const inp = input({ moveX: 0.7, moveY: -0.4 });
      let t = 0;
      while (t < 2 - 1e-9) {
        loop.advance(frameDt, (dt) => w.step(dt, inp));
        t += frameDt;
      }
      return w.player;
    };
    const a = simulate(1 / 30);
    const b = simulate(1 / 144);
    expect(Math.abs(a.x - b.x)).toBeLessThan(0.35);
    expect(Math.abs(a.y - b.y)).toBeLessThan(0.35);
  });

  it('dash gives a burst of speed, invulnerability and costs energy', () => {
    const w = new GameWorld(testMission());
    w.player.invulnerable = 0;
    const energy = w.player.energy;
    run(w, 1 / 60, input({ moveX: 1, dash: true }));
    expect(w.player.energy).toBeLessThan(energy);
    expect(w.player.invulnerable).toBeGreaterThan(0);
    run(w, 0.2, input({ moveX: 1, dash: true }));
    expect(w.player.x).toBeGreaterThan(5);
    // Holding the key must not re-trigger (edge triggered) and cooldown applies.
    expect(w.player.dashCooldown).toBeGreaterThan(0);
    expect(PLAYER_RULES.dashCooldown).toBeGreaterThan(0);
  });
});
