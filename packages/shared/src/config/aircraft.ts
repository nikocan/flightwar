import type { WeaponId } from './weapons';

export type AircraftId =
  | 'falconX1'
  | 'thunderMk2'
  | 'phantomX'
  | 'infernoRaptor'
  | 'stormEagle'
  | 'titanDestroyer'
  | 'novaStriker'
  | 'galaxyHunter';

export type AircraftClass = 'starter' | 'assault' | 'stealth' | 'heavy' | 'speed' | 'tank' | 'elite' | 'legendary';

export type SpecialId =
  | 'rapidFire'
  | 'chainLightning'
  | 'invisibility'
  | 'plasmaCannon'
  | 'dashAttack'
  | 'energyShield'
  | 'homingSalvo'
  | 'orbitalStrike';

export interface AircraftStats {
  health: number;
  /** Damage mitigation: damage * 100 / (100 + armor). */
  armor: number;
  /** 100 = baseline movement speed. */
  speed: number;
  /** 100 = baseline acceleration / responsiveness. */
  agility: number;
  /** 100 = weapon damage x1.0. */
  firepower: number;
  /** 0..1 chance for a critical hit. */
  critChance: number;
  /** Multiplier applied on critical hits. */
  critDamage: number;
  energy: number;
  /** Seconds. */
  specialCooldown: number;
}

export interface AircraftModelParams {
  /** Visual archetype used by the procedural mesh builder. */
  shape: 'falcon' | 'delta' | 'stealth' | 'heavy' | 'needle' | 'fortress' | 'forward' | 'halo';
  primary: string;
  secondary: string;
  accent: string;
  engine: string;
  scale: number;
}

export interface UnlockRequirement {
  type: 'default' | 'playerLevel' | 'chapter' | 'coins';
  value: number;
}

export interface SpecialDef {
  id: SpecialId;
  nameKey: string;
  descriptionKey: string;
  duration: number;
  /** Phase in which the special is implemented in the simulation. */
  availableInPhase: number;
}

export const SPECIALS: Record<SpecialId, SpecialDef> = {
  rapidFire: { id: 'rapidFire', nameKey: 'special.rapidFire', descriptionKey: 'special.rapidFire.desc', duration: 5, availableInPhase: 1 },
  chainLightning: { id: 'chainLightning', nameKey: 'special.chainLightning', descriptionKey: 'special.chainLightning.desc', duration: 0, availableInPhase: 4 },
  invisibility: { id: 'invisibility', nameKey: 'special.invisibility', descriptionKey: 'special.invisibility.desc', duration: 4, availableInPhase: 4 },
  plasmaCannon: { id: 'plasmaCannon', nameKey: 'special.plasmaCannon', descriptionKey: 'special.plasmaCannon.desc', duration: 0, availableInPhase: 4 },
  dashAttack: { id: 'dashAttack', nameKey: 'special.dashAttack', descriptionKey: 'special.dashAttack.desc', duration: 0.6, availableInPhase: 4 },
  energyShield: { id: 'energyShield', nameKey: 'special.energyShield', descriptionKey: 'special.energyShield.desc', duration: 6, availableInPhase: 4 },
  homingSalvo: { id: 'homingSalvo', nameKey: 'special.homingSalvo', descriptionKey: 'special.homingSalvo.desc', duration: 0, availableInPhase: 4 },
  orbitalStrike: { id: 'orbitalStrike', nameKey: 'special.orbitalStrike', descriptionKey: 'special.orbitalStrike.desc', duration: 0, availableInPhase: 4 },
};

export interface AircraftDef {
  id: AircraftId;
  name: string;
  class: AircraftClass;
  stats: AircraftStats;
  primaryWeapon: WeaponId;
  special: SpecialId;
  unlock: UnlockRequirement;
  model: AircraftModelParams;
  /** Phase in which the aircraft becomes selectable. */
  availableInPhase: number;
}

export const AIRCRAFT: Record<AircraftId, AircraftDef> = {
  falconX1: {
    id: 'falconX1', name: 'Falcon X1', class: 'starter',
    stats: { health: 140, armor: 10, speed: 100, agility: 100, firepower: 100, critChance: 0.08, critDamage: 1.8, energy: 100, specialCooldown: 14 },
    primaryWeapon: 'machineGun', special: 'rapidFire', unlock: { type: 'default', value: 0 },
    model: { shape: 'falcon', primary: '#e6edf7', secondary: '#1f4fd1', accent: '#ff3048', engine: '#4fc3ff', scale: 1 },
    availableInPhase: 1,
  },
  thunderMk2: {
    id: 'thunderMk2', name: 'Thunder MK-II', class: 'assault',
    stats: { health: 160, armor: 15, speed: 95, agility: 95, firepower: 115, critChance: 0.1, critDamage: 1.8, energy: 110, specialCooldown: 16 },
    primaryWeapon: 'doubleLaser', special: 'chainLightning', unlock: { type: 'playerLevel', value: 5 },
    model: { shape: 'delta', primary: '#2b3148', secondary: '#ffd23f', accent: '#b98cff', engine: '#8ab4ff', scale: 1.05 },
    availableInPhase: 4,
  },
  phantomX: {
    id: 'phantomX', name: 'Phantom X', class: 'stealth',
    stats: { health: 130, armor: 8, speed: 115, agility: 120, firepower: 105, critChance: 0.18, critDamage: 2.2, energy: 120, specialCooldown: 18 },
    primaryWeapon: 'tripleLaser', special: 'invisibility', unlock: { type: 'chapter', value: 2 },
    model: { shape: 'stealth', primary: '#1a1d29', secondary: '#3c4257', accent: '#5cf2c6', engine: '#5cf2c6', scale: 1 },
    availableInPhase: 4,
  },
  infernoRaptor: {
    id: 'infernoRaptor', name: 'Inferno Raptor', class: 'heavy',
    stats: { health: 200, armor: 25, speed: 85, agility: 80, firepower: 135, critChance: 0.08, critDamage: 1.9, energy: 120, specialCooldown: 18 },
    primaryWeapon: 'plasmaCannon', special: 'plasmaCannon', unlock: { type: 'chapter', value: 3 },
    model: { shape: 'heavy', primary: '#3a1c1c', secondary: '#ff5a1f', accent: '#ffb347', engine: '#ff7a3d', scale: 1.15 },
    availableInPhase: 4,
  },
  stormEagle: {
    id: 'stormEagle', name: 'Storm Eagle', class: 'speed',
    stats: { health: 125, armor: 6, speed: 140, agility: 135, firepower: 100, critChance: 0.12, critDamage: 1.9, energy: 130, specialCooldown: 10 },
    primaryWeapon: 'spreadShot', special: 'dashAttack', unlock: { type: 'chapter', value: 4 },
    model: { shape: 'needle', primary: '#e8f4ff', secondary: '#00b3a4', accent: '#7affff', engine: '#7affff', scale: 0.95 },
    availableInPhase: 4,
  },
  titanDestroyer: {
    id: 'titanDestroyer', name: 'Titan Destroyer', class: 'tank',
    stats: { health: 280, armor: 40, speed: 75, agility: 70, firepower: 120, critChance: 0.05, critDamage: 1.7, energy: 140, specialCooldown: 20 },
    primaryWeapon: 'explosiveRockets', special: 'energyShield', unlock: { type: 'chapter', value: 5 },
    model: { shape: 'fortress', primary: '#4a5560', secondary: '#9aa7b3', accent: '#4dd2ff', engine: '#4dd2ff', scale: 1.25 },
    availableInPhase: 4,
  },
  novaStriker: {
    id: 'novaStriker', name: 'Nova Striker', class: 'elite',
    stats: { health: 190, armor: 22, speed: 120, agility: 120, firepower: 140, critChance: 0.15, critDamage: 2.1, energy: 150, specialCooldown: 15 },
    primaryWeapon: 'lightning', special: 'homingSalvo', unlock: { type: 'chapter', value: 7 },
    model: { shape: 'forward', primary: '#f2f2ff', secondary: '#6a3df4', accent: '#ff4fd8', engine: '#c58cff', scale: 1.05 },
    availableInPhase: 4,
  },
  galaxyHunter: {
    id: 'galaxyHunter', name: 'Galaxy Hunter', class: 'legendary',
    stats: { health: 230, armor: 30, speed: 130, agility: 130, firepower: 160, critChance: 0.2, critDamage: 2.4, energy: 180, specialCooldown: 22 },
    primaryWeapon: 'legendaryBlast', special: 'orbitalStrike', unlock: { type: 'chapter', value: 9 },
    model: { shape: 'halo', primary: '#120b2e', secondary: '#9b5cff', accent: '#ffd700', engine: '#d27bff', scale: 1.15 },
    availableInPhase: 4,
  },
};

export const AIRCRAFT_ORDER: readonly AircraftId[] = [
  'falconX1', 'thunderMk2', 'phantomX', 'infernoRaptor', 'stormEagle', 'titanDestroyer', 'novaStriker', 'galaxyHunter',
];
