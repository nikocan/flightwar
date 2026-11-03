import type { MissionDef } from './config/missions';
import { DIFFICULTY, type Difficulty } from './config/balance';

export interface MissionResultStats {
  victory: boolean;
  healthRatio: number;
  enemiesSpawned: number;
  enemiesDestroyed: number;
  score: number;
  /** Coins collected during the run (already includes in-run multipliers). */
  coinsCollected: number;
  xpCollected: number;
}

/** 1★ = mission complete, 2★ = enough health left, 3★ = health + kill ratio. */
export function computeStars(mission: MissionDef, r: MissionResultStats): 0 | 1 | 2 | 3 {
  if (!r.victory) return 0;
  const killRatio = r.enemiesSpawned > 0 ? r.enemiesDestroyed / r.enemiesSpawned : 1;
  const s = mission.stars;
  if (r.healthRatio >= s.healthFor3 && killRatio >= s.killRatioFor3) return 3;
  if (r.healthRatio >= s.healthFor2) return 2;
  return 1;
}

export interface MissionRewardGrant {
  stars: 0 | 1 | 2 | 3;
  coins: number;
  xp: number;
  crystals: number;
}

/**
 * Rewards for a finished run. Defeat still grants a share of what was collected so younger
 * players always make some progress, but never mission completion rewards.
 */
export function computeMissionRewards(
  mission: MissionDef,
  r: MissionResultStats,
  opts: { firstClear: boolean; difficulty: Difficulty },
): MissionRewardGrant {
  const stars = computeStars(mission, r);
  const mult = DIFFICULTY[opts.difficulty].rewardMultiplier;
  if (!r.victory) {
    return {
      stars: 0,
      coins: Math.floor(r.coinsCollected * 0.5 * mult),
      xp: Math.floor(r.xpCollected * 0.5),
      crystals: 0,
    };
  }
  return {
    stars,
    coins: Math.floor((mission.rewards.coins + mission.rewards.coinsPerStar * stars + r.coinsCollected) * mult),
    xp: Math.floor(mission.rewards.xp + r.xpCollected),
    crystals: opts.firstClear ? mission.rewards.firstClearCrystals : 0,
  };
}

/** XP needed to go from `level` to `level + 1`. */
export const xpForLevel = (level: number): number => Math.round(100 * Math.pow(level, 1.5));

export const MAX_PLAYER_LEVEL = 60;

/** Adds XP and resolves level-ups. */
export function applyXp(level: number, xp: number, gained: number): { level: number; xp: number; levelsGained: number } {
  let l = level;
  let x = xp + Math.max(0, gained);
  let gainedLevels = 0;
  while (l < MAX_PLAYER_LEVEL && x >= xpForLevel(l)) {
    x -= xpForLevel(l);
    l++;
    gainedLevels++;
  }
  if (l >= MAX_PLAYER_LEVEL) x = 0;
  return { level: l, xp: x, levelsGained: gainedLevels };
}
