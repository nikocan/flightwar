/**
 * Weapon definitions and the data-driven 1..10 upgrade ladder.
 * All numbers live here so balancing never touches simulation code.
 */

export type WeaponId =
  | 'machineGun'
  | 'doubleLaser'
  | 'tripleLaser'
  | 'plasmaCannon'
  | 'homingMissiles'
  | 'lightning'
  | 'energyBeam'
  | 'spreadShot'
  | 'explosiveRockets'
  | 'legendaryBlast';

export interface WeaponDef {
  id: WeaponId;
  /** i18n key for the display name. */
  nameKey: string;
  damage: number;
  /** Shots per second. */
  fireRate: number;
  projectileSpeed: number;
  /** Max travel distance in world units. */
  range: number;
  /** Base number of projectiles per shot. */
  projectiles: number;
  /** Total fan angle in degrees when projectiles > 1. */
  spreadDeg: number;
  /** Horizontal spacing between parallel barrels (0 = fan only). */
  barrelSpacing: number;
  energyCost: number;
  projectileRadius: number;
  /** Visual identifiers consumed by the renderer / audio. */
  color: string;
  visual: 'bolt' | 'laser' | 'plasma' | 'missile' | 'spark' | 'beam' | 'pellet' | 'rocket' | 'nova';
  sound: 'gun' | 'laser' | 'plasma' | 'missile' | 'zap' | 'beam' | 'blast';
  /** Phase in which this weapon becomes usable by players. */
  availableInPhase: number;
}

export interface WeaponLevelModifier {
  level: number;
  /** Extra projectiles added to the base count. */
  extraProjectiles: number;
  damageMultiplier: number;
  fireRateMultiplier: number;
  /** How many enemies a projectile can pass through. */
  pierce: number;
  /** Number of auxiliary side guns (fire straight ahead from wing tips). */
  sideGuns: number;
  /** Visual intensity of impact effects (1 = normal). */
  impactScale: number;
  /** Every N-th shot also emits a secondary energy burst (0 = off). */
  secondaryEvery: number;
  /** Ultimate evolution flag (unlocks special visuals). */
  evolved: boolean;
  /** i18n key describing what this level adds. */
  descriptionKey: string;
}

/** Upgrade ladder shared by all weapons (mirrors the design document). */
export const WEAPON_LEVELS: readonly WeaponLevelModifier[] = [
  { level: 1, extraProjectiles: 0, damageMultiplier: 1, fireRateMultiplier: 1, pierce: 0, sideGuns: 0, impactScale: 1, secondaryEvery: 0, evolved: false, descriptionKey: 'weaponLevel.1' },
  { level: 2, extraProjectiles: 1, damageMultiplier: 1, fireRateMultiplier: 1, pierce: 0, sideGuns: 0, impactScale: 1, secondaryEvery: 0, evolved: false, descriptionKey: 'weaponLevel.2' },
  { level: 3, extraProjectiles: 2, damageMultiplier: 1, fireRateMultiplier: 1, pierce: 0, sideGuns: 0, impactScale: 1, secondaryEvery: 0, evolved: false, descriptionKey: 'weaponLevel.3' },
  { level: 4, extraProjectiles: 2, damageMultiplier: 1.3, fireRateMultiplier: 1, pierce: 0, sideGuns: 0, impactScale: 1.1, secondaryEvery: 0, evolved: false, descriptionKey: 'weaponLevel.4' },
  { level: 5, extraProjectiles: 2, damageMultiplier: 1.3, fireRateMultiplier: 1, pierce: 1, sideGuns: 0, impactScale: 1.1, secondaryEvery: 0, evolved: false, descriptionKey: 'weaponLevel.5' },
  { level: 6, extraProjectiles: 2, damageMultiplier: 1.35, fireRateMultiplier: 1, pierce: 1, sideGuns: 2, impactScale: 1.2, secondaryEvery: 0, evolved: false, descriptionKey: 'weaponLevel.6' },
  { level: 7, extraProjectiles: 2, damageMultiplier: 1.35, fireRateMultiplier: 1.3, pierce: 1, sideGuns: 2, impactScale: 1.2, secondaryEvery: 0, evolved: false, descriptionKey: 'weaponLevel.7' },
  { level: 8, extraProjectiles: 2, damageMultiplier: 1.45, fireRateMultiplier: 1.3, pierce: 2, sideGuns: 2, impactScale: 1.6, secondaryEvery: 0, evolved: false, descriptionKey: 'weaponLevel.8' },
  { level: 9, extraProjectiles: 2, damageMultiplier: 1.5, fireRateMultiplier: 1.35, pierce: 2, sideGuns: 2, impactScale: 1.6, secondaryEvery: 6, evolved: false, descriptionKey: 'weaponLevel.9' },
  { level: 10, extraProjectiles: 4, damageMultiplier: 1.8, fireRateMultiplier: 1.45, pierce: 3, sideGuns: 4, impactScale: 2, secondaryEvery: 4, evolved: true, descriptionKey: 'weaponLevel.10' },
];

export const MAX_WEAPON_LEVEL = WEAPON_LEVELS.length;

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  machineGun: { id: 'machineGun', nameKey: 'weapon.machineGun', damage: 10, fireRate: 9, projectileSpeed: 150, range: 190, projectiles: 1, spreadDeg: 4, barrelSpacing: 0.9, energyCost: 0, projectileRadius: 0.35, color: '#7fe8ff', visual: 'bolt', sound: 'gun', availableInPhase: 1 },
  doubleLaser: { id: 'doubleLaser', nameKey: 'weapon.doubleLaser', damage: 9, fireRate: 8, projectileSpeed: 170, range: 200, projectiles: 2, spreadDeg: 0, barrelSpacing: 1.2, energyCost: 0, projectileRadius: 0.35, color: '#4dd2ff', visual: 'laser', sound: 'laser', availableInPhase: 4 },
  tripleLaser: { id: 'tripleLaser', nameKey: 'weapon.tripleLaser', damage: 8, fireRate: 8, projectileSpeed: 170, range: 200, projectiles: 3, spreadDeg: 10, barrelSpacing: 0.8, energyCost: 0, projectileRadius: 0.35, color: '#5cf2c6', visual: 'laser', sound: 'laser', availableInPhase: 4 },
  plasmaCannon: { id: 'plasmaCannon', nameKey: 'weapon.plasmaCannon', damage: 34, fireRate: 3, projectileSpeed: 95, range: 180, projectiles: 1, spreadDeg: 0, barrelSpacing: 0, energyCost: 2, projectileRadius: 0.9, color: '#ff7a3d', visual: 'plasma', sound: 'plasma', availableInPhase: 4 },
  homingMissiles: { id: 'homingMissiles', nameKey: 'weapon.homingMissiles', damage: 40, fireRate: 2.2, projectileSpeed: 70, range: 230, projectiles: 1, spreadDeg: 0, barrelSpacing: 1.4, energyCost: 0, projectileRadius: 0.55, color: '#ffd25c', visual: 'missile', sound: 'missile', availableInPhase: 1 },
  lightning: { id: 'lightning', nameKey: 'weapon.lightning', damage: 14, fireRate: 5, projectileSpeed: 220, range: 140, projectiles: 1, spreadDeg: 0, barrelSpacing: 0, energyCost: 1, projectileRadius: 0.4, color: '#b98cff', visual: 'spark', sound: 'zap', availableInPhase: 4 },
  energyBeam: { id: 'energyBeam', nameKey: 'weapon.energyBeam', damage: 5, fireRate: 20, projectileSpeed: 260, range: 160, projectiles: 1, spreadDeg: 0, barrelSpacing: 0, energyCost: 0.4, projectileRadius: 0.3, color: '#7affff', visual: 'beam', sound: 'beam', availableInPhase: 4 },
  spreadShot: { id: 'spreadShot', nameKey: 'weapon.spreadShot', damage: 7, fireRate: 5, projectileSpeed: 130, range: 150, projectiles: 5, spreadDeg: 34, barrelSpacing: 0, energyCost: 0, projectileRadius: 0.35, color: '#9dff6b', visual: 'pellet', sound: 'gun', availableInPhase: 4 },
  explosiveRockets: { id: 'explosiveRockets', nameKey: 'weapon.explosiveRockets', damage: 30, fireRate: 2.5, projectileSpeed: 85, range: 200, projectiles: 1, spreadDeg: 0, barrelSpacing: 1.2, energyCost: 1, projectileRadius: 0.6, color: '#ff9b4d', visual: 'rocket', sound: 'missile', availableInPhase: 4 },
  legendaryBlast: { id: 'legendaryBlast', nameKey: 'weapon.legendaryBlast', damage: 26, fireRate: 6, projectileSpeed: 180, range: 220, projectiles: 3, spreadDeg: 8, barrelSpacing: 0.9, energyCost: 1, projectileRadius: 0.6, color: '#d27bff', visual: 'nova', sound: 'blast', availableInPhase: 4 },
};

export interface ResolvedWeaponStats {
  id: WeaponId;
  level: number;
  damage: number;
  fireRate: number;
  cooldown: number;
  projectileSpeed: number;
  range: number;
  projectiles: number;
  spreadDeg: number;
  barrelSpacing: number;
  pierce: number;
  sideGuns: number;
  impactScale: number;
  secondaryEvery: number;
  evolved: boolean;
  energyCost: number;
  projectileRadius: number;
  lifetime: number;
}

/** Combines a weapon's base definition with its upgrade level. */
export function resolveWeaponStats(def: WeaponDef, level: number): ResolvedWeaponStats {
  const clamped = Math.max(1, Math.min(MAX_WEAPON_LEVEL, Math.floor(level)));
  const mod = WEAPON_LEVELS[clamped - 1];
  const fireRate = def.fireRate * mod.fireRateMultiplier;
  return {
    id: def.id,
    level: clamped,
    damage: def.damage * mod.damageMultiplier,
    fireRate,
    cooldown: 1 / fireRate,
    projectileSpeed: def.projectileSpeed * (mod.evolved ? 1.15 : 1),
    range: def.range,
    projectiles: def.projectiles + mod.extraProjectiles,
    spreadDeg: def.spreadDeg + mod.extraProjectiles * 3,
    barrelSpacing: def.barrelSpacing,
    pierce: mod.pierce,
    sideGuns: mod.sideGuns,
    impactScale: mod.impactScale,
    secondaryEvery: mod.secondaryEvery,
    evolved: mod.evolved,
    energyCost: def.energyCost,
    projectileRadius: def.projectileRadius * (mod.evolved ? 1.3 : 1),
    lifetime: def.range / (def.projectileSpeed * (mod.evolved ? 1.15 : 1)),
  };
}

/** Coin cost to upgrade from `level` to `level + 1` (configurable curve). */
export function weaponUpgradeCost(level: number): number {
  if (level >= MAX_WEAPON_LEVEL) return Infinity;
  return Math.round(150 * Math.pow(level, 1.6));
}
