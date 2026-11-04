import * as THREE from 'three';
import { ART_MANIFEST, artById, artForGameplay, type ArtAssetSpec } from '@sfe/shared';

/**
 * Runtime loader for the production 2.5D art package (see packages/shared/src/art/manifest.ts).
 * Only assets with status 'approved' are requested at all; everything else keeps the current visuals.
 */
export type ArtRuntimeState = 'awaiting-art' | 'missing' | 'invalid' | 'ready';

const textures = new Map<string, THREE.Texture>();
const states = new Map<string, { state: ArtRuntimeState; reason?: string }>();

async function loadOne(a: ArtAssetSpec): Promise<void> {
  try {
    const head = await fetch(a.path, { method: 'HEAD' });
    if (!head.ok || (head.headers.get('content-type') ?? '').includes('text/html')) {
      states.set(a.id, { state: 'missing' });
      return;
    }
    const tex = await new THREE.TextureLoader().loadAsync(a.path);
    const img = tex.image as HTMLImageElement;
    const aspect = img.width / img.height;
    const specAspect = a.sourceWidth / a.sourceHeight;
    if (Math.abs(aspect - specAspect) / specAspect > 0.01) {
      states.set(a.id, { state: 'invalid', reason: `aspect ${img.width}×${img.height}` });
      tex.dispose();
      return;
    }
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    if (a.frames) {
      tex.repeat.set(1 / a.frames.columns, 1 / Math.ceil(a.frames.count / a.frames.columns));
    }
    textures.set(a.id, tex);
    states.set(a.id, { state: 'ready' });
  } catch (e) {
    states.set(a.id, { state: 'invalid', reason: (e as Error).message });
  }
}

/** Loads every approved asset once at startup (never during combat). Never rejects. */
export async function preloadApprovedArt(): Promise<void> {
  const approved = ART_MANIFEST.filter((a) => a.status === 'approved');
  for (const a of ART_MANIFEST) if (a.status !== 'approved') states.set(a.id, { state: 'awaiting-art' });
  await Promise.all(approved.map(loadOne));
}

export const artState = (id: string) => states.get(id) ?? { state: 'awaiting-art' as ArtRuntimeState };
export const artTexture = (id: string): THREE.Texture | undefined => textures.get(id);

/** URL for UI images (CSS/IMG), only when the asset is approved and loaded. */
export const artUrl = (id: string): string | undefined => (textures.has(id) ? artById(id)?.path : undefined);

/** Ready texture + spec for a gameplay entity, or undefined (→ keep current visuals). */
export function readyArtFor(category: ArtAssetSpec['category'], gameplayId: string): { spec: ArtAssetSpec; texture: THREE.Texture } | undefined {
  const spec = artForGameplay(category, gameplayId);
  const texture = spec ? textures.get(spec.id) : undefined;
  return spec && texture ? { spec, texture } : undefined;
}

/** Material for a sprite card (premultiplied-alpha friendly, unlit, keeps exact sheet colours). */
export function cardMaterial(texture: THREE.Texture): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.02,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

/** Upright card sized from the spec (width in world units, height from the image aspect). */
export function cardGeometry(spec: ArtAssetSpec, texture: THREE.Texture): THREE.PlaneGeometry {
  const img = texture.image as { width: number; height: number };
  const cols = spec.frames?.columns ?? 1;
  const rows = spec.frames ? Math.ceil(spec.frames.count / spec.frames.columns) : 1;
  const w = spec.world?.width ?? 4;
  const h = w * ((img.height / rows) / (img.width / cols));
  const g = new THREE.PlaneGeometry(w, h);
  g.rotateX(spec.world?.tilt ?? 0);
  return g;
}

/** Converts a normalised (u, v) image anchor into local card coordinates. */
export function anchorToLocal(spec: ArtAssetSpec, geo: THREE.PlaneGeometry, [u, v]: [number, number]): THREE.Vector3 {
  const { width, height } = geo.parameters;
  const p = new THREE.Vector3((u - 0.5) * width, (0.5 - v) * height, 0);
  p.applyAxisAngle(new THREE.Vector3(1, 0, 0), spec.world?.tilt ?? 0);
  return p;
}
