import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  applyXp,
  computeMissionRewards,
  getMission,
  type AircraftId,
  type Difficulty,
  type MissionRewardGrant,
  type MissionResultStats,
} from '@sfe/shared';
import { persistStorage } from './storage';

export interface MissionProgress {
  completed: boolean;
  stars: number;
  bestScore: number;
  plays: number;
}

export interface MissionOutcome {
  missionId: string;
  victory: boolean;
  stats: MissionResultStats & { kills: number; accuracy: number; maxCombo: number; time: number };
  grant: MissionRewardGrant;
  newBest: boolean;
  levelBefore: number;
  levelAfter: number;
}

/**
 * Local (guest) player profile persisted in the browser.
 * NOTE: Phase 6 moves rewards to the authoritative server; the client will then only display them.
 */
export interface ProfileState {
  pilotName: string;
  level: number;
  xp: number;
  coins: number;
  crystals: number;
  selectedAircraft: AircraftId;
  ownedAircraft: AircraftId[];
  weaponLevels: Record<string, number>;
  missions: Record<string, MissionProgress>;
  lastSeenVersion: string;
  /** Local date (YYYY-MM-DD) of the last claimed daily reward. */
  lastDailyClaim: string;
  canClaimDaily: () => boolean;
  /** Fixed, visible daily reward (never random — no loot boxes). Returns the grant or null. */
  claimDaily: () => { coins: number; crystals: number } | null;
  recordMission: (missionId: string, stats: MissionOutcome['stats'], difficulty: Difficulty) => MissionOutcome | null;
  markVersionSeen: (v: string) => void;
  /** Selects an owned aircraft (ignored for locked ones). */
  selectAircraft: (id: AircraftId) => void;
  reset: () => void;
}

const initial = {
  pilotName: 'Pilot',
  level: 1,
  xp: 0,
  coins: 0,
  crystals: 0,
  selectedAircraft: 'falconX1' as AircraftId,
  ownedAircraft: ['falconX1'] as AircraftId[],
  weaponLevels: { machineGun: 1 } as Record<string, number>,
  missions: {} as Record<string, MissionProgress>,
  lastSeenVersion: '',
  lastDailyClaim: '',
};

export const DAILY_REWARD = { coins: 100, crystals: 2 } as const;
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const useProfile = create<ProfileState>()(
  persist(
    (set, get) => ({
      ...initial,
      recordMission: (missionId, stats, difficulty) => {
        const mission = getMission(missionId);
        if (!mission) return null;
        const s = get();
        const prev = s.missions[missionId];
        const firstClear = stats.victory && !prev?.completed;
        const grant = computeMissionRewards(mission, stats, { firstClear, difficulty });
        const lvl = applyXp(s.level, s.xp, grant.xp);
        const newBest = stats.victory && stats.score > (prev?.bestScore ?? 0);
        set({
          coins: s.coins + grant.coins,
          crystals: s.crystals + grant.crystals,
          level: lvl.level,
          xp: lvl.xp,
          missions: {
            ...s.missions,
            [missionId]: {
              completed: !!prev?.completed || stats.victory,
              stars: Math.max(prev?.stars ?? 0, grant.stars),
              bestScore: stats.victory ? Math.max(prev?.bestScore ?? 0, stats.score) : prev?.bestScore ?? 0,
              plays: (prev?.plays ?? 0) + 1,
            },
          },
        });
        return { missionId, victory: stats.victory, stats, grant, newBest, levelBefore: s.level, levelAfter: lvl.level };
      },
      markVersionSeen: (v) => set({ lastSeenVersion: v }),
      selectAircraft: (id) => {
        if (get().ownedAircraft.includes(id)) set({ selectedAircraft: id });
      },
      canClaimDaily: () => get().lastDailyClaim !== today(),
      claimDaily: () => {
        const s = get();
        if (s.lastDailyClaim === today()) return null;
        set({ lastDailyClaim: today(), coins: s.coins + DAILY_REWARD.coins, crystals: s.crystals + DAILY_REWARD.crystals });
        return { ...DAILY_REWARD };
      },
      reset: () => set({ ...initial }),
    }),
    { name: 'sfe.profile.v1', storage: persistStorage, version: 1 },
  ),
);
