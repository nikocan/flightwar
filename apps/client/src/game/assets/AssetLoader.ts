import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { ASSETS, assetById, type AssetEntry } from './manifest';

export type AssetStatus = 'pending' | 'loaded' | 'missing' | 'error';

interface Record {
  status: AssetStatus;
  gltf?: GLTF;
  texture?: THREE.Texture;
  lods: { gltf: GLTF; maxDistance: number }[];
  error?: string;
}

const records = new Map<string, Record>();
const inflight = new Map<string, Promise<Record>>();
let gltfLoader: GLTFLoader | null = null;
let ktx2Ready = false;

function loader(): GLTFLoader {
  if (gltfLoader) return gltfLoader;
  const draco = new DRACOLoader().setDecoderPath('/decoders/draco/');
  gltfLoader = new GLTFLoader().setDRACOLoader(draco).setMeshoptDecoder(MeshoptDecoder);
  return gltfLoader;
}

/** Enables KTX2 (Basis) compressed textures; needs the renderer to detect GPU formats. */
export function enableCompressedTextures(renderer: THREE.WebGLRenderer): void {
  if (ktx2Ready) return;
  const ktx2 = new KTX2Loader().setTranscoderPath('/decoders/basis/').detectSupport(renderer);
  loader().setKTX2Loader(ktx2);
  ktx2Ready = true;
}

/** Checks existence first so missing optional files never spam errors. */
async function exists(url: string): Promise<boolean> {
  try {
    const r = await fetch(url, { method: 'HEAD' });
    const type = r.headers.get('content-type') ?? '';
    // Dev servers answer unknown paths with index.html — treat that as missing.
    return r.ok && !type.includes('text/html');
  } catch {
    return false;
  }
}

function prepareGltf(entry: AssetEntry, gltf: GLTF): void {
  const root = gltf.scene;
  if (entry.rotation) root.rotation.set(...entry.rotation);
  root.updateMatrixWorld(true);
  if (entry.targetSize) {
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const longest = Math.max(size.x, size.z) || 1;
    root.scale.multiplyScalar(entry.targetSize / longest);
    root.updateMatrixWorld(true);
    const centered = new THREE.Box3().setFromObject(root).getCenter(new THREE.Vector3());
    root.position.sub(centered);
  }
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.frustumCulled = true;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    for (const mat of mats) {
      const std = mat as THREE.MeshStandardMaterial;
      if (std.isMeshStandardMaterial) {
        std.envMapIntensity = 1.2;
        if (std.emissiveMap || std.emissive.getHex() !== 0) std.toneMapped = false;
      }
    }
  });
}

async function loadEntry(entry: AssetEntry): Promise<Record> {
  const rec: Record = { status: 'pending', lods: [] };
  records.set(entry.id, rec);
  if (!(await exists(entry.url))) {
    rec.status = 'missing';
    return rec;
  }
  try {
    if (entry.kind === 'hdri') {
      const tex = await new RGBELoader().loadAsync(entry.url);
      tex.mapping = THREE.EquirectangularReflectionMapping;
      rec.texture = tex;
    } else {
      rec.gltf = await loader().loadAsync(entry.url);
      prepareGltf(entry, rec.gltf);
      for (const lod of entry.lods ?? []) {
        if (!(await exists(lod.url))) continue;
        const g = await loader().loadAsync(lod.url);
        prepareGltf(entry, g);
        rec.lods.push({ gltf: g, maxDistance: lod.maxDistance });
      }
    }
    rec.status = 'loaded';
  } catch (e) {
    rec.status = 'error';
    rec.error = (e as Error).message;
    console.warn(`[assets] failed to load ${entry.url}:`, e);
  }
  return rec;
}

export function loadAsset(id: string): Promise<Record> {
  const entry = assetById(id);
  if (!entry) return Promise.resolve({ status: 'missing', lods: [] });
  let p = inflight.get(id);
  if (!p) {
    p = loadEntry(entry);
    inflight.set(id, p);
  }
  return p;
}

/** Loads every asset flagged `preload` (never rejects). */
export async function preloadAssets(): Promise<void> {
  await Promise.all(ASSETS.filter((a) => a.preload).map((a) => loadAsset(a.id)));
  const report = ASSETS.map((a) => `${a.id}: ${records.get(a.id)?.status ?? 'not requested'}`);
  console.info('[assets]\n' + report.join('\n'));
}

export const assetStatus = (id: string): AssetStatus => records.get(id)?.status ?? 'pending';
export const getGltf = (id: string): GLTF | undefined => records.get(id)?.gltf;
export const getLods = (id: string) => records.get(id)?.lods ?? [];
export const getTexture = (id: string): THREE.Texture | undefined => records.get(id)?.texture;
export const assetReport = () => ASSETS.map((a) => ({ id: a.id, url: a.url, status: assetStatus(a.id), description: a.description }));
