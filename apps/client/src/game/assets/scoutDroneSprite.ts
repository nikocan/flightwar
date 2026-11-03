import * as THREE from 'three';
import type { EnemyModel } from '../render/enemyModels';

/** Experimental authored 2.5D Scout Drone, preserving original AI and hitboxes. */
export function createScoutDroneSprite(): EnemyModel {
  const group = new THREE.Group();
  const geometry = new THREE.PlaneGeometry(3.6, 3);
  geometry.rotateX(-Math.PI / 2);
  geometry.rotateY(Math.PI);
  const texture = new THREE.TextureLoader().load('/game-assets/enemies/scout-drone.svg');
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({
    map: texture, transparent: true, side: THREE.DoubleSide,
    depthWrite: false, alphaTest: 0.025, toneMapped: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 4;
  group.add(mesh);
  let elapsed = 0;
  return {
    group, flashMats: [], baseEmissive: [], spinners: [], pulse: [],
    update: (dt: number) => {
      elapsed += dt;
      mesh.position.y = Math.sin(elapsed * 5) * 0.07;
    },
    dispose: () => { geometry.dispose(); material.dispose(); texture.dispose(); },
  };
}
