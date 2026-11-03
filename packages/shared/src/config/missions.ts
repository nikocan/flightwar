import type { EnemyId } from './enemies';

export type Formation = 'line' | 'v' | 'column' | 'circle' | 'scatter' | 'single';

export interface SpawnGroup {
  enemy: EnemyId;
  count: number;
  formation: Formation;
  /** Formation centre within the arena (x/y). */
  x: number;
  y: number;
  spacing: number;
  /** Seconds after wave start before the first unit appears. */
  delay: number;
  /** Seconds between consecutive units of the group (0 = all at once). */
  interval: number;
}

export interface WaveDef {
  groups: SpawnGroup[];
  /** Wave ends early after this many seconds even if enemies remain (they keep fighting). */
  maxDuration: number;
  /** i18n key shown as wave banner (optional). */
  bannerKey?: string;
  boss?: boolean;
}

export interface StarRules {
  /** Remaining health ratio required for the 2nd star. */
  healthFor2: number;
  /** Remaining health ratio required for the 3rd star. */
  healthFor3: number;
  /** Destroyed / spawned ratio required for the 3rd star. */
  killRatioFor3: number;
}

export interface MissionRewards {
  coins: number;
  xp: number;
  /** Crystals awarded on the first completion only. */
  firstClearCrystals: number;
  /** Extra coins per star earned. */
  coinsPerStar: number;
}

export interface MissionDef {
  id: string;
  chapter: number;
  index: number;
  nameKey: string;
  briefingKey: string;
  objectiveKey: string;
  theme: ChapterTheme;
  waves: WaveDef[];
  stars: StarRules;
  rewards: MissionRewards;
  /** Mission type marker (every 5th = challenge, every 10th = boss). */
  kind: 'standard' | 'challenge' | 'boss';
}

export type ChapterTheme =
  | 'skyAcademy'
  | 'mountainAssault'
  | 'desertStorm'
  | 'oceanFortress'
  | 'frozenTerritory'
  | 'neonCity'
  | 'volcanoZone'
  | 'alienPlanet'
  | 'orbitalBattlefield'
  | 'finalGalacticWar';

export interface ChapterDef {
  id: number;
  theme: ChapterTheme;
  nameKey: string;
  /** Phase in which the chapter's missions become playable. */
  availableInPhase: number;
}

export const CHAPTERS: readonly ChapterDef[] = [
  { id: 1, theme: 'skyAcademy', nameKey: 'chapter.1', availableInPhase: 1 },
  { id: 2, theme: 'mountainAssault', nameKey: 'chapter.2', availableInPhase: 3 },
  { id: 3, theme: 'desertStorm', nameKey: 'chapter.3', availableInPhase: 3 },
  { id: 4, theme: 'oceanFortress', nameKey: 'chapter.4', availableInPhase: 3 },
  { id: 5, theme: 'frozenTerritory', nameKey: 'chapter.5', availableInPhase: 3 },
  { id: 6, theme: 'neonCity', nameKey: 'chapter.6', availableInPhase: 3 },
  { id: 7, theme: 'volcanoZone', nameKey: 'chapter.7', availableInPhase: 3 },
  { id: 8, theme: 'alienPlanet', nameKey: 'chapter.8', availableInPhase: 3 },
  { id: 9, theme: 'orbitalBattlefield', nameKey: 'chapter.9', availableInPhase: 3 },
  { id: 10, theme: 'finalGalacticWar', nameKey: 'chapter.10', availableInPhase: 3 },
];

export const MISSIONS_PER_CHAPTER = 10;

export const missionKindFor = (index: number): MissionDef['kind'] =>
  index % 10 === 0 ? 'boss' : index % 5 === 0 ? 'challenge' : 'standard';

const DEFAULT_STARS: StarRules = { healthFor2: 0.4, healthFor3: 0.65, killRatioFor3: 0.8 };

/** Chapter 1 — Mission 1: "Academy Flight". The Phase 1 vertical slice. */
export const MISSION_1_1: MissionDef = {
  id: '1-1',
  chapter: 1,
  index: 1,
  nameKey: 'mission.1-1.name',
  briefingKey: 'mission.1-1.briefing',
  objectiveKey: 'mission.1-1.objective',
  theme: 'skyAcademy',
  kind: 'standard',
  stars: DEFAULT_STARS,
  rewards: { coins: 150, xp: 120, firstClearCrystals: 5, coinsPerStar: 40 },
  waves: [
    {
      bannerKey: 'wave.incoming',
      maxDuration: 22,
      groups: [{ enemy: 'scoutDrone', count: 5, formation: 'v', x: 0, y: 2, spacing: 3.5, delay: 1.5, interval: 0 }],
    },
    {
      maxDuration: 24,
      groups: [
        { enemy: 'scoutDrone', count: 4, formation: 'column', x: -8, y: 1, spacing: 6, delay: 0.5, interval: 0.45 },
        { enemy: 'scoutDrone', count: 4, formation: 'column', x: 8, y: 4, spacing: 6, delay: 2.5, interval: 0.45 },
      ],
    },
    {
      bannerKey: 'wave.fighters',
      maxDuration: 30,
      groups: [
        { enemy: 'fighterJet', count: 3, formation: 'line', x: 0, y: 3, spacing: 9, delay: 0.5, interval: 0 },
        { enemy: 'scoutDrone', count: 4, formation: 'scatter', x: 0, y: 1, spacing: 10, delay: 4, interval: 0.6 },
      ],
    },
    {
      bannerKey: 'wave.heavy',
      maxDuration: 34,
      groups: [
        { enemy: 'heavyBomber', count: 1, formation: 'single', x: 0, y: 4, spacing: 0, delay: 0.5, interval: 0 },
        { enemy: 'scoutDrone', count: 6, formation: 'circle', x: 0, y: 3, spacing: 7, delay: 2, interval: 0.15 },
      ],
    },
    {
      maxDuration: 32,
      groups: [
        { enemy: 'fighterJet', count: 5, formation: 'v', x: 0, y: 3, spacing: 5, delay: 0.5, interval: 0 },
        { enemy: 'scoutDrone', count: 6, formation: 'line', x: 0, y: -1, spacing: 4.5, delay: 6, interval: 0 },
      ],
    },
    {
      bannerKey: 'wave.boss',
      boss: true,
      maxDuration: 600,
      groups: [{ enemy: 'academyGuardian', count: 1, formation: 'single', x: 0, y: 10, spacing: 0, delay: 2.5, interval: 0 }],
    },
  ],
};

export const MISSIONS: Record<string, MissionDef> = {
  [MISSION_1_1.id]: MISSION_1_1,
};

export const getMission = (id: string): MissionDef | undefined => MISSIONS[id];
