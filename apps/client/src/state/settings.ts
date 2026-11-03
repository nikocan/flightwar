import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Difficulty } from '@sfe/shared';
import { persistStorage } from './storage';

export type Quality = 'low' | 'medium' | 'high' | 'ultra';

export interface SettingsState {
  locale: 'tr' | 'en';
  quality: Quality;
  showFps: boolean;
  cameraShake: boolean;
  musicVolume: number;
  sfxVolume: number;
  uiVolume: number;
  difficulty: Difficulty;
  autoFire: boolean;
  aimAssist: boolean;
  sensitivity: number;
  leftHanded: boolean;
  buttonScale: number;
  set: (patch: Partial<Omit<SettingsState, 'set'>>) => void;
}

const isTouch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
const isSmall = typeof window !== 'undefined' && Math.min(window.innerWidth, window.innerHeight) < 600;

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      locale: 'tr',
      quality: isTouch || isSmall ? 'medium' : 'high',
      showFps: false,
      cameraShake: true,
      musicVolume: 0.5,
      sfxVolume: 0.7,
      uiVolume: 0.6,
      difficulty: 'normal',
      autoFire: !!isTouch,
      aimAssist: true,
      sensitivity: 1,
      leftHanded: false,
      buttonScale: 1,
      set: (patch) => set(patch),
    }),
    { name: 'sfe.settings.v1', storage: persistStorage, version: 1 },
  ),
);

export interface QualityProfile {
  dpr: [number, number];
  antialias: boolean;
  shadows: boolean;
  clouds: number;
  particles: number;
  terrainSegments: number;
  glowSprites: boolean;
}

export const QUALITY_PROFILES: Record<Quality, QualityProfile> = {
  low: { dpr: [0.75, 1], antialias: false, shadows: false, clouds: 14, particles: 400, terrainSegments: 64, glowSprites: false },
  medium: { dpr: [1, 1.5], antialias: true, shadows: false, clouds: 30, particles: 900, terrainSegments: 110, glowSprites: true },
  high: { dpr: [1, 2], antialias: true, shadows: true, clouds: 55, particles: 1600, terrainSegments: 160, glowSprites: true },
  ultra: { dpr: [1.5, 2], antialias: true, shadows: true, clouds: 90, particles: 2600, terrainSegments: 220, glowSprites: true },
};
