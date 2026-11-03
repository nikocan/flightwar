import type { Vec3 } from '../math';
import type { EnemyDef } from '../config/enemies';
import type { PowerUpId } from '../config/powerups';
import type { WeaponId } from '../config/weapons';
import type { SpecialId } from '../config/aircraft';

/** Per-step player intent. Produced by keyboard/mouse, touch controls, or (later) the network. */
export interface InputState {
  /** -1..1 (right positive). */
  moveX: number;
  /** -1..1 (up positive). */
  moveY: number;
  /** World-space point the pilot is aiming at, or null for "straight ahead". */
  aimPoint: Vec3 | null;
  fire: boolean;
  missile: boolean;
  /** Edge-triggered actions are detected by the world (held = single activation). */
  dash: boolean;
  special: boolean;
  lockToggle: boolean;
}

export const emptyInput = (): InputState => ({
  moveX: 0,
  moveY: 0,
  aimPoint: null,
  fire: false,
  missile: false,
  dash: false,
  special: false,
  lockToggle: false,
});

export type TimedEffectId = Extract<
  PowerUpId,
  'shield' | 'doubleDamage' | 'tripleFire' | 'speedBoost' | 'coinMultiplier' | 'invincibility'
>;

export const TIMED_EFFECTS: readonly TimedEffectId[] = [
  'shield', 'doubleDamage', 'tripleFire', 'speedBoost', 'coinMultiplier', 'invincibility',
];

export interface PlayerState {
  alive: boolean;
  x: number; y: number; z: number;
  prevX: number; prevY: number; prevZ: number;
  vx: number; vy: number;
  hp: number; maxHp: number;
  shield: number; shieldMax: number;
  energy: number; maxEnergy: number;
  /** Seconds of invulnerability left (after hits / dashes). */
  invulnerable: number;
  dashTimer: number; dashCooldown: number; dashDirX: number; dashDirY: number;
  fireCooldown: number;
  shotCounter: number;
  missiles: number;
  missileCooldown: number;
  specialCooldown: number;
  specialActive: number;
  effects: Record<TimedEffectId, number>;
  lockTargetId: number;
  /** -1..1 bank/roll indicator for rendering. */
  bank: number;
  /** -1..1 pitch indicator for rendering. */
  pitch: number;
  aimX: number; aimY: number; aimZ: number;
}

export type EnemyState = 'enter' | 'engage' | 'retreat';

export interface Enemy {
  id: number;
  def: EnemyDef;
  alive: boolean;
  x: number; y: number; z: number;
  prevX: number; prevY: number; prevZ: number;
  vx: number; vy: number; vz: number;
  hp: number; maxHp: number;
  age: number;
  state: EnemyState;
  stateTime: number;
  homeX: number; homeY: number;
  engageZ: number;
  phase: number;
  fireTimer: number;
  dodgeTimer: number;
  dodgeVx: number;
  dodgeCheck: number;
  hitFlash: number;
  /** Boss only. */
  bossPhase: number;
  telegraph: number;
  heavyTimer: number;
  reinforceTimer: number;
  wallGapX: number;
  wallGapY: number;
  /** Spawned as part of mission waves (counts towards the kill ratio). */
  counted: boolean;
}

export type ProjectileKind = 'player' | 'playerSide' | 'playerSecondary' | 'missile' | 'enemy' | 'enemyHeavy' | 'enemyWall';

export interface Projectile {
  active: boolean;
  owner: 'player' | 'enemy';
  kind: ProjectileKind;
  weapon: WeaponId | null;
  x: number; y: number; z: number;
  prevX: number; prevY: number; prevZ: number;
  vx: number; vy: number; vz: number;
  speed: number;
  damage: number;
  radius: number;
  life: number;
  pierce: number;
  lastHitId: number;
  targetId: number;
  turnRate: number;
  impactScale: number;
}

export interface PowerUp {
  id: number;
  type: PowerUpId;
  alive: boolean;
  x: number; y: number; z: number;
  prevX: number; prevY: number; prevZ: number;
  age: number;
}

export type GameEvent =
  | { type: 'shot'; weapon: WeaponId; x: number; y: number; z: number; evolved: boolean }
  | { type: 'missileLaunch'; x: number; y: number; z: number }
  | { type: 'enemyShot'; x: number; y: number; z: number; heavy: boolean }
  | { type: 'hit'; x: number; y: number; z: number; crit: boolean; damage: number; enemyId: number; impactScale: number }
  | { type: 'explosion'; x: number; y: number; z: number; size: number; color: string; enemyId: number }
  | { type: 'playerHit'; damage: number; shieldOnly: boolean }
  | { type: 'pickup'; powerUp: PowerUpId; x: number; y: number; z: number }
  | { type: 'dash' }
  | { type: 'special'; special: SpecialId }
  | { type: 'lightning'; from: Vec3; points: Vec3[] }
  | { type: 'waveStart'; wave: number; total: number; bannerKey?: string; boss: boolean }
  | { type: 'bossSpawn'; enemyId: number }
  | { type: 'bossWarning'; gapX: number; gapY: number; time: number }
  | { type: 'bossPhase'; phase: number }
  | { type: 'lock'; targetId: number }
  | { type: 'combo'; multiplier: number }
  | { type: 'victory' }
  | { type: 'defeat' };

export type WorldStatus = 'running' | 'victory' | 'defeat';

export interface WorldStats {
  time: number;
  score: number;
  kills: number;
  enemiesSpawned: number;
  enemiesDestroyed: number;
  escaped: number;
  shotsFired: number;
  shotsHit: number;
  damageTaken: number;
  coins: number;
  xp: number;
  combo: number;
  comboMultiplier: number;
  comboTimer: number;
  maxComboMultiplier: number;
  powerUpsCollected: number;
}
