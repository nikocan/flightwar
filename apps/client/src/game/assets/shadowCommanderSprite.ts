import * as THREE from 'three';
import type { EnemyModel } from '../render/enemyModels';

/** Shadow Commander artwork rendered as a world-space 2.5D sprite. */
export function createShadowCommanderSprite(): EnemyModel {
  const group = new THREE.Group();
  // Upright card facing the player/camera (+Z), slightly tilted so it reads as 2.5D.
  const geometry = new THREE.PlaneGeometry(30, 18);
  geometry.rotateX(-0.25);
  const texture = new THREE.TextureLoader().load('/game-assets/bosses/shadow-commander.svg');
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({
    map: texture, transparent: true, side: THREE.DoubleSide,
    depthWrite: false, alphaTest: 0.025, toneMapped: false,
  });
  const sprite = new THREE.Mesh(geometry, material);
  sprite.renderOrder = 4;
  group.add(sprite);
  let elapsed = 0;
  return {
    group, flashMats: [], baseEmissive: [], spinners: [], pulse: [],
    update: (dt: number) => {
      // Subtle boss hover, without changing collision or attack state.
      elapsed += dt;
      sprite.position.y = Math.sin(elapsed * 1.8) * 0.12;
    },
    dispose: () => { geometry.dispose(); material.dispose(); texture.dispose(); },
  };
}
