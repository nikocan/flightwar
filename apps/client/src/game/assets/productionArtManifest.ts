/**
 * Runtime art contract for Sky Force Evolution.
 * The composite concept sheet is NOT a sprite atlas.
 * Each production sprite must be delivered as an independent transparent image.
 */
export type ArtAssetCategory = 'aircraft' | 'enemy' | 'boss' | 'environment' | 'effect' | 'pickup';
export interface ArtAssetSpec {
  id: string;
  category: ArtAssetCategory;
  path: string;
  sourceWidth: number;
  sourceHeight: number;
  alpha: boolean;
  frames?: number;
  status: 'placeholder' | 'awaiting-art' | 'approved';
}

export const PRODUCTION_ART_ASSETS: readonly ArtAssetSpec[] = [
  { id: 'falcon-x1', category: 'aircraft', path: '/game-assets/production/aircraft/falcon-x1.webp', sourceWidth: 1024, sourceHeight: 1024, alpha: true, status: 'awaiting-art' },
  { id: 'shadow-commander', category: 'boss', path: '/game-assets/production/bosses/shadow-commander.webp', sourceWidth: 2048, sourceHeight: 2048, alpha: true, status: 'awaiting-art' },
  { id: 'scout-drone', category: 'enemy', path: '/game-assets/production/enemies/scout-drone.webp', sourceWidth: 1024, sourceHeight: 1024, alpha: true, status: 'awaiting-art' },
  { id: 'canyon-sky', category: 'environment', path: '/game-assets/production/canyon/sky.webp', sourceWidth: 2048, sourceHeight: 1024, alpha: false, status: 'awaiting-art' },
  { id: 'canyon-cliffs', category: 'environment', path: '/game-assets/production/canyon/cliffs.webp', sourceWidth: 2048, sourceHeight: 1024, alpha: true, status: 'awaiting-art' },
  { id: 'canyon-waterfalls', category: 'environment', path: '/game-assets/production/canyon/waterfalls.webp', sourceWidth: 1024, sourceHeight: 1024, alpha: true, status: 'awaiting-art' },
  { id: 'canyon-river', category: 'environment', path: '/game-assets/production/canyon/river.webp', sourceWidth: 1024, sourceHeight: 1024, alpha: false, status: 'awaiting-art' },
  { id: 'laser-blue', category: 'effect', path: '/game-assets/production/effects/laser-blue.webp', sourceWidth: 512, sourceHeight: 512, alpha: true, status: 'awaiting-art' },
  { id: 'explosion', category: 'effect', path: '/game-assets/production/effects/explosion.webp', sourceWidth: 2048, sourceHeight: 2048, alpha: true, frames: 16, status: 'awaiting-art' },
  { id: 'shield', category: 'effect', path: '/game-assets/production/effects/shield.webp', sourceWidth: 1024, sourceHeight: 1024, alpha: true, status: 'awaiting-art' },
  { id: 'coin', category: 'pickup', path: '/game-assets/production/pickups/coin.webp', sourceWidth: 512, sourceHeight: 512, alpha: true, status: 'awaiting-art' },
] as const;

export function getProductionArtAsset(id: string): ArtAssetSpec | undefined {
  return PRODUCTION_ART_ASSETS.find((asset) => asset.id === id);
}

/** Only return paths to art that has been reviewed and explicitly approved. */
export function approvedProductionArtPath(id: string): string | undefined {
  const asset = getProductionArtAsset(id);
  return asset?.status === 'approved' ? asset.path : undefined;
}
