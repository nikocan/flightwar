import type { Rng } from '../rng';

export interface DamageInput {
  baseDamage: number;
  /** Attacker firepower stat, 100 = x1. */
  firepower: number;
  critChance: number;
  critMultiplier: number;
  targetArmor: number;
  /** Additional multipliers (power-ups, difficulty...). */
  multiplier?: number;
}

export interface DamageResult {
  amount: number;
  crit: boolean;
}

/** Armor mitigation curve: armor 100 halves incoming damage. Never reaches zero. */
export const armorFactor = (armor: number): number => 100 / (100 + Math.max(0, armor));

export function computeDamage(input: DamageInput, rng: Rng): DamageResult {
  const crit = input.critChance > 0 && rng.next() < input.critChance;
  const raw =
    input.baseDamage *
    (input.firepower / 100) *
    (input.multiplier ?? 1) *
    (crit ? input.critMultiplier : 1);
  const amount = Math.max(1, raw * armorFactor(input.targetArmor));
  return { amount, crit };
}

export interface AbsorbResult {
  /** Damage that reached health. */
  toHealth: number;
  /** Shield remaining after absorbing. */
  shieldLeft: number;
}

/** Shields absorb damage first; the remainder hits health. */
export function absorbWithShield(damage: number, shield: number): AbsorbResult {
  if (shield <= 0) return { toHealth: damage, shieldLeft: 0 };
  if (shield >= damage) return { toHealth: 0, shieldLeft: shield - damage };
  return { toHealth: damage - shield, shieldLeft: 0 };
}
