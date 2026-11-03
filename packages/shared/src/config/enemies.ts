/** Enemy archetypes. Behaviours are implemented in sim/enemyAi.ts and selected by `behavior`. */

export type EnemyId = 'scoutDrone' | 'fighterJet' | 'heavyBomber' | 'missileDrone' | 'shieldCraft' | 'academyGuardian';

export type EnemyBehavior = 'swarm' | 'strafe' | 'hover' | 'boss';

export interface EnemyAttack {
  /** Seconds between volleys (before difficulty scaling). */
  interval: number;
  /** Projectiles per volley. */
  count: number;
  spreadDeg: number;
  speed: number;
  damage: number;
  /** Aimed at player (true) or fired straight forward (false). */
  aimed: boolean;
  radius: number;
}

export interface EnemyDef {
  id: EnemyId;
  nameKey: string;
  health: number;
  armor: number;
  /** Forward (towards player) cruise speed. */
  speed: number;
  radius: number;
  behavior: EnemyBehavior;
  attack: EnemyAttack | null;
  score: number;
  coins: number;
  xp: number;
  /** Probability of dropping a power-up on destruction. */
  dropChance: number;
  /** Probability per check of side-stepping an incoming player projectile. */
  dodgeSkill: number;
  /** Seconds an attacker lingers before retreating / passing by (strafe behaviour). */
  engageTime: number;
  model: 'drone' | 'fighter' | 'bomber' | 'missileDrone' | 'shield' | 'guardian';
  color: string;
}

export const ENEMIES: Record<EnemyId, EnemyDef> = {
  scoutDrone: {
    id: 'scoutDrone', nameKey: 'enemy.scoutDrone', health: 22, armor: 0, speed: 30, radius: 1.5, behavior: 'swarm',
    attack: null, score: 100, coins: 3, xp: 4, dropChance: 0.08, dodgeSkill: 0, engageTime: 0, model: 'drone', color: '#ff4f6d',
  },
  fighterJet: {
    id: 'fighterJet', nameKey: 'enemy.fighterJet', health: 75, armor: 5, speed: 42, radius: 1.9, behavior: 'strafe',
    attack: { interval: 2.1, count: 1, spreadDeg: 0, speed: 34, damage: 9, aimed: true, radius: 0.55 },
    score: 250, coins: 6, xp: 9, dropChance: 0.18, dodgeSkill: 0.35, engageTime: 7, model: 'fighter', color: '#ff6a3d',
  },
  heavyBomber: {
    id: 'heavyBomber', nameKey: 'enemy.heavyBomber', health: 280, armor: 20, speed: 24, radius: 3.4, behavior: 'hover',
    attack: { interval: 2.8, count: 3, spreadDeg: 28, speed: 26, damage: 12, aimed: true, radius: 0.75 },
    score: 600, coins: 14, xp: 20, dropChance: 0.55, dodgeSkill: 0, engageTime: 14, model: 'bomber', color: '#c04dff',
  },
  missileDrone: {
    id: 'missileDrone', nameKey: 'enemy.missileDrone', health: 40, armor: 5, speed: 34, radius: 1.6, behavior: 'strafe',
    attack: { interval: 3.2, count: 2, spreadDeg: 16, speed: 24, damage: 11, aimed: true, radius: 0.6 },
    score: 220, coins: 6, xp: 8, dropChance: 0.15, dodgeSkill: 0.1, engageTime: 6, model: 'missileDrone', color: '#ffb02e',
  },
  shieldCraft: {
    id: 'shieldCraft', nameKey: 'enemy.shieldCraft', health: 90, armor: 45, speed: 24, radius: 2.2, behavior: 'hover',
    attack: { interval: 2.5, count: 1, spreadDeg: 0, speed: 30, damage: 10, aimed: true, radius: 0.6 },
    score: 400, coins: 10, xp: 14, dropChance: 0.3, dodgeSkill: 0.15, engageTime: 10, model: 'shield', color: '#4dd2ff',
  },
  academyGuardian: {
    id: 'academyGuardian', nameKey: 'enemy.academyGuardian', health: 4200, armor: 15, speed: 20, radius: 8.5, behavior: 'boss',
    attack: { interval: 1.6, count: 3, spreadDeg: 18, speed: 30, damage: 12, aimed: true, radius: 0.8 },
    score: 5000, coins: 120, xp: 150, dropChance: 1, dodgeSkill: 0, engageTime: 0, model: 'guardian', color: '#ff3b8d',
  },
};

/** Boss phase thresholds (fraction of health remaining that starts the phase). */
export const BOSS_RULES = {
  phaseThresholds: [1, 0.6, 0.3],
  /** Seconds of warning shown before every heavy attack. */
  telegraphTime: 1.1,
  heavyAttackInterval: 5.5,
  /** "Energy wall" heavy attack: a grid of slow projectiles with a clearly marked safe gap. */
  wallSpacingX: 2.3,
  wallSpacingY: 2.4,
  wallGapRadius: 3.8,
  wallSpeed: 22,
  wallDamage: 12,
  sweepSpeed: 0.55,
  reinforcementInterval: 9,
  holdZ: -70,
} as const;
