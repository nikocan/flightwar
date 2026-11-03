/**
 * Asset manifest: every production 3D asset the game can use.
 * Files live in `apps/client/public/models` / `public/textures`. Missing files fall back to the
 * procedural placeholder so the game always stays playable.
 */
export type AssetKind = 'aircraft' | 'boss' | 'enemy' | 'prop' | 'environment' | 'hdri' | 'texture';

export interface ModelLod {
  /** Path relative to the site root. */
  url: string;
  /** Use this LOD when the object is closer than this distance (world units). */
  maxDistance: number;
}

export interface AssetEntry {
  id: string;
  kind: AssetKind;
  /** Primary (highest detail) file. */
  url: string;
  /** Optional lower-detail versions for distance LOD. */
  lods?: ModelLod[];
  /** Target length along the model's longest horizontal axis, in world units. */
  targetSize?: number;
  /** Euler rotation (radians) applied after loading to match forward = -Z, up = +Y. */
  rotation?: [number, number, number];
  /** Load before the menu appears (true) or lazily when first needed. */
  preload: boolean;
  /** Short description used by the asset report. */
  description: string;
}

export const ASSETS: AssetEntry[] = [
  {
    id: 'aircraft.falconX1',
    kind: 'aircraft',
    url: '/models/player_falcon_x1.glb',
    lods: [{ url: '/models/player_falcon_x1_lod1.glb', maxDistance: 60 }],
    targetSize: 9,
    preload: true,
    description: 'Player starter fighter (white / metallic blue / red, three engines)',
  },
  {
    id: 'boss.mothership',
    kind: 'boss',
    url: '/models/boss_mothership.glb',
    targetSize: 46,
    preload: true,
    description: 'Academy Guardian mothership boss',
  },
  { id: 'enemy.scoutDrone', kind: 'enemy', url: '/models/enemy_scout_drone.glb', targetSize: 3.4, preload: false, description: 'Scout drone' },
  { id: 'enemy.fighterJet', kind: 'enemy', url: '/models/enemy_fighter.glb', targetSize: 5, preload: false, description: 'Enemy fighter jet' },
  { id: 'enemy.heavyBomber', kind: 'enemy', url: '/models/enemy_bomber.glb', targetSize: 10, preload: false, description: 'Heavy bomber' },
  { id: 'hdri.sunset', kind: 'hdri', url: '/textures/sky_sunset_2k.hdr', preload: true, description: 'Sunset HDR environment for reflections & lighting' },
];

export const assetById = (id: string) => ASSETS.find((a) => a.id === id);
