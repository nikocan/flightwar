/** Global, tweakable gameplay constants. Nothing gameplay-relevant should be hardcoded elsewhere. */

export const SIM_HZ = 60;
export const SIM_DT = 1 / SIM_HZ;

export const ARENA = {
  /** Player movement bounds (world units). */
  minX: -15,
  maxX: 15,
  minY: -6,
  maxY: 9,
  /** Where enemies appear (far ahead, negative Z is "forward"). */
  spawnZ: -170,
  /** Enemies passing this Z are considered escaped and removed. */
  despawnZ: 18,
  /** Distance of the virtual aim plane in front of the player. */
  aimDistance: 120,
  /** Projectiles are culled outside this box. */
  cullMinZ: -260,
  cullMaxZ: 30,
  cullHalfWidth: 80,
  cullHalfHeight: 50,
} as const;

export const PLAYER_RULES = {
  radius: 1.3,
  /** Base movement speed in units/sec at speed stat 100. */
  baseSpeed: 16,
  /** Acceleration response at agility stat 100. */
  baseAgility: 9,
  dashImpulse: 34,
  dashDuration: 0.22,
  dashInvulnerability: 0.35,
  dashCooldown: 1.6,
  dashEnergyCost: 20,
  energyRegenPerSec: 14,
  hitInvulnerability: 0.6,
  startingMissiles: 6,
  maxMissiles: 12,
  missileCooldown: 0.45,
  magnetRadius: 7,
  pickupRadius: 2.2,
  ramDamageToPlayer: 18,
  ramDamageToEnemy: 60,
} as const;

export const COMBO_RULES = {
  window: 2.2,
  step: 3,
  maxMultiplier: 5,
} as const;

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface DifficultyModifiers {
  enemyHealth: number;
  enemyDamage: number;
  enemyFireRate: number;
  enemyProjectileSpeed: number;
  playerDamageTaken: number;
  rewardMultiplier: number;
}

export const DIFFICULTY: Record<Difficulty, DifficultyModifiers> = {
  easy: {
    enemyHealth: 0.75,
    enemyDamage: 0.6,
    enemyFireRate: 0.7,
    enemyProjectileSpeed: 0.8,
    playerDamageTaken: 0.7,
    rewardMultiplier: 0.8,
  },
  normal: {
    enemyHealth: 1,
    enemyDamage: 1,
    enemyFireRate: 1,
    enemyProjectileSpeed: 1,
    playerDamageTaken: 1,
    rewardMultiplier: 1,
  },
  hard: {
    enemyHealth: 1.35,
    enemyDamage: 1.3,
    enemyFireRate: 1.25,
    enemyProjectileSpeed: 1.15,
    playerDamageTaken: 1.2,
    rewardMultiplier: 1.4,
  },
};

/** Aim assistance cone (degrees) and blend strength. */
export const AIM_ASSIST = {
  coneDeg: 9,
  strength: 0.85,
  /** Extra cone used when assistance is enabled for young players / touch. */
  assistedConeDeg: 16,
} as const;
