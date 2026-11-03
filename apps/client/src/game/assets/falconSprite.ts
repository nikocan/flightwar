import * as THREE from 'three';
import type { AircraftModel } from '../render/aircraftModel';

/**
 * Production 2.5D top-view artwork, placed in the existing Three.js world.
 * The SVG is a genuine independent game asset, not a screenshot of the scene.
 * The player movement, collisions, firing and camera remain unchanged.
 */
export function createFalconSpriteModel(): AircraftModel {
  const group = new THREE.Group();
  const geometry = new THREE.PlaneGeometry(8.6, 10.2);
  geometry.rotateX(-Math.PI / 2); // artwork nose (top) faces world -Z
  const texture = new THREE.TextureLoader().load('/game-assets/aircraft/falcon-x1.svg');
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    toneMapped: false,
    alphaTest: 0.025,
  });
  const aircraft = new THREE.Mesh(geometry, material);
  aircraft.renderOrder = 5;
  group.add(aircraft);
  const engines = [
    new THREE.Vector3(-0.44, 0, 3.1),
    new THREE.Vector3(0, 0, 3.2),
    new THREE.Vector3(0.44, 0, 3.1),
  ];
  return {
    group,
    engines,
    flames: [],
    glows: [],
    dispose: () => {
      geometry.dispose();
      material.dispose();
      texture.dispose();
    },
  };
}
