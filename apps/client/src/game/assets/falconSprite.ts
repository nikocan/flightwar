import * as THREE from 'three';
import type { AircraftModel } from '../render/aircraftModel';

/**
 * Production 2.5D top-view artwork, placed in the existing Three.js world.
 * The SVG is a genuine independent game asset, not a screenshot of the scene.
 * The player movement, collisions, firing and camera remain unchanged.
 */
export function createFalconSpriteModel(): AircraftModel {
  const group = new THREE.Group();
  // Upright card facing the chase camera, tilted back so the top-view art reads as 2.5D.
  // (A plane lying flat on XZ is seen edge-on from the camera and becomes invisible.)
  const geometry = new THREE.PlaneGeometry(5.6, 6.6);
  geometry.rotateX(-0.55);
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
  // Exhaust points at the bottom edge of the tilted card.
  const engines = [
    new THREE.Vector3(-0.38, -2.7, 1.9),
    new THREE.Vector3(0, -2.8, 2.0),
    new THREE.Vector3(0.38, -2.7, 1.9),
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
