import { create } from 'zustand';
import type { MissionOutcome } from './profile';

export type Screen =
  | { id: 'menu' }
  | { id: 'missions' }
  | { id: 'game'; missionId: string; runId: number }
  | { id: 'settings'; from: 'menu' }
  | { id: 'updates' }
  | { id: 'aircraft' }
  | { id: 'soon'; titleKey: string; bodyKey: string; phase: number };

interface AppState {
  screen: Screen;
  lastOutcome: MissionOutcome | null;
  go: (screen: Screen) => void;
  startMission: (missionId: string) => void;
  setOutcome: (o: MissionOutcome | null) => void;
}

let runCounter = 0;

export const useApp = create<AppState>()((set) => ({
  screen: { id: 'menu' },
  lastOutcome: null,
  go: (screen) => set({ screen }),
  startMission: (missionId) => set({ screen: { id: 'game', missionId, runId: ++runCounter }, lastOutcome: null }),
  setOutcome: (lastOutcome) => set({ lastOutcome }),
}));
