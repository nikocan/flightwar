import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { AircraftDef, EnemyDef } from '@sfe/shared';
import { buildAircraft, type AircraftModel } from '../render/aircraftModel';
import { buildEnemy, type EnemyModel, type FlashMaterial } from '../render/enemyModels';
import { glowTexture } from '../render/textures';
import { getGltf, getLods } from './AssetLoader';
import { createFalconSpriteModel } from './falconSprite';
import { createShadowCommanderSprite } from './shadowCommanderSprite';
import { createScoutDroneSprite } from './scoutDroneSprite';

const ENGINE = /^(engine|nozzle)/i;
const TURRET = /^turret/i;
const SPIN = /^(rotor|spin)/i;
const PULSE = /^(reactor|core|weakpoint)/i;

/** Builds an object (THREE.LOD when lower-detail files exist) from a loaded asset. */
function instantiate(id: string): { root: THREE.Object3D; source: THREE.Object3D; clips: THREE.AnimationClip[] } | null {
  const gltf = getGltf(id);
  if (!gltf) return null;
  const main = cloneSkinned(gltf.scene);
  const lods = getLods(id);
  if (lods.length === 0) return { root: main, source: main, clips: gltf.animations };
  const lod = new THREE.LOD();
  lod.addLevel(main, 0);
  for (const l of lods) lod.addLevel(cloneSkinned(l.gltf.scene), l.maxDistance);
  return { root: lod, source: main, clips: gltf.animations };
}

function mixerFor(root: THREE.Object3D, clips: THREE.AnimationClip[]) {
  if (clips.length === 0) return undefined;
  const mixer = new THREE.AnimationMixer(root);
  for (const c of clips) mixer.clipAction(c).play();
  return mixer;
}

/** Exhaust flame + glow attached to an engine node (small procedural support element). */
function addExhaust(node: THREE.Object3D, color: string, radius: number, flames: THREE.Mesh[], glows: THREE.Sprite[], disposables: { dispose: () => void }[]) {
  const geo = new THREE.ConeGeometry(radius, radius * 8, 14, 1, true);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0, radius * 4);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const flame = new THREE.Mesh(geo, mat);
  node.add(flame);
  flames.push(flame);
  const gm = new THREE.SpriteMaterial({ map: glowTexture(), color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false });
  const glow = new THREE.Sprite(gm);
  glow.scale.setScalar(radius * 7);
  glow.position.z = radius;
  node.add(glow);
  glows.push(glow);
  disposables.push(geo, mat, gm);
}

/** Player / hangar aircraft: GLB if available, otherwise the procedural placeholder. */
export function createAircraftModel(def: AircraftDef, opts: { glow?: boolean } = {}): AircraftModel {
  // Falcon X1 uses authored 2.5D artwork instead of the geometric prototype.
  if (def.id === 'falconX1') return createFalconSpriteModel();
  const inst = instantiate(`aircraft.${def.id}`);
  if (!inst) return buildAircraft(def.model, opts);
  const group = new THREE.Group();
  group.add(inst.root);
  const flames: THREE.Mesh[] = [];
  const glows: THREE.Sprite[] = [];
  const engines: THREE.Vector3[] = [];
  const disposables: { dispose: () => void }[] = [];
  const engineNodes: THREE.Object3D[] = [];
  inst.source.traverse((o) => { if (ENGINE.test(o.name)) engineNodes.push(o); });
  group.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(inst.root);
  if (engineNodes.length === 0) {
    // No tagged engines: put a single exhaust at the rear centre.
    const n = new THREE.Object3D();
    n.position.set(0, (box.min.y + box.max.y) / 2, box.max.z);
    group.add(n);
    engineNodes.push(n);
  }
  const radius = Math.max(0.18, (box.max.x - box.min.x) * 0.03);
  for (const n of engineNodes) {
    addExhaust(n, def.model.engine, radius, flames, glows, disposables);
    const p = new THREE.Vector3();
    n.getWorldPosition(p);
    group.worldToLocal(p);
    engines.push(p.add(new THREE.Vector3(0, 0, radius * 2)));
  }
  const mixer = mixerFor(inst.source, inst.clips);
  return {
    group,
    engines,
    flames,
    glows,
    update: (dt: number) => mixer?.update(dt),
    dispose: () => disposables.forEach((d) => d.dispose()),
  };
}

/** Enemy / boss: GLB if available (materials cloned per instance for hit flashes), else procedural. */
export function createEnemyModel(def: EnemyDef): EnemyModel {
  if (def.behavior === 'boss') return createShadowCommanderSprite();
  if (def.id === 'scoutDrone') return createScoutDroneSprite();
  const id = `enemy.${def.id}`;
  const inst = instantiate(id);
  if (!inst) return buildEnemy(def.model, def.color);
  const group = new THREE.Group();
  group.add(inst.root);
  // Models are authored nose → -Z; enemies fly towards the player (+Z).
  inst.root.rotation.y += Math.PI;
  const flashMats: FlashMaterial[] = [];
  const spinners: EnemyModel['spinners'] = [];
  const pulse: THREE.Object3D[] = [];
  const owned: THREE.Material[] = [];
  inst.root.traverse((o) => {
    if (TURRET.test(o.name)) spinners.push({ obj: o, axis: 'y', speed: 0.6 });
    else if (SPIN.test(o.name)) spinners.push({ obj: o, axis: 'z', speed: 2 });
    if (PULSE.test(o.name)) pulse.push(o);
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const cloneMat = (mat: THREE.Material) => {
      const c = mat.clone();
      owned.push(c);
      if ((c as THREE.MeshStandardMaterial).isMeshStandardMaterial) flashMats.push(c as THREE.MeshStandardMaterial);
      return c;
    };
    m.material = Array.isArray(m.material) ? m.material.map(cloneMat) : cloneMat(m.material);
  });
  const mixer = mixerFor(inst.source, inst.clips);
  return {
    group,
    flashMats,
    baseEmissive: flashMats.map((mat) => ({ mat, color: mat.emissive.clone(), intensity: mat.emissiveIntensity })),
    spinners,
    pulse,
    update: (dt: number) => mixer?.update(dt),
    dispose: () => owned.forEach((m) => m.dispose()),
  };
}
