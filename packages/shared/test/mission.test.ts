import { describe, expect, it } from 'vitest';
import { GameWorld } from '../src/sim/world';
import { MISSION_1_1, missionKindFor, CHAPTERS } from '../src/config/missions';
import { applyXp, computeMissionRewards, computeStars, xpForLevel } from '../src/progression';
import { autopilot, input, run, testMission } from './helpers';

describe('mission flow', () => {
  it('spawns waves and reports victory once all enemies are destroyed', () => {
    const w = new GameWorld(testMission(), { seed: 5 });
    run(w, 3, input());
    expect(w.waveIndex).toBe(0);
    expect(w.enemies.length).toBe(3);
    run(w, 30, autopilot);
    expect(w.status).toBe('victory');
    expect(w.progress).toBe(1);
    expect(w.stats.enemiesDestroyed).toBe(3);
  });

  it('reports defeat when the player is destroyed', () => {
    const w = new GameWorld(testMission(), { seed: 5 });
    w.player.invulnerable = 0;
    w.player.hp = 1;
    (w as any).damagePlayer(50);
    expect(w.player.alive).toBe(false);
    run(w, 3, input());
    expect(w.status).toBe('defeat');
  });

  it('is deterministic for the same seed and inputs', () => {
    const a = new GameWorld(MISSION_1_1, { seed: 42 });
    const b = new GameWorld(MISSION_1_1, { seed: 42 });
    run(a, 40, autopilot);
    run(b, 40, autopilot);
    expect(a.stats).toEqual(b.stats);
    expect(a.player.x).toBe(b.player.x);
  });

  it('Mission 1-1 is completable end-to-end including the boss', () => {
    const w = new GameWorld(MISSION_1_1, { seed: 7 });
    // Make the autopilot survive so we validate the full wave + boss pipeline.
    w.player.maxHp = w.player.hp = 1e7;
    let sawBossPhase2 = false;
    let sawWarning = false;
    run(w, 600, (world) => {
      for (const ev of (world as any).events as { type: string; phase?: number }[]) {
        if (ev.type === 'bossPhase' && ev.phase === 2) sawBossPhase2 = true;
        if (ev.type === 'bossWarning') sawWarning = true;
      }
      return autopilot(world);
    });
    expect(w.status).toBe('victory');
    expect(w.wavesCompleted).toBe(MISSION_1_1.waves.length);
    expect(sawBossPhase2).toBe(true);
    expect(sawWarning).toBe(true);
  });

  it('debugForceVictory ends the mission as a victory', () => {
    const w = new GameWorld(MISSION_1_1);
    run(w, 5, input());
    w.debugForceVictory();
    expect(w.status).toBe('victory');
  });

  it('marks every 5th mission as challenge and every 10th as boss', () => {
    expect(missionKindFor(1)).toBe('standard');
    expect(missionKindFor(5)).toBe('challenge');
    expect(missionKindFor(10)).toBe('boss');
    expect(CHAPTERS).toHaveLength(10);
  });
});

describe('stars and rewards', () => {
  const base = { victory: true, healthRatio: 1, enemiesSpawned: 10, enemiesDestroyed: 10, score: 1000, coinsCollected: 20, xpCollected: 30 };

  it('awards 0-3 stars based on performance', () => {
    expect(computeStars(MISSION_1_1, { ...base, victory: false })).toBe(0);
    expect(computeStars(MISSION_1_1, { ...base, healthRatio: 0.1 })).toBe(1);
    expect(computeStars(MISSION_1_1, { ...base, healthRatio: 0.5 })).toBe(2);
    expect(computeStars(MISSION_1_1, { ...base, enemiesDestroyed: 5 })).toBe(2);
    expect(computeStars(MISSION_1_1, base)).toBe(3);
  });

  it('allocates rewards; crystals only on first clear; defeat gives partial coins', () => {
    const first = computeMissionRewards(MISSION_1_1, base, { firstClear: true, difficulty: 'normal' });
    expect(first.crystals).toBe(MISSION_1_1.rewards.firstClearCrystals);
    expect(first.coins).toBe(MISSION_1_1.rewards.coins + 3 * MISSION_1_1.rewards.coinsPerStar + 20);
    const again = computeMissionRewards(MISSION_1_1, base, { firstClear: false, difficulty: 'normal' });
    expect(again.crystals).toBe(0);
    const lost = computeMissionRewards(MISSION_1_1, { ...base, victory: false }, { firstClear: true, difficulty: 'normal' });
    expect(lost.crystals).toBe(0);
    expect(lost.coins).toBe(10);
    const hard = computeMissionRewards(MISSION_1_1, base, { firstClear: false, difficulty: 'hard' });
    expect(hard.coins).toBeGreaterThan(again.coins);
  });

  it('levels up the player when enough XP is earned', () => {
    expect(applyXp(1, 0, xpForLevel(1) - 1)).toEqual({ level: 1, xp: xpForLevel(1) - 1, levelsGained: 0 });
    const r = applyXp(1, 0, xpForLevel(1) + xpForLevel(2) + 5);
    expect(r.level).toBe(3);
    expect(r.xp).toBe(5);
    expect(r.levelsGained).toBe(2);
    expect(applyXp(1, 0, -50).xp).toBe(0);
  });
});

describe('debug helpers', () => {
  it('debugSkipToWave jumps to the requested wave', () => {
    const w = new GameWorld(MISSION_1_1, { seed: 1 });
    w.debugSkipToWave(5);
    run(w, 4, input());
    expect(w.waveIndex).toBe(5);
    expect(w.boss).toBeDefined();
  });
});
