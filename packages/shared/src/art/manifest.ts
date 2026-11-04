/**
 * SKY FORCE EVOLUTION — production art manifest (APPROVED ARTWORK LOCK).
 *
 * The user-supplied graphics sheet is the single visual reference. Every runtime sprite must be an
 * independent transparent PNG/WebP exported from (or faithfully recreated from) that sheet.
 * Nothing here is used by the game until ALL of these hold:
 *   1. the file exists at `path`,
 *   2. it passes validation (size / aspect, alpha channel, frame grid) — see scripts/check-art.mjs,
 *   3. it was visually verified in-game and its `status` was changed to 'approved' in this file.
 * Until then the game keeps its current visuals.
 *
 * This file intentionally has NO imports so `node scripts/check-art.mjs` can read it directly.
 */

export type ArtCategory = 'aircraft' | 'enemy' | 'boss' | 'projectile' | 'effect' | 'pickup' | 'environment' | 'ui';

export type ArtStatus = 'awaiting-art' | 'approved';

export interface ArtFrames {
  /** Total frames in the atlas (row-major). */
  count: number;
  columns: number;
  fps: number;
  loop: boolean;
}

/** Placement of a sprite card in the 3D world (units = world units). */
export interface ArtWorldPlacement {
  /** Card width in world units (height follows the image aspect ratio). */
  width: number;
  /** Backward tilt in radians so top-view art reads as 2.5D to the chase camera. */
  tilt: number;
  /** Normalised image coordinates (u: 0 left → 1 right, v: 0 top → 1 bottom). To confirm on delivery. */
  engines?: [number, number][];
  muzzles?: [number, number][];
}

export interface ArtAssetSpec {
  id: string;
  category: ArtCategory;
  /** Site-root path. Exported files go to apps/client/public + this path. */
  path: string;
  sourceWidth: number;
  sourceHeight: number;
  /** Must contain a real alpha channel (transparent background). */
  alpha: boolean;
  frames?: ArtFrames;
  /** Gameplay entity this art represents (aircraft / enemy / power-up / chapter id). */
  gameplayId?: string;
  world?: ArtWorldPlacement;
  /** Sheet section the art must match (for review). */
  reference: string;
  status: ArtStatus;
  notes?: string;
}

/**
 * Asset ids approved for use in game. Add an id here ONLY after the delivered file passed
 * `npm run art:check` AND was visually verified in game against the approved sheet.
 * Managed by `npm run art:approve -- <id>`; keep it on one line.
 */
export const APPROVED_ART_IDS: readonly string[] = [];

const P = '/game-assets/production';

// ───────────────────────────── Player aircraft (8) ─────────────────────────────
const AIRCRAFT_ART: [string, string][] = [
  ['falcon-x1', 'falconX1'],
  ['thunder-mk2', 'thunderMk2'],
  ['phantom-x', 'phantomX'],
  ['inferno-raptor', 'infernoRaptor'],
  ['storm-eagle', 'stormEagle'],
  ['titan-destroyer', 'titanDestroyer'],
  ['nova-striker', 'novaStriker'],
  ['galaxy-hunter', 'galaxyHunter'],
];

const aircraft: ArtAssetSpec[] = AIRCRAFT_ART.flatMap(([id, gameplayId]) => [
  {
    id,
    category: 'aircraft' as const,
    path: `${P}/aircraft/${id}.webp`,
    sourceWidth: 1024,
    sourceHeight: 1024,
    alpha: true,
    gameplayId,
    world: { width: 4.4, tilt: -0.35, engines: [[0.41, 0.94], [0.5, 0.94], [0.59, 0.94]], muzzles: [[0.5, 0.04]] },
    reference: 'Sheet: "Üst Görünüm" (top view), nose pointing up',
    status: 'awaiting-art' as const,
  },
  {
    id: `${id}-bank`,
    category: 'aircraft' as const,
    path: `${P}/aircraft/${id}-bank.webp`,
    sourceWidth: 2560,
    sourceHeight: 512,
    alpha: true,
    frames: { count: 5, columns: 5, fps: 0, loop: false },
    gameplayId,
    reference: 'Sheet: "Uçak Animasyonları" — Sola Dönüş / Uçuş / Sağa Dönüş (5 frames: hard-left, left, level, right, hard-right)',
    status: 'awaiting-art' as const,
    notes: 'Optional: when absent the single top-view sprite is rotated for banking.',
  },
]);

// ───────────────────────────── Enemies (6) ─────────────────────────────
const enemies: ArtAssetSpec[] = [
  { id: 'scout-drone', gameplayId: 'scoutDrone', width: 3.6, ref: 'Örnek Oyun İçi Görünüm — small red drones' },
  { id: 'purple-fighter', gameplayId: 'fighterJet', width: 5, ref: 'Örnek Oyun İçi Görünüm — purple/black fighters with red lights' },
  { id: 'heavy-bomber', gameplayId: 'heavyBomber', width: 10, ref: 'Approved enemy set — heavy bomber with missile launchers' },
  { id: 'shield-drone', gameplayId: 'shieldCraft', width: 4.6, ref: 'Approved enemy set — blue drone with energy shield' },
  { id: 'elite-fighter', gameplayId: undefined, width: 5.6, ref: 'Approved enemy set — elite fighter' },
  { id: 'kamikaze-drone', gameplayId: undefined, width: 3.2, ref: 'Approved enemy set — kamikaze drone' },
].map((e) => ({
  id: e.id,
  category: 'enemy' as const,
  path: `${P}/enemies/${e.id}.webp`,
  sourceWidth: 1024,
  sourceHeight: 1024,
  alpha: true,
  gameplayId: e.gameplayId,
  world: { width: e.width, tilt: -0.3 },
  reference: e.ref,
  status: 'awaiting-art' as const,
  notes: e.gameplayId ? undefined : 'No gameplay type yet — art slot reserved.',
}));

// ───────────────────────────── Boss: Shadow Commander, 3 phases ─────────────────────────────
const boss: ArtAssetSpec[] = [1, 2, 3].map((phase) => ({
  id: `shadow-commander-phase-${phase}`,
  category: 'boss' as const,
  path: `${P}/bosses/shadow-commander-phase-${phase}.webp`,
  sourceWidth: 2048,
  sourceHeight: 1228,
  alpha: true,
  gameplayId: 'academyGuardian',
  world: { width: 30, tilt: -0.25 },
  reference: `Sheet: "BOSS – Gölge Komutanı" — phase ${phase} (${phase === 1 ? 'intact' : phase === 2 ? 'damaged, reactor charging' : 'heavily damaged, enraged'})`,
  status: 'awaiting-art' as const,
}));
boss.push({
  id: 'shadow-commander-reactor',
  category: 'boss',
  path: `${P}/bosses/shadow-commander-reactor.webp`,
  sourceWidth: 512,
  sourceHeight: 512,
  alpha: true,
  frames: { count: 8, columns: 4, fps: 12, loop: true },
  gameplayId: 'academyGuardian',
  reference: 'Sheet: boss central orange-red reactor glow (animated layer)',
  status: 'awaiting-art',
  notes: 'Optional overlay; pulses faster before heavy attacks.',
});

// ───────────────────────────── Projectiles ─────────────────────────────
const projectile = (id: string, w: number, h: number, ref: string, frames?: ArtFrames): ArtAssetSpec => ({
  id, category: 'projectile', path: `${P}/projectiles/${id}.webp`, sourceWidth: w, sourceHeight: h, alpha: true, frames, reference: ref, status: 'awaiting-art',
});
const projectiles: ArtAssetSpec[] = [
  projectile('laser-blue', 128, 512, 'Silah Efektleri — Lazer Atışı'),
  projectile('laser-triple', 384, 512, 'Silah Efektleri — Üçlü Lazer'),
  projectile('laser-charged', 256, 512, 'Silah Efektleri — Özel Güç (charged shot)'),
  projectile('enemy-laser-red', 128, 512, 'Örnek Oyun İçi Görünüm — red enemy bolts'),
  projectile('missile', 256, 512, 'Silah Efektleri — Füze', { count: 4, columns: 4, fps: 16, loop: true }),
  projectile('bomb', 256, 256, 'Approved weapon set — bomb'),
  projectile('plasma-orb', 256, 256, 'Approved weapon set — plasma', { count: 8, columns: 4, fps: 16, loop: true }),
  projectile('lightning-arc', 512, 128, 'Approved weapon set — lightning arc', { count: 4, columns: 1, fps: 20, loop: true }),
];

// ───────────────────────────── Effects ─────────────────────────────
const effect = (id: string, w: number, h: number, ref: string, frames?: ArtFrames): ArtAssetSpec => ({
  id, category: 'effect', path: `${P}/effects/${id}.webp`, sourceWidth: w, sourceHeight: h, alpha: true, frames, reference: ref, status: 'awaiting-art',
});
const effects: ArtAssetSpec[] = [
  effect('explosion-small', 2048, 512, 'Patlama Efektleri — small burst (frames 1–2 of sheet row)', { count: 8, columns: 8, fps: 24, loop: false }),
  effect('explosion-large', 2048, 1536, 'Patlama Efektleri — large fireball', { count: 12, columns: 4, fps: 24, loop: false }),
  effect('smoke', 2048, 256, 'Patlama Efektleri — grey smoke puffs', { count: 8, columns: 8, fps: 12, loop: false }),
  effect('engine-thrust', 1024, 256, 'Uçuş Efektleri — Normal Motor flame', { count: 4, columns: 4, fps: 20, loop: true }),
  effect('engine-boost', 1024, 256, 'Uçuş Efektleri — Hızlanma (Boost) flame', { count: 4, columns: 4, fps: 24, loop: true }),
  effect('shield-bubble', 1024, 1024, 'Uçuş Efektleri / Uçak Animasyonları — Kalkan (Shield)'),
  effect('power-up-aura', 1024, 1024, 'Uçuş Efektleri — Güçlenme (golden arrows aura)', { count: 8, columns: 4, fps: 16, loop: true }),
  effect('damage-sparks', 768, 512, 'Uçak Animasyonları — Hasar Alma sparks', { count: 6, columns: 3, fps: 20, loop: false }),
  effect('muzzle-flash', 256, 256, 'Silah Efektleri — muzzle flash'),
  effect('special-energy', 1024, 1024, 'Silah Efektleri — Özel Güç energy burst', { count: 8, columns: 4, fps: 20, loop: false }),
];

// ───────────────────────────── Pickups (sheet "Oyun İkonları ve Bonuslar") ─────────────────────────────
/** Sheet icon → gameplay power-up id (undefined = icon has no gameplay effect yet). */
export const PICKUP_ART_MAP: Record<string, string | undefined> = {
  star: 'invincibility', // Yıldız
  shield: 'shield', // Kalkan
  upgrade: 'specialCharge', // Yükseltme (green wrench)
  power: 'lightning', // Güç (purple lightning)
  missile: 'homingMissiles', // Füze
  heart: 'health', // Can
  speed: 'speedBoost', // Hız
  'double-fire': 'tripleFire', // Çift Atış
  magnet: undefined, // Manyetik — no gameplay power-up yet
  coin: 'coinMultiplier', // Altın
};
/** Gameplay power-ups that have no icon on the approved sheet (need an art decision). */
export const POWERUPS_WITHOUT_SHEET_ICON = ['doubleDamage', 'energy'] as const;

const pickups: ArtAssetSpec[] = Object.entries(PICKUP_ART_MAP).map(([icon, gameplayId]) => ({
  id: `pickup-${icon}`,
  category: 'pickup' as const,
  path: `${P}/pickups/${icon}.webp`,
  sourceWidth: 512,
  sourceHeight: 512,
  alpha: true,
  gameplayId,
  reference: `Sheet: "Oyun İkonları ve Bonuslar" — ${icon}`,
  status: 'awaiting-art' as const,
}));

// ───────────────────────────── Environments (10 chapters × 5 parallax layers) ─────────────────────────────
/** Must match CHAPTERS[].theme in config/missions.ts (checked by tests). */
export const ART_CHAPTER_THEMES = [
  'skyAcademy', 'mountainAssault', 'desertStorm', 'oceanFortress', 'frozenTerritory',
  'neonCity', 'volcanoZone', 'alienPlanet', 'orbitalBattlefield', 'finalGalacticWar',
] as const;
export const ENVIRONMENT_LAYERS = [
  { layer: 'sky', w: 2048, h: 1024, alpha: false, note: 'sky gradient + clouds, horizontally seamless' },
  { layer: 'far', w: 2048, h: 1024, alpha: true, note: 'distant mountains / skyline, horizontally seamless' },
  { layer: 'cliffs', w: 2048, h: 2048, alpha: true, note: 'left+right cliff walls with waterfalls/vegetation, vertically seamless' },
  { layer: 'ground', w: 1024, h: 2048, alpha: false, note: 'river / ground surface, vertically seamless' },
  { layer: 'props', w: 2048, h: 2048, alpha: true, note: 'atlas: trees, towers, bridge, flags, banners' },
] as const;

const environments: ArtAssetSpec[] = ART_CHAPTER_THEMES.flatMap((theme, i) =>
  ENVIRONMENT_LAYERS.map((l) => ({
    id: `env-${i + 1}-${l.layer}`,
    category: 'environment' as const,
    path: `${P}/environments/chapter-${String(i + 1).padStart(2, '0')}/${l.layer}.webp`,
    sourceWidth: l.w,
    sourceHeight: l.h,
    alpha: l.alpha,
    gameplayId: theme,
    reference: i === 0 ? `Sheet: "Örnek Oyun İçi Görünüm" — ${l.note}` : `Chapter ${i + 1} environment in approved style — ${l.note}`,
    status: 'awaiting-art' as const,
  })),
);

// ───────────────────────────── UI: menu, hangar, upgrades, HUD ─────────────────────────────
const ui = (id: string, w: number, h: number, ref: string, alpha = true): ArtAssetSpec => ({
  id: `ui-${id}`, category: 'ui', path: `${P}/ui/${id}.webp`, sourceWidth: w, sourceHeight: h, alpha, reference: ref, status: 'awaiting-art',
});
const uiAssets: ArtAssetSpec[] = [
  ui('logo', 1024, 512, 'Sheet: SKY FORCE EVOLUTION logo with wings'),
  ui('menu-background', 2560, 1440, 'Main menu background (no baked text/buttons)', false),
  ui('hangar-background', 2560, 1440, 'Hangar background with platform', false),
  ui('upgrades-background', 2560, 1440, 'Upgrades screen background', false),
  ui('pilot-avatar', 256, 256, 'Örnek Oyun İçi Görünüm — PilotTR avatar'),
  ui('heart-full', 128, 128, 'Kalp / Can Göstergesi — full heart'),
  ui('heart-half', 128, 128, 'Kalp / Can Göstergesi — half heart'),
  ui('heart-empty', 128, 128, 'Kalp / Can Göstergesi — empty heart'),
  ui('energy-bar', 512, 128, 'Güç / Enerji Çubuğu frame'),
  ui('shield-bar', 512, 128, 'Kalkan Göstergesi frame'),
  ui('boss-skull', 256, 256, 'BOSS bar skull emblem'),
  ui('coin', 128, 128, 'Coin currency icon'),
  ui('crystal', 128, 128, 'Crystal currency icon'),
  ui('joystick-base', 512, 512, 'Örnek Oyun İçi Görünüm — joystick ring'),
  ui('joystick-knob', 256, 256, 'Joystick knob'),
  ui('button-fire', 256, 256, 'Fire button (crosshair)'),
  ui('button-missile', 256, 256, 'Missile button'),
  ui('button-special', 256, 256, 'Special (purple gem) button'),
  ui('button-dash', 256, 256, 'Dash button'),
  ui('button-lock', 256, 256, 'Target lock button'),
];

export const ART_MANIFEST: readonly ArtAssetSpec[] = [
  ...aircraft, ...enemies, ...boss, ...projectiles, ...effects, ...pickups, ...environments, ...uiAssets,
].map((a) => ({ ...a, status: APPROVED_ART_IDS.includes(a.id) ? ('approved' as const) : ('awaiting-art' as const) }));

export const artById = (id: string): ArtAssetSpec | undefined => ART_MANIFEST.find((a) => a.id === id);

/** Art for a gameplay entity in a category (e.g. aircraft 'falconX1'). */
export const artForGameplay = (category: ArtCategory, gameplayId: string): ArtAssetSpec | undefined =>
  ART_MANIFEST.find((a) => a.category === category && a.gameplayId === gameplayId && !a.id.endsWith('-bank'));

export const ART_CATEGORY_LABELS: Record<ArtCategory, string> = {
  aircraft: 'Oyuncu uçakları',
  enemy: 'Düşmanlar',
  boss: 'Boss (Gölge Komutanı)',
  projectile: 'Mermiler (lazer, füze, bomba)',
  effect: 'Efektler (patlama, kalkan, enerji)',
  pickup: 'Bonuslar',
  environment: 'Bölüm ortamları',
  ui: 'Menü, hangar ve HUD',
};
