export type PowerUpId =
  | 'health'
  | 'shield'
  | 'doubleDamage'
  | 'tripleFire'
  | 'homingMissiles'
  | 'lightning'
  | 'speedBoost'
  | 'energy'
  | 'coinMultiplier'
  | 'invincibility'
  | 'specialCharge';

export interface PowerUpDef {
  id: PowerUpId;
  nameKey: string;
  /** Seconds for timed effects, 0 for instant effects. */
  duration: number;
  /** Relative drop weight. */
  weight: number;
  color: string;
  icon: string;
  /** Effect magnitude (meaning depends on the power-up). */
  amount: number;
}

export const POWERUPS: Record<PowerUpId, PowerUpDef> = {
  health: { id: 'health', nameKey: 'powerup.health', duration: 0, weight: 18, color: '#4dff88', icon: '✚', amount: 0.3 },
  shield: { id: 'shield', nameKey: 'powerup.shield', duration: 12, weight: 12, color: '#4dd2ff', icon: '⛨', amount: 0.45 },
  doubleDamage: { id: 'doubleDamage', nameKey: 'powerup.doubleDamage', duration: 10, weight: 9, color: '#ff4f6d', icon: '✖2', amount: 2 },
  tripleFire: { id: 'tripleFire', nameKey: 'powerup.tripleFire', duration: 12, weight: 11, color: '#ffd23f', icon: '⋔', amount: 2 },
  homingMissiles: { id: 'homingMissiles', nameKey: 'powerup.homingMissiles', duration: 0, weight: 10, color: '#ffb02e', icon: '➶', amount: 4 },
  lightning: { id: 'lightning', nameKey: 'powerup.lightning', duration: 0, weight: 6, color: '#b98cff', icon: 'ϟ', amount: 60 },
  speedBoost: { id: 'speedBoost', nameKey: 'powerup.speedBoost', duration: 8, weight: 7, color: '#7affff', icon: '»', amount: 1.4 },
  energy: { id: 'energy', nameKey: 'powerup.energy', duration: 0, weight: 9, color: '#59c8ff', icon: 'ϟ', amount: 1 },
  coinMultiplier: { id: 'coinMultiplier', nameKey: 'powerup.coinMultiplier', duration: 15, weight: 7, color: '#ffd700', icon: '¢2', amount: 2 },
  invincibility: { id: 'invincibility', nameKey: 'powerup.invincibility', duration: 5, weight: 3, color: '#ffffff', icon: '★', amount: 1 },
  specialCharge: { id: 'specialCharge', nameKey: 'powerup.specialCharge', duration: 0, weight: 6, color: '#ff8cf0', icon: '◆', amount: 1 },
};

export const POWERUP_IDS = Object.keys(POWERUPS) as PowerUpId[];

export const POWERUP_RULES = {
  radius: 1.2,
  /** Units/sec the capsule drifts toward the player. */
  driftSpeed: 9,
  lifetime: 14,
  magnetSpeed: 28,
} as const;
