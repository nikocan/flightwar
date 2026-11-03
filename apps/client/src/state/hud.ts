import { create } from 'zustand';
import type { PowerUpId, TimedEffectId } from '@sfe/shared';

export interface HudEffect {
  id: TimedEffectId;
  remaining: number;
  duration: number;
}

export interface HudToast {
  id: number;
  text: string;
  color: string;
  icon?: string;
}

export interface HudBanner {
  id: number;
  text: string;
  tone: 'info' | 'warning' | 'boss';
}

/**
 * Throttled snapshot of the simulation for React UI (updated ~12x per second, not per frame,
 * so the HUD never causes per-frame React re-renders).
 */
export interface HudSnapshot {
  hp: number;
  maxHp: number;
  shield: number;
  shieldMax: number;
  energy: number;
  maxEnergy: number;
  score: number;
  coins: number;
  combo: number;
  wave: number;
  totalWaves: number;
  progress: number;
  missiles: number;
  specialReady: number; // 0..1
  specialActive: boolean;
  dashReady: number; // 0..1
  locked: boolean;
  effects: HudEffect[];
  boss: { hp: number; maxHp: number; phase: number } | null;
  fps: number;
  shotsFired: number;
  kills: number;
}

interface HudState extends HudSnapshot {
  paused: boolean;
  ended: boolean;
  toasts: HudToast[];
  banner: HudBanner | null;
  damageFlash: number;
  update: (s: Partial<HudSnapshot>) => void;
  setPaused: (p: boolean) => void;
  setEnded: (e: boolean) => void;
  pushToast: (text: string, color: string, icon?: string) => void;
  showBanner: (text: string, tone: HudBanner['tone']) => void;
  flashDamage: () => void;
  reset: () => void;
}

const empty: HudSnapshot = {
  hp: 1, maxHp: 1, shield: 0, shieldMax: 0, energy: 0, maxEnergy: 1, score: 0, coins: 0, combo: 1,
  wave: 0, totalWaves: 1, progress: 0, missiles: 0, specialReady: 1, specialActive: false, dashReady: 1,
  locked: false, effects: [], boss: null, fps: 0, shotsFired: 0, kills: 0,
};

let toastId = 0;

export const useHud = create<HudState>()((set) => ({
  ...empty,
  paused: false,
  ended: false,
  toasts: [],
  banner: null,
  damageFlash: 0,
  update: (s) => set(s),
  setPaused: (paused) => set({ paused }),
  setEnded: (ended) => set({ ended }),
  pushToast: (text, color, icon) => {
    const id = ++toastId;
    set((st) => ({ toasts: [...st.toasts.slice(-3), { id, text, color, icon }] }));
    setTimeout(() => set((st) => ({ toasts: st.toasts.filter((x) => x.id !== id) })), 2200);
  },
  showBanner: (text, tone) => {
    const id = ++toastId;
    set({ banner: { id, text, tone } });
    setTimeout(() => set((st) => (st.banner?.id === id ? { banner: null } : {})), tone === 'warning' ? 1600 : 2600);
  },
  flashDamage: () => set((st) => ({ damageFlash: st.damageFlash + 1 })),
  reset: () => set({ ...empty, paused: false, ended: false, toasts: [], banner: null }),
}));

export type { PowerUpId };
